import type { GatewayKey, EnvRef } from '../common/types';
import type {
  MaxConcurrentStreams,
  ProviderInstanceId,
  RateLimitBurst,
  RateLimitRps,
} from '../common/types/branded.types';

export type ResolvedSystemPrompts = {
  master: string;
  main?: string;
  perModelByAlias: Record<string, string>;
};

export const GATEWAY_CLIENT_TYPES = [
  'webapp',
  'ide',
  'cli',
  'service',
  'backend',
  'automation',
] as const;

export type GatewayClientType = (typeof GATEWAY_CLIENT_TYPES)[number];

export type ResolvedGatewayClient = {
  instanceId: ProviderInstanceId;
  name: string;
  type: GatewayClientType;
  gatewayKeyRef: EnvRef;
  gatewayKey: GatewayKey;
  rateLimit?: {
    rps: RateLimitRps;
    burst: RateLimitBurst;
    maxConcurrentStreams: MaxConcurrentStreams;
  };
};

export type GatewayKeyRuntimeConfig = {
  allowList: GatewayKey[];
  masterKey: GatewayKey;
  clients: ResolvedGatewayClient[];
};
