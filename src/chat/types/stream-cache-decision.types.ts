import type { CachedChatResponse } from '../../cache/types/cached-chat-response.type';
import type { ChatCacheSource } from '../../cache/types/chat-cache-source.type';
import type { SemanticStoreEmbedState } from '../../cache/semantic/semantic-cache.service';
import type { ChatExecutionPrep } from './chat-execution-prep.types';

export type StreamCacheHit = {
  outcome: 'hit';
  prep: ChatExecutionPrep;
  cached: CachedChatResponse;
  cacheSource: ChatCacheSource;
};

export type StreamCacheMiss = {
  outcome: 'miss';
  prep: ChatExecutionPrep;
  embedState?: SemanticStoreEmbedState;
};

export type StreamCacheDecision = StreamCacheHit | StreamCacheMiss;
