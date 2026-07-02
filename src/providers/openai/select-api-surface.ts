import {
  isResponsesOnlyModel,
  requestRequiresResponsesApi,
} from './openai-api-surface.models';
import { isOpenAiReasoningRequested } from './mappers/openai-thinking-provider.mapper';
import type { OpenAiProviderType } from '../../config/provider-types';
import type { OpenAiProviderConfig } from './openai-provider.types';
import type {
  ProviderCallOptions,
  ProviderChatInput,
} from '../interfaces/ai-provider.interface';

export type SelectedOpenAiApiSurface = 'chat-completions' | 'responses';

export function selectApiSurface(
  providerType: OpenAiProviderType,
  config: OpenAiProviderConfig,
  modelId: string,
  options: ProviderCallOptions,
  input: ProviderChatInput,
): SelectedOpenAiApiSurface {
  if (providerType === 'openai-compatible') {
    return 'chat-completions';
  }

  if (config.apiSurface === 'chat-completions') return 'chat-completions';
  if (config.apiSurface === 'responses') return 'responses';

  if (isOpenAiReasoningRequested(options)) {
    return 'responses';
  }

  if (requestRequiresResponsesApi(options, input)) return 'responses';
  if (isResponsesOnlyModel(modelId)) return 'responses';

  return 'chat-completions';
}
