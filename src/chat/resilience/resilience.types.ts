import type {
  AttemptNumber,
  MaxAttempts,
  ModelAlias,
  TimeoutMs,
} from '../../common/types/branded.types';

export interface RetryPolicy {
  maxAttempts: MaxAttempts;
  onStatus: number[];
  /** Per-attempt request deadline (not the delay between retries). */
  timeoutMs?: TimeoutMs;
  /** Base delay before the next retry (exponential backoff). */
  initialDelayMs?: TimeoutMs;
  /** Cap for exponential backoff delay between retries. */
  maxDelayMs?: TimeoutMs;
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
  runOnce: (
    alias: ModelAlias,
    attemptNo: number,
    signal: AbortSignal,
  ) => Promise<T>;
  validateFallbackChain?: (primary: ModelAlias, fallback?: ModelAlias) => void;
  requestId?: string;
}
