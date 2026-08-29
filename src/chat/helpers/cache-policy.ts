import type { GatewayConfig } from '../../config/configuration';
import type { ChatResponseData } from '../dto/chat-response.dto';

export function isCachedChatAllowedForModelAlias(
  gateway: GatewayConfig | undefined,
  modelAlias: string,
): boolean {
  if (!gateway) return false;

  const model = gateway.models[modelAlias];
  if (!model) return false;

  const providerRow = gateway.providers[model.providerInstance];
  if (!providerRow) return false;

  return providerRow.enabled === true;
}

export function shouldStoreChatResponse(response: ChatResponseData): boolean {
  if (response.finishReason !== 'stop') return false;
  if (response.output.text.trim().length === 0) return false;
  if ((response.toolCalls?.length ?? 0) > 0) return false;
  return true;
}
