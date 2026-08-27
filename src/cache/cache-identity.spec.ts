import { asJsonSchemaName } from '../common/types/branded.types';
import type { ProviderCallOptions } from '../providers/interfaces/ai-provider.interface';
import { hashCallParams, serializeCallParamsForCache } from './cache-identity';

describe('serializeCallParamsForCache', () => {
  it('should snapshot every generation field from ProviderCallOptions', () => {
    const options: ProviderCallOptions = {
      temperature: 0.7,
      maxOutputTokens: 1000,
      topP: 0.9,
      topK: 40,
      stop: ['END'],
      frequencyPenalty: 0.5,
      presencePenalty: 0.5,
      seed: 42,
      responseFormat: {
        type: 'json_schema',
        jsonSchemaName: asJsonSchemaName('reply'),
        jsonSchema: { type: 'object' },
      },
      thinkingEnabled: true,
      thinkingBudget: 'low',
      parallelToolCalls: false,
      signal: AbortSignal.abort(),
    };

    expect(serializeCallParamsForCache(options)).toEqual({
      temperature: 0.7,
      maxOutputTokens: 1000,
      topP: 0.9,
      topK: 40,
      stop: ['END'],
      frequencyPenalty: 0.5,
      presencePenalty: 0.5,
      seed: 42,
      responseFormat: {
        type: 'json_schema',
        jsonSchemaName: asJsonSchemaName('reply'),
        jsonSchema: { type: 'object' },
      },
      thinkingEnabled: true,
      thinkingBudget: 'low',
      parallelToolCalls: false,
    });
  });

  it('should normalise missing options to a stable null snapshot', () => {
    expect(serializeCallParamsForCache(undefined)).toEqual({
      temperature: null,
      maxOutputTokens: null,
      topP: null,
      topK: null,
      stop: null,
      frequencyPenalty: null,
      presencePenalty: null,
      seed: null,
      responseFormat: null,
      thinkingEnabled: null,
      thinkingBudget: null,
      parallelToolCalls: null,
    });
  });

  it('should preserve falsy generation values (false / 0 / none)', () => {
    const options: ProviderCallOptions = {
      temperature: 0,
      topK: 0,
      thinkingEnabled: false,
      thinkingBudget: 'none',
      parallelToolCalls: false,
    };

    expect(serializeCallParamsForCache(options)).toMatchObject({
      temperature: 0,
      topK: 0,
      thinkingEnabled: false,
      thinkingBudget: 'none',
      parallelToolCalls: false,
    });
  });

  it('should not include signal in the snapshot', () => {
    const snapshot = serializeCallParamsForCache({
      signal: AbortSignal.abort(),
    });

    expect(snapshot).not.toHaveProperty('signal');
  });
});

describe('hashCallParams', () => {
  it('should change hash when a previously omitted generation field changes', () => {
    const base: ProviderCallOptions = { temperature: 0.2 };
    const withTopK: ProviderCallOptions = { temperature: 0.2, topK: 40 };
    const withThinking: ProviderCallOptions = {
      temperature: 0.2,
      thinkingEnabled: true,
      thinkingBudget: 'high',
    };
    const withParallel: ProviderCallOptions = {
      temperature: 0.2,
      parallelToolCalls: true,
    };

    const baseHash = hashCallParams(base);
    expect(hashCallParams(withTopK)).not.toBe(baseHash);
    expect(hashCallParams(withThinking)).not.toBe(baseHash);
    expect(hashCallParams(withParallel)).not.toBe(baseHash);
  });

  it('should ignore signal when hashing', () => {
    expect(hashCallParams({ temperature: 0.2 })).toBe(
      hashCallParams({
        temperature: 0.2,
        signal: AbortSignal.abort(),
      }),
    );
  });
});
