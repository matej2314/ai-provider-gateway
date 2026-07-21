import { deriveApiKeyRef, deriveBaseUrlRef } from './provider-id.util';
import { asEnvRef } from '../../common/types/branded.types';

describe('provider-id.util', () => {
  it('deriveBaseUrlRef slugifies instance id', () => {
    expect(deriveBaseUrlRef('openai-main')).toBe(
      asEnvRef('OPENAI_MAIN_BASE_URL'),
    );
  });

  it('deriveApiKeyRef slugifies instance id', () => {
    expect(deriveApiKeyRef('openai-main')).toBe(
      asEnvRef('OPENAI_MAIN_API_KEY'),
    );
  });
});
