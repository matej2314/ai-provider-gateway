export function deriveApiKeyRef(instanceId: string): string {
  const slug = instanceId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_');
  return `${slug}_API_KEY`;
}

export function deriveBaseUrlRef(instanceId: string): string {
  const slug = instanceId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_');
  return `${slug}_BASE_URL`;
}

export function defaultProviderInstanceId(type: string): string {
  return `${type}-primary`;
}
