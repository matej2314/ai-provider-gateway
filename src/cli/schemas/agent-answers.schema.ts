import { z } from 'zod';
import { PROVIDER_TYPES } from '../../config/provider-types';
import { GATEWAY_CLIENT_TYPES } from '../../config/configuration.types';

function rejectSecretFields(
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
  banned: string[],
) {
  for (const key of banned) {
    if (key in data && data[key] !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `[AGENT] Field "${key}" is not allowed (operator values must be pasted into .env by the user — never via answers/chat).`,
        path: [key],
      });
    }
  }
}

export const InitAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    overwrite: z.boolean().optional(),
    masterKey: z.object({ generate: z.literal(true) }),
    providers: z
      .array(
        z
          .object({
            id: z.string().min(1),
            type: z.enum(PROVIDER_TYPES),
            enabled: z.boolean().optional(),
            // AGENT-MODE: brak baseUrl w answers — URL zawsze wpisuje człowiek do .env
          })
          .strict()
          .superRefine((row, ctx) =>
            rejectSecretFields(row as Record<string, unknown>, ctx, [
              'apiKey',
              'apiKeyRef',
              'baseUrl',
              'baseUrlRef',
            ]),
          ),
      )
      .min(1),
    models: z
      .array(
        z
          .object({
            alias: z.string().min(1),
            providerInstance: z.string().min(1),
            modelId: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    clients: z
      .array(
        z
          .object({
            id: z.string().min(1),
            name: z.string().min(1),
            type: z.enum(GATEWAY_CLIENT_TYPES),
            generateKey: z.literal(true),
            rateLimit: z
              .object({
                rps: z.number().positive(),
                burst: z.number().positive(),
                maxConcurrentStreams: z.number().int().positive().optional(),
              })
              .strict()
              .optional(),
          })
          .strict()
          .superRefine((row, ctx) =>
            rejectSecretFields(row as Record<string, unknown>, ctx, [
              'gatewayKey',
              'apiKey',
            ]),
          ),
      )
      .min(1),
    server: z
      .object({
        port: z.number().int().positive(),
        nodeEnv: z.string().min(1),
        swaggerEnabled: z.boolean().optional(),
        cacheEnabled: z.boolean().optional(),
        cacheBackend: z.enum(['redis', 'noop']).optional(),
        redisHost: z.string().optional(),
        redisPort: z.number().int().positive().optional(),
        rateLimitSmartEnabled: z.boolean().optional(),
        metricsBackend: z.enum(['sentry', 'noop']).optional(),
      })
      .strict()
      .superRefine((row, ctx) =>
        rejectSecretFields(row as Record<string, unknown>, ctx, [
          'redisPassword',
          'sentryDsn',
          'masterKey',
        ]),
      ),
  })
  .strict()
  .superRefine((data, ctx) => {
    const providerIds = new Set(data.providers.map((p) => p.id));
    for (const model of data.models) {
      if (!providerIds.has(model.providerInstance)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Model "${model.alias}" references unknown providerInstance "${model.providerInstance}"`,
          path: ['models'],
        });
      }
    }
  });

export type InitAnswers = z.infer<typeof InitAnswersSchema>;

export const ProviderAddAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    type: z.enum(PROVIDER_TYPES),
    enabled: z.boolean().optional(),
    /** zawsze true w agent — API key wpisuje człowiek */
    deferSecret: z.literal(true),
    ensureModel: z
      .object({
        alias: z.string().min(1),
        modelId: z.string().min(1),
      })
      .strict(),
  })
  .strict()
  .superRefine((row, ctx) =>
    rejectSecretFields(row, ctx, ['apiKey', 'baseUrl', 'baseUrlRef']),
  );

export type ProviderAddAnswers = z.infer<typeof ProviderAddAnswersSchema>;

export const ProviderEditAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    enabled: z.boolean().optional(),
    /** true → wyczyść apiKeyRef w .env (user wklei nowy) */
    rotateSecret: z.boolean().optional(),
    confirmNonBootable: z.boolean().optional(),
  })
  .strict()
  .superRefine((row, ctx) => rejectSecretFields(row, ctx, ['apiKey']));

export const ProviderRemoveAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    confirm: z.literal(true),
  })
  .strict();

export const ModelAddAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    alias: z.string().min(1),
    providerInstance: z.string().min(1),
    modelId: z.string().min(1),
  })
  .strict();

export const ModelRemoveAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    alias: z.string().min(1),
    confirm: z.literal(true),
  })
  .strict();

export type ModelRemoveAnswers = z.infer<typeof ModelRemoveAnswersSchema>;

export const ModelEditAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    alias: z.string().min(1),
    modelId: z.string().min(1).optional(),
    providerInstance: z.string().min(1).optional(),
    confirmNonBootable: z.boolean().optional(),
    /** null clears fallback */
    fallback: z.union([z.string().min(1), z.null()]).optional(),
    streaming: z.boolean().optional(),
    policy: z
      .object({
        timeoutMs: z.number().positive(),
        maxAttempts: z.number().int().positive(),
        maxOutputTokens: z.number().int().positive(),
        temperature: z.number().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((row, ctx) => {
    if (
      row.modelId === undefined &&
      row.providerInstance === undefined &&
      row.fallback === undefined &&
      row.streaming === undefined &&
      row.policy === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          '[AGENT] Model edit requires at least one of: modelId, providerInstance, fallback, streaming, policy.',
      });
    }
  });

export type ModelEditAnswers = z.infer<typeof ModelEditAnswersSchema>;

export const ClientAddAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(GATEWAY_CLIENT_TYPES),
    generateKey: z.literal(true),
    rateLimit: z
      .object({
        rps: z.number().positive(),
        burst: z.number().positive(),
        maxConcurrentStreams: z.number().int().positive().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((row, ctx) => rejectSecretFields(row, ctx, ['gatewayKey']));

export type ClientAddAnswers = z.infer<typeof ClientAddAnswersSchema>;

export const ClientEditAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    action: z.enum(['name', 'type', 'rateLimit', 'rotateKey']),
    name: z.string().min(1).optional(),
    type: z.enum(GATEWAY_CLIENT_TYPES).optional(),
    /** null clears rate limit */
    rateLimit: z
      .union([
        z
          .object({
            rps: z.number().positive(),
            burst: z.number().positive(),
            maxConcurrentStreams: z.number().int().positive().optional(),
          })
          .strict(),
        z.null(),
      ])
      .optional(),
  })
  .strict()
  .superRefine((row, ctx) => {
    rejectSecretFields(row, ctx, ['gatewayKey']);
    if (row.action === 'name' && !row.name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '[AGENT] action "name" requires name.',
        path: ['name'],
      });
    }
    if (row.action === 'type' && row.type === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '[AGENT] action "type" requires type.',
        path: ['type'],
      });
    }
    if (row.action === 'rateLimit' && row.rateLimit === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          '[AGENT] action "rateLimit" requires rateLimit (object or null to clear).',
        path: ['rateLimit'],
      });
    }
  });

export type ClientEditAnswers = z.infer<typeof ClientEditAnswersSchema>;

export const ClientRemoveAnswersSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    confirm: z.literal(true),
  })
  .strict();

export type ClientRemoveAnswers = z.infer<typeof ClientRemoveAnswersSchema>;

export type ProviderEditAnswers = z.infer<typeof ProviderEditAnswersSchema>;
export type ProviderRemoveAnswers = z.infer<typeof ProviderRemoveAnswersSchema>;
export type ModelAddAnswers = z.infer<typeof ModelAddAnswersSchema>;
