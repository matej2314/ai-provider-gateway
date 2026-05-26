import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const TEXT_MAX = 128_000;

export class AnthropicContentBlockDto {
  @ApiProperty({ enum: ['text', 'image'] })
  @IsIn(['text', 'image'])
  type: 'text' | 'image';

  @ApiPropertyOptional({ maxLength: TEXT_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  text?: string;
}
