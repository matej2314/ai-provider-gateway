import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ResilientExecutor } from './resilient-executor';
import { LoggingService } from '../../logging/logging.service';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import type {
  ResilientExecutionOptions,
  RetryPolicy,
} from './resilience.types';
import {
  asAttemptNumber,
  asMaxAttempts,
  asModelAlias,
  asTimeoutMs,
  type ModelAlias,
  type TimeoutMs,
} from '../../common/types/branded.types';

const alias = (name: string): ModelAlias => asModelAlias(name);

function retryPolicy(
  maxAttempts: number,
  onStatus: number[],
  timeoutMs?: number,
): RetryPolicy {
  const policy: RetryPolicy = {
    maxAttempts: asMaxAttempts(maxAttempts),
    onStatus,
    initialDelayMs: asTimeoutMs(1),
    maxDelayMs: asTimeoutMs(1),
  };

  if (timeoutMs === 0) {
    policy.timeoutMs = 0 as TimeoutMs;
  } else if (timeoutMs !== undefined) {
    policy.timeoutMs = asTimeoutMs(timeoutMs);
  }

  return policy;
}

function structuredHttpException(
  code: string,
  message: string,
  status: number,
): HttpException {
  return new HttpException({ code, message, details: [] }, status);
}

async function rejectWith<T>(
  executor: ResilientExecutor,
  options: ResilientExecutionOptions<T>,
): Promise<HttpException> {
  try {
    await executor.executeWithRetryAndFallback(options);
    throw new Error('Expected executeWithRetryAndFallback to reject');
  } catch (error) {
    return error as HttpException;
  }
}

