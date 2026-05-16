import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import {
  ApiErrorCode,
  DEFAULT_HTTP_STATUS_TO_CODE,
} from '../errors/api-error.code';
import { LoggingService } from '../../logging/logging.service';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

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

    const normalizedMessage = Array.isArray(message)
      ? message.join('; ')
      : message;

    if (status >= 500 || !(exception instanceof HttpException)) {
      const err =
        exception instanceof Error
          ? exception
          : new Error(
              typeof exception === 'string'
                ? exception
                : 'Unhandled exception',
            );
      this.loggingService.error(normalizedMessage, err, {
        requestId,
        code,
        status,
        module: 'GlobalExceptionFilter',
      });
    }

    response.status(status).json({
      statusCode: status,
      code,
      message: normalizedMessage,
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
