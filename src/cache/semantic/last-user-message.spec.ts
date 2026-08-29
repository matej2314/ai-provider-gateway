import {
  lastUserMessageText,
  isSingleTurnUserRequest,
} from './last-user-message';
import type { CacheIdentityMessage } from '../types/chat-cache-identity.type';

describe('lastUserMessageText', () => {
  it('should return null when no user message', () => {
    const messages: CacheIdentityMessage[] = [
      { role: 'assistant', content: 'Hello' },
    ];

    expect(lastUserMessageText(messages)).toBeNull();
  });

  it('should return null when user content is empty or whitespace', () => {
    expect(lastUserMessageText([{ role: 'user', content: '' }])).toBeNull();
    expect(lastUserMessageText([{ role: 'user', content: '   ' }])).toBeNull();
  });

  it('should return the last non-empty user message', () => {
    const messages: CacheIdentityMessage[] = [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply' },
      { role: 'user', content: 'second' },
    ];

    expect(lastUserMessageText(messages)).toBe('second');
  });

  it('should return raw content without search_query prefix (G3)', () => {
    const raw = 'What is the capital of France?';
    const result = lastUserMessageText([{ role: 'user', content: raw }]);

    expect(result).toBe(raw);
    expect(result).not.toMatch(/^search_query:/);
  });
});

describe('isSingleTurnUserRequest', () => {
  it('should return true for a single user message', () => {
    const msgs: CacheIdentityMessage[] = [{ role: 'user', content: 'Hi' }];
    expect(isSingleTurnUserRequest(msgs)).toBe(true);
  });

  it('should return false when assistant message is present', () => {
    const msgs: CacheIdentityMessage[] = [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply' },
      { role: 'user', content: 'second' },
    ];
    expect(isSingleTurnUserRequest(msgs)).toBe(false);
  });

  it('should return false when tool message is present', () => {
    const msgs: CacheIdentityMessage[] = [
      { role: 'user', content: 'use tool' },
      { role: 'tool', content: '{"ok":true}', toolCallId: 'tc_1' },
      { role: 'user', content: 'summarise' },
    ];
    expect(isSingleTurnUserRequest(msgs)).toBe(false);
  });

  it('should return false for multiple user messages without assistant', () => {
    const msgs: CacheIdentityMessage[] = [
      { role: 'user', content: 'first' },
      { role: 'user', content: 'second' },
    ];
    expect(isSingleTurnUserRequest(msgs)).toBe(false);
  });

  it('should return false for empty messages array', () => {
    expect(isSingleTurnUserRequest([])).toBe(false);
  });

  it('should return false for only assistant messages', () => {
    const msgs: CacheIdentityMessage[] = [
      { role: 'assistant', content: 'hello' },
    ];
    expect(isSingleTurnUserRequest(msgs)).toBe(false);
  });
});
