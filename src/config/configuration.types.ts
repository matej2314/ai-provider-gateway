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
  
  export type ResolvedGatewayClient = {
    instanceId: string;
    name: string;
    type: GatewayClientType;
    gatewayKeyRef: string;
    gatewayKey: string;
  };
  
  export type GatewayKeyRuntimeConfig = {
    allowList: string[];
    masterKey: string;
    clients: ResolvedGatewayClient[];
  };