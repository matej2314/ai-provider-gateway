import {
  anthropicModelRejectsSamplingParams,
  providerModelRejectsSamplingParams,
} from './anthropic-sampling-params.util';

describe('anthropic-sampling-params.util', () => {
  describe('anthropicModelRejectsSamplingParams', () => {
    it.each([
      ['claude-opus-4-8', true],
      ['claude-opus-4-7', true],
      ['claude-opus-4-6', false],
      ['claude-opus-4-5-20251101', false],
      ['claude-sonnet-4-5-20250929', false],
      ['claude-sonnet-5', true],
      ['claude-sonnet-5-20260101', true],
    ])('model %s → %s', (modelId, expected) => {
      expect(anthropicModelRejectsSamplingParams(modelId)).toBe(expected);
    });
  });

  describe('providerModelRejectsSamplingParams', () => {
    it('returns false for non-anthropic providers', () => {
      expect(
        providerModelRejectsSamplingParams('claude-opus-4-8', 'openai'),
      ).toBe(false);
    });

    it('delegates to anthropic rules for anthropic provider', () => {
      expect(
        providerModelRejectsSamplingParams('claude-opus-4-8', 'anthropic'),
      ).toBe(true);
      expect(
        providerModelRejectsSamplingParams(
          'claude-sonnet-4-5-20250929',
          'anthropic',
        ),
      ).toBe(false);
    });
  });
});
