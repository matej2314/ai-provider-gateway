import {
  brand,
  unbrand,
  asRequestId,
  asConversationId,
  asTimeoutMs,
  asMaxAttempts,
  asBaseUrl,
  asPort,
  asCacheTtlSeconds,
  asCacheKey,
  asSystemFingerprint,
  asRateLimitRps,
  asRateLimitBurst,
  asMaxConcurrentStreams,
  asAttemptNumber,
  asSchemaVersion,
  asGatewayKey,
  asProviderApiKey,
  asEnvRef,
  asResponseId,
  asMessageId,
  asToolCallId,
  asClientId,
  asProviderInstanceId,
  asJsonSchemaName,
  asModelAlias,
  asModelId,
  asInputTokens,
  asOutputTokens,
  asThinkingBudgetTokens,
  asCostUsd,
  asPromptCacheHitTokens,
  asPromptCacheCreationTokens,
  asWarningCode,
  type RequestId,
} from './branded.types';
import {
  createConversationId,
  isConversationId,
  createRequestId,
  isRequestId,
  isTimeoutMs,
  isMaxAttempts,
  isBaseUrl,
  isPort,
  isCacheTtlSeconds,
  isRateLimitRps,
  isRateLimitBurst,
  isMaxConcurrentStreams,
  isAttemptNumber,
  isSchemaVersion,
} from './branded.guards';

const VALID_CONV = 'conv_123e4567-e89b-12d3-a456-426614174000';
const VALID_REQ = 'req_123e4567-e89b-12d3-a456-426614174000';

describe('brand / unbrand', () => {
  it('brand is runtime no-op', () => {
    const raw = VALID_REQ;
    const id: RequestId = brand(raw as RequestId);
    expect(id).toBe(raw);
  });

  it('unbrand extracts primitive from RequestId', () => {
    const id = asRequestId(VALID_REQ);
    expect(unbrand(id)).toBe(VALID_REQ);
  });

  it('unbrand extracts primitive from ConversationId', () => {
    const id = asConversationId(VALID_CONV);
    expect(unbrand(id)).toBe(VALID_CONV);
  });
});

describe('asRequestId / asConversationId', () => {
  it('casts without runtime validation', () => {
    expect(asRequestId('req_custom_client_id')).toBe('req_custom_client_id');
    expect(asConversationId(VALID_CONV)).toBe(VALID_CONV);
  });
});

describe('createConversationId', () => {
  it('accepts valid conv_<uuid>', () => {
    expect(createConversationId(VALID_CONV)).toBe(VALID_CONV);
  });

  it('throws on invalid format', () => {
    expect(() => createConversationId('conv_abc')).toThrow(
      /Invalid ConversationId format/,
    );
    expect(() => createConversationId('req_' + VALID_CONV.slice(5))).toThrow();
  });
});

describe('isConversationId', () => {
  it('returns true for valid id', () => {
    expect(isConversationId(VALID_CONV)).toBe(true);
  });

  it('returns false for invalid id', () => {
    expect(isConversationId('conv_bad')).toBe(false);
    expect(isConversationId('')).toBe(false);
  });
});

describe('createRequestId', () => {
  it('accepts valid req_<uuid>', () => {
    expect(createRequestId(VALID_REQ)).toBe(VALID_REQ);
  });

  it('throws on invalid format', () => {
    expect(() => createRequestId('req_1')).toThrow(/Invalid RequestId format/);
  });
});

describe('isRequestId', () => {
  it('returns true for valid id', () => {
    expect(isRequestId(VALID_REQ)).toBe(true);
  });

  it('returns false for invalid id', () => {
    expect(isRequestId('req-123')).toBe(false);
  });
});

// ========================================
// CONFIGURATION & POLICY (Faza 4)
// ========================================

describe('asTimeoutMs', () => {
  it('accepts values >= 1', () => {
    expect(asTimeoutMs(1)).toBe(1);
    expect(asTimeoutMs(1500)).toBe(1500);
    expect(asTimeoutMs(1.5)).toBe(1.5);
  });

  it('throws when value < 1', () => {
    expect(() => asTimeoutMs(0)).toThrow(/TimeoutMs must be >= 1/);
    expect(() => asTimeoutMs(0.9)).toThrow(/TimeoutMs must be >= 1/);
  });
});

describe('asMaxAttempts', () => {
  it('accepts integers 1-5 and floors fractional values within range', () => {
    expect(asMaxAttempts(1)).toBe(1);
    expect(asMaxAttempts(5)).toBe(5);
    expect(asMaxAttempts(4.9)).toBe(4);
  });

  it('throws outside 1-5 range', () => {
    expect(() => asMaxAttempts(0)).toThrow(
      /MaxAttempts must be between 1 and 5/,
    );
    expect(() => asMaxAttempts(5.9)).toThrow(
      /MaxAttempts must be between 1 and 5/,
    );
    expect(() => asMaxAttempts(6)).toThrow(
      /MaxAttempts must be between 1 and 5/,
    );
  });
});

