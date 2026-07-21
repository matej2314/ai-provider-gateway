import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ChatWarningDto {
  @ApiProperty({
    description: 'Warning code',
    example: 'PARAM_IGNORED_BY_PROVIDER',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Human-readable warning message',
    example:
      'Parameter frequencyPenalty is not supported by this provider and was ignored.',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Optional field name that triggered the warning',
    example: 'params.frequencyPenalty',
  })
  @IsOptional()
  @IsString()
  field?: string;
}
