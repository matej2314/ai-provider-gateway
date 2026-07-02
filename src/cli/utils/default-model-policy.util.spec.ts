import { GatewayConfigSchema } from 'src/config/gateway-config.schema';
import {
  buildDefaultModelPolicy,
  getMaxOutputTokensBound,
  MAX_OUTPUT_TOKENS_SCHEMA_MAX,
} from './default-model-policy.util';

describe('default-model-policy.util', () => {
  it('uses schema-compliant maxOutputTokens bounds for thinking models', () => {
    const policy = buildDefaultModelPolicy(
      'claude-sonnet-4-5-20250929',
      'anthropic',
    );

    expect(policy.params?.bounds?.maxOutputTokens?.max).toBe(
      MAX_OUTPUT_TOKENS_SCHEMA_MAX,
    );
    expect(policy.params?.bounds?.maxOutputTokens?.max).toBeLessThanOrEqual(
      8192,
    );
  });

  it('uses 1024 max bound for non-thinking models', () => {
    expect(getMaxOutputTokensBound('gemini-2.5-flash', 'google')).toBe(1024);
  });

  it('detects openai reasoning models for thinking capabilities', () => {
    const policy = buildDefaultModelPolicy('o3-mini', 'openai');
    expect(policy.params?.defaults?.thinkingEnabled).toBe(false);
    expect(policy.params?.bounds?.maxOutputTokens?.max).toBe(
      MAX_OUTPUT_TOKENS_SCHEMA_MAX,
    );
  });

  it('produces config that passes GatewayConfigSchema', () => {
    const policy = buildDefaultModelPolicy(
      'claude-sonnet-4-5-20250929',
      'anthropic',
    );

    const result = GatewayConfigSchema.safeParse({
      schemaVersion: 1,
      masterKeyRef: 'MASTER_KEY',
      providers: {
        'anthropic-primary': {
          type: 'anthropic',
          apiKeyRef: 'ANTHROPIC_PRIMARY_API_KEY',
          enabled: true,
        },
      },
      clients: {},
      models: {
        'chat-default': {
          providerInstance: 'anthropic-primary',
          modelId: 'claude-sonnet-4-5-20250929',
          capabilities: { streaming: true, tools: true, thinking: true },
          policy,
        },
      },
    });

    expect(result.success).toBe(true);
  });
});
