import { Injectable, OnModuleInit } from '@nestjs/common';
import { CacheBackend } from '../../interfaces/cache-backend-interface';
import { CacheRegistryService } from '../../cache-registry.service';

@Injectable()
export class NoOpCacheBackend implements CacheBackend, OnModuleInit {
  constructor(private readonly registry: CacheRegistryService) {}

  onModuleInit(): void {
    this.registry.register('noop', this);
  }

  isAvailable(): boolean {
    return false;
  }

  get(_key: string): Promise<string | null> {
    return Promise.resolve(null);
  }

  set(_key: string, _value: string, _ttlSeconds?: number): Promise<boolean> {
    return Promise.resolve(false);
  }

  delete(_key: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}
