import {
  INTEGRATION_OPENAI_MODEL_ALIAS,
  INTEGRATION_OPENAI_MODEL_ID,
  INTEGRATION_OPENAI_PROVIDER_INSTANCE,
} from './integration-openai-constants';

export function buildOpenAiIntegrationGatewayModels() {
  return {
    [INTEGRATION_OPENAI_MODEL_ALIAS]: {
      providerInstance: INTEGRATION_OPENAI_PROVIDER_INSTANCE,
      modelId: INTEGRATION_OPENAI_MODEL_ID,
      capabilities: { tools: false, streaming: true, thinking: false },
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
  };
}

export function buildOpenAiIntegrationProvidersYaml() {
  return {
    [INTEGRATION_OPENAI_PROVIDER_INSTANCE]: {
      type: 'openai' as const,
      apiKeyRef: 'INTEGRATION_OPENAI_API_KEY',
      baseUrlRef: 'INTEGRATION_OPENAI_BASE_URL',
      enabled: true,
    },
  };
}
