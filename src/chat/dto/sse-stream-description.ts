export const CHAT_STREAM_API_DESCRIPTION = [
  'SSE (`text/event-stream`): event sequence `meta` → `delta`* → `done` (empty `{}`).',
  '`done` may include `toolCalls` and `finishReason` when tooling is used.',
  'Same body as POST /chat. JSON errors (ErrorEnvelope) only **before** flushHeaders.',
  'After stream starts, errors may be partial SSE.',
].join('\n\n');
