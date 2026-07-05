import type { Request, Response } from 'express';
import { asGatewayKey } from '../types';

export function createMockExpressRequest(
  overrides?: Partial<Request>,
): Partial<Request> {
  return {
    requestId: 'req_123',
    gatewayKey: asGatewayKey('gw_test_key'),
    header: jest.fn(),
    headers: {},
    ...overrides,
  };
}

export function createMockExpressResponse(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    write: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    flushHeaders: jest.fn(),
  };
}
