import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import type { ModelAlias } from '../../common/types/branded.types';

export function assertNoFallbackCycle(
  primaryAlias: ModelAlias,
  fallbackAlias?: ModelAlias,
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
