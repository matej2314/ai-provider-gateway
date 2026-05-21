import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const TEMPERATURE_DTO_MIN = 0;
const TEMPERATURE_DTO_MAX = 2;
const MAX_OUTPUT_TOKENS_DTO_MIN = 1;
const MAX_OUTPUT_TOKENS_DTO_MAX = 8192;

export class ChatParamsDto {
  @ApiPropertyOptional({
    description:
      'Override temperature for this request. Allowed only if listed in allowOverrides for modelAlias.',
    minimum: TEMPERATURE_DTO_MIN,
    maximum: TEMPERATURE_DTO_MAX,
    example: 0.7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(TEMPERATURE_DTO_MIN)
  @Max(TEMPERATURE_DTO_MAX)
  temperature?: number;

  @ApiPropertyOptional({
    description:
      'Override max output tokens. Allowed only if listed in allowOverrides for modelAlias.',
    minimum: MAX_OUTPUT_TOKENS_DTO_MIN,
    maximum: MAX_OUTPUT_TOKENS_DTO_MAX,
    example: 1024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(MAX_OUTPUT_TOKENS_DTO_MIN)
  @Max(MAX_OUTPUT_TOKENS_DTO_MAX)
  maxOutputTokens?: number;
}
