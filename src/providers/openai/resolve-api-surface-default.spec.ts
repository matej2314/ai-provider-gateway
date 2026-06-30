import { resolveApiSurfaceDefault } from './resolve-api-surface-default';

describe('resolveApiSurfaceDefault', () => {
  it.each([
    ['openai', undefined, 'auto'],
    ['openai', 'responses', 'responses'],
    ['openai', 'chat-completions', 'chat-completions'],
    ['openai-compatible', undefined, 'chat-completions'],
    ['openai-compatible', 'chat-completions', 'chat-completions'],
  ] as const)('type=%s yaml=%s → %s', (type, yaml, expected) => {
    expect(resolveApiSurfaceDefault(type, yaml)).toBe(expected);
  });
});
