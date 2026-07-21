import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiErrorCode,
  DEFAULT_HTTP_STATUS_TO_CODE,
} from '../errors/api-error.code';
import { LoggingService } from '../../logging/logging.service';
import { asRequestId } from '../../common/types/branded.types';

type RequestWithId = Request & { requestId: string };

type PayloadTooLargeError = Error & {
  type: 'entity.too.large';
  status: number;
  statusCode: number;
};

function isPayloadTooLargeError(
  exception: unknown,
): exception is PayloadTooLargeError {
  return (
    exception instanceof Error &&
    (exception as Partial<PayloadTooLargeError>).type === 'entity.too.large'
  );
}

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
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
          request.requestId = asRequestId(requestId.trim());
        }
      } else {
        code = this.mapHttpStatusToCode(status);
      }
    } else if (isPayloadTooLargeError(exception)) {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      code = ApiErrorCode.VALIDATION_FAILED;
      message = 'request entity too large';
      details = [];
    }

    const requestId =
      (typeof request.requestId === 'string' && request.requestId) || 'unknown';

    const normalizedMessage = Array.isArray(message)
      ? message.join('; ')
      : message;

    if (status >= 500) {
      const err =
        exception instanceof Error
          ? exception
          : new Error(
              typeof exception === 'string' ? exception : 'Unhandled exception',
            );
      this.loggingService.error(normalizedMessage, err, {
        requestId: asRequestId(requestId),
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
        ? message
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
