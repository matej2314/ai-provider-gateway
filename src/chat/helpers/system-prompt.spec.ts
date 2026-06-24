import {
  getResolvedSystemPrompts,
  composeSystemPrompt,
  SYSTEM_PROMPT_SECTION_JOINER,
} from './system-prompt';
import type { ResolvedSystemPrompts } from '../../config/configuration.types';

describe('getResolvedSystemPrompts', () => {
  it('should return resolved system prompts when present', () => {
    const mockPrompts: ResolvedSystemPrompts = {
      master: 'Master prompt',
      main: 'Main prompt',
      perModelByAlias: {},
    };
    const getConfig = () => mockPrompts;

    const result = getResolvedSystemPrompts(getConfig);

    expect(result).toEqual(mockPrompts);
  });

  it('should throw error when resolved prompts not found', () => {
    const getConfig = () => undefined;

    expect(() => getResolvedSystemPrompts(getConfig as any)).toThrow(
      '[Chat] resolvedSystemPrompts fot found in config',
    );
  });
});

describe('composeSystemPrompt', () => {
  it('should compose master prompt only', () => {
    const resolved: ResolvedSystemPrompts = {
      master: 'You are helpful.',
      perModelByAlias: {},
    };

    const result = composeSystemPrompt(resolved, 'test-model');

    expect(result).toBe('You are helpful.');
  });

  it('should compose master + main', () => {
    const resolved: ResolvedSystemPrompts = {
      master: 'You are helpful.',
      main: 'Answer concisely.',
      perModelByAlias: {},
    };

    const result = composeSystemPrompt(resolved, 'test-model');

    expect(result).toBe(
      `You are helpful.${SYSTEM_PROMPT_SECTION_JOINER}Answer concisely.`,
    );
  });

  it('should compose master + main + perModel', () => {
    const resolved: ResolvedSystemPrompts = {
      master: 'You are helpful.',
      main: 'Answer concisely.',
      perModelByAlias: {
        'gpt-model': 'You are GPT.',
      },
    };

    const result = composeSystemPrompt(resolved, 'gpt-model');

    expect(result).toBe(
      `You are helpful.${SYSTEM_PROMPT_SECTION_JOINER}Answer concisely.${SYSTEM_PROMPT_SECTION_JOINER}You are GPT.`,
    );
  });

  it('should skip main when undefined', () => {
    const resolved: ResolvedSystemPrompts = {
      master: 'Master',
      perModelByAlias: {
        test: 'Test specific',
      },
    };

    const result = composeSystemPrompt(resolved, 'test');

    expect(result).toBe(`Master${SYSTEM_PROMPT_SECTION_JOINER}Test specific`);
  });

  it('should skip perModel when not defined for alias', () => {
    const resolved: ResolvedSystemPrompts = {
      master: 'Master',
      main: 'Main',
      perModelByAlias: {
        other: 'Other',
      },
    };

    const result = composeSystemPrompt(resolved, 'test-model');

    expect(result).toBe(`Master${SYSTEM_PROMPT_SECTION_JOINER}Main`);
  });

  it('should trim each part', () => {
    const resolved: ResolvedSystemPrompts = {
      master: '  Master prompt  ',
      main: '\n\nMain prompt\n\n',
      perModelByAlias: {
        test: '  \tPerModel\n  ',
      },
    };

    const result = composeSystemPrompt(resolved, 'test');

    expect(result).toBe(
      `Master prompt${SYSTEM_PROMPT_SECTION_JOINER}Main prompt${SYSTEM_PROMPT_SECTION_JOINER}PerModel`,
    );
  });

  it('should handle empty strings after trim', () => {
    const resolved: ResolvedSystemPrompts = {
      master: 'Master',
      main: '   ',
      perModelByAlias: {},
    };

    const result = composeSystemPrompt(resolved, 'test');

    expect(result).toBe(`Master${SYSTEM_PROMPT_SECTION_JOINER}`);
  });

  it('should use double newline joiner', () => {
    const resolved: ResolvedSystemPrompts = {
      master: 'A',
      main: 'B',
      perModelByAlias: { test: 'C' },
    };

    const result = composeSystemPrompt(resolved, 'test');

    expect(result).toBe('A\n\nB\n\nC');
  });
});
