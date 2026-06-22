import { buildGenerationWarnings } from './generation-warnings';

describe('buildGenerationWarnings', () => {
  it('should warn frequencyPenalty for anthropic', () => {
    const warnings = buildGenerationWarnings(
      { frequencyPenalty: 0.5 },
      'anthropic',
    );
    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'PARAM_IGNORED_BY_PROVIDER',
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
});
