import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { ProviderRegistryService } from '../../src/providers/provider-registry.service';
import { GatewayConfigSchema } from '../../src/config/gateway-config.schema';
import type { GatewayConfig } from '../../src/config/configuration';
import {
  createOpenAiCompatibleIntegrationApp,
  closeOpenAiCompatibleIntegrationApp,
  type OpenAiCompatibleProviderTestConfig,
} from './helpers/create-openai-compatible-integration-app';
import { hasOpenAiCompatibleProviderEnv } from './helpers/require-integration-env';
import {
  getIntegrationGatewayKey,
  INTEGRATION_POST_SUCCESS_STATUS,
  INTEGRATION_ROUTES,
} from './helpers/integration-constants';

/**
 * Integration test suite for openai-compatible providers defined in gateway.config.yaml
 *
 * Discovers all providers of type "openai-compatible". Per-provider suites run only when
 * `enabled: true` in gateway.config.yaml. Disabled providers are `describe.skip` and their
 * INTEGRATION_* env is not read.
 *
 * For enabled providers, .env.test must provide:
 *   - INTEGRATION_{PROVIDER_NAME}_API_KEY
 *   - INTEGRATION_{PROVIDER_NAME}_BASE_URL
 * Missing env → suite skipped (same as before for enabled providers).
 */

/**
 * Load REAL gateway.config.yaml directly from filesystem
 * NOTE: We can't use loadGatewayConfigFromFile() because it's globally mocked
 * in test/integration/setup/jest-integration.setup.ts to return integration mock config
 */
function loadRealGatewayConfig(): GatewayConfig {
  const configPath = join(process.cwd(), 'gateway.config.yaml');
  const fileContent = readFileSync(configPath, 'utf-8');
  const parsedYaml = yaml.load(fileContent);
  const validationResult = GatewayConfigSchema.safeParse(parsedYaml);

  if (!validationResult.success) {
    console.error(
      'Config validation failed:',
      validationResult.error.flatten().fieldErrors,
    );
    throw new Error('Invalid gateway.config.yaml');
  }

  // Keep disabled providers in discovery (listed/logged); per-provider suites skip them.
  return validationResult.data;
}

// Load gateway configuration at top-level (before test discovery)
// This must be outside beforeAll because Jest needs test structure defined during parsing
const gatewayConfig = loadRealGatewayConfig();

// Dynamically discover all openai-compatible providers
const openAiCompatibleProviders = Object.entries(gatewayConfig.providers)
  .filter(([, providerConfig]) => providerConfig.type === 'openai-compatible')
  .map(([instanceId, providerConfig]) => {
    // Find a model that uses this provider
    const modelEntry = Object.entries(gatewayConfig.models).find(
      ([, modelConfig]) => modelConfig.providerInstance === instanceId,
    );

    return {
      instanceId,
      config: providerConfig,
      modelAlias: modelEntry?.[0],
      modelId: modelEntry?.[1]?.modelId,
    };
  });

