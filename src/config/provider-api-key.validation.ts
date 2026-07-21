import type { z } from 'zod';
import type { GatewayConfigSchema } from './gateway-config.schema';
import {
  isOpenAiProviderType,
  type GatewayProviderType,
} from './provider-types';
import type { EnvRef } from '../common/types';
import {
  asProviderInstanceId,
  type ProviderInstanceId,
} from '../common/types/branded.types';

export type RawGatewayConfig = z.infer<typeof GatewayConfigSchema>;

export interface MissingProviderApiKey {
  instanceId: ProviderInstanceId;
  apiKeyRef: EnvRef;
}

export function isApiKeyRequiredForProviderType(
  type: GatewayProviderType,
): boolean {
  return !isOpenAiProviderType(type);
}

export function collectMissingEnabledProviderApiKeyErrors(
  config: RawGatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): MissingProviderApiKey[] {
  const missing: MissingProviderApiKey[] = [];
  for (const [instanceId, row] of Object.entries(config.providers)) {
    if (row.enabled === false) continue;
    if (!isApiKeyRequiredForProviderType(row.type)) continue;
    const key = (env[row.apiKeyRef] ?? '').trim();
    if (!key) {
      missing.push({
        instanceId: asProviderInstanceId(instanceId),
        apiKeyRef: row.apiKeyRef,
      });
    }
  }
  return missing;
}
export function formatMissingProviderApiKeyError(
  entry: MissingProviderApiKey,
): string {
  return (
    `[GatewayConfig] Missing API key for enabled provider instance "${entry.instanceId}" ` +
    `(expected non-empty env ${entry.apiKeyRef})`
  );
}
export function assertEnabledProviderApiKeysPresent(
  config: RawGatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const missing = collectMissingEnabledProviderApiKeyErrors(config, env);
  if (missing.length === 0) return;
  throw new Error(formatMissingProviderApiKeyError(missing[0]));
}
