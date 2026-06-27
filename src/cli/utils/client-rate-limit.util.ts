import type { CliRateLimit } from '../services/cli.services.types';
import type { GatewayClientConfig } from 'src/config/gateway-config.schema';

export const DEFAULT_CLIENT_MAX_CONCURRENT_STREAMS = 3;

export function buildClientRateLimitConfig(
  rateLimit: CliRateLimit,
): NonNullable<GatewayClientConfig['rateLimit']> {
  return {
    rps: rateLimit.rps,
    burst: rateLimit.burst,
    maxConcurrentStreams:
      rateLimit.maxConcurrentStreams != null &&
      rateLimit.maxConcurrentStreams > 0
        ? rateLimit.maxConcurrentStreams
        : DEFAULT_CLIENT_MAX_CONCURRENT_STREAMS,
  };
}
