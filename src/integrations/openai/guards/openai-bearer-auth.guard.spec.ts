import { Test } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiBearerAuthGuard } from './openai-bearer-auth.guard';
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

  describe('Valid token scenarios', () => {
    it('should allow when token is in allowList', () => {
      const mockRequest = createMockExpressRequest({
        header: jest.fn((name: string) =>
          name === 'authorization' ? `Bearer ${TEST_GATEWAY_KEY}` : undefined,
        ),
        headers: { authorization: `Bearer ${TEST_GATEWAY_KEY}` },
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
              instanceId: asProviderInstanceId('openai-client'),
              name: 'openai-client',
              type: 'ide',
              gatewayKeyRef: asEnvRef('OPENAI_CLIENT_GATEWAY_KEY'),
              gatewayKey: TEST_GATEWAY_KEY_BRANDED,
            },
          ],
        },
      });

      const mockRequest = createMockExpressRequest({
        clientId: undefined,
        header: jest.fn((name: string) =>
          name === 'authorization' ? `Bearer ${TEST_GATEWAY_KEY}` : undefined,
        ),
        headers: { authorization: `Bearer ${TEST_GATEWAY_KEY}` },
      } as unknown as Partial<Request>) as Request;

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      guard.canActivate(context);

      expect(mockRequest.clientId).toBe(asClientId('openai-client'));
    });
  });

  describe('Missing token scenarios', () => {
    it('should throw UnauthorizedException when Authorization header missing', () => {
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

  describe('Invalid token scenarios', () => {
    it('should throw ForbiddenException when token not in allowList', async () => {
      await initGuard({
        gatewayKey: {
          allowList: [asGatewayKey('gw_some_other_valid_key')],
          clients: [],
        },
      });

      const mockRequest = createMockExpressRequest({
        header: jest.fn((name: string) =>
          name === 'authorization' ? 'Bearer gw_invalid_token' : undefined,
        ),
        headers: { authorization: 'Bearer gw_invalid_token' },
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
          name === 'authorization' ? `Bearer ${TEST_GATEWAY_KEY}` : undefined,
        ),
        headers: { authorization: `Bearer ${TEST_GATEWAY_KEY}` },
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
