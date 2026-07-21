import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { isRetryableHttpError } from './is-retryable-http-error';
import { assertNoFallbackCycle } from './fallback-chain';
import { LoggingService } from '../../logging/logging.service';
import { RETRY_POLICY_DEFAULTS } from '../../common/retry-policy-defaults';
import {
  asRequestId,
  type ModelAlias,
  type RequestId,
} from 'src/common/types/branded.types';
import {
  asAttemptNumber,
  asMaxAttempts,
  unbrand,
  type MaxAttempts,
  type TimeoutMs,
} from '../../common/types/branded.types';
import type {
  RetryPolicy,
  AttemptResult,
  ResilientExecutionResult,
  ResilientExecutionOptions,
} from './resilience.types';

@Injectable()
export class ResilientExecutor {
  private readonly logger: LoggingService;

  constructor(loggingService: LoggingService) {
    this.logger = loggingService.child({ module: 'ResilientExecutor' });
  }

  async executeWithRetryAndFallback<T>(
    options: ResilientExecutionOptions<T>,
  ): Promise<ResilientExecutionResult<T>> {
    const maxAttempts = options.retry.maxAttempts ?? asMaxAttempts(3);

    if (options.validateFallbackChain) {
      options.validateFallbackChain(
        options.primaryAlias,
        options.fallbackAlias,
      );
    } else {
      assertNoFallbackCycle(options.primaryAlias, options.fallbackAlias);
    }

    const primary = await this.tryAlias<T>({
      alias: options.primaryAlias,
      maxAttempts,
      retry: options.retry,
      runOnce: options.runOnce,
      requestId: options.requestId ? asRequestId(options.requestId) : undefined,
    });

    if (primary.ok) {
      this.logger.debug('Primary alias succeeded', {
        alias: options.primaryAlias,
        attempts: primary.attempts,
        requestId: options.requestId
          ? asRequestId(options.requestId)
          : undefined,
      });
      return {
        value: primary.value!,
        usedAlias: options.primaryAlias,
        attempts: primary.attempts,
        didFallback: false,
      };
    }

    this.logger.warn('Primary alias exhausted', {
      alias: options.primaryAlias,
      attempts: primary.attempts,
      error: this.extractErrorMessage(primary.error),
      requestId: options.requestId ? asRequestId(options.requestId) : undefined,
    });

    if (!options.fallbackAlias) {
      throw primary.error;
    }

    this.logger.info('Attempting fallback alias', {
      primaryAlias: options.primaryAlias,
      fallbackAlias: options.fallbackAlias,
      requestId: options.requestId ? asRequestId(options.requestId) : undefined,
    });

    const fallback = await this.tryAlias<T>({
      alias: options.fallbackAlias,
      maxAttempts,
      retry: options.retry,
      runOnce: options.runOnce,
      requestId: options.requestId ? asRequestId(options.requestId) : undefined,
    });

    if (fallback.ok) {
      const totalAttempts = asAttemptNumber(
        unbrand(primary.attempts) + unbrand(fallback.attempts),
      );
      this.logger.warn('Fallback alias succeeded', {
        primaryAlias: options.primaryAlias,
        effectiveModelAlias: fallback.usedAlias,
        attempts: totalAttempts,
        requestId: options.requestId
          ? asRequestId(options.requestId)
          : undefined,
      });
      return {
        value: fallback.value!,
        usedAlias: fallback.usedAlias,
        attempts: totalAttempts,
        didFallback: true,
      };
    }

    this.logger.error(
      'Provider exhausted after retries',
      primary.error instanceof Error
        ? primary.error
        : fallback.error instanceof Error
          ? fallback.error
          : new Error(this.extractErrorMessage(primary.error)),
      {
        primaryAlias: options.primaryAlias,
        fallbackAlias: options.fallbackAlias,
        attempts: asAttemptNumber(
          unbrand(primary.attempts) + unbrand(fallback.attempts),
        ),
        requestId: options.requestId
          ? asRequestId(options.requestId)
          : undefined,
      },
    );
    throw this.toExhaustedException(primary.error, fallback.error, options);
  }

