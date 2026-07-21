import type { ProviderApiKey } from 'src/common/types/branded.types';

export type OpenAiApiSurface = 'chat-completions' | 'responses' | 'auto';

export interface OpenAiProviderConfig {
  apiKey: ProviderApiKey;
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
}

export type openAiCompatibleApiSurface = 'chat-completions';
