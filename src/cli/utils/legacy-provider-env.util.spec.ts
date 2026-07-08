import { applyLegacyProviderApiKeyEnv } from './legacy-provider-env.util';
import { asProviderApiKey } from '../../common/types/branded.types';

describe('legacy-provider-env.util', () => {
  it('mirrors custom apiKeyRef under legacy env names', () => {
    const env: Record<string, string> = {};

    applyLegacyProviderApiKeyEnv(env, [
      {
        type: 'anthropic',
        apiKey: asProviderApiKey('sk-ant-primary'),
      },
    ]);

    expect(env.ANTHROPIC_PRIMARY_API_KEY).toBeUndefined();
    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-primary');
  });

  it('sets GOOGLE_API_KEY from google provider', () => {
    const env: Record<string, string> = {};

    applyLegacyProviderApiKeyEnv(env, [
      {
        type: 'google',
        apiKey: asProviderApiKey('AIza-test'),
      },
    ]);

    expect(env.GOOGLE_API_KEY).toBe('AIza-test');
  });

  it('sets OPENAI_API_KEY from openai provider', () => {
    const env: Record<string, string> = {};

    applyLegacyProviderApiKeyEnv(env, [
      {
        type: 'openai',
        apiKey: asProviderApiKey('sk-test'),
      },
    ]);

    expect(env.OPENAI_API_KEY).toBe('sk-test');
  });
});
