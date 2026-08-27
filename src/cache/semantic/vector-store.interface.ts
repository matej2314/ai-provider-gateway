import type { CachedChatResponse } from '../types/cached-chat-response.type';
import type {
  ClientId,
  ModelAlias,
  SemanticCacheTtlSeconds,
} from '../../common/types/branded.types';

export type VectorSearchHit = {
  similarity: number;
  reply: CachedChatResponse;
};

export type VectorStoreProbeResult = {
  available: boolean;
  message: string;
};

export interface VectorStoreKnnInput {
  vector: number[];
  modelAlias: ModelAlias;
  clientId: ClientId;
  systemSignature: string;
  callParams: string;
  k: number;
}

export interface VectorStoreUpsertInput {
  vector: number[];
  text: string;
  modelAlias: ModelAlias;
  clientId: ClientId;
  systemSignature: string;
  callParams: string;
  reply: CachedChatResponse;
  ttlSeconds: SemanticCacheTtlSeconds;
}

export interface VectorStore {
  /** Idempotent: create index if missing; fail-open when Redis is down. */
  ensureIndex(): Promise<void>;
  /** Readiness probe for Redis Search + configured index (fail-open). */
  probeIndex(): Promise<VectorStoreProbeResult>;
  knn(input: VectorStoreKnnInput): Promise<VectorSearchHit[]>;
  upsert(input: VectorStoreUpsertInput): Promise<void>;
}
