import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { SmartRateLimiterService } from 'src/rate-limit/smart-rate-limiter.service';
import { readGatewayKeyHeader } from 'src/common/readGatewayKeyHeader';

@Injectable()
export class SmartRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimiter: SmartRateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const path = req.url?.split('?')[0] ?? '';
    if (path === '/api/v1/health' || path.endsWith('/health')) {
      return true;
    }

    const gatewayKey = readGatewayKeyHeader(req);
    const isStreaming = path.includes('/stream');

    const rateLimitResult = await this.rateLimiter.checkRateLimit(
      gatewayKey as string,
    );

    if (!rateLimitResult.allowed) {
      throw new HttpException(
        {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: rateLimitResult.reason || 'Rate limit exceeded',
          requestId: req.requestId,
          details: [],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (isStreaming) {
      const streamsResult = await this.rateLimiter.checkConcurrentStreams(
        gatewayKey as string,
      );

      if (!streamsResult.allowed) {
        throw new HttpException(
          {
            statusCode: 429,
            code: 'RATE_LIMITED',
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
