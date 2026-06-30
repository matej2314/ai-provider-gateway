export const PROVIDER_TYPES = [
  'anthropic',
  'google',
  'openai',
  'openai-compatible',
] as const;
export type GatewayProviderType = (typeof PROVIDER_TYPES)[number];

export type OpenAiProviderType = Extract<
  GatewayProviderType,
  'openai' | 'openai-compatible'
>;

export function isOpenAiProviderType(
  type: GatewayProviderType,
): type is OpenAiProviderType {
  return type === 'openai' || type === 'openai-compatible';
}

export function assertOpenAiProviderType(
  type: GatewayProviderType,
): asserts type is OpenAiProviderType {
  if (!isOpenAiProviderType(type)) {
    throw new Error(
      `[OpenAiProvider] Unsupported provider type "${type}". ` +
        `Only "openai" and "openai-compatible" are allowed.`,
    );
  }
}
