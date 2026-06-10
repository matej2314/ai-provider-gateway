export type ResolvedSystemPrompts = {
  master: string;
  main?: string;
  perModelByAlias: Record<string, string>;
};

export type GatewayClientType =
  | 'webapp'
  | 'ide'
  | 'cli'
  | 'service'
  | 'backend'
  | 'automation';

export const GATEWAY_CLIENT_TYPES = [
  'webapp',
  'ide',
  'cli',
  'service',
  'backend',
  'automation',
] as const;

export type ResolvedGatewayClient = {
  instanceId: string;
  name: string;
  type: GatewayClientType;
  gatewayKeyRef: string;
  gatewayKey: string;
  rateLimit?: {
    rps: number;
    burst: number;
    maxConcurrentStreams: number;
  };
};

export type GatewayKeyRuntimeConfig = {
  allowList: string[];
  masterKey: string;
  clients: ResolvedGatewayClient[];
};
