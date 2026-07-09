import type { GatewayModelConfig } from 'src/config/gateway-config.schema';
import type { GatewayProviderType } from 'src/config/provider-types';
import { providerModelRejectsSamplingParams } from 'src/providers/anthropic/anthropic-sampling-params.util';
import { asMaxAttempts, asTimeoutMs } from '../../common/types/branded.types';
import { DEFAULT_MODEL_ALLOW_OVERRIDES } from '../constants/model-allow-overrides';
import {
  isThinkingCapableModel,
  getRecommendedMaxOutputTokens,
} from '../constants/thinking-capable-models';

/** Matches GatewayConfigSchema bounds.maxOutputTokens.max (8192). */
export const MAX_OUTPUT_TOKENS_SCHEMA_MAX = 8192;

const SAMPLING_OVERRIDE_KEYS = ['temperature', 'topP', 'topK'] as const;

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
  const rejectsSampling = providerModelRejectsSamplingParams(
    modelId,
    providerType,
  );
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
        ...(rejectsSampling ? {} : { temperature: 0.7 }),
        maxOutputTokens: recommendedMaxTokens,
        ...(supportsThinking && { thinkingEnabled: false }),
      },
      allowOverrides: DEFAULT_MODEL_ALLOW_OVERRIDES.filter(
        (key) =>
          !rejectsSampling ||
          !SAMPLING_OVERRIDE_KEYS.includes(
            key as (typeof SAMPLING_OVERRIDE_KEYS)[number],
          ),
      ),
      bounds: {
        ...(rejectsSampling
          ? {}
          : {
              temperature: { min: 0, max: 2 },
              topP: { min: 0, max: 1 },
            }),
        maxOutputTokens: { min: 1, max: maxOutputBound },
        frequencyPenalty: { min: -2, max: 2 },
        presencePenalty: { min: -2, max: 2 },
      },
    },
  };
}

export function syncPolicySamplingForModel(
  policy: GatewayModelConfig['policy'] | undefined,
  modelId: string,
  providerType: GatewayProviderType,
): NonNullable<GatewayModelConfig['policy']> {
  const fresh = buildDefaultModelPolicy(modelId, providerType);
  const existing = policy ?? fresh;
  const rejectsSampling = providerModelRejectsSamplingParams(
    modelId,
    providerType,
  );

  const existingDefaults = existing.params?.defaults ?? {};
  const freshDefaults = fresh.params?.defaults ?? {};

  const defaults: NonNullable<typeof fresh.params>['defaults'] = {
    ...freshDefaults,
    maxOutputTokens:
      existingDefaults.maxOutputTokens ?? freshDefaults.maxOutputTokens,
  };

  if (
    existingDefaults.thinkingEnabled !== undefined &&
    freshDefaults.thinkingEnabled !== undefined
  ) {
    defaults.thinkingEnabled = existingDefaults.thinkingEnabled;
  }

  if (!rejectsSampling && existingDefaults.temperature !== undefined) {
    defaults.temperature = existingDefaults.temperature;
  }

  return {
    timeoutMs: existing.timeoutMs ?? fresh.timeoutMs,
    retry: {
      maxAttempts: existing.retry?.maxAttempts ?? fresh.retry?.maxAttempts,
      onStatus: existing.retry?.onStatus ?? fresh.retry?.onStatus,
    },
    params: {
      defaults,
      allowOverrides: fresh.params?.allowOverrides ?? [],
      bounds: {
        ...fresh.params?.bounds,
        maxOutputTokens:
          existing.params?.bounds?.maxOutputTokens ??
          fresh.params?.bounds?.maxOutputTokens,
      },
    },
  };
}
