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
import { createE2eLoggingServiceMock } from '../../e2e/helpers/e2e-infra-mocks';
import {
  INTEGRATION_GATEWAY_CLIENT_ID,
  INTEGRATION_GATEWAY_KEY_REF,
  INTEGRATION_MASTER_KEY_REF,
  INTEGRATION_RESOLVED_PROMPTS,
  getIntegrationGatewayKey,
  readIntegrationEnv,
} from './integration-constants';
import {
  INTEGRATION_OPENAI_API_KEY_REF,
  INTEGRATION_OPENAI_BASE_URL_REF,
  INTEGRATION_OPENAI_PROVIDER_INSTANCE,
} from './integration-openai-constants';
import { buildOpenAiIntegrationGatewayModels } from './integration-openai-gateway-config';
import { requireOpenAiIntegrationEnv } from './require-integration-env';
import {
  asBaseUrl,
  asEnvRef,
  asGatewayKey,
  asProviderApiKey,
} from '../../../src/common/types';

export type CreateOpenAiIntegrationAppOptions = {
  cacheEnabled?: boolean;
  rateLimitEnabled?: boolean;
};

export type OpenAiIntegrationAppContext = {
  app: INestApplication;
  moduleFixture: TestingModule;
};

function buildOpenAiIntegrationConfigOptions(
  options: CreateOpenAiIntegrationAppOptions,
): MockConfigServiceOptions {
  const cacheEnabled =
    options.cacheEnabled ?? process.env.CACHE_ENABLED === 'true';
  const rateLimitEnabled =
    options.rateLimitEnabled ?? process.env.RATE_LIMIT_SMART_ENABLED === 'true';
  const gatewayKey = getIntegrationGatewayKey();
  const masterKey = readIntegrationEnv(INTEGRATION_MASTER_KEY_REF);
  const { apiKey, baseUrl } = requireOpenAiIntegrationEnv();

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
        [INTEGRATION_OPENAI_PROVIDER_INSTANCE]: {
          type: 'openai',
          apiKeyRef: asEnvRef(INTEGRATION_OPENAI_API_KEY_REF),
          baseUrlRef: asEnvRef(INTEGRATION_OPENAI_BASE_URL_REF),
          enabled: true,
        },
      },
      models: buildOpenAiIntegrationGatewayModels(),
    },
    gatewayKey: {
      allowList: [gatewayKey, ...(masterKey ? [asGatewayKey(masterKey)] : [])],
      masterKey: masterKey ? asGatewayKey(masterKey) : asGatewayKey(''),
    },
    providers: {
      [INTEGRATION_OPENAI_PROVIDER_INSTANCE]: {
        type: 'openai',
        apiKeyRef: asEnvRef(INTEGRATION_OPENAI_API_KEY_REF),
        apiKey: asProviderApiKey(apiKey),
        baseUrlRef: asEnvRef(INTEGRATION_OPENAI_BASE_URL_REF),
        baseUrl: asBaseUrl(baseUrl),
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

export async function createOpenAiIntegrationApp(
  options: CreateOpenAiIntegrationAppOptions = {},
): Promise<OpenAiIntegrationAppContext> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(
      createMockConfigService(buildOpenAiIntegrationConfigOptions(options)),
    )
    .overrideProvider(LoggingService)
    .useValue(createE2eLoggingServiceMock())
    .compile();

  const app = moduleFixture.createNestApplication();
  setupApp(app);
  await app.init();

  return { app, moduleFixture };
}

export async function closeOpenAiIntegrationApp(
  app: INestApplication,
): Promise<void> {
  await app.close();
}
