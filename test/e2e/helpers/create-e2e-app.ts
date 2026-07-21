import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from '../../../src/app.module';
import { setupApp } from '../../../src/setup.app';
import { ProviderRegistryService } from '../../../src/providers/provider-registry.service';
import { SmartRateLimiterService } from '../../../src/rate-limit/smart-rate-limiter.service';
import { RedisConnectionService } from '../../../src/cache/adapters/redis-cache/redis-connection.service';
import { ProviderInstancesBootstrap } from '../../../src/providers/provider-instances.bootstrap';
import { LoggingService } from '../../../src/logging/logging.service';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../../../src/common/mocks/createMockConfigService';
import {
  TEST_API_KEY_REF,
  TEST_PROVIDER_INSTANCE,
} from '../../../src/common/mocks/test-constants';
import { asEnvRef, asProviderApiKey } from '../../../src/common/types';
import {
  createE2eProviderRegistry,
  type E2eProviderRegistryMock,
} from './e2e-provider-registry';
import { E2E_GATEWAY_KEY } from './e2e-constants';
import {
  createE2eLoggingServiceMock,
  createE2eProviderBootstrapMock,
  createE2eRedisConnectionMock,
} from './e2e-infra-mocks';

export type CreateE2eAppOptions = {
  config?: MockConfigServiceOptions;
  providerRegistry?: E2eProviderRegistryMock;
  rateLimiter?: Partial<SmartRateLimiterService>;
  /** Mirrors production bootstrap in `src/main.ts` (before `setupApp`). */
  applyHelmet?: boolean;
};

export type E2eAppContext = {
  app: INestApplication;
  moduleFixture: TestingModule;
  providerRegistry: E2eProviderRegistryMock;
};

function createDefaultE2eConfigOptions(): MockConfigServiceOptions {
  return {
    cache: { enabled: false, backend: 'noop' },
    redis: null,
    gatewayKey: {
      allowList: [E2E_GATEWAY_KEY],
      masterKey: E2E_GATEWAY_KEY,
    },
    providers: {
      [TEST_PROVIDER_INSTANCE]: {
        type: 'anthropic',
        apiKeyRef: asEnvRef(TEST_API_KEY_REF),
        apiKey: asProviderApiKey('sk-test-api-key'),
      },
    },
    extra: {
      RATE_LIMIT_SMART_ENABLED: false,
    },
  };
}

export async function createE2eApp(
  options: CreateE2eAppOptions = {},
): Promise<E2eAppContext> {
  const defaultConfig = createDefaultE2eConfigOptions();
  const configOptions: MockConfigServiceOptions = {
    ...defaultConfig,
    ...options.config,
    extra: {
      ...defaultConfig.extra,
      ...options.config?.extra,
    },
  };

  const providerRegistry =
    options.providerRegistry ?? createE2eProviderRegistry();

  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(createMockConfigService(configOptions))
    .overrideProvider(ProviderRegistryService)
    .useValue(providerRegistry)
    .overrideProvider(RedisConnectionService)
    .useValue(createE2eRedisConnectionMock())
    .overrideProvider(ProviderInstancesBootstrap)
    .useValue(createE2eProviderBootstrapMock())
    .overrideProvider(LoggingService)
    .useValue(createE2eLoggingServiceMock());

  if (options.rateLimiter) {
    moduleBuilder
      .overrideProvider(SmartRateLimiterService)
      .useValue(options.rateLimiter);
  }

  const moduleFixture = await moduleBuilder.compile();

  const app = moduleFixture.createNestApplication();

  if (options.applyHelmet) {
    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      }),
    );
  }

  setupApp(app);
  await app.init();

  return { app, moduleFixture, providerRegistry };
}

export async function closeE2eApp(app: INestApplication): Promise<void> {
  await app.close();
}

export async function withE2eApp<T>(
  options: CreateE2eAppOptions,
  run: (context: E2eAppContext) => Promise<T>,
): Promise<T> {
  const context = await createE2eApp(options);
  try {
    return await run(context);
  } finally {
    await closeE2eApp(context.app);
  }
}
