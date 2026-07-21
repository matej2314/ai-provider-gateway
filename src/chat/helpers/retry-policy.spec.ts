import { buildRetryPolicyFromResolved } from './retry-policy';
import { RETRY_POLICY_DEFAULTS } from '../../common/retry-policy-defaults';
import type { ModelRetrySource } from './retry-policy';
import {
  asMaxAttempts,
  asTimeoutMs,
  type MaxAttempts,
  type TimeoutMs,
} from '../../common/types/branded.types';

describe('buildRetryPolicyFromResolved', () => {
  it('should use all custom values when provided', () => {
    const resolved: ModelRetrySource = {
      policy: {
        timeoutMs: asTimeoutMs(60000),
        retry: {
          maxAttempts: asMaxAttempts(5),
          onStatus: [429, 503],
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result).toEqual({
      maxAttempts: 5,
      onStatus: [429, 503],
      timeoutMs: 60000,
      initialDelayMs: RETRY_POLICY_DEFAULTS.initialDelayMs,
      maxDelayMs: RETRY_POLICY_DEFAULTS.maxDelayMs,
    });
  });

  it('should fallback to defaults when policy not provided', () => {
    const resolved: ModelRetrySource = {};

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result).toEqual({
      maxAttempts: RETRY_POLICY_DEFAULTS.maxAttempts,
      onStatus: RETRY_POLICY_DEFAULTS.onStatus,
      timeoutMs: RETRY_POLICY_DEFAULTS.timeoutMs,
      initialDelayMs: RETRY_POLICY_DEFAULTS.initialDelayMs,
      maxDelayMs: RETRY_POLICY_DEFAULTS.maxDelayMs,
    });
  });

  it('should fallback maxAttempts to default when not provided', () => {
    const resolved: ModelRetrySource = {
      policy: {
        timeoutMs: asTimeoutMs(30000),
        retry: {
          onStatus: [429],
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.maxAttempts).toBe(RETRY_POLICY_DEFAULTS.maxAttempts);
    expect(result.timeoutMs).toBe(asTimeoutMs(30000));
    expect(result.onStatus).toEqual([429]);
  });

  it('should fallback onStatus to default when not provided', () => {
    const resolved: ModelRetrySource = {
      policy: {
        retry: {
          maxAttempts: asMaxAttempts(2),
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.maxAttempts).toBe(asMaxAttempts(2));
    expect(result.onStatus).toEqual(RETRY_POLICY_DEFAULTS.onStatus);
  });

  it('should fallback timeoutMs to default when not provided', () => {
    const resolved: ModelRetrySource = {
      policy: {
        retry: {
          maxAttempts: asMaxAttempts(3),
          onStatus: [500],
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.timeoutMs).toBe(RETRY_POLICY_DEFAULTS.timeoutMs);
    expect(result.maxAttempts).toBe(asMaxAttempts(3));
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
      initialDelayMs: RETRY_POLICY_DEFAULTS.initialDelayMs,
      maxDelayMs: RETRY_POLICY_DEFAULTS.maxDelayMs,
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
      initialDelayMs: RETRY_POLICY_DEFAULTS.initialDelayMs,
      maxDelayMs: RETRY_POLICY_DEFAULTS.maxDelayMs,
    });
  });

  it('should apply default backoff delays when policy has no delay fields', () => {
    const resolved: ModelRetrySource = {
      policy: {
        retry: {
          maxAttempts: asMaxAttempts(2),
          onStatus: [429],
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.initialDelayMs).toBe(RETRY_POLICY_DEFAULTS.initialDelayMs);
    expect(result.maxDelayMs).toBe(RETRY_POLICY_DEFAULTS.maxDelayMs);
  });

  it('should accept zero maxAttempts when already branded', () => {
    const zeroAttempts = 0 as MaxAttempts;
    const resolved: ModelRetrySource = {
      policy: {
        retry: {
          maxAttempts: zeroAttempts,
        },
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.maxAttempts).toBe(zeroAttempts);
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

  it('should accept zero timeoutMs when already branded', () => {
    const zeroTimeout = 0 as TimeoutMs;
    const resolved: ModelRetrySource = {
      policy: {
        timeoutMs: zeroTimeout,
      },
    };

    const result = buildRetryPolicyFromResolved(resolved);

    expect(result.timeoutMs).toBe(zeroTimeout);
  });
});
