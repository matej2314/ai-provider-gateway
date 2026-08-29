import type { ClientId, ModelAlias } from '../../common/types/branded.types';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';

/**
 * Message slice used for exact-key hashing and semantic last-user / single-turn
 * gates. Not an HTTP DTO — no Swagger / class-validator.
 */
export type CacheIdentityMessage = {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: readonly {
    id: string;
    name: string;
    arguments: string;
  }[];
};

/**
 * Application-facing cache identity. Built in `src/chat` from the request DTO.
 */
export type ChatCacheIdentity = {
  modelAlias: ModelAlias;
  clientId: ClientId;
  messages: readonly CacheIdentityMessage[];
  callParams?: ProviderCallOptions;
};
