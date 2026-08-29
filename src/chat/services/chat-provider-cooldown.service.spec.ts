import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ChatProviderCooldownService } from './chat-provider-cooldown.service';
import { SmartRateLimiterService } from '../../rate-limit/smart-rate-limiter.service';
import { LoggingService } from '../../logging/logging.service';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';
import { createMockSmartRateLimiter } from '../../common/mocks/createMockSmartRateLimiter';
import {
  TEST_GATEWAY_KEY_BRANDED,
  TEST_PROVIDER_INSTANCE_BRANDED,
  TEST_REQUEST_ID,
} from '../../common/mocks/test-constants';
import { asRequestId } from '../../common/types/branded.types';

describe('ChatProviderCooldownService', () => {
  let service: ChatProviderCooldownService;
  let mockRateLimiter: Partial<SmartRateLimiterService>;
  let mockLogger: Partial<LoggingService>;

  beforeEach(async () => {
    mockRateLimiter = createMockSmartRateLimiter();
    mockLogger = createMockLoggingService();

    const module = await Test.createTestingModule({
      providers: [
        ChatProviderCooldownService,
        { provide: SmartRateLimiterService, useValue: mockRateLimiter },
        { provide: LoggingService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(ChatProviderCooldownService);
  });

  describe('assertNotInCooldown', () => {
    describe('Happy path', () => {
      it('should resolve when cooldown allows request', async () => {
        await expect(
          service.assertNotInCooldown(
            TEST_GATEWAY_KEY_BRANDED,
            TEST_PROVIDER_INSTANCE_BRANDED,
            TEST_REQUEST_ID,
          ),
        ).resolves.toBeUndefined();

        expect(mockRateLimiter.checkCooldown).toHaveBeenCalledWith(
          TEST_GATEWAY_KEY_BRANDED,
          TEST_PROVIDER_INSTANCE_BRANDED,
        );
      });
    });

    describe('Errors', () => {
      it('should throw 429 RATE_LIMITED when cooldown denies request', async () => {
        (mockRateLimiter.checkCooldown as jest.Mock).mockResolvedValue({
          allowed: false,
          reason: 'Cooldown active for provider',
        });

        await expect(
          service.assertNotInCooldown(
            TEST_GATEWAY_KEY_BRANDED,
            TEST_PROVIDER_INSTANCE_BRANDED,
            TEST_REQUEST_ID,
          ),
        ).rejects.toMatchObject({
          status: HttpStatus.TOO_MANY_REQUESTS,
          response: {
            statusCode: 429,
            code: ApiErrorCode.RATE_LIMITED,
            message: 'Cooldown active for provider',
            requestId: TEST_REQUEST_ID,
            details: [],
          },
        });

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Rate limit exceeded',
          expect.objectContaining({
            provider: TEST_PROVIDER_INSTANCE_BRANDED,
            status: 429,
            code: ApiErrorCode.RATE_LIMITED,
          }),
        );
      });

      it('should use default message when cooldown reason is empty', async () => {
        (mockRateLimiter.checkCooldown as jest.Mock).mockResolvedValue({
          allowed: false,
        });

        await expect(
          service.assertNotInCooldown(
            TEST_GATEWAY_KEY_BRANDED,
            TEST_PROVIDER_INSTANCE_BRANDED,
            asRequestId('req-456'),
          ),
        ).rejects.toMatchObject({
          response: expect.objectContaining({
            message: 'Rate limit exceeded',
          }),
        });
      });
    });

    describe('Edge cases', () => {
      it('should propagate rateLimiter.checkCooldown rejection', async () => {
        (mockRateLimiter.checkCooldown as jest.Mock).mockRejectedValue(
          new Error('Redis unavailable'),
        );

        await expect(
          service.assertNotInCooldown(
            TEST_GATEWAY_KEY_BRANDED,
            TEST_PROVIDER_INSTANCE_BRANDED,
            asRequestId('req-789'),
          ),
        ).rejects.toThrow('Redis unavailable');
      });
    });
  });
});
