export function readNumericStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const obj = error as Record<string, unknown>;

  const status = obj['status'];
  if (typeof status === 'number' && Number.isFinite(status)) return status;

  const nested = obj['response'];

  if (nested && typeof nested === 'object') {
    const responseStatus = (nested as Record<string, unknown>)['status'];
    if (typeof responseStatus === 'number' && Number.isFinite(responseStatus))
      return responseStatus;
  }
  return undefined;
}

export function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export function nameLooksLikeTimeout(error: unknown): boolean {
  const name = error instanceof Error ? error.name : '';
  return name === 'AbortError' || name === 'TimeoutError';
}
