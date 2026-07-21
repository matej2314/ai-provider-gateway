import type { GatewayProviderType } from 'src/config/provider-types';

/** Anthropic models that reject temperature, top_p, and top_k (Opus 4.7+, Sonnet 5). */
export const ANTHROPIC_NO_SAMPLING_PARAMS_PATTERNS: RegExp[] = [
  /^claude-opus-4-([7-9]|\d{2,})/i,
  /^claude-sonnet-5/i,
  /^claude-sonnet-[5-9]-/i,
];

export function anthropicModelRejectsSamplingParams(modelId: string): boolean {
  return ANTHROPIC_NO_SAMPLING_PARAMS_PATTERNS.some((pattern) =>
    pattern.test(modelId),
  );
}

export function providerModelRejectsSamplingParams(
  modelId: string,
  providerType: GatewayProviderType,
): boolean {
  if (providerType !== 'anthropic') {
    return false;
  }

  return anthropicModelRejectsSamplingParams(modelId);
}
