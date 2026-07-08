import {
  accumulateOpenAiStreamToolCallDeltas,
  finalizeOpenAiStreamToolCalls,
} from './openai-stream-provider.mapper';
import { asToolCallId } from '../../../common/types/branded.types';

describe('openai-stream-provider.mapper', () => {
  it('accumulates tool call arguments across chunks by index', () => {
    const accumulator = new Map();

    accumulateOpenAiStreamToolCallDeltas(
      {
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_abc',
                  type: 'function',
                  function: { name: 'get_weather', arguments: '' },
                },
              ],
            },
          },
        ],
      } as never,
      accumulator,
    );

    accumulateOpenAiStreamToolCallDeltas(
      {
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, function: { arguments: '{"city":"' } }],
            },
          },
        ],
      } as never,
      accumulator,
    );

    accumulateOpenAiStreamToolCallDeltas(
      {
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, function: { arguments: 'Warsaw"}' } }],
            },
          },
        ],
      } as never,
      accumulator,
    );

    expect(finalizeOpenAiStreamToolCalls(accumulator)).toEqual([
      {
        id: asToolCallId('call_abc'),
        name: 'get_weather',
        arguments: '{"city":"Warsaw"}',
      },
    ]);
  });

  it('returns empty array when no complete tool calls were accumulated', () => {
    const accumulator = new Map();
    accumulateOpenAiStreamToolCallDeltas(
      {
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, function: { arguments: '{"a":1}' } }],
            },
          },
        ],
      } as never,
      accumulator,
    );

    expect(finalizeOpenAiStreamToolCalls(accumulator)).toEqual([]);
  });
});
