import { mapStopReasonToFinishReason } from './map-provider-finish-reason';

describe('mapStopReasonToFinishReason', () => {
  describe('Happy path - max_tokens', () => {
    it('should map max_tokens to length', () => {
      const result = mapStopReasonToFinishReason('max_tokens');

      expect(result).toBe('length');
    });

    it('should map max_tokens to length even with empty toolCalls', () => {
      const result = mapStopReasonToFinishReason('max_tokens', []);

      expect(result).toBe('length');
    });
  });

  describe('Happy path - tool_use / toolCalls', () => {
    it('should map tool_use to tool_calls', () => {
      const result = mapStopReasonToFinishReason('tool_use');

      expect(result).toBe('tool_calls');
    });

    it('should map to tool_calls when toolCalls present', () => {
      const toolCalls = [
        { id: 'call_1', name: 'get_weather', arguments: '{}' },
      ];

      const result = mapStopReasonToFinishReason('end_turn', toolCalls);

      expect(result).toBe('tool_calls');
    });

    it('should prioritize toolCalls over stopReason', () => {
      const toolCalls = [{ id: 'call_1', name: 'test', arguments: '{}' }];

      const result = mapStopReasonToFinishReason('stop_sequence', toolCalls);

      expect(result).toBe('tool_calls');
    });

    it('should map to tool_calls when multiple toolCalls', () => {
      const toolCalls = [
        { id: 'call_1', name: 'weather', arguments: '{}' },
        { id: 'call_2', name: 'time', arguments: '{}' },
      ];

      const result = mapStopReasonToFinishReason(undefined, toolCalls);

      expect(result).toBe('tool_calls');
    });
  });

  describe('Happy path - stop reasons', () => {
    it('should map end_turn to stop', () => {
      const result = mapStopReasonToFinishReason('end_turn');

      expect(result).toBe('stop');
    });

    it('should map stop_sequence to stop', () => {
      const result = mapStopReasonToFinishReason('stop_sequence');

      expect(result).toBe('stop');
    });

    it('should map undefined to stop', () => {
      const result = mapStopReasonToFinishReason(undefined);

      expect(result).toBe('stop');
    });

    it('should map unknown reason to stop (default)', () => {
      const result = mapStopReasonToFinishReason('unknown_reason' as any);

      expect(result).toBe('stop');
    });
  });

  describe('Edge case - precedence', () => {
    it('should prioritize max_tokens over toolCalls', () => {
      const toolCalls = [{ id: 'call_1', name: 'test', arguments: '{}' }];

      const result = mapStopReasonToFinishReason('max_tokens', toolCalls);

      expect(result).toBe('length');
    });

    it('should check toolCalls before stopReason mapping', () => {
      const toolCalls = [{ id: 'call_1', name: 'test', arguments: '{}' }];

      const result = mapStopReasonToFinishReason('end_turn', toolCalls);

      expect(result).toBe('tool_calls');
    });
  });

  describe('Edge case - empty/undefined', () => {
    it('should handle undefined stopReason and no toolCalls', () => {
      const result = mapStopReasonToFinishReason(undefined, undefined);

      expect(result).toBe('stop');
    });

    it('should handle undefined stopReason with empty toolCalls', () => {
      const result = mapStopReasonToFinishReason(undefined, []);

      expect(result).toBe('stop');
    });

    it('should handle null stopReason', () => {
      const result = mapStopReasonToFinishReason(null as any);

      expect(result).toBe('stop');
    });
  });

  describe('Integration - real provider responses', () => {
    it('should handle Anthropic end_turn', () => {
      const result = mapStopReasonToFinishReason('end_turn');

      expect(result).toBe('stop');
    });

    it('should handle Anthropic tool_use', () => {
      const result = mapStopReasonToFinishReason('tool_use');

      expect(result).toBe('tool_calls');
    });

    it('should handle Anthropic stop_sequence', () => {
      const result = mapStopReasonToFinishReason('stop_sequence');

      expect(result).toBe('stop');
    });

    it('should handle Anthropic max_tokens', () => {
      const result = mapStopReasonToFinishReason('max_tokens');

      expect(result).toBe('length');
    });

    it('should handle tool call with content', () => {
      const toolCalls = [
        {
          id: 'toolu_123',
          name: 'get_weather',
          arguments: '{"location":"SF"}',
        },
      ];

      const result = mapStopReasonToFinishReason('tool_use', toolCalls);

      expect(result).toBe('tool_calls');
    });
  });
});
