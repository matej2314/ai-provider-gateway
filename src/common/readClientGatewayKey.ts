import { readGatewayKeyHeader } from './readGatewayKeyHeader';
import { asGatewayKey, type GatewayKey } from './types';
import type { Request } from 'express';

export function readClientGatewayKey(req: Request): GatewayKey | undefined {
  const fromFacade = req.gatewayKey?.trim() ?? undefined;
  if (fromFacade) {
    return asGatewayKey(fromFacade);
  }
  return readGatewayKeyHeader(req);
}
