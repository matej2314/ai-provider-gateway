import { ConversationId, RequestId } from './branded.types';

// Validation patterns
export const CONVERSATION_ID_PATTERN =
  /^conv_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const REQUEST_ID_PATTERN =
  /^req_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates and creates ConversationId
 * @throws Error if format invalid
 */
export function createConversationId(value: string): ConversationId {
  if (!CONVERSATION_ID_PATTERN.test(value)) {
    throw new Error(`Invalid ConversationId format: ${value}`);
  }
  return value as ConversationId;
}

/**
 * Type guard for ConversationId
 */
export function isConversationId(value: string): value is ConversationId {
  return CONVERSATION_ID_PATTERN.test(value);
}

/**
 * Validates and creates RequestId
 * @throws Error if format invalid
 */
export function createRequestId(value: string): RequestId {
  if (!REQUEST_ID_PATTERN.test(value)) {
    throw new Error(`Invalid RequestId format: ${value}`);
  }
  return value as RequestId;
}

/**
 * Type guard for RequestId
 */
export function isRequestId(value: string): value is RequestId {
  return REQUEST_ID_PATTERN.test(value);
}
