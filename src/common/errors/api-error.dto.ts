import type { ApiErrorCode } from './api-error.code';

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  requestId?: string;
  details?: unknown[];
}

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.code === 'string' && typeof obj.message === 'string';
}
