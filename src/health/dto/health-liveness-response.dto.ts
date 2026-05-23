import { ApiProperty } from '@nestjs/swagger';

export class HealthLivenessResponseDto {
  @ApiProperty({ enum: ['healthy'], example: 'healthy' })
  status: 'healthy';

  @ApiProperty({
    format: 'date-time',
    example: '2026-05-19T12:00:00.000Z',
  })
  timestamp: string;
}
