import { AnthropicExceptionFilter } from './anthropic-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';

describe('AnthropicExceptionFilter', () => {
  let filter: AnthropicExceptionFilter;
  let mockHost: ArgumentsHost;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
    setHeader?: jest.Mock;
  };

  beforeEach(() => {
    filter = new AnthropicExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: () => ({ getResponse: () => mockResponse }),
    } as ArgumentsHost;
  });

  it('should format HttpException with string message', () => {
    filter.catch(
      new HttpException('Invalid input', HttpStatus.BAD_REQUEST),
      mockHost,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'invalid_request_error', message: 'Invalid input' },
    });
    expect(mockResponse.setHeader).not.toHaveBeenCalled();
  });

  it('should join array messages with semicolon', () => {
    filter.catch(
      new HttpException(
        { message: ['Error 1', 'Error 2'] },
        HttpStatus.BAD_REQUEST,
      ),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'invalid_request_error', message: 'Error 1; Error 2' },
    });
  });

  it('should map ApiErrorCode.RATE_LIMITED to rate_limit_error regardless of status', () => {
    filter.catch(
      new HttpException(
        { message: 'Rate limited', code: ApiErrorCode.RATE_LIMITED },
        HttpStatus.BAD_REQUEST,
      ),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'rate_limit_error', message: 'Rate limited' },
    });
  });

  it('should map status 429 to rate_limit_error when code is absent', () => {
    filter.catch(
      new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'rate_limit_error', message: 'Too many requests' },
    });
  });

  it('should map 401 to authentication_error', () => {
    filter.catch(
      new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED),
      mockHost,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'authentication_error', message: 'Unauthorized' },
    });
  });

  it('should map 403 to authentication_error', () => {
    filter.catch(
      new HttpException('Forbidden', HttpStatus.FORBIDDEN),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'authentication_error', message: 'Forbidden' },
    });
  });

  it('should map ApiErrorCode.PROVIDER_RATE_LIMITED to rate_limit_error', () => {
    filter.catch(
      new HttpException(
        {
          message: 'Provider rate limited',
          code: ApiErrorCode.PROVIDER_RATE_LIMITED,
        },
        HttpStatus.BAD_REQUEST,
      ),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'rate_limit_error', message: 'Provider rate limited' },
    });
  });

  it('should map ApiErrorCode.TOOLS_NOT_SUPPORTED to invalid_request_error', () => {
    filter.catch(
      new HttpException(
        {
          message: 'Tools not supported',
          code: ApiErrorCode.TOOLS_NOT_SUPPORTED,
        },
        HttpStatus.BAD_REQUEST,
      ),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'invalid_request_error', message: 'Tools not supported' },
    });
  });

  it('should map ApiErrorCode.THINKING_NOT_SUPPORTED to invalid_request_error', () => {
    filter.catch(
      new HttpException(
        {
          message: 'Extended thinking is not supported for this model alias.',
          code: ApiErrorCode.THINKING_NOT_SUPPORTED,
        },
        HttpStatus.BAD_REQUEST,
      ),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: 'Extended thinking is not supported for this model alias.',
      },
    });
  });

  it('should not include ApiErrorCode in Anthropic error response body', () => {
    filter.catch(
      new HttpException(
        { message: 'Validation failed', code: ApiErrorCode.VALIDATION_FAILED },
        HttpStatus.BAD_REQUEST,
      ),
      mockHost,
    );

    const payload = mockResponse.json.mock.calls[0][0];
    expect(payload).toEqual({
      type: 'error',
      error: { type: 'invalid_request_error', message: 'Validation failed' },
    });
    expect(payload.error).not.toHaveProperty('code');
  });

  it('should map 500+ to api_error (not server_error)', () => {
    filter.catch(
      new HttpException('Internal error', HttpStatus.INTERNAL_SERVER_ERROR),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'api_error', message: 'Internal error' },
    });
  });

  it('should default unknown status to api_error', () => {
    filter.catch(new HttpException('Payment required', 402), mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'api_error', message: 'Payment required' },
    });
  });

  it('should handle non-HttpException with default 500 response', () => {
    filter.catch(new Error('Unexpected'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: { type: 'api_error', message: 'An unexpected error occurred.' },
    });
  });

  it('should use default message when HttpException body has no message field', () => {
    filter.catch(
      new HttpException({ error: 'test' } as never, HttpStatus.BAD_REQUEST),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: 'An unexpected error occurred.',
      },
    });
  });
});
