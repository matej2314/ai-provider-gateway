import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiErrorCode } from 'src/common/errors/api-error.code';

@Catch()
export class OpenAiExceptionFilter implements ExceptionFilter {
  private mapType(status: number, code: string | null): string {
    if (
      code === ApiErrorCode.RATE_LIMITED ||
      code === ApiErrorCode.PROVIDER_RATE_LIMITED
    ) {
      return 'rate_limit_error';
    }

    if (status === 401 || status === 403) return 'authentication_error';
    if (status === 400) return 'invalid_request_error';
    if (status >= 500) return 'server_error';
    return 'invalid_request_error';
  }
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let type = 'server_error';
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

    if (req.requestId) {
      res.setHeader('x-request-id', req.requestId);
    }

    res.status(status).join({
      error: {
        message,
        type,
        param: null,
        code,
      },
    });
  }
}
