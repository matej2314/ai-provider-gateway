import type { OpenAiProviderType } from 'src/config/provider-types';
import { asBaseUrl, type BaseUrl } from '../../common/types/branded.types';

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

export function normalizeCliProviderBaseUrl(input: string): BaseUrl {
  return asBaseUrl(String(input).trim().replace(/\/$/, ''));
}

export function defaultBaseUrlForOpenAiProviderType(
  type: OpenAiProviderType,
): BaseUrl {
  return type === 'openai'
    ? asBaseUrl('https://api.openai.com/v1')
    : asBaseUrl('http://localhost:11434/v1');
}
