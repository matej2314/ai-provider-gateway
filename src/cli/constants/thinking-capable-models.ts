import type { GatewayProviderType } from 'src/config/provider-types';

export const THINKING_CAPABLE_MODEL_PATTERNS: Partial<
  Record<GatewayProviderType, RegExp[]>
> = {
  anthropic: [
    /^claude-opus-4-/i,
    /^claude-sonnet-4-([5-9]|\d{2,})/i,
    /^claude-sonnet-[5-9]-/i,
  ],
  google: [/^gemini-3\./i, /^gemini-[4-9]\./i],
  openai: [/^o\d/i, /^gpt-5/i],
};

export function isThinkingCapableModel(
  modelId: string,
  providerType: GatewayProviderType,
): boolean {
  const patterns = THINKING_CAPABLE_MODEL_PATTERNS[providerType];
  if (!patterns) return false;

  return patterns.some((pattern) => pattern.test(modelId));
}

export function getRecommendedMaxOutputTokens(
  modelId: string,
  providerType: GatewayProviderType,
): number {
  return isThinkingCapableModel(modelId, providerType) ? 8192 : 1024;
}
