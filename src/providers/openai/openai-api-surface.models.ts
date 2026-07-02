import type {
  ProviderCallOptions,
  ProviderChatInput,
} from '../interfaces/ai-provider.interface';

const RESPONSES_ONLY_MODEL_PATTERNS: RegExp[] = [/^o\d/i, /^gpt-5/i];

const MAX_COMPLETION_TOKENS_MODEL_PATTERNS: RegExp[] = [
  /^o\d/i,
  /^gpt-5/i,
  /^gpt-4\.1/i,
  /^gpt-4o/i,
];

export function prefersMaxCompletionTokens(modelId: string): boolean {
  return MAX_COMPLETION_TOKENS_MODEL_PATTERNS.some((pattern) =>
    pattern.test(modelId),
  );
}

export function isResponsesOnlyModel(modelId: string): boolean {
  return RESPONSES_ONLY_MODEL_PATTERNS.some((pattern) => pattern.test(modelId));
}

export function requestRequiresResponsesApi(
  options: ProviderCallOptions,
  input: ProviderChatInput,
): boolean {
  if (options.responseFormat?.type === 'json_object') {
    // json_object response format does not require responses API, also works with chat-completions API
    return false;
  }

  // When ProviderCallOptions.parallelToolCalls is added:
  // if (options.parallelToolCalls === true) return true;

  void input;
  return false;
}
