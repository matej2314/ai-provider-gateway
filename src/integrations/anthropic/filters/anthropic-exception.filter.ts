import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AnthropicExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred.';
    let type = 'api_error';

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
      }

      if (status === 401 || status === 403) type = 'authentication_error';
      if (status === 429) type = 'rate_limit_error';
      if (status === 400) type = 'invalid_request_error';
      if (status >= 500) type = 'api_error';
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
