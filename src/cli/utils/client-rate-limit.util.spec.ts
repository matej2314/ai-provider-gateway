import {
  buildClientRateLimitConfig,
  DEFAULT_CLIENT_MAX_CONCURRENT_STREAMS,
} from './client-rate-limit.util';
import {
  asMaxConcurrentStreams,
  asRateLimitBurst,
  asRateLimitRps,
} from '../../common/types/branded.types';

describe('client-rate-limit.util', () => {
  it('defaults maxConcurrentStreams to 3 when omitted', () => {
    expect(
      buildClientRateLimitConfig({
        rps: asRateLimitRps(10),
        burst: asRateLimitBurst(20),
      }),
    ).toEqual({
      rps: 10,
      burst: 20,
      maxConcurrentStreams: DEFAULT_CLIENT_MAX_CONCURRENT_STREAMS,
    });
  });

  it('uses explicit maxConcurrentStreams when provided', () => {
    expect(
      buildClientRateLimitConfig({
        rps: asRateLimitRps(10),
        burst: asRateLimitBurst(20),
        maxConcurrentStreams: asMaxConcurrentStreams(5),
      }),
    ).toEqual({ rps: 10, burst: 20, maxConcurrentStreams: 5 });
  });
});
