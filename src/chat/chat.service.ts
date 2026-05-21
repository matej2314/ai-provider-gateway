import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../logging/logging.service';
import { MetricsService } from '../metrics/metrics.service';
import { SmartRateLimiterService } from '../rate-limit/smart-rate-limiter.service';
import { v4 as uuidv4 } from 'uuid';
import type { ResolvedSystemPrompts } from '../config/configuration.types';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { resolveProviderCallOptions } from './helpers/resolve-provider-call-options';
import { ResilientExecutor } from 'src/common/resilience/resilient-executor';
import type { ProviderChatTurn } from '../providers/interfaces/ai-provider.interface';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SseEvent } from './sse/sse-event.type';
import { ResponseCacheService } from '../cache/response-cache.service';
import type { GatewayConfig } from '../config/configuration';
import { RETRY_POLICY_DEFAULTS } from 'src/common/retry-policy-defaults';
import { getOrCreateConversationIdForResponse } from './helpers/conversation-id';
import { buildLlmMetricsContext } from './helpers/metrics';

const SYSTEM_PROMPT_SECTION_JOINER = '\n\n';

@Injectable()
export class ChatService {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly config: ConfigService,
    private readonly cacheService: ResponseCacheService,
    private readonly rateLimiter: SmartRateLimiterService,
    private readonly loggingService: LoggingService,
    private readonly metricsService: MetricsService,
    private readonly resilientExecutor: ResilientExecutor,
  ) {}

  private getResolvedPrompts(): ResolvedSystemPrompts {
    const resolved = this.config.get<ResolvedSystemPrompts>(
      'resolvedSystemPrompts',
    );

    if (!resolved) {
      throw new Error(
        '[ChatService] systemPromptsResolved not found in config',
      );
    }
    return resolved;
  }

  private composeSystemPrompt(
    resolved: ResolvedSystemPrompts,
    modelAlias: string,
  ): string {
    const parts: string[] = [resolved.master.trim()];
    if (resolved.main) parts.push(resolved.main.trim());

    const perModelPrompt = resolved.perModelByAlias[modelAlias];
    if (perModelPrompt) parts.push(perModelPrompt.trim());
    return parts.join(SYSTEM_PROMPT_SECTION_JOINER);
  }

  private toProviderTurns(messages: ChatMessageDto[]): ProviderChatTurn[] {
    return messages
      .filter(
        (m): m is ProviderChatTurn =>
          m.role === 'user' || m.role === 'assistant',
      )
      .map((m) => ({ role: m.role, content: m.content }));
  }

  private buildProviderInputForAlias(request: ChatRequestDto, alias: string) {
    const resolved = this.getResolvedPrompts();
    return {
      system: this.composeSystemPrompt(resolved, alias),
      messages: this.toProviderTurns(request.messages),
    };
  }

  private isCachedChatAllowedForModelAlias(modelAlias: string): boolean {
    const gateway = this.config.get<GatewayConfig>('gateway');
    if (!gateway) return false;

    const model = gateway.models[modelAlias];
    if (!model) return false;

    const providerRow = gateway.providers[model.providerInstance];
    if (!providerRow) return false;

    return providerRow.enabled === true;
  }

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

    const responseConversationId =
      getOrCreateConversationIdForResponse(requestBody);

    const primaryResolved = this.registry.resolve(requestBody.modelAlias);

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
          code: 'RATE_LIMITED',
        });

        throw new HttpException(
          {
            statusCode: 429,
            code: 'RATE_LIMITED',
            message: cooldownResult.reason || 'Rate limit exceeded',
            requestId: requestId,
            details: [],
          },
          429,
        );
      }

      const cachedResponse = await this.cacheService.getCachedResponse(
        requestBody,
        options,
      );

      if (
        cachedResponse &&
        this.isCachedChatAllowedForModelAlias(requestBody.modelAlias)
      ) {
        log.info('Chat cache hit');
        return cachedResponse;
      }
    }

    const startedAt = Date.now();

    const runOnce = async (alias: string, attemptNo: number) => {
      const resolved = this.registry.resolve(alias);
      const aliasOptions = resolveProviderCallOptions(
        resolved.params,
        requestBody.params,
      );
      const providerInput = this.buildProviderInputForAlias(requestBody, alias);

      const metricsCtx = buildLlmMetricsContext(
        requestBody,
        resolved.providerName,
        alias,
        resolved.modelId,
        requestId,
      );

      const response = await this.metricsService.observeLlmCall(
        metricsCtx,
        () =>
          resolved.provider.complete(
            providerInput,
            resolved.modelId,
            aliasOptions,
          ),
        (res) => ({
          responseModel: res.model,
          outputText: res.text,
          usage: res.usage
            ? {
                inputTokens: res.usage.inputTokens,
                outputTokens: res.usage.outputTokens,
              }
            : undefined,
        }),
      );

      return { response, resolved };
    };

    try {
      const result = await this.resilientExecutor.executeWithRetryAndFallback({
        primaryAlias: requestBody.modelAlias,
        fallbackAlias: primaryResolved.fallbackAlias,
        retry: {
          maxAttempts:
            primaryResolved.policy?.retry?.maxAttempts ??
            RETRY_POLICY_DEFAULTS.maxAttempts,
          onStatus:
            primaryResolved.policy?.retry?.onStatus ??
            RETRY_POLICY_DEFAULTS.onStatus,
          timeoutMs:
            primaryResolved.policy?.timeoutMs ??
            RETRY_POLICY_DEFAULTS.timeoutMs,
        },
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
      };

      const latency = Date.now() - startedAt;

      await this.cacheService.setCachedResponse(
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
      await this.handleProviderError(
        log,
        error,
        primaryResolved.providerName,
        gatewayKey,
      );
      throw error;
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

    const responseConversationId =
      getOrCreateConversationIdForResponse(requestBody);

    const primaryResolved = this.registry.resolve(requestBody.modelAlias);

    if (!primaryResolved.capabilities?.streaming) {
      log.warn('Streaming not supported for this model', {
        provider: primaryResolved.providerName,
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

    if (!primaryResolved.provider.stream) {
      log.warn('Streaming adapter not implemented for this provider', {
        provider: primaryResolved.providerName,
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

    const startedAt = Date.now();
    const id = `gw_${uuidv4()}`;
    let metaEmitted = false;

    const runOnce = async (alias: string, attemptNo: number) => {
      const resolved = this.registry.resolve(alias);

      if (!resolved.capabilities?.streaming || !resolved.provider.stream) {
        throw new HttpException(
          {
            code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
            message: `Streaming not supported for alias ${alias}`,
            details: [],
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const aliasOptions = resolveProviderCallOptions(
        resolved.params,
        requestBody.params,
      );
      const providerInput = this.buildProviderInputForAlias(requestBody, alias);

      const metricsCtx = buildLlmMetricsContext(
        requestBody,
        resolved.providerName,
        alias,
        resolved.modelId,
        requestId,
      );

      const spanController = this.metricsService.observeLlmStream(metricsCtx);

      const streamResult = resolved.provider.stream(
        providerInput,
        resolved.modelId,
        aliasOptions,
      );

      if (!metaEmitted) {
        emit({
          name: 'meta',
          data: {
            id,
            provider: resolved.providerName,
            model: requestBody.modelAlias,
            ...(alias !== requestBody.modelAlias && {
              effectiveModelAlias: alias,
            }),
            requestId,
            conversationId: responseConversationId,
          },
        });
        metaEmitted = true;
      }

      let assembledText = '';

      for await (const textChunk of streamResult.textStream) {
        assembledText += textChunk;
        emit({ name: 'delta', data: { text: textChunk } });
      }

      const usageMetadata = await streamResult.getUsageMetadata();
      spanController.end({
        outputText: assembledText || undefined,
        usage: usageMetadata
          ? {
              inputTokens: usageMetadata.inputTokens,
              outputTokens: usageMetadata.outputTokens,
            }
          : undefined,
      });

      return { resolved, assembledText, usageMetadata };
    };

    try {
      const result = await this.resilientExecutor.executeWithRetryAndFallback({
        primaryAlias: requestBody.modelAlias,
        fallbackAlias: primaryResolved.fallbackAlias,
        retry: {
          maxAttempts:
            primaryResolved.policy?.retry?.maxAttempts ??
            RETRY_POLICY_DEFAULTS.maxAttempts,
          onStatus:
            primaryResolved.policy?.retry?.onStatus ??
            RETRY_POLICY_DEFAULTS.onStatus,
          timeoutMs:
            primaryResolved.policy?.timeoutMs ??
            RETRY_POLICY_DEFAULTS.timeoutMs,
        },
        runOnce,
        requestId,
      });

      const { resolved } = result.value;
      const usedAlias = result.usedAlias;
      const didFallback = result.didFallback;

      emit({ name: 'done', data: {} });

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
