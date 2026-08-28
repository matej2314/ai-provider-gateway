import { z } from 'zod';
import type { CachedChatResponse } from '../types/cached-chat-response.type';
import {
  asModelAlias,
  asProviderInstanceId,
  asResponseId,
  asInputTokens,
  asOutputTokens,
  asSystemFingerprint,
  asPromptCacheHitTokens,
  asPromptCacheCreationTokens,
} from 'src/common/types/branded.types';

const ChatWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

const FinishReasonSchema = z.enum([
  'stop',
  'tool_calls',
  'length',
  'content_filter',
]);

export const CachedChatResponseSchema = z.object({
  id: z.string().transform(asResponseId),
  provider: z.string().transform(asProviderInstanceId),
  model: z.string().transform(asModelAlias),
  output: z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  usage: z
    .object({
      inputTokens: z.number().int().min(0).transform(asInputTokens),
      outputTokens: z.number().int().min(0).transform(asOutputTokens),
    })
    .optional(),
  cached: z.literal(true),
  cachedAt: z.string(),
  finishReason: FinishReasonSchema,
  warnings: z.array(ChatWarningSchema).optional(),
  thinkingContent: z.string().optional(),
  effectiveModelAlias: z.string().transform(asModelAlias).optional(),
  usageDetails: z
    .object({
      promptCacheHitTokens: z
        .number()
        .int()
        .min(0)
        .transform(asPromptCacheHitTokens)
        .optional(),
      promptCacheCreationTokens: z
        .number()
        .int()
        .min(0)
        .transform(asPromptCacheCreationTokens)
        .optional(),
    })
    .optional(),
  systemFingerprint: z.string().transform(asSystemFingerprint).optional(),
});

export function parseCachedChatResponse(
  raw: unknown,
): CachedChatResponse | null {
  const result = CachedChatResponseSchema.safeParse(raw);
  if (!result.success) return null;

  return result.data;
}
