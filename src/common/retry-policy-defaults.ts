import {
  asMaxAttempts,
  asTimeoutMs,
  type MaxAttempts,
  type TimeoutMs,
} from './types/branded.types';

export const RETRY_POLICY_DEFAULTS: {
  maxAttempts: MaxAttempts;
  onStatus: number[];
  timeoutMs: TimeoutMs;
} = {
  maxAttempts: asMaxAttempts(3),
  onStatus: [429, 500, 502, 503, 504],
  timeoutMs: asTimeoutMs(30000),
};
