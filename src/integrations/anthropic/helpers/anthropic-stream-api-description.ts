export const ANTHROPIC_STREAM_API_DESCRIPTION = [
  'When `stream: true`, returns Anthropic SSE events.',
  'Format: `event: <name>\\ndata: <json>\\n\\n` (message_start, content_block_*, message_delta, message_stop).',
  'Response header `anthropic-version: 2023-06-01` is set on stream.',
].join('\n\n');
