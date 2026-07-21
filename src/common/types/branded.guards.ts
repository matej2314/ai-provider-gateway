import {
  ConversationId,
  RequestId,
  TimeoutMs,
  RateLimitRps,
  MaxConcurrentStreams,
  MaxAttempts,
  AttemptNumber,
  BaseUrl,
  CacheTtlSeconds,
  Port,
  SchemaVersion,
  RateLimitBurst,
} from './branded.types';

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

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);
/**
 * Mirrors asTimeoutMs acceptance (min 1, no floor).
 */
export function isTimeoutMs(value: number): value is TimeoutMs {
  return isFiniteNumber(value) && value >= 1;
}
/**
 * Mirrors asRateLimitRps acceptance (min 1, floors on cast).
 */
export function isRateLimitRps(value: number): value is RateLimitRps {
  return isFiniteNumber(value) && value >= 1;
}
/**
 * Mirrors asRateLimitBurst acceptance (min 1, floors on cast).
 */
export function isRateLimitBurst(value: number): value is RateLimitBurst {
  return isFiniteNumber(value) && value >= 1;
}
/**
 * Mirrors asMaxConcurrentStreams acceptance (min 1, floors on cast).
 */
export function isMaxConcurrentStreams(
  value: number,
): value is MaxConcurrentStreams {
  return isFiniteNumber(value) && value >= 1;
}
/**
 * Mirrors asMaxAttempts acceptance (1-5, floors on cast).
 */
export function isMaxAttempts(value: number): value is MaxAttempts {
  return isFiniteNumber(value) && value >= 1 && value <= 5;
}
/**
 * Mirrors asAttemptNumber acceptance (min 1, floors on cast).
 */
export function isAttemptNumber(value: number): value is AttemptNumber {
  return isFiniteNumber(value) && value >= 1;
}
/**
 * Mirrors asBaseUrl acceptance (http/https prefix).
 */
export function isBaseUrl(value: string): value is BaseUrl {
  return value.startsWith('http://') || value.startsWith('https://');
}
/**
 * Mirrors asCacheTtlSeconds acceptance (min 0).
 */
export function isCacheTtlSeconds(value: number): value is CacheTtlSeconds {
  return isFiniteNumber(value) && value >= 0;
}
/**
 * Mirrors asPort acceptance (1-65535, floors on cast).
 */
export function isPort(value: number): value is Port {
  return isFiniteNumber(value) && value >= 1 && value <= 65535;
}
/**
 * Mirrors asSchemaVersion acceptance (min 1, floors on cast).
 */
export function isSchemaVersion(value: number): value is SchemaVersion {
  return isFiniteNumber(value) && value >= 1;
}
