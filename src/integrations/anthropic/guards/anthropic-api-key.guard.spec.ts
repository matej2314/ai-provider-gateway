import { Test } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnthropicApiKeyGuard,
  readAnthropicApiKey,
} from './anthropic-api-key.guard';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import { createMockExpressRequest } from '../../../common/mocks/http-mocks';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../../../common/mocks/createMockConfigService';
import { TEST_GATEWAY_KEY } from '../../../common/mocks/test-constants';
import type { Request } from 'express';

describe('readAnthropicApiKey', () => {
  it('should read x-api-key header', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn((name: string) =>
        name === 'x-api-key' ? TEST_GATEWAY_KEY : undefined,
      ),
      headers: { 'x-api-key': TEST_GATEWAY_KEY },
    } as unknown as Partial<Request>) as Request;

    const result = readAnthropicApiKey(mockRequest);

    expect(result).toBe(TEST_GATEWAY_KEY);
  });

  it('should trim x-api-key', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn((name: string) =>
        name === 'x-api-key' ? `  ${TEST_GATEWAY_KEY}  ` : undefined,
      ),
      headers: { 'x-api-key': `  ${TEST_GATEWAY_KEY}  ` },
    } as unknown as Partial<Request>) as Request;

    const result = readAnthropicApiKey(mockRequest);

    expect(result).toBe(TEST_GATEWAY_KEY);
  });

  it('should fallback to Bearer token when x-api-key missing', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn((name: string) =>
        name === 'authorization' ? 'Bearer gw_token_123' : undefined,
      ),
      headers: { authorization: 'Bearer gw_token_123' },
    } as unknown as Partial<Request>) as Request;

    const result = readAnthropicApiKey(mockRequest);

    expect(result).toBe('gw_token_123');
  });

  it('should prioritize x-api-key over Bearer', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn((name: string) => {
        if (name === 'x-api-key') return 'gw_key_from_xapi';
        if (name === 'authorization') return 'Bearer gw_token_bearer';
        return undefined;
      }),
      headers: {
        'x-api-key': 'gw_key_from_xapi',
        authorization: 'Bearer gw_token_bearer',
      },
    } as unknown as Partial<Request>) as Request;

    const result = readAnthropicApiKey(mockRequest);

    expect(result).toBe('gw_key_from_xapi');
  });

  it('should return undefined when both missing', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn().mockReturnValue(undefined),
      headers: {},
    } as unknown as Partial<Request>) as Request;

    const result = readAnthropicApiKey(mockRequest);

    expect(result).toBeUndefined();
  });
});

describe('AnthropicApiKeyGuard', () => {
  let guard: AnthropicApiKeyGuard;

  async function initGuard(
    configOptions: MockConfigServiceOptions = {},
  ) {
    const mockConfig = createMockConfigService(configOptions);

    const module = await Test.createTestingModule({
      providers: [
        AnthropicApiKeyGuard,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    guard = module.get(AnthropicApiKeyGuard);
  }

  beforeEach(async () => {
    await initGuard();
  });

  const createMockContext = (
    headers: Record<string, string> = {},
    requestId = 'req-123',
  ): ExecutionContext => {
    const mockRequest = createMockExpressRequest({
      requestId,
      gatewayKey: undefined,
      header: jest.fn((name: string) => headers[name.toLowerCase()]),
      headers,
    } as unknown as Partial<Request>);

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  };

  describe('Happy path - valid key', () => {
    it('should allow when x-api-key in allowList', async () => {
      await initGuard({
        gatewayKey: { allowList: ['gw_valid_key'], clients: [] },
      });

      const context = createMockContext({ 'x-api-key': 'gw_valid_key' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow when Bearer token in allowList', async () => {
      await initGuard({
        gatewayKey: { allowList: ['gw_valid_token'], clients: [] },
      });

      const context = createMockContext({
        authorization: 'Bearer gw_valid_token',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should set gatewayKey on request', () => {
      const mockRequest = createMockExpressRequest({
        gatewayKey: undefined,
        requestId: 'req-123',
        header: jest.fn((name: string) =>
          name === 'x-api-key' ? TEST_GATEWAY_KEY : undefined,
        ),
        headers: { 'x-api-key': TEST_GATEWAY_KEY },
      } as unknown as Partial<Request>);

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      guard.canActivate(context);

      expect(mockRequest.gatewayKey).toBe(TEST_GATEWAY_KEY);
    });
  });

  describe('Edge case - missing key', () => {
    it('should throw UnauthorizedException when both headers missing', async () => {
      await initGuard({
        gatewayKey: { allowList: ['gw_key'], clients: [] },
      });

      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);

      try {
        guard.canActivate(context);
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 401,
          code: ApiErrorCode.GATEWAY_KEY_MISSING,
          message: expect.stringContaining('x-api-key or Authorization'),
        });
      }
    });
  });

  describe('Edge case - invalid key', () => {
    it('should throw ForbiddenException when key not in allowList', async () => {
      await initGuard({
        gatewayKey: { allowList: ['gw_valid_key'], clients: [] },
      });

      const context = createMockContext({ 'x-api-key': 'gw_invalid_key' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      try {
        guard.canActivate(context);
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 403,
          code: ApiErrorCode.GATEWAY_KEY_INVALID,
          message: expect.stringContaining('Invalid API key'),
        });
      }
    });
  });

  describe('Edge case - allowList not configured', () => {
    it('should throw InternalServerErrorException when allowList empty', async () => {
      await initGuard({
        gatewayKey: { allowList: [], clients: [] },
      });

      const context = createMockContext({ 'x-api-key': 'gw_key' });

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

  describe('Integration - Anthropic-compatible auth', () => {
    it('should work with x-api-key (Anthropic standard)', async () => {
      await initGuard({
        gatewayKey: { allowList: ['sk-ant-key123'], clients: [] },
      });

      const context = createMockContext({ 'x-api-key': 'sk-ant-key123' });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should work with Bearer (OpenAI-compatible fallback)', async () => {
      await initGuard({
        gatewayKey: { allowList: ['sk-ant-key123'], clients: [] },
      });

      const context = createMockContext({
        authorization: 'Bearer sk-ant-key123',
      });

      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
