import type { CachedChatResponse } from '../types/cached-chat-response.type';
import type { ClientId, ModelAlias } from '../../common/types/branded.types';

export type VectorSearchHit = {
  similarity: number;
  reply: CachedChatResponse;
};

export interface VectorStoreKnnInput {
  vector: number[];
  modelAlias: ModelAlias;
  clientId: ClientId;
  k: number;
}

export interface VectorStoreUpsertInput {
  vector: number[];
  text: string;
  modelAlias: ModelAlias;
  clientId: ClientId;
  reply: CachedChatResponse;
  ttlSeconds: number;
}

export interface VectorStore {
  knn(input: VectorStoreKnnInput): Promise<VectorSearchHit[]>;
  upsert(input: VectorStoreUpsertInput): Promise<void>;
}
