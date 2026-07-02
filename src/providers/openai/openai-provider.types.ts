export type OpenAiApiSurface = 'chat-completions' | 'responses' | 'auto';

export interface OpenAiProviderConfig {
  apiKey: string;
  baseUrl: string;
  apiSurface: OpenAiApiSurface;
  defaultHeaders?: Record<string, string>;
}
