import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../../logging/logging.service';
import { ResponseCacheService } from '../../cache/response-cache.service';
import { SmartRateLimiterService } from '../../rate-limit/smart-rate-limiter.service';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { isCachedChatAllowedForModelAlias } from '../helpers/cache-policy';
import { isToolingRequest } from '../helpers/tooling-request';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import { getAppConfigOrThrow } from '../../config/typed-config';
import type { ChatResponseData } from './chat-response-builder.service';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
import type { CachedChatResponse } from '../../cache/response-cache.service';
import type { GatewayKey, RequestId } from '../../common/types/branded.types';
import { asProviderInstanceId } from '../../common/types/branded.types';

@Injectable()
export class ChatCacheGuardService {
  private readonly logger: LoggingService;

  constructor(
    private readonly cacheService: ResponseCacheService,
    private readonly config: ConfigService,
    private readonly rateLimiter: SmartRateLimiterService,
    private readonly loggingService: LoggingService,
  ) {
    const logger = this.loggingService.child({
      module: 'ChatCacheGuardService',
    });
    this.logger = logger;
  }

  async checkRateLimit(
    gatewayKey: GatewayKey,
    providerName: string,
    requestId: RequestId,
  ): Promise<void> {
    const cooldownResult = await this.rateLimiter.checkCooldown(
      gatewayKey,
      providerName,
    );

    if (!cooldownResult.allowed) {
      this.logger.warn('Rate limit exceeded', {
        provider: asProviderInstanceId(providerName),
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

  async getCachedIfAllowed(
    requestBody: ChatRequestDto,
    options: ProviderCallOptions,
  ): Promise<CachedChatResponse | null> {
    const skipCache = isToolingRequest(requestBody);

    if (skipCache) return null;

    const cachedResponse = await this.cacheService.getCachedResponse(
      requestBody,
      options,
    );

    const gateway = getAppConfigOrThrow(this.config, 'gateway');
    const modelAlias = requestBody.modelAlias;

    if (
      cachedResponse &&
      isCachedChatAllowedForModelAlias(gateway, modelAlias)
    ) {
      return cachedResponse;
    }

    return null;
  }

  async setCachedIfAllowed(
    requestBody: ChatRequestDto,
    response: ChatResponseData,
    options: ProviderCallOptions,
  ): Promise<void> {
    const skipCache = isToolingRequest(requestBody);

    if (!skipCache) {
      await this.cacheService.setCachedResponse(requestBody, response, options);
    }
  }
}
