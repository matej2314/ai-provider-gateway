import { ApiProperty } from '@nestjs/swagger';

export class AnthropicErrorBodyDto {
  @ApiProperty({
    example: 'invalid_request_error',
    enum: [
      'invalid_request_error',
      'authentication_error',
      'rate_limit_error',
      'api_error',
    ],
  })
  type: string;

  @ApiProperty({ example: 'Invalid model alias.' })
  message: string;
}

export class AnthropicErrorResponseDto {
  @ApiProperty({ enum: ['error'], example: 'error' })
  type: 'error';

  @ApiProperty({ type: AnthropicErrorBodyDto })
  error: AnthropicErrorBodyDto;
}
