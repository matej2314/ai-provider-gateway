import {
  defaultBaseUrlForOpenAiProviderType,
  normalizeCliProviderBaseUrl,
  validateCliProviderBaseUrl,
} from './provider-base-url.cli.util';
import { asBaseUrl } from '../../common/types/branded.types';

describe('provider-base-url.cli.util', () => {
  it('validates http(s) URLs', () => {
    expect(validateCliProviderBaseUrl('https://api.openai.com/v1')).toBe(true);
    expect(validateCliProviderBaseUrl('ftp://example.com')).toBe(
      'URL must use http or https',
    );
    expect(validateCliProviderBaseUrl('not-a-url')).toBe('Enter a valid URL');
  });

  it('normalizes trailing slash', () => {
    expect(normalizeCliProviderBaseUrl('https://api.openai.com/v1/')).toBe(
      asBaseUrl('https://api.openai.com/v1'),
    );
  });

  it('returns defaults per OpenAI provider type', () => {
    expect(defaultBaseUrlForOpenAiProviderType('openai')).toBe(
      asBaseUrl('https://api.openai.com/v1'),
    );
    expect(defaultBaseUrlForOpenAiProviderType('openai-compatible')).toBe(
      asBaseUrl('http://localhost:11434/v1'),
    );
  });
});
