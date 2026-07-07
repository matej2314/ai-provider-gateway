import type {
  AttemptNumber,
  MaxAttempts,
  ModelAlias,
  TimeoutMs,
} from '../types/branded.types';

export interface RetryPolicy {
  maxAttempts: MaxAttempts;
  onStatus: number[];
  timeoutMs?: TimeoutMs;
}

export interface AttemptResult<T> {
  ok: boolean;
  value?: T;
  error?: unknown;
  usedAlias: ModelAlias;
  attempts: AttemptNumber;
  exhausted?: boolean;
}

export interface ResilientExecutionResult<T> {
  value: T;
  usedAlias: ModelAlias;
  attempts: AttemptNumber;
  didFallback: boolean;
}

export interface ResilientExecutionOptions<T> {
  primaryAlias: ModelAlias;
  fallbackAlias?: ModelAlias;
  retry: RetryPolicy;
  runOnce: (alias: ModelAlias, attemptNo: number) => Promise<T>;
  validateFallbackChain?: (primary: ModelAlias, fallback?: ModelAlias) => void;
  requestId?: string;
}
