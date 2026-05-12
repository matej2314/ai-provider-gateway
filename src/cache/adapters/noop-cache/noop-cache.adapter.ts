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

  async get(_key: string): Promise<string | null> {
    return null;
  }

  async set(
    _key: string,
    _value: string,
    _ttlSeconds?: number,
  ): Promise<boolean> {
    return false;
  }

  async delete(_key: string): Promise<boolean> {
    return false;
  }
}
