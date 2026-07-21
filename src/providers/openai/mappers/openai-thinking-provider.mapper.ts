import type OpenAI from 'openai';
import type { ProviderCallOptions } from '../../../providers/interfaces/ai-provider.interface';

type OpenAiReasoningConfig = NonNullable<
  OpenAI.Responses.ResponseCreateParamsNonStreaming['reasoning']
>;
type OpenAiReasoningEffort = NonNullable<OpenAiReasoningConfig['effort']>;

const OPENAI_EFFORT_LEVELS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
] as const satisfies OpenAiReasoningEffort[];

function isOpenAiEffortLevel(value: unknown): value is OpenAiReasoningEffort {
  return (
    typeof value === 'string' &&
    (OPENAI_EFFORT_LEVELS as readonly string[]).includes(value)
  );
}

export function openAiNumericThinkingBudgetWithoutEnable(
  options?: ProviderCallOptions,
): boolean {
  return (
    options?.thinkingEnabled !== true &&
    typeof options?.thinkingBudget === 'number'
  );
}

export function isOpenAiReasoningRequested(
  options?: ProviderCallOptions,
): boolean {
  if (options?.thinkingEnabled === false) return false;
  if (options?.thinkingEnabled === true) return true;

  const budget = options?.thinkingBudget;
  if (budget === undefined) return false;

  return typeof budget === 'string';
}

export function openAiNumericThinkingBudgetIgnored(
  options?: ProviderCallOptions,
): boolean {
  return (
    options?.thinkingEnabled === true &&
    typeof options.thinkingBudget === 'number'
  );
}

function mapThinkingBudgetToEffort(
  budget: ProviderCallOptions['thinkingBudget'],
): OpenAiReasoningEffort | undefined {
  if (budget === undefined) return undefined;
  if (typeof budget === 'number') return undefined;
  if (budget === 'max') return 'xhigh';
  if (isOpenAiEffortLevel(budget)) return budget;
  return undefined;
}

export function mapThinkingToResponsesReasoning(
  options?: ProviderCallOptions,
): OpenAiReasoningConfig | undefined {
  if (!isOpenAiReasoningRequested(options)) return undefined;

  const effort = mapThinkingBudgetToEffort(options?.thinkingBudget) ?? 'medium';

  return {
    effort,
    summary: 'auto',
  };
}

/** DeepSeek V4+ chat-completions: thinking is on by default and can consume the output token budget. */
export type ChatCompletionThinkingParam = {
  type: 'enabled' | 'disabled';
};

export function mapThinkingToChatCompletion(
  options?: ProviderCallOptions,
): ChatCompletionThinkingParam {
  return {
    type: isOpenAiReasoningRequested(options) ? 'enabled' : 'disabled',
  };
}
