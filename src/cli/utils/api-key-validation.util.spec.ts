import { validateProviderApiKey } from './api-key-validation.util';

describe('validateProviderApiKey', () => {
  it('allows empty key for openai', () => {
    expect(validateProviderApiKey('openai', '')).toBe(true);
  });

  it('allows empty key for openai-compatible', () => {
    expect(validateProviderApiKey('openai-compatible', '')).toBe(true);
  });

  it('requires key for anthropic', () => {
    expect(validateProviderApiKey('anthropic', '')).toBe(
      'API key is required.',
    );
  });

  it('requires key for google', () => {
    expect(validateProviderApiKey('google', '')).toBe('API key is required.');
  });
});
