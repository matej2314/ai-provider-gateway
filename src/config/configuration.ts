import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';

export const GatewayConfigSchema = z.object({
  schemaVersion: z.number().int().min(1),
  providers: z.record(
    z.string(),
    z.object({
      type: z.enum(['anthropic', 'google']),
      apiKeyRef: z.string(),
    }),
  ),
  models: z.record(
    z.string(),
    z.object({
      providerInstance: z.string(),
      modelId: z.string(),
      capabilities: z
        .object({
          streaming: z.boolean().optional(),
        })
        .optional()
        .default({}),
      policy: z
        .object({
          timeoutMs: z.number().int().min(1).optional(),
          retry: z
            .object({
              maxAttempts: z.number().int().min(1).optional(),
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
});

export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;
export type GatewayModelConfig = GatewayConfig['models'][string];
export type GatewayProviderInstanceConfig = GatewayConfig['providers'][string];
export type GatewayCapabilitiesConfig = GatewayModelConfig['capabilities'];
export type GatewayPolicyConfig = GatewayModelConfig['policy'];
export type GatewayRetryConfig = GatewayPolicyConfig['retry'];
export type GatewayParamsConfig = GatewayPolicyConfig['params'];
export type GatewayParamsBoundConfig =
  GatewayParamsConfig['bounds']['temperature'];

export default () => {
  const configPath = join(process.cwd(), 'gateway.config.yaml');
  let gatewayConfig: GatewayConfig;

  try {
    const fileContents = readFileSync(configPath, 'utf8');
    const parsedYaml = yaml.load(fileContents);

    const validationResult = GatewayConfigSchema.safeParse(parsedYaml);

    if (!validationResult.success) {
      console.error(
        'Config validation failed:',
        validationResult.error.flatten().fieldErrors,
      );
      throw new Error('Invalid configuration file');
    }

    gatewayConfig = validationResult.data;
    console.log('Config loaded successfully');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Config file not found:', configPath);
      throw new Error('Config file not found');
    }
    throw error;
  }

  const providersByType: Record<string, { apiKey: string }> = {};

  for (const instance of Object.values(gatewayConfig.providers)) {
    providersByType[instance.type] = {
      apiKey: process.env[instance.apiKeyRef] ?? '',
    };
  }

  return {
    gateway: gatewayConfig,
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    providers: providersByType,
  };
};
