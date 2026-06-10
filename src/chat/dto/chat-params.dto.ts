import { IsNumber, IsOptional, Max, Min, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsStringOrArrayOfStrings } from 'src/common/validators/is-string-or-array-of-strings.validator';
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

  @ApiPropertyOptional({
    description:
      'Nucleus sampling (0-1). Alternative to temperature for controlling randomness. Lowe values = more focues, higher values = more random.',
    minimum: 0,
    maximum: 1,
    example: 0.95,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional({
    description:
      'Sequence(s) where generating should stop. Can be a string or array of strings.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['\n\n', '###'],
  })
  @IsOptional()
  @IsStringOrArrayOfStrings()
  stop?: string | string[];

  @ApiPropertyOptional({
    description:
      'Penalize new tokens based on their frequency in the text. (-2 to 2).',
    minimum: -2,
    maximum: 2,
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  @ApiPropertyOptional({
    description:
      'Penalize new tokens based on their presence in the text. (-2 to 2).',
    minimum: -2,
    maximum: 2,
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;

  @ApiPropertyOptional({
    description: 'Seed for deterministic sampling. (integer)',
    minimum: 0,
    maximum: 2 ** 32 - 1,
    example: 42,
  })
  @IsOptional()
  @IsInt()
  seed?: number;
}
