import {
  asClientId,
  type GatewayKey,
  type ClientId,
} from './types/branded.types';
import type { ResolvedGatewayClient } from 'src/config/configuration.types';

export function resolveClientIdFromKey(
  gatewayKey: GatewayKey,
  clients: ResolvedGatewayClient[],
): ClientId {
  const client = clients.find((client) => client.gatewayKey === gatewayKey);
  return client?.name ? asClientId(client.name) : asClientId('unknown');
}
