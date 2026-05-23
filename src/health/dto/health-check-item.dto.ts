import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckItemDto {
  @ApiProperty({
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ example: 'Config is loaded' })
  message: string;
}
