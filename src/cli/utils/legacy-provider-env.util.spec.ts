import { applyLegacyProviderApiKeyEnv } from './legacy-provider-env.util';

describe('legacy-provider-env.util', () => {
  it('mirrors custom apiKeyRef under legacy env names', () => {
    const env: Record<string, string> = {};

    applyLegacyProviderApiKeyEnv(env, [
      {
        type: 'anthropic',
        apiKey: 'sk-ant-primary',
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
        apiKey: 'AIza-test',
      },
    ]);

    expect(env.GOOGLE_API_KEY).toBe('AIza-test');
  });
});
