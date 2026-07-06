import type { ModelAlias } from '../types/branded.types';

export interface RetryPolicy {
  maxAttempts: number;
  onStatus: number[];
  timeoutMs?: number;
}

export interface AttemptResult<T> {
  ok: boolean;
  value?: T;
  error?: unknown;
  usedAlias: ModelAlias;
  attempts: number;
  exhausted?: boolean;
}

export interface ResilientExecutionResult<T> {
  value: T;
  usedAlias: ModelAlias;
  attempts: number;
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
