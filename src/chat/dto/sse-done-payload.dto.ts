import { ApiPropertyOptional } from '@nestjs/swagger';
import { GatewayToolCallDto } from 'src/common/dtos/gateway-tool-call.dto';

export class SseDonePayloadDto {
  @ApiPropertyOptional()
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
  };

  @ApiPropertyOptional({ type: [GatewayToolCallDto] })
  toolCalls?: GatewayToolCallDto[];

  @ApiPropertyOptional({
    enum: ['stop', 'tool_calls', 'length', 'content_filter'],
  })
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}
