import {
  brand,
  unbrand,
  asTimeoutMs,
  asMaxAttempts,
  asBaseUrl,
  asPort,
  asCacheTtlSeconds,
  asSemanticCacheTtlSeconds,
  asRateLimitRps,
  asRateLimitBurst,
  asMaxConcurrentStreams,
  asAttemptNumber,
  asSchemaVersion,
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
  isSemanticCacheTtlSeconds,
  isRateLimitRps,
  isRateLimitBurst,
  isMaxConcurrentStreams,
  isAttemptNumber,
  isSchemaVersion,
} from './branded.guards';

const VALID_CONV = 'conv_123e4567-e89b-12d3-a456-426614174000';
const VALID_REQ = 'req_123e4567-e89b-12d3-a456-426614174000';

describe('Brand type utilities', () => {
  describe('brand / unbrand', () => {
    it('should preserve value through brand/unbrand cycle', () => {
      const raw = VALID_REQ;
      const branded: RequestId = brand(raw as RequestId);
      const unbranded = unbrand(branded);
      expect(unbranded).toBe(raw);
    });
  });

  describe('createConversationId', () => {
    it('should accept valid conv_<uuid> format', () => {
      expect(createConversationId(VALID_CONV)).toBe(VALID_CONV);
    });

    it('should reject invalid format', () => {
      expect(() => createConversationId('conv_abc')).toThrow(
        /Invalid ConversationId format/,
      );
    });

    it('should reject wrong prefix', () => {
      expect(() => createConversationId('req_' + VALID_CONV.slice(5))).toThrow(
        /Invalid ConversationId format/,
      );
    });

    it('should reject empty string', () => {
      expect(() => createConversationId('')).toThrow();
    });
  });

  describe('isConversationId', () => {
    it('should return true for valid format', () => {
      expect(isConversationId(VALID_CONV)).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(isConversationId('conv_bad')).toBe(false);
      expect(isConversationId('')).toBe(false);
      expect(isConversationId('not-a-conv-id')).toBe(false);
    });
  });

  describe('createRequestId', () => {
    it('should accept valid req_<uuid> format', () => {
      expect(createRequestId(VALID_REQ)).toBe(VALID_REQ);
    });

    it('should reject invalid format', () => {
      expect(() => createRequestId('req_1')).toThrow(
        /Invalid RequestId format/,
      );
    });

    it('should reject wrong prefix', () => {
      expect(() => createRequestId('conv_' + VALID_REQ.slice(4))).toThrow();
    });
  });

  describe('isRequestId', () => {
    it('should return true for valid format', () => {
      expect(isRequestId(VALID_REQ)).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(isRequestId('req-123')).toBe(false);
      expect(isRequestId('')).toBe(false);
    });
  });
});

