import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { mapStopReasonToFinishReason } from '../helpers/map-provider-finish-reason';
import { buildGenerationWarnings } from '../helpers/generation-warnings';
import type { SseEvent } from '../sse/sse-event.type';
import type {
  ProviderChatResponse,
  ProviderUsageDetails,
} from '../../providers/interfaces/ai-provider.interface';
import type { GatewayToolCall } from '../../providers/types/tooling-types';
import type { ProviderCallOptions } from '../../providers/interfaces/ai-provider.interface';
import { GatewayProviderType } from '../../config/provider-types';
import type { ChatResponseData } from '../dto/chat-response.dto';
import {
  asProviderInstanceId,
  asModelAlias,
  asResponseId,
  type RequestId,
  type ConversationId,
  type ModelAlias,
  type InputTokens,
  type OutputTokens,
  type SystemFingerprint,
} from '../../common/types/branded.types';

export type { ChatResponseData } from '../dto/chat-response.dto';

export interface ProviderResponse {
  text: string;
  usage?: {
    inputTokens?: InputTokens;
    outputTokens?: OutputTokens;
    totalTokens?: number;
  };
  toolCalls?: GatewayToolCall[];
  stopReason: ProviderChatResponse['stopReason'];
  usageDetails?: ProviderUsageDetails;
  systemFingerprint?: SystemFingerprint;
  thinkingContent?: string;
}

@Injectable()
export class ChatResponseBuilderService {
  buildChatResponse(
    response: ProviderResponse,
    providerName: string,
    modelAlias: ModelAlias,
    requestId: RequestId,
    conversationId: ConversationId,
    effectiveModelAlias?: ModelAlias,
    options?: ProviderCallOptions,
    providerType?: GatewayProviderType,
  ): ChatResponseData {
    const warnings =
      options && providerType
        ? buildGenerationWarnings(options, providerType)
        : [];

    return {
      id: asResponseId(`gw_${uuidv4()}`),
      provider: asProviderInstanceId(providerName),
      model: asModelAlias(modelAlias),
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
      ...(warnings.length > 0 && { warnings }),
    };
  }

  buildStreamDoneEvent(
    usageMetadata:
      | {
          inputTokens: InputTokens;
          outputTokens: OutputTokens;
        }
      | undefined,
    toolCalls: GatewayToolCall[] | undefined,
    stopReason: ProviderChatResponse['stopReason'] | undefined,
    systemFingerprint: SystemFingerprint | undefined,
    thinkingContent: string | undefined,
    options?: ProviderCallOptions,
    providerType?: GatewayProviderType,
    usageDetails?: ProviderUsageDetails,
    effectiveModelAlias?: ModelAlias,
  ): SseEvent {
    const warnings =
      options && providerType
        ? buildGenerationWarnings(options, providerType)
        : [];

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
        ...(usageDetails ? { usageDetails } : {}),
        ...(effectiveModelAlias && { effectiveModelAlias }),
        ...(warnings.length > 0 && { warnings }),
      },
    };
  }
}
