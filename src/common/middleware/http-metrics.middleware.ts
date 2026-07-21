import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import type { HttpMethod } from '../../observability/app-metrics/interfaces/app-metrics-backend.interface';

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly appMetrics: AppMetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const route = this.normalizeRoute(req.path);

    res.on('finish', () => {
      const durationSec = (Date.now() - startTime) / 1000;
      const method = req.method.toUpperCase() as HttpMethod;
      const statusCode = res.statusCode;

      this.appMetrics.recordHttpRequest({
        method,
        route,
        statusCode,
      });

      this.appMetrics.recordHttpRequestDuration(method, route, durationSec);
    });
    next();
  }

  private normalizeRoute(route: string): string {
    const staticRoutes = [
      '/health',
      '/health/ready',
      '/metrics',
      '/api/v1/chat',
      '/api/v1/stream',
      '/api/v1/anthropic/messages',
      '/api/v1/anthropic/models',
      '/api/v1/openai/chat/completions',
      '/api/v1/openai/models',
    ];

    if (staticRoutes.includes(route)) {
      return route;
    }

    return route.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id',
    );
  }
}
