export const PROVIDER_TYPES = ['anthropic', 'google'] as const;
export type GatewayProviderType = (typeof PROVIDER_TYPES)[number];
