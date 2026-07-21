import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppMetricsService } from './app-metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly appMetrics: AppMetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Prometheus metrics endpoint',
    description:
      'Returns application metrics in Prometheus exposition format. ' +
      'Public endpoint for Prometheus scraping.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus text format',
  })
  getMetrics(): Promise<string> {
    return this.appMetrics.getMetricsSnapshot();
  }
}
