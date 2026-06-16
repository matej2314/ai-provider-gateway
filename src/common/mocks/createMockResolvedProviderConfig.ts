import { ResolvedProviderConfig } from 'src/providers/provider-registry.service';
import { createMockAIProvider } from './createMockAIProvider';
import { TEST_MODEL_ALIAS } from './test-constants';

export function createMockDefaultResolvedConfig(): ResolvedProviderConfig {
  return {
    provider: createMockAIProvider() as ResolvedProviderConfig['provider'],
    providerName: 'anthropic',
    modelId: 'claude-sonnet-4-5',
    modelAlias: TEST_MODEL_ALIAS,
    capabilities: { tools: true, streaming: true },
    params: {
      defaults: { temperature: 0.7 },
      allowOverrides: ['temperature'],
      bounds: {},
    },
  };
}
