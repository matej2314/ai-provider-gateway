export const ANTHROPIC_STREAM_API_DESCRIPTION = [
  'When `stream: true`, returns Anthropic SSE events.',
  'Format: `event: <name>\\ndata: <json>\\n\\n` (message_start, content_block_*, message_delta, message_stop).',
  'Response header `anthropic-version: 2023-06-01` is set on stream.',
  'Final `message_delta.usage` includes `input_tokens`, `output_tokens`, and cache token fields when available (parity with non-stream JSON).',
  'Extended thinking: emitted as `content_block` with `type: thinking` in the final `done` phase (not real-time; same as gateway native SSE).',
].join('\n\n');
