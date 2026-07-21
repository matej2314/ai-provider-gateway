import type { GatewayConfig } from 'src/config/gateway-config.schema';
import type {
  ModelAlias,
  ProviderInstanceId,
} from '../../common/types/branded.types';

export function countActiveModelsAfterProviderChange(
  config: GatewayConfig,
  disabledInstanceIds: Set<ProviderInstanceId> = new Set(),
  removedInstanceIds: Set<ProviderInstanceId> = new Set(),
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
  alias: ModelAlias,
): boolean {
  return (
    Object.keys(config.models).length === 1 && config.models[alias] != null
  );
}

export function countModelsForInstance(
  config: GatewayConfig,
  instanceId: ProviderInstanceId,
): number {
  return Object.values(config.models).filter(
    (model) => model.providerInstance === instanceId,
  ).length;
}

export function isLastModelForEnabledProvider(
  config: GatewayConfig,
  alias: ModelAlias,
): boolean {
  const model = config.models[alias];
  if (!model) return false;
  const provider = config.providers[model.providerInstance];
  if (!provider || provider.enabled === false) return false;
  return countModelsForInstance(config, model.providerInstance) === 1;
}
