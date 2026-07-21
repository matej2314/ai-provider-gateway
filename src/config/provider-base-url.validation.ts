import { isOpenAiProviderType } from './provider-types';
import type { z } from 'zod';
import type { GatewayConfigSchema } from './gateway-config.schema';
import {
  asProviderInstanceId,
  type EnvRef,
  type ProviderInstanceId,
} from '../common/types/branded.types';

export type RawGatewayConfig = z.infer<typeof GatewayConfigSchema>;

export interface MissingProviderBaseUrl {
  instanceId: ProviderInstanceId;
  baseUrlRef: EnvRef;
}

export function resolveBaseUrlFromEnv(
  baseUrlRef: EnvRef | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (!baseUrlRef?.trim()) return '';
  const raw = (env[baseUrlRef] ?? '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return raw.replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function collectMissingBaseUrlErrors(
  config: RawGatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): MissingProviderBaseUrl[] {
  const missing: MissingProviderBaseUrl[] = [];
  for (const [instanceId, row] of Object.entries(config.providers)) {
    if (row.enabled === false) continue;
    if (!isOpenAiProviderType(row.type)) continue;
    if (!row.baseUrlRef?.trim()) continue;
    const resolved = resolveBaseUrlFromEnv(row.baseUrlRef, env);
    if (!resolved) {
      missing.push({
        instanceId: asProviderInstanceId(instanceId),
        baseUrlRef: row.baseUrlRef,
      });
    }
  }
  return missing;
}

export function formatMissingBaseUrlError(
  entry: MissingProviderBaseUrl,
): string {
  return (
    `[GatewayConfig] Missing or invalid base URL for enabled provider instance "${entry.instanceId}" ` +
    `(expected valid http(s) URL in env ${entry.baseUrlRef})`
  );
}

export function assertEnabledProviderBaseUrlPresent(
  config: RawGatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const missing = collectMissingBaseUrlErrors(config, env);
  if (missing.length === 0) return;
  throw new Error(formatMissingBaseUrlError(missing[0]));
}
