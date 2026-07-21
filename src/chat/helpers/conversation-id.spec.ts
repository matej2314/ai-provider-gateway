jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import { v4 as uuidv4 } from 'uuid';
import {
  getClientConversationId,
  getOrCreateConversationIdForResponse,
} from './conversation-id';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import {
  MOCK_UUID,
  TEST_CONVERSATION_ID,
  VALID_CONVERSATION_ID,
} from '../../common/mocks/test-constants';
import { asConversationId } from '../../common/types/branded.types';

const mockedUuidV4 = uuidv4 as unknown as jest.Mock<string>;

const VALID_CONV_ID = VALID_CONVERSATION_ID;
const VALID_CONV_ID_ALT = asConversationId(
  'conv_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
);

describe('getClientConversationId', () => {
  it('should return conversation ID when provided', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: VALID_CONV_ID,
    };

    const result = getClientConversationId(request);

    expect(result).toBe(TEST_CONVERSATION_ID);
  });

  it('should trim conversation ID', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: `  ${VALID_CONV_ID}  `,
    };

    const result = getClientConversationId(request);

    expect(result).toBe(TEST_CONVERSATION_ID);
  });

  it('should return undefined when conversationId not provided', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
    };

    const result = getClientConversationId(request);

    expect(result).toBeUndefined();
  });

  it('should return undefined when conversationId is empty string', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: '',
    };

    const result = getClientConversationId(request);

    expect(result).toBeUndefined();
  });

  it('should return undefined when conversationId is whitespace only', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: '   ',
    };

    const result = getClientConversationId(request);

    expect(result).toBeUndefined();
  });

  it('should throw when conversationId has invalid format', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: 'conv_invalid-id',
    };

    expect(() => getClientConversationId(request)).toThrow(
      'Invalid ConversationId format: conv_invalid-id',
    );
  });
});

describe('getOrCreateConversationIdForResponse', () => {
  beforeEach(() => {
    mockedUuidV4.mockReset();
  });

  it('should return existing conversation ID when provided', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: VALID_CONV_ID,
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe(TEST_CONVERSATION_ID);
    expect(mockedUuidV4).not.toHaveBeenCalled();
  });

  it('should generate new conversation ID when not provided', () => {
    mockedUuidV4.mockReturnValue(MOCK_UUID);

    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe(TEST_CONVERSATION_ID);
    expect(mockedUuidV4).toHaveBeenCalledTimes(1);
  });

  it('should generate new ID when conversationId is empty', () => {
    mockedUuidV4.mockReturnValue('aaaaaaaa-bbbb-4ccc-8ddd-111111111111');

    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: '',
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe('conv_aaaaaaaa-bbbb-4ccc-8ddd-111111111111');
    expect(mockedUuidV4).toHaveBeenCalledTimes(1);
  });

  it('should generate new ID when conversationId is whitespace', () => {
    mockedUuidV4.mockReturnValue('bbbbbbbb-bbbb-4bbb-8bbb-222222222222');

    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: '   ',
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe('conv_bbbbbbbb-bbbb-4bbb-8bbb-222222222222');
    expect(mockedUuidV4).toHaveBeenCalledTimes(1);
  });

  it('should generate unique IDs for multiple calls', () => {
    mockedUuidV4
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222')
      .mockReturnValueOnce('33333333-3333-4333-8333-333333333333');

    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
    };

    const id1 = getOrCreateConversationIdForResponse(request);
    const id2 = getOrCreateConversationIdForResponse(request);
    const id3 = getOrCreateConversationIdForResponse(request);

    expect(id1).toBe('conv_11111111-1111-4111-8111-111111111111');
    expect(id2).toBe('conv_22222222-2222-4222-8222-222222222222');
    expect(id3).toBe('conv_33333333-3333-4333-8333-333333333333');
    expect(mockedUuidV4).toHaveBeenCalledTimes(3);
  });

  it('should preserve exact format of client-provided ID', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: VALID_CONV_ID_ALT,
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe(VALID_CONV_ID_ALT);
    expect(mockedUuidV4).not.toHaveBeenCalled();
  });

  it('should trim and return client ID', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: `  ${VALID_CONV_ID}  `,
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe(TEST_CONVERSATION_ID);
    expect(mockedUuidV4).not.toHaveBeenCalled();
  });

  it('should throw when client conversationId has invalid format', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: 'conv_not-a-valid-uuid',
    };

    expect(() => getOrCreateConversationIdForResponse(request)).toThrow(
      'Invalid ConversationId format: conv_not-a-valid-uuid',
    );
    expect(mockedUuidV4).not.toHaveBeenCalled();
  });
});
