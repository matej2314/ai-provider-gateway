import type { ChatWarningDto } from '../dto/chat-warning.dto';
import type { ProviderCallOptions } from 'src/providers/interfaces/ai-provider.interface';
import type { GatewayProviderType } from 'src/config/provider-types';
import {
  isOpenAiReasoningRequested,
  openAiNumericThinkingBudgetIgnored,
  openAiNumericThinkingBudgetWithoutEnable,
} from 'src/providers/openai/mappers/openai-thinking-provider.mapper';
import { asWarningCode } from 'src/common/types/branded.types';

const OPENAI_RESPONSES_UNSUPPORTED_PARAMS = [
  ['params.frequencyPenalty', 'frequencyPenalty'] as const,
  ['params.presencePenalty', 'presencePenalty'] as const,
  ['params.seed', 'seed'] as const,
  ['params.stop', 'stop'] as const,
];

export function buildGenerationWarnings(
  options: ProviderCallOptions,
  providerType: GatewayProviderType,
): ChatWarningDto[] {
  const warnings: ChatWarningDto[] = [];

  if (
    options.frequencyPenalty !== undefined &&
    (providerType === 'anthropic' || providerType === 'google')
  ) {
    warnings.push({
      code: asWarningCode('PARAM_IGNORED_BY_PROVIDER'),
      message: `Parameter frequencyPenalty is not supported by provider ${providerType} and was ignored.`,
      field: 'params.frequencyPenalty',
    });
  }

  if (
    options.presencePenalty !== undefined &&
    (providerType === 'anthropic' || providerType === 'google')
  ) {
    warnings.push({
      code: asWarningCode('PARAM_IGNORED_BY_PROVIDER'),
      message: `Parameter presencePenalty is not supported by provider ${providerType} and was ignored.`,
      field: 'params.presencePenalty',
    });
  }

  if (options.seed !== undefined && providerType === 'anthropic') {
    warnings.push({
      code: asWarningCode('PARAM_IGNORED_BY_PROVIDER'),
      message: `Parameter seed is not supported by provider ${providerType} and was ignored.`,
      field: 'params.seed',
    });
  }

  if (options.topK !== undefined && providerType === 'openai') {
    warnings.push({
      code: asWarningCode('PARAM_IGNORED_BY_PROVIDER'),
      message:
        'Parameter topK is not supported by OpenAI Responses API and was ignored.',
      field: 'params.topK',
    });
  }

  if (options.topK !== undefined && providerType === 'openai-compatible') {
    warnings.push({
      code: asWarningCode('PARAM_IGNORED_BY_PROVIDER'),
      message: `Parameter topK is not supported by provider ${providerType} and was ignored.`,
      field: 'params.topK',
    });
  }

  if (
    openAiNumericThinkingBudgetIgnored(options) &&
    (providerType === 'openai' || providerType === 'openai-compatible')
  ) {
    warnings.push({
      code: asWarningCode('PARAM_IGNORED_BY_PROVIDER'),
      message:
        'Numeric thinkingBudget is not mapped to OpenAI reasoning API; effort level "medium" is used instead. Use string effort (low/medium/high) or reasoning_effort via OpenAI facade.',
      field: 'params.thinkingBudget',
    });
  }

  if (
    openAiNumericThinkingBudgetWithoutEnable(options) &&
    providerType === 'openai'
  ) {
    warnings.push({
      code: asWarningCode('PARAM_IGNORED_BY_PROVIDER'),
      message:
        'Numeric thinkingBudget is ignored without thinkingEnabled: true. ' +
        'Enable thinking or use string effort (low/medium/high).',
      field: 'params.thinkingBudget',
    });
  }

  if (
    providerType === 'openai-compatible' &&
    isOpenAiReasoningRequested(options)
  ) {
    warnings.push({
      code: asWarningCode('PARAM_IGNORED_BY_PROVIDER'),
      message:
        'Extended thinking / reasoning parameters are not supported by openai-compatible providers and were ignored',
      field: 'params.thinkingEnabled',
    });
  }

  if (providerType === 'openai') {
    for (const [field, paramName] of OPENAI_RESPONSES_UNSUPPORTED_PARAMS) {
      const param = options[paramName];
      if (param !== undefined) {
        warnings.push({
          code: asWarningCode('PARAM_IGNORED_BY_PROVIDER'),
          message: `Parameter ${paramName} is not supported by OpenAI Responses API and was ignored.`,
          field,
        });
      }
    }
  }

  return warnings;
}
