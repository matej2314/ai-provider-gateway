import type { GatewayConfig } from 'src/config/gateway-config.schema';
import {
  PROVIDER_TYPES,
  type GatewayProviderType,
} from 'src/config/provider-types';
import {
  asEnvRef,
  asProviderApiKey,
  type EnvRef,
  type ProviderApiKey,
} from 'src/common/types';
import type { EnvPatchService } from '../services/env-patch.service';

export const LEGACY_PROVIDER_API_KEY_ENV: Partial<
  Record<GatewayProviderType, EnvRef>
> = {
  anthropic: asEnvRef('ANTHROPIC_API_KEY'),
  google: asEnvRef('GOOGLE_API_KEY'),
  openai: asEnvRef('OPENAI_API_KEY'),
};

export interface ProviderEnvEntry {
  type?: GatewayProviderType;
  apiKey: ProviderApiKey;
}

/**
 * Mirrors provider API keys under legacy env names required by production
 * startup validation (ANTHROPIC_API_KEY / GOOGLE_API_KEY / OPENAI_API_KEY).
 */
export function applyLegacyProviderApiKeyEnv(
  env: Record<string, string>,
  providers: ProviderEnvEntry[],
): void {
  for (const type of PROVIDER_TYPES) {
    const legacyKey = LEGACY_PROVIDER_API_KEY_ENV[type];
    if (!legacyKey) continue;

    const provider = providers.find(
      (entry) => entry.type === type && String(entry.apiKey).trim(),
    );
    if (provider) {
      env[legacyKey] = String(provider.apiKey).trim();
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
    if (!legacyKey) continue;

    const legacyEnvRef = asEnvRef(legacyKey);
    const providerRow = Object.values(config.providers).find(
      (row) => row.type === type && row.enabled !== false,
    );

    if (!providerRow) {
      await envPatch.removeVar(cwd, legacyEnvRef);
      continue;
    }

    const apiKey = await envPatch.getVar(cwd, providerRow.apiKeyRef);
    if (apiKey?.trim()) {
      await envPatch.setVar(cwd, legacyEnvRef, asProviderApiKey(apiKey.trim()));
    } else {
      await envPatch.removeVar(cwd, legacyEnvRef);
    }
  }
}
