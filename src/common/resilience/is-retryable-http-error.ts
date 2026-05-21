import { HttpException } from '@nestjs/common';

export function isRetryableHttpError(
  error: unknown,
  onStatus: number[] = [429, 500, 502, 503, 504],
): boolean {
  if (!(error instanceof HttpException)) {
    return false;
  }

  const status = error.getStatus();
  return onStatus.includes(status);
}
