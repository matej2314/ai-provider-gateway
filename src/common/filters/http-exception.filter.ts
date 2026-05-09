import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message;
      code = this.mapHttpStatusToCode(status);
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      requestId: request.requestId || 'unknown',
      details: [],
    });
  }

  private mapHttpStatusToCode(status: number): string {
    const mapping = {
      400: 'VALIDATION_FAILED',
      429: 'PROVIDER_RATE_LIMITED',
      502: 'PROVIDER_UNAVAILABLE',
      504: 'PROVIDER_TIMEOUT',
    };

    return mapping[status] || 'INTERNAL_SERVER_ERROR';
  }
}
