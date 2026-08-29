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

const RECONNECT_COOLDOWN_MS = 2_000;

@Injectable()
export class RedisConnectionService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private client: Redis | null = null;
  private connectInFlight: Promise<void> | null = null;
  private nextRetryAtMs = 0;
  private closed = false;
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
    await this.ensureConnected();
  }

  getClient(): Redis | null {
    if (this.closed || !isRedisRequiredFromConfig(this.config)) {
      return null;
    }
    if (this.client) {
      return this.client;
    }
    this.scheduleEnsureConnected();
    return null;
  }

  isReady(): boolean {
    if (this.closed || !isRedisRequiredFromConfig(this.config)) {
      return false;
    }
    if (this.client?.status === 'ready') {
      return true;
    }
    if (!this.client) {
      this.scheduleEnsureConnected();
    }
    return false;
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

  async ensureConnected(): Promise<void> {
    if (this.closed || !isRedisRequiredFromConfig(this.config)) {
      return;
    }
    if (this.client?.status === 'ready') {
      return;
    }
    // Live client still owned by ioredis retryStrategy — do not recreate.
    if (
      this.client &&
      (this.client.status === 'connecting' ||
        this.client.status === 'reconnecting' ||
        this.client.status === 'wait')
    ) {
      return;
    }
    if (this.connectInFlight) {
      return this.connectInFlight;
    }
    if (Date.now() < this.nextRetryAtMs) {
      return;
    }

    this.connectInFlight = this.establishConnection().finally(() => {
      this.connectInFlight = null;
    });
    return this.connectInFlight;
  }

  async onModuleDestroy(): Promise<void> {
    this.closed = true;
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

  private scheduleEnsureConnected(): void {
    void this.ensureConnected();
  }

  private async establishConnection(): Promise<void> {
    const redis = getAppConfigOrThrow(this.config, 'redis');
    const password =
      redis.password && redis.password.trim().length > 0
        ? redis.password
        : undefined;

    this.disposeClient();

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
      this.nextRetryAtMs = 0;
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
      this.disposeClient();
      this.nextRetryAtMs = Date.now() + RECONNECT_COOLDOWN_MS;
    }
  }

  private disposeClient(): void {
    if (!this.client) return;
    try {
      this.client.removeAllListeners();
      this.client.disconnect();
    } catch {
      /* ignore dispose races */
    }
    this.client = null;
  }
}
