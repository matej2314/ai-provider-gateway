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
import {
  TEST_GATEWAY_KEY,
  TEST_GATEWAY_KEY_BRANDED,
} from '../../../common/mocks/test-constants';
import {
  asClientId,
  asEnvRef,
  asGatewayKey,
  asProviderInstanceId,
} from '../../../common/types/branded.types';
import type { Request } from 'express';

describe('readAnthropicApiKey', () => {
  it('should read and trim x-api-key header', () => {
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

  it('should return undefined when both headers missing', () => {
    const mockRequest = createMockExpressRequest({
      header: jest.fn(() => undefined),
      headers: {},
    }) as Request;

    const result = readAnthropicApiKey(mockRequest);

    expect(result).toBeUndefined();
  });
});

describe('AnthropicApiKeyGuard', () => {
  let guard: AnthropicApiKeyGuard;

  async function initGuard(configOptions: MockConfigServiceOptions = {}) {
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

  describe('Valid key scenarios', () => {
    it('should allow when key is in allowList', () => {
      const mockRequest = createMockExpressRequest({
        header: jest.fn((name: string) =>
          name === 'x-api-key' ? TEST_GATEWAY_KEY : undefined,
        ),
        headers: { 'x-api-key': TEST_GATEWAY_KEY },
      } as unknown as Partial<Request>) as Request;

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should set clientId on request', async () => {
      await initGuard({
        gatewayKey: {
          allowList: [TEST_GATEWAY_KEY_BRANDED],
          clients: [
            {
              instanceId: asProviderInstanceId('claude-client'),
              name: 'claude-client',
              type: 'ide',
              gatewayKeyRef: asEnvRef('CLAUDE_CLIENT_GATEWAY_KEY'),
              gatewayKey: TEST_GATEWAY_KEY_BRANDED,
            },
          ],
        },
      });

      const mockRequest = createMockExpressRequest({
        clientId: undefined,
        header: jest.fn((name: string) =>
          name === 'x-api-key' ? TEST_GATEWAY_KEY : undefined,
        ),
        headers: { 'x-api-key': TEST_GATEWAY_KEY },
      } as unknown as Partial<Request>) as Request;

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      guard.canActivate(context);

      expect(mockRequest.clientId).toBe(asClientId('claude-client'));
    });
  });

  describe('Missing key scenarios', () => {
    it('should throw UnauthorizedException when header missing', () => {
      const mockRequest = createMockExpressRequest({
        header: jest.fn(() => undefined),
        headers: {},
      }) as Request;

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);

      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 401,
          code: ApiErrorCode.GATEWAY_KEY_MISSING,
        });
      }
    });
  });

  describe('Invalid key scenarios', () => {
    it('should throw ForbiddenException when key not in allowList', async () => {
      await initGuard({
        gatewayKey: {
          allowList: [asGatewayKey('gw_some_other_valid_key')],
          clients: [],
        },
      });

      const mockRequest = createMockExpressRequest({
        header: jest.fn((name: string) =>
          name === 'x-api-key' ? 'gw_invalid_key' : undefined,
        ),
        headers: { 'x-api-key': 'gw_invalid_key' },
      } as unknown as Partial<Request>) as Request;

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 403,
          code: ApiErrorCode.GATEWAY_KEY_INVALID,
        });
      }
    });
  });

  describe('Configuration errors', () => {
    it('should throw InternalServerErrorException when no clients configured', async () => {
      await initGuard({ gatewayKey: { allowList: [], clients: [] } });

      const mockRequest = createMockExpressRequest({
        header: jest.fn((name: string) =>
          name === 'x-api-key' ? TEST_GATEWAY_KEY : undefined,
        ),
        headers: { 'x-api-key': TEST_GATEWAY_KEY },
      } as unknown as Partial<Request>) as Request;

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(
        InternalServerErrorException,
      );
    });
  });
});
