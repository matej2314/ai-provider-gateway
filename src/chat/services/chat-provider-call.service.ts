import { Injectable } from '@nestjs/common';
import { ProviderRegistryService } from '../../providers/provider-registry.service';
import { AiMetricsService } from '../../observability/ai-metrics/ai-metrics.service';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import { resolveProviderCallOptions } from '../helpers/resolve-provider-call-options';
import { buildProviderInputForAlias } from '../helpers/provider-input';
import {
  buildAppProviderMetricsContext,
  buildLlmMetricsContext,
  mapProviderResponseToAiObservation,
  mapProviderResponseToUsage,
} from '../helpers/metrics';
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
  asInputTokens,
  asOutputTokens,
  InputTokens,
  OutputTokens,
  type SystemFingerprint,
  type ClientId,
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
        inputTokens: InputTokens;
        outputTokens: OutputTokens;
        model?: string;
      }
    | undefined;
  toolCalls?: ProviderToolCall[];
  stopReason?: ProviderChatResponse['stopReason'];
  systemFingerprint?: SystemFingerprint;
  thinkingContent?: string;
  usageDetails?: ProviderUsageDetails;
}

export interface StreamOnceParams {
  requestBody: ChatRequestDto;
  alias: ModelAlias;
  requestId: RequestId;
  clientId: ClientId;
  resolvedPrompts: ResolvedSystemPrompts;
  emit: (event: SseEvent) => void;
  streamMeta: {
    gatewayId: ResponseId;
    primaryModelAlias: ModelAlias;
    responseConversationId: ConversationId;
    metaEmitted: { value: boolean };
  };
  signal?: AbortSignal;
}

@Injectable()
export class ChatProviderCallService {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly aiMetrics: AiMetricsService,
    private readonly appMetrics: AppMetricsService,
  ) {}

  // runOnce from executeChat
  async completeOnce(
    requestBody: ChatRequestDto,
    alias: ModelAlias,
    requestId: RequestId,
    clientId: ClientId,
    resolvedPrompts: ResolvedSystemPrompts,
    signal?: AbortSignal,
  ): Promise<CompleteOnceResult> {
    const resolved = this.registry.resolve(alias);
    const aliasOptions = {
      ...resolveProviderCallOptions(resolved.params, requestBody.params),
      ...(signal ? { signal } : {}),
    };
    const providerInput = buildProviderInputForAlias(
      requestBody,
      alias,
      resolvedPrompts,
    );
    const aiMetricsCtx = buildLlmMetricsContext(
      requestBody,
      asProviderInstanceId(resolved.providerName),
      alias,
      resolved.modelId,
      requestId,
    );

    const appMetricsCtx = buildAppProviderMetricsContext(
      'chat',
      resolved,
      alias,
      clientId,
    );

    const response = await this.appMetrics.observeProviderCall(
      appMetricsCtx,
      () =>
        this.aiMetrics.observeLlmCall(
          aiMetricsCtx,
          () =>
            resolved.provider.complete(
              providerInput,
              resolved.modelId,
              aliasOptions,
            ),
          mapProviderResponseToAiObservation,
        ),
      mapProviderResponseToUsage,
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
    const {
      requestBody,
      alias,
      requestId,
      clientId,
      resolvedPrompts,
      emit,
      streamMeta,
      signal,
    } = params;

    const resolved = this.registry.resolve(alias);

    const aliasOptions = {
      ...resolveProviderCallOptions(resolved.params, requestBody.params),
      ...(signal ? { signal } : {}),
    };

    const providerInput = buildProviderInputForAlias(
      requestBody,
      alias,
      resolvedPrompts,
    );

    const aiMetricsCtx = buildLlmMetricsContext(
      requestBody,
      asProviderInstanceId(resolved.providerName),
      alias,
      resolved.modelId,
      requestId,
    );

    const appMetricsCtx = buildAppProviderMetricsContext(
      'stream',
      resolved,
      alias,
      clientId,
    );

    const appScope = this.appMetrics.observeProviderStream(appMetricsCtx);
    const aiSpan = this.aiMetrics.observeLlmStream(aiMetricsCtx);
    let assembledText = '';

    try {
      const streamResult = aiSpan.withActiveSpan(() =>
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

      appScope.end(usageMetadata);
      aiSpan.end({
        responseModel: usageMetadata?.model,
        outputText: assembledText || undefined,
        usage: usageMetadata
          ? {
              inputTokens: asInputTokens(usageMetadata.inputTokens),
              outputTokens: asOutputTokens(usageMetadata.outputTokens),
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
        usageMetadata: usageMetadata
          ? {
              inputTokens: asInputTokens(usageMetadata.inputTokens),
              outputTokens: asOutputTokens(usageMetadata.outputTokens),
              model: usageMetadata.model,
            }
          : undefined,
        ...(toolCalls?.length && { toolCalls }),
        ...(stopReason && { stopReason }),
        ...(systemFingerprint && { systemFingerprint }),
        ...(thinkingContent && { thinkingContent }),
        ...(usageDetails ? { usageDetails } : {}),
      };
    } catch (error) {
      appScope.fail(error);
      aiSpan.fail({
        outputText: assembledText || undefined,
      });
      throw error;
    }
  }
}
