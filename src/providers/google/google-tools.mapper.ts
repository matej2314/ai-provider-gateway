import {
  FunctionCallingConfigMode,
  createPartFromFunctionResponse,
  type Content,
  type FunctionDeclaration,
  type Part,
} from '@google/genai';
import type {
  ProviderChatResponse,
  ProviderChatTurn,
  ProviderToolDefinition,
  ProviderToolCall,
  ProviderAssistantTurn,
} from 'src/providers/interfaces/ai-provider.interface';
import type { GatewayToolChoice } from 'src/providers/types/tooling-types';

interface GeminiResponseWithTools {
  text?: string;
  functionCalls?: Array<{
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  }>;
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

function toParametersSchema(
  parameters: Record<string, unknown>,
): Record<string, unknown> {
  if (parameters.type === 'object') return parameters;
  return { type: 'object', properties: parameters };
}

export function mapToolsToGemini(
  tools: ProviderToolDefinition[],
): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    ...(tool.description && { description: tool.description }),
    parametersJsonSchema: toParametersSchema(tool.parameters),
  }));
}

export function mapToolChoiceToGemini(
  choice?: GatewayToolChoice,
):
  | { mode: FunctionCallingConfigMode; allowedFunctionNames?: string[] }
  | undefined {
  if (choice === undefined) return undefined;
  if (choice === 'none') {
    return { mode: FunctionCallingConfigMode.NONE };
  }
  if (choice === 'required') {
    return { mode: FunctionCallingConfigMode.ANY };
  }
  if (typeof choice === 'object' && choice.type === 'function') {
    return {
      mode: FunctionCallingConfigMode.ANY,
      allowedFunctionNames: [choice.function.name],
    };
  }
  return { mode: FunctionCallingConfigMode.AUTO };
}

function mapAssistantTurnToGeminiContent(turn: ProviderAssistantTurn): Content {
  const parts: Part[] = [];

  if (turn.content) {
    parts.push({ text: turn.content });
  }
  for (const toolCall of turn.toolCalls ?? []) {
    parts.push({
      functionCall: {
        id: toolCall.id,
        name: toolCall.name,
        args: JSON.parse(toolCall.arguments || '{}') as Record<string, unknown>,
      },
    });
  }
  return { role: 'model', parts };
}

export function mapTurnsToGeminiContents(turns: ProviderChatTurn[]): Content[] {
  const contents: Content[] = [];

  for (const turn of turns) {
    if (turn.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: turn.content }] });
      continue;
    }

    if (turn.role === 'assistant') {
      contents.push(mapAssistantTurnToGeminiContent(turn));
      continue;
    }
    if (turn.role === 'tool') {
      contents.push({
        role: 'user',
        parts: [
          createPartFromFunctionResponse(
            turn.toolCallId,
            turn.toolCallId,
            JSON.parse(turn.content || '{}') as Record<string, unknown>,
          ),
        ],
      });
    }
  }
  return contents;
}

export function parseGeminiResponseWithTools(
  response: GeminiResponseWithTools,
  modelId: string,
): ProviderChatResponse {
  const toolCalls: ProviderToolCall[] = [];

  for (const functionCall of response.functionCalls ?? []) {
    if (!functionCall.name) continue;
    toolCalls.push({
      id: functionCall.id ?? `call_${functionCall.name}`,
      name: functionCall.name,
      arguments: JSON.stringify(functionCall.args ?? {}),
    });
  }
  return {
    text: response.text ?? '',
    ...(toolCalls.length && { toolCalls }),
    ...(toolCalls.length && { stopReason: 'tool_use' }),
    ...(!toolCalls.length && { stopReason: 'end_turn' }),
    model: response.modelVersion ?? modelId,
    usage: response.usageMetadata
      ? {
          inputTokens: response.usageMetadata.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
        }
      : undefined,
  };
}
