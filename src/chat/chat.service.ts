import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../config/typed-config';
import { LoggingService } from '../logging/logging.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { v4 as uuidv4 } from 'uuid';
import { resolveProviderCallOptions } from './helpers/resolve-provider-call-options';
import { ResilientExecutor } from './resilience/resilient-executor';
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
import { ActiveStreamsTracker } from '../observability/app-metrics/active-streams.tracker';
import { validateChatIngress } from './validation/chat-ingress.validator';
import type { ChatIngressProfile } from './validation/chat-ingress.types';
import type { ChatExecutionPrep } from './types/chat-execution-prep.types';
import {
  asProviderInstanceId,
  asModelAlias,
  asResponseId,
  type GatewayKey,
  type RequestId,
  type ModelAlias,
  ClientId,
} from '../common/types/branded.types';

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
    private readonly activeStreams: ActiveStreamsTracker,
  ) {}

  validateForStreaming(modelAlias: string) {
    return this.validationService.validateForStreaming(modelAlias);
  }

  async prepareRequestForExecution(
    requestBody: ChatRequestDto,
    requestId: RequestId,
    ingressProfile: ChatIngressProfile,
    gatewayKey: GatewayKey,
  ): Promise<ChatExecutionPrep> {
    validateChatIngress(requestBody, ingressProfile);

    const resolvedPrompts = getResolvedSystemPrompts(() =>
      getAppConfigOrThrow(this.config, 'resolvedSystemPrompts'),
    );

    const responseConversationId =
      getOrCreateConversationIdForResponse(requestBody);

    const primaryResolved = this.registry.resolve(requestBody.modelAlias);

    this.validationService.validateTooling(requestBody, primaryResolved);

    const options = resolveProviderCallOptions(
      primaryResolved.params,
      requestBody.params,
    );

    this.validationService.validateThinking(primaryResolved, options);

    if (gatewayKey) {
      await this.cacheGuardService.checkRateLimit(
        gatewayKey,
        primaryResolved.providerName,
        requestId,
      );
    }

    return {
      primaryResolved,
      options,
      responseConversationId,
      resolvedPrompts,
    };
  }

  async executeChat(
    requestBody: ChatRequestDto,
    clientId: ClientId,
    requestId: RequestId,
    gatewayKey: GatewayKey,
    ingressProfile: ChatIngressProfile,
  ) {
    const {
      primaryResolved,
      options,
      responseConversationId,
      resolvedPrompts,
    } = await this.prepareRequestForExecution(
      requestBody,
      requestId,
      ingressProfile,
      gatewayKey,
    );

    const log = this.loggingService.child({
      module: 'ChatService',
      requestId,
      modelAlias: requestBody.modelAlias,
    });

    if (gatewayKey) {
      const cachedResponse = await this.cacheGuardService.getCachedIfAllowed(
        requestBody,
        options,
      );

      if (cachedResponse) {
        log.info('Chat cache hit');
        return {
          ...cachedResponse,
          conversationId: responseConversationId,
        };
      }
    }

    const startedAt = Date.now();

    const runOnce = async (
      alias: ModelAlias,
      _attemptNo: number,
      signal: AbortSignal,
    ) => {
      return this.providerCallService.completeOnce(
        requestBody,
        alias,
        requestId,
        clientId,
        resolvedPrompts,
        signal,
      );
    };

    try {
      const result = await this.resilientExecutor.executeWithRetryAndFallback({
        primaryAlias: asModelAlias(requestBody.modelAlias),
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
        asModelAlias(requestBody.modelAlias),
        requestId,
        responseConversationId,
        didFallback ? usedAlias : undefined,
        options,
        resolved.providerType,
      );

      const latency = Date.now() - startedAt;

      await this.cacheGuardService.setCachedIfAllowed(
        requestBody,
        chatResult,
        options,
      );

      log.info('Chat completed successfully', {
        provider: asProviderInstanceId(resolved.providerName),
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
    requestId: RequestId,
    clientId: ClientId,
    emit: (event: SseEvent) => void,
    ingressProfile: ChatIngressProfile,
    gatewayKey: GatewayKey,
  ): Promise<void> {
    const {
      primaryResolved,
      options,
      responseConversationId,
      resolvedPrompts,
    } = await this.prepareRequestForExecution(
      requestBody,
      requestId,
      ingressProfile,
      gatewayKey,
    );

    const log = this.loggingService.child({
      module: 'ChatService',
      requestId,
      modelAlias: requestBody.modelAlias,
    });

    const startedAt = Date.now();
    const id = asResponseId(`gw_${uuidv4()}`);
    const metaEmitted = { value: false };

    const runOnce = async (
      alias: ModelAlias,
      _attemptNo: number,
      signal: AbortSignal,
    ) => {
      const streamResult = await this.providerCallService.streamOnce({
        requestBody,
        alias,
        requestId,
        clientId,
        resolvedPrompts,
        emit,
        streamMeta: {
          gatewayId: id,
          primaryModelAlias: asModelAlias(requestBody.modelAlias),
          responseConversationId,
          metaEmitted,
        },
        signal,
      });

      const resolved = this.registry.resolve(alias);
      return {
        ...streamResult,
        resolved,
      };
    };

    try {
      const result = await this.activeStreams.trackStream(clientId, () =>
        this.resilientExecutor.executeWithRetryAndFallback({
          primaryAlias: asModelAlias(requestBody.modelAlias),
          fallbackAlias: isToolingRequest(requestBody)
            ? undefined
            : primaryResolved.fallbackAlias,
          retry: buildRetryPolicyFromResolved(primaryResolved),
          runOnce,
          requestId,
        }),
      );

      const {
        resolved,
        toolCalls,
        stopReason,
        usageMetadata,
        systemFingerprint,
        thinkingContent,
        usageDetails,
      } = result.value;
      const usedAlias = result.usedAlias;
      const didFallback = result.didFallback;

      const doneEvent = this.responseBuilderService.buildStreamDoneEvent(
        usageMetadata,
        toolCalls,
        stopReason,
        systemFingerprint,
        thinkingContent,
        options,
        resolved.providerType,
        usageDetails,
        didFallback ? usedAlias : undefined,
      );
      emit(doneEvent);

      const latency = Date.now() - startedAt;

      log.info('Chat stream completed', {
        provider: asProviderInstanceId(resolved.providerName),
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
