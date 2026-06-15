import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../errors/api-error.code';
import { isRetryableHttpError } from './is-retryable-http-error';
import { assertNoFallbackCycle } from './fallback-chain';
import { LoggingService } from '../../logging/logging.service';
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
    const maxAttempts = options.retry.maxAttempts ?? 3;

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
      requestId: options.requestId,
    });

    if (primary.ok) {
      this.logger.debug('Primary alias succeeded', {
        alias: options.primaryAlias,
        attempts: primary.attempts,
        requestId: options.requestId,
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
      requestId: options.requestId,
    });

    if (!options.fallbackAlias) {
      throw primary.error;
    }

    this.logger.info('Attempting fallback alias', {
      primaryAlias: options.primaryAlias,
      fallbackAlias: options.fallbackAlias,
      requestId: options.requestId,
    });

    const fallback = await this.tryAlias<T>({
      alias: options.fallbackAlias as string,
      maxAttempts,
      retry: options.retry,
      runOnce: options.runOnce,
      requestId: options.requestId,
    });

    if (fallback.ok) {
      this.logger.warn('Fallback alias succeeded', {
        primaryAlias: options.primaryAlias,
        effectiveModelAlias: fallback.usedAlias,
        attempts: primary.attempts + fallback.attempts,
        requestId: options.requestId,
      });
      return {
        value: fallback.value!,
        usedAlias: fallback.usedAlias,
        attempts: primary.attempts + fallback.attempts,
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
        attempts: primary.attempts + fallback.attempts,
        requestId: options.requestId,
      },
    );
    throw this.toExhaustedException(primary.error, fallback.error, options);
  }

  private async tryAlias<T>(options: {
    alias: string;
    maxAttempts: number;
    retry: RetryPolicy;
    runOnce: (alias: string, attemptNo: number) => Promise<T>;
    requestId?: string;
  }): Promise<AttemptResult<T>> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      try {
        const value = await this.runWithTimeout<T>(
          options.retry.timeoutMs,
          () => options.runOnce(options.alias, attempt),
        );

        return {
          ok: true,
          value,
          usedAlias: options.alias,
          attempts: attempt,
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

        if (attempt < options.maxAttempts) {
          this.logger.debug('Retryable error, will retry', {
            alias: options.alias,
            attempt,
            maxAttempts: options.maxAttempts,
            error: this.extractErrorMessage(e),
            requestId: options.requestId,
          });
        }
      }
    }
    return {
      ok: false,
      error: lastError,
      usedAlias: options.alias,
      attempts: options.maxAttempts,
      exhausted: true,
    };
  }

  private async runWithTimeout<T>(
    timeoutMs: number | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (!timeoutMs) {
      return fn();
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () =>
          reject(
            new HttpException(
              {
                code: ApiErrorCode.PROVIDER_TIMEOUT,
                message: `Request timeout after ${timeoutMs}ms`,
                details: [],
              },
              HttpStatus.GATEWAY_TIMEOUT,
            ),
          ),
        timeoutMs,
      );
    });

    return Promise.race([fn(), timeoutPromise]).finally(() =>
      clearTimeout(timeoutId),
    );
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
            ...(response as Object),
            message,
            details: [
              {
                primaryAlias: options.primaryAlias,
                fallbackAlias: options.fallbackAlias,
                totalAttempts:
                  options.retry.maxAttempts * (options.fallbackAlias ? 2 : 1),
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
