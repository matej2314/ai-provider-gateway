import { Test } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayKeyGuard } from './gateway-key.guard';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { createMockContext } from '../common/mocks/createMockContext';
import { createMockExpressRequest } from '../common/mocks/http-mocks';
import {
  createMockConfigService,
  type MockConfigServiceOptions,
} from '../common/mocks/createMockConfigService';
import { TEST_GATEWAY_KEY } from '../common/mocks/test-constants';
import {
  asClientId,
  asEnvRef,
  asGatewayKey,
  asProviderInstanceId,
  asRequestId,
  type GatewayKey,
} from '../common/types/branded.types';
import type { Request } from 'express';

describe('GatewayKeyGuard', () => {
  let guard: GatewayKeyGuard;

  async function initGuard(configOptions: MockConfigServiceOptions = {}) {
    const mockConfig = createMockConfigService(configOptions);

    const module = await Test.createTestingModule({
      providers: [
        GatewayKeyGuard,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    guard = module.get(GatewayKeyGuard);
  }

  beforeEach(async () => {
    await initGuard();
  });

  describe('Valid key scenarios', () => {
    it('should allow when key is in allowList', () => {
      const context = createMockContext({
        'x-gateway-key': 'gw_valid_key_123',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should set branded GatewayKey on request', () => {
      const mockRequest = createMockExpressRequest({
        gatewayKey: undefined,
        requestId: 'req-123',
        header: jest.fn((name: string) =>
          name === 'x-gateway-key' ? 'gw_valid_key_123' : undefined,
        ),
        headers: { 'x-gateway-key': 'gw_valid_key_123' },
      } as unknown as Partial<Request>);

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      guard.canActivate(context);

      const key: GatewayKey | undefined = mockRequest.gatewayKey;
      expect(key).toBe(asGatewayKey('gw_valid_key_123'));
    });

    it('should set clientId from gateway clients config', async () => {
      await initGuard({
        gatewayKey: {
          allowList: [asGatewayKey('gw_valid_key_123')],
          clients: [
            {
              instanceId: asProviderInstanceId('ide-client'),
              name: 'ide-client',
              type: 'ide',
              gatewayKeyRef: asEnvRef('IDE_CLIENT_GATEWAY_KEY'),
              gatewayKey: asGatewayKey('gw_valid_key_123'),
            },
          ],
        },
      });

      const mockRequest = createMockExpressRequest({
        gatewayKey: undefined,
        clientId: undefined,
        requestId: 'req-123',
        header: jest.fn((name: string) =>
          name === 'x-gateway-key' ? 'gw_valid_key_123' : undefined,
        ),
        headers: { 'x-gateway-key': 'gw_valid_key_123' },
      } as unknown as Partial<Request>);

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      guard.canActivate(context);

      expect(mockRequest.clientId).toBe(asClientId('ide-client'));
    });

    it('should set clientId to unknown when key not in clients list', () => {
      const mockRequest = createMockExpressRequest({
        gatewayKey: undefined,
        clientId: undefined,
        requestId: 'req-123',
        header: jest.fn((name: string) =>
          name === 'x-gateway-key' ? 'gw_valid_key_123' : undefined,
        ),
        headers: { 'x-gateway-key': 'gw_valid_key_123' },
      } as unknown as Partial<Request>);

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      guard.canActivate(context);

      expect(mockRequest.clientId).toBe(asClientId('unknown'));
    });

    it('should trim whitespace from key', () => {
      const context = createMockContext({
        'x-gateway-key': `  ${TEST_GATEWAY_KEY}  `,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Missing key scenarios', () => {
    it('should throw UnauthorizedException when header missing', () => {
      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);

      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 401,
          code: ApiErrorCode.GATEWAY_KEY_MISSING,
          message: expect.stringContaining('Missing'),
        });
      }
    });

    it('should throw when header is empty or whitespace only', () => {
      expect(() =>
        guard.canActivate(createMockContext({ 'x-gateway-key': '' })),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.canActivate(createMockContext({ 'x-gateway-key': '   ' })),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('Invalid key scenarios', () => {
    it('should throw ForbiddenException when key not in allowList', async () => {
      await initGuard({
        gatewayKey: { allowList: [asGatewayKey('gw_valid_key')], clients: [] },
      });

      const context = createMockContext({ 'x-gateway-key': 'gw_invalid_key' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);

      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 403,
          code: ApiErrorCode.GATEWAY_KEY_INVALID,
          message: expect.stringContaining('Invalid'),
        });
      }
    });

    it('should be case-sensitive', async () => {
      await initGuard({
        gatewayKey: { allowList: [asGatewayKey('gw_Key_123')], clients: [] },
      });

      const context = createMockContext({ 'x-gateway-key': TEST_GATEWAY_KEY });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Configuration errors', () => {
    it('should throw InternalServerErrorException when allowList empty', async () => {
      await initGuard({
        gatewayKey: { allowList: [], clients: [] },
      });

      const context = createMockContext({ 'x-gateway-key': TEST_GATEWAY_KEY });

      expect(() => guard.canActivate(context)).toThrow(
        InternalServerErrorException,
      );

      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 500,
          code: ApiErrorCode.GATEWAY_KEY_NOT_CONFIGURED,
        });
      }
    });

    it('should throw when gatewayKey config undefined', async () => {
      await initGuard({ gatewayKey: null });

      const context = createMockContext({ 'x-gateway-key': TEST_GATEWAY_KEY });

      expect(() => guard.canActivate(context)).toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Multiple keys', () => {
    it('should allow any key from allowList', async () => {
      await initGuard({
        gatewayKey: {
          allowList: [
            asGatewayKey('gw_key_1'),
            asGatewayKey('gw_key_2'),
            asGatewayKey('gw_key_3'),
          ],
          clients: [],
        },
      });

      expect(
        guard.canActivate(createMockContext({ 'x-gateway-key': 'gw_key_1' })),
      ).toBe(true);
      expect(
        guard.canActivate(createMockContext({ 'x-gateway-key': 'gw_key_2' })),
      ).toBe(true);
      expect(
        guard.canActivate(createMockContext({ 'x-gateway-key': 'gw_key_3' })),
      ).toBe(true);
    });
  });

  describe('Error context', () => {
    it('should include requestId in error response', async () => {
      await initGuard({
        gatewayKey: { allowList: [asGatewayKey('gw_valid')], clients: [] },
      });

      const context = createMockContext(
        { 'x-gateway-key': 'gw_invalid' },
        asRequestId('req-456'),
      );

      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getResponse()).toMatchObject({
          requestId: 'req-456',
        });
      }
    });
  });
});
