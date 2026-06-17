import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../logging/logging.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { v4 as uuidv4 } from 'uuid';
import { resolveProviderCallOptions } from './helpers/resolve-provider-call-options';
import { ResilientExecutor } from '../common/resilience/resilient-executor';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SseEvent } from './sse/sse-event.type';
import { getOrCreateConversationIdForResponse } from './helpers/conversation-id';
import { getResolvedSystemPrompts } from './helpers/system-prompt';
import { buildRetryPolicyFromResolved } from './helpers/retry-policy';
import { isToolingRequest } from './helpers/tooling-request';

import { ChatProviderCallService } from './services/chat-provider-call.service';
import { ChatCacheGuardService } from './services/chat-cache-guard.service';
import { ChatErrorHandlerService } from './services/chat-error-handler.service';
import { ChatValidationService } from './services/chat-validation.service';
import { ChatResponseBuilderService } from './services/chat-response-builder.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly config: ConfigService,
    private readonly loggingService: LoggingService,
    private readonly resilientExecutor: ResilientExecutor,
    private readonly providerCallService: ChatProviderCallService,
    private readonly cacheGuardService: ChatCacheGuardService,
    private readonly errorHandlerService: ChatErrorHandlerService,
    private readonly responseBuilderService: ChatResponseBuilderService,
    private readonly validationService: ChatValidationService,
  ) {}

  validateForStreaming(modelAlias: string) {
    return this.validationService.validateForStreaming(modelAlias);
  }

  async executeChat(
    requestBody: ChatRequestDto,
    requestId: string,
    gatewayKey: string,
  ) {
    const log = this.loggingService.child({
      module: 'ChatService',
      requestId,
      modelAlias: requestBody.modelAlias,
    });

    const resolvedPrompts = getResolvedSystemPrompts((key) =>
      this.config.get(key),
    );

    const responseConversationId =
      getOrCreateConversationIdForResponse(requestBody);

    const primaryResolved = this.registry.resolve(requestBody.modelAlias);

    this.validationService.validateTooling(requestBody, primaryResolved);

    const options = resolveProviderCallOptions(
      primaryResolved.params,
      requestBody.params,
    );

    if (gatewayKey) {
      await this.cacheGuardService.checkRateLimit(
        gatewayKey,
        primaryResolved.providerName,
        requestId,
      );

      const cachedResponse = await this.cacheGuardService.getCachedIfAllowed(
        requestBody,
        options,
      );

      if (cachedResponse) {
        log.info('Chat cache hit');
        return cachedResponse;
      }
    }

    const startedAt = Date.now();

    const runOnce = async (alias: string, _attemptNo: number) => {
      const { response, resolved } =
        await this.providerCallService.completeOnce(
          requestBody,
          alias,
          requestId,
          resolvedPrompts,
        );
      return { response, resolved };
    };

    try {
      const result = await this.resilientExecutor.executeWithRetryAndFallback({
        primaryAlias: requestBody.modelAlias,
        fallbackAlias: isToolingRequest(requestBody)
          ? undefined
          : primaryResolved.fallbackAlias,
        retry: buildRetryPolicyFromResolved(primaryResolved),
        runOnce,
        requestId,
      });

      const { response, resolved } = result.value;
      const usedAlias = result.usedAlias;
      const didFallback = result.didFallback;

      const chatResult = this.responseBuilderService.buildChatResponse(
        {
          text: response.text,
          usage: response.usage,
          toolCalls: response.toolCalls,
          stopReason: response.stopReason,
          usageDetails: response.usageDetails,
          systemFingerprint: response.systemFingerprint,
          thinkingContent: response.thinkingContent,
        },
        resolved.providerName,
        requestBody.modelAlias,
        requestId,
        responseConversationId,
        didFallback ? usedAlias : undefined,
      );

      const latency = Date.now() - startedAt;

      await this.cacheGuardService.setCachedIfAllowed(
        requestBody,
        chatResult,
        options,
      );

      log.info('Chat completed successfully', {
        provider: resolved.providerName,
        modelId: resolved.modelId,
        latency,
        tokensUsed:
          response.usage?.inputTokens != null
            ? response.usage.inputTokens
            : undefined,
        tokensOutput:
          response.usage?.outputTokens != null
            ? response.usage.outputTokens
            : undefined,
        conversationId: responseConversationId,
        ...(didFallback && { effectiveModelAlias: usedAlias }),
      });
      return chatResult;
    } catch (error) {
      await this.errorHandlerService.handleProviderError(
        log,
        error,
        primaryResolved.providerName,
        gatewayKey,
      );
      throw error;
    }
  }

  async executeStream(
    requestBody: ChatRequestDto,
    requestId: string,
    emit: (event: SseEvent) => void,
    gatewayKey?: string,
  ): Promise<void> {
    const log = this.loggingService.child({
      module: 'ChatService',
      requestId,
      modelAlias: requestBody.modelAlias,
    });

    const resolvedPrompts = getResolvedSystemPrompts((key) =>
      this.config.get(key),
    );

    const responseConversationId =
      getOrCreateConversationIdForResponse(requestBody);

    const primaryResolved = this.registry.resolve(requestBody.modelAlias);

    this.validationService.validateTooling(requestBody, primaryResolved);

    const startedAt = Date.now();
    const id = `gw_${uuidv4()}`;
    const metaEmitted = { value: false };

    const runOnce = async (alias: string, _attemptNo: number) => {
      const streamResult = await this.providerCallService.streamOnce({
        requestBody,
        alias,
        requestId,
        resolvedPrompts,
        emit,
        streamMeta: {
          gatewayId: id,
          primaryModelAlias: requestBody.modelAlias,
          responseConversationId,
          metaEmitted,
        },
      });

      const resolved = this.registry.resolve(alias);
      return {
        ...streamResult,
        resolved,
      };
    };

    try {
      const result = await this.resilientExecutor.executeWithRetryAndFallback({
        primaryAlias: requestBody.modelAlias,
        fallbackAlias: primaryResolved.fallbackAlias,
        retry: buildRetryPolicyFromResolved(primaryResolved),
        runOnce,
        requestId,
      });

      const {
        resolved,
        toolCalls,
        stopReason,
        usageMetadata,
        systemFingerprint,
        thinkingContent,
      } = result.value;
      const usedAlias = result.usedAlias;
      const didFallback = result.didFallback;

      const doneEvent = this.responseBuilderService.buildStreamDoneEvent(
        usageMetadata,
        toolCalls,
        stopReason,
        systemFingerprint,
        thinkingContent,
      );
      emit(doneEvent);

      const latency = Date.now() - startedAt;

      log.info('Chat stream completed', {
        provider: resolved.providerName,
        modelId: resolved.modelId,
        latency,
        conversationId: responseConversationId,
        ...(didFallback && { effectiveModelAlias: usedAlias }),
      });
    } catch (error) {
      await this.errorHandlerService.handleProviderError(
        log,
        error,
        primaryResolved.providerName,
        gatewayKey,
      );
      throw error;
    }
  }
}
