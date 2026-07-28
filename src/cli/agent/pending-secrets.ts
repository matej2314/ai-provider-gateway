import { isApiKeyRequiredForProviderType } from '../../config/provider-api-key.validation';
import { isOpenAiProviderType } from '../../config/provider-types';
import { asEnvRef } from '../../common/types';
import type { GatewayConfig } from '../../config/gateway-config.schema';
import type { PendingSecretsItem } from './agent-report';
import type { EnvPatchService } from '../services/env-patch.service';

export async function collectPendingSecrets(
  config: GatewayConfig,
  cwd: string,
  envPatch: EnvPatchService,
  options: {
    includeClientKeys?: boolean;
    includeMasterKey?: boolean;
    includeOperatorEnv?: boolean;
  },
): Promise<PendingSecretsItem[]> {
  const pending: PendingSecretsItem[] = [];
  const includeClientKeys = options.includeClientKeys === true;
  const includeMasterKey = options.includeMasterKey !== false;
  const includeOperatorEnv = options.includeOperatorEnv !== false;

  if (includeMasterKey) {
    const master = await envPatch.getVar(cwd, asEnvRef(config.masterKeyRef));
    if (!master?.trim()) {
      pending.push({
        envRef: config.masterKeyRef,
        file: '.env',
        reason: 'master_key',
      });
    }
  }

  for (const [instanceId, provider] of Object.entries(config.providers)) {
    if (provider.enabled === false) continue;

    if (isApiKeyRequiredForProviderType(provider.type)) {
      const key = await envPatch.getVar(cwd, provider.apiKeyRef);
      if (!key?.trim()) {
        pending.push({
          envRef: provider.apiKeyRef,
          file: '.env',
          reason: 'provider_api_key',
          providerInstance: instanceId,
        });
      }
    }
    if (isOpenAiProviderType(provider.type) && provider.baseUrlRef) {
      const base = await envPatch.getVar(cwd, provider.baseUrlRef);
      if (!base?.trim()) {
        pending.push({
          envRef: provider.baseUrlRef,
          file: '.env',
          reason: 'provider_base_url',
          providerInstance: instanceId,
        });
      }
    }
  }

  if (includeClientKeys) {
    for (const [clientId, client] of Object.entries(config.clients)) {
      const gatewayKey = await envPatch.getVar(cwd, client.gatewayKeyRef);
      if (!gatewayKey?.trim()) {
        pending.push({
          envRef: client.gatewayKeyRef,
          file: '.env',
          reason: 'client_gateway_key',
          clientId,
        });
      }
    }
  }

  if (includeOperatorEnv) {
    const sentryEnabled = (
      (await envPatch.getVar(cwd, asEnvRef('SENTRY_ENABLED'))) ?? ''
    )
      .trim()
      .toLowerCase();
    if (sentryEnabled === 'true' || sentryEnabled === '1') {
      const dsn = await envPatch.getVar(cwd, asEnvRef('SENTRY_DSN'));
      if (!dsn?.trim()) {
        pending.push({
          envRef: 'SENTRY_DSN',
          file: '.env',
          reason: 'sentry_dsn',
        });
      }
    }
  }
  return pending;
}
