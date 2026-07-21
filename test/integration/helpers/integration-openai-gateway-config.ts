import {
  INTEGRATION_OPENAI_MODEL_ALIAS,
  INTEGRATION_OPENAI_MODEL_ID_BRANDED,
  INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED,
} from './integration-openai-constants';
import { asEnvRef } from '../../../src/common/types';
import {
  TEST_MAX_ATTEMPTS,
  TEST_RETRY_ON_STATUS,
  TEST_TIMEOUT_MS,
} from '../../../src/common/mocks/test-constants';

const OPENAI_INTEGRATION_MODEL_POLICY = {
  timeoutMs: TEST_TIMEOUT_MS,
  retry: {
    maxAttempts: TEST_MAX_ATTEMPTS,
    onStatus: [...TEST_RETRY_ON_STATUS],
  },
  params: {
    defaults: {},
    allowOverrides: ['maxOutputTokens', 'temperature'],
    bounds: {},
  },
};

export function buildOpenAiIntegrationGatewayModels() {
  return {
    [INTEGRATION_OPENAI_MODEL_ALIAS]: {
      providerInstance: INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED,
      modelId: INTEGRATION_OPENAI_MODEL_ID_BRANDED,
      capabilities: { tools: false, streaming: true, thinking: false },
      policy: OPENAI_INTEGRATION_MODEL_POLICY,
    },
  };
}

export function buildOpenAiIntegrationProvidersYaml() {
  return {
    [INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED]: {
      type: 'openai' as const,
      apiKeyRef: asEnvRef('INTEGRATION_OPENAI_API_KEY'),
      baseUrlRef: asEnvRef('INTEGRATION_OPENAI_BASE_URL'),
      enabled: true,
    },
  };
}
