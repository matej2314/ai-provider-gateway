import {
  asConversationId,
  asGatewayKey,
  asModelAlias,
  asModelId,
  asProviderInstanceId,
  asRequestId,
  asToolCallId,
  asInputTokens,
  asOutputTokens,
  asCostUsd,
  asPromptCacheHitTokens,
  asPromptCacheCreationTokens,
  asResponseId,
  asCacheKey,
  asCacheTtlSeconds,
  asTimeoutMs,
  asMaxAttempts,
  asMaxConcurrentStreams,
  asRateLimitBurst,
  asRateLimitRps,
} from '../types/branded.types';

export const VALID_CONVERSATION_ID =
  'conv_123e4567-e89b-12d3-a456-426614174000';

/** UUID v4 for jest `uuid` mocks — yields valid `conv_${MOCK_UUID}` */
export const MOCK_UUID = '123e4567-e89b-12d3-a456-426614174000';

export const TEST_CONVERSATION_ID = asConversationId(VALID_CONVERSATION_ID);

export const TEST_MODEL_ALIAS = 'test-model';
export const TEST_MODEL_ALIAS_BRANDED = asModelAlias(TEST_MODEL_ALIAS);

export const TEST_PROVIDER_INSTANCE = 'anthropic-primary';
export const TEST_PROVIDER_INSTANCE_BRANDED = asProviderInstanceId(
  TEST_PROVIDER_INSTANCE,
);

export const TEST_API_KEY_REF = 'ANTHROPIC_API_KEY_TEST';

export const TEST_MASTER_KEY_REF = 'MASTER_KEY_TEST';

export const TEST_GATEWAY_KEY = 'gw_key_123';
export const TEST_GATEWAY_KEY_BRANDED = asGatewayKey(TEST_GATEWAY_KEY);

export const TEST_REQUEST_ID = asRequestId('req-123');

export const TEST_MODEL_ID = asModelId('claude-sonnet-4-5');

export const TEST_TOOL_CALL_ID = asToolCallId('call_123');

export const TEST_RESPONSE_ID_PREFIX = `gw_${MOCK_UUID}`;

export const TEST_INPUT_TOKENS = asInputTokens(10);
export const TEST_OUTPUT_TOKENS = asOutputTokens(20);
export const TEST_INPUT_TOKENS_SMALL = asInputTokens(5);
export const TEST_OUTPUT_TOKENS_SMALL = asOutputTokens(5);
export const TEST_PROMPT_CACHE_HIT_TOKENS = asPromptCacheHitTokens(100);
export const TEST_PROMPT_CACHE_CREATION_TOKENS =
  asPromptCacheCreationTokens(50);
export const TEST_COST_USD = asCostUsd(0.001);

export const TEST_CACHED_RESPONSE_ID = asResponseId('msg-123');
export const TEST_CACHED_REQUEST_ID = asRequestId('req-123');
export const TEST_CACHED_CONVERSATION_ID = asConversationId('conv-123');

export const TEST_CACHE_KEY = asCacheKey('test-key');
export const TEST_CACHE_TTL_SECONDS = asCacheTtlSeconds(3600);
export const TEST_CACHE_TTL_CUSTOM = asCacheTtlSeconds(7200);
export const TEST_INTEGRATION_CACHE_KEY_PREFIX = 'it-cache:';

export const TEST_TIMEOUT_MS = asTimeoutMs(30000);
export const TEST_MAX_ATTEMPTS = asMaxAttempts(3);
export const TEST_MAX_ATTEMPTS_SINGLE = asMaxAttempts(1);
export const TEST_RETRY_ON_STATUS = [429, 500, 502, 503, 504] as const;
export const TEST_RATE_LIMIT_RPS = asRateLimitRps(10);
export const TEST_RATE_LIMIT_BURST = asRateLimitBurst(20);
export const TEST_MAX_CONCURRENT_STREAMS = asMaxConcurrentStreams(3);
export const TEST_TOOL_CALL_ID_CACHED = asToolCallId('tc-1');
export const TEST_FALLBACK_MODEL_ALIAS = asModelAlias('fallback-alias');
