import { ApiPropertyOptional } from '@nestjs/swagger';
import { GatewayToolCallDto } from 'src/common/dtos/gateway-tool-call.dto';

export class SseDoneUsageDto {
  @ApiPropertyOptional({ minimum: 0, example: 12 })
  inputTokens?: number;

  @ApiPropertyOptional({ minimum: 0, example: 48 })
  outputTokens?: number;

  @ApiPropertyOptional({ minimum: 0, example: 60 })
  totalTokens?: number;
}

export class SseDonePayloadDto {
  @ApiPropertyOptional({ type: SseDoneUsageDto })
  usage?: SseDoneUsageDto;

  @ApiPropertyOptional({ type: [GatewayToolCallDto] })
  toolCalls?: GatewayToolCallDto[];

  @ApiPropertyOptional({
    enum: ['stop', 'tool_calls', 'length', 'content_filter'],
  })
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}
