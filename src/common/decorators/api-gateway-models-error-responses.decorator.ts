import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorEnvelopeDto } from '../dtos/error-envelope.dto';

export function ApiGatewayModelsErrorResponses() {
  return applyDecorators(
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
      status: 404,
      description: 'MODEL_ALIAS_NOT_FOUND',
      type: ErrorEnvelopeDto,
    }),
    ApiResponse({
      status: 429,
      description: 'RATE_LIMITED',
      type: ErrorEnvelopeDto,
    }),
    ApiResponse({
      status: 500,
      description: 'INTERNAL_SERVER_ERROR, GATEWAY_KEY_NOT_CONFIGURED',
      type: ErrorEnvelopeDto,
    }),
  );
}
