import { buildGenerationWarnings } from './generation-warnings';
import { asWarningCode } from '../../common/types/branded.types';

const PARAM_IGNORED = asWarningCode('PARAM_IGNORED_BY_PROVIDER');

describe('buildGenerationWarnings', () => {
  it('should warn frequencyPenalty for anthropic', () => {
    const warnings = buildGenerationWarnings(
      { frequencyPenalty: 0.5 },
      'anthropic',
    );
    expect(warnings).toEqual([
      expect.objectContaining({
        code: PARAM_IGNORED,
        field: 'params.frequencyPenalty',
      }),
    ]);
  });

  it('should warn seed only for anthropic, not for other providers', () => {
    expect(buildGenerationWarnings({ seed: 42 }, 'anthropic')).toHaveLength(1);
    expect(buildGenerationWarnings({ seed: 42 }, 'google')).toHaveLength(0);
  });

  it('should return empty array when no ignored params are provided', () => {
    expect(buildGenerationWarnings({ temperature: 0.7 }, 'anthropic')).toEqual(
      [],
    );
  });

  it('should warn frequencyPenalty and presencePenalty for google', () => {
    const warnings = buildGenerationWarnings(
      { frequencyPenalty: 0.1, presencePenalty: 0.2 },
      'google',
    );
    expect(warnings).toHaveLength(2);
    expect(warnings.map((warning) => warning.field)).toEqual(
      expect.arrayContaining([
        'params.frequencyPenalty',
        'params.presencePenalty',
      ]),
    );
  });

  it('should warn topK for openai', () => {
    const warnings = buildGenerationWarnings({ topK: 40 }, 'openai');
    expect(warnings).toEqual([
      expect.objectContaining({
        code: PARAM_IGNORED,
        field: 'params.topK',
        message: expect.stringMatching(/OpenAI Responses API/i),
      }),
    ]);
  });

  it('should warn topK for openai-compatible', () => {
    const warnings = buildGenerationWarnings({ topK: 40 }, 'openai-compatible');
    expect(warnings).toEqual([
      expect.objectContaining({
        field: 'params.topK',
      }),
    ]);
  });

  it('should warn numeric thinkingBudget for openai', () => {
    const warnings = buildGenerationWarnings(
      { thinkingEnabled: true, thinkingBudget: 2048 },
      'openai',
    );
    expect(warnings).toEqual([
      expect.objectContaining({
        field: 'params.thinkingBudget',
      }),
    ]);
  });

  it('should warn numeric thinkingBudget without thinkingEnabled for openai', () => {
    const warnings = buildGenerationWarnings(
      { thinkingBudget: 2048 },
      'openai',
    );
    expect(warnings).toEqual([
      expect.objectContaining({
        field: 'params.thinkingBudget',
        message: expect.stringMatching(/without thinkingEnabled/i),
      }),
    ]);
  });

  it('should warn responses-unsupported params for openai', () => {
    const warnings = buildGenerationWarnings(
      { frequencyPenalty: 0.1, stop: ['END'] },
      'openai',
    );
    expect(warnings.map((w) => w.field)).toEqual(
      expect.arrayContaining(['params.frequencyPenalty', 'params.stop']),
    );
  });

  it('should warn reasoning params for openai-compatible', () => {
    const warnings = buildGenerationWarnings(
      { thinkingEnabled: true },
      'openai-compatible',
    );
    expect(warnings).toEqual([
      expect.objectContaining({ field: 'params.thinkingEnabled' }),
    ]);
  });
});
