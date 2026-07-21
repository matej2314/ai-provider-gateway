import { GatewayConfigSchema } from 'src/config/gateway-config.schema';
import { asEnvRef, asModelId, asProviderInstanceId } from '../../common/types';
import {
  buildDefaultModelPolicy,
  getMaxOutputTokensBound,
  MAX_OUTPUT_TOKENS_SCHEMA_MAX,
  syncPolicySamplingForModel,
} from './default-model-policy.util';

describe('default-model-policy.util', () => {
  const anthropicModelId = asModelId('claude-sonnet-4-5-20250929');
  const anthropicOpusModelId = asModelId('claude-opus-4-8');
  const anthropicProviderInstance = asProviderInstanceId('anthropic-primary');
  const masterKeyRef = asEnvRef('MASTER_KEY');
  const apiKeyRef = asEnvRef('ANTHROPIC_PRIMARY_API_KEY');

  it('uses schema-compliant maxOutputTokens bounds for thinking models', () => {
    const policy = buildDefaultModelPolicy(anthropicModelId, 'anthropic');

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

  it('omits sampling params for anthropic models that reject them', () => {
    const policy = buildDefaultModelPolicy(anthropicOpusModelId, 'anthropic');

    expect(policy.params?.defaults?.temperature).toBeUndefined();
    expect(policy.params?.allowOverrides).not.toContain('temperature');
    expect(policy.params?.allowOverrides).not.toContain('topP');
    expect(policy.params?.allowOverrides).not.toContain('topK');
    expect(policy.params?.bounds?.temperature).toBeUndefined();
    expect(policy.params?.bounds?.topP).toBeUndefined();
    expect(policy.params?.defaults?.maxOutputTokens).toBe(8192);
    expect(policy.params?.defaults?.thinkingEnabled).toBe(false);
  });

  it('keeps sampling params for anthropic models that support them', () => {
    const policy = buildDefaultModelPolicy(anthropicModelId, 'anthropic');

    expect(policy.params?.defaults?.temperature).toBe(0.7);
    expect(policy.params?.allowOverrides).toContain('temperature');
    expect(policy.params?.allowOverrides).toContain('topP');
    expect(policy.params?.bounds?.temperature).toEqual({ min: 0, max: 2 });
  });

  it('syncPolicySamplingForModel removes temperature when switching to opus 4.8', () => {
    const sonnetPolicy = buildDefaultModelPolicy(anthropicModelId, 'anthropic');

    const synced = syncPolicySamplingForModel(
      sonnetPolicy,
      anthropicOpusModelId,
      'anthropic',
    );

    expect(synced.params?.defaults?.temperature).toBeUndefined();
    expect(synced.params?.allowOverrides).not.toContain('temperature');
    expect(synced.params?.defaults?.maxOutputTokens).toBe(8192);
    expect(synced.timeoutMs).toBe(sonnetPolicy.timeoutMs);
  });

  it('produces config that passes GatewayConfigSchema', () => {
    const policy = buildDefaultModelPolicy(anthropicModelId, 'anthropic');

    const result = GatewayConfigSchema.safeParse({
      schemaVersion: 1,
      masterKeyRef,
      providers: {
        'anthropic-primary': {
          type: 'anthropic',
          apiKeyRef,
          enabled: true,
        },
      },
      clients: {},
      models: {
        'chat-default': {
          providerInstance: anthropicProviderInstance,
          modelId: anthropicModelId,
          capabilities: { streaming: true, tools: true, thinking: true },
          policy,
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('produces opus config without sampling params that passes GatewayConfigSchema', () => {
    const policy = buildDefaultModelPolicy(anthropicOpusModelId, 'anthropic');

    const result = GatewayConfigSchema.safeParse({
      schemaVersion: 1,
      masterKeyRef,
      providers: {
        'anthropic-primary': {
          type: 'anthropic',
          apiKeyRef,
          enabled: true,
        },
      },
      clients: {},
      models: {
        'anthropic-opus': {
          providerInstance: anthropicProviderInstance,
          modelId: anthropicOpusModelId,
          capabilities: { streaming: true, tools: true, thinking: true },
          policy,
        },
      },
    });

    expect(result.success).toBe(true);
  });
});
