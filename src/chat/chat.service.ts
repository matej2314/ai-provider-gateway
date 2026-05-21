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
import type {
  ProviderCallOptions,
  ProviderChatTurn,
} from '../providers/interfaces/ai-provider.interface';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SseEvent } from './sse/sse-event.type';
import { ResponseCacheService } from '../cache/response-cache.service';
import type { GatewayConfig } from '../config/configuration';
import type {
  LlmCallContext,
  LlmCallMessage,
} from '../metrics/interfaces/metrics-backend.interface';

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
  ) {}

  /** ID from the client — used only for Sentry conversation grouping. */
  private getClientConversationId(
    requestBody: ChatRequestDto,
  ): string | undefined {
    const id = requestBody.conversationId?.trim();
    return id || undefined;
  }

  /** ID returned to the client (echo or new conv_* for adoption on the next turn). */
  private getOrCreateConversationIdForResponse(
    requestBody: ChatRequestDto,
  ): string {
    return this.getClientConversationId(requestBody) ?? `conv_${uuidv4()}`;
  }

  private toMetricsMessages(messages: ChatMessageDto[]): LlmCallMessage[] {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  private buildLlmMetricsContext(
    requestBody: ChatRequestDto,
    provider: string,
    modelAlias: string,
    modelId: string,
    requestId: string,
  ): LlmCallContext {
    return {
      provider,
      modelAlias,
      modelId,
      requestId,
      conversationId: this.getClientConversationId(requestBody),
      messages: this.toMetricsMessages(requestBody.messages),
    };
  }

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

  private buildProviderInput(request: ChatRequestDto) {
    const resolved = this.getResolvedPrompts();
    return {
      system: this.composeSystemPrompt(resolved, request.modelAlias),
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
      this.getOrCreateConversationIdForResponse(requestBody);

    const { provider, providerName, modelId, params } = this.registry.resolve(
      requestBody.modelAlias,
    );

    const options = resolveProviderCallOptions(params, requestBody.params);

    if (gatewayKey) {
      const cooldownResult = await this.rateLimiter.checkCooldown(
        gatewayKey,
        providerName,
      );

      if (!cooldownResult.allowed) {
        log.warn('Rate limit exceeded', {
          provider: providerName,
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

    const providerInput = this.buildProviderInput(requestBody);

    try {
      const startedAt = Date.now();

      const response = await this.metricsService.observeLlmCall(
        this.buildLlmMetricsContext(
          requestBody,
          providerName,
          requestBody.modelAlias,
          modelId,
          requestId,
        ),
        () => provider.complete(providerInput, modelId, options),
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

      const result = {
        id: `gw_${uuidv4()}`,
        provider: providerName,
        model: requestBody.modelAlias,
        output: {
          type: 'text',
          text: response.text,
        },
        usage: response.usage,
        requestId: requestId,
        conversationId: responseConversationId,
      };

      const latency = Date.now() - startedAt;

      await this.cacheService.setCachedResponse(requestBody, result, options);
      log.info('Chat completed successfully', {
        provider: providerName,
        modelId,
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
      });
      return result;
    } catch (error) {
      await this.handleProviderError(log, error, providerName, gatewayKey);
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
      this.getOrCreateConversationIdForResponse(requestBody);

    const { provider, providerName, modelId, capabilities, params } =
      this.registry.resolve(requestBody.modelAlias);

    if (!capabilities?.streaming) {
      log.warn('Streaming not supported for this model', {
        provider: providerName,
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

    if (!provider.stream) {
      log.warn('Streaming adapter not implemented for this provider', {
        provider: providerName,
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

    const providerInput = this.buildProviderInput(requestBody);

    const options: ProviderCallOptions = resolveProviderCallOptions(
      params,
      requestBody.params,
    );

    const id = `gw_${uuidv4()}`;

    emit({
      name: 'meta',
      data: {
        id,
        provider: providerName,
        model: requestBody.modelAlias,
        requestId,
        conversationId: responseConversationId,
      },
    });

    const spanController = this.metricsService.observeLlmStream(
      this.buildLlmMetricsContext(
        requestBody,
        providerName,
        requestBody.modelAlias,
        modelId,
        requestId,
      ),
    );

    try {
      const startedAt = Date.now();

      const streamResult = provider.stream(providerInput, modelId, options);
      let assembledText = '';

      for await (const textChunk of streamResult.textStream) {
        assembledText += textChunk;
        emit({ name: 'delta', data: { text: textChunk } });
      }

      emit({ name: 'done', data: {} });

      log.info('Chat stream completed', {
        provider: providerName,
        modelId,
        latency: Date.now() - startedAt,
        conversationId: responseConversationId,
      });

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
    } catch (error) {
      spanController.end({});
      await this.handleProviderError(log, error, providerName);
      throw error;
    }
  }
}
