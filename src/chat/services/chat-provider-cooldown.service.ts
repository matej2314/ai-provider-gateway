import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LoggingService } from '../../logging/logging.service';
import { SmartRateLimiterService } from '../../rate-limit/smart-rate-limiter.service';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import type {
  GatewayKey,
  ProviderInstanceId,
  RequestId,
} from '../../common/types/branded.types';

/**
 * Maps provider cooldown (`checkCooldown`) to HTTP 429.
 * Pair with `ChatErrorHandlerService` (`setCooldown`). Not a Nest Guard.
 */
@Injectable()
export class ChatProviderCooldownService {
  private readonly logger: LoggingService;

  constructor(
    private readonly rateLimiter: SmartRateLimiterService,
    loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({
      module: 'ChatProviderCooldownService',
    });
  }

  async assertNotInCooldown(
    gatewayKey: GatewayKey,
    providerName: ProviderInstanceId,
    requestId: RequestId,
  ): Promise<void> {
    const cooldownResult = await this.rateLimiter.checkCooldown(
      gatewayKey,
      providerName,
    );

    if (!cooldownResult.allowed) {
      this.logger.warn('Rate limit exceeded', {
        provider: providerName,
        status: 429,
        code: ApiErrorCode.RATE_LIMITED,
      });

      throw new HttpException(
        {
          statusCode: 429,
          code: ApiErrorCode.RATE_LIMITED,
          message: cooldownResult.reason || 'Rate limit exceeded',
          requestId,
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
