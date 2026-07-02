import { HttpStatus } from '@nestjs/common';
import {
  mapAnthropicSdkError,
  mapGoogleGenAiError,
  mapOpenAiSdkError,
  toHttpException,
} from './provider-error.mapper';
import { ApiErrorCode } from './api-error.code';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

describe('mapAnthropicSdkError', () => {
  it('should map RateLimitError to 429', () => {
    const error = new Anthropic.RateLimitError(
      429,
      null as any,
      'Rate limited',
      null as any,
    );

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_RATE_LIMITED);
  });

  it('should map AuthenticationError to 401', () => {
    const error = new Anthropic.AuthenticationError(
      401,
      null as any,
      'Auth failed',
      null as any,
    );

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.UNAUTHORIZED);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_AUTH_FAILED);
  });

  it('should map BadRequestError to 400', () => {
    const error = new Anthropic.BadRequestError(
      400,
      null as any,
      'Bad request',
      null as any,
    );

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_REQUEST);
    expect(result.payload.code).toBe(ApiErrorCode.VALIDATION_FAILED);
  });

  it('should map APIError with status 429 to rate limited', () => {
    const error = new Anthropic.APIError(
      429,
      { message: 'Rate limit' } as any,
      'Too many',
      null as any,
    );

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_RATE_LIMITED);
  });

  it('should map APIError with status 401/403 to auth failed', () => {
    const error401 = new Anthropic.APIError(
      401,
      {} as any,
      'Unauthorized',
      null as any,
    );
    const error403 = new Anthropic.APIError(
      403,
      {} as any,
      'Forbidden',
      null as any,
    );

    const result401 = mapAnthropicSdkError(error401);
    const result403 = mapAnthropicSdkError(error403);

    expect(result401.httpStatus).toBe(HttpStatus.UNAUTHORIZED);
    expect(result401.payload.code).toBe(ApiErrorCode.PROVIDER_AUTH_FAILED);
    expect(result403.httpStatus).toBe(HttpStatus.UNAUTHORIZED);
    expect(result403.payload.code).toBe(ApiErrorCode.PROVIDER_AUTH_FAILED);
  });

  it('should map APIError with status 408/504 to timeout', () => {
    const error408 = new Anthropic.APIError(
      408,
      {} as any,
      'Timeout',
      null as any,
    );
    const error504 = new Anthropic.APIError(
      504,
      {} as any,
      'Gateway timeout',
      null as any,
    );

    const result408 = mapAnthropicSdkError(error408);
    const result504 = mapAnthropicSdkError(error504);

    expect(result408.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(result408.payload.code).toBe(ApiErrorCode.PROVIDER_TIMEOUT);
    expect(result504.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
  });

  it('should map APIError with 5xx to unavailable', () => {
    const error500 = new Anthropic.APIError(
      500,
      {} as any,
      'Server error',
      null as any,
    );
    const error502 = new Anthropic.APIError(
      502,
      {} as any,
      'Bad gateway',
      null as any,
    );

    const result500 = mapAnthropicSdkError(error500);
    const result502 = mapAnthropicSdkError(error502);

    expect(result500.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result500.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
    expect(result502.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
  });

  it('should map APIError with 4xx to validation failed', () => {
    const error = new Anthropic.APIError(
      422,
      {} as any,
      'Invalid',
      null as any,
    );

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_REQUEST);
    expect(result.payload.code).toBe(ApiErrorCode.VALIDATION_FAILED);
  });

  it('should map AbortError to timeout', () => {
    const error = new Error('Request aborted');
    error.name = 'AbortError';

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_TIMEOUT);
  });

  it('should map TimeoutError to timeout', () => {
    const error = new Error('Request timeout');
    error.name = 'TimeoutError';

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_TIMEOUT);
  });

  it('should map unknown error to unavailable', () => {
    const error = new Error('Unknown error');

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
  });

  it('should extract error message', () => {
    const error = new Error('Custom message');

    const result = mapAnthropicSdkError(error);

    expect(result.payload.message).toBe('Custom message');
  });

  it('should use fallback message when no message', () => {
    const error = {};

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
    expect(result.payload.message).toBe('Anthropic request failed.');
    expect(result.payload.details).toEqual([]);
  });

  it('should map APIError without status to unavailable via default 502', () => {
    const error = new Anthropic.APIError(
      undefined as any,
      {} as any,
      'No status',
      null as any,
    );

    const result = mapAnthropicSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
    expect(result.payload.details).toEqual([]);
  });

  it('should map APIError with out-of-range status to unavailable', () => {
    const error300 = new Anthropic.APIError(
      300,
      {} as any,
      'Redirect',
      null as any,
    );
    const error600 = new Anthropic.APIError(
      600,
      {} as any,
      'Out of range',
      null as any,
    );

    const result300 = mapAnthropicSdkError(error300);
    const result600 = mapAnthropicSdkError(error600);

    expect(result300.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result300.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
    expect(result600.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result600.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
  });

  it('should extract message from plain object', () => {
    const error = { message: 'Plain object message' };

    const result = mapAnthropicSdkError(error);

    expect(result.payload.message).toBe('Plain object message');
    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
  });

  it.each([null, 'network failure', 42])(
    'should map non-Error value %p to unavailable',
    (error) => {
      const result = mapAnthropicSdkError(error);

      expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
      expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
      expect(result.payload.message).toBe('Anthropic request failed.');
      expect(result.payload.details).toEqual([]);
    },
  );
});

describe('mapGoogleGenAiError', () => {
  it('should map TimeoutError to timeout', () => {
    const error = new Error('Timeout');
    error.name = 'TimeoutError';

    const result = mapGoogleGenAiError(error);

    expect(result.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_TIMEOUT);
    expect(result.payload.details).toEqual([]);
  });

  it('should map AbortError to timeout', () => {
    const error = new Error('Request aborted');
    error.name = 'AbortError';

    const result = mapGoogleGenAiError(error);

    expect(result.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_TIMEOUT);
  });

  it('should prioritize timeout name over status code', () => {
    const error = Object.assign(new Error('Timed out'), {
      name: 'AbortError',
      status: 429,
    });

    const result = mapGoogleGenAiError(error);

    expect(result.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_TIMEOUT);
  });

  it('should map status 429 to rate limited', () => {
    const error = { status: 429, message: 'Rate limit' };

    const result = mapGoogleGenAiError(error);

    expect(result.httpStatus).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_RATE_LIMITED);
  });

  it('should map status 401/403 to auth failed', () => {
    const error401 = { status: 401, message: 'Unauthorized' };
    const error403 = { status: 403, message: 'Forbidden' };

    const result401 = mapGoogleGenAiError(error401);
    const result403 = mapGoogleGenAiError(error403);

    expect(result401.httpStatus).toBe(HttpStatus.UNAUTHORIZED);
    expect(result401.payload.code).toBe(ApiErrorCode.PROVIDER_AUTH_FAILED);
    expect(result403.httpStatus).toBe(HttpStatus.UNAUTHORIZED);
    expect(result403.payload.code).toBe(ApiErrorCode.PROVIDER_AUTH_FAILED);
  });

  it('should map status 408/504 to timeout', () => {
    const error408 = { status: 408, message: 'Timeout' };
    const error504 = { status: 504, message: 'Gateway timeout' };

    const result408 = mapGoogleGenAiError(error408);
    const result504 = mapGoogleGenAiError(error504);

    expect(result408.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(result408.payload.code).toBe(ApiErrorCode.PROVIDER_TIMEOUT);
    expect(result504.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
  });

  it('should map 5xx to unavailable', () => {
    const error = { status: 500, message: 'Server error' };

    const result = mapGoogleGenAiError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
  });

  it('should map 4xx to validation failed', () => {
    const error = { status: 400, message: 'Bad request' };

    const result = mapGoogleGenAiError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_REQUEST);
    expect(result.payload.code).toBe(ApiErrorCode.VALIDATION_FAILED);
  });

  it('should map nested status from response object', () => {
    const error = { response: { status: 429 }, message: 'Rate limited' };

    const result = mapGoogleGenAiError(error);

    expect(result.httpStatus).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_RATE_LIMITED);
    expect(result.payload.message).toBe('Rate limited');
  });

  it('should extract message from plain object', () => {
    const error = { status: 500, message: 'Server error from object' };

    const result = mapGoogleGenAiError(error);

    expect(result.payload.message).toBe('Server error from object');
    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
  });

  it('should use fallback message', () => {
    const error = {};

    const result = mapGoogleGenAiError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
    expect(result.payload.message).toBe('Google GenAI request failed.');
    expect(result.payload.details).toEqual([]);
  });

  it('should default to unavailable when no status', () => {
    const error = { message: 'Unknown error' };

    const result = mapGoogleGenAiError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
    expect(result.payload.message).toBe('Unknown error');
  });

  it.each([null, 'network failure', 42])(
    'should map non-Error value %p to unavailable',
    (error) => {
      const result = mapGoogleGenAiError(error);

      expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
      expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
      expect(result.payload.message).toBe('Google GenAI request failed.');
      expect(result.payload.details).toEqual([]);
    },
  );
});

