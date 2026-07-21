import {
  mapThinkingBudgetToAnthropicEffort,
  mapThinkingToAnthropic,
  resolveAnthropicOutputConfig,
  extractAnthropicThinkingContent,
} from './anthropic-thinking.mapper';
import type { ProviderCallOptions } from '../interfaces/ai-provider.interface';
import type Anthropic from '@anthropic-ai/sdk';

describe('mapThinkingBudgetToAnthropicEffort', () => {
  it('should map valid effort levels', () => {
    expect(mapThinkingBudgetToAnthropicEffort('low')).toBe('low');
    expect(mapThinkingBudgetToAnthropicEffort('medium')).toBe('medium');
    expect(mapThinkingBudgetToAnthropicEffort('high')).toBe('high');
    expect(mapThinkingBudgetToAnthropicEffort('xhigh')).toBe('xhigh');
    expect(mapThinkingBudgetToAnthropicEffort('max')).toBe('max');
  });

  it('should map low and ignore minimal gateway value', () => {
    expect(mapThinkingBudgetToAnthropicEffort('low')).toBe('low');
    expect(mapThinkingBudgetToAnthropicEffort('minimal')).toBeUndefined();
  });
});

describe('mapThinkingToAnthropic', () => {
  it('should return undefined when thinkingEnabled false', () => {
    const options: ProviderCallOptions = { thinkingEnabled: false };

    const result = mapThinkingToAnthropic(options);

    expect(result).toBeUndefined();
  });

  it('should return undefined when thinkingEnabled not set', () => {
    const result = mapThinkingToAnthropic(undefined);

    expect(result).toBeUndefined();
  });

  it('should return adaptive config when thinkingEnabled without budget', () => {
    const options: ProviderCallOptions = { thinkingEnabled: true };

    const result = mapThinkingToAnthropic(options);

    expect(result).toEqual({
      type: 'adaptive',
      display: 'summarized',
    });
  });

  it('should return token-based config when thinkingBudget is number', () => {
    const options: ProviderCallOptions = {
      thinkingEnabled: true,
      thinkingBudget: 5000,
    };

    const result = mapThinkingToAnthropic(options);

    expect(result).toEqual({
      type: 'enabled',
      budget_tokens: 5000,
      display: 'summarized',
    });
  });

  it('should enforce minimum budget_tokens of 1024', () => {
    const options: ProviderCallOptions = {
      thinkingEnabled: true,
      thinkingBudget: 500,
    };

    const result = mapThinkingToAnthropic(options);

    expect(result).toEqual({
      type: 'enabled',
      budget_tokens: 1024,
      display: 'summarized',
    });
  });

  it('should return adaptive when thinkingBudget is string', () => {
    const options: ProviderCallOptions = {
      thinkingEnabled: true,
      thinkingBudget: 'high',
    };

    const result = mapThinkingToAnthropic(options);

    expect(result).toEqual({
      type: 'adaptive',
      display: 'summarized',
    });
  });

  it('should return adaptive when thinkingBudget is minimal gateway value', () => {
    const options: ProviderCallOptions = {
      thinkingEnabled: true,
      thinkingBudget: 'minimal',
    };

    const result = mapThinkingToAnthropic(options);

    expect(result).toEqual({
      type: 'adaptive',
      display: 'summarized',
    });
  });
});

describe('resolveAnthropicOutputConfig', () => {
  it('should return undefined when no format and no effort', () => {
    const result = resolveAnthropicOutputConfig(undefined);

    expect(result).toBeUndefined();
  });

  it('should return format config for json_object', () => {
    const options: ProviderCallOptions = {
      responseFormat: { type: 'json_object' },
    };

    const result = resolveAnthropicOutputConfig(options);

    expect(result).toEqual({
      format: {
        type: 'json_schema',
        schema: { type: 'object', additionalProperties: true },
      },
    });
  });

  it('should use provided jsonSchema', () => {
    const options: ProviderCallOptions = {
      responseFormat: {
        type: 'json_object',
        jsonSchema: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      },
    };

    const result = resolveAnthropicOutputConfig(options);

    expect(result).toEqual({
      format: {
        type: 'json_schema',
        schema: { type: 'object', properties: { name: { type: 'string' } } },
      },
    });
  });

  it('should return effort config when valid effort level', () => {
    const options: ProviderCallOptions = {
      thinkingBudget: 'high',
    };

    const result = resolveAnthropicOutputConfig(options);

    expect(result).toEqual({
      effort: 'high',
    });
  });

  it('should return effort config for low', () => {
    const options: ProviderCallOptions = {
      thinkingBudget: 'low',
    };

    const result = resolveAnthropicOutputConfig(options);

    expect(result).toEqual({
      effort: 'low',
    });
  });

  it('should ignore minimal gateway value', () => {
    const options: ProviderCallOptions = {
      thinkingBudget: 'minimal',
    };

    const result = resolveAnthropicOutputConfig(options);

    expect(result).toBeUndefined();
  });

  it('should return undefined when responseFormat is text only', () => {
    const options: ProviderCallOptions = {
      responseFormat: { type: 'text' },
    };

    const result = resolveAnthropicOutputConfig(options);

    expect(result).toBeUndefined();
  });

  it('should return effort only when responseFormat is text', () => {
    const options: ProviderCallOptions = {
      responseFormat: { type: 'text' },
      thinkingBudget: 'high',
    };

    const result = resolveAnthropicOutputConfig(options);

    expect(result).toEqual({
      effort: 'high',
    });
  });

  it('should combine format and effort', () => {
    const options: ProviderCallOptions = {
      responseFormat: { type: 'json_object' },
      thinkingBudget: 'medium',
    };

    const result = resolveAnthropicOutputConfig(options);

    expect(result).toEqual({
      format: {
        type: 'json_schema',
        schema: { type: 'object', additionalProperties: true },
      },
      effort: 'medium',
    });
  });

  it('should ignore numeric thinkingBudget', () => {
    const options: ProviderCallOptions = {
      thinkingBudget: 5000,
    };

    const result = resolveAnthropicOutputConfig(options);

    expect(result).toBeUndefined();
  });
});

describe('extractAnthropicThinkingContent', () => {
  const thinkingBlock = (thinking: string): Anthropic.ContentBlock => ({
    type: 'thinking',
    thinking,
    signature: 'test-signature',
  });

  const textBlock = (text: string): Anthropic.ContentBlock => ({
    type: 'text',
    text,
    citations: null,
  });

  it('should extract thinking block content', () => {
    const content: Anthropic.ContentBlock[] = [
      thinkingBlock('First thought'),
      textBlock('Response'),
    ];

    const result = extractAnthropicThinkingContent(content);

    expect(result).toBe('First thought');
  });

  it('should concatenate multiple thinking blocks', () => {
    const content: Anthropic.ContentBlock[] = [
      thinkingBlock('First thought'),
      textBlock('Response'),
      thinkingBlock('Second thought'),
    ];

    const result = extractAnthropicThinkingContent(content);

    expect(result).toBe('First thoughtSecond thought');
  });

  it('should return undefined when no thinking blocks', () => {
    const content: Anthropic.ContentBlock[] = [textBlock('Response')];

    const result = extractAnthropicThinkingContent(content);

    expect(result).toBeUndefined();
  });

  it('should handle empty content array', () => {
    const result = extractAnthropicThinkingContent([]);

    expect(result).toBeUndefined();
  });
});