  private async tryAlias<T>(options: {
    alias: ModelAlias;
    maxAttempts: MaxAttempts;
    retry: RetryPolicy;
    runOnce: (
      alias: ModelAlias,
      attemptNo: number,
      signal: AbortSignal,
    ) => Promise<T>;
    requestId?: RequestId;
  }): Promise<AttemptResult<T>> {
    let lastError: unknown;
    const maxAttempts = unbrand(options.maxAttempts);
    let attemptsMade = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attemptsMade = attempt;
      try {
        const value = await this.runWithTimeout<T>(
          options.retry.timeoutMs,
          (signal: AbortSignal) =>
            options.runOnce(options.alias, attempt, signal),
        );

        return {
          ok: true,
          value,
          usedAlias: options.alias,
          attempts: asAttemptNumber(attempt),
        };
      } catch (e) {
        lastError = e;

        if (!isRetryableHttpError(e, options.retry.onStatus)) {
          this.logger.debug('Non-retryable error, stopping attempts', {
            alias: options.alias,
            attempt,
            error: this.extractErrorMessage(e),
            requestId: options.requestId,
          });
          break;
        }

        if (attempt < maxAttempts) {
          const delayMs = this.computeBackoffDelayMs(attempt, options.retry);
          this.logger.debug('Retryable error, will retry', {
            alias: options.alias,
            attempt,
            maxAttempts,
            delayMs,
            error: this.extractErrorMessage(e),
            requestId: options.requestId,
          });
          await this.sleep(delayMs);
        }
      }
    }
    return {
      ok: false,
      error: lastError,
      usedAlias: options.alias,
      attempts: asAttemptNumber(attemptsMade),
      exhausted: true,
    };
  }

  /**
   * delay = min(maxDelayMs, initialDelayMs * 2^(attempt - 1))
   * `attempt` is the failed attempt number (1-based), so first wait uses 2^0.
   */
  private computeBackoffDelayMs(attempt: number, retry: RetryPolicy): number {
    const initialDelayMs = unbrand(
      retry.initialDelayMs ?? RETRY_POLICY_DEFAULTS.initialDelayMs,
    );
    const maxDelayMs = unbrand(
      retry.maxDelayMs ?? RETRY_POLICY_DEFAULTS.maxDelayMs,
    );
    const exponential = initialDelayMs * 2 ** (attempt - 1);
    return Math.min(maxDelayMs, exponential);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async runWithTimeout<T>(
    timeoutMs: TimeoutMs | undefined,
    fn: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (!timeoutMs) {
      const idle = new AbortController();
      return fn(idle.signal);
    }

    const controller = new AbortController();
    const timeoutHttpError = new HttpException(
      {
        code: ApiErrorCode.PROVIDER_TIMEOUT,
        message: `Request timeout after ${timeoutMs}ms`,
        details: [],
      },
      HttpStatus.GATEWAY_TIMEOUT,
    );

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, unbrand(timeoutMs));

    const onAbort = new Promise<never>((_, reject) => {
      const rejectTimeout = () => reject(timeoutHttpError);
      if (controller.signal.aborted) {
        rejectTimeout();
        return;
      }
      controller.signal.addEventListener('abort', rejectTimeout, {
        once: true,
      });
    });

    try {
      // Race: deadline for the gateway + AbortSignal for in-flight SDK cancel.
      return await Promise.race([fn(controller.signal), onAbort]);
    } catch (error) {
      if (controller.signal.aborted) {
        throw timeoutHttpError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private toExhaustedException(
    primaryError: unknown,
    fallbackError: unknown,
    options: ResilientExecutionOptions<unknown>,
  ): HttpException {
    const representativeError = primaryError;

    const message = `Provider exhausted after ${options.retry.maxAttempts} retries on primary (${options.primaryAlias})${options.fallbackAlias ? ` and fallback (${options.fallbackAlias})` : ''}`;

    if (representativeError instanceof HttpException) {
      const status = representativeError.getStatus();
      const response = representativeError.getResponse();

      if (
        typeof response === 'object' &&
        response !== null &&
        'code' in response
      ) {
        return new HttpException(
          {
            ...(response as object),
            message,
            details: [
              {
                primaryAlias: options.primaryAlias,
                fallbackAlias: options.fallbackAlias,
                totalAttempts:
                  unbrand(options.retry.maxAttempts) *
                  (options.fallbackAlias ? 2 : 1),
              },
            ],
          },
          status,
        );
      }
    }
    return new HttpException(
      {
        code: ApiErrorCode.PROVIDER_UNAVAILABLE,
        message,
        details: [
          {
            primaryAlias: options.primaryAlias,
            fallbackAlias: options.fallbackAlias,
            primaryError: this.extractErrorMessage(primaryError),
            fallbackError: options.fallbackAlias
              ? this.extractErrorMessage(fallbackError)
              : undefined,
          },
        ],
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }
}
