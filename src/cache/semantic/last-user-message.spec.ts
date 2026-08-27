import {
  lastUserMessageText,
  isSingleTurnUserRequest,
} from './last-user-message';
import type { ChatRequestDto } from '../../chat/dto/chat-request.dto';
import type { ChatMessageDto } from '../../chat/dto/chat-message.dto';
import { TEST_MODEL_ALIAS } from '../../common/mocks/test-constants';

describe('lastUserMessageText', () => {
  it('should return null when no user message', () => {
    const request: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'assistant', content: 'Hello' }],
    };

    expect(lastUserMessageText(request)).toBeNull();
  });

  it('should return null when user content is empty or whitespace', () => {
    const empty: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user', content: '' }],
    };
    const whitespace: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user', content: '   ' }],
    };

    expect(lastUserMessageText(empty)).toBeNull();
    expect(lastUserMessageText(whitespace)).toBeNull();
  });

  it('should return the last non-empty user message', () => {
    const request: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'reply' },
        { role: 'user', content: 'second' },
      ],
    };

    expect(lastUserMessageText(request)).toBe('second');
  });

  it('should return raw content without search_query prefix (G3)', () => {
    const raw = 'What is the capital of France?';
    const request: ChatRequestDto = {
      modelAlias: TEST_MODEL_ALIAS,
      messages: [{ role: 'user', content: raw }],
    };

    const result = lastUserMessageText(request);

    expect(result).toBe(raw);
    expect(result).not.toMatch(/^search_query:/);
  });
});

describe('isSingleTurnUserRequest', () => {
  it('should return true for a single user message', () => {
    const msgs: ChatMessageDto[] = [{ role: 'user', content: 'Hi' }];
    expect(isSingleTurnUserRequest(msgs)).toBe(true);
  });

  it('should return false when assistant message is present', () => {
    const msgs: ChatMessageDto[] = [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply' },
      { role: 'user', content: 'second' },
    ];
    expect(isSingleTurnUserRequest(msgs)).toBe(false);
  });

  it('should return false when tool message is present', () => {
    const msgs: ChatMessageDto[] = [
      { role: 'user', content: 'use tool' },
      { role: 'tool', content: '{"ok":true}', toolCallId: 'tc_1' },
      { role: 'user', content: 'summarise' },
    ];
    expect(isSingleTurnUserRequest(msgs)).toBe(false);
  });

  it('should return false for multiple user messages without assistant', () => {
    const msgs: ChatMessageDto[] = [
      { role: 'user', content: 'first' },
      { role: 'user', content: 'second' },
    ];
    expect(isSingleTurnUserRequest(msgs)).toBe(false);
  });

  it('should return false for empty messages array', () => {
    expect(isSingleTurnUserRequest([])).toBe(false);
  });

  it('should return false for only assistant messages', () => {
    const msgs: ChatMessageDto[] = [{ role: 'assistant', content: 'hello' }];
    expect(isSingleTurnUserRequest(msgs)).toBe(false);
  });
});
