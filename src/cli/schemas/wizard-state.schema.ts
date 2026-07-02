import { z } from 'zod';
import { WIZARD_STEPS } from '../constants/wizard-steps';
import { PROVIDER_TYPES } from '../../config/provider-types';
import { GATEWAY_CLIENT_TYPES } from '../../config/configuration.types';
import type { WizardState } from '../services/cli.services.types';

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
  baseUrlRef: z.string().optional(),
  baseUrl: z.string().optional(),
  apiSurface: z
    .enum(['chat-completions', 'responses', 'auto'])
    .optional(),
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

export function parseWizardState(raw: unknown): WizardState | null {
  const result = WizardStateSchema.safeParse(raw);
  if (!result.success) return null;
  return result.data;
}
