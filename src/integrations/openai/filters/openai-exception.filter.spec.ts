jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

import { OpenAiExceptionFilter } from './openai-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';

describe('OpenAiExceptionFilter', () => {
  let filter: OpenAiExceptionFilter;
  let mockRequest: { requestId?: string };
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
    setHeader: jest.Mock;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new OpenAiExceptionFilter();
    mockRequest = { requestId: 'req_123' };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ArgumentsHost;
  });

  it('should format HttpException and set x-request-id header', () => {
    filter.catch(
      new HttpException('Invalid input', HttpStatus.BAD_REQUEST),
      mockHost,
    );

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'req_123',
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        message: 'Invalid input',
        type: 'invalid_request_error',
        param: null,
        code: null,
      },
    });
  });

  it('should include ApiErrorCode in response code field', () => {
    filter.catch(
      new HttpException(
        { message: 'Validation failed', code: ApiErrorCode.VALIDATION_FAILED },
        HttpStatus.BAD_REQUEST,
      ),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        message: 'Validation failed',
        type: 'invalid_request_error',
        param: null,
        code: ApiErrorCode.VALIDATION_FAILED,
      },
    });
  });

  it('should map RATE_LIMITED code to rate_limit_error', () => {
    filter.catch(
      new HttpException(
        { message: 'Rate limit', code: ApiErrorCode.RATE_LIMITED },
        HttpStatus.BAD_REQUEST,
      ),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ type: 'rate_limit_error' }),
      }),
    );
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
      error: {
        message: 'Tools not supported',
        type: 'invalid_request_error',
        param: null,
        code: ApiErrorCode.TOOLS_NOT_SUPPORTED,
      },
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
      error: {
        message: 'Extended thinking is not supported for this model alias.',
        type: 'invalid_request_error',
        param: null,
        code: ApiErrorCode.THINKING_NOT_SUPPORTED,
      },
    });
  });

  it('should map bare 429 status to invalid_request_error (no explicit 429 branch)', () => {
    filter.catch(
      new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        message: 'Too many requests',
        type: 'invalid_request_error',
        param: null,
        code: null,
      },
    });
  });

  it('should map 500+ to server_error', () => {
    filter.catch(
      new HttpException('Internal', HttpStatus.INTERNAL_SERVER_ERROR),
      mockHost,
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        message: 'Internal',
        type: 'server_error',
        param: null,
        code: null,
      },
    });
  });

  it('should not set x-request-id when requestId is missing', () => {
    mockRequest.requestId = undefined;
    filter.catch(new HttpException('Error', HttpStatus.BAD_REQUEST), mockHost);
    expect(mockResponse.setHeader).not.toHaveBeenCalled();
  });

  it('should handle non-HttpException with server_error defaults', () => {
    filter.catch(new Error('boom'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        message: 'An unexpected error occurred',
        type: 'server_error',
        param: null,
        code: null,
      },
    });
  });
});
