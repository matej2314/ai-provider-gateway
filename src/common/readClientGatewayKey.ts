import type { Request } from 'express';
import { readGatewayKeyHeader } from './readGatewayKeyHeader';

export function readClientGatewayKey(req: Request): string | undefined {
  const fromFacade = req.gatewayKey?.trim() ?? undefined;
  if (fromFacade) return fromFacade;
  return readGatewayKeyHeader(req);
}
