import type { OpenAiProviderType } from 'src/config/provider-types';
import type { OpenAiApiSurface } from './openai-provider.types';

export function resolveApiSurfaceDefault(
  providerType: OpenAiProviderType,
  yamlValue?: OpenAiApiSurface,
): OpenAiApiSurface {
  if (yamlValue !== undefined) return yamlValue;
  return providerType === 'openai' ? 'auto' : 'chat-completions';
}
