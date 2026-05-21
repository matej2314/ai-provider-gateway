import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../errors/api-error.code';

export function assertNoFallbackCycle(
  primaryAlias: string,
  fallbackAlias?: string,
): void {
  if (!fallbackAlias) return;

  if (fallbackAlias === primaryAlias) {
    throw new HttpException(
      {
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Circular fallback detected: alias "${primaryAlias}" cannot fallback to itself`,
        details: [],
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
