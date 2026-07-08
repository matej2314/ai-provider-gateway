import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../src/app.module';
import { setupApp } from '../../../src/setup.app';
import { LoggingService } from '../../../src/logging/logging.service';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../../../src/common/mocks/createMockConfigService';
import {
  asEnvRef,
  asGatewayKey,
  asProviderApiKey,
} from '../../../src/common/types';
import { createE2eLoggingServiceMock } from '../../e2e/helpers/e2e-infra-mocks';
import {
  INTEGRATION_ANTHROPIC_API_KEY_REF,
  INTEGRATION_GATEWAY_CLIENT_ID,
  INTEGRATION_GATEWAY_KEY_REF,
  INTEGRATION_MASTER_KEY_REF,
  INTEGRATION_PROVIDER_INSTANCE,
  INTEGRATION_RESOLVED_PROMPTS,
  buildIntegrationGatewayKeyAllowList,
  getIntegrationMasterKey,
  readIntegrationEnv,
} from './integration-constants';
import { requireVendorApiKey } from './require-integration-env';
import { buildIntegrationGatewayModels } from './integration-gateway-config';

export type CreateIntegrationAppOptions = {
  cacheEnabled?: boolean;
  rateLimitEnabled?: boolean;
  dualModel?: boolean;
  toolsEnabled?: boolean;
};

export type IntegrationAppContext = {
  app: INestApplication;
  moduleFixture: TestingModule;
};

function buildIntegrationConfigOptions(
  options: CreateIntegrationAppOptions,
): MockConfigServiceOptions {
  const cacheEnabled =
    options.cacheEnabled ?? process.env.CACHE_ENABLED === 'true';
  const rateLimitEnabled =
    options.rateLimitEnabled ?? process.env.RATE_LIMIT_SMART_ENABLED === 'true';
  const allowList = buildIntegrationGatewayKeyAllowList();
  const masterKeyRaw = readIntegrationEnv(INTEGRATION_MASTER_KEY_REF);
  const apiKey = requireVendorApiKey() ?? '';

  return {
    gatewayOptions: {
      replace: { clients: true, providers: true, models: true },
      clients: {
        [INTEGRATION_GATEWAY_CLIENT_ID]: {
          name: 'Integration IDE Client',
          type: 'ide',
          gatewayKeyRef: asEnvRef(INTEGRATION_GATEWAY_KEY_REF),
        },
      },
      providers: {
        [INTEGRATION_PROVIDER_INSTANCE]: {
          type: 'anthropic',
          apiKeyRef: asEnvRef(INTEGRATION_ANTHROPIC_API_KEY_REF),
          enabled: true,
        },
      },
      models: buildIntegrationGatewayModels(
        undefined,
        options.dualModel,
        options.toolsEnabled,
      ),
    },
    gatewayKey: {
      allowList,
      masterKey: masterKeyRaw ? getIntegrationMasterKey() : asGatewayKey(''),
    },
    providers: {
      [INTEGRATION_PROVIDER_INSTANCE]: {
        type: 'anthropic',
        apiKeyRef: asEnvRef(INTEGRATION_ANTHROPIC_API_KEY_REF),
        apiKey: asProviderApiKey(apiKey),
      },
    },
    resolvedSystemPrompts: INTEGRATION_RESOLVED_PROMPTS,
    cache: {
      enabled: cacheEnabled,
      backend: cacheEnabled
        ? ((process.env.CACHE_BACKEND ?? 'redis') as 'redis')
        : 'noop',
      ttl: Number(process.env.CACHE_TTL ?? 60),
      keyPrefix: process.env.CACHE_KEY_PREFIX ?? 'it-cache:',
    },
    redis: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6380),
      password: process.env.REDIS_PASSWORD ?? '',
      db: Number(process.env.REDIS_DB ?? 15),
      keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'it:',
    },
    rateLimitSmartEnabled: rateLimitEnabled,
    nodeEnv: 'test',
    extra: {
      RATE_LIMIT_SMART_ENABLED: rateLimitEnabled,
    },
  };
}

export async function createIntegrationApp(
  options: CreateIntegrationAppOptions = {},
): Promise<IntegrationAppContext> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(createMockConfigService(buildIntegrationConfigOptions(options)))
    .overrideProvider(LoggingService)
    .useValue(createE2eLoggingServiceMock())
    .compile();

  const app = moduleFixture.createNestApplication();
  setupApp(app);
  await app.init();

  return { app, moduleFixture };
}

export async function closeIntegrationApp(
  app: INestApplication,
): Promise<void> {
  await app.close();
}

export async function withIntegrationApp<T>(
  options: CreateIntegrationAppOptions,
  run: (context: IntegrationAppContext) => Promise<T>,
): Promise<T> {
  const context = await createIntegrationApp(options);
  try {
    return await run(context);
  } finally {
    await closeIntegrationApp(context.app);
  }
}
