import type { Request } from 'express';
import { asGatewayKey, type GatewayKey } from './types';

export function readGatewayKeyHeader(req: Request): GatewayKey | undefined {
  const raw = req.header('x-gateway-key') ?? req.headers['x-gateway-key'];
  const trimmed = Array.isArray(raw) ? raw[0]?.trim() : raw?.trim();

  return trimmed ? asGatewayKey(trimmed) : undefined;
}
