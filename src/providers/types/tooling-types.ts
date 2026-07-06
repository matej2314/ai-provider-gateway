export type GatewayToolDefinition = {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
};

import type { ToolCallId } from '../../common/types/branded.types';

export type GatewayToolCall = {
  id: ToolCallId;
  name: string;
  arguments: string;
};

export type GatewayToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; function: { name: string } };
