import type { RetryPolicy } from '../../common/resilience/resilience.types';
import { RETRY_POLICY_DEFAULTS } from '../../common/retry-policy-defaults';

export interface ModelRetrySource {
  policy?: {
    timeoutMs?: number;
    retry?: {
      maxAttempts?: number;
      onStatus?: number[];
    };
  };
}

export function buildRetryPolicyFromResolved(
  resolved: ModelRetrySource,
): RetryPolicy {
  return {
    maxAttempts:
      resolved.policy?.retry?.maxAttempts ?? RETRY_POLICY_DEFAULTS.maxAttempts,
    onStatus:
      resolved.policy?.retry?.onStatus ?? RETRY_POLICY_DEFAULTS.onStatus,
    timeoutMs: resolved.policy?.timeoutMs ?? RETRY_POLICY_DEFAULTS.timeoutMs,
  };
}
