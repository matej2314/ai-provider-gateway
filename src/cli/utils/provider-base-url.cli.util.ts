import type { OpenAiProviderType } from 'src/config/provider-types';

export function validateCliProviderBaseUrl(input: string): true | string {
  try {
    const parsed = new URL(String(input).trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL must use http or https';
    }
    return true;
  } catch {
    return 'Enter a valid URL';
  }
}

export function normalizeCliProviderBaseUrl(input: string): string {
  return String(input).trim().replace(/\/$/, '');
}

export function defaultBaseUrlForOpenAiProviderType(
  type: OpenAiProviderType,
): string {
  return type === 'openai'
    ? 'https://api.openai.com/v1'
    : 'http://localhost:11434/v1';
}
