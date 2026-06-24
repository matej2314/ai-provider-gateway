import type { ProviderRegistryService } from '../../providers/provider-registry.service';

export function createMockProviderRegistryService(options?: {
  providerName?: string;
  modelId?: string;
  modelAlias?: string;
}): Partial<ProviderRegistryService> {
  return {
    resolve: jest.fn().mockReturnValue({
      provider: { completeOnce: jest.fn(), streamOnce: jest.fn() },
      providerName: options?.providerName || 'anthropic',
      modelId: options?.modelId || 'claude-sonnet-4-5',
      modelAlias: options?.modelAlias || 'test-model',
      capabilities: { tools: true, streaming: true },
      params: {
        defaults: { temperature: 0.7 },
        allowOverrides: [],
        bounds: {},
      },
    }),
    registerInstance: jest.fn(),
    list: jest.fn().mockReturnValue({}),
  };
}
