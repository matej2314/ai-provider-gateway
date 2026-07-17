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
  initialDelayMs: TimeoutMs;
  maxDelayMs: TimeoutMs;
} = {
  maxAttempts: asMaxAttempts(3),
  onStatus: [429, 500, 502, 503, 504],
  timeoutMs: asTimeoutMs(30000),
  initialDelayMs: asTimeoutMs(500),
  maxDelayMs: asTimeoutMs(8000),
};
