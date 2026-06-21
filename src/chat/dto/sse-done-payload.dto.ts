import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { GatewayToolCallDto } from 'src/common/dtos/gateway-tool-call.dto';
import { ChatWarningDto } from './chat-warning.dto';

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

  @ApiPropertyOptional({
    type: [ChatWarningDto],
    description: 'Optional warnings about ignored parameters.',
  })
  @IsOptional()
  warnings?: ChatWarningDto[];
}
