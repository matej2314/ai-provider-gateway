import type { Request } from 'express';

export function readGatewayKeyHeader(req: Request) {
  const raw = req.header('x-gateway-key') ?? req.headers['x-gateway-key'];
  const gatewayKey = Array.isArray(raw) ? raw[0]?.trim() : raw?.trim();

  return gatewayKey as string;
}
