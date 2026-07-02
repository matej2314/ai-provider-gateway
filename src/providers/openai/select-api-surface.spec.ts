import { selectApiSurface } from './select-api-surface';
import type { OpenAiProviderConfig } from './openai-provider.types';

const baseConfig: OpenAiProviderConfig = {
  apiKey: 'sk-test',
  baseUrl: 'https://api.openai.com/v1',
  apiSurface: 'auto',
};

describe('selectApiSurface', () => {
  it('openai-compatible always chat-completions', () => {
    expect(
      selectApiSurface(
        'openai-compatible',
        { ...baseConfig, apiSurface: 'chat-completions' },
        'llama3',
        {},
        { messages: [] },
      ),
    ).toBe('chat-completions');
  });

  it('thinking wins over responses-only model list', () => {
    expect(
      selectApiSurface(
        'openai',
        baseConfig,
        'o3-mini',
        { thinkingEnabled: true },
        { messages: [] },
      ),
    ).toBe('responses');
  });

  it('responses-only model without thinking', () => {
    expect(
      selectApiSurface('openai', baseConfig, 'o3-mini', {}, { messages: [] }),
    ).toBe('responses');
  });

  it('default gpt-4o → chat-completions', () => {
    expect(
      selectApiSurface('openai', baseConfig, 'gpt-4o', {}, { messages: [] }),
    ).toBe('chat-completions');
  });

  it('thinkingEnabled:false + numeric budget does not force responses', () => {
    expect(
      selectApiSurface(
        'openai',
        baseConfig,
        'gpt-4o',
        { thinkingEnabled: false, thinkingBudget: 2048 },
        { messages: [] },
      ),
    ).toBe('chat-completions');
  });

  it('thinkingEnabled:false + string effort does not force responses', () => {
    expect(
      selectApiSurface(
        'openai',
        baseConfig,
        'gpt-4o',
        { thinkingEnabled: false, thinkingBudget: 'high' },
        { messages: [] },
      ),
    ).toBe('chat-completions');
  });

  it('implicit string effort without thinkingEnabled forces responses', () => {
    expect(
      selectApiSurface(
        'openai',
        baseConfig,
        'gpt-4o',
        { thinkingBudget: 'high' },
        { messages: [] },
      ),
    ).toBe('responses');
  });

  it('numeric budget without thinkingEnabled stays on chat-completions', () => {
    expect(
      selectApiSurface(
        'openai',
        baseConfig,
        'gpt-4o',
        { thinkingBudget: 2048 },
        { messages: [] },
      ),
    ).toBe('chat-completions');
  });
});