describe('ResilientExecutor', () => {
  let executor: ResilientExecutor;
  let mockLogger: Partial<LoggingService>;

  beforeEach(async () => {
    mockLogger = createMockLoggingService();

    const module = await Test.createTestingModule({
      providers: [
        ResilientExecutor,
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    executor = module.get(ResilientExecutor);
  });

  it('should create a scoped logger on construction', () => {
    expect(mockLogger.child).toHaveBeenCalledWith({
      module: 'ResilientExecutor',
    });
  });

  describe('Happy path - primary success (no retry)', () => {
    it('should return value on first attempt', async () => {
      const runOnce = jest.fn().mockResolvedValue('success');
      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(3, [429, 500], 5000),
        runOnce,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result).toEqual({
        value: 'success',
        usedAlias: alias('primary'),
        attempts: asAttemptNumber(1),
        didFallback: false,
      });
      expect(runOnce).toHaveBeenCalledTimes(1);
      expect(runOnce).toHaveBeenCalledWith(
        alias('primary'),
        1,
        expect.any(AbortSignal),
      );
    });

    it('should log debug on success', async () => {
      const runOnce = jest.fn().mockResolvedValue('data');
      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('test-alias'),
        retry: retryPolicy(2, [], 1000),
        runOnce,
        requestId: 'req-123',
      };

      await executor.executeWithRetryAndFallback(options);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Primary alias succeeded',
        expect.objectContaining({
          alias: 'test-alias',
          attempts: asAttemptNumber(1),
          requestId: 'req-123',
        }),
      );
    });
  });

  describe('Happy path - retry then success', () => {
    it('should retry on retryable error and succeed', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(
          new HttpException('Rate limited', HttpStatus.TOO_MANY_REQUESTS),
        )
        .mockResolvedValueOnce('success');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(3, [429], 5000),
        runOnce,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result).toEqual({
        value: 'success',
        usedAlias: alias('primary'),
        attempts: asAttemptNumber(2),
        didFallback: false,
      });
      expect(runOnce).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times before success', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Error', 500))
        .mockRejectedValueOnce(new HttpException('Error', 502))
        .mockResolvedValueOnce('success');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(5, [500, 502], 5000),
        runOnce,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result.attempts).toBe(3);
      expect(runOnce).toHaveBeenCalledTimes(3);
    });

    it('should log debug before retrying a retryable error', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Error', 500))
        .mockResolvedValueOnce('success');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(3, [500], 5000),
        runOnce,
        requestId: 'req-retry',
      };

      await executor.executeWithRetryAndFallback(options);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Retryable error, will retry',
        expect.objectContaining({
          alias: 'primary',
          attempt: 1,
          maxAttempts: 3,
          delayMs: 1,
          requestId: 'req-retry',
        }),
      );
    });

    it('should apply exponential backoff capped by maxDelayMs', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValue(new HttpException('Error', 500));

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: {
          maxAttempts: asMaxAttempts(4),
          onStatus: [500],
          timeoutMs: asTimeoutMs(5000),
          initialDelayMs: asTimeoutMs(100),
          maxDelayMs: asTimeoutMs(250),
        },
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow(HttpException);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Retryable error, will retry',
        expect.objectContaining({ attempt: 1, delayMs: 100 }),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Retryable error, will retry',
        expect.objectContaining({ attempt: 2, delayMs: 200 }),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Retryable error, will retry',
        expect.objectContaining({ attempt: 3, delayMs: 250 }),
      );
    });
  });

  describe('Happy path - fallback success', () => {
    it('should fallback when primary exhausted', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Error', 500))
        .mockRejectedValueOnce(new HttpException('Error', 500))
        .mockResolvedValueOnce('fallback-success');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(2, [500], 5000),
        runOnce,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result).toEqual({
        value: 'fallback-success',
        usedAlias: alias('fallback'),
        attempts: asAttemptNumber(3),
        didFallback: true,
      });
      expect(runOnce).toHaveBeenCalledWith(
        alias('primary'),
        1,
        expect.any(AbortSignal),
      );
      expect(runOnce).toHaveBeenCalledWith(
        alias('primary'),
        2,
        expect.any(AbortSignal),
      );
      expect(runOnce).toHaveBeenCalledWith(
        alias('fallback'),
        1,
        expect.any(AbortSignal),
      );
    });

    it('should log fallback attempt', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Error', 500))
        .mockResolvedValueOnce('ok');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
        requestId: 'req-456',
      };

      await executor.executeWithRetryAndFallback(options);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Attempting fallback alias',
        expect.objectContaining({
          primaryAlias: alias('primary'),
          fallbackAlias: alias('fallback'),
          requestId: 'req-456',
        }),
      );
    });

    it('should log warn when fallback succeeds', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Error', 500))
        .mockResolvedValueOnce('ok');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
        requestId: 'req-fb-ok',
      };

      await executor.executeWithRetryAndFallback(options);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Fallback alias succeeded',
        expect.objectContaining({
          primaryAlias: alias('primary'),
          effectiveModelAlias: 'fallback',
          attempts: asAttemptNumber(2),
          requestId: 'req-fb-ok',
        }),
      );
    });
  });

  describe('Edge case - non-retryable errors', () => {
    it('should not retry on non-retryable status', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(
          new HttpException('Bad request', HttpStatus.BAD_REQUEST),
        );

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(3, [429, 500], 5000),
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow(HttpException);

      expect(runOnce).toHaveBeenCalledTimes(1);
    });

    it('should stop retrying after first non-retryable error', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Auth failed', 401));

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(5, [500], 5000),
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow();
      expect(runOnce).toHaveBeenCalledTimes(1);
    });

    it('should log debug when stopping on non-retryable error', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Bad request', 400));

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(3, [500], 5000),
        runOnce,
        requestId: 'req-non-retry',
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Non-retryable error, stopping attempts',
        expect.objectContaining({
          alias: 'primary',
          attempt: 1,
          requestId: 'req-non-retry',
        }),
      );
    });

    it('should still attempt fallback after primary non-retryable failure', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Bad request', 400))
        .mockResolvedValueOnce('fallback-ok');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(3, [500], 5000),
        runOnce,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result).toEqual({
        value: 'fallback-ok',
        usedAlias: alias('fallback'),
        attempts: asAttemptNumber(2),
        didFallback: true,
      });
      expect(runOnce).toHaveBeenCalledTimes(2);
      expect(runOnce).toHaveBeenCalledWith(
        alias('fallback'),
        1,
        expect.any(AbortSignal),
      );
    });

    it('should log warn when primary is exhausted before fallback', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Error', 500))
        .mockResolvedValueOnce('ok');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
        requestId: 'req-exhausted',
      };

      await executor.executeWithRetryAndFallback(options);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Primary alias exhausted',
        expect.objectContaining({
          alias: 'primary',
          attempts: asAttemptNumber(1),
          requestId: 'req-exhausted',
        }),
      );
    });
  });

  describe('Edge case - timeout', () => {
    it('should timeout and throw PROVIDER_TIMEOUT after timeoutMs', async () => {
      const runOnce = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('late'), 100);
          }),
      );

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(1, [], 10),
        runOnce,
      };

      const error = await rejectWith(executor, options);

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          code: ApiErrorCode.PROVIDER_TIMEOUT,
          message: expect.stringContaining('timeout'),
        }),
      );
      expect(runOnce).toHaveBeenCalledTimes(1);
    });

    it('should retry when timeout status is retryable', async () => {
      let callCount = 0;
      const runOnce = jest.fn().mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return new Promise((resolve) => {
            setTimeout(() => resolve('late'), 100);
          });
        }
        return Promise.resolve('recovered');
      });

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(2, [504], 15),
        runOnce,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result).toEqual({
        value: 'recovered',
        usedAlias: alias('primary'),
        attempts: asAttemptNumber(2),
        didFallback: false,
      });
      expect(runOnce).toHaveBeenCalledTimes(2);
    });

    it('should not apply timeout when timeoutMs is undefined', async () => {
      const runOnce = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('ok'), 50);
          }),
      );

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(1, []),
        runOnce,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result.value).toBe('ok');
    });

    it('should not apply timeout when timeoutMs is 0', async () => {
      const runOnce = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('ok'), 50);
          }),
      );

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(1, [], 0),
        runOnce,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result.value).toBe('ok');
    });

    it('should abort the attempt signal when timeoutMs elapses', async () => {
      let seen: AbortSignal | undefined;
      const runOnce = jest.fn(
        (
          _alias: ModelAlias,
          _attempt: number,
          signal?: AbortSignal,
        ): Promise<string> => {
          seen = signal;
          return new Promise(() => {
            /* never resolves — timeout must win */
          });
        },
      );

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(1, [], 20),
        runOnce,
      };

      const error = await rejectWith(executor, options);

      expect(error.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
      expect(seen?.aborted).toBe(true);
      expect(runOnce).toHaveBeenCalledWith(
        alias('primary'),
        1,
        expect.any(AbortSignal),
      );
    });
  });

  describe('Edge case - retry defaults', () => {
    it('should default maxAttempts to 3 when omitted', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValue(new HttpException('Error', 500));

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: {
          onStatus: [500],
          timeoutMs: asTimeoutMs(5000),
          initialDelayMs: asTimeoutMs(1),
          maxDelayMs: asTimeoutMs(1),
        } as RetryPolicy,
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow(HttpException);

      expect(runOnce).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge case - both exhausted', () => {
    it('should throw when both primary and fallback exhausted', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValue(new HttpException('Error', 500));

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(2, [500], 5000),
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow(HttpException);

      expect(runOnce).toHaveBeenCalledTimes(4);
    });

    it('should throw PROVIDER_UNAVAILABLE with error details for string responses', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValue(new HttpException('Error', 500));

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('model-a'),
        fallbackAlias: alias('model-b'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
      };

      const error = await rejectWith(executor, options);

      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          code: ApiErrorCode.PROVIDER_UNAVAILABLE,
          message: expect.stringMatching(
            /exhausted.*model-a.*fallback \(model-b\)/,
          ),
          details: [
            expect.objectContaining({
              primaryAlias: alias('model-a'),
              fallbackAlias: alias('model-b'),
              primaryError: 'Error',
              fallbackError: 'Error',
            }),
          ],
        }),
      );
    });

    it('should preserve structured primary error code when both exhausted', async () => {
      const primaryError = structuredHttpException(
        ApiErrorCode.PROVIDER_RATE_LIMITED,
        'Rate limited',
        HttpStatus.TOO_MANY_REQUESTS,
      );
      const runOnce = jest.fn().mockRejectedValue(primaryError);

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('model-a'),
        fallbackAlias: alias('model-b'),
        retry: retryPolicy(2, [429], 5000),
        runOnce,
      };

      const error = await rejectWith(executor, options);

      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          code: ApiErrorCode.PROVIDER_RATE_LIMITED,
          message: expect.stringContaining('exhausted'),
          details: [
            {
              primaryAlias: alias('model-a'),
              fallbackAlias: alias('model-b'),
              totalAttempts: 4,
            },
          ],
        }),
      );
    });

    it('should use PROVIDER_UNAVAILABLE when HttpException response has no code', async () => {
      const primaryError = new HttpException(
        { message: 'Service unavailable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      const runOnce = jest.fn().mockRejectedValue(primaryError);

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [503], 5000),
        runOnce,
      };

      const error = await rejectWith(executor, options);

      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          code: ApiErrorCode.PROVIDER_UNAVAILABLE,
        }),
      );
    });

    it('should log error when exhausted', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValue(new HttpException('Error', 500));

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
        requestId: 'req-789',
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Provider exhausted after retries',
        expect.any(Error),
        expect.objectContaining({
          primaryAlias: alias('primary'),
          fallbackAlias: alias('fallback'),
          requestId: 'req-789',
        }),
      );
    });

    it('should log wrapped Error when both errors are non-Error values', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce('primary string failure')
        .mockRejectedValueOnce('fallback string failure');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow(HttpException);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Provider exhausted after retries',
        expect.objectContaining({ message: 'primary string failure' }),
        expect.objectContaining({
          primaryAlias: alias('primary'),
          fallbackAlias: alias('fallback'),
        }),
      );
    });

    it('should log fallback Error when primary error is a string', async () => {
      const fallbackError = new Error('fallback failed');
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce('primary string failure')
        .mockRejectedValueOnce(fallbackError);

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow(HttpException);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Provider exhausted after retries',
        fallbackError,
        expect.any(Object),
      );
    });
  });

  describe('Edge case - fallback cycle validation', () => {
    it('should throw on circular fallback', async () => {
      const runOnce = jest.fn();

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('alias1'),
        fallbackAlias: alias('alias1'),
        retry: retryPolicy(1, [], 5000),
        runOnce,
      };

      const error = await rejectWith(executor, options);

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('Circular fallback'),
        }),
      );
      expect(runOnce).not.toHaveBeenCalled();
    });

    it('should use custom validateFallbackChain when provided', async () => {
      const customValidator = jest.fn();
      const runOnce = jest.fn().mockResolvedValue('ok');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [], 5000),
        runOnce,
        validateFallbackChain: customValidator,
      };

      await executor.executeWithRetryAndFallback(options);

      expect(customValidator).toHaveBeenCalledWith(
        alias('primary'),
        alias('fallback'),
      );
    });

    it('should skip default cycle validation when custom validator is provided', async () => {
      const customValidator = jest.fn();
      const runOnce = jest.fn().mockResolvedValue('ok');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('same-alias'),
        fallbackAlias: alias('same-alias'),
        retry: retryPolicy(1, [], 5000),
        runOnce,
        validateFallbackChain: customValidator,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result.value).toBe('ok');
      expect(customValidator).toHaveBeenCalledWith(
        alias('same-alias'),
        alias('same-alias'),
      );
    });

    it('should propagate errors from custom validateFallbackChain', async () => {
      const customValidator = jest.fn(() => {
        throw new HttpException('Invalid chain', HttpStatus.BAD_REQUEST);
      });
      const runOnce = jest.fn().mockResolvedValue('ok');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [], 5000),
        runOnce,
        validateFallbackChain: customValidator,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow('Invalid chain');
      expect(runOnce).not.toHaveBeenCalled();
    });
  });

  describe('Edge case - no fallback', () => {
    it('should throw primary error when no fallback and exhausted', async () => {
      const primaryError = new HttpException('Primary failed', 500);
      const runOnce = jest.fn().mockRejectedValue(primaryError);

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(2, [500], 5000),
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow(primaryError);
    });

    it('should throw string primary error when no fallback and non-retryable', async () => {
      const runOnce = jest.fn().mockRejectedValue('plain string failure');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(3, [500], 5000),
        runOnce,
      };

      await expect(executor.executeWithRetryAndFallback(options)).rejects.toBe(
        'plain string failure',
      );
      expect(runOnce).toHaveBeenCalledTimes(1);
    });

    it('should surface unknown error message in primary exhausted warn log', async () => {
      const runOnce = jest.fn().mockRejectedValue(null);

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
        requestId: 'req-unknown',
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toBeNull();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Primary alias exhausted',
        expect.objectContaining({
          error: 'Unknown error',
          requestId: 'req-unknown',
        }),
      );
    });
  });

  describe('Integration - complex scenarios', () => {
    it('should handle mixed retryable/non-retryable in sequence', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('Retry me', 500))
        .mockRejectedValueOnce(new HttpException('Stop here', 400));

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(5, [500], 5000),
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow();

      expect(runOnce).toHaveBeenCalledTimes(2);
    });

    it('should count attempts across primary and fallback', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(new HttpException('E1', 500))
        .mockRejectedValueOnce(new HttpException('E2', 500))
        .mockRejectedValueOnce(new HttpException('E3', 500))
        .mockResolvedValueOnce('ok');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(2, [500], 5000),
        runOnce,
      };

      const result = await executor.executeWithRetryAndFallback(options);

      expect(result.attempts).toBe(4);
    });

    it('should handle non-HttpException errors', async () => {
      const runOnce = jest.fn().mockRejectedValue(new Error('Generic error'));

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        retry: retryPolicy(3, [500], 5000),
        runOnce,
      };

      await expect(
        executor.executeWithRetryAndFallback(options),
      ).rejects.toThrow('Generic error');

      expect(runOnce).toHaveBeenCalledTimes(1);
    });

    it('should map string errors in exhausted exception details', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce('primary down')
        .mockRejectedValueOnce('fallback down');

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
      };

      const error = await rejectWith(executor, options);

      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          details: [
            expect.objectContaining({
              primaryError: 'primary down',
              fallbackError: 'fallback down',
            }),
          ],
        }),
      );
    });

    it('should use Unknown error for null/undefined rejections in exhausted details', async () => {
      const runOnce = jest
        .fn()
        .mockRejectedValueOnce(undefined)
        .mockRejectedValueOnce(null);

      const options: ResilientExecutionOptions<string> = {
        primaryAlias: alias('primary'),
        fallbackAlias: alias('fallback'),
        retry: retryPolicy(1, [500], 5000),
        runOnce,
      };

      const error = await rejectWith(executor, options);

      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          details: [
            expect.objectContaining({
              primaryError: 'Unknown error',
              fallbackError: 'Unknown error',
            }),
          ],
        }),
      );
    });
  });
});
