import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import type { GatewayParamsConfig } from '../../config/configuration';
import type { ProviderCallOptions } from 'src/providers/interfaces/ai-provider.interface';
import type { ChatParamsDto } from '../dto/chat-params.dto';
import { OVERRIDE_KEYS, type OverrideKey } from '../types/override-keys.type';

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
  let topK = bodyParams?.topK;
  const stop = bodyParams?.stop;
  let frequencyPenalty = defaults.frequencyPenalty;
  let presencePenalty = defaults.presencePenalty;
  let seed = defaults.seed;
  const responseFormat = bodyParams?.responseFormat;
  let thinkingEnabled = defaults.thinkingEnabled;
  const thinkingBudget = bodyParams?.thinkingBudget;
  const parallelToolCalls = bodyParams?.parallelToolCalls;

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

  if (bodyParams?.topK !== undefined) {
    topK = bodyParams.topK;
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

  if (bodyParams?.thinkingEnabled !== undefined) {
    if (!allowOverrides.includes('thinkingEnabled')) {
      throw new HttpException(
        {
          code: ApiErrorCode.MODEL_NOT_ALLOWED,
          message:
            'Parameter thinkingEnabled is not allowed for this model alias',
          details: [{ field: 'params.thinkingEnabled', allowOverrides }],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    thinkingEnabled = bodyParams.thinkingEnabled;
  }

  if (thinkingBudget !== undefined) {
    if (!allowOverrides.includes('thinkingBudget')) {
      throw new HttpException(
        {
          code: ApiErrorCode.MODEL_NOT_ALLOWED,
          message:
            'Parameter thinkingBudget is not allowed for this model alias.',
          details: [{ field: 'params.thinkingBudget', allowOverrides }],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  if (thinkingEnabled && typeof thinkingBudget === 'number') {
    const effectiveMaxTokens = maxOutputTokens ?? 1024;
    const minRequired = thinkingBudget + 512;

    if (effectiveMaxTokens < minRequired) {
      throw new HttpException(
        {
          code: ApiErrorCode.VALIDATION_FAILED,
          message: `maxOutputTokens (${effectiveMaxTokens}) is insufficient for thinking mode with budget ${thinkingBudget}. Minimum required: ${minRequired} tokens (thinking budget + 512 token buffer for response text).`,
          details: [
            {
              field: 'params.maxOutputTokens',
              currentValue: effectiveMaxTokens,
              thinkingBudget,
              minimumRequired: minRequired,
              hint: 'Increase maxOutputTokens in request/config, reduce thinkingBudget, or use string effort level (e.g. "medium") for adaptive thinking without fixed budget.',
            },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  return {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    ...(topP !== undefined ? { topP } : {}),
    ...(topK !== undefined ? { topK } : {}),
    ...(stop !== undefined ? { stop } : {}),
    ...(frequencyPenalty !== undefined ? { frequencyPenalty } : {}),
    ...(presencePenalty !== undefined ? { presencePenalty } : {}),
    ...(seed !== undefined ? { seed } : {}),
    ...(responseFormat !== undefined ? { responseFormat } : {}),
    ...(thinkingEnabled !== undefined ? { thinkingEnabled } : {}),
    ...(thinkingBudget !== undefined ? { thinkingBudget } : {}),
    ...(parallelToolCalls !== undefined ? { parallelToolCalls } : {}),
  };
}
