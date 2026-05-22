import type { GatewayConfig } from '../../config/configuration';

export function isCachedChatAllowedForModelAlias(
  gateway: GatewayConfig | undefined,
  modelAlias: string,
): boolean {
  if (!gateway) return false;

  const model = gateway.models[modelAlias];
  if (!model) return false;

  const providerRow = gateway.providers[model.providerInstance];
  if (!providerRow) return false;

  return providerRow.enabled === true;
}
