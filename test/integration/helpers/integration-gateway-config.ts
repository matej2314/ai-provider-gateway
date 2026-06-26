import {
  INTEGRATION_ANTHROPIC_API_KEY_REF,
  INTEGRATION_MODEL_ALIAS,
  INTEGRATION_MODEL_ID,
  INTEGRATION_PROVIDER_INSTANCE,
  INTEGRATION_SECOND_MODEL_ALIAS,
  INTEGRATION_SECOND_MODEL_ID,
} from './integration-constants';
import type { CreateTestGatewayConfigOptions } from 'src/common/mocks/createTestGatewayConfig';

export function buildIntegrationGatewayModels(
  extra?: CreateTestGatewayConfigOptions['models'],
  dualModel?: boolean,
  toolsEnabled?: boolean,
) {
  return {
    [INTEGRATION_MODEL_ALIAS]: {
      providerInstance: INTEGRATION_PROVIDER_INSTANCE,
      modelId: INTEGRATION_MODEL_ID,
      capabilities: { tools: toolsEnabled ?? false, streaming: true },
      policy: {
        timeoutMs: 30000,
        retry: { maxAttempts: 3, onStatus: [429, 500, 502, 503, 504] },
        params: {
          defaults: {},
          allowOverrides: ['maxOutputTokens', 'temperature'],
          bounds: {},
        },
      },
    },
    ...(dualModel
      ? {
          [INTEGRATION_SECOND_MODEL_ALIAS]: {
            providerInstance: INTEGRATION_PROVIDER_INSTANCE,
            modelId: INTEGRATION_SECOND_MODEL_ID,
            capabilities: { tools: false, streaming: true },
            policy: {
              timeoutMs: 30000,
              retry: { maxAttempts: 3, onStatus: [429, 500, 502, 503, 504] },
              params: {
                defaults: {},
                allowOverrides: ['maxOutputTokens', 'temperature'],
                bounds: {},
              },
            },
          },
        }
      : {}),
    ...extra,
  };
}
