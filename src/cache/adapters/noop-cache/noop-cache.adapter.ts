import { Injectable, OnModuleInit } from '@nestjs/common';
import { CacheBackend } from '../../interfaces/cache-backend-interface';
import { CacheRegistryService } from '../../cache-registry.service';
import type {
  CacheKey,
  CacheTtlSeconds,
} from '../../../common/types/branded.types';

@Injectable()
export class NoOpCacheBackend implements CacheBackend, OnModuleInit {
  constructor(private readonly registry: CacheRegistryService) {}

  onModuleInit(): void {
    this.registry.register('noop', this);
  }

  isAvailable(): boolean {
    return false;
  }

  get(_key: CacheKey): Promise<string | null> {
    return Promise.resolve(null);
  }

  set(
    _key: CacheKey,
    _value: string,
    _ttlSeconds?: CacheTtlSeconds,
  ): Promise<boolean> {
    return Promise.resolve(false);
  }

  delete(_key: CacheKey): Promise<boolean> {
    return Promise.resolve(false);
  }
}
