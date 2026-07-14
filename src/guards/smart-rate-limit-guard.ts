import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfig } from '../config/typed-config';
import { Request } from 'express';
import { SmartRateLimiterService } from '../rate-limit/smart-rate-limiter.service';
import { readClientGatewayKey } from '../common/readClientGatewayKey';
import { ApiErrorCode } from '../common/errors/api-error.code';
import { resolveClientIdFromKey } from '../common/resolveClientIdFromKey';
import { type GatewayKey } from '../common/types';
import type { ClientId } from '../common/types/branded.types';
import type { ResolvedGatewayClient } from '../config/configuration.types';

@Injectable()
export class SmartRateLimitGuard implements CanActivate {
  constructor(
    private readonly smartRateLimiter: SmartRateLimiterService,
    private readonly config: ConfigService,
  ) {}

  private requireGatewayKey(req: Request): GatewayKey {
    const gatewayKey = readClientGatewayKey(req);

    if (!gatewayKey) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ApiErrorCode.GATEWAY_KEY_MISSING,
        message: 'Missing client gateway key.',
        requestId: req.requestId,
        details: [],
      });
    }
    return gatewayKey;
  }

  private getGatewayClients(): ResolvedGatewayClient[] {
    return getAppConfig(this.config, 'gatewayKey')?.clients ?? [];
  }

  private resolveClientId(gatewayKey: GatewayKey): ClientId {
    const clients = this.getGatewayClients();
    return resolveClientIdFromKey(gatewayKey, clients);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const path = req.url?.split('?')[0] ?? '';
    if (path === '/api/v1/health') {
      return true;
    }

    const smartEnabled = getAppConfig(this.config, 'RATE_LIMIT_SMART_ENABLED');
    if (!smartEnabled) {
      return true;
    }

    const gatewayKey = this.requireGatewayKey(req);
    const isStreaming = path.endsWith('/stream');

    const rateLimitResult =
      await this.smartRateLimiter.checkRateLimit(gatewayKey);

    if (!rateLimitResult.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          code: ApiErrorCode.RATE_LIMITED,
          message: rateLimitResult.reason || 'Rate limit exceeded',
          requestId: req.requestId,
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (isStreaming) {
      const streamsResult = await this.smartRateLimiter.checkConcurrentStreams(
        gatewayKey,
        this.resolveClientId(gatewayKey),
      );

      if (!streamsResult.allowed) {
        throw new HttpException(
          {
            statusCode: 429,
            code: ApiErrorCode.RATE_LIMITED,
            message:
              streamsResult.reason || 'Concurrent streams limit exceeded',
            requestId: req.requestId,
            details: [],
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }
}
