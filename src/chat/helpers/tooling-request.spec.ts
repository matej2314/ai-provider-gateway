import { isToolingRequest } from './tooling-request';
import type { ChatRequestDto } from '../dto/chat-request.dto';

describe('isToolingRequest', () => {
  describe('Happy path - tooling.definitions present', () => {
    it('should return true when tooling.definitions has items', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
        tooling: {
          definitions: [{ name: 'get_weather', parameters: {} }],
        },
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });

    it('should return true when multiple definitions', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
        tooling: {
          definitions: [
            { name: 'get_weather', parameters: {} },
            { name: 'get_time', parameters: {} },
          ],
        },
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });
  });

  describe('Happy path - tool messages', () => {
    it('should return true when tool message present', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'tool', toolCallId: 'call_123', content: '{"result":"ok"}' },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });

    it('should return true when multiple tool messages', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'tool', toolCallId: 'call_1', content: 'result1' },
          { role: 'tool', toolCallId: 'call_2', content: 'result2' },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });
  });

  describe('Happy path - assistant with toolCalls', () => {
    it('should return true when assistant has toolCalls', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          {
            role: 'assistant',
            content: '',
            toolCalls: [
              { id: 'call_123', name: 'get_weather', arguments: '{}' },
            ],
          },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });

    it('should return true when multiple toolCalls in assistant message', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          {
            role: 'assistant',
            content: '',
            toolCalls: [
              { id: 'call_1', name: 'weather', arguments: '{}' },
              { id: 'call_2', name: 'time', arguments: '{}' },
            ],
          },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });
  });

  describe('Happy path - combined scenarios', () => {
    it('should return true when definitions + tool messages', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'user', content: 'Check weather' },
          { role: 'tool', toolCallId: 'call_123', content: 'result' },
        ],
        tooling: {
          definitions: [{ name: 'get_weather', parameters: {} }],
        },
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });

    it('should return true when definitions + assistant toolCalls', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          {
            role: 'assistant',
            content: '',
            toolCalls: [{ id: 'call_1', name: 'test', arguments: '{}' }],
          },
        ],
        tooling: {
          definitions: [{ name: 'test', parameters: {} }],
        },
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });
  });

  describe('Edge case - returns false (non-tooling requests)', () => {
    it('should return false when no tooling', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(false);
    });

    it('should return false when tooling.definitions is empty', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
        tooling: {
          definitions: [],
        },
      };

      const result = isToolingRequest(request);

      expect(result).toBe(false);
    });

    it('should return false when tooling.definitions is undefined', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'user', content: 'Hello' }],
        tooling: {
          toolChoice: 'auto',
        },
      };

      const result = isToolingRequest(request);

      expect(result).toBe(false);
    });

    it('should return false when only user and assistant messages (no tools)', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(false);
    });

    it('should return false when assistant message without toolCalls', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(false);
    });

    it('should return false when assistant has empty toolCalls array', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'assistant', content: 'Hello', toolCalls: [] }],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(false);
    });
  });

  describe('Edge case - mixed messages', () => {
    it('should return true even when tool message is last', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
          { role: 'user', content: 'Check' },
          { role: 'tool', toolCallId: 'call_1', content: 'ok' },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });

    it('should return true even when tool message is first', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'tool', toolCallId: 'call_1', content: 'ok' },
          { role: 'assistant', content: 'Done' },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });

    it('should return true when tool message in middle of conversation', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello' },
          { role: 'tool', toolCallId: 'call_1', content: 'data' },
          { role: 'assistant', content: 'Based on data...' },
          { role: 'user', content: 'Thanks' },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });
  });

  describe('Integration - real-world scenarios', () => {
    it('should detect tool calling workflow', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'user', content: 'What is the weather?' },
          {
            role: 'assistant',
            content: 'Let me check',
            toolCalls: [
              { id: 'call_123', name: 'get_weather', arguments: '{}' },
            ],
          },
          {
            role: 'tool',
            toolCallId: 'call_123',
            content: '{"temp":72}',
          },
          { role: 'assistant', content: 'It is 72 degrees' },
        ],
        tooling: {
          definitions: [{ name: 'get_weather', parameters: {} }],
          toolChoice: 'auto',
        },
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });

    it('should detect parallel tool calls', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'user', content: 'Check weather and time' },
          {
            role: 'assistant',
            content: '',
            toolCalls: [
              { id: 'call_1', name: 'weather', arguments: '{}' },
              { id: 'call_2', name: 'time', arguments: '{}' },
            ],
          },
          { role: 'tool', toolCallId: 'call_1', content: 'sunny' },
          { role: 'tool', toolCallId: 'call_2', content: '10:00' },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(true);
    });

    it('should not detect regular chat (no tools)', () => {
      const request: ChatRequestDto = {
        modelAlias: 'test',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi! How can I help?' },
          { role: 'user', content: 'Tell me a joke' },
          {
            role: 'assistant',
            content: 'Why did the chicken cross the road?',
          },
          { role: 'user', content: 'Why?' },
        ],
      };

      const result = isToolingRequest(request);

      expect(result).toBe(false);
    });
  });
});