describe('mapOpenAiSdkError', () => {
  it('should map TimeoutError to PROVIDER_TIMEOUT', () => {
    const error = new Error('Timeout');
    error.name = 'TimeoutError';

    const result = mapOpenAiSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_TIMEOUT);
    expect(result.payload.details).toEqual([]);
  });

  it('should map AbortError to PROVIDER_TIMEOUT', () => {
    const error = new Error('Request aborted');
    error.name = 'AbortError';

    const result = mapOpenAiSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.GATEWAY_TIMEOUT);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_TIMEOUT);
  });

  it('should map OpenAI.APIError 429 to PROVIDER_RATE_LIMITED', () => {
    const error = new OpenAI.APIError(
      429,
      undefined,
      'Rate limited',
      undefined,
    );

    const result = mapOpenAiSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_RATE_LIMITED);
  });

  it('should map OpenAI.APIError 401 to PROVIDER_AUTH_FAILED', () => {
    const error = new OpenAI.APIError(
      401,
      undefined,
      'Unauthorized',
      undefined,
    );

    const result = mapOpenAiSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.UNAUTHORIZED);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_AUTH_FAILED);
  });

  it('should map OpenAI.APIError 500 to PROVIDER_UNAVAILABLE', () => {
    const error = new OpenAI.APIError(
      500,
      undefined,
      'Server error',
      undefined,
    );

    const result = mapOpenAiSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
  });

  it('should map OpenAI.APIError 400 to VALIDATION_FAILED', () => {
    const error = new OpenAI.APIError(400, undefined, 'Bad request', undefined);

    const result = mapOpenAiSdkError(error);

    expect(result.httpStatus).toBe(HttpStatus.BAD_REQUEST);
    expect(result.payload.code).toBe(ApiErrorCode.VALIDATION_FAILED);
  });

  it('should map unknown errors to PROVIDER_UNAVAILABLE', () => {
    const result = mapOpenAiSdkError(new Error('network failure'));

    expect(result.httpStatus).toBe(HttpStatus.BAD_GATEWAY);
    expect(result.payload.code).toBe(ApiErrorCode.PROVIDER_UNAVAILABLE);
    expect(result.payload.message).toBe('network failure');
  });
});

describe('toHttpException', () => {
  it('should convert MappedProviderError to HttpException', () => {
    const mapped = {
      httpStatus: HttpStatus.TOO_MANY_REQUESTS,
      payload: {
        code: ApiErrorCode.PROVIDER_RATE_LIMITED,
        message: 'Rate limited',
        details: [],
      },
    };

    const result = toHttpException(mapped);

    expect(result.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(result.getResponse()).toEqual(mapped.payload);
  });

  it('should preserve payload details', () => {
    const mapped = {
      httpStatus: HttpStatus.BAD_REQUEST,
      payload: {
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Invalid input',
        details: [{ field: 'temperature', error: 'out of range' }],
      },
    };

    const result = toHttpException(mapped);

    expect(result.getResponse()).toEqual(mapped.payload);
  });
});
