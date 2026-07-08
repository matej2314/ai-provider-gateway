import { of, throwError, lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Request } from 'express';
import { StreamCleanupInterceptor } from './stream-cleanup.interceptor';
import { createMockSmartRateLimiter } from '../mocks/createMockSmartRateLimiter';
import type { SmartRateLimiterService } from '../../rate-limit/smart-rate-limiter.service';
import { asGatewayKey } from '../types';

function createExecutionContext(
  reqOverrides: Partial<Request> = {},
): ExecutionContext {
  const req = {
    url: '/api/v1/chat/stream',
    header: jest.fn().mockReturnValue(undefined),
    headers: {},
    ...reqOverrides,
  } as unknown as Request;

  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as ExecutionContext;
}

function createCallHandler(source: Observable<unknown>): CallHandler {
  return { handle: () => source };
}

describe('StreamCleanupInterceptor', () => {
  let rateLimiter: Partial<SmartRateLimiterService>;
  let interceptor: StreamCleanupInterceptor;

  beforeEach(() => {
    rateLimiter = createMockSmartRateLimiter();
    interceptor = new StreamCleanupInterceptor(
      rateLimiter as SmartRateLimiterService,
    );
  });

  describe('successful completion', () => {
    it('releases the stream slot when url ends with /stream and gatewayKey comes from the facade (req.gatewayKey)', async () => {
      const context = createExecutionContext({
        url: '/api/v1/chat/stream',
        gatewayKey: asGatewayKey('gw_facade_key'),
      });

      await lastValueFrom(
        interceptor.intercept(context, createCallHandler(of('chunk'))),
      );

      expect(rateLimiter.releaseStream).toHaveBeenCalledTimes(1);
      expect(rateLimiter.releaseStream).toHaveBeenCalledWith(
        asGatewayKey('gw_facade_key'),
      );
    });

    it('falls back to the x-gateway-key header when req.gatewayKey is not set', async () => {
      const context = createExecutionContext({
        url: '/api/v1/chat/stream',
        gatewayKey: undefined,
        header: jest
          .fn()
          .mockImplementation((name: string) =>
            name === 'x-gateway-key' ? 'gw_header_key' : undefined,
          ),
      });

      await lastValueFrom(
        interceptor.intercept(context, createCallHandler(of('chunk'))),
      );

      expect(rateLimiter.releaseStream).toHaveBeenCalledWith(
        asGatewayKey('gw_header_key'),
      );
    });

    it('prefers req.gatewayKey over the header when both are present', async () => {
      const context = createExecutionContext({
        url: '/api/v1/chat/stream',
        gatewayKey: asGatewayKey('gw_facade_key'),
        header: jest
          .fn()
          .mockImplementation((name: string) =>
            name === 'x-gateway-key' ? 'gw_header_key' : undefined,
          ),
      });

      await lastValueFrom(
        interceptor.intercept(context, createCallHandler(of('chunk'))),
      );

      expect(rateLimiter.releaseStream).toHaveBeenCalledWith(
        asGatewayKey('gw_facade_key'),
      );
    });

    it('propagates the emitted value unchanged', async () => {
      const context = createExecutionContext({
        gatewayKey: asGatewayKey('gw_facade_key'),
      });

      const result = await lastValueFrom(
        interceptor.intercept(context, createCallHandler(of('payload'))),
      );

      expect(result).toBe('payload');
    });
  });

  describe('non-streaming requests', () => {
    it('does not release a stream slot when the url does not end with /stream', async () => {
      const context = createExecutionContext({
        url: '/api/v1/chat',
        gatewayKey: asGatewayKey('gw_facade_key'),
      });

      await lastValueFrom(
        interceptor.intercept(context, createCallHandler(of('chunk'))),
      );

      expect(rateLimiter.releaseStream).not.toHaveBeenCalled();
    });

    it('does not treat a url as streaming when a query string follows the /stream segment', async () => {
      const context = createExecutionContext({
        url: '/api/v1/chat/stream?foo=1',
        gatewayKey: asGatewayKey('gw_facade_key'),
      });

      await lastValueFrom(
        interceptor.intercept(context, createCallHandler(of('chunk'))),
      );

      expect(rateLimiter.releaseStream).not.toHaveBeenCalled();
    });

    it('does not throw when req.url is undefined', async () => {
      const context = createExecutionContext({
        url: undefined,
        gatewayKey: asGatewayKey('gw_facade_key'),
      });

      await lastValueFrom(
        interceptor.intercept(context, createCallHandler(of('chunk'))),
      );

      expect(rateLimiter.releaseStream).not.toHaveBeenCalled();
    });
  });

  describe('missing gateway key', () => {
    it('does not release a stream slot when no gatewayKey can be resolved, even for a /stream url', async () => {
      const context = createExecutionContext({
        url: '/api/v1/chat/stream',
        gatewayKey: undefined,
        header: jest.fn().mockReturnValue(undefined),
      });

      await lastValueFrom(
        interceptor.intercept(context, createCallHandler(of('chunk'))),
      );

      expect(rateLimiter.releaseStream).not.toHaveBeenCalled();
    });
  });

  describe('error propagation', () => {
    it('still releases the stream slot when the handler observable errors, and rethrows the original error', async () => {
      const context = createExecutionContext({
        url: '/api/v1/chat/stream',
        gatewayKey: asGatewayKey('gw_facade_key'),
      });
      const boom = new Error('provider failed mid-stream');

      await expect(
        lastValueFrom(
          interceptor.intercept(
            context,
            createCallHandler(throwError(() => boom)),
          ),
        ),
      ).rejects.toThrow(boom);

      expect(rateLimiter.releaseStream).toHaveBeenCalledTimes(1);
      expect(rateLimiter.releaseStream).toHaveBeenCalledWith(
        asGatewayKey('gw_facade_key'),
      );
    });

    it('does not call releaseStream on error for a non-streaming url', async () => {
      const context = createExecutionContext({
        url: '/api/v1/chat',
        gatewayKey: asGatewayKey('gw_facade_key'),
      });
      const boom = new Error('validation failed');

      await expect(
        lastValueFrom(
          interceptor.intercept(
            context,
            createCallHandler(throwError(() => boom)),
          ),
        ),
      ).rejects.toThrow(boom);

      expect(rateLimiter.releaseStream).not.toHaveBeenCalled();
    });
  });
});
