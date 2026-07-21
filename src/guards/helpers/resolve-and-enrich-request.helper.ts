import type { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { resolveClientIdFromKey } from '../../common/resolveClientIdFromKey';
import { getAppConfig } from '../../config/typed-config';
import type { GatewayKey } from '../../common/types';

export function enrichRequestWithClientId(
  req: Request,
  gatewayKey: GatewayKey,
  config: ConfigService,
): void {
  const gatewayKeyConfig = getAppConfig(config, 'gatewayKey');
  const clients = gatewayKeyConfig?.clients ?? [];

  req.gatewayKey = gatewayKey;
  req.clientId = resolveClientIdFromKey(gatewayKey, clients);
}
