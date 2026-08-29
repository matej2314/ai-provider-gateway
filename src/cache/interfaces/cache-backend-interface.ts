import type {
  CacheKey,
  CacheTtlSeconds,
} from '../../common/types/branded.types';

export interface CacheBackend {
  isAvailable(): boolean;
  get(key: CacheKey): Promise<string | null>;
  set(key: CacheKey, value: string, ttl: CacheTtlSeconds): Promise<boolean>;
  delete(key: CacheKey): Promise<boolean>;
}

export type CACHE_BACKEND_TYPE = 'noop' | 'redis';
