/** Which lookup layer served a `POST /api/v1/chat` cache hit. Not stored in Redis. */
export type ChatCacheSource = 'exact' | 'semantic';

/** HTTP response header on JSON facades (OpenAI / Anthropic) for a cache hit. */
export const GATEWAY_CACHE_HEADER = 'X-Gateway-Cache';
