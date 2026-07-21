import type { GatewayProviderType } from 'src/config/provider-types';

export const DEFAULT_MODELS: Partial<Record<GatewayProviderType, string>> = {
  anthropic: 'claude-sonnet-4-5-20250929',
  google: 'gemini-2.5-flash',
  openai: 'gpt-4o',
  'openai-compatible': 'llama3.2',
};
