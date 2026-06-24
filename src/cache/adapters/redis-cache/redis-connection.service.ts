import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../../../config/typed-config';
import { LoggingService } from '../../../logging/logging.service';
import { isRedisRequiredFromConfig } from '../../should-include-redis-stack';
import Redis from 'ioredis';

@Injectable()
export class RedisConnectionService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private client: Redis | null = null;
  private readonly logger: LoggingService;

  constructor(
    private readonly config: ConfigService,
    loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({ module: 'RedisConnectionService' });
  }

  async onModuleInit(): Promise<void> {
    if (!isRedisRequiredFromConfig(this.config)) {
      return;
    }

    const redis = getAppConfigOrThrow(this.config, 'redis');

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
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        retryStrategy: (times: number) => Math.min(times * 100, 3000),
      });

      this.client.on('error', (err) => {
        this.logger.warn('Redis client error', {
          message: err.message,
        });
      });

      this.client.on('reconnecting', () => {
        this.logger.warn('Redis client reconnecting...', {
          host: this.client?.options.host,
          port: this.client?.options.port,
        });
      });

      await this.client.connect();
      await this.client.ping();
      this.logger.info('Redis connected.', {
        host: redis.host,
        port: redis.port,
        db: redis.db,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('Redis connection failed', {
        host: redis.host,
        port: redis.port,
        message,
      });
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
      this.logger.debug('Redis client disconnected.', {
        host: this.client.options.host,
        port: this.client.options.port,
      });
      this.client.disconnect();
    } finally {
      this.client.removeAllListeners();
      this.client = null;
    }
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.info(`Redis connection shutting down`, {
      signal: signal ?? 'unknown signal',
    });
    await this.onModuleDestroy();
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  async ping(): Promise<boolean> {
    if (!this.isReady() || !this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
