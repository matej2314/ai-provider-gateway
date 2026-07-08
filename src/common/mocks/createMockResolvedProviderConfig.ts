import { ResolvedProviderConfig } from 'src/providers/provider-registry.service';
import { createMockAIProvider } from './createMockAIProvider';
import { TEST_MODEL_ALIAS } from './test-constants';
import {
  asModelAlias,
  asModelId,
  asProviderInstanceId,
} from '../types/branded.types';

export function createMockDefaultResolvedConfig(): ResolvedProviderConfig {
  return {
    provider: createMockAIProvider() as ResolvedProviderConfig['provider'],
    providerName: asProviderInstanceId('anthropic'),
    providerType: 'anthropic',
    modelId: asModelId('claude-sonnet-4-5'),
    modelAlias: asModelAlias(TEST_MODEL_ALIAS),
    capabilities: { tools: true, streaming: true },
    params: {
      defaults: { temperature: 0.7 },
      allowOverrides: ['temperature'],
      bounds: {},
    },
  };
}
