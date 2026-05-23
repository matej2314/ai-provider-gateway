import { ApiPropertyOptional } from '@nestjs/swagger';

export class ChatUsageDto {
  @ApiPropertyOptional({ minimum: 0 })
  inputTokens?: number;

  @ApiPropertyOptional({ minimum: 0 })
  outputTokens?: number;

  @ApiPropertyOptional({ minimum: 0 })
  totalTokens?: number;
}
