import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfig } from '../../../config/typed-config';
import type { CacheBackend } from '../../interfaces/cache-backend-interface';
import { RedisConnectionService } from './redis-connection.service';
import { CacheRegistryService } from '../../cache-registry.service';
import { LoggingService } from '../../../logging/logging.service';
import {
  asCacheTtlSeconds,
  unbrand,
  type CacheKey,
  type CacheTtlSeconds,
} from '../../../common/types/branded.types';

@Injectable()
export class RedisCacheAdapter implements CacheBackend, OnModuleInit {
  private readonly logger: LoggingService;

  constructor(
    private readonly connection: RedisConnectionService,
    private readonly config: ConfigService,
    private readonly registry: CacheRegistryService,
    private readonly loggingService: LoggingService,
  ) {
    const logger = this.loggingService.child({
      module: 'RedisCacheAdapter',
    });
    this.logger = logger;
  }

  onModuleInit(): void {
    this.registry.register('redis', this);
  }

  isAvailable(): boolean {
    return this.connection.isReady();
  }

  async get(key: CacheKey): Promise<string | null> {
    const client = this.connection.getClient();
    if (!client) return null;

    try {
      return await client.get(key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis  GET failed for key ${key}: ${msg}`);
      return null;
    }
  }

  async set(
    key: CacheKey,
    value: string,
    ttlSeconds?: CacheTtlSeconds,
  ): Promise<boolean> {
    const client = this.connection.getClient();
    if (!client) return false;
    const ttl = unbrand(
      ttlSeconds ??
        getAppConfig(this.config, 'cache')?.ttl ??
        asCacheTtlSeconds(3600),
    );

    try {
      // First-writer-wins: NX. null = klucz już istnieje → sukces ścieżki (nie „Failed to cache”).
      const result =
        ttl > 0
          ? await client.set(key, value, 'EX', ttl, 'NX')
          : await client.set(key, value, 'NX');

      if (result === null) {
        this.logger.debug(`Redis SET NX noop (key already exists): ${key}`);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis SET failed for key ${key}: ${message}`);
      return false;
    }
  }

  async delete(key: CacheKey): Promise<boolean> {
    const client = this.connection.getClient();
    if (!client) return false;
    try {
      const removed = await client.del(key);
      return removed > 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis DELETE failed for key ${key}: ${message}`);
      return false;
    }
  }
}