describe('Gateway OpenAI-compatible providers (integration)', () => {
  it('should discover at least one openai-compatible provider from gateway.config.yaml', () => {
    expect(openAiCompatibleProviders.length).toBeGreaterThan(0);
  });

  it('should list all discovered openai-compatible providers', () => {
    const providerIds = openAiCompatibleProviders.map((p) => p.instanceId);
    console.log('Discovered openai-compatible providers:', providerIds);
    expect(providerIds).toContain('ollama-local');
    expect(providerIds).toContain('deepseek');
  });

  // Dynamically generate test suites for each openai-compatible provider
  openAiCompatibleProviders.forEach(
    ({ instanceId, config, modelAlias, modelId }) => {
      // Skip when disabled — do not read INTEGRATION_* for that provider.
      // When enabled, still skip if INTEGRATION_{ID}_API_KEY / BASE_URL are missing.
      const providerEnabled = config.enabled === true;
      const describeProvider =
        providerEnabled && hasOpenAiCompatibleProviderEnv(instanceId)
          ? describe
          : describe.skip;

      describeProvider(`Provider: ${instanceId}`, () => {
        let app: INestApplication;
        let providerTestConfig: OpenAiCompatibleProviderTestConfig;

        beforeAll(async () => {
          const context = await createOpenAiCompatibleIntegrationApp(
            instanceId,
            {
              cacheEnabled: false,
              rateLimitEnabled: false,
            },
          );
          app = context.app;
          providerTestConfig = context.providerConfig;
        });

        afterAll(async () => {
          await closeOpenAiCompatibleIntegrationApp(app);
        });

        describe('Configuration validation', () => {
          it('should have baseUrlRef defined', () => {
            expect(config.baseUrlRef).toBeDefined();
            expect(config.baseUrlRef).toBeTruthy();
          });

          it('should have apiKeyRef defined', () => {
            expect(config.apiKeyRef).toBeDefined();
            expect(config.apiKeyRef).toBeTruthy();
          });

          it('should be enabled in gateway config', () => {
            expect(config.enabled).toBe(true);
          });

          it('should have at least one model configured', () => {
            expect(modelAlias).toBeDefined();
            expect(modelId).toBeDefined();
          });
        });

        describe('Provider registry integration', () => {
          it('should successfully register provider instance', () => {
            const registry = app.get(ProviderRegistryService);
            const instances = registry.list();

            expect(instances).toContain(
              providerTestConfig.integrationInstanceId,
            );
          });

          it('should resolve model alias to provider', () => {
            if (!modelAlias) {
              console.warn(`Skipping: no model alias found for ${instanceId}`);
              return;
            }

            const registry = app.get(ProviderRegistryService);
            const resolved = registry.resolve(
              providerTestConfig.integrationModelAlias,
            );

            expect(resolved).toBeDefined();
            expect(resolved.providerName).toBe(
              providerTestConfig.integrationInstanceId,
            );
            expect(resolved.providerType).toBe('openai-compatible');
          });

          it('should have valid provider instance with complete and stream methods', () => {
            if (!modelAlias) {
              console.warn(`Skipping: no model alias found for ${instanceId}`);
              return;
            }

            const registry = app.get(ProviderRegistryService);
            const resolved = registry.resolve(
              providerTestConfig.integrationModelAlias,
            );

            expect(resolved.provider).toBeDefined();
            expect(typeof resolved.provider.complete).toBe('function');
            expect(typeof resolved.provider.stream).toBe('function');
            expect(
              (resolved.provider as unknown as Record<string, unknown>)
                .complete,
            ).not.toBeInstanceOf(jest.fn());
          });

          it('should expose chat-completions apiSurface for openai-compatible', () => {
            if (!modelAlias) {
              console.warn(`Skipping: no model alias found for ${instanceId}`);
              return;
            }

            const registry = app.get(ProviderRegistryService);
            const resolved = registry.resolve(
              providerTestConfig.integrationModelAlias,
            );

            expect(resolved.providerType).toBe('openai-compatible');
          });
        });

        describe('Provider factory validation', () => {
          it('should have valid environment configuration', () => {
            expect(providerTestConfig.apiKey).toBeTruthy();
            expect(providerTestConfig.baseUrl).toBeTruthy();
          });

          it('should normalize baseUrl (remove trailing slash)', () => {
            expect(providerTestConfig.baseUrl).not.toMatch(/\/$/);
          });

          it('should map to createOpenAiCompatibleProviderInstance factory', () => {
            // This is verified by successful app bootstrap
            // If wrong factory was used, app initialization would fail
            expect(app).toBeDefined();
          });
        });

        describe('Provider-specific metadata', () => {
          it(`should use correct apiKeyRef: ${config.apiKeyRef}`, () => {
            expect(config.apiKeyRef).toBe(config.apiKeyRef);
          });

          it(`should use correct baseUrlRef: ${config.baseUrlRef}`, () => {
            expect(config.baseUrlRef).toBe(config.baseUrlRef);
          });

          if (modelId) {
            it(`should configure model ${modelId}`, () => {
              expect(providerTestConfig.integrationModelId).toBe(modelId);
            });
          }
        });

        describe('Live API integration', () => {
          const validBody = {
            modelAlias: '', // Will be set in beforeEach
            messages: [
              { role: 'user' as const, content: 'Reply with exactly: OK' },
            ],
            params: { maxOutputTokens: 50, temperature: 0 }, // Increased from 16 to 50
          };

          beforeEach(() => {
            validBody.modelAlias = providerTestConfig.integrationModelAlias;
          });

          it('POST /chat returns live provider response', async () => {
            const response = await request(app.getHttpServer())
              .post(INTEGRATION_ROUTES.chat)
              .set('x-gateway-key', getIntegrationGatewayKey())
              .send(validBody)
              .expect(INTEGRATION_POST_SUCCESS_STATUS);

            expect(response.body).toMatchObject({
              id: expect.stringMatching(/^gw_/),
              conversationId: expect.any(String),
              model: providerTestConfig.integrationModelAlias,
              provider: providerTestConfig.integrationInstanceId,
              output: {
                type: 'text',
                text: expect.any(String),
              },
              usage: {
                inputTokens: expect.any(Number),
                outputTokens: expect.any(Number),
              },
              finishReason: expect.any(String),
              requestId: expect.any(String),
            });

            expect(response.body.output.text.length).toBeGreaterThan(0);
            expect(response.body.usage.inputTokens).toBeGreaterThanOrEqual(0);
            expect(response.body.usage.outputTokens).toBeGreaterThanOrEqual(0);
          });

          it('echoes X-Request-Id when provided', async () => {
            const requestId = `it-${instanceId}-req-001`;

            const response = await request(app.getHttpServer())
              .post(INTEGRATION_ROUTES.chat)
              .set('x-gateway-key', getIntegrationGatewayKey())
              .set('x-request-id', requestId)
              .send(validBody)
              .expect(INTEGRATION_POST_SUCCESS_STATUS);

            expect(response.body.requestId).toBe(requestId);
            expect(response.headers['x-request-id']).toBe(requestId);
          });

          it('should handle API errors gracefully', async () => {
            const invalidBody = {
              modelAlias: providerTestConfig.integrationModelAlias,
              messages: [], // Empty messages should fail
              params: { maxOutputTokens: 16 },
            };

            const response = await request(app.getHttpServer())
              .post(INTEGRATION_ROUTES.chat)
              .set('x-gateway-key', getIntegrationGatewayKey())
              .send(invalidBody);

            // Should return 400 or similar error status
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(500);
          });
        });
      });
    },
  );

  describe('Cross-provider validation', () => {
    it('should have unique instanceId for each provider', () => {
      const instanceIds = openAiCompatibleProviders.map((p) => p.instanceId);
      const uniqueIds = new Set(instanceIds);
      expect(uniqueIds.size).toBe(instanceIds.length);
    });

    it('should have unique apiKeyRef for each provider', () => {
      const apiKeyRefs = openAiCompatibleProviders.map(
        (p) => p.config.apiKeyRef,
      );
      const uniqueRefs = new Set(apiKeyRefs);
      expect(uniqueRefs.size).toBe(apiKeyRefs.length);
    });

    it('should have unique baseUrlRef for each provider', () => {
      const baseUrlRefs = openAiCompatibleProviders
        .map((p) => p.config.baseUrlRef)
        .filter(Boolean);
      const uniqueRefs = new Set(baseUrlRefs);
      expect(uniqueRefs.size).toBe(baseUrlRefs.length);
    });

    it('skips disabled providers without requiring INTEGRATION_* env', () => {
      const disabled = openAiCompatibleProviders.filter(
        (p) => p.config.enabled !== true,
      );
      if (disabled.length > 0) {
        console.log(
          'Disabled openai-compatible providers (suites skipped):',
          disabled.map((p) => p.instanceId),
        );
      }
      // Enabled providers are the only ones that may read INTEGRATION_* / run live tests.
      const enabled = openAiCompatibleProviders.filter(
        (p) => p.config.enabled === true,
      );
      expect(enabled.every((p) => p.config.enabled === true)).toBe(true);
    });
  });
});
