import {
  buildClientRateLimitConfig,
  DEFAULT_CLIENT_MAX_CONCURRENT_STREAMS,
} from './client-rate-limit.util';

describe('client-rate-limit.util', () => {
  it('defaults maxConcurrentStreams to 3 when omitted', () => {
    expect(buildClientRateLimitConfig({ rps: 10, burst: 20 })).toEqual({
      rps: 10,
      burst: 20,
      maxConcurrentStreams: DEFAULT_CLIENT_MAX_CONCURRENT_STREAMS,
    });
  });

  it('uses explicit maxConcurrentStreams when provided', () => {
    expect(
      buildClientRateLimitConfig({
        rps: 10,
        burst: 20,
        maxConcurrentStreams: 5,
      }),
    ).toEqual({ rps: 10, burst: 20, maxConcurrentStreams: 5 });
  });
});
