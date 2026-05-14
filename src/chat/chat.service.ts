import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { ConfigService } from '@nestjs/config';
import { SmartRateLimiterService } from '../rate-limit/smart-rate-limiter.service';
import { v4 as uuidv4 } from 'uuid';
import type { ResolvedSystemPrompts } from '../config/configuration.types';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import type {
  ProviderCallOptions,
  ProviderChatTurn,
} from '../providers/interfaces/ai-provider.interface';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SseEvent } from './sse/sse-event.type';
import { ResponseCacheService } from '../cache/response-cache.service';
import type { GatewayConfig } from '../config/configuration';

const SYSTEM_PROMPT_SECTION_JOINER = '\n\n';

@Injectable()
export class ChatService {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly config: ConfigService,
    private readonly cacheService: ResponseCacheService,
    private readonly rateLimiter: SmartRateLimiterService,
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

  async executeChat(
    requestBody: ChatRequestDto,
    requestId: string,
    gatewayKey: string,
  ) {
    const cachedResponse =
      await this.cacheService.getCachedResponse(requestBody);

    if (
      cachedResponse &&
      this.isCachedChatAllowedForModelAlias(requestBody.modelAlias)
    ) {
      return cachedResponse;
    }

    const { provider, providerName, modelId, params } = this.registry.resolve(
      requestBody.modelAlias,
    );

    if (gatewayKey) {
      const cooldownResult = await this.rateLimiter.checkCooldown(
        gatewayKey,
        providerName,
      );

      if (!cooldownResult.allowed) {
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
    }

    const providerInput = this.buildProviderInput(requestBody);

    const options: ProviderCallOptions = {
      temperature: params?.defaults?.temperature ?? undefined,
      maxOutputTokens: params?.defaults?.maxOutputTokens ?? undefined,
    };

    try {
      const response = await provider.complete(providerInput, modelId, options);

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
      };

      await this.cacheService.setCachedResponse(requestBody, result);
      return result;
    } catch (error) {
      if (
        gatewayKey &&
        error instanceof HttpException &&
        error.getStatus() === 429
      ) {
        await this.rateLimiter.setCooldown(gatewayKey, providerName);
      }
      throw error;
    }
  }

  validateForStreaming(modelAlias: string) {
    const resolved = this.registry.resolve(modelAlias);
    if (!resolved.capabilities?.streaming) {
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
    const { provider, providerName, modelId, capabilities, params } =
      this.registry.resolve(requestBody.modelAlias);

    if (!capabilities?.streaming) {
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

    const options: ProviderCallOptions = {
      temperature: params?.defaults?.temperature ?? undefined,
      maxOutputTokens: params?.defaults?.maxOutputTokens ?? undefined,
    };

    const id = `gw_${uuidv4()}`;

    emit({
      name: 'meta',
      data: {
        id,
        provider: providerName,
        model: requestBody.modelAlias,
        requestId,
      },
    });

    const textStream = provider.stream(providerInput, modelId, options);

    for await (const textChunk of textStream) {
      emit({ name: 'delta', data: { text: textChunk } });
    }

    emit({ name: 'done', data: {} });
  }
}