describe('asBaseUrl', () => {
  it('accepts http and https URLs', () => {
    expect(asBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(asBaseUrl('https://api.example.com/v1')).toBe(
      'https://api.example.com/v1',
    );
  });

  it('throws for non-http(s) values', () => {
    expect(() => asBaseUrl('ftp://files.example.com')).toThrow(
      /BaseUrl must start with http/,
    );
    expect(() => asBaseUrl('localhost')).toThrow(
      /BaseUrl must start with http/,
    );
  });
});

describe('asPort', () => {
  it('accepts valid ports and floors fractional values', () => {
    expect(asPort(1)).toBe(1);
    expect(asPort(65535)).toBe(65535);
    expect(asPort(8080.9)).toBe(8080);
  });

  it('throws outside 1-65535 range', () => {
    expect(() => asPort(0)).toThrow(/Port must be 1-65535/);
    expect(() => asPort(65536)).toThrow(/Port must be 1-65535/);
  });
});

describe('asCacheTtlSeconds', () => {
  it('accepts zero and positive values', () => {
    expect(asCacheTtlSeconds(0)).toBe(0);
    expect(asCacheTtlSeconds(3600)).toBe(3600);
  });

  it('throws for negative values', () => {
    expect(() => asCacheTtlSeconds(-1)).toThrow(/CacheTtlSeconds must be >=0/);
  });
});

describe('asRateLimitRps', () => {
  it('accepts values >= 1 and floors', () => {
    expect(asRateLimitRps(1)).toBe(1);
    expect(asRateLimitRps(10.7)).toBe(10);
  });

  it('throws when value < 1', () => {
    expect(() => asRateLimitRps(0)).toThrow(/RateLimitRps must be >=1/);
  });
});

describe('asRateLimitBurst', () => {
  it('accepts values >= 1 and floors', () => {
    expect(asRateLimitBurst(5)).toBe(5);
    expect(asRateLimitBurst(5.9)).toBe(5);
  });

  it('throws when value < 1', () => {
    expect(() => asRateLimitBurst(0.9)).toThrow(/RateLimitBurst must be >=1/);
  });
});

describe('asMaxConcurrentStreams', () => {
  it('accepts values >= 1 and floors', () => {
    expect(asMaxConcurrentStreams(2)).toBe(2);
    expect(asMaxConcurrentStreams(2.1)).toBe(2);
  });

  it('throws when value < 1', () => {
    expect(() => asMaxConcurrentStreams(0)).toThrow(
      /MaxConcurrentStreams must be >=1/,
    );
  });
});

describe('asAttemptNumber', () => {
  it('accepts values >= 1 and floors', () => {
    expect(asAttemptNumber(1)).toBe(1);
    expect(asAttemptNumber(3.9)).toBe(3);
  });

  it('throws when value < 1', () => {
    expect(() => asAttemptNumber(0)).toThrow(/AttemptNumber must be >=1/);
  });
});

describe('asSchemaVersion', () => {
  it('accepts values >= 1 and floors', () => {
    expect(asSchemaVersion(1)).toBe(1);
    expect(asSchemaVersion(2.9)).toBe(2);
  });

  it('throws when value < 1', () => {
    expect(() => asSchemaVersion(0)).toThrow(/SchemaVersion must be >= 1/);
  });
});

describe('pass-through configuration helpers', () => {
  it('asCacheKey casts without validation', () => {
    expect(asCacheKey('cache:chat:abc')).toBe('cache:chat:abc');
    expect(asCacheKey('')).toBe('');
  });

  it('asSystemFingerprint casts without validation', () => {
    expect(asSystemFingerprint('fp_abc123')).toBe('fp_abc123');
    expect(asSystemFingerprint('')).toBe('');
  });
});

describe('configuration type guards (Faza 4)', () => {
  it('isTimeoutMs mirrors asTimeoutMs acceptance', () => {
    expect(isTimeoutMs(1)).toBe(true);
    expect(isTimeoutMs(1000)).toBe(true);
    expect(isTimeoutMs(0)).toBe(false);
    expect(isTimeoutMs(NaN)).toBe(false);
    expect(isTimeoutMs(Infinity)).toBe(false);
  });

  it('isMaxAttempts mirrors asMaxAttempts acceptance', () => {
    expect(isMaxAttempts(1)).toBe(true);
    expect(isMaxAttempts(5)).toBe(true);
    expect(isMaxAttempts(4.5)).toBe(true);
    expect(isMaxAttempts(0)).toBe(false);
    expect(isMaxAttempts(5.5)).toBe(false);
    expect(isMaxAttempts(6)).toBe(false);
  });

  it('isBaseUrl mirrors asBaseUrl acceptance', () => {
    expect(isBaseUrl('https://example.com')).toBe(true);
    expect(isBaseUrl('http://localhost')).toBe(true);
    expect(isBaseUrl('ftp://example.com')).toBe(false);
    expect(isBaseUrl('')).toBe(false);
  });

  it('isPort mirrors asPort acceptance', () => {
    expect(isPort(1)).toBe(true);
    expect(isPort(65535)).toBe(true);
    expect(isPort(8080.5)).toBe(true);
    expect(isPort(0)).toBe(false);
    expect(isPort(65536)).toBe(false);
  });

  it('isCacheTtlSeconds mirrors asCacheTtlSeconds acceptance', () => {
    expect(isCacheTtlSeconds(0)).toBe(true);
    expect(isCacheTtlSeconds(60)).toBe(true);
    expect(isCacheTtlSeconds(-1)).toBe(false);
  });

  it('isRateLimitRps / isRateLimitBurst / isMaxConcurrentStreams', () => {
    expect(isRateLimitRps(10)).toBe(true);
    expect(isRateLimitRps(0.5)).toBe(false);
    expect(isRateLimitBurst(5)).toBe(true);
    expect(isMaxConcurrentStreams(3)).toBe(true);
    expect(isMaxConcurrentStreams(0)).toBe(false);
  });

  it('isAttemptNumber and isSchemaVersion', () => {
    expect(isAttemptNumber(2)).toBe(true);
    expect(isAttemptNumber(0)).toBe(false);
    expect(isSchemaVersion(1)).toBe(true);
    expect(isSchemaVersion(0)).toBe(false);
  });
});

// ========================================
// SECURITY-CRITICAL (Faza 1)
// ========================================

describe('security-critical pass-through helpers', () => {
  it('asGatewayKey casts without validation', () => {
    const key = asGatewayKey('gw_test_key_123');
    expect(key).toBe('gw_test_key_123');
    expect(unbrand(key)).toBe('gw_test_key_123');
  });

  it('asProviderApiKey casts without validation', () => {
    const key = asProviderApiKey('sk-ant-test');
    expect(key).toBe('sk-ant-test');
  });

  it('asEnvRef casts without validation', () => {
    expect(asEnvRef('ANTHROPIC_API_KEY')).toBe('ANTHROPIC_API_KEY');
  });
});

// ========================================
// IDENTIFIERS & TRACKING (Faza 2)
// ========================================

describe('identifier pass-through helpers', () => {
  it('asResponseId / asMessageId cast without validation', () => {
    expect(asResponseId('gw_abc')).toBe('gw_abc');
    expect(asMessageId('msg_abc')).toBe('msg_abc');
  });

  it('asToolCallId / asClientId / asProviderInstanceId cast without validation', () => {
    expect(asToolCallId('call_1')).toBe('call_1');
    expect(asClientId('ide-client')).toBe('ide-client');
    expect(asProviderInstanceId('anthropic-primary')).toBe('anthropic-primary');
  });

  it('asJsonSchemaName / asModelAlias / asModelId cast without validation', () => {
    expect(asJsonSchemaName('weather_schema')).toBe('weather_schema');
    expect(asModelAlias('claude-sonnet')).toBe('claude-sonnet');
    expect(asModelId('claude-sonnet-4-5-20250929')).toBe(
      'claude-sonnet-4-5-20250929',
    );
  });
});

// ========================================
// METRICS & USAGE (Faza 3)
// ========================================

describe('metrics pass-through helpers', () => {
  it('asInputTokens / asOutputTokens cast without validation', () => {
    expect(asInputTokens(10)).toBe(10);
    expect(asOutputTokens(20)).toBe(20);
  });

  it('asThinkingBudgetTokens / asCostUsd cast without validation', () => {
    expect(asThinkingBudgetTokens(2048)).toBe(2048);
    expect(asCostUsd(0.001)).toBe(0.001);
  });

  it('asPromptCacheHitTokens / asPromptCacheCreationTokens cast without validation', () => {
    expect(asPromptCacheHitTokens(100)).toBe(100);
    expect(asPromptCacheCreationTokens(50)).toBe(50);
  });
});

// ========================================
// ERROR & WARNING CODES (Faza 5)
// ========================================

describe('asWarningCode', () => {
  it('casts without validation', () => {
    expect(asWarningCode('PARAM_IGNORED_BY_PROVIDER')).toBe(
      'PARAM_IGNORED_BY_PROVIDER',
    );
    expect(asWarningCode('')).toBe('');
  });
});
