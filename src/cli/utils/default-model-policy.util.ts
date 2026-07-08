import type { GatewayModelConfig } from 'src/config/gateway-config.schema';
import type { GatewayProviderType } from 'src/config/provider-types';
import { asMaxAttempts, asTimeoutMs } from '../../common/types/branded.types';
import { DEFAULT_MODEL_ALLOW_OVERRIDES } from '../constants/model-allow-overrides';
import {
  isThinkingCapableModel,
  getRecommendedMaxOutputTokens,
} from '../constants/thinking-capable-models';

/** Matches GatewayConfigSchema bounds.maxOutputTokens.max (8192). */
export const MAX_OUTPUT_TOKENS_SCHEMA_MAX = 8192;

export function getMaxOutputTokensBound(
  modelId: string,
  providerType: GatewayProviderType,
): number {
  return isThinkingCapableModel(modelId, providerType)
    ? MAX_OUTPUT_TOKENS_SCHEMA_MAX
    : 1024;
}

export function buildDefaultModelCapabilities(
  modelId: string,
  providerType: GatewayProviderType,
): NonNullable<GatewayModelConfig['capabilities']> {
  const supportsThinking = isThinkingCapableModel(modelId, providerType);
  return {
    streaming: true,
    tools: true,
    ...(supportsThinking && { thinking: true }),
  };
}

export function buildDefaultModelPolicy(
  modelId: string,
  providerType: GatewayProviderType,
): NonNullable<GatewayModelConfig['policy']> {
  const supportsThinking = isThinkingCapableModel(modelId, providerType);
  const recommendedMaxTokens = getRecommendedMaxOutputTokens(
    modelId,
    providerType,
  );
  const maxOutputBound = getMaxOutputTokensBound(modelId, providerType);

  return {
    timeoutMs: asTimeoutMs(30000),
    retry: {
      maxAttempts: asMaxAttempts(3),
      onStatus: [429, 500, 502, 503, 504],
    },
    params: {
      defaults: {
        temperature: 0.7,
        maxOutputTokens: recommendedMaxTokens,
        ...(supportsThinking && { thinkingEnabled: false }),
      },
      allowOverrides: [...DEFAULT_MODEL_ALLOW_OVERRIDES],
      bounds: {
        temperature: { min: 0, max: 2 },
        maxOutputTokens: { min: 1, max: maxOutputBound },
        topP: { min: 0, max: 1 },
        frequencyPenalty: { min: -2, max: 2 },
        presencePenalty: { min: -2, max: 2 },
      },
    },
  };
}
