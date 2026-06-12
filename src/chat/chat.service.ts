import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../logging/logging.service';
import { ChatProviderCallService } from './chat-provider-call.service';
import { SmartRateLimiterService } from '../rate-limit/smart-rate-limiter.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { v4 as uuidv4 } from 'uuid';
import { resolveProviderCallOptions } from './helpers/resolve-provider-call-options';
import { ResilientExecutor } from 'src/common/resilience/resilient-executor';
import { ChatRequestDto } from './dto/chat-request.dto';
import { SseEvent } from './sse/sse-event.type';
import { ResponseCacheService } from '../cache/response-cache.service';
import { getOrCreateConversationIdForResponse } from './helpers/conversation-id';
import { getResolvedSystemPrompts } from './helpers/system-prompt';
import { isCachedChatAllowedForModelAlias } from './helpers/cache-policy';
import { buildRetryPolicyFromResolved } from './helpers/retry-policy';
import { mapStopReasonToFinishReason } from './helpers/map-provider-finish-reason';
import { isToolingRequest } from './helpers/tooling-request';
import type { GatewayConfig } from '../config/configuration';
import type { ResolvedProviderConfig } from 'src/providers/provider-registry.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly config: ConfigService,
    private readonly providerCallService: ChatProviderCallService,
    private readonly cacheService: ResponseCacheService,
    private readonly rateLimiter: SmartRateLimiterService,
    private readonly loggingService: LoggingService,
    private readonly resilientExecutor: ResilientExecutor,
  ) {}

  private async handleProviderError(
    log: LoggingService,
    error: unknown,
    providerName: string,
    gatewayKey?: string,
  ): Promise<void> {
    if (
      gatewayKey &&
      error instanceof HttpException &&
      error.getStatus() === 429
    ) {
      await this.rateLimiter.setCooldown(gatewayKey, providerName);
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      const ctx: Record<string, unknown> = {
        provider: providerName,
        status,
      };
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const o = body as Record<string, unknown>;
        if (typeof o.code === 'string') ctx.code = o.code;
      }
      if (status === 429) {
        log.warn('Chat provider rate limited', ctx);
      } else if (status < 500) {
        log.warn('Chat provider request failed', ctx);
      }
      return;
    }

    if (error instanceof Error) {
      log.warn('Chat provider call failed', {
        provider: providerName,
        message: error.message,
      });
    }
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

    this.validateTooling(requestBody, primaryResolved);

    const skipCache = isToolingRequest(requestBody);

    const options = resolveProviderCallOptions(
      primaryResolved.params,
      requestBody.params,
    );

    if (gatewayKey) {
      const cooldownResult = await this.rateLimiter.checkCooldown(
        gatewayKey,
        primaryResolved.providerName,
      );

      if (!cooldownResult.allowed) {
        log.warn('Rate limit exceeded', {
          provider: primaryResolved.providerName,
          status: 429,
          code: ApiErrorCode.RATE_LIMITED,
        });

        throw new HttpException(
          {
            statusCode: 429,
            code: ApiErrorCode.RATE_LIMITED,
            message: cooldownResult.reason || 'Rate limit exceeded',
            requestId: requestId,
            details: [],
          },
          429,
        );
      }

      if (!skipCache) {
        const cachedResponse = await this.cacheService.getCachedResponse(
          requestBody,
          options,
        );

        if (
          cachedResponse &&
          isCachedChatAllowedForModelAlias(
            this.config.get<GatewayConfig>('gateway'),
            requestBody.modelAlias,
          )
        ) {
          log.info('Chat cache hit');
          return cachedResponse;
        }
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

      const chatResult = {
        id: `gw_${uuidv4()}`,
        provider: resolved.providerName,
        model: requestBody.modelAlias,
        ...(didFallback && { effectiveModelAlias: usedAlias }),
        output: {
          type: 'text',
          text: response.text,
        },
        usage: response.usage,
        requestId: requestId,
        conversationId: responseConversationId,
        ...(response.toolCalls?.length && { toolCalls: response.toolCalls }),
        finishReason: mapStopReasonToFinishReason(
          response.stopReason,
          response.toolCalls,
        ),
        ...(response.usageDetails
          ? { usageDetails: response.usageDetails }
          : {}),
        ...(response.systemFingerprint
          ? { systemFingerprint: response.systemFingerprint }
          : {}),
      };

      const latency = Date.now() - startedAt;

      if (!skipCache) {
        await this.cacheService.setCachedResponse(
          requestBody,
          chatResult,
          options,
        );
      }

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
      await this.handleProviderError(
        log,
        error,
        primaryResolved.providerName,
        gatewayKey,
      );
      throw error;
    }
  }

  private validateTooling(
    requestBody: ChatRequestDto,
    resolved: ResolvedProviderConfig,
  ): void {
    if (!isToolingRequest(requestBody)) return;

    if (!resolved.capabilities?.tools) {
      throw new HttpException(
        {
          code: ApiErrorCode.TOOLS_NOT_SUPPORTED,
          message: 'Tools are not supported for this model alias.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  validateForStreaming(modelAlias: string) {
    const log = this.loggingService.child({
      module: 'ChatService',
      modelAlias: modelAlias,
    });
    const resolved = this.registry.resolve(modelAlias);
    if (!resolved.capabilities?.streaming) {
      log.warn('Streaming not supported for this model', {
        provider: resolved.providerName,
        code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
      });
      throw new HttpException(
        {
          code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
          message: 'Streaming not supported for this model.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!resolved.provider.stream) {
      log.warn('Streaming adapter not implemented for this provider', {
        provider: resolved.providerName,
        code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
      });
      throw new HttpException(
        {
          code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
          message: 'Streaming adapter not implemented for this provider.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async executeStream(
    requestBody: ChatRequestDto,
    requestId: string,
    emit: (event: SseEvent) => void,
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

    this.validateTooling(requestBody, primaryResolved);

    const startedAt = Date.now();
    const id = `gw_${uuidv4()}`;
    const metaEmitted = { value: false };

    const runOnce = async (alias: string, _attemptNo: number) => {
      const {
        assembledText,
        usageMetadata,
        toolCalls,
        stopReason,
        systemFingerprint,
      } = await this.providerCallService.streamOnce({
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
        resolved,
        assembledText,
        usageMetadata,
        toolCalls,
        stopReason,
        systemFingerprint,
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
      } = result.value;
      const usedAlias = result.usedAlias;
      const didFallback = result.didFallback;

      emit({
        name: 'done',
        data: {
          ...(usageMetadata && {
            usage: {
              inputTokens: usageMetadata.inputTokens,
              outputTokens: usageMetadata.outputTokens,
              totalTokens:
                usageMetadata.inputTokens + usageMetadata.outputTokens,
            },
          }),
          ...(toolCalls?.length && { toolCalls }),
          finishReason: mapStopReasonToFinishReason(stopReason, toolCalls),
          ...(systemFingerprint && { systemFingerprint }),
        },
      });

      const latency = Date.now() - startedAt;

      log.info('Chat stream completed', {
        provider: resolved.providerName,
        modelId: resolved.modelId,
        latency,
        conversationId: responseConversationId,
        ...(didFallback && { effectiveModelAlias: usedAlias }),
      });
    } catch (error) {
      await this.handleProviderError(log, error, primaryResolved.providerName);
      throw error;
    }
  }
}
