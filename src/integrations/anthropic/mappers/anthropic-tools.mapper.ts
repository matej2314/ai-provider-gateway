import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import type { ChatMessageDto } from '../../../chat/dto/chat-message.dto';
import type {
  GatewayToolDefinition,
  GatewayToolCall,
  GatewayToolChoice,
} from '../../../providers/types/tooling-types';
import type { AnthropicContentBlockDto } from '../dtos/anthropic-content-block.dto';
import { asToolCallId } from '../../../common/types/branded.types';

type AnthropicTool = {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
};

export function mapAnthropicToolsToGateway(
  tools: unknown[],
): GatewayToolDefinition[] {
  const definitions: GatewayToolDefinition[] = [];

  for (const raw of tools) {
    if (!raw || typeof raw !== 'object') continue;
    const tool = raw as Partial<AnthropicTool>;
    if (!tool.name) continue;

    definitions.push({
      name: tool.name,
      ...(tool.description && { description: tool.description }),
      parameters: tool.input_schema ?? {},
    });
  }
  return definitions;
}

export function mapAnthropicToolChoice(
  toolChoice: unknown,
): GatewayToolChoice | undefined {
  if (!toolChoice) return undefined;

  if (toolChoice && typeof toolChoice === 'object') {
    const choice = toolChoice as { type?: string; name?: string };

    if (choice.type === 'auto') return 'auto';
    if (choice.type == 'any') return 'required';
    if (choice.type === 'tool' && choice.name) {
      return { type: 'function', function: { name: choice.name } };
    }
  }
  throw new BadRequestException({
    code: ApiErrorCode.VALIDATION_FAILED,
    message: 'Invalid tool_choice value',
    details: [],
  });
}

export function mapAnthropicContentBlockToGateway(
  role: 'user' | 'assistant',
  blocks: AnthropicContentBlockDto[],
): ChatMessageDto[] {
  if (blocks.some((block) => block.type === 'image')) {
    throw new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message: 'Image content block are not supported.',
      details: [],
    });
  }

  let textContent = '';
  const messages: ChatMessageDto[] = [];
  const toolMessages: ChatMessageDto[] = [];
  const toolCalls: GatewayToolCall[] = [];

  for (const block of blocks) {
    if (block.type === 'text' && block.text) {
      textContent += block.text;
    } else if (block.type === 'tool_use' && block.id && block.name) {
      toolCalls.push({
        id: asToolCallId(block.id),
        name: block.name,
        arguments: JSON.stringify(block.input ?? {}),
      });
    } else if (block.type === 'tool_result' && block.tool_use_id) {
      toolMessages.push({
        role: 'tool',
        toolCallId: block.tool_use_id,
        content: block.content ?? '',
      });
    }
  }

  if (role === 'user' && textContent) {
    if (textContent) {
      messages.push({ role: 'user', content: textContent });
    }
  }

  if (role === 'assistant') {
    messages.push({
      role: 'assistant',
      content: textContent,
      ...(toolCalls.length && { toolCalls }),
    });
  }
  messages.push(...toolMessages);

  if (messages.length === 0) {
    throw new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message: 'Each message must have at least one supported content block.',
      details: [],
    });
  }
  return messages;
}
