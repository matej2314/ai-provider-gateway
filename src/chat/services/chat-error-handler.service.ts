import { Injectable, HttpException } from '@nestjs/common';
import { LoggingService } from '../../logging/logging.service';
import { SmartRateLimiterService } from '../../rate-limit/smart-rate-limiter.service';
import {
  asProviderInstanceId,
  type GatewayKey,
} from '../../common/types/branded.types';
import {
  isProviderRateLimitError,
  isRateLimitStatus,
  isClientError,
} from '../../common/errors/errors.utils';

@Injectable()
export class ChatErrorHandlerService {
  constructor(private readonly rateLimiter: SmartRateLimiterService) {}

  async handleProviderError(
    log: LoggingService,
    error: unknown,
    providerName: string,
    gatewayKey?: GatewayKey,
  ): Promise<void> {
    if (gatewayKey && isProviderRateLimitError(error)) {
      await this.rateLimiter.setCooldown(gatewayKey, providerName);
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      const ctx: Record<string, unknown> = {
        provider: providerName,
        status,
      };
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const errorObject = body as Record<string, unknown>;
        if (typeof errorObject.code === 'string') ctx.code = errorObject.code;
      }
      if (isRateLimitStatus(status)) {
        log.warn('Chat provider rate limited', ctx);
      } else if (isClientError(status)) {
        log.warn('Chat provider request failed', ctx);
      }
      return;
    }

    if (error instanceof Error) {
      log.warn('Chat provider call failed', {
        provider: asProviderInstanceId(providerName),
        message: error.message,
      });
    }
  }
}
