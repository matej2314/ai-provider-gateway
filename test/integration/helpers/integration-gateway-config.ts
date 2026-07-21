import {
  INTEGRATION_MODEL_ALIAS,
  INTEGRATION_MODEL_ID,
  INTEGRATION_PROVIDER_INSTANCE,
  INTEGRATION_SECOND_MODEL_ALIAS,
  INTEGRATION_SECOND_MODEL_ID,
} from './integration-constants';
import { asModelId, asProviderInstanceId } from '../../../src/common/types';
import {
  TEST_MAX_ATTEMPTS,
  TEST_RETRY_ON_STATUS,
  TEST_TIMEOUT_MS,
} from '../../../src/common/mocks/test-constants';
import type { CreateTestGatewayConfigOptions } from 'src/common/mocks/createTestGatewayConfig';

const INTEGRATION_MODEL_POLICY = {
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

export function buildIntegrationGatewayModels(
  extra?: CreateTestGatewayConfigOptions['models'],
  dualModel?: boolean,
  toolsEnabled?: boolean,
) {
  return {
    [INTEGRATION_MODEL_ALIAS]: {
      providerInstance: asProviderInstanceId(INTEGRATION_PROVIDER_INSTANCE),
      modelId: asModelId(INTEGRATION_MODEL_ID),
      capabilities: { tools: toolsEnabled ?? false, streaming: true },
      policy: INTEGRATION_MODEL_POLICY,
    },
    ...(dualModel
      ? {
          [INTEGRATION_SECOND_MODEL_ALIAS]: {
            providerInstance: asProviderInstanceId(
              INTEGRATION_PROVIDER_INSTANCE,
            ),
            modelId: asModelId(INTEGRATION_SECOND_MODEL_ID),
            capabilities: { tools: false, streaming: true },
            policy: INTEGRATION_MODEL_POLICY,
          },
        }
      : {}),
    ...extra,
  };
}
