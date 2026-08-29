import { toChatCacheIdentity } from './to-chat-cache-identity';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import {
  TEST_MODEL_ALIAS,
  TEST_MODEL_ALIAS_BRANDED,
  TEST_TOOL_CALL_ID,
} from '../../common/mocks/test-constants';
import { asClientId } from '../../common/types/branded.types';

const TEST_CLIENT_ID = asClientId('test-client');

describe('toChatCacheIdentity', () => {
  it('maps alias, client, messages and optional call params', () => {
    const request: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const identity = toChatCacheIdentity(request, TEST_CLIENT_ID, {
      temperature: 0.2,
    });

    expect(identity).toEqual({
      modelAlias: TEST_MODEL_ALIAS_BRANDED,
      clientId: TEST_CLIENT_ID,
      messages: [{ role: 'user', content: 'Hello' }],
      callParams: { temperature: 0.2 },
    });
  });

  it('copies tool identity fields used in exact hashing', () => {
    const request: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [
        { role: 'user', content: 'call it' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: TEST_TOOL_CALL_ID, name: 'search', arguments: '{}' },
          ],
        },
        {
          role: 'tool',
          content: '{}',
          toolCallId: TEST_TOOL_CALL_ID,
        },
      ],
    };

    const identity = toChatCacheIdentity(request, TEST_CLIENT_ID);

    expect(identity.messages).toEqual([
      { role: 'user', content: 'call it' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: TEST_TOOL_CALL_ID, name: 'search', arguments: '{}' }],
      },
      { role: 'tool', content: '{}', toolCallId: TEST_TOOL_CALL_ID },
    ]);
    expect(identity).not.toHaveProperty('callParams');
  });
});
