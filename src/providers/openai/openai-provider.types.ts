export type OpenAiApiSurface = 'chat-completions' | 'responses' | 'auto';

export interface OpenAiProviderConfig {
  apiKey: string;
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
}

export type openAiCompatibleApiSurface = 'chat-completions';
