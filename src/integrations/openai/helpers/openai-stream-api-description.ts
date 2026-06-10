export const OPENAI_STREAM_API_DESCRIPTION = [
  'When `stream: true`, returns `text/event-stream` with OpenAI chunk format.',
  'Each line: `data: <json>\\n\\n`, terminated with `data: [DONE]\\n\\n`.',
  'JSON errors (OpenAiErrorResponseDto) only **before** flushHeaders.',
];
