import { RedisConnectionService } from '../../../src/cache/adapters/redis-cache/redis-connection.service';
import { ProviderInstancesBootstrap } from '../../../src/providers/provider-instances.bootstrap';
import { LoggingService } from '../../../src/logging/logging.service';
import { createMockLoggingService } from '../../../src/common/mocks/createMockLoggingService';

export function createE2eRedisConnectionMock(): Partial<RedisConnectionService> {
  return {
    onModuleInit: jest.fn().mockResolvedValue(undefined),
    onModuleDestroy: jest.fn().mockResolvedValue(undefined),
    onApplicationShutdown: jest.fn().mockResolvedValue(undefined),
    getClient: jest.fn().mockReturnValue(null),
    isReady: jest.fn().mockReturnValue(true),
    ping: jest.fn().mockResolvedValue(true),
  };
}

export function createE2eProviderBootstrapMock(): Partial<ProviderInstancesBootstrap> {
  return {
    onApplicationBootstrap: jest.fn(),
  };
}

export function createE2eLoggingServiceMock(): Partial<LoggingService> {
  return createMockLoggingService();
}
