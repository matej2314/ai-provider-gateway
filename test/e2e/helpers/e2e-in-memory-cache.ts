import type { CacheBackend } from '../../../src/cache/interfaces/cache-backend-interface';

/** Exact-cache stand-in for E2E (no Redis). Always returns true from `set` (NX noop parity). */
export function createE2eInMemoryCacheBackend(): CacheBackend {
  const store = new Map<string, string>();
  return {
    isAvailable: () => true,
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    set: (key: string, value: string, ttl: number) => {
      void ttl;
      store.set(key, value);
      return Promise.resolve(true);
    },
    delete: (key: string) => Promise.resolve(store.delete(key)),
  };
}
