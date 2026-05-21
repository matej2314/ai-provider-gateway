export interface RetryPolicy {
  maxAttempts: number;
  onStatus: number[];
  timeoutMs?: number;
}

export interface AttemptResult<T> {
  ok: boolean;
  value?: T;
  error?: unknown;
  usedAlias: string;
  attempts: number;
  exhausted?: boolean;
}

export interface ResilientExecutionResult<T> {
  value: T;
  usedAlias: string;
  attempts: number;
  didFallback: boolean;
}

export interface ResilientExecutionOptions<T> {
  primaryAlias: string;
  fallbackAlias?: string;
  retry: RetryPolicy;
  runOnce: (alias: string, attemptNo: number) => Promise<T>;
  validateFallbackChain?: (primary: string, fallback?: string) => void;
  requestId?: string;
}
