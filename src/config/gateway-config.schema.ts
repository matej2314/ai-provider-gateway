import { z } from 'zod';
import { PROVIDER_TYPES } from './provider-types';

export const EXPECTED_SCHEMA_VERSION = 1;

export const GatewayConfigSchema = z
  .object({
    schemaVersion: z.number().int().min(1),
    masterKeyRef: z.string().min(1),
    providers: z
      .record(
        z.string(),
        z.object({
          type: z.enum(PROVIDER_TYPES),
          apiKeyRef: z.string(),
          enabled: z.boolean().optional().default(false),
        }),
      )
      .superRefine((providers, ctx) => {
        const refs = new Map<string, string>();
        for (const [instanceId, row] of Object.entries(providers)) {
          const prev = refs.get(row.apiKeyRef);
          if (prev) {
            ctx.addIssue({
              code: 'custom',
              message: `Duplicate API key reference ${row.apiKeyRef}`,
              path: ['providers', instanceId, 'apiKeyRef'],
            });
          }
          refs.set(row.apiKeyRef, instanceId);
        }
      }),
    clients: z
      .record(
        z.string(),
        z.object({
          name: z.string().min(1),
          type: z.enum([
            'webapp',
            'ide',
            'cli',
            'service',
            'backend',
            'automation',
          ]),
          gatewayKeyRef: z.string().min(1),
          rateLimit: z
            .object({
              rps: z.number().int().min(1),
              burst: z.number().int().min(1),
              maxConcurrentStreams: z.number().int().min(1),
            })
            .optional(),
        }),
      )
      .default({}),
    models: z.record(
      z.string(),
      z.object({
        providerInstance: z.string(),
        modelId: z.string(),
        fallback: z.string().min(1).optional(),
        capabilities: z
          .object({
            streaming: z.boolean().optional(),
            tools: z.boolean().optional(),
          })
          .optional()
          .default({}),
        policy: z
          .object({
            timeoutMs: z.number().int().min(1).optional(),
            retry: z
              .object({
                maxAttempts: z.number().int().min(1).max(5).optional(),
                onStatus: z.array(z.number().int().min(1)).optional(),
              })
              .optional()
              .default({}),
            params: z
              .object({
                defaults: z
                  .object({
                    temperature: z.number().min(0).max(2).optional(),
                    maxOutputTokens: z.number().int().min(1).optional(),
                    topP: z.number().min(0).max(1).optional(),
                    frequencyPenalty: z.number().min(-2).max(2).optional(),
                    presencePenalty: z.number().min(-2).max(2).optional(),
                    seed: z.number().int().optional(),
                  })
                  .optional()
                  .default({}),
                allowOverrides: z.array(z.string()).optional().default([]),
                bounds: z
                  .object({
                    temperature: z
                      .object({
                        min: z.number().min(0),
                        max: z.number().max(2),
                      })
                      .optional(),
                    maxOutputTokens: z
                      .object({
                        min: z.number().min(1),
                        max: z.number().max(8192),
                      })
                      .optional(),
                    topP: z
                      .object({ min: z.number(), max: z.number() })
                      .optional(),
                    frequencyPenalty: z
                      .object({ min: z.number(), max: z.number() })
                      .optional(),
                    presencePenalty: z
                      .object({ min: z.number(), max: z.number() })
                      .optional(),
                  })
                  .optional()
                  .default({}),
              })
              .optional()
              .default({
                defaults: {},
                allowOverrides: [],
                bounds: {},
              }),
          })
          .optional()
          .default({
            retry: {},
            params: {
              defaults: {},
              allowOverrides: [],
              bounds: {},
            },
          }),
      }),
    ),
  })
  .superRefine((config, ctx) => {
    for (const [alias, modelConfig] of Object.entries(config.models)) {
      const fallback = modelConfig.fallback;

      if (!fallback) continue;

      if (fallback === alias) {
        ctx.addIssue({
          code: 'custom',
          message: `Model alias ${alias} cannot have itself as fallback.`,
          path: ['models', alias, 'fallback'],
        });
        continue;
      }
      if (!config.models[fallback]) {
        ctx.addIssue({
          code: 'custom',
          message: `Model alias ${alias} references non-existent fallback ${fallback}`,
          path: ['models', alias, 'fallback'],
        });
        continue;
      }
      const fallbackOfFallback = config.models[fallback]?.fallback;
      if (fallbackOfFallback === alias) {
        ctx.addIssue({
          code: 'custom',
          message: `Circular fallback detected: ${alias} => ${fallback} => ${alias}`,
          path: ['models', alias, 'fallback'],
        });
      }
    }
  })
  .superRefine((data, ctx) => {
    for (const [alias, model] of Object.entries(data.models)) {
      if (
        !Object.prototype.hasOwnProperty.call(
          data.providers,
          model.providerInstance,
        )
      ) {
        ctx.addIssue({
          code: 'custom',
          message: `Model "${alias}" references unknown provider instance ${model.providerInstance} `,
          path: ['models', alias, 'providerInstance'],
        });
      }
    }

    if (Object.keys(data.models).length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Models section must contain at least one model alias.',
        path: ['models'],
      });
      return;
    }

    const aliasesByProvider = new Map<string, string[]>();
    for (const [alias, model] of Object.entries(data.models)) {
      const list = aliasesByProvider.get(model.providerInstance) ?? [];
      list.push(alias);
      aliasesByProvider.set(model.providerInstance, list);
    }

    for (const [instanceId, row] of Object.entries(data.providers)) {
      if (row.enabled === false) continue;

      if (!aliasesByProvider.has(instanceId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Provider instance ${instanceId} is declared but has no model aliases.`,
          path: ['providers', instanceId],
        });
      }
    }
  });

export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;
export type GatewayClientConfig = GatewayConfig['clients'][string];
export type GatewayModelConfig = GatewayConfig['models'][string];
export type GatewayProviderInstanceConfig = GatewayConfig['providers'][string];
export type GatewayCapabilitiesConfig = GatewayModelConfig['capabilities'];
export type GatewayPolicyConfig = GatewayModelConfig['policy'];
export type GatewayRetryConfig = GatewayPolicyConfig['retry'];
export type GatewayParamsConfig = GatewayPolicyConfig['params'];
export type GatewayParamsBoundConfig =
  GatewayParamsConfig['bounds']['temperature'];
