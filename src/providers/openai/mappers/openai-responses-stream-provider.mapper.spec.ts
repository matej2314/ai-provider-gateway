import {
  extractResponsesOutputItemToolCall,
  extractResponsesStreamToolCallDone,
  registerResponsesFunctionCallItemId,
} from './openai-responses-stream-provider.mapper';
import { asToolCallId } from '../../../common/types/branded.types';

describe('openai-responses-stream-provider.mapper', () => {
  it('resolves call_id from item_id registry', () => {
    const registry = new Map<string, string>();
    registerResponsesFunctionCallItemId(
      {
        type: 'function_call',
        id: 'item_123',
        call_id: 'call_456',
        name: 'fn',
        arguments: '{}',
      } as never,
      registry,
    );

    const call = extractResponsesStreamToolCallDone(
      {
        type: 'response.function_call_arguments.done',
        item_id: 'item_123',
        name: 'fn',
        arguments: '{"a":1}',
      } as never,
      registry,
    );

    expect(call).toEqual({
      id: asToolCallId('call_456'),
      name: 'fn',
      arguments: '{"a":1}',
    });
  });

  it('falls back to item_id when registry has no mapping', () => {
    const call = extractResponsesStreamToolCallDone(
      {
        type: 'response.function_call_arguments.done',
        item_id: 'item_123',
        name: 'fn',
        arguments: '{}',
      } as never,
      new Map(),
    );

    expect(call.id).toBe(asToolCallId('item_123'));
  });

  it('extractResponsesOutputItemToolCall uses call_id', () => {
    expect(
      extractResponsesOutputItemToolCall({
        type: 'function_call',
        id: 'item_123',
        call_id: 'call_456',
        name: 'fn',
        arguments: '{"b":2}',
      } as never),
    ).toEqual({
      id: asToolCallId('call_456'),
      name: 'fn',
      arguments: '{"b":2}',
    });
  });

  it('registerResponsesFunctionCallItemId ignores non-function_call items', () => {
    const registry = new Map<string, string>();
    registerResponsesFunctionCallItemId(
      { type: 'message', role: 'assistant', content: [] } as never,
      registry,
    );

    expect(registry.size).toBe(0);
  });
});
