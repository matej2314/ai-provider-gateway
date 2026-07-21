import type { INestApplication } from '@nestjs/common';
import type { SmartRateLimiterService } from '../../../src/rate-limit/smart-rate-limiter.service';
import type { MockConfigServiceOptions } from '../../../src/common/mocks/createMockConfigService';
import type { E2eProviderRegistryMock } from '../../e2e/helpers/e2e-provider-registry';
import {
  closeE2eApp,
  createE2eApp,
  withE2eApp,
  type E2eAppContext,
  type CreateE2eAppOptions,
} from '../../e2e/helpers/create-e2e-app';

export type CreateSecurityAppOptions = {
  config?: MockConfigServiceOptions;
  providerRegistry?: E2eProviderRegistryMock;
  rateLimiter?: Partial<SmartRateLimiterService>;
  /** When true, applies `helmet()` before `setupApp()` — same order as `src/main.ts`. */
  applyHelmet?: boolean;
};

export type SecurityAppContext = E2eAppContext;

function toE2eOptions(
  options: CreateSecurityAppOptions = {},
): CreateE2eAppOptions {
  return {
    config: options.config,
    providerRegistry: options.providerRegistry,
    rateLimiter: options.rateLimiter,
    applyHelmet: options.applyHelmet,
  };
}

export async function createSecurityApp(
  options: CreateSecurityAppOptions = {},
): Promise<SecurityAppContext> {
  return createE2eApp(toE2eOptions(options));
}

export async function closeSecurityApp(app: INestApplication): Promise<void> {
  return closeE2eApp(app);
}

export async function withSecurityApp<T>(
  options: CreateSecurityAppOptions,
  run: (context: SecurityAppContext) => Promise<T>,
): Promise<T> {
  return withE2eApp(toE2eOptions(options), run);
}
