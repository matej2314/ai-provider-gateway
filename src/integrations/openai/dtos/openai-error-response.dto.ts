import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenAiErrorBodyDto {
  @ApiProperty({ example: 'Invalid model alias.' })
  message: string;

  @ApiProperty({
    example: 'invalid_request_error',
    enum: [
      'invalid_request_error',
      'authentication_error',
      'rate_limit_error',
      'server_error',
    ],
  })
  type: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  param?: string | null;

  @ApiPropertyOptional({
    example: 'MODEL_ALIAS_NOT_FOUND',
    description: 'Internal gateway code mapped by OpenAiExceptionFilter.',
  })
  code?: string | null;
}

export class OpenAiErrorResponseDto {
  @ApiProperty({ type: OpenAiErrorBodyDto })
  error: OpenAiErrorBodyDto;
}
