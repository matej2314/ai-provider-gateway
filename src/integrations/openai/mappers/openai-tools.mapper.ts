import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from '../../../common/errors/api-error.code';
import type {
  GatewayToolDefinition,
  GatewayToolChoice,
} from '../../../providers/types/tooling-types';

type OpenAiFunctionTool = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export function mapOpenAiToolsToGateway(
  tools: unknown[],
): GatewayToolDefinition[] {
  const definitions: GatewayToolDefinition[] = [];

  for (const raw of tools) {
    if (!raw || typeof raw !== 'object') continue;
    const tool = raw as Partial<OpenAiFunctionTool>;
    if (tool.type !== 'function' || !tool.function?.name) continue;

    definitions.push({
      name: tool.function.name,
      ...(tool.function.description && {
        description: tool.function.description,
      }),
      parameters: tool.function.parameters ?? {},
    });
  }

  if (tools.length > 0 && definitions.length === 0) {
    throw new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message: 'Tools must contain at least one valid function tool',
      details: [],
    });
  }
  return definitions;
}

export function mapOpenAiToolChoice(
  toolChoice: unknown,
): GatewayToolChoice | undefined {
  if (!toolChoice) return undefined;

  if (
    toolChoice === 'auto' ||
    toolChoice === 'none' ||
    toolChoice === 'required'
  ) {
    return toolChoice;
  }

  if (typeof toolChoice === 'object' && toolChoice !== null) {
    const choice = toolChoice as {
      type?: string;
      function?: { name?: string };
    };
    if (choice.type === 'function' && choice.function?.name) {
      return { type: 'function', function: { name: choice.function.name } };
    }
  }

  throw new BadRequestException({
    code: ApiErrorCode.VALIDATION_FAILED,
    message: 'Invalid tool_choice value',
    details: [],
  });
}
