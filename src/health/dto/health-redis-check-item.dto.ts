import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RedisConsumer } from '../../cache/should-include-redis-stack';
import { HealthCheckItemDto } from './health-check-item.dto';

export class HealthRedisCheckItemDto extends HealthCheckItemDto {
  @ApiProperty({
    description:
      'Whether Redis is required in this deployment (cache redis and/or smart rate limit and/or semantic cache).',
    example: true,
  })
  required: boolean;

  @ApiPropertyOptional({
    description: 'Features that require Redis. Omitted when required=false.',
    enum: ['cache', 'rate-limit', 'semantic-cache'],
    isArray: true,
    example: ['rate-limit'],
  })
  consumers?: RedisConsumer[];
}
