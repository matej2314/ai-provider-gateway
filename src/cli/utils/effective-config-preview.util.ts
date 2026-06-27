import type { GatewayConfig } from 'src/config/gateway-config.schema';

export function countActiveModelsAfterProviderChange(
  config: GatewayConfig,
  disabledInstanceIds: Set<string> = new Set(),
  removedInstanceIds: Set<string> = new Set(),
): number {
  let count = 0;
  for (const model of Object.values(config.models)) {
    if (removedInstanceIds.has(model.providerInstance)) continue;
    const provider = config.providers[model.providerInstance];
    if (!provider) continue;
    if (disabledInstanceIds.has(model.providerInstance)) continue;
    if (provider.enabled === false) continue;
    count++;
  }
  return count;
}

export function isLastModelInConfig(
  config: GatewayConfig,
  alias: string,
): boolean {
  return Object.keys(config.models).length === 1 && config.models[alias] != null;
}

export function countModelsForInstance(
  config: GatewayConfig,
  instanceId: string,
): number {
  return Object.values(config.models).filter(
    (model) => model.providerInstance === instanceId,
  ).length;
}

export function isLastModelForEnabledProvider(
  config: GatewayConfig,
  alias: string,
): boolean {
  const model = config.models[alias];
  if (!model) return false;
  const provider = config.providers[model.providerInstance];
  if (!provider || provider.enabled === false) return false;
  return countModelsForInstance(config, model.providerInstance) === 1;
}
