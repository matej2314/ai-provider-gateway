import { Injectable } from '@nestjs/common';
import { ProviderRegistryService } from '../../providers/provider-registry.service';
import { MetricsService } from '../../metrics/metrics.service';
import { resolveProviderCallOptions } from '../helpers/resolve-provider-call-options';
import { buildProviderInputForAlias } from '../helpers/provider-input';
import { buildLlmMetricsContext } from '../helpers/metrics';
import type { ResolvedSystemPrompts } from '../../config/configuration.types';
import type {
  ProviderChatResponse,
  ProviderToolCall,
  ProviderUsageDetails,
} from '../../providers/interfaces/ai-provider.interface';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { SseEvent } from '../sse/sse-event.type';
import type { ResolvedProviderConfig } from '../../providers/provider-registry.service';
import {
  asProviderInstanceId,
  type RequestId,
  type ConversationId,
  type ModelAlias,
  type ModelId,
  type ResponseId,
  ProviderInstanceId,
  asModelId,
} from '../../common/types/branded.types';

export interface CompleteOnceResult {
  response: ProviderChatResponse;
  providerName: ProviderInstanceId;
  modelId: ModelId;
  resolved: ResolvedProviderConfig;
}

export interface StreamOnceResult {
  providerName: ProviderInstanceId;
  modelId: ModelId;
  assembledText: string;
  usageMetadata:
    | {
        inputTokens: number;
        outputTokens: number;
        model?: string;
      }
    | undefined;
  toolCalls?: ProviderToolCall[];
  stopReason?: ProviderChatResponse['stopReason'];
  systemFingerprint?: string;
  thinkingContent?: string;
  usageDetails?: ProviderUsageDetails;
}

export interface StreamOnceParams {
  requestBody: ChatRequestDto;
  alias: ModelAlias;
  requestId: RequestId;
  resolvedPrompts: ResolvedSystemPrompts;
  emit: (event: SseEvent) => void;
  streamMeta: {
    gatewayId: ResponseId;
    primaryModelAlias: ModelAlias;
    responseConversationId: ConversationId;
    metaEmitted: { value: boolean };
  };
}

@Injectable()
export class ChatProviderCallService {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly metricsService: MetricsService,
  ) {}

  // runOnce from executeChat
  async completeOnce(
    requestBody: ChatRequestDto,
    alias: ModelAlias,
    requestId: RequestId,
    resolvedPrompts: ResolvedSystemPrompts,
  ): Promise<CompleteOnceResult> {
    const resolved = this.registry.resolve(alias);
    const aliasOptions = resolveProviderCallOptions(
      resolved.params,
      requestBody.params,
    );
    const providerInput = buildProviderInputForAlias(
      requestBody,
      alias,
      resolvedPrompts,
    );
    const metricsCtx = buildLlmMetricsContext(
      requestBody,
      asProviderInstanceId(resolved.providerName),
      alias,
      resolved.modelId,
      requestId,
    );

    const response = await this.metricsService.observeLlmCall(
      metricsCtx,
      () =>
        resolved.provider.complete(
          providerInput,
          resolved.modelId,
          aliasOptions,
        ),
      (res) => ({
        responseModel: res.model,
        outputText: res.text,
        usage: res.usage
          ? {
              inputTokens: res.usage.inputTokens,
              outputTokens: res.usage.outputTokens,
            }
          : undefined,
      }),
    );

    return {
      response,
      providerName: asProviderInstanceId(resolved.providerName),
      modelId: asModelId(resolved.modelId),
      resolved,
    };
  }

  // runOnce from executeStream
  async streamOnce(params: StreamOnceParams): Promise<StreamOnceResult> {
    const { requestBody, alias, requestId, resolvedPrompts, emit, streamMeta } =
      params;

    const resolved = this.registry.resolve(alias);

    const aliasOptions = resolveProviderCallOptions(
      resolved.params,
      requestBody.params,
    );

    const providerInput = buildProviderInputForAlias(
      requestBody,
      alias,
      resolvedPrompts,
    );

    const metricsCtx = buildLlmMetricsContext(
      requestBody,
      asProviderInstanceId(resolved.providerName),
      alias,
      resolved.modelId,
      requestId,
    );

    const spanController = this.metricsService.observeLlmStream(metricsCtx);
    let assembledText = '';

    try {
      const streamResult = spanController.withActiveSpan(() =>
        resolved.provider.stream!(
          providerInput,
          resolved.modelId,
          aliasOptions,
        ),
      );

      if (!streamMeta.metaEmitted.value) {
        emit({
          name: 'meta',
          data: {
            id: streamMeta.gatewayId,
            provider: asProviderInstanceId(resolved.providerName),
            model: streamMeta.primaryModelAlias,
            ...(alias !== streamMeta.primaryModelAlias && {
              effectiveModelAlias: alias,
            }),
            requestId,
            conversationId: streamMeta.responseConversationId,
          },
        });
        streamMeta.metaEmitted.value = true;
      }

      for await (const textChunk of streamResult.textStream) {
        assembledText += textChunk;
        emit({ name: 'delta', data: { text: textChunk } });
      }

      const toolCalls = streamResult.getFinalToolCalls
        ? await streamResult.getFinalToolCalls()
        : undefined;
      const stopReason = streamResult.getStopReason
        ? await streamResult.getStopReason()
        : undefined;

      const usageMetadata = await streamResult.getUsageMetadata();

      spanController.end({
        responseModel: usageMetadata?.model,
        outputText: assembledText || undefined,
        usage: usageMetadata
          ? {
              inputTokens: usageMetadata.inputTokens,
              outputTokens: usageMetadata.outputTokens,
            }
          : undefined,
      });

      const systemFingerprint = streamResult.getSystemFingerprint
        ? await streamResult.getSystemFingerprint()
        : undefined;

      const thinkingContent = streamResult.getThinkingContent
        ? await streamResult.getThinkingContent()
        : undefined;

      const usageDetails = streamResult.getUsageDetails
        ? await streamResult.getUsageDetails()
        : undefined;

      return {
        providerName: asProviderInstanceId(resolved.providerName),
        modelId: asModelId(resolved.modelId),
        assembledText: assembledText || '',
        usageMetadata: usageMetadata,
        ...(toolCalls?.length && { toolCalls }),
        ...(stopReason && { stopReason }),
        ...(systemFingerprint && { systemFingerprint }),
        ...(thinkingContent && { thinkingContent }),
        ...(usageDetails ? { usageDetails } : {}),
      };
    } catch (error) {
      spanController.fail({
        outputText: assembledText || undefined,
      });
      throw error;
    }
  }
}
