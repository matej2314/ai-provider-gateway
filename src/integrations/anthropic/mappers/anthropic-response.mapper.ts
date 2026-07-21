import { mapGatewayFinishReasonToAnthropicStopReason } from './anthropic-stop-reason.mapper';
import { parseJsonObject } from '../../../providers/helpers/parse-json-object';
import { mapGatewayUsageToAnthropic } from './anthropic-usage.mapper';
import type { ChatResponseDto } from '../../../chat/dto/chat-response.dto';
import type {
  AnthropicMessagesResponseDto,
  AnthropicContentBlock,
} from '../dtos/anthropic-messages-response.dto';
import type { GatewayToolCall } from '../../../providers/types/tooling-types';
import { fromGatewayToolCallDto } from '../../../common/dtos/gateway-tool-call.dto';

function mapGatewayToolCallsToAnthropic(
  toolCalls: GatewayToolCall[],
): AnthropicContentBlock[] {
  return toolCalls.map((toolCall) => {
    let input: Record<string, unknown>;
    try {
      input = parseJsonObject(toolCall.arguments || '{}');
    } catch {
      input = {};
    }
    return {
      type: 'tool_use',
      id: toolCall.id,
      name: toolCall.name,
      input,
    };
  });
}

export function mapGatewayResponseToAnthropicFormat(
  result: ChatResponseDto,
  requestedModel: string,
): AnthropicMessagesResponseDto {
  const content: AnthropicContentBlock[] = [];

  if (result.thinkingContent) {
    content.push({
      type: 'thinking',
      thinking: result.thinkingContent,
    });
  }

  if (result.output.text !== undefined && result.output.text !== '') {
    content.push({ type: 'text', text: result.output.text });
  }

  if (result.toolCalls?.length) {
    content.push(
      ...mapGatewayToolCallsToAnthropic(
        result.toolCalls.map(fromGatewayToolCallDto),
      ),
    );
  }

  return {
    id: `msg_${result.id.replace(/^gw_/, '')}`,
    type: 'message',
    role: 'assistant',
    content,
    model: requestedModel,
    stop_reason: mapGatewayFinishReasonToAnthropicStopReason(
      result.finishReason,
    ),
    stop_sequence: null,
    usage: mapGatewayUsageToAnthropic(result.usage, result.usageDetails),
  };
}
