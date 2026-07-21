import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { OpenAiErrorResponseDto } from '../../integrations/openai/dtos/openai-error-response.dto';

export function ApiOpenAiErrorResponses() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Validation, MODEL_ALIAS_NOT_FOUND, MODEL_NOT_ALLOWED, …',
      type: OpenAiErrorResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Missing Bearer token (GATEWAY_KEY_MISSING).',
      type: OpenAiErrorResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Invalid Bearer token (GATEWAY_KEY_INVALID).',
      type: OpenAiErrorResponseDto,
    }),
    ApiResponse({
      status: 429,
      description: 'RATE_LIMITED / PROVIDER_RATE_LIMITED.',
      type: OpenAiErrorResponseDto,
    }),
    ApiResponse({
      status: 500,
      description: 'INTERNAL_SERVER_ERROR, GATEWAY_KEY_NOT_CONFIGURED.',
      type: OpenAiErrorResponseDto,
    }),
    ApiResponse({
      status: 502,
      description: 'PROVIDER_UNSUPPORTED, PROVIDER_UNAVAILABLE.',
      type: OpenAiErrorResponseDto,
    }),
    ApiResponse({
      status: 504,
      description: 'PROVIDER_TIMEOUT.',
      type: OpenAiErrorResponseDto,
    }),
    ApiResponse({
      status: 503,
      description: 'PROVIDER_UNAVAILABLE.',
      type: OpenAiErrorResponseDto,
    }),
  );
}
