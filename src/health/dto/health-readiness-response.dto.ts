import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HealthCheckItemDto } from './health-check-item.dto';
import { HealthRedisCheckItemDto } from './health-redis-check-item.dto';

class HealthReadinessChecksDto {
  @ApiProperty({
    type: HealthCheckItemDto,
  })
  config: HealthCheckItemDto;

  @ApiPropertyOptional({
    type: HealthRedisCheckItemDto,
    description:
      'Shared redis infrastructure. Present only when Redis is required (cache redis and/or smart rate limit and/or semantic cache). Probed when present.',
  })
  redis?: HealthRedisCheckItemDto;

  @ApiProperty({
    type: HealthCheckItemDto,
    description:
      'Response cache feature state. When backend is redis, availability follows checks.redis.',
  })
  cache: HealthCheckItemDto;

  @ApiPropertyOptional({
    type: HealthCheckItemDto,
    description:
      'Embedding service health. Present only when SEMANTIC_CACHE_ENABLED=true. Fail-open: degraded state does not block ready status. Probe does not reset the embedding circuit breaker.',
  })
  embeddings?: HealthCheckItemDto;

  @ApiPropertyOptional({
    type: HealthCheckItemDto,
    description:
      'Redis Search vector index health. Present only when SEMANTIC_CACHE_ENABLED=true. Fail-open: degraded (missing Search module or index) does not block ready status.',
  })
  vectorStore?: HealthCheckItemDto;
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
