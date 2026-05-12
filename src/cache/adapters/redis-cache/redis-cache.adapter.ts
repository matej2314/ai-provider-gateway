import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CacheBackend } from '../../interfaces/cache-backend-interface';
import { RedisConnectionService } from './redis-connection.service';
import { CacheRegistryService } from '../../cache-registry.service';

@Injectable()
export class RedisCacheAdapter implements CacheBackend, OnModuleInit {
  private readonly logger = new Logger(RedisCacheAdapter.name);

  constructor(
    private readonly connection: RedisConnectionService,
    private readonly config: ConfigService,
    private readonly registry: CacheRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register('redis', this);
  }

  isAvailable(): boolean {
    return this.connection.isReady();
  }

  async get(key: string): Promise<string | null> {
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

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    const client = this.connection.getClient();
    if (!client) return false;
    const ttl = ttlSeconds ?? this.config.get<number>('cache.ttl', 3600);

    try {
      if (ttl > 0) {
        await client.set(key, value, 'EX', ttl);
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis SET failed for key ${key}: ${message}`);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
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
