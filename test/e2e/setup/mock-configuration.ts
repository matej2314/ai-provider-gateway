import { createTestGatewayConfig } from '../../../src/common/mocks/createTestGatewayConfig';
import {
  createTestGatewayKeyRuntimeConfig,
  createTestResolvedSystemPrompts,
} from '../../../src/common/mocks/createMockConfigService';
import {
  TEST_API_KEY_REF,
  TEST_PROVIDER_INSTANCE,
} from '../../../src/common/mocks/test-constants';
import { asEnvRef, asProviderApiKey } from '../../../src/common/types';
import type { GatewayConfig } from '../../../src/config/configuration';

const gatewayConfig = createTestGatewayConfig();

function defaultConfiguration() {
  return {
    gateway: gatewayConfig,
    gatewayKey: createTestGatewayKeyRuntimeConfig(),
    port: 3000,
    nodeEnv: 'test',
    providers: {
      [TEST_PROVIDER_INSTANCE]: {
        type: 'anthropic' as const,
        apiKeyRef: asEnvRef(TEST_API_KEY_REF),
        apiKey: asProviderApiKey('sk-test-api-key'),
      },
    },
    resolvedSystemPrompts: createTestResolvedSystemPrompts(),
    cache: {
      enabled: false,
      backend: 'noop',
      ttl: 3600,
      keyPrefix: 'aigw:',
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: '',
      db: 0,
      keyPrefix: 'aigw:',
    },
  };
}

export default defaultConfiguration;

export function loadGatewayConfigFromFile(): GatewayConfig {
  return gatewayConfig;
}

export function buildEffectiveGatewayConfig(raw: GatewayConfig): GatewayConfig {
  return raw;
}

export function assertMasterKeyPresent(): void {
  return;
}
