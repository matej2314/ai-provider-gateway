import { HttpException, HttpStatus } from '@nestjs/common';
import { isRetryableHttpError } from './is-retryable-http-error';

describe('isRetryableHttpError', () => {
  it('should return true for 429 (default)', () => {
    const error = new HttpException(
      'Rate limited',
      HttpStatus.TOO_MANY_REQUESTS,
    );

    const result = isRetryableHttpError(error);

    expect(result).toBe(true);
  });

  it('should return true for 500 (default)', () => {
    const error = new HttpException(
      'Server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    const result = isRetryableHttpError(error);

    expect(result).toBe(true);
  });

  it('should return true for 502 (default)', () => {
    const error = new HttpException('Bad gateway', HttpStatus.BAD_GATEWAY);

    const result = isRetryableHttpError(error);

    expect(result).toBe(true);
  });

  it('should return true for 503 (default)', () => {
    const error = new HttpException(
      'Service unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    const result = isRetryableHttpError(error);

    expect(result).toBe(true);
  });

  it('should return true for 504 (default)', () => {
    const error = new HttpException(
      'Gateway timeout',
      HttpStatus.GATEWAY_TIMEOUT,
    );

    const result = isRetryableHttpError(error);

    expect(result).toBe(true);
  });

  it('should return false for 400', () => {
    const error = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

    const result = isRetryableHttpError(error);

    expect(result).toBe(false);
  });

  it('should return false for 401', () => {
    const error = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const result = isRetryableHttpError(error);

    expect(result).toBe(false);
  });

  it('should return false for 404', () => {
    const error = new HttpException('Not found', HttpStatus.NOT_FOUND);

    const result = isRetryableHttpError(error);

    expect(result).toBe(false);
  });

  it('should use custom onStatus list', () => {
    const error = new HttpException('Conflict', HttpStatus.CONFLICT);

    const result = isRetryableHttpError(error, [409]);

    expect(result).toBe(true);
  });

  it('should return false when status not in custom list', () => {
    const error = new HttpException(
      'Rate limited',
      HttpStatus.TOO_MANY_REQUESTS,
    );

    const result = isRetryableHttpError(error, [500, 502]);

    expect(result).toBe(false);
  });

  it('should return false for non-HttpException', () => {
    const error = new Error('Generic error');

    const result = isRetryableHttpError(error);

    expect(result).toBe(false);
  });

  it('should return false for string error', () => {
    const error = 'Error string';

    const result = isRetryableHttpError(error);

    expect(result).toBe(false);
  });

  it('should return false for null', () => {
    const result = isRetryableHttpError(null);

    expect(result).toBe(false);
  });

  it('should return false for undefined', () => {
    const result = isRetryableHttpError(undefined);

    expect(result).toBe(false);
  });

  it('should return false when onStatus is empty array', () => {
    const error = new HttpException('Error', HttpStatus.TOO_MANY_REQUESTS);

    const result = isRetryableHttpError(error, []);

    expect(result).toBe(false);
  });
});
