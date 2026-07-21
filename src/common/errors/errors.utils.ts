import { HttpException } from '@nestjs/common';

export function isProviderRateLimitError(
  error: unknown,
): error is HttpException {
  return error instanceof HttpException && error.getStatus() === 429;
}

export function isRateLimitStatus(status: number | undefined): boolean {
  return !!status && status === 429;
}

export function isClientError(status: number | undefined): boolean {
  return !!status && status >= 400 && status <= 499;
}

export function isAuthError(status: number | undefined): boolean {
  return !!status && (status === 401 || status === 403);
}

export function isTimeoutStatus(status: number | undefined): boolean {
  return !!status && (status === 408 || status === 504);
}

export function isServerError(status: number | undefined): boolean {
  return !!status && status >= 500 && status <= 599;
}

export function isInvalidRequestStatus(status: number | undefined): boolean {
  return !!status && status === 400;
}
