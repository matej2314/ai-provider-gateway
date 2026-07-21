import { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { TEST_REQUEST_ID } from './test-constants';

export const createMockContext = (
  headers: Record<string, string> = {},
  requestId = TEST_REQUEST_ID,
): ExecutionContext => {
  const mockRequest = {
    header: jest.fn((name: string) => headers[name.toLowerCase()]),
    headers,
    requestId,
  } as unknown as Partial<Request>;

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as ExecutionContext;
};
