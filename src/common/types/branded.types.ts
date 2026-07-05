/**
 * Core brand type utility
 * @template K - Base primitive type
 * @template T - Brand identifier
 */

export type Brand<K, T> = K & { readonly __brand: T };

/**
 * Utility to extract base type from branded type
 */

export type UnBrand<T> = T extends Brand<infer K, any> ? K : T;

/**
 * Generic cast function (runtime no-op, compile-time type assertion)
 */

export const brand = <B>(value: UnBrand<B>): B => value as B;

/**
 * Generic unbrand function
 */

export const unbrand = <B>(value: B): UnBrand<B> => value as UnBrand<B>;

export type ConversationId = Brand<string, 'ConversationId'>;
export type RequestId = Brand<string, 'RequestId'>;

export const asRequestId = (value: string): RequestId => value as RequestId;
export const asConversationId = (value: string): ConversationId =>
  value as ConversationId;

/**
 * Gateway client authorization key (from allowlist)
 * DO NOT confuse with ProviderApiKey!
 */
export type GatewayKey = Brand<string, 'GatewayKey'>;

/**
 * Provider API key for SDK calls (e.g., ANTHROPIC_API_KEY)
 * DO NOT confuse with GatewayKey!
 */
export type ProviderApiKey = Brand<string, 'ProviderApiKey'>;

/**
 * Environment variable reference (e.g., "ANTHROPIC_PRIMARY_API_KEY")
 */
export type EnvRef = Brand<string, 'EnvRef'>;

export const asGatewayKey = (value: string): GatewayKey => value as GatewayKey;
export const asProviderApiKey = (value: string): ProviderApiKey =>
  value as ProviderApiKey;
export const asEnvRef = (value: string): EnvRef => value as EnvRef;
