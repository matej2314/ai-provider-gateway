import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import {
  isRateLimitStatus,
  isAuthError,
  isServerError,
  isInvalidRequestStatus,
} from '../../../common/errors/errors.utils';

@Catch()
export class AnthropicExceptionFilter implements ExceptionFilter {
  private mapType(status: number, code: string | null): string {
    if (
      code === ApiErrorCode.RATE_LIMITED ||
      code === ApiErrorCode.PROVIDER_RATE_LIMITED
    ) {
      return 'rate_limit_error';
    }

    if (
      code === ApiErrorCode.TOOLS_NOT_SUPPORTED ||
      code === ApiErrorCode.THINKING_NOT_SUPPORTED
    ) {
      return 'invalid_request_error';
    }
    if (isAuthError(status)) return 'authentication_error';
    if (isRateLimitStatus(status)) return 'rate_limit_error';
    if (isInvalidRequestStatus(status)) return 'invalid_request_error';
    if (isServerError(status)) return 'api_error';
    return 'api_error';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred.';
    let type = 'api_error';
    let code: string | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const object = body as Record<string, unknown>;
        const mess = object.message;
        if (Array.isArray(mess)) message = mess.join('; ');
        else if (typeof mess === 'string') message = mess;
        if (typeof object.code === 'string') code = object.code;
      }

      type = this.mapType(status, code);
    }

    res.status(status).json({
      type: 'error',
      error: {
        type,
        message,
      },
    });
  }
}
