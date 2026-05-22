import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ChatRequestDto } from '../chat/dto/chat-request.dto';
import type { CacheBackend } from './interfaces/cache-backend-interface';
import type { ResolvedSystemPrompts } from 'src/config/configuration.types';
import { CACHE_BACKEND } from './cache.tokens';
import { ProviderCallOptions } from 'src/providers/interfaces/ai-provider.interface';
import { LoggingService } from 'src/logging/logging.service';

export interface CachedChatResponse {
  id: string;
  provider: string;
  model: string;
  output: {
    type: string;
    text: string;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  requestId: string;
  cached: true;
  cachedAt: string;
}

@Injectable()
export class ResponseCacheService {
  private readonly logger: LoggingService;

  constructor(
    @Inject(CACHE_BACKEND) private readonly cache: CacheBackend,
    private readonly config: ConfigService,
    private readonly loggingService: LoggingService,
  ) {
    const logger = this.loggingService.child({
      module: 'ResponseCacheService',
    });
    this.logger = logger;
  }

  private generateCacheKey(
    request: ChatRequestDto,
    effectiveCallParams?: ProviderCallOptions,
  ): string {
    const prompts = this.config.get<ResolvedSystemPrompts>(
      'resolvedSystemPrompts',
    );
    const systemSignature = createHash('sha256')
      .update(prompts?.master ?? '')
      .update('|')
      .update(prompts?.main ?? '')
      .update('|')
      .update(prompts?.perModelByAlias[request.modelAlias] ?? '')
      .digest('hex');

    const payload = JSON.stringify({
      modelAlias: request.modelAlias,
      messages: request.messages,
      systemSignature,
      callParams: {
        temperature: effectiveCallParams?.temperature ?? null,
        maxOutputTokens: effectiveCallParams?.maxOutputTokens ?? null,
      },
    });
    const hash = createHash('sha256').update(payload).digest('hex');
    const prefix =
      this.config.get<string>('cache.keyPrefix') ||
      this.config.get<string>('redis.keyPrefix') ||
      'aigw:';
    return `${prefix}cache:chat:${hash}`;
  }

  async getCachedResponse(
    request: ChatRequestDto,
    effectiveCallParams?: ProviderCallOptions,
  ): Promise<CachedChatResponse | null> {
    if (!this.cache.isAvailable()) return null;

    const key = this.generateCacheKey(request, effectiveCallParams);
    const cached = await this.cache.get(key);

    if (!cached) {
      this.logger.debug(`Cache MISS for key: ${key}`);
      return null;
    }

    try {
      const parsed = JSON.parse(cached) as CachedChatResponse;
      this.logger.info(`Cache HIT for key: ${key}`);
      return parsed;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to parse cached response for key: ${key}:`,
        err,
      );
      await this.cache.delete(key);
      return null;
    }
  }

  async setCachedResponse(
    request: ChatRequestDto,
    response: unknown,
    effectiveCallParams?: ProviderCallOptions,
    ttlSeconds?: number,
  ): Promise<void> {
    if (!this.cache.isAvailable()) return;

    const key = this.generateCacheKey(request, effectiveCallParams);
    const cachedResponse: CachedChatResponse = {
      ...(response as CachedChatResponse),
      cached: true,
      cachedAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(cachedResponse);
    const defaultTtl = this.config.get<number>('cache.ttl', 3600);
    const success = await this.cache.set(
      key,
      serialized,
      ttlSeconds ?? defaultTtl,
    );

    if (success) {
      this.logger.debug(`Cache SET for key: ${key}`);
    } else {
      this.logger.warn(`Failed to cache response for key: ${key}`);
    }
  }

  async invalidateCache(
    request: ChatRequestDto,
    effectiveCallParams?: ProviderCallOptions,
  ): Promise<void> {
    const key = this.generateCacheKey(request, effectiveCallParams);
    const success = await this.cache.delete(key);

    if (success) {
      this.logger.info(`Cache invalidated for key: ${key}`);
    }
  }
}
