import {
  asEnvRef,
  asProviderInstanceId,
  type EnvRef,
  type ProviderInstanceId,
} from '../../common/types/branded.types';

export function deriveApiKeyRef(instanceId: string): EnvRef {
  const slug = instanceId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_');
  return asEnvRef(`${slug}_API_KEY`);
}

export function deriveBaseUrlRef(instanceId: string): EnvRef {
  const slug = instanceId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_');
  return asEnvRef(`${slug}_BASE_URL`);
}

export function defaultProviderInstanceId(type: string): ProviderInstanceId {
  return asProviderInstanceId(`${type}-primary`);
}
