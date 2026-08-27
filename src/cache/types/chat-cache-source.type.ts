/** Which lookup layer served a `POST /api/v1/chat` cache hit. Not stored in Redis. */
export type ChatCacheSource = 'exact' | 'semantic';
