import { UnauthorizedException } from '@nestjs/common';
import { readClientGatewayKey } from './readClientGatewayKey';
import { ApiErrorCode } from './errors/api-error.code';
import type { GatewayKey } from './types';
import type { Request } from 'express';

export function requireClientGatewayKey(req: Request): GatewayKey {
  const gatewayKey = readClientGatewayKey(req);

  if (!gatewayKey) {
    throw new UnauthorizedException({
      statusCode: 401,
      code: ApiErrorCode.GATEWAY_KEY_MISSING,
      message: 'Missing client gateway key.',
      requestId: req.requestId,
      details: [],
    });
  }

  return gatewayKey;
}