describe('Configuration validators', () => {
  describe('asTimeoutMs', () => {
    it('should accept values >= 1', () => {
      expect(asTimeoutMs(1)).toBe(1);
      expect(asTimeoutMs(1500)).toBe(1500);
      expect(asTimeoutMs(1.5)).toBe(1.5);
    });

    it('should throw when value < 1', () => {
      expect(() => asTimeoutMs(0)).toThrow(/TimeoutMs must be >= 1/);
      expect(() => asTimeoutMs(0.5)).toThrow(/TimeoutMs must be >= 1/);
      expect(() => asTimeoutMs(-1)).toThrow(/TimeoutMs must be >= 1/);
    });
  });

  describe('asMaxAttempts', () => {
    it('should accept integers 1-5 and floor fractional values', () => {
      expect(asMaxAttempts(1)).toBe(1);
      expect(asMaxAttempts(5)).toBe(5);
      expect(asMaxAttempts(3)).toBe(3);
      expect(asMaxAttempts(4.9)).toBe(4);
    });

    it('should throw outside 1-5 range', () => {
      expect(() => asMaxAttempts(0)).toThrow(
        /MaxAttempts must be between 1 and 5/,
      );
      expect(() => asMaxAttempts(6)).toThrow(
        /MaxAttempts must be between 1 and 5/,
      );
      expect(() => asMaxAttempts(-1)).toThrow(
        /MaxAttempts must be between 1 and 5/,
      );
    });
  });

  describe('asBaseUrl', () => {
    it('should accept http and https URLs', () => {
      expect(asBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
      expect(asBaseUrl('https://api.example.com/v1')).toBe(
        'https://api.example.com/v1',
      );
    });

    it('should throw for non-http(s) URLs', () => {
      expect(() => asBaseUrl('ftp://files.example.com')).toThrow(
        /BaseUrl must start with http/,
      );
      expect(() => asBaseUrl('localhost')).toThrow(
        /BaseUrl must start with http/,
      );
      expect(() => asBaseUrl('')).toThrow(/BaseUrl must start with http/);
    });
  });

  describe('asPort', () => {
    it('should accept valid ports and floor fractional values', () => {
      expect(asPort(1)).toBe(1);
      expect(asPort(8080)).toBe(8080);
      expect(asPort(65535)).toBe(65535);
      expect(asPort(8080.9)).toBe(8080);
    });

    it('should throw outside 1-65535 range', () => {
      expect(() => asPort(0)).toThrow(/Port must be 1-65535/);
      expect(() => asPort(65536)).toThrow(/Port must be 1-65535/);
      expect(() => asPort(-1)).toThrow(/Port must be 1-65535/);
    });
  });

  describe('asCacheTtlSeconds', () => {
    it('should accept zero and positive values', () => {
      expect(asCacheTtlSeconds(0)).toBe(0);
      expect(asCacheTtlSeconds(3600)).toBe(3600);
      expect(asCacheTtlSeconds(1.5)).toBe(1.5);
    });

    it('should throw for negative values', () => {
      expect(() => asCacheTtlSeconds(-1)).toThrow(
        /CacheTtlSeconds must be >=0/,
      );
      expect(() => asCacheTtlSeconds(-0.1)).toThrow(
        /CacheTtlSeconds must be >=0/,
      );
    });
  });

  describe('asSemanticCacheTtlSeconds', () => {
    it('should accept values >= 1 and floor fractional values', () => {
      expect(asSemanticCacheTtlSeconds(1)).toBe(1);
      expect(asSemanticCacheTtlSeconds(3600)).toBe(3600);
      expect(asSemanticCacheTtlSeconds(1.9)).toBe(1);
    });

    it('should throw when value < 1', () => {
      expect(() => asSemanticCacheTtlSeconds(0)).toThrow(
        /SemanticCacheTtlSeconds must be >= 1/,
      );
      expect(() => asSemanticCacheTtlSeconds(0.5)).toThrow(
        /SemanticCacheTtlSeconds must be >= 1/,
      );
      expect(() => asSemanticCacheTtlSeconds(-1)).toThrow(
        /SemanticCacheTtlSeconds must be >= 1/,
      );
    });
  });

  describe('asRateLimitRps', () => {
    it('should accept values >= 1 and floor fractional values', () => {
      expect(asRateLimitRps(1)).toBe(1);
      expect(asRateLimitRps(10)).toBe(10);
      expect(asRateLimitRps(10.7)).toBe(10);
    });

    it('should throw when value < 1', () => {
      expect(() => asRateLimitRps(0)).toThrow(/RateLimitRps must be >=1/);
      expect(() => asRateLimitRps(0.5)).toThrow(/RateLimitRps must be >=1/);
    });
  });

  describe('asRateLimitBurst', () => {
    it('should accept values >= 1 and floor fractional values', () => {
      expect(asRateLimitBurst(5)).toBe(5);
      expect(asRateLimitBurst(5.9)).toBe(5);
    });

    it('should throw when value < 1', () => {
      expect(() => asRateLimitBurst(0.9)).toThrow(/RateLimitBurst must be >=1/);
      expect(() => asRateLimitBurst(0)).toThrow(/RateLimitBurst must be >=1/);
    });
  });

  describe('asMaxConcurrentStreams', () => {
    it('should accept values >= 1 and floor fractional values', () => {
      expect(asMaxConcurrentStreams(2)).toBe(2);
      expect(asMaxConcurrentStreams(10)).toBe(10);
      expect(asMaxConcurrentStreams(2.1)).toBe(2);
    });

    it('should throw when value < 1', () => {
      expect(() => asMaxConcurrentStreams(0)).toThrow(
        /MaxConcurrentStreams must be >=1/,
      );
      expect(() => asMaxConcurrentStreams(0.5)).toThrow(
        /MaxConcurrentStreams must be >=1/,
      );
    });
  });

  describe('asAttemptNumber', () => {
    it('should accept values >= 1 and floor fractional values', () => {
      expect(asAttemptNumber(1)).toBe(1);
      expect(asAttemptNumber(3)).toBe(3);
      expect(asAttemptNumber(3.9)).toBe(3);
    });

    it('should throw when value < 1', () => {
      expect(() => asAttemptNumber(0)).toThrow(/AttemptNumber must be >=1/);
    });
  });

  describe('asSchemaVersion', () => {
    it('should accept values >= 1 and floor fractional values', () => {
      expect(asSchemaVersion(1)).toBe(1);
      expect(asSchemaVersion(2)).toBe(2);
      expect(asSchemaVersion(2.9)).toBe(2);
    });

    it('should throw when value < 1', () => {
      expect(() => asSchemaVersion(0)).toThrow(/SchemaVersion must be >= 1/);
      expect(() => asSchemaVersion(0.5)).toThrow(/SchemaVersion must be >= 1/);
    });
  });
});

describe('Type guards', () => {
  it('isTimeoutMs should mirror asTimeoutMs acceptance', () => {
    expect(isTimeoutMs(1)).toBe(true);
    expect(isTimeoutMs(1000)).toBe(true);
    expect(isTimeoutMs(0)).toBe(false);
    expect(isTimeoutMs(-1)).toBe(false);
  });

  it('isMaxAttempts should mirror asMaxAttempts acceptance', () => {
    expect(isMaxAttempts(1)).toBe(true);
    expect(isMaxAttempts(5)).toBe(true);
    expect(isMaxAttempts(3)).toBe(true);
    expect(isMaxAttempts(4.5)).toBe(true);
    expect(isMaxAttempts(0)).toBe(false);
    expect(isMaxAttempts(6)).toBe(false);
  });

  it('isBaseUrl should mirror asBaseUrl acceptance', () => {
    expect(isBaseUrl('https://example.com')).toBe(true);
    expect(isBaseUrl('http://localhost')).toBe(true);
    expect(isBaseUrl('ftp://example.com')).toBe(false);
    expect(isBaseUrl('')).toBe(false);
  });

  it('isPort should mirror asPort acceptance', () => {
    expect(isPort(1)).toBe(true);
    expect(isPort(8080)).toBe(true);
    expect(isPort(65535)).toBe(true);
    expect(isPort(8080.5)).toBe(true);
    expect(isPort(0)).toBe(false);
    expect(isPort(65536)).toBe(false);
  });

  it('isCacheTtlSeconds should mirror asCacheTtlSeconds acceptance', () => {
    expect(isCacheTtlSeconds(0)).toBe(true);
    expect(isCacheTtlSeconds(60)).toBe(true);
    expect(isCacheTtlSeconds(-1)).toBe(false);
  });

  it('isSemanticCacheTtlSeconds should mirror asSemanticCacheTtlSeconds', () => {
    expect(isSemanticCacheTtlSeconds(1)).toBe(true);
    expect(isSemanticCacheTtlSeconds(60)).toBe(true);
    expect(isSemanticCacheTtlSeconds(0)).toBe(false);
    expect(isSemanticCacheTtlSeconds(0.5)).toBe(false);
  });

  it('rate limit and concurrency guards should work', () => {
    expect(isRateLimitRps(10)).toBe(true);
    expect(isRateLimitRps(0.5)).toBe(false);
    expect(isRateLimitBurst(5)).toBe(true);
    expect(isRateLimitBurst(0)).toBe(false);
    expect(isMaxConcurrentStreams(3)).toBe(true);
    expect(isMaxConcurrentStreams(0)).toBe(false);
  });

  it('isAttemptNumber and isSchemaVersion should work', () => {
    expect(isAttemptNumber(2)).toBe(true);
    expect(isAttemptNumber(0)).toBe(false);
    expect(isSchemaVersion(1)).toBe(true);
    expect(isSchemaVersion(0)).toBe(false);
  });
});
