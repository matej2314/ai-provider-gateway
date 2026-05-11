import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import type {
  ResolvedSystemPrompts,
  ResolvedGatewayClient,
  GatewayKeyRuntimeConfig,
} from './configuration.types';
import {
  readRequiredPrompt,
  tryReadOptionalPrompts,
} from './configuration.helpers';

const MASTER_PROMPT = 'src/config/system-prompt/MASTER_SYSTEM_PROMPT.md';
const MAIN_PROMPT = 'src/config/system-prompt/MAIN_SYSTEM_PROMPT.md';
const MODEL_PROMPTS = 'src/config/system-prompt/models/';

export const GatewayConfigSchema = z.object({
  schemaVersion: z.number().int().min(1),
  masterKeyRef: z.string().min(1),
  providers: z
    .record(
      z.string(),
      z.object({
        type: z.enum(['anthropic', 'google']),
        apiKeyRef: z.string(),
      }),
    )
    .superRefine((providers, ctx) => {
      const byType = new Map<string, string[]>();
      for (const [instanceName, config] of Object.entries(providers)) {
        const list = byType.get(config.type) ?? [];
        list.push(instanceName);
        byType.set(config.type, list);
      }
      for (const [type, instances] of byType) {
        if (instances.length > 1) {
          ctx.addIssue({
            code: 'custom',
            message: `Provider type ${type} is declared more than once (instances: ${instances.join(',')}). Only one instance per type is allowed.`,
            path: ['providers', type],
          });
        }
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
      }),
    )
    .default({}),
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
export type GatewayClientConfig = GatewayConfig['clients'][string];
export type GatewayModelConfig = GatewayConfig['models'][string];
export type GatewayProviderInstanceConfig = GatewayConfig['providers'][string];
export type GatewayCapabilitiesConfig = GatewayModelConfig['capabilities'];
export type GatewayPolicyConfig = GatewayModelConfig['policy'];
export type GatewayRetryConfig = GatewayPolicyConfig['retry'];
export type GatewayParamsConfig = GatewayPolicyConfig['params'];
export type GatewayParamsBoundConfig =
  GatewayParamsConfig['bounds']['temperature'];

function buildGatewayKeyRuntime(
  gatewayConfig: GatewayConfig,
): GatewayKeyRuntimeConfig {
  const masterRaw = (process.env[gatewayConfig.masterKeyRef] ?? '').trim();

  if (!masterRaw) {
    throw new Error(`[GatewayKey] Missing master key.`);
  }

  const clients: ResolvedGatewayClient[] = [];
  for (const [instanceId, row] of Object.entries(gatewayConfig.clients)) {
    const gatewayKey = (process.env[row.gatewayKeyRef] ?? '').trim();
    clients.push({
      instanceId,
      name: row.name,
      type: row.type,
      gatewayKeyRef: row.gatewayKeyRef,
      gatewayKey,
    });
  }

  const allow = new Set<string>();
  allow.add(masterRaw);
  for (const client of clients) {
    if (client.gatewayKey) allow.add(client.gatewayKey);
  }
  console.log(
    'Registered clients:',
    clients.map((client) => {
      return { name: client.name, type: client.type };
    }),
  );
  return {
    allowList: [...allow],
    masterKey: masterRaw,
    clients,
  };
}

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
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      console.error('Config file not found:', configPath);
      throw new Error('Config file not found');
    }
    throw error;
  }

  const gatewayKey = buildGatewayKeyRuntime(gatewayConfig);

  const cwd = process.cwd();
  const master = readRequiredPrompt(
    'MASTER_SYSTEM_PROMPT',
    join(cwd, MASTER_PROMPT),
  );
  const main = tryReadOptionalPrompts(join(cwd, MAIN_PROMPT));

  const perModelByAlias: Record<string, string> = {};

  for (const alias of Object.keys(gatewayConfig.models)) {
    const perModelPath = join(cwd, MODEL_PROMPTS, `${alias}.md`);
    const content = tryReadOptionalPrompts(perModelPath);

    if (content) {
      perModelByAlias[alias] = content;
    }
  }

  const systemPromptsResolved: ResolvedSystemPrompts = {
    master,
    main,
    perModelByAlias,
  };

  const providersByType: Record<string, { apiKey: string }> = {};

  for (const instance of Object.values(gatewayConfig.providers)) {
    providersByType[instance.type] = {
      apiKey: process.env[instance.apiKeyRef] ?? '',
    };
  }

  return {
    gateway: gatewayConfig,
    gatewayKey,
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    providers: providersByType,
    resolvedSystemPrompts: systemPromptsResolved,
  };
};
