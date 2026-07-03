import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { validateGatewayConfig } from './config-validator';

function writeTempConfig(
  dir: string,
  config: Record<string, unknown>,
): string {
  const configPath = join(dir, 'gateway.config.yaml');
  writeFileSync(configPath, yaml.dump(config), 'utf-8');
  return configPath;
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
  });

  it('fails when key is only under legacy ANTHROPIC_API_KEY name', () => {
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
    expect(result.errors.join('\n')).toMatch(/apiSurface is not supported for type "openai"/i);
  });
});
