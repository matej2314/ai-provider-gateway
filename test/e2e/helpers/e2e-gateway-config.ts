import { createTestGatewayConfig } from '../../../src/common/mocks/createTestGatewayConfig';
import {
  TEST_API_KEY_REF,
  TEST_MAX_ATTEMPTS,
  TEST_PROVIDER_INSTANCE,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_MODEL_ALIAS,
  TEST_TIMEOUT_MS,
} from '../../../src/common/mocks/test-constants';
import {
  asEnvRef,
  asModelId,
  asProviderInstanceId,
} from '../../../src/common/types';
import type { MockConfigServiceOptions } from 'src/common/mocks/createMockConfigService';

export const E2E_SECOND_MODEL_ALIAS = 'fast-chat';
export const E2E_SECOND_PROVIDER_INSTANCE = 'google-primary';
export const E2E_SECOND_MODEL_ID = 'gemini-2.5-flash-lite';
export const E2E_PRIMARY_MODEL_ID = 'claude-sonnet-4-5';

const EMPTY_POLICY = {
  timeoutMs: TEST_TIMEOUT_MS,
  retry: {
    maxAttempts: TEST_MAX_ATTEMPTS,
    onStatus: [429, 500, 502, 503, 504] as number[],
  },
  params: {
    defaults: {},
    allowOverrides: [] as string[],
    bounds: {},
  },
} as const;

export function createE2eDualModelGatewayConfig(): MockConfigServiceOptions {
  return {
    gateway: createTestGatewayConfig({
      replace: { clients: true, providers: true, models: true },
      providers: {
        [TEST_PROVIDER_INSTANCE]: {
          type: 'anthropic',
          apiKeyRef: asEnvRef(TEST_API_KEY_REF),
          enabled: true,
        },
        [E2E_SECOND_PROVIDER_INSTANCE]: {
          type: 'google',
          apiKeyRef: asEnvRef('GOOGLE_API_KEY_TEST'),
          enabled: true,
        },
      },
      models: {
        [TEST_MODEL_ALIAS]: {
          providerInstance: TEST_PROVIDER_INSTANCE_BRANDED,
          modelId: asModelId(E2E_PRIMARY_MODEL_ID),
          capabilities: { tools: true, streaming: true },
          policy: EMPTY_POLICY,
        },
        [E2E_SECOND_MODEL_ALIAS]: {
          providerInstance: asProviderInstanceId(E2E_SECOND_PROVIDER_INSTANCE),
          modelId: asModelId(E2E_SECOND_MODEL_ID),
          capabilities: { tools: false, streaming: true },
          policy: EMPTY_POLICY,
        },
      },
    }),
    providers: {
      [TEST_PROVIDER_INSTANCE]: {
        type: 'anthropic',
        apiKeyRef: TEST_API_KEY_REF,
        apiKey: 'sk-test',
      },
      [E2E_SECOND_PROVIDER_INSTANCE]: {
        type: 'google',
        apiKeyRef: 'GOOGLE_API_KEY_TEST',
        apiKey: 'google-test',
      },
    },
  };
}
