import { createHash } from 'node:crypto';
import type { ResolvedSystemPrompts } from '../config/configuration.types';
import type { ProviderCallOptions } from '../providers/interfaces/ai-provider.interface';

/**
 * SHA-256 hex digest of the effective system prompt triple
 * (master | main | per-model). Shared by exact and semantic cache
 * so both answer the same identity question about prompt config.
 */
export function computeSystemSignature(
  prompts: ResolvedSystemPrompts,
  modelAlias: string,
): string {
  return createHash('sha256')
    .update(prompts.master)
    .update('|')
    .update(prompts.main ?? '')
    .update('|')
    .update(prompts.perModelByAlias[modelAlias] ?? '')
    .digest('hex');
}

/**
 * Deterministic plain-object snapshot of the generation params that
 * affect model output. Mirrors `ProviderCallOptions` except `signal`
 * (runtime cancellation — not serialisable, does not change output).
 * Undefined / missing params normalise to `null` so the serialised
 * form is stable across optional fields.
 */
export function serializeCallParamsForCache(
  effectiveCallParams?: ProviderCallOptions,
): Record<string, unknown> {
  const stop = effectiveCallParams?.stop;
  return {
    temperature: effectiveCallParams?.temperature ?? null,
    maxOutputTokens: effectiveCallParams?.maxOutputTokens ?? null,
    topP: effectiveCallParams?.topP ?? null,
    topK: effectiveCallParams?.topK ?? null,
    stop: stop === undefined ? null : stop,
    frequencyPenalty: effectiveCallParams?.frequencyPenalty ?? null,
    presencePenalty: effectiveCallParams?.presencePenalty ?? null,
    seed: effectiveCallParams?.seed ?? null,
    responseFormat: effectiveCallParams?.responseFormat ?? null,
    thinkingEnabled: effectiveCallParams?.thinkingEnabled ?? null,
    thinkingBudget: effectiveCallParams?.thinkingBudget ?? null,
    parallelToolCalls: effectiveCallParams?.parallelToolCalls ?? null,
  };
}

/**
 * SHA-256 hex digest of the serialised call params.
 * Used as a TAG value in the semantic-cache KNN filter so that
 * entries with different generation params live in separate partitions.
 */
export function hashCallParams(
  effectiveCallParams?: ProviderCallOptions,
): string {
  const serialized = serializeCallParamsForCache(effectiveCallParams);
  return createHash('sha256').update(JSON.stringify(serialized)).digest('hex');
}
