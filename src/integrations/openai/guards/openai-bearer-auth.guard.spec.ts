import { Test } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OpenAiBearerAuthGuard,
  readBearerToken,
} from './openai-bearer-auth.guard';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { createMockContext } from '../../../common/mocks/createMockContext';
import { createMockExpressRequest } from '../../../common/mocks/http-mocks';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../../../common/mocks/createMockConfigService';
import type { Request } from 'express';

describe('readBearerToken', () => {
  it('should extract Bearer token', () => {
    const mockRequest = createMockExpressRequest({
      requestId: 'req-123',
      header: jest.fn().mockReturnValue('Bearer gw_token_123'),
      headers: { authorization: 'Bearer gw_token_123' },
    }) as Request;

    const result = readBearerToken(mockRequest);

    expect(result).toBe('gw_token_123');
  });

  it('should trim token', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn().mockReturnValue('Bearer   gw_token_123   '),
      headers: { authorization: 'Bearer   gw_token_123   ' },
    }) as Request;

    const result = readBearerToken(mockRequest);

    expect(result).toBe('gw_token_123');
  });

  it('should be case-insensitive for Bearer', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn().mockReturnValue('bearer gw_token_123'),
      headers: { authorization: 'bearer gw_token_123' },
    }) as Request;

    const result = readBearerToken(mockRequest);

    expect(result).toBe('gw_token_123');
  });

  it('should return undefined when no Bearer prefix', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn().mockReturnValue('gw_token_123'),
      headers: { authorization: 'gw_token_123' },
    }) as Request;

    const result = readBearerToken(mockRequest);

    expect(result).toBeUndefined();
  });

  it('should return undefined when header missing', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn().mockReturnValue(undefined),
      headers: {},
    }) as Request;

    const result = readBearerToken(mockRequest);

    expect(result).toBeUndefined();
  });

  it('should handle array headers', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn().mockReturnValue(undefined),
      headers: { authorization: ['Bearer gw_token_123'] },
    } as unknown as Partial<Request>) as Request;

    const result = readBearerToken(mockRequest);

    expect(result).toBe('gw_token_123');
  });
});

describe('OpenAiBearerAuthGuard', () => {
  let guard: OpenAiBearerAuthGuard;

  async function initGuard(configOptions: MockConfigServiceOptions = {}) {
    const mockConfig = createMockConfigService(configOptions);

    const module = await Test.createTestingModule({
      providers: [
        OpenAiBearerAuthGuard,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    guard = module.get(OpenAiBearerAuthGuard);
  }

  beforeEach(async () => {
    await initGuard();
  });

  describe('Happy path - valid token', () => {
    it('should allow when token in allowList', async () => {
      await initGuard({
        gatewayKey: { allowList: ['gw_valid_token'], clients: [] },
      });

      const context = createMockContext({
        authorization: 'Bearer gw_valid_token',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should set gatewayKey on request', async () => {
      await initGuard({
        gatewayKey: { allowList: ['gw_token_123'], clients: [] },
      });

      const mockRequest = createMockExpressRequest({
        gatewayKey: undefined,
        requestId: 'req-123',
        header: jest.fn().mockReturnValue('Bearer gw_token_123'),
        headers: { authorization: 'Bearer gw_token_123' },
      });

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      guard.canActivate(context);

      expect(mockRequest.gatewayKey).toBe('gw_token_123');
    });
  });

  describe('Edge case - missing token', () => {
    it('should throw UnauthorizedException when header missing', async () => {
      await initGuard({
        gatewayKey: { allowList: ['gw_token'], clients: [] },
      });

      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);

      try {
        guard.canActivate(context);
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 401,
          code: ApiErrorCode.GATEWAY_KEY_MISSING,
          message: expect.stringContaining('Missing Authorization'),
        });
      }
    });

    it('should throw when Bearer prefix missing', async () => {
      await initGuard({
        gatewayKey: { allowList: ['gw_token'], clients: [] },
      });

      const context = createMockContext({ authorization: 'gw_token_123' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('Edge case - invalid token', () => {
    it('should throw ForbiddenException when token not in allowList', async () => {
      await initGuard({
        gatewayKey: { allowList: ['gw_valid_token'], clients: [] },
      });

      const context = createMockContext({
        authorization: 'Bearer gw_invalid_token',
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      try {
        guard.canActivate(context);
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 403,
          code: ApiErrorCode.GATEWAY_KEY_INVALID,
          message: expect.stringContaining('Invalid'),
        });
      }
    });
  });

  describe('Edge case - allowList not configured', () => {
    it('should throw InternalServerErrorException when allowList empty', async () => {
      await initGuard({
        gatewayKey: { allowList: [], clients: [] },
      });

      const context = createMockContext({ authorization: 'Bearer gw_token' });

      expect(() => guard.canActivate(context)).toThrow(
        InternalServerErrorException,
      );

      try {
        guard.canActivate(context);
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 500,
          code: ApiErrorCode.GATEWAY_KEY_NOT_CONFIGURED,
        });
      }
    });
  });
});
