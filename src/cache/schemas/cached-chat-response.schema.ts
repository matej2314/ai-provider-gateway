import { z } from 'zod';
import type { CachedChatResponse } from '../types/cached-chat-response.type';
import {
  asProviderInstanceId,
  asRequestId,
} from 'src/common/types/branded.types';

const ChatWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

export const CachedChatResponseSchema = z.object({
  id: z.string(),
  provider: z.string().transform(asProviderInstanceId),
  model: z.string(),
  output: z.object({
    type: z.literal('text'),
    text: z.string(),
  }),
  usage: z
    .object({
      inputTokens: z.number().int().min(0),
      outputTokens: z.number().int().min(0),
    })
    .optional(),
  requestId: z.string().transform(asRequestId),
  cached: z.literal(true),
  cachedAt: z.string(),
  warnings: z.array(ChatWarningSchema).optional(),
});

export function parseCachedChatResponse(
  raw: unknown,
): CachedChatResponse | null {
  const result = CachedChatResponseSchema.safeParse(raw);
  if (!result.success) return null;

  return result.data;
}
