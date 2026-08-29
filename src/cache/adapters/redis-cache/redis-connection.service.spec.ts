import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createMockConfigService } from '../../../common/mocks/createMockConfigService';
import { createMockLoggingService } from '../../../common/mocks/createMockLoggingService';
import { LoggingService } from '../../../logging/logging.service';
import { RedisConnectionService } from './redis-connection.service';

type MockRedis = {
  status: string;
  options: { host: string; port: number };
  connect: jest.Mock;
  ping: jest.Mock;
  quit: jest.Mock;
  disconnect: jest.Mock;
  on: jest.Mock;
  removeAllListeners: jest.Mock;
};

const mockRedisInstances: MockRedis[] = [];

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const instance: MockRedis = {
      status: 'wait',
      options: { host: '127.0.0.1', port: 6379 },
      connect: jest.fn().mockImplementation(() => {
        instance.status = 'ready';
        return Promise.resolve();
      }),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    };
    mockRedisInstances.push(instance);
    return instance;
  });
});

describe('RedisConnectionService', () => {
  let service: RedisConnectionService;

  async function createService(options?: {
    cacheEnabled?: boolean;
    semanticEnabled?: boolean;
  }): Promise<RedisConnectionService> {
    mockRedisInstances.length = 0;
    const module = await Test.createTestingModule({
      providers: [
        RedisConnectionService,
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            cache: {
              enabled: options?.cacheEnabled ?? true,
              backend: 'redis',
            },
            semanticCache: {
              enabled: options?.semanticEnabled ?? true,
            },
            redis: {
              host: '127.0.0.1',
              port: 6379,
              db: 0,
            },
          }),
        },
        {
          provide: LoggingService,
          useValue: createMockLoggingService(),
        },
      ],
    }).compile();

    return module.get(RedisConnectionService);
  }

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });

  it('should connect on module init when Redis is required', async () => {
    service = await createService();
    await service.onModuleInit();

    expect(mockRedisInstances).toHaveLength(1);
    expect(mockRedisInstances[0].connect).toHaveBeenCalled();
    expect(service.getClient()).toBe(mockRedisInstances[0]);
    expect(service.isReady()).toBe(true);
  });

  it('should leave client null after failed init but recreate on later getClient (K2)', async () => {
    service = await createService();
    const RedisCtor = jest.requireMock('ioredis');
    RedisCtor.mockImplementationOnce(() => {
      const instance: MockRedis = {
        status: 'wait',
        options: { host: '127.0.0.1', port: 6379 },
        connect: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        ping: jest.fn(),
        quit: jest.fn(),
        disconnect: jest.fn(),
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      };
      mockRedisInstances.push(instance);
      return instance;
    });

    await service.onModuleInit();
    expect(service.getClient()).toBeNull();
    expect(service.isReady()).toBe(false);

    // Cooldown elapsed — allow recreate
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 5_000);

    const ready = await service.ensureConnected();
    expect(ready).toBeUndefined();
    expect(service.getClient()).not.toBeNull();
    expect(service.isReady()).toBe(true);
    expect(mockRedisInstances.length).toBeGreaterThanOrEqual(2);

    jest.restoreAllMocks();
  });

  it('should not connect when Redis is not required', async () => {
    service = await createService({
      cacheEnabled: false,
      semanticEnabled: false,
    });
    await service.onModuleInit();

    expect(mockRedisInstances).toHaveLength(0);
    expect(service.getClient()).toBeNull();
    expect(service.isReady()).toBe(false);
  });

  it('should coalesce concurrent ensureConnected calls', async () => {
    service = await createService();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });

    const RedisCtor = jest.requireMock('ioredis');
    RedisCtor.mockImplementationOnce(() => {
      const instance: MockRedis = {
        status: 'wait',
        options: { host: '127.0.0.1', port: 6379 },
        connect: jest.fn().mockImplementation(async () => {
          await gate;
          instance.status = 'ready';
        }),
        ping: jest.fn().mockResolvedValue('PONG'),
        quit: jest.fn(),
        disconnect: jest.fn(),
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      };
      mockRedisInstances.push(instance);
      return instance;
    });

    const a = service.ensureConnected();
    const b = service.ensureConnected();
    release();
    await Promise.all([a, b]);

    expect(mockRedisInstances).toHaveLength(1);
  });
});
