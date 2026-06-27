import type { GatewayConfig } from 'src/config/gateway-config.schema';
import {
  PROVIDER_TYPES,
  type GatewayProviderType,
} from 'src/config/provider-types';
import type { EnvPatchService } from '../services/env-patch.service';

export const LEGACY_PROVIDER_API_KEY_ENV: Record<GatewayProviderType, string> =
  {
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
  };

export interface ProviderEnvEntry {
  type?: GatewayProviderType;
  apiKey: string;
}

/**
 * Mirrors provider API keys under legacy env names required by production
 * startup validation (ANTHROPIC_API_KEY / GOOGLE_API_KEY).
 */
export function applyLegacyProviderApiKeyEnv(
  env: Record<string, string>,
  providers: ProviderEnvEntry[],
): void {
  for (const type of PROVIDER_TYPES) {
    const legacyKey = LEGACY_PROVIDER_API_KEY_ENV[type];
    const provider = providers.find(
      (entry) => entry.type === type && entry.apiKey.trim(),
    );
    if (provider) {
      env[legacyKey] = provider.apiKey.trim();
    }
  }
}

export async function syncLegacyProviderApiKeysInEnv(
  envPatch: EnvPatchService,
  cwd: string,
  config: GatewayConfig,
): Promise<void> {
  for (const type of PROVIDER_TYPES) {
    const legacyKey = LEGACY_PROVIDER_API_KEY_ENV[type];
    const providerRow = Object.values(config.providers).find(
      (row) => row.type === type && row.enabled !== false,
    );

    if (!providerRow) {
      await envPatch.removeVar(cwd, legacyKey);
      continue;
    }

    const apiKey = await envPatch.getVar(cwd, providerRow.apiKeyRef);
    if (apiKey?.trim()) {
      await envPatch.setVar(cwd, legacyKey, apiKey.trim());
    } else {
      await envPatch.removeVar(cwd, legacyKey);
    }
  }
}
