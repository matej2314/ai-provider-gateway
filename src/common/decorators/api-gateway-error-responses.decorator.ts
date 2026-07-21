import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../dtos/error-envelope.dto';

export function ApiGatewayChatErrorResponses() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description:
        'Walidacja, MODEL_ALIAS_NOT_FOUND, MODEL_NOT_ALLOWED, STREAMING_NOT_SUPPORTED (stream)',
      type: ErrorEnvelopeDto,
    }),
    ApiResponse({
      status: 401,
      description: 'GATEWAY_KEY_MISSING',
      type: ErrorEnvelopeDto,
    }),
    ApiResponse({
      status: 403,
      description: 'GATEWAY_KEY_INVALID',
      type: ErrorEnvelopeDto,
    }),
    ApiResponse({
      status: 429,
      description: 'RATE_LIMITED lub PROVIDER_RATE_LIMITED',
      type: ErrorEnvelopeDto,
    }),
    ApiResponse({
      status: 500,
      description: 'INTERNAL_SERVER_ERROR, GATEWAY_KEY_NOT_CONFIGURED',
      type: ErrorEnvelopeDto,
    }),
    ApiResponse({
      status: 502,
      description: 'PROVIDER_UNSUPPORTED, PROVIDER_UNAVAILABLE',
      type: ErrorEnvelopeDto,
    }),
    ApiResponse({
      status: 504,
      description: 'PROVIDER_TIMEOUT',
      type: ErrorEnvelopeDto,
    }),
  );
}
