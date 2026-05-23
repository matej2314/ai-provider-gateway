import { ApiProperty } from '@nestjs/swagger';
import { HealthCheckItemDto } from './health-check-item.dto';

class HealthReadinessChecksDto {
  @ApiProperty({
    type: HealthCheckItemDto,
  })
  config: HealthCheckItemDto;

  @ApiProperty({
    type: HealthCheckItemDto,
    description:
      'Response cache backend (noop/redis). Does not affect smart rate limit.',
  })
  cache: HealthCheckItemDto;
}

export class HealthReadinessResponseDto {
  @ApiProperty({ enum: ['ready', 'not_ready'] })
  status: 'ready' | 'not_ready';

  @ApiProperty({ format: 'date-time', example: '2026-05-19T12:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ example: 42, minimum: 0 })
  uptime: number;

  @ApiProperty({ type: HealthReadinessChecksDto })
  checks: HealthReadinessChecksDto;
}
