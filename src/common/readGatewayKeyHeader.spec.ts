import { readGatewayKeyHeader } from './readGatewayKeyHeader';
import { asGatewayKey, type GatewayKey } from './types';
import type { Request } from 'express';

function expectGatewayKey(result: GatewayKey | undefined, plain: string): void {
  expect(result).toBe(asGatewayKey(plain));
}

describe('readGatewayKeyHeader', () => {
  describe('Happy path - string header', () => {
    it('should read gateway key from x-gateway-key header', () => {
      const req = {
        header: (name: string) =>
          name === 'x-gateway-key' ? 'gw_test_key_123' : undefined,
        headers: { 'x-gateway-key': 'gw_test_key_123' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_test_key_123');
    });

    it('should trim whitespace from gateway key', () => {
      const req = {
        header: (name: string) =>
          name === 'x-gateway-key' ? '  gw_test_key_123  ' : undefined,
        headers: { 'x-gateway-key': '  gw_test_key_123  ' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_test_key_123');
    });

    it('should read from headers object when header() method returns undefined', () => {
      const req = {
        header: () => undefined,
        headers: { 'x-gateway-key': 'gw_fallback_key' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_fallback_key');
    });
  });

  describe('Happy path - array header (multiple values)', () => {
    it('should take first value from array and trim', () => {
      const req = {
        header: () => undefined,
        headers: {
          'x-gateway-key': ['gw_first_key', 'gw_second_key'],
        },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_first_key');
    });

    it('should trim first array value', () => {
      const req = {
        header: () => undefined,
        headers: {
          'x-gateway-key': ['  gw_key_with_spaces  ', 'gw_other'],
        },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_key_with_spaces');
    });

    it('should handle empty first array element', () => {
      const req = {
        header: () => undefined,
        headers: {
          'x-gateway-key': ['', 'gw_second'],
        },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expect(result).toBeUndefined();
    });
  });

  describe('Edge case - missing header', () => {
    it('should return undefined when header not present', () => {
      const req = {
        header: () => undefined,
        headers: {},
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expect(result).toBeUndefined();
    });

    it('should return undefined when header is null', () => {
      const req = {
        header: () => null,
        headers: { 'x-gateway-key': null },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expect(result).toBeUndefined();
    });

    it('should return undefined when header is undefined', () => {
      const req = {
        header: () => undefined,
        headers: { 'x-gateway-key': undefined },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expect(result).toBeUndefined();
    });
  });

  describe('Edge case - empty/whitespace values', () => {
    it('should return undefined when header is empty', () => {
      const req = {
        header: (name: string) => (name === 'x-gateway-key' ? '' : undefined),
        headers: { 'x-gateway-key': '' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expect(result).toBeUndefined();
    });

    it('should return undefined when header is whitespace only', () => {
      const req = {
        header: (name: string) =>
          name === 'x-gateway-key' ? '   ' : undefined,
        headers: { 'x-gateway-key': '   ' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expect(result).toBeUndefined();
    });

    it('should return undefined when whitespace with tabs/newlines', () => {
      const req = {
        header: (name: string) =>
          name === 'x-gateway-key' ? '\t\n  \r' : undefined,
        headers: { 'x-gateway-key': '\t\n  \r' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expect(result).toBeUndefined();
    });
  });

  describe('Edge case - special characters in key', () => {
    it('should preserve underscores and hyphens', () => {
      const req = {
        header: (name: string) =>
          name === 'x-gateway-key' ? 'gw_test-key_123' : undefined,
        headers: { 'x-gateway-key': 'gw_test-key_123' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_test-key_123');
    });

    it('should preserve alphanumeric and special chars', () => {
      const req = {
        header: (name: string) =>
          name === 'x-gateway-key' ? 'gw_AbC123-xyz.789' : undefined,
        headers: { 'x-gateway-key': 'gw_AbC123-xyz.789' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_AbC123-xyz.789');
    });

    it('should handle base64-like keys', () => {
      const req = {
        header: (name: string) =>
          name === 'x-gateway-key' ? 'gw_dGVzdC9rZXk+PQ==' : undefined,
        headers: { 'x-gateway-key': 'gw_dGVzdC9rZXk+PQ==' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_dGVzdC9rZXk+PQ==');
    });
  });

  describe('Integration - real Express request scenarios', () => {
    it('should work with typical Express request', () => {
      const req = {
        header: function (name: string) {
          return (this as Request).headers[name.toLowerCase()];
        },
        headers: {
          'x-gateway-key': 'gw_production_key_abc123',
          'content-type': 'application/json',
          'user-agent': 'TestClient/1.0',
        },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_production_key_abc123');
    });

    it('should handle case-insensitive header lookup via header()', () => {
      const req = {
        header: (name: string) => {
          const lowerName = name.toLowerCase();
          const headers = { 'x-gateway-key': 'gw_key_123' } as Record<
            string,
            string
          >;
          return headers[lowerName];
        },
        headers: { 'x-gateway-key': 'gw_key_123' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_key_123');
    });

    it('should prioritize header() method over headers object', () => {
      const req = {
        header: (name: string) =>
          name === 'x-gateway-key' ? 'from_header_method' : undefined,
        headers: { 'x-gateway-key': 'from_headers_object' },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'from_header_method');
    });

    it('should handle proxy/load balancer array headers', () => {
      const req = {
        header: () => undefined,
        headers: {
          'x-gateway-key': ['gw_primary', 'gw_backup'],
          'x-forwarded-for': ['192.168.1.1', '10.0.0.1'],
        },
      } as unknown as Request;

      const result = readGatewayKeyHeader(req);

      expectGatewayKey(result, 'gw_primary');
    });
  });
});
