import { mapGatewayFinishReasonToAnthropicStopReason } from './anthropic-stop-reason.mapper';
describe('mapGatewayFinishReasonToAnthropicStopReason', () => {
  it.each([
    ['tool_calls', 'tool_use'],
    ['length', 'max_tokens'],
    ['stop', 'end_turn'],
    ['content_filter', 'refusal'],
  ] as const)(
    'should map gateway finishReason %s → Anthropic %s',
    (finishReason, expected) => {
      expect(mapGatewayFinishReasonToAnthropicStopReason(finishReason)).toBe(
        expected,
      );
    },
  );
  it('should default undefined to end_turn', () => {
    expect(mapGatewayFinishReasonToAnthropicStopReason(undefined)).toBe(
      'end_turn',
    );
  });
  it.each([
    'end_turn',
    'tool_use',
    'max_tokens',
    'stop_sequence',
    'pause_turn',
    'refusal',
  ] as const)('should map vendor value %s → end_turn (default branch)', (v) => {
    expect(mapGatewayFinishReasonToAnthropicStopReason(v)).toBe('end_turn');
  });
});
