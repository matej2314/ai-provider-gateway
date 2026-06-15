import { Type } from 'class-transformer';
import { IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GatewayToolDefinitionDto } from '../../common/dtos/gateway-tool-definition.dto';
import type { GatewayToolChoice } from '../../providers/types/tooling-types';

export class GatewayNamedToolChoiceFunctionDto {
  @ApiPropertyOptional({ example: 'get_weather' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class GatewayNamedToolChoiceDto {
  @ApiPropertyOptional({ enum: ['function'], example: 'function' })
  type: 'function';

  @ApiPropertyOptional({ type: GatewayNamedToolChoiceFunctionDto })
  @IsOptional()
  function?: GatewayNamedToolChoiceFunctionDto;
}

export class ChatToolingDto {
  @ApiPropertyOptional({ type: [GatewayToolDefinitionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GatewayToolDefinitionDto)
  definitions?: GatewayToolDefinitionDto[];

  @ApiPropertyOptional({
    description:
      'Optional tool choice. If not provided, the model will decide which tool to use.',
    oneOf: [
      { type: 'string', enum: ['auto', 'none', 'required'] },
      { $ref: '#/components/schemas/GatewayNamedToolChoiceDto' },
    ],
    example: 'auto',
  })
  @IsOptional()
  toolChoice?: GatewayToolChoice;
}
