import { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const createMockContext = (
  headers: Record<string, string> = {},
  requestId = 'req-123',
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
