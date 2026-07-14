import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { createHash } from 'crypto';
import { ChatRequestDto } from '../chat/dto/chat-request.dto';
import { CACHE_BACKEND } from './cache.tokens';
import { ProviderCallOptions } from '../providers/interfaces/ai-provider.interface';
import { LoggingService } from '../logging/logging.service';
import { parseCachedChatResponse } from './schemas/cached-chat-response.schema';
import type { CacheBackend } from './interfaces/cache-backend-interface';
import { getAppConfig, getAppConfigOrThrow } from '../config/typed-config';
import type { ChatResponseData } from '../chat/services/chat-response-builder.service';
import type { CachedChatResponse } from './types/cached-chat-response.type';
import {
  asProviderInstanceId,
  asInputTokens,
  asOutputTokens,
  asCacheKey,
  asCacheTtlSeconds,
  asModelAlias,
  type CacheKey,
  type CacheTtlSeconds,
} from '../common/types/branded.types';

export type { CachedChatResponse } from './types/cached-chat-response.type';

@Injectable()
export class ResponseCacheService {
  private readonly logger: LoggingService;

  constructor(
    @Inject(CACHE_BACKEND) private readonly cache: CacheBackend,
    private readonly config: ConfigService,
    private readonly loggingService: LoggingService,
    private readonly appMetrics: AppMetricsService,
  ) {
    const logger = this.loggingService.child({
      module: 'ResponseCacheService',
    });
    this.logger = logger;
  }

  private generateCacheKey(
    request: ChatRequestDto,
    effectiveCallParams?: ProviderCallOptions,
  ): CacheKey {
    const prompts = getAppConfigOrThrow(this.config, 'resolvedSystemPrompts');
    const systemSignature = createHash('sha256')
      .update(prompts.master)
      .update('|')
      .update(prompts.main ?? '')
      .update('|')
      .update(prompts.perModelByAlias[request.modelAlias] ?? '')
      .digest('hex');

    const payload = JSON.stringify({
      modelAlias: request.modelAlias,
      messages: request.messages,
      systemSignature,
      callParams: this.serializeCallParamsForCache(effectiveCallParams),
    });
    const hash = createHash('sha256').update(payload).digest('hex');
    const prefix =
      getAppConfig(this.config, 'cache')?.keyPrefix ||
      getAppConfig(this.config, 'redis')?.keyPrefix ||
      'aigw:';
    return asCacheKey(`${prefix}cache:chat:${hash}`);
  }

  private recordCacheAccess(request: ChatRequestDto, hit: boolean): void {
    this.appMetrics.recordCacheAccess(asModelAlias(request.modelAlias), hit);
  }

  private serializeCallParamsForCache(
    effectiveCallParams?: ProviderCallOptions,
  ): Record<string, unknown> {
    const stop = effectiveCallParams?.stop;
    return {
      temperature: effectiveCallParams?.temperature ?? null,
      maxOutputTokens: effectiveCallParams?.maxOutputTokens ?? null,
      topP: effectiveCallParams?.topP ?? null,
      stop: stop === undefined ? null : stop,
      frequencyPenalty: effectiveCallParams?.frequencyPenalty ?? null,
      presencePenalty: effectiveCallParams?.presencePenalty ?? null,
      seed: effectiveCallParams?.seed ?? null,
      responseFormat: effectiveCallParams?.responseFormat ?? null,
    };
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
      this.recordCacheAccess(request, false);
      return null;
    }

    try {
      const raw: unknown = JSON.parse(cached);
      const parsed = parseCachedChatResponse(raw);
      if (!parsed) {
        this.logger.warn(`Invalid cached response shape for key: ${key}`);
        await this.cache.delete(key);
        this.recordCacheAccess(request, false);
        return null;
      }
      this.logger.info(`Cache HIT for key: ${key}`);
      this.recordCacheAccess(request, true);
      return parsed;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to parse cached response for key: ${key}:`,
        err,
      );
      await this.cache.delete(key);
      this.recordCacheAccess(request, false);
      return null;
    }
  }

  async setCachedResponse(
    request: ChatRequestDto,
    response: ChatResponseData,
    effectiveCallParams?: ProviderCallOptions,
    ttlSeconds?: CacheTtlSeconds,
  ): Promise<void> {
    if (!this.cache.isAvailable()) return;

    const key = this.generateCacheKey(request, effectiveCallParams);
    const cachedResponse: CachedChatResponse = {
      id: response.id,
      provider: asProviderInstanceId(response.provider),
      model: response.model,
      output: response.output,
      requestId: response.requestId,
      ...(response.usage && {
        usage: {
          inputTokens: asInputTokens(response.usage.inputTokens ?? 0),
          outputTokens: asOutputTokens(response.usage.outputTokens ?? 0),
        },
      }),
      ...(response.warnings?.length && { warnings: response.warnings }),
      cached: true,
      cachedAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(cachedResponse);
    const configuredTtl = getAppConfig(this.config, 'cache')?.ttl;
    const defaultTtl = configuredTtl ?? asCacheTtlSeconds(3600);
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
