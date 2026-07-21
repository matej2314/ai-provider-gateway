import {
  mapGatewayUsageToAnthropic,
  mapSseDoneUsageToAnthropic,
} from './anthropic-usage.mapper';
import {
  asPromptCacheHitTokens,
  asPromptCacheCreationTokens,
} from '../../../common/types/branded.types';

describe('anthropic-usage.mapper', () => {
  it('should map usage and cache tokens 1:1 with response mapper', () => {
    expect(
      mapGatewayUsageToAnthropic(
        { inputTokens: 100, outputTokens: 50 },
        {
          promptCacheCreationTokens: 20,
          promptCacheHitTokens: 30,
        },
      ),
    ).toEqual({
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 20,
      cache_read_input_tokens: 30,
    });
  });

  it('should map branded ProviderUsageDetails from SseDoneEvent', () => {
    expect(
      mapSseDoneUsageToAnthropic({
        usage: {
          inputTokens: 10,
          outputTokens: 20,
        },
        usageDetails: {
          promptCacheHitTokens: asPromptCacheHitTokens(5),
          promptCacheCreationTokens: asPromptCacheCreationTokens(15),
        },
      }),
    ).toMatchObject({
      input_tokens: 10,
      output_tokens: 20,
      cache_read_input_tokens: 5,
      cache_creation_input_tokens: 15,
    });
  });
  it('should default cache fields to null when usageDetails absent', () => {
    expect(mapGatewayUsageToAnthropic(undefined, undefined)).toEqual({
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    });
  });
  it('should map from SseDoneEvent with plain API-boundary usageDetails', () => {
    expect(
      mapSseDoneUsageToAnthropic({
        usage: { inputTokens: 10, outputTokens: 20 },
        usageDetails: { promptCacheHitTokens: asPromptCacheHitTokens(5) },
      }),
    ).toMatchObject({
      input_tokens: 10,
      output_tokens: 20,
      cache_read_input_tokens: 5,
    });
  });
});
