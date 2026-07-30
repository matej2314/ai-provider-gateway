import { z } from 'zod';
import { WIZARD_STEPS } from '../constants/wizard-steps';
import { PROVIDER_TYPES } from '../../config/provider-types';
import { GATEWAY_CLIENT_TYPES } from '../../config/configuration.types';
import type {
  CliAiModel,
  CliAiProvider,
  CliRateLimit,
  GatewayClient,
  WizardState,
} from '../services/cli.services.types';
import {
  asProviderInstanceId,
  asEnvRef,
  asProviderApiKey,
  asBaseUrl,
  asModelAlias,
  asModelId,
  asClientId,
  asGatewayKey,
  asRateLimitRps,
  asRateLimitBurst,
  asMaxConcurrentStreams,
  asPort,
} from '../../common/types/branded.types';

const CliRateLimitSchema = z.object({
  rps: z.number(),
  burst: z.number(),
  maxConcurrentStreams: z.number().optional(),
});

const CliAiProviderSchema = z.object({
  id: z.string(),
  type: z.enum(PROVIDER_TYPES),
  apiKeyRef: z.string(),
  apiKey: z.string(),
  enabled: z.boolean().optional(),
  baseUrlRef: z.string().optional(),
  baseUrl: z.string().optional(),
  apiSurface: z.enum(['chat-completions']).optional(),
});

const CliAiModelSchema = z.object({
  alias: z.string(),
  providerInstance: z.string(),
  modelId: z.string(),
});

const GatewayClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(GATEWAY_CLIENT_TYPES),
  gatewayKeyRef: z.string(),
  gatewayKey: z.string(),
  rateLimit: CliRateLimitSchema.optional(),
});

export const WizardStateSchema = z.object({
  sessionId: z.string(),
  startedAt: z.string(),
  currentStep: z.enum(WIZARD_STEPS),
  completedSteps: z.array(z.enum(WIZARD_STEPS)),
  data: z.object({
    masterKey: z.string().optional(),
    providers: z.array(CliAiProviderSchema).optional(),
    models: z.array(CliAiModelSchema).optional(),
    clients: z.array(GatewayClientSchema).optional(),
    serverConfig: z
      .object({
        port: z.number(),
        nodeEnv: z.string(),
        swaggerEnabled: z.boolean().optional(),
        cacheEnabled: z.boolean().optional(),
        cacheBackend: z.enum(['redis', 'noop']).optional(),
        redisHost: z.string().optional(),
        redisPort: z.number().optional(),
        redisPassword: z.string().optional(),
        rateLimitSmartEnabled: z.boolean().optional(),
        metricsBackend: z.enum(['sentry', 'noop']).optional(),
        sentryDsn: z.string().optional(),
      })
      .optional(),
  }),
  files: z.object({
    created: z.array(z.string()),
    backedUp: z.array(z.string()),
  }),
});

function convertRateLimit(
  rateLimit: z.infer<typeof CliRateLimitSchema>,
): CliRateLimit {
  return {
    rps: asRateLimitRps(rateLimit.rps),
    burst: asRateLimitBurst(rateLimit.burst),
    maxConcurrentStreams: rateLimit.maxConcurrentStreams
      ? asMaxConcurrentStreams(rateLimit.maxConcurrentStreams)
      : undefined,
  };
}

function convertProvider(
  provider: z.infer<typeof CliAiProviderSchema>,
): CliAiProvider {
  return {
    id: asProviderInstanceId(provider.id),
    type: provider.type,
    apiKeyRef: asEnvRef(provider.apiKeyRef),
    apiKey: asProviderApiKey(provider.apiKey),
    enabled: provider.enabled,
    baseUrlRef: provider.baseUrlRef ? asEnvRef(provider.baseUrlRef) : undefined,
    baseUrl: provider.baseUrl ? asBaseUrl(provider.baseUrl) : undefined,
    apiSurface: provider.apiSurface,
  };
}

function convertModel(model: z.infer<typeof CliAiModelSchema>): CliAiModel {
  return {
    alias: asModelAlias(model.alias),
    providerInstance: asProviderInstanceId(model.providerInstance),
    modelId: asModelId(model.modelId),
  };
}

function convertClient(
  client: z.infer<typeof GatewayClientSchema>,
): GatewayClient {
  return {
    id: asClientId(client.id),
    name: client.name,
    type: client.type,
    gatewayKeyRef: asEnvRef(client.gatewayKeyRef),
    gatewayKey: asGatewayKey(client.gatewayKey),
    rateLimit: client.rateLimit
      ? convertRateLimit(client.rateLimit)
      : undefined,
  };
}

export function parseWizardState(raw: unknown): WizardState | null {
  const result = WizardStateSchema.safeParse(raw);
  if (!result.success) {
    return null;
  }

  const validated = result.data;

  return {
    sessionId: validated.sessionId,
    startedAt: validated.startedAt,
    currentStep: validated.currentStep,
    completedSteps: validated.completedSteps,
    data: {
      masterKey: validated.data.masterKey
        ? asGatewayKey(validated.data.masterKey)
        : undefined,
      providers: validated.data.providers?.map(convertProvider),
      models: validated.data.models?.map(convertModel),
      clients: validated.data.clients?.map(convertClient),
      serverConfig: validated.data.serverConfig
        ? {
            ...validated.data.serverConfig,
            port: asPort(validated.data.serverConfig.port),
            redisPort: validated.data.serverConfig.redisPort
              ? asPort(validated.data.serverConfig.redisPort)
              : undefined,
          }
        : undefined,
    },
    files: validated.files,
  };
}
