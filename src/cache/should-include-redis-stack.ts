export function shouldIncludeRedisStack(): boolean {
  return (process.env.CACHE_BACKEND || 'noop').toLowerCase() === 'redis';
}
