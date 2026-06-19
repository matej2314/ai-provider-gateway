import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { AnthropicErrorResponseDto } from '../../integrations/anthropic/dtos/anthropic-error-response.dto';

export function ApiAnthropicErrorResponses() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Validation, MODEL_ALIAS_NOT_FOUND, MODEL_NOT_ALLOWED, …',
      type: AnthropicErrorResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Missing x-api-key / Bearer (GATEWAY_KEY_MISSING).',
      type: AnthropicErrorResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Invalid API key (GATEWAY_KEY_INVALID).',
      type: AnthropicErrorResponseDto,
    }),
    ApiResponse({
      status: 429,
      description: 'RATE_LIMITED / PROVIDER_RATE_LIMITED.',
      type: AnthropicErrorResponseDto,
    }),
    ApiResponse({
      status: 500,
      description: 'INTERNAL_SERVER_ERROR, GATEWAY_KEY_NOT_CONFIGURED.',
      type: AnthropicErrorResponseDto,
    }),
    ApiResponse({
      status: 502,
      description: 'PROVIDER_UNSUPPORTED, PROVIDER_UNAVAILABLE.',
      type: AnthropicErrorResponseDto,
    }),
    ApiResponse({
      status: 504,
      description: 'PROVIDER_TIMEOUT.',
      type: AnthropicErrorResponseDto,
    }),
    ApiResponse({
      status: 503,
      description: 'PROVIDER_UNAVAILABLE.',
      type: AnthropicErrorResponseDto,
    }),
  );
}
