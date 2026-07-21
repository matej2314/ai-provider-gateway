import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
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
import { requireOpenAiCompatibleIntegrationEnv } from './require-integration-env';
import { GatewayConfigSchema } from '../../../src/config/gateway-config.schema';
import type { GatewayConfig } from '../../../src/config/configuration';
import {
  asBaseUrl,
  asEnvRef,
  asGatewayKey,
  asModelId,
  asProviderApiKey,
  asProviderInstanceId,
} from '../../../src/common/types';
import {
  TEST_MAX_ATTEMPTS,
  TEST_TIMEOUT_MS,
} from '../../../src/common/mocks/test-constants';

export type CreateOpenAiCompatibleIntegrationAppOptions = {
  cacheEnabled?: boolean;
  rateLimitEnabled?: boolean;
};

export type OpenAiCompatibleProviderTestConfig = {
  instanceId: string;
  integrationInstanceId: string;
  apiKeyRef: string;
  baseUrlRef: string;
  apiKey: string;
  baseUrl: string;
  integrationModelAlias: string;
  integrationModelId: string;
};

export type OpenAiCompatibleIntegrationAppContext = {
  app: INestApplication;
  moduleFixture: TestingModule;
  providerConfig: OpenAiCompatibleProviderTestConfig;
};

/**
 * Builds environment variable references for integration tests
 * Example: 'ollama-local' -> { apiKeyRef: 'INTEGRATION_OLLAMA_LOCAL_API_KEY', ... }
 */
function buildIntegrationEnvRefs(instanceId: string) {
  // Convert instance ID to uppercase and replace hyphens with underscores
  const envPrefix = instanceId.toUpperCase().replace(/-/g, '_');

  return {
    apiKeyRef: `INTEGRATION_${envPrefix}_API_KEY`,
    baseUrlRef: `INTEGRATION_${envPrefix}_BASE_URL`,
  };
}

/**
 * Load REAL gateway.config.yaml directly from filesystem
 * NOTE: We can't use loadGatewayConfigFromFile() because it's globally mocked
 * in test/integration/setup/jest-integration.setup.ts
 */
function loadRealGatewayConfig(): GatewayConfig {
  const configPath = join(process.cwd(), 'gateway.config.yaml');
  const fileContent = readFileSync(configPath, 'utf-8');
  const parsedYaml = yaml.load(fileContent);
  const validationResult = GatewayConfigSchema.safeParse(parsedYaml);

  if (!validationResult.success) {
    console.error(
      'Config validation failed:',
      validationResult.error.flatten().fieldErrors,
    );
    throw new Error('Invalid gateway.config.yaml');
  }

  return validationResult.data;
}

function buildOpenAiCompatibleIntegrationConfigOptions(
  instanceId: string,
  options: CreateOpenAiCompatibleIntegrationAppOptions,
): {
  mockOptions: MockConfigServiceOptions;
  providerConfig: OpenAiCompatibleProviderTestConfig;
} {
  const cacheEnabled =
    options.cacheEnabled ?? process.env.CACHE_ENABLED === 'true';
  const rateLimitEnabled =
    options.rateLimitEnabled ?? process.env.RATE_LIMIT_SMART_ENABLED === 'true';
  const gatewayKey = getIntegrationGatewayKey();
  const masterKey = readIntegrationEnv(INTEGRATION_MASTER_KEY_REF);

  // Load REAL gateway config (not mocked one from integration tests)
  const gatewayConfig = loadRealGatewayConfig();
  const providerConfig = gatewayConfig.providers[instanceId];

  if (!providerConfig) {
    throw new Error(
      `Provider instance "${instanceId}" not found in gateway.config.yaml`,
    );
  }

  if (providerConfig.type !== 'openai-compatible') {
    throw new Error(
      `Provider instance "${instanceId}" is not of type "openai-compatible" (found: ${providerConfig.type})`,
    );
  }

  // Find a model that uses this provider
  const modelEntry = Object.entries(gatewayConfig.models).find(
    ([, modelConfig]) => modelConfig.providerInstance === instanceId,
  );

  if (!modelEntry) {
    throw new Error(
      `No model found for provider instance "${instanceId}" in gateway.config.yaml`,
    );
  }

  const [, modelConfig] = modelEntry;

  // Get environment variables for this provider
  const { apiKey, baseUrl } = requireOpenAiCompatibleIntegrationEnv(instanceId);
  const envRefs = buildIntegrationEnvRefs(instanceId);

  // Create unique integration instance ID and model alias
  const integrationInstanceId = `${instanceId}-it`;
  const integrationModelAlias = `it-${instanceId}-chat`;

  const testProviderConfig: OpenAiCompatibleProviderTestConfig = {
    instanceId,
    integrationInstanceId,
    apiKeyRef: envRefs.apiKeyRef,
    baseUrlRef: envRefs.baseUrlRef,
    apiKey,
    baseUrl,
    integrationModelAlias,
    integrationModelId: modelConfig.modelId,
  };

  const mockOptions: MockConfigServiceOptions = {
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
        [integrationInstanceId]: {
          type: 'openai-compatible',
          apiKeyRef: asEnvRef(envRefs.apiKeyRef),
          baseUrlRef: asEnvRef(envRefs.baseUrlRef),
          enabled: true,
          apiSurface: providerConfig.apiSurface ?? 'chat-completions',
        },
      },
      models: {
        [integrationModelAlias]: {
          providerInstance: asProviderInstanceId(integrationInstanceId),
          modelId: asModelId(modelConfig.modelId),
          capabilities: modelConfig.capabilities ?? {
            tools: false,
            streaming: true,
            thinking: false,
          },
          policy: modelConfig.policy ?? {
            timeoutMs: TEST_TIMEOUT_MS,
            retry: {
              maxAttempts: TEST_MAX_ATTEMPTS,
              onStatus: [429, 500, 502, 503, 504],
            },
            params: {
              defaults: {},
              allowOverrides: ['maxOutputTokens', 'temperature'],
              bounds: {},
            },
          },
        },
      },
    },
    gatewayKey: {
      allowList: [gatewayKey, ...(masterKey ? [asGatewayKey(masterKey)] : [])],
      masterKey: masterKey ? asGatewayKey(masterKey) : asGatewayKey(''),
    },
    providers: {
      [integrationInstanceId]: {
        type: 'openai-compatible',
        apiKeyRef: asEnvRef(envRefs.apiKeyRef),
        apiKey: asProviderApiKey(apiKey),
        baseUrlRef: asEnvRef(envRefs.baseUrlRef),
        baseUrl: asBaseUrl(baseUrl),
        apiSurface: providerConfig.apiSurface ?? 'chat-completions',
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

  return { mockOptions, providerConfig: testProviderConfig };
}

export async function createOpenAiCompatibleIntegrationApp(
  instanceId: string,
  options: CreateOpenAiCompatibleIntegrationAppOptions = {},
): Promise<OpenAiCompatibleIntegrationAppContext> {
  const { mockOptions, providerConfig } =
    buildOpenAiCompatibleIntegrationConfigOptions(instanceId, options);

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(createMockConfigService(mockOptions))
    .overrideProvider(LoggingService)
    .useValue(createE2eLoggingServiceMock())
    .compile();

  const app = moduleFixture.createNestApplication();
  setupApp(app);
  await app.init();

  return { app, moduleFixture, providerConfig };
}

export async function closeOpenAiCompatibleIntegrationApp(
  app: INestApplication,
): Promise<void> {
  await app.close();
}
