import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../errors/api-error.code';
import type { ApiErrorPayload } from '../errors/api-error.dto';

export class UnsupportedProviderException extends HttpException {
  constructor(message = 'Provider type is not registered in gateway') {
    const body: ApiErrorPayload = {
      code: ApiErrorCode.PROVIDER_UNSUPPORTED,
      message,
      details: [],
    };
    super(body, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
