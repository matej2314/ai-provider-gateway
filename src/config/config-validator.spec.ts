import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { validateGatewayConfig } from './config-validator';
import { EXPECTED_SCHEMA_VERSION } from './gateway-config.schema';
import { asEnvRef } from '../common/types';
import { asMaxAttempts, asTimeoutMs } from '../common/types/branded.types';

function writeTempConfig(dir: string, config: Record<string, unknown>): string {
  const configPath = join(dir, 'gateway.config.yaml');
  writeFileSync(configPath, yaml.dump(config), 'utf-8');
  return configPath;
}

function expectEnvRef(actual: unknown, envVarName: string): void {
  expect(actual).toBe(asEnvRef(envVarName));
}

function minimalValidConfig(overrides: Record<string, unknown> = {}) {
  return {
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
        capabilities: { streaming: true, tools: true },
        policy: {
          timeoutMs: 30000,
          retry: { maxAttempts: 3, onStatus: [429, 500, 502, 503, 504] },
          params: {
            defaults: { temperature: 0.7, maxOutputTokens: 1024 },
            allowOverrides: ['temperature', 'maxOutputTokens'],
            bounds: {
              temperature: { min: 0, max: 2 },
              maxOutputTokens: { min: 1, max: 8192 },
            },
          },
        },
      },
    },
    ...overrides,
  };
}

