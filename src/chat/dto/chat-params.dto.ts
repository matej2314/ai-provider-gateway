import {
  IsNumber,
  IsOptional,
  Max,
  Min,
  IsBoolean,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResponseFormatDto } from './response-format.dto';
import { IsStringOrArrayOfStrings } from '../../common/validators/is-string-or-array-of-strings.validator';
import { IsThinkingBudget } from '../../common/validators/is-thinking-budget.validator';
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
  @Type(() => Number)
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
  @Type(() => Number)
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
  @Min(0)
  @Max(2 ** 32 - 1)
  seed?: number;

  @ApiPropertyOptional({
    type: ResponseFormatDto,
    description:
      'Desired response format. Use {type: "json_object") for JSON mode.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResponseFormatDto)
  responseFormat?: ResponseFormatDto;

  @ApiPropertyOptional({
    description:
      'Top-K sampling (Anthropic/Google only). Only used when provider supports it. Limits sampling to top K tokens.',
    minimum: 0,
    example: 40,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  topK?: number;

  @ApiPropertyOptional({
    description:
      'Enable extended thinking/reasoning mode for reasoning-capable models.' +
      'OpenAI: gpt-5+ models use Responses API reasoning.' +
      'Anthropic: enables thinking parameter with budget_tokens (min. 1024).' +
      'Google Gemini: enables ThinkingConfig (Gemini 3.0+ only)' +
      'Significantly increases latency and token usage (2-10x cost).',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  thinkingEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Thinking budget or effort level (provider-specific interpretation). ' +
      'OpenAI: "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max" (maps to reasoning.effort). ' +
      'Anthropic: integer token budget (min 1024) OR "low" | "medium" | "high" | "xhigh" | "max" (maps to output_config.effort). ' +
      'Google Gemini: integer thought tokens (thinkingBudget, min 1024) OR "minimal" | "low" | "medium" | "high" (maps to thinkingLevel). ' +
      'Default when omitted: provider-specific (OpenAI=medium, Anthropic=adaptive, Gemini=high).',
    oneOf: [
      {
        type: 'string',
        enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'],
      },
      { type: 'number', minimum: 1024 },
    ],
    example: 'medium',
  })
  @IsOptional()
  @IsThinkingBudget()
  thinkingBudget?:
    | 'none'
    | 'minimal'
    | 'low'
    | 'medium'
    | 'high'
    | 'xhigh'
    | 'max'
    | number;

  @ApiPropertyOptional({
    description:
      'Whether the model may call multiple tools in parallel (OpenAI Responses API).',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  parallelToolCalls?: boolean;
}
