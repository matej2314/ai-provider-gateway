import { deriveApiKeyRef, deriveBaseUrlRef } from './provider-id.util';

describe('provider-id.util', () => {
  it('deriveBaseUrlRef slugifies instance id', () => {
    expect(deriveBaseUrlRef('openai-main')).toBe('OPENAI_MAIN_BASE_URL');
  });

  it('deriveApiKeyRef slugifies instance id', () => {
    expect(deriveApiKeyRef('openai-main')).toBe('OPENAI_MAIN_API_KEY');
  });
});
