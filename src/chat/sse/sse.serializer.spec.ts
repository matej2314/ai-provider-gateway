import { SseSerializer } from './sse.serializer';

describe('SseSerializer', () => {
  let serializer: SseSerializer;

  beforeEach(() => {
    serializer = new SseSerializer();
  });

  describe('Happy path - basic events', () => {
    it('should serialize simple string data', () => {
      const event = { name: 'message', data: 'Hello World' };

      const result = serializer.serialize(event);

      expect(result).toBe('event: message\ndata: "Hello World"\n\n');
    });

    it('should serialize number data', () => {
      const event = { name: 'count', data: 42 };

      const result = serializer.serialize(event);

      expect(result).toBe('event: count\ndata: 42\n\n');
    });

    it('should serialize boolean data', () => {
      const event = { name: 'status', data: true };

      const result = serializer.serialize(event);

      expect(result).toBe('event: status\ndata: true\n\n');
    });

    it('should serialize null data', () => {
      const event = { name: 'empty', data: null };

      const result = serializer.serialize(event);

      expect(result).toBe('event: empty\ndata: null\n\n');
    });
  });

  describe('Happy path - object data', () => {
    it('should serialize simple object', () => {
      const event = {
        name: 'user',
        data: { id: 123, name: 'Alice' },
      };

      const result = serializer.serialize(event);

      expect(result).toBe('event: user\ndata: {"id":123,"name":"Alice"}\n\n');
    });

    it('should serialize nested object', () => {
      const event = {
        name: 'complex',
        data: {
          user: { id: 1, profile: { name: 'Bob', age: 30 } },
          timestamp: 1234567890,
        },
      };

      const result = serializer.serialize(event);

      expect(result).toContain('event: complex\n');
      expect(result).toContain('data: ');
      expect(result).toContain('"user":');
      expect(result).toContain('"profile":');
      expect(result).toMatch(/\n\n$/);
    });

    it('should serialize empty object', () => {
      const event = { name: 'empty', data: {} };

      const result = serializer.serialize(event);

      expect(result).toBe('event: empty\ndata: {}\n\n');
    });
  });

  describe('Happy path - array data', () => {
    it('should serialize array of primitives', () => {
      const event = { name: 'items', data: [1, 2, 3] };

      const result = serializer.serialize(event);

      expect(result).toBe('event: items\ndata: [1,2,3]\n\n');
    });

    it('should serialize array of objects', () => {
      const event = {
        name: 'users',
        data: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      };

      const result = serializer.serialize(event);

      expect(result).toContain('event: users\n');
      expect(result).toContain('[');
      expect(result).toContain('"Alice"');
      expect(result).toContain('"Bob"');
      expect(result).toMatch(/\n\n$/);
    });

    it('should serialize empty array', () => {
      const event = { name: 'list', data: [] };

      const result = serializer.serialize(event);

      expect(result).toBe('event: list\ndata: []\n\n');
    });
  });

  describe('Happy path - SSE event types (real gateway usage)', () => {
    it('should serialize chat.chunk event', () => {
      const event = {
        name: 'chat.chunk',
        data: { delta: 'Hello', index: 0 },
      };

      const result = serializer.serialize(event);

      expect(result).toBe(
        'event: chat.chunk\ndata: {"delta":"Hello","index":0}\n\n',
      );
    });

    it('should serialize chat.done event', () => {
      const event = {
        name: 'chat.done',
        data: {
          finishReason: 'stop',
          usage: { inputTokens: 10, outputTokens: 20 },
        },
      };

      const result = serializer.serialize(event);

      expect(result).toContain('event: chat.done\n');
      expect(result).toContain('"finishReason":"stop"');
      expect(result).toContain('"usage":');
    });

    it('should serialize error event', () => {
      const event = {
        name: 'error',
        data: {
          code: 'PROVIDER_ERROR',
          message: 'Failed to connect',
        },
      };

      const result = serializer.serialize(event);

      expect(result).toContain('event: error\n');
      expect(result).toContain('"code":"PROVIDER_ERROR"');
      expect(result).toContain('"message":"Failed to connect"');
    });
  });

  describe('Edge case - special characters in event name', () => {
    it('should serialize event name with spaces', () => {
      const event = { name: 'user event', data: 'test' };

      const result = serializer.serialize(event);

      expect(result).toContain('event: user event\n');
    });

    it('should serialize event name with special chars', () => {
      const event = { name: 'event-123_test', data: 'test' };

      const result = serializer.serialize(event);

      expect(result).toContain('event: event-123_test\n');
    });

    it('should serialize empty event name', () => {
      const event = { name: '', data: 'test' };

      const result = serializer.serialize(event);

      expect(result).toBe('event: \ndata: "test"\n\n');
    });
  });

  describe('Edge case - special characters in data', () => {
    it('should escape quotes in string data', () => {
      const event = { name: 'text', data: 'He said "hello"' };

      const result = serializer.serialize(event);

      expect(result).toContain('He said \\"hello\\"');
    });

    it('should handle newlines in string data', () => {
      const event = { name: 'text', data: 'Line 1\nLine 2' };

      const result = serializer.serialize(event);

      expect(result).toContain('\\n');
    });

    it('should handle unicode characters', () => {
      const event = { name: 'text', data: 'Hello 世界 🌍' };

      const result = serializer.serialize(event);

      expect(result).toContain('世界');
      expect(result).toContain('🌍');
    });

    it('should handle backslashes', () => {
      const event = { name: 'path', data: 'C:\\Users\\test' };

      const result = serializer.serialize(event);

      expect(result).toContain('\\\\');
    });
  });

  describe('Edge case - undefined data', () => {
    it('should serialize undefined as null (JSON behavior)', () => {
      const event = { name: 'test', data: undefined };

      const result = serializer.serialize(event);

      expect(result).toContain('data: ');
    });
  });

  describe('SSE format compliance', () => {
    it('should always end with double newline', () => {
      const event = { name: 'test', data: 'any' };

      const result = serializer.serialize(event);

      expect(result).toMatch(/\n\n$/);
    });

    it('should have event and data lines', () => {
      const event = { name: 'test', data: 123 };

      const result = serializer.serialize(event);

      const lines = result.split('\n');
      expect(lines[0]).toMatch(/^event: /);
      expect(lines[1]).toMatch(/^data: /);
      expect(lines[2]).toBe('');
    });

    it('should produce valid SSE format for multiple events', () => {
      const events = [
        { name: 'start', data: { status: 'started' } },
        { name: 'progress', data: { percent: 50 } },
        { name: 'done', data: { status: 'complete' } },
      ];

      const results = events.map((e) => serializer.serialize(e));

      results.forEach((result) => {
        expect(result).toMatch(/^event: \w+\ndata: .+\n\n$/);
      });
    });
  });

  describe('Integration - real-world streaming scenarios', () => {
    it('should serialize streaming chat chunks', () => {
      const chunks = [
        { name: 'chat.chunk', data: { delta: 'Hello', index: 0 } },
        { name: 'chat.chunk', data: { delta: ' ', index: 1 } },
        { name: 'chat.chunk', data: { delta: 'world', index: 2 } },
        {
          name: 'chat.done',
          data: {
            finishReason: 'stop',
            usage: { inputTokens: 5, outputTokens: 3 },
          },
        },
      ];

      const results = chunks.map((chunk) => serializer.serialize(chunk));

      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result).toMatch(/\n\n$/);
      });
    });

    it('should serialize tool calling events', () => {
      const events = [
        {
          name: 'tool.call',
          data: { id: 'call_123', name: 'get_weather', arguments: '{}' },
        },
        {
          name: 'tool.result',
          data: { id: 'call_123', result: '{"temp":72}' },
        },
      ];

      const results = events.map((e) => serializer.serialize(e));

      expect(results[0]).toContain('tool.call');
      expect(results[1]).toContain('tool.result');
    });

    it('should serialize large payload', () => {
      const largeData = {
        messages: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          text: `Message ${i}`,
        })),
      };
      const event = { name: 'bulk', data: largeData };

      const result = serializer.serialize(event);

      expect(result).toContain('event: bulk\n');
      expect(result).toContain('data: ');
      expect(result).toMatch(/\n\n$/);
      expect(result.length).toBeGreaterThan(1000);
    });
  });
});
