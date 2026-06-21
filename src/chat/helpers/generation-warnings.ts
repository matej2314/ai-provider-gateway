import type { ChatWarningDto } from '../dto/chat-warning.dto';
import type { ProviderCallOptions } from 'src/providers/interfaces/ai-provider.interface';
import { GatewayProviderType, PROVIDER_TYPES } from 'src/config/provider-types';

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
      code: 'PARAM_IGNORED_BY_PROVIDER',
      message: `Parameter frequencyPenalty is not supported by provider ${providerType} and was ignored.`,
      field: 'params.frequencyPenalty',
    });
  }

  if (
    options.presencePenalty !== undefined &&
    (providerType === 'anthropic' || providerType === 'google')
  ) {
    warnings.push({
      code: 'PARAM_IGNORED_BY_PROVIDER',
      message: `Parameter presencePenalty is not supported by provider ${providerType} and was ignored.`,
      field: 'params.presencePenalty',
    });
  }

  if (options.seed !== undefined && providerType === 'anthropic') {
    warnings.push({
      code: 'PARAM_IGNORED_BY_PROVIDER',
      message: `Parameter seed is not supported by provider ${providerType} and was ignored.`,
      field: 'params.seed',
    });
  }
  return warnings;
}
