import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiErrorCode,
  DEFAULT_HTTP_STATUS_TO_CODE,
} from '../errors/api-error.code';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ApiErrorCode.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.mapHttpStatusToCode(status);
      } else if (
        exceptionResponse &&
        typeof exceptionResponse === 'object' &&
        !Array.isArray(exceptionResponse)
      ) {
        const body = exceptionResponse as Record<string, unknown>;
        message = this.normalizeMessage(body.message);
        details = Array.isArray(body.details) ? body.details : [];
        code =
          typeof body.code === 'string'
            ? body.code
            : this.mapHttpStatusToCode(status);

        const requestId = body.requestId;
        if (typeof requestId === 'string' && requestId.trim()) {
          request.requestId = requestId.trim();
        }
      } else {
        code = this.mapHttpStatusToCode(status);
      }
    }

    const requestId =
      (typeof request.requestId === 'string' && request.requestId) || 'unknown';

    response.status(status).json({
      statusCode: status,
      code,
      message: Array.isArray(message) ? message.join('; ') : message,
      requestId,
      details,
    });
  }

  private normalizeMessage(message: unknown): string | string[] {
    if (Array.isArray(message)) {
      return message.every((m) => typeof m === 'string')
        ? (message as string[])
        : 'An unexpected error occurred';
    }
    if (typeof message === 'string') return message;
    return 'An unexpected error occurred';
  }

  private mapHttpStatusToCode(status: number): string {
    return (
      DEFAULT_HTTP_STATUS_TO_CODE[status] ?? ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
}
