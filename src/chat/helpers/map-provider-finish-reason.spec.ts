import { mapStopReasonToFinishReason } from './map-provider-finish-reason';
import { asToolCallId } from '../../common/types/branded.types';

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
        { id: asToolCallId('call_1'), name: 'get_weather', arguments: '{}' },
      ];

      const result = mapStopReasonToFinishReason('end_turn', toolCalls);

      expect(result).toBe('tool_calls');
    });

    it('should prioritize toolCalls over stopReason', () => {
      const toolCalls = [
        { id: asToolCallId('call_1'), name: 'test', arguments: '{}' },
      ];

      const result = mapStopReasonToFinishReason('stop_sequence', toolCalls);

      expect(result).toBe('tool_calls');
    });

    it('should map to tool_calls when multiple toolCalls', () => {
      const toolCalls = [
        { id: asToolCallId('call_1'), name: 'weather', arguments: '{}' },
        { id: asToolCallId('call_2'), name: 'time', arguments: '{}' },
      ];

      const result = mapStopReasonToFinishReason(undefined, toolCalls);

      expect(result).toBe('tool_calls');
    });
  });

  describe('Happy path - content filtering', () => {
    it('should map refusal (Anthropic) to content_filter', () => {
      const result = mapStopReasonToFinishReason('refusal');

      expect(result).toBe('content_filter');
    });

    it('should map content_filter (OpenAI) to content_filter', () => {
      const result = mapStopReasonToFinishReason('content_filter');

      expect(result).toBe('content_filter');
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

  describe('Happy path - OpenAI-shaped pass-through (future adapters)', () => {
    it('should map stop (OpenAI native) to stop', () => {
      expect(mapStopReasonToFinishReason('stop')).toBe('stop');
    });

    it('should map length (OpenAI native) to length', () => {
      expect(mapStopReasonToFinishReason('length')).toBe('length');
    });

    it('should map tool_calls (OpenAI native) to tool_calls without toolCalls array', () => {
      expect(mapStopReasonToFinishReason('tool_calls')).toBe('tool_calls');
    });

    it('should map insufficient_system_resource (DeepSeek) to stop', () => {
      expect(mapStopReasonToFinishReason('insufficient_system_resource')).toBe(
        'stop',
      );
    });
  });

  describe('Regression - Anthropic/Google paths unchanged after 4.8', () => {
    it('should still map end_turn to stop', () => {
      expect(mapStopReasonToFinishReason('end_turn')).toBe('stop');
    });

    it('should still prioritize max_tokens over toolCalls', () => {
      const toolCalls = [
        { id: asToolCallId('call_1'), name: 'test', arguments: '{}' },
      ];
      expect(mapStopReasonToFinishReason('max_tokens', toolCalls)).toBe(
        'length',
      );
    });
  });

  describe('Edge case - provider-specific stopReasons', () => {
    it('should map pause_turn (Anthropic extended thinking) to stop', () => {
      const result = mapStopReasonToFinishReason('pause_turn');

      expect(result).toBe('stop');
    });

    it('should prioritize toolCalls over content_filter', () => {
      const toolCalls = [
        { id: asToolCallId('call_1'), name: 'test', arguments: '{}' },
      ];

      const result = mapStopReasonToFinishReason('refusal', toolCalls);

      expect(result).toBe('tool_calls');
    });

    it('should prioritize max_tokens over content_filter', () => {
      const result = mapStopReasonToFinishReason('max_tokens');

      expect(result).toBe('length');
    });
  });

  describe('Edge case - precedence', () => {
    it('should prioritize max_tokens over toolCalls', () => {
      const toolCalls = [
        { id: asToolCallId('call_1'), name: 'test', arguments: '{}' },
      ];

      const result = mapStopReasonToFinishReason('max_tokens', toolCalls);

      expect(result).toBe('length');
    });

    it('should check toolCalls before stopReason mapping', () => {
      const toolCalls = [
        { id: asToolCallId('call_1'), name: 'test', arguments: '{}' },
      ];

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
          id: asToolCallId('toolu_123'),
          name: 'get_weather',
          arguments: '{"location":"SF"}',
        },
      ];

      const result = mapStopReasonToFinishReason('tool_use', toolCalls);

      expect(result).toBe('tool_calls');
    });
  });
});
