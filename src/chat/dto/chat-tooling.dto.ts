import { Type } from 'class-transformer';
import {
    IsOptional,
    IsArray,
    ValidateNested
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GatewayToolDefinitionDto } from 'src/common/dtos/gateway-tool-definition.dto';
import type { GatewayToolChoice } from 'src/providers/types/tooling-types';

export class ChatToolingDto {
    @ApiPropertyOptional({ type: [GatewayToolDefinitionDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GatewayToolDefinitionDto)
    definitions?: GatewayToolDefinitionDto[];

    @ApiPropertyOptional({
        description: 'Optional tool choice. If not provided, the model will decide which tool to use.',
    })
    @IsOptional()
    toolChoice?: GatewayToolChoice;
}