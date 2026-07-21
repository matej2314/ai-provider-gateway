import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { SmartRateLimiterService } from '../../rate-limit/smart-rate-limiter.service';
import { readClientGatewayKey } from '../readClientGatewayKey';
import type { Request } from 'express';

@Injectable()
export class StreamCleanupInterceptor implements NestInterceptor {
  constructor(private readonly rateLimiter: SmartRateLimiterService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();

    const gatewayKey = readClientGatewayKey(req);
    const isStreaming = req.url?.endsWith('/stream') ?? false;

    return next.handle().pipe(
      finalize(() => {
        if (isStreaming && gatewayKey) {
          void this.rateLimiter.releaseStream(gatewayKey);
        }
      }),
    );
  }
}
