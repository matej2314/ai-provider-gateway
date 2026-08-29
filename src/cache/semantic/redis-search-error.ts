export function redisSearchErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function isRedisSearchIndexAlreadyExistsError(err: unknown): boolean {
  return /already exists/i.test(redisSearchErrorMessage(err));
}

export function isRedisSearchMissingIndexError(err: unknown): boolean {
  const msg = redisSearchErrorMessage(err);
  return /unknown index|no such index/i.test(msg);
}

export function isRedisSearchModuleMissingError(err: unknown): boolean {
  return /unknown command/i.test(redisSearchErrorMessage(err));
}
