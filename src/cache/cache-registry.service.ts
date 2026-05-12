import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CacheBackend } from './interfaces/cache-backend-interface';

@Injectable()
export class CacheRegistryService {
  private readonly logger = new Logger(CacheRegistryService.name);
  private readonly backends = new Map<string, CacheBackend>();

  constructor(private readonly config: ConfigService) {}

  register(backendId: string, backend: CacheBackend): void {
    this.backends.set(backendId.toLowerCase(), backend);
  }

  resolve(): CacheBackend {
    const cacheConfig = this.config.get<{ backend?: string }>('cache');
    const backendId = (cacheConfig?.backend ?? 'noop').toLowerCase();
    const backend = this.backends.get(backendId);

    if (!backend) {
      this.logger.warn(`Unknown cache backend: ${backendId}`);
      return this.getNoopOrThrow();
    }

    return backend;
  }

  private getNoopOrThrow(): CacheBackend {
    const noop = this.backends.get('noop');
    if (!noop) {
      throw new Error(
        '[CacheRegistryService] cache backend "noop" is required — ensure NoOpCacheBackend runs onModuleInit before resolve()',
      );
    }
    return noop;
  }
}
