import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisConnectionService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redis = this.config.get<{
      host: string;
      port: number;
      password: string;
      db: number;
    }>('redis');

    if (!redis) {
      this.logger.warn(
        'Redis config missing. Redis client will not be created.',
      );
      return;
    }

    const password =
      redis.password && redis.password.trim().length > 0
        ? redis.password
        : undefined;

    try {
      this.client = new Redis({
        host: redis.host,
        port: redis.port,
        password,
        db: redis.db,
        lazyConnect: false,
        maxRetriesPerRequest: 2,
        retryStrategy: (times: number) => Math.min(times * 100, 3000),
      });

      await this.client.ping();
      this.logger.log(
        `Redis connected at ${this.client.options.host}:${this.client.options.port}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis connection failed: ${message}`);
      if (this.client) {
        this.client.disconnect();
        this.client = null;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    } finally {
      this.client = null;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }
}
