export type GatewayToolDefinition = {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
};

export type GatewayToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type GatewayToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; function: { name: string } };
