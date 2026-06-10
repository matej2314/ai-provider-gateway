import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import type { GatewayParamsConfig } from '../../config/configuration';
import type { ProviderCallOptions } from 'src/providers/interfaces/ai-provider.interface';
import type { ChatParamsDto } from '../dto/chat-params.dto';

const OVERRIDE_KEYS = [
  'temperature',
  'maxOutputTokens',
  'topP',
  'stop',
  'frequencyPenalty',
  'presencePenalty',
  'seed',
  'topK',
  'responseFormat',
] as const;
type OverrideKey = (typeof OVERRIDE_KEYS)[number];

function isOverrideKey(key: string): key is OverrideKey {
  return (OVERRIDE_KEYS as readonly string[]).includes(key);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolveProviderCallOptions(
  policyParams: GatewayParamsConfig | undefined,
  bodyParams?: ChatParamsDto,
): ProviderCallOptions {
  const defaults = policyParams?.defaults ?? {};
  const allowOverrides = policyParams?.allowOverrides ?? [];
  const bounds = policyParams?.bounds ?? {};

  if (bodyParams) {
    for (const key of Object.keys(bodyParams) as OverrideKey[]) {
      if (!isOverrideKey(key)) continue;
      if (bodyParams[key] === undefined) continue;

      if (!allowOverrides.includes(key)) {
        throw new HttpException(
          {
            code: ApiErrorCode.MODEL_NOT_ALLOWED,
            message: `Parameter ${key} is not allowed for this model alias`,
            details: [{ field: `params.${key}`, allowOverrides }],
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  let temperature = defaults.temperature;
  let maxOutputTokens = defaults.maxOutputTokens;
  let topP = defaults.topP;
  let stop = bodyParams?.stop;
  let frequencyPenalty = defaults.frequencyPenalty;
  let presencePenalty = defaults.presencePenalty;
  let seed = defaults.seed;

  if (bodyParams?.temperature !== undefined) {
    temperature = bodyParams.temperature;
  }

  if (bodyParams?.maxOutputTokens !== undefined) {
    maxOutputTokens = bodyParams.maxOutputTokens;
  }

  if (bodyParams?.topP !== undefined) {
    topP = Number(bodyParams.topP);
  }

  if (bodyParams?.frequencyPenalty !== undefined) {
    frequencyPenalty = bodyParams.frequencyPenalty;
  }

  if (bodyParams?.presencePenalty !== undefined) {
    presencePenalty = bodyParams.presencePenalty;
  }

  if (bodyParams?.seed !== undefined) {
    seed = bodyParams.seed;
  }

  if (temperature !== undefined && bounds.temperature) {
    temperature = clamp(
      temperature,
      bounds.temperature.min,
      bounds.temperature.max,
    );
  }

  if (maxOutputTokens !== undefined && bounds.maxOutputTokens) {
    maxOutputTokens = clamp(
      maxOutputTokens,
      bounds.maxOutputTokens.min,
      bounds.maxOutputTokens.max,
    );
  }

  if (topP !== undefined && bounds.topP) {
    topP = clamp(topP, bounds.topP.min, bounds.topP.max);
  }

  if (frequencyPenalty !== undefined && bounds.frequencyPenalty) {
    frequencyPenalty = clamp(
      frequencyPenalty,
      bounds.frequencyPenalty.min,
      bounds.frequencyPenalty.max,
    );
  }

  if (presencePenalty !== undefined && bounds.presencePenalty) {
    presencePenalty = clamp(
      presencePenalty,
      bounds.presencePenalty.min,
      bounds.presencePenalty.max,
    );
  }

  return {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    ...(topP !== undefined ? { topP } : {}),
    ...(stop !== undefined ? { stop } : {}),
    ...(frequencyPenalty !== undefined ? { frequencyPenalty } : {}),
    ...(presencePenalty !== undefined ? { presencePenalty } : {}),
    ...(seed !== undefined ? { seed } : {}),
  };
}
