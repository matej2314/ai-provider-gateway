import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SmartRateLimiterService } from 'src/rate-limit/smart-rate-limiter.service';
import { readGatewayKeyHeader } from 'src/common/readGatewayKeyHeader';
import type { Request } from 'express';

@Injectable()
export class StreamCleanupInterceptor implements NestInterceptor {
  constructor(private readonly rateLimiter: SmartRateLimiterService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();

    const gatewayKey = readGatewayKeyHeader(req);
    const isStreaming = req.url?.endsWith('/stream') ?? false;

    return next.handle().pipe(
      finalize(() => {
        if (isStreaming && gatewayKey) {
          this.rateLimiter.releaseStream(gatewayKey);
        }
      }),
    );
  }
}
