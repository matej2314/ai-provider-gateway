import type Anthropic from '@anthropic-ai/sdk';
import type { ProviderCallOptions } from '../interfaces/ai-provider.interface';

const ANTHROPIC_EFFORT_LEVELS = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const;

type AnthropicEffortLevel = (typeof ANTHROPIC_EFFORT_LEVELS)[number];

const MIN_THINKING_BUDGET_TOKENS = 1024;

function isAnthropicEffortLevel(value: unknown): value is AnthropicEffortLevel {
  return (
    typeof value === 'string' &&
    (ANTHROPIC_EFFORT_LEVELS as readonly string[]).includes(value)
  );
}

export function mapThinkingBudgetToAnthropicEffort(
  thinkingBudget: ProviderCallOptions['thinkingBudget'],
): AnthropicEffortLevel | undefined {
  return isAnthropicEffortLevel(thinkingBudget) ? thinkingBudget : undefined;
}

export function mapThinkingToAnthropic(
  options?: ProviderCallOptions,
): Anthropic.ThinkingConfigParam | undefined {
  if (!options?.thinkingEnabled) return undefined;

  if (typeof options.thinkingBudget === 'number') {
    return {
      type: 'enabled',
      budget_tokens: Math.max(
        MIN_THINKING_BUDGET_TOKENS,
        options.thinkingBudget,
      ),
      display: 'summarized',
    };
  }

  return {
    type: 'adaptive',
    display: 'summarized',
  };
}

export function resolveAnthropicOutputConfig(
  options?: ProviderCallOptions,
): Anthropic.MessageCreateParams['output_config'] | undefined {
  const effort = mapThinkingBudgetToAnthropicEffort(options?.thinkingBudget);

  const format =
    options?.responseFormat?.type === 'json_object'
      ? {
          type: 'json_schema' as const,
          schema: options?.responseFormat?.jsonSchema ?? {
            type: 'object',
            additionalProperties: true,
          },
        }
      : undefined;

  if (!format && !effort) return undefined;

  return {
    ...(format ? { format } : {}),
    ...(effort ? { effort } : {}),
  };
}

export function extractAnthropicThinkingContent(
  content: Anthropic.ContentBlock[],
): string | undefined {
  let thinkingContent = '';

  for (const block of content) {
    if (block.type === 'thinking') {
      thinkingContent += block.thinking ?? '';
    }
  }
  return thinkingContent || undefined;
}
