jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import { v4 as uuidv4 } from 'uuid';
import {
  getClientConversationId,
  getOrCreateConversationIdForResponse,
} from './conversation-id';
import type { ChatRequestDto } from '../dto/chat-request.dto';

const mockedUuidV4 = uuidv4 as unknown as jest.Mock<string>;

describe('getClientConversationId', () => {
  it('should return conversation ID when provided', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: 'conv_123e4567-e89b-12d3-a456-426614174000',
    };

    const result = getClientConversationId(request);

    expect(result).toBe('conv_123e4567-e89b-12d3-a456-426614174000');
  });

  it('should trim conversation ID', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: '  conv_123e4567-e89b-12d3-a456-426614174000  ',
    };

    const result = getClientConversationId(request);

    expect(result).toBe('conv_123e4567-e89b-12d3-a456-426614174000');
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
});

describe('getOrCreateConversationIdForResponse', () => {
  beforeEach(() => {
    mockedUuidV4.mockReset();
  });

  it('should return existing conversation ID when provided', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: 'conv_123e4567-e89b-12d3-a456-426614174000',
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe('conv_123e4567-e89b-12d3-a456-426614174000');
    expect(mockedUuidV4).not.toHaveBeenCalled();
  });

  it('should generate new conversation ID when not provided', () => {
    mockedUuidV4.mockReturnValue('123e4567-e89b-12d3-a456-426614174000');

    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe('conv_123e4567-e89b-12d3-a456-426614174000');
    expect(mockedUuidV4).toHaveBeenCalledTimes(1);
  });

  it('should generate new ID when conversationId is empty', () => {
    mockedUuidV4.mockReturnValue('aaaaaaaa-bbbb-cccc-dddd-111111111111');

    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: '',
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe('conv_aaaaaaaa-bbbb-cccc-dddd-111111111111');
    expect(mockedUuidV4).toHaveBeenCalledTimes(1);
  });

  it('should generate new ID when conversationId is whitespace', () => {
    mockedUuidV4.mockReturnValue('bbbbbbbb-bbbb-bbbb-bbbb-222222222222');

    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: '   ',
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe('conv_bbbbbbbb-bbbb-bbbb-bbbb-222222222222');
    expect(mockedUuidV4).toHaveBeenCalledTimes(1);
  });

  it('should generate unique IDs for multiple calls', () => {
    mockedUuidV4
      .mockReturnValueOnce('11111111-1111-1111-1111-111111111111')
      .mockReturnValueOnce('22222222-2222-2222-2222-222222222222')
      .mockReturnValueOnce('33333333-3333-3333-3333-333333333333');

    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
    };

    const id1 = getOrCreateConversationIdForResponse(request);
    const id2 = getOrCreateConversationIdForResponse(request);
    const id3 = getOrCreateConversationIdForResponse(request);

    expect(id1).toBe('conv_11111111-1111-1111-1111-111111111111');
    expect(id2).toBe('conv_22222222-2222-2222-2222-222222222222');
    expect(id3).toBe('conv_33333333-3333-3333-3333-333333333333');
    expect(mockedUuidV4).toHaveBeenCalledTimes(3);
  });

  it('should preserve exact format of client-provided ID', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: 'conv_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe('conv_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(mockedUuidV4).not.toHaveBeenCalled();
  });

  it('should trim and return client ID', () => {
    const request: ChatRequestDto = {
      modelAlias: 'test-model',
      messages: [],
      conversationId: '  conv_123e4567-e89b-12d3-a456-426614174000  ',
    };

    const result = getOrCreateConversationIdForResponse(request);

    expect(result).toBe('conv_123e4567-e89b-12d3-a456-426614174000');
    expect(mockedUuidV4).not.toHaveBeenCalled();
  });
});
