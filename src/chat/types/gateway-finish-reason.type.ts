/**
 * Gateway-normalized finish reasons emitted in native API responses.
 * Mapper: `mapStopReasonToFinishReason` in `chat/helpers/map-provider-finish-reason.ts`.
 *
 * Zgodność (runtime adapter → gateway):
 * - OpenAI / DeepSeek / Ollama (OpenAI-compat): pass-through finish_reason
 *   (stop, length, tool_calls, content_filter) przez mapStopReasonToFinishReason
 * - Anthropic: end_turn/stop_sequence/pause_turn → stop, tool_use → tool_calls,
 *              max_tokens → length, refusal → content_filter
 * - Google Gemini: jak Anthropic (tool_use / end_turn w adapterze)
 * - DeepSeek-only: insufficient_system_resource → stop (gateway)
 *
 * @see dokumentacja_api.md L83
 * @see SseDonePayloadDto.finishReason (SSE contract)
 * @see OpenAiChatCompletionResponseDto (OpenAI facade)
 */
export type GatewayFinishReason =
  | 'stop'
  | 'tool_calls'
  | 'length'
  | 'content_filter';
