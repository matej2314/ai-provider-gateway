import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatErrorHandlerService } from './chat-error-handler.service';
import { SmartRateLimiterService } from '../../rate-limit/smart-rate-limiter.service';
import { LoggingService } from '../../logging/logging.service';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import { createMockSmartRateLimiter } from '../../common/mocks/createMockSmartRateLimiter';
import { TEST_GATEWAY_KEY_BRANDED } from '../../common/mocks/test-constants';

describe('ChatErrorHandlerService', () => {
  let service: ChatErrorHandlerService;
  let mockRateLimiter: Partial<SmartRateLimiterService>;
  let mockLogger: Partial<LoggingService>;

  beforeEach(async () => {
    mockRateLimiter = createMockSmartRateLimiter();
    mockLogger = createMockLoggingService();

    const module = await Test.createTestingModule({
      providers: [
        ChatErrorHandlerService,
        { provide: SmartRateLimiterService, useValue: mockRateLimiter },
      ],
    }).compile();

    service = module.get(ChatErrorHandlerService);
  });

  describe('handleProviderError', () => {
    describe('HttpException 429', () => {
      it('should set cooldown when gatewayKey is provided', async () => {
        const error = new HttpException(
          { code: ApiErrorCode.RATE_LIMITED, message: 'Too many requests' },
          HttpStatus.TOO_MANY_REQUESTS,
        );

        await service.handleProviderError(
          mockLogger as LoggingService,
          error,
          'anthropic',
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(mockRateLimiter.setCooldown).toHaveBeenCalledWith(
          TEST_GATEWAY_KEY_BRANDED,
          'anthropic',
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Chat provider rate limited',
          expect.objectContaining({
            provider: 'anthropic',
            status: 429,
            code: ApiErrorCode.RATE_LIMITED,
          }),
        );
      });

      it('should not set cooldown when gatewayKey is missing', async () => {
        const error = new HttpException(
          'Rate limited',
          HttpStatus.TOO_MANY_REQUESTS,
        );

        await service.handleProviderError(
          mockLogger as LoggingService,
          error,
          'openai',
        );

        expect(mockRateLimiter.setCooldown).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Chat provider rate limited',
          expect.objectContaining({ provider: 'openai', status: 429 }),
        );
      });
    });

    describe('HttpException 4xx (non-429)', () => {
      it('should log warn with code from response body', async () => {
        const error = new HttpException(
          {
            code: ApiErrorCode.TOOLS_NOT_SUPPORTED,
            message: 'Tools not supported',
          },
          HttpStatus.BAD_REQUEST,
        );

        await service.handleProviderError(
          mockLogger as LoggingService,
          error,
          'anthropic',
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(mockRateLimiter.setCooldown).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Chat provider request failed',
          expect.objectContaining({
            provider: 'anthropic',
            status: 400,
            code: ApiErrorCode.TOOLS_NOT_SUPPORTED,
          }),
        );
      });

      it('should log warn without code when body is string', async () => {
        const error = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

        await service.handleProviderError(
          mockLogger as LoggingService,
          error,
          'anthropic',
        );

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Chat provider request failed',
          expect.objectContaining({
            provider: 'anthropic',
            status: 400,
          }),
        );
        const ctx = (mockLogger.warn as jest.Mock).mock.calls[0][1];
        expect(ctx.code).toBeUndefined();
      });
    });

    describe('HttpException 5xx', () => {
      it('should not log for server errors', async () => {
        const error = new HttpException(
          'Internal error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );

        await service.handleProviderError(
          mockLogger as LoggingService,
          error,
          'anthropic',
          TEST_GATEWAY_KEY_BRANDED,
        );

        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockRateLimiter.setCooldown).not.toHaveBeenCalled();
      });
    });

    describe('Generic Error', () => {
      it('should log warn with error message', async () => {
        const error = new Error('Network timeout');

        await service.handleProviderError(
          mockLogger as LoggingService,
          error,
          'google',
        );

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Chat provider call failed',
          {
            provider: 'google',
            message: 'Network timeout',
          },
        );
        expect(mockRateLimiter.setCooldown).not.toHaveBeenCalled();
      });
    });

    describe('Edge cases', () => {
      it('should not log for unknown error type', async () => {
        await service.handleProviderError(
          mockLogger as LoggingService,
          'unexpected string error',
          'anthropic',
        );

        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockRateLimiter.setCooldown).not.toHaveBeenCalled();
      });

      it('should not extract code when response body is array', async () => {
        const error = new HttpException(
          ['error1', 'error2'],
          HttpStatus.BAD_REQUEST,
        );

        await service.handleProviderError(
          mockLogger as LoggingService,
          error,
          'anthropic',
        );

        const ctx = (mockLogger.warn as jest.Mock).mock.calls[0][1];
        expect(ctx.code).toBeUndefined();
      });

      it('should not extract code when code field is not string', async () => {
        const error = new HttpException(
          { code: 12345, message: 'Invalid' },
          HttpStatus.BAD_REQUEST,
        );

        await service.handleProviderError(
          mockLogger as LoggingService,
          error,
          'anthropic',
        );

        const ctx = (mockLogger.warn as jest.Mock).mock.calls[0][1];
        expect(ctx.code).toBeUndefined();
      });

      it('should propagate setCooldown rejection', async () => {
        (mockRateLimiter.setCooldown as jest.Mock).mockRejectedValue(
          new Error('Redis down'),
        );
        const error = new HttpException(
          'Rate limited',
          HttpStatus.TOO_MANY_REQUESTS,
        );

        await expect(
          service.handleProviderError(
            mockLogger as LoggingService,
            error,
            'anthropic',
            TEST_GATEWAY_KEY_BRANDED,
          ),
        ).rejects.toThrow('Redis down');
      });

      it('should never rethrow HttpException or Error', async () => {
        const httpError = new HttpException('Bad', HttpStatus.BAD_REQUEST);
        const genericError = new Error('Fail');

        await expect(
          service.handleProviderError(
            mockLogger as LoggingService,
            httpError,
            'anthropic',
          ),
        ).resolves.toBeUndefined();

        await expect(
          service.handleProviderError(
            mockLogger as LoggingService,
            genericError,
            'anthropic',
          ),
        ).resolves.toBeUndefined();
      });
    });
  });
});