describe('validateGatewayConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'gateway-config-test-'));
  });

  it('succeeds when only custom apiKeyRef is set in env', () => {
    const configPath = writeTempConfig(tempDir, minimalValidConfig());
    const env = {
      MASTER_KEY: 'gw_mk_test',
      ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
    };

    const result = validateGatewayConfig({ configPath, env });

    expect(result.success).toBe(true);
    expect(result.errors.join('\n')).not.toContain('strictProviderKeys');
    expect(result.effectiveConfig).toBeDefined();
    expectEnvRef(result.effectiveConfig!.masterKeyRef, 'MASTER_KEY');
    expectEnvRef(
      result.effectiveConfig!.providers['anthropic-primary'].apiKeyRef,
      'ANTHROPIC_PRIMARY_API_KEY',
    );
  });

  it('fails when key is only under a different env name than apiKeyRef', () => {
    const configPath = writeTempConfig(tempDir, minimalValidConfig());
    const env = {
      MASTER_KEY: 'gw_mk_test',
      ANTHROPIC_API_KEY: 'sk-ant-legacy',
    };

    const result = validateGatewayConfig({ configPath, env });

    expect(result.success).toBe(false);
    expect(result.errors.join('\n')).toContain('ANTHROPIC_PRIMARY_API_KEY');
    expect(result.errors.join('\n')).not.toContain('strictProviderKeys');
  });

  it('succeeds with allowMissingProviderSecrets when provider API key is absent', () => {
    const configPath = writeTempConfig(tempDir, minimalValidConfig());
    const env = {
      MASTER_KEY: 'gw_mk_test',
    };

    const result = validateGatewayConfig({
      configPath,
      env,
      allowMissingProviderSecrets: true,
    });

    expect(result.success).toBe(true);
    expect(result.effectiveConfig).toBeDefined();
  });

  it('still requires master key when allowMissingProviderSecrets is true', () => {
    const configPath = writeTempConfig(tempDir, minimalValidConfig());
    const env = {};

    const result = validateGatewayConfig({
      configPath,
      env,
      allowMissingProviderSecrets: true,
    });

    expect(result.success).toBe(false);
    expect(result.errors.join('\n')).toMatch(/master key/i);
  });

  it('succeeds with standard ANTHROPIC_API_KEY when YAML references it', () => {
    const configPath = writeTempConfig(
      tempDir,
      minimalValidConfig({
        providers: {
          anthropic: {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
            enabled: true,
          },
        },
        models: {
          'chat-default': {
            providerInstance: 'anthropic',
            modelId: 'claude-sonnet-4-5-20250929',
            capabilities: { streaming: true, tools: true },
            policy: {
              timeoutMs: 30000,
              retry: { maxAttempts: 3, onStatus: [429, 500, 502, 503, 504] },
              params: {
                defaults: { temperature: 0.7, maxOutputTokens: 1024 },
                allowOverrides: ['temperature'],
                bounds: {
                  temperature: { min: 0, max: 2 },
                  maxOutputTokens: { min: 1, max: 8192 },
                },
              },
            },
          },
        },
      }),
    );
    const env = {
      MASTER_KEY: 'gw_mk_test',
      ANTHROPIC_API_KEY: 'sk-ant-test',
    };

    const result = validateGatewayConfig({ configPath, env });

    expect(result.success).toBe(true);
  });

  const openAiModelPolicy = {
    timeoutMs: 30000,
    retry: { maxAttempts: 3, onStatus: [429, 500, 502, 503, 504] },
    params: {
      defaults: { temperature: 0.7, maxOutputTokens: 1024 },
      allowOverrides: ['temperature', 'maxOutputTokens'],
      bounds: {
        temperature: { min: 0, max: 2 },
        maxOutputTokens: { min: 1, max: 8192 },
      },
    },
  };

  it('fails when openai provider missing baseUrlRef', () => {
    const configPath = writeTempConfig(
      tempDir,
      minimalValidConfig({
        providers: {
          'openai-main': {
            type: 'openai',
            apiKeyRef: 'OPENAI_API_KEY',
            enabled: true,
          },
        },
        models: {
          'gpt-alias': {
            providerInstance: 'openai-main',
            modelId: 'gpt-4o',
            capabilities: { streaming: true, tools: true },
            policy: openAiModelPolicy,
          },
        },
      }),
    );
    const env = {
      MASTER_KEY: 'gw_mk_test',
      OPENAI_API_KEY: 'sk-test',
    };

    const result = validateGatewayConfig({ configPath, env });

    expect(result.success).toBe(false);
    expect(result.errors.join('\n')).toMatch(/baseUrlRef/i);
  });

  it('fails when openai-compatible uses apiSurface auto', () => {
    const configPath = writeTempConfig(
      tempDir,
      minimalValidConfig({
        providers: {
          'ollama-main': {
            type: 'openai-compatible',
            apiKeyRef: 'OLLAMA_API_KEY',
            baseUrlRef: 'OLLAMA_BASE_URL',
            apiSurface: 'auto',
            enabled: true,
          },
        },
        models: {
          'llama-alias': {
            providerInstance: 'ollama-main',
            modelId: 'llama3',
            capabilities: { streaming: true, tools: false },
            policy: openAiModelPolicy,
          },
        },
      }),
    );
    const env = {
      MASTER_KEY: 'gw_mk_test',
      OLLAMA_API_KEY: '',
      OLLAMA_BASE_URL: 'http://localhost:11434/v1',
    };

    const result = validateGatewayConfig({ configPath, env });

    expect(result.success).toBe(false);
    expect(result.errors.join('\n')).toMatch(/chat-completions/i);
  });

  it('fails when openai provider uses apiSurface', () => {
    const configPath = writeTempConfig(
      tempDir,
      minimalValidConfig({
        providers: {
          'openai-main': {
            type: 'openai',
            apiKeyRef: 'OPENAI_API_KEY',
            baseUrlRef: 'OPENAI_BASE_URL',
            apiSurface: 'chat-completions',
            enabled: true,
          },
        },
        models: {
          'gpt-alias': {
            providerInstance: 'openai-main',
            modelId: 'gpt-4o',
            capabilities: { streaming: true, tools: true },
            policy: openAiModelPolicy,
          },
        },
      }),
    );
    const env = {
      MASTER_KEY: 'gw_mk_test',
      OPENAI_API_KEY: 'sk-test',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
    };

    const result = validateGatewayConfig({ configPath, env });

    expect(result.success).toBe(false);
    expect(result.errors.join('\n')).toMatch(
      /apiSurface is not supported for type "openai"/i,
    );
  });

  describe('branded types in effectiveConfig (Faza 1.6)', () => {
    it('returns EnvRef for masterKeyRef and provider apiKeyRef', () => {
      const configPath = writeTempConfig(tempDir, minimalValidConfig());
      const env = {
        MASTER_KEY: 'gw_mk_test',
        ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(true);
      expectEnvRef(result.effectiveConfig!.masterKeyRef, 'MASTER_KEY');
      expectEnvRef(
        result.effectiveConfig!.providers['anthropic-primary'].apiKeyRef,
        'ANTHROPIC_PRIMARY_API_KEY',
      );
    });

    it('returns EnvRef for client gatewayKeyRef and openai baseUrlRef', () => {
      const configPath = writeTempConfig(
        tempDir,
        minimalValidConfig({
          clients: {
            'web-app': {
              name: 'Web App',
              type: 'webapp',
              gatewayKeyRef: 'CLIENT_GW_KEY_REF',
            },
          },
          providers: {
            'openai-main': {
              type: 'openai',
              apiKeyRef: 'OPENAI_API_KEY',
              baseUrlRef: 'OPENAI_BASE_URL',
              enabled: true,
            },
          },
          models: {
            'gpt-alias': {
              providerInstance: 'openai-main',
              modelId: 'gpt-4o',
              capabilities: { streaming: true, tools: true },
              policy: openAiModelPolicy,
            },
          },
        }),
      );
      const env = {
        MASTER_KEY: 'gw_mk_test',
        OPENAI_API_KEY: 'sk-test',
        OPENAI_BASE_URL: 'https://api.openai.com/v1',
        CLIENT_GW_KEY_REF: 'gw_client_key',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(true);
      expectEnvRef(
        result.effectiveConfig!.clients['web-app'].gatewayKeyRef,
        'CLIENT_GW_KEY_REF',
      );
      expectEnvRef(
        result.effectiveConfig!.providers['openai-main'].baseUrlRef,
        'OPENAI_BASE_URL',
      );
      expectEnvRef(
        result.effectiveConfig!.providers['openai-main'].apiKeyRef,
        'OPENAI_API_KEY',
      );
    });
  });

  describe('schema version and policy branded types (Faza 4.5)', () => {
    it('accepts current schemaVersion without older-version warning', () => {
      const configPath = writeTempConfig(
        tempDir,
        minimalValidConfig({ schemaVersion: EXPECTED_SCHEMA_VERSION }),
      );
      const env = {
        MASTER_KEY: 'gw_mk_test',
        ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(true);
      expect(result.warnings.join('\n')).not.toContain(
        'is older than expected',
      );
    });

    it('fails when schemaVersion is below minimum', () => {
      const configPath = writeTempConfig(
        tempDir,
        minimalValidConfig({ schemaVersion: 0 }),
      );
      const env = {
        MASTER_KEY: 'gw_mk_test',
        ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(false);
      expect(result.errors.join('\n')).toMatch(/schemaVersion/i);
    });

    it('returns branded timeout and retry policy values in effectiveConfig', () => {
      const configPath = writeTempConfig(tempDir, minimalValidConfig());
      const env = {
        MASTER_KEY: 'gw_mk_test',
        ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(true);
      const policy = result.effectiveConfig!.models['chat-default'].policy;
      expect(policy.timeoutMs).toBe(asTimeoutMs(30000));
      expect(policy.retry.maxAttempts).toBe(asMaxAttempts(3));
    });

    it('rejects client id with comma (RediSearch TAG separator)', () => {
      const configPath = writeTempConfig(
        tempDir,
        minimalValidConfig({
          clients: {
            'a,b': {
              name: 'Bad',
              type: 'webapp',
              gatewayKeyRef: 'GATEWAY_KEY_BAD',
            },
          },
        }),
      );
      const env = {
        MASTER_KEY: 'gw_mk_test',
        ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(false);
      expect(result.errors.join('\n')).toMatch(
        /Invalid key in record|TAG|special/i,
      );
    });

    it('rejects model alias with comma', () => {
      const configPath = writeTempConfig(
        tempDir,
        minimalValidConfig({
          models: {
            'bad,alias': {
              providerInstance: 'anthropic-primary',
              modelId: 'claude-sonnet-4-5-20250929',
            },
          },
        }),
      );
      const env = {
        MASTER_KEY: 'gw_mk_test',
        ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(false);
      expect(result.errors.join('\n')).toMatch(
        /Invalid key in record|TAG|special/i,
      );
    });

    it('accepts hyphenated client id (Team-A)', () => {
      const configPath = writeTempConfig(
        tempDir,
        minimalValidConfig({
          clients: {
            'Team-A': {
              name: 'Team A',
              type: 'webapp',
              gatewayKeyRef: 'GATEWAY_KEY_TEAM_A',
            },
          },
        }),
      );
      const env = {
        MASTER_KEY: 'gw_mk_test',
        ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(true);
      expect(result.effectiveConfig!.clients['Team-A']).toBeDefined();
    });

    it('warns when SEMANTIC_CACHE_MIN_SIMILARITY is below 0.85', () => {
      const configPath = writeTempConfig(tempDir, minimalValidConfig());
      const env = {
        MASTER_KEY: 'gw_mk_test',
        ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
        SEMANTIC_CACHE_MIN_SIMILARITY: '0.7',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(true);
      expect(result.warnings.join('\n')).toMatch(
        /SEMANTIC_CACHE_MIN_SIMILARITY=0\.7/,
      );
    });

    it('warns when SEMANTIC_CACHE_TTL is set (deprecated and ignored)', () => {
      const configPath = writeTempConfig(tempDir, minimalValidConfig());
      const env = {
        MASTER_KEY: 'gw_mk_test',
        ANTHROPIC_PRIMARY_API_KEY: 'sk-ant-test-key',
        SEMANTIC_CACHE_TTL: '1200',
      };

      const result = validateGatewayConfig({ configPath, env });

      expect(result.success).toBe(true);
      expect(result.warnings.join('\n')).toMatch(
        /SEMANTIC_CACHE_TTL is deprecated and ignored/,
      );
    });
  });
});
