import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppMetricsService } from '../observability/app-metrics/app-metrics.service';
import { createHash } from 'crypto';
import { CACHE_BACKEND } from './cache.tokens';
import { LoggingService } from '../logging/logging.service';
import { parseCachedChatResponse } from './schemas/cached-chat-response.schema';
import { isUnservableCachedReply } from './helpers/is-unservable-cached-reply';
import {
  computeSystemSignature,
  serializeCallParamsForCache,
} from './cache-identity';
import type { CacheBackend } from './interfaces/cache-backend-interface';
import { getAppConfig, getAppConfigOrThrow } from '../config/typed-config';
import type { CachedChatResponse } from './types/cached-chat-response.type';
import type { ChatCacheIdentity } from './types/chat-cache-identity.type';
import {
  asCacheKey,
  asCacheTtlSeconds,
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

  buildIdentityKey(identity: ChatCacheIdentity): CacheKey {
    const prompts = getAppConfigOrThrow(this.config, 'resolvedSystemPrompts');
    const systemSignature = computeSystemSignature(
      prompts,
      identity.modelAlias,
    );

    const payload = JSON.stringify({
      modelAlias: identity.modelAlias,
      clientId: identity.clientId,
      messages: identity.messages,
      systemSignature,
      callParams: serializeCallParamsForCache(identity.callParams),
    });
    const hash = createHash('sha256').update(payload).digest('hex');
    const prefix =
      getAppConfig(this.config, 'cache')?.keyPrefix ||
      getAppConfig(this.config, 'redis')?.keyPrefix ||
      'aigw:';
    return asCacheKey(`${prefix}cache:chat:${hash}`);
  }

  private recordCacheAccess(identity: ChatCacheIdentity, hit: boolean): void {
    this.appMetrics.recordCacheAccess(identity.modelAlias, hit);
  }

  async getCachedResponse(
    identity: ChatCacheIdentity,
  ): Promise<CachedChatResponse | null> {
    if (!this.cache.isAvailable()) return null;

    const key = this.buildIdentityKey(identity);
    const cached = await this.cache.get(key);

    if (!cached) {
      this.logger.debug(`Cache MISS for key: ${key}`);
      this.recordCacheAccess(identity, false);
      return null;
    }

    try {
      const raw: unknown = JSON.parse(cached);
      const parsed = parseCachedChatResponse(raw);
      if (!parsed) {
        this.logger.warn(`Invalid cached response shape for key: ${key}`);
        await this.cache.delete(key);
        this.recordCacheAccess(identity, false);
        return null;
      }
      if (isUnservableCachedReply(parsed)) {
        this.logger.warn(`Unservable cached reply for key: ${key}`);
        await this.cache.delete(key);
        this.recordCacheAccess(identity, false);
        return null;
      }
      this.logger.info(`Cache HIT for key: ${key}`);
      this.recordCacheAccess(identity, true);
      return parsed;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to parse cached response for key: ${key}:`,
        err,
      );
      await this.cache.delete(key);
      this.recordCacheAccess(identity, false);
      return null;
    }
  }

  async setCachedResponse(
    identity: ChatCacheIdentity,
    cachedResponse: CachedChatResponse,
    ttlSeconds?: CacheTtlSeconds,
  ): Promise<void> {
    if (!this.cache.isAvailable()) return;

    const key = this.buildIdentityKey(identity);
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

  async invalidateCache(identity: ChatCacheIdentity): Promise<void> {
    const key = this.buildIdentityKey(identity);
    const success = await this.cache.delete(key);

    if (success) {
      this.logger.info(`Cache invalidated for key: ${key}`);
    }
  }
}
