import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { mapStopReasonToFinishReason } from '../helpers/map-provider-finish-reason';
import type { SseEvent } from '../sse/sse-event.type';
import type {
  ProviderChatResponse,
  ProviderUsageDetails,
} from '../../providers/interfaces/ai-provider.interface';
import type { GatewayToolCall } from '../../providers/types/tooling-types';

export interface ProviderResponse {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  toolCalls?: GatewayToolCall[];
  stopReason: ProviderChatResponse['stopReason'];
  usageDetails?: ProviderUsageDetails;
  systemFingerprint?: string;
  thinkingContent?: string;
}

export interface ChatResponseData {
  id: string;
  provider: string;
  model: string;
  effectiveModelAlias?: string;
  output: {
    type: 'text';
    text: string;
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  requestId: string;
  conversationId: string;
  toolCalls?: any[];
  finishReason?: string;
  usageDetails?: any;
  systemFingerprint?: string;
  thinkingContent?: string;
}

@Injectable()
export class ChatResponseBuilderService {
  buildChatResponse(
    response: ProviderResponse,
    providerName: string,
    modelAlias: string,
    requestId: string,
    conversationId: string,
    effectiveModelAlias?: string,
  ): ChatResponseData {
    return {
      id: `gw_${uuidv4()}`,
      provider: providerName,
      model: modelAlias,
      ...(effectiveModelAlias && { effectiveModelAlias }),
      output: {
        type: 'text',
        text: response.text,
      },
      usage: response.usage,
      requestId: requestId,
      conversationId: conversationId,
      ...(response.toolCalls?.length && { toolCalls: response.toolCalls }),
      finishReason: mapStopReasonToFinishReason(
        response.stopReason,
        response.toolCalls,
      ),
      ...(response.usageDetails ? { usageDetails: response.usageDetails } : {}),
      ...(response.systemFingerprint
        ? { systemFingerprint: response.systemFingerprint }
        : {}),
      ...(response.thinkingContent && {
        thinkingContent: response.thinkingContent,
      }),
    };
  }

  buildStreamDoneEvent(
    usageMetadata:
      | {
          inputTokens: number;
          outputTokens: number;
        }
      | undefined,
    toolCalls: GatewayToolCall[] | undefined,
    stopReason: ProviderChatResponse['stopReason'] | undefined,
    systemFingerprint: string | undefined,
    thinkingContent: string | undefined,
  ): SseEvent {
    return {
      name: 'done',
      data: {
        ...(usageMetadata && {
          usage: {
            inputTokens: usageMetadata.inputTokens,
            outputTokens: usageMetadata.outputTokens,
            totalTokens: usageMetadata.inputTokens + usageMetadata.outputTokens,
          },
        }),
        ...(toolCalls?.length && { toolCalls }),
        finishReason: mapStopReasonToFinishReason(stopReason, toolCalls),
        ...(systemFingerprint && { systemFingerprint }),
        ...(thinkingContent && { thinkingContent }),
      },
    };
  }
}
