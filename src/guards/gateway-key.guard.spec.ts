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
import type { Request } from 'express';

describe('GatewayKeyGuard', () => {
  let guard: GatewayKeyGuard;
  let mockConfig: Partial<ConfigService>;

  beforeEach(async () => {
    mockConfig = {
      get: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        GatewayKeyGuard,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    guard = module.get(GatewayKeyGuard);
  });

  describe('Happy path - valid key', () => {
    it('should allow when key is in allowList', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_valid_key_123'],
        clients: [],
      });

      const context = createMockContext({
        'x-gateway-key': 'gw_valid_key_123',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should set gatewayKey on request', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_valid_key_123'],
        clients: [],
      });

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

      expect(mockRequest.gatewayKey).toBe('gw_valid_key_123');
    });

    it('should allow when key has whitespace (trimmed)', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_key_123'],
        clients: [],
      });

      const context = createMockContext({ 'x-gateway-key': '  gw_key_123  ' });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Edge case - missing key', () => {
    it('should throw UnauthorizedException when header missing', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_key_123'],
        clients: [],
      });

      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);

      try {
        guard.canActivate(context);
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          statusCode: 401,
          code: ApiErrorCode.GATEWAY_KEY_MISSING,
          message: expect.stringContaining('Missing'),
        });
      }
    });

    it('should throw when header is empty', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_key_123'],
        clients: [],
      });

      const context = createMockContext({ 'x-gateway-key': '' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw when header is whitespace only', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_key_123'],
        clients: [],
      });

      const context = createMockContext({ 'x-gateway-key': '   ' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('Edge case - invalid key', () => {
    it('should throw ForbiddenException when key not in allowList', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_valid_key'],
        clients: [],
      });

      const context = createMockContext({ 'x-gateway-key': 'gw_invalid_key' });

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

    it('should be case-sensitive', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_Key_123'],
        clients: [],
      });

      const context = createMockContext({ 'x-gateway-key': 'gw_key_123' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Edge case - allowList not configured', () => {
    it('should throw InternalServerErrorException when allowList empty', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: [],
        clients: [],
      });

      const context = createMockContext({ 'x-gateway-key': 'gw_key_123' });

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

    it('should throw when gatewayKey config undefined', () => {
      (mockConfig.get as jest.Mock).mockReturnValue(undefined);

      const context = createMockContext({ 'x-gateway-key': 'gw_key_123' });

      expect(() => guard.canActivate(context)).toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Edge case - multiple keys in allowList', () => {
    it('should allow any key from allowList', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_key_1', 'gw_key_2', 'gw_key_3'],
        clients: [],
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

  describe('Edge case - requestId propagation', () => {
    it('should include requestId in error response', () => {
      (mockConfig.get as jest.Mock).mockReturnValue({
        allowList: ['gw_valid'],
        clients: [],
      });

      const context = createMockContext(
        { 'x-gateway-key': 'gw_invalid' },
        'req-456',
      );

      try {
        guard.canActivate(context);
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          requestId: 'req-456',
        });
      }
    });
  });
});
