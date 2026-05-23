import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

// decorator for x-request-id header only for swagger documentation reasons

export function ApiRequestIdHeader() {
  return applyDecorators(
    ApiHeader({
      name: 'x-request-id',
      required: false,
      description:
        'Request correlation ID — echo request header `x-request-id` (if not empty) or `req_<uuid>`. Set by `RequestIdMiddleware` (`src/common/middleware/request-id.middleware.ts`) on all routes with middleware. The same ID as the `requestId` field in JSON (success, error, SSE `meta`).',
      example: 'req_123e4567-e89b-12d3-a456-426614174000',
    }),
  );
}
