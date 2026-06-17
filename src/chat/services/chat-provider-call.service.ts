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
} from '../../providers/interfaces/ai-provider.interface';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { SseEvent } from '../sse/sse-event.type';
import type { ResolvedProviderConfig } from '../../providers/provider-registry.service';

export interface CompleteOnceResult {
  response: ProviderChatResponse;
  providerName: string;
  modelId: string;
  resolved: ResolvedProviderConfig;
}

export interface StreamOnceResult {
  providerName: string;
  modelId: string;
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
}

export interface StreamOnceParams {
  requestBody: ChatRequestDto;
  alias: string;
  requestId: string;
  resolvedPrompts: ResolvedSystemPrompts;
  emit: (event: SseEvent) => void;
  streamMeta: {
    gatewayId: string;
    primaryModelAlias: string;
    responseConversationId: string;
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
    alias: string,
    requestId: string,
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
      resolved.providerName,
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
      providerName: resolved.providerName,
      modelId: resolved.modelId,
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
      resolved.providerName,
      alias,
      resolved.modelId,
      requestId,
    );

    const spanController = this.metricsService.observeLlmStream(metricsCtx);
    const streamResult = resolved.provider.stream!(
      providerInput,
      resolved.modelId,
      aliasOptions,
    );

    if (!streamMeta.metaEmitted.value) {
      emit({
        name: 'meta',
        data: {
          id: streamMeta.gatewayId,
          provider: resolved.providerName,
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

    let assembledText = '';

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

    return {
      providerName: resolved.providerName,
      modelId: resolved.modelId,
      assembledText: assembledText || '',
      usageMetadata: usageMetadata as
        | {
            inputTokens: number;
            outputTokens: number;
            model?: string;
          }
        | undefined,
      ...(toolCalls?.length && { toolCalls }),
      ...(stopReason && { stopReason }),
      ...(systemFingerprint && { systemFingerprint }),
      ...(thinkingContent && { thinkingContent }),
    };
  }
}
