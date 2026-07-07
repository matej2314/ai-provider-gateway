import {
  asMaxConcurrentStreams,
  asRateLimitBurst,
  asRateLimitRps,
} from '../../common/types/branded.types';
import type { CliRateLimit } from '../services/cli.services.types';
import type { GatewayClientConfig } from 'src/config/gateway-config.schema';

export const DEFAULT_CLIENT_MAX_CONCURRENT_STREAMS = 3;

export function buildClientRateLimitConfig(
  rateLimit: CliRateLimit,
): NonNullable<GatewayClientConfig['rateLimit']> {
  return {
    rps: asRateLimitRps(rateLimit.rps),
    burst: asRateLimitBurst(rateLimit.burst),
    maxConcurrentStreams: asMaxConcurrentStreams(
      rateLimit.maxConcurrentStreams != null &&
        rateLimit.maxConcurrentStreams > 0
        ? rateLimit.maxConcurrentStreams
        : DEFAULT_CLIENT_MAX_CONCURRENT_STREAMS,
    ),
  };
}
