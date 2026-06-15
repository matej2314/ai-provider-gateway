import { buildRetryPolicyFromResolved } from './retry-policy';
import { RETRY_POLICY_DEFAULTS } from '../../common/retry-policy-defaults';
import type { ModelRetrySource } from './retry-policy';

describe('buildRetryPolicyFromResolved', () => {
  it('should use all custom values when provided', () => {
    const resolved: ModelRetrySource = {
      policy: {
        timeoutMs: 60000,
        retry: {
          maxAttempts: 5,
          onStatus: [429, 503],
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result).toEqual({
      maxAttempts: 5,
      onStatus: [429, 503],
      timeoutMs: 60000,
    });
  });

  it('should fallback to defaults when policy not provided', () => {
    const resolved: ModelRetrySource = {};

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result).toEqual({
      maxAttempts: RETRY_POLICY_DEFAULTS.maxAttempts,
      onStatus: RETRY_POLICY_DEFAULTS.onStatus,
      timeoutMs: RETRY_POLICY_DEFAULTS.timeoutMs,
    });
  });

  it('should fallback maxAttempts to default when not provided', () => {
    const resolved: ModelRetrySource = {
      policy: {
        timeoutMs: 30000,
        retry: {
          onStatus: [429],
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.maxAttempts).toBe(RETRY_POLICY_DEFAULTS.maxAttempts);
    expect(result.timeoutMs).toBe(30000);
    expect(result.onStatus).toEqual([429]);
  });

  it('should fallback onStatus to default when not provided', () => {
    const resolved: ModelRetrySource = {
      policy: {
        retry: {
          maxAttempts: 2,
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.maxAttempts).toBe(2);
    expect(result.onStatus).toEqual(RETRY_POLICY_DEFAULTS.onStatus);
  });

  it('should fallback timeoutMs to default when not provided', () => {
    const resolved: ModelRetrySource = {
      policy: {
        retry: {
          maxAttempts: 3,
          onStatus: [500],
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.timeoutMs).toBe(RETRY_POLICY_DEFAULTS.timeoutMs);
    expect(result.maxAttempts).toBe(3);
    expect(result.onStatus).toEqual([500]);
  });

  it('should handle empty retry object', () => {
    const resolved: ModelRetrySource = {
      policy: {
        retry: {},
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result).toEqual({
      maxAttempts: RETRY_POLICY_DEFAULTS.maxAttempts,
      onStatus: RETRY_POLICY_DEFAULTS.onStatus,
      timeoutMs: RETRY_POLICY_DEFAULTS.timeoutMs,
    });
  });

  it('should handle empty policy object', () => {
    const resolved: ModelRetrySource = {
      policy: {},
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result).toEqual({
      maxAttempts: RETRY_POLICY_DEFAULTS.maxAttempts,
      onStatus: RETRY_POLICY_DEFAULTS.onStatus,
      timeoutMs: RETRY_POLICY_DEFAULTS.timeoutMs,
    });
  });

  it('should accept zero maxAttempts', () => {
    const resolved: ModelRetrySource = {
      policy: {
        retry: {
          maxAttempts: 0,
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.maxAttempts).toBe(0);
  });

  it('should accept empty onStatus array', () => {
    const resolved: ModelRetrySource = {
      policy: {
        retry: {
          onStatus: [],
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.onStatus).toEqual([]);
  });

  it('should accept zero timeoutMs', () => {
    const resolved: ModelRetrySource = {
      policy: {
        timeoutMs: 0,
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.timeoutMs).toBe(0);
  });
});
