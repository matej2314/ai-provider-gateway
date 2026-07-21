import type { MaxAttempts, TimeoutMs } from '../../common/types/branded.types';
import type { RetryPolicy } from '../resilience/resilience.types';
import { RETRY_POLICY_DEFAULTS } from '../../common/retry-policy-defaults';

export interface ModelRetrySource {
  policy?: {
    timeoutMs?: TimeoutMs;
    retry?: {
      maxAttempts?: MaxAttempts;
      onStatus?: number[];
    };
  };
}

function resolveMaxAttempts(raw: MaxAttempts | undefined): MaxAttempts {
  return raw ?? RETRY_POLICY_DEFAULTS.maxAttempts;
}

function resolveTimeoutMs(raw: TimeoutMs | undefined): TimeoutMs | undefined {
  if (raw !== undefined) {
    return raw;
  }
  return RETRY_POLICY_DEFAULTS.timeoutMs;
}

export function buildRetryPolicyFromResolved(
  resolved: ModelRetrySource,
): RetryPolicy {
  const rawMaxAttempts = resolved.policy?.retry?.maxAttempts;
  const rawTimeoutMs = resolved.policy?.timeoutMs;

  return {
    maxAttempts: resolveMaxAttempts(rawMaxAttempts),
    onStatus:
      resolved.policy?.retry?.onStatus ?? RETRY_POLICY_DEFAULTS.onStatus,
    timeoutMs: resolveTimeoutMs(rawTimeoutMs),
    initialDelayMs: RETRY_POLICY_DEFAULTS.initialDelayMs,
    maxDelayMs: RETRY_POLICY_DEFAULTS.maxDelayMs,
  };
}
