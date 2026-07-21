import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfig } from '../config/typed-config';
import type { CacheBackend } from './interfaces/cache-backend-interface';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class CacheRegistryService {
  private readonly backends = new Map<string, CacheBackend>();
  private readonly logger: LoggingService;
  constructor(
    private readonly config: ConfigService,
    private readonly loggingService: LoggingService,
  ) {
    const logger = this.loggingService.child({
      module: 'CacheRegistryService',
    });
    this.logger = logger;
  }

  register(backendId: string, backend: CacheBackend): void {
    this.backends.set(backendId.toLowerCase(), backend);
  }

  resolve(): CacheBackend {
    const cacheConfig = getAppConfig(this.config, 'cache');
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
