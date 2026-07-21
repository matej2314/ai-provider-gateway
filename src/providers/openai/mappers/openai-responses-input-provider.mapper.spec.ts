import { mapTurnsToResponsesInput } from './openai-responses-input-provider.mapper';
import { asToolCallId } from '../../../common/types/branded.types';

const CALL_1 = asToolCallId('call_1');

describe('mapTurnsToResponsesInput', () => {
  it('emits assistant content before function_call items', () => {
    const input = mapTurnsToResponsesInput([
      {
        role: 'assistant',
        content: 'Let me check.',
        toolCalls: [{ id: CALL_1, name: 'fn', arguments: '{}' }],
      },
    ]);

    expect(input[0]).toEqual({
      role: 'assistant',
      content: 'Let me check.',
    });
    expect(input[1]).toMatchObject({
      type: 'function_call',
      call_id: CALL_1,
    });
  });

  it('maps tool results to function_call_output', () => {
    const input = mapTurnsToResponsesInput([
      { role: 'user', content: 'Hi' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: CALL_1, name: 'fn', arguments: '{}' }],
      },
      { role: 'tool', toolCallId: CALL_1, content: '{"ok":true}' },
    ]);

    expect(input).toEqual([
      { role: 'user', content: 'Hi' },
      {
        type: 'function_call',
        call_id: CALL_1,
        name: 'fn',
        arguments: '{}',
      },
      {
        type: 'function_call_output',
        call_id: CALL_1,
        output: '{"ok":true}',
      },
    ]);
  });
});
