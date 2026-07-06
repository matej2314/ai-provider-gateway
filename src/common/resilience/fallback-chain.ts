import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../errors/api-error.code';
import type { ModelAlias } from '../types/branded.types';

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
