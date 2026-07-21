import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Span } from '@sentry/core';
import type {
  AiMetricsBackend,
  LlmCallContext,
  LlmCallObservation,
  LlmStreamSpanController,
  LlmCallMessage,
  LlmRequestMetadata,
} from '../interfaces/ai-metrics-backend.interface';
import { ConversationId } from '../../../common/types/branded.types';

function toGenAiProviderName(provider: string): string {
  const map: Record<string, string> = {
    anthropic: 'anthropic',
    google: 'gcp.gen_ai',
  };
  return map[provider.toLowerCase()] ?? provider;
}

function toGenAiInputMessages(messages: LlmCallMessage[]): string {
  return JSON.stringify(
    messages.map((m) => ({
      role: m.role,
      parts: [{ type: 'text', content: m.content }],
      ...(m.toolCallId && { tool_call_id: m.toolCallId }),
      ...(m.toolCallsCount && { tool_calls_count: m.toolCallsCount }),
    })),
  );
}

function toGenAiOutputMessages(text: string): string {
  return JSON.stringify([
    {
      role: 'assistant',
      parts: [{ type: 'text', content: text }],
    },
  ]);
}

function shouldRecordPrompts(): boolean {
  return process.env.SENTRY_INCLUDE_PROMPTS === 'true';
}

/** Single-turn span content (always, when prompts recording is enabled). */
function applyGenAiMessagesToSpan(
  span: Span,
  context: LlmCallContext,
  options?: { outputText?: string },
): void {
  if (!shouldRecordPrompts()) {
    return;
  }

  if (context.messages?.length) {
    span.setAttribute(
      'gen_ai.input.messages',
      toGenAiInputMessages(context.messages),
    );
  }

  if (options?.outputText) {
    span.setAttribute(
      'gen_ai.output.messages',
      toGenAiOutputMessages(options.outputText),
    );
  }
}

/** Multi-turn grouping — only when the client sent conversationId. */
function applyGenAiConversationIdToSpan(
  span: Span,
  conversationId: ConversationId,
): void {
  span.setAttribute('gen_ai.conversation.id', conversationId);
}

function applyRequestMetadataContext(metadata: LlmRequestMetadata): void {
  Sentry.setContext('request_metadata', metadata);
}

function clearRequestMetadataContext(): void {
  Sentry.setContext('request_metadata', null);
}

function clearLlmScopeContext(context: LlmCallContext): void {
  if (context.conversationId) {
    Sentry.setConversationId(null);
  }

  if (context.metadata) {
    clearRequestMetadataContext();
  }
}

function applyObservationToSpan(
  span: Span,
  context: LlmCallContext,
  observation?: LlmCallObservation,
): void {
  if (!observation) {
    return;
  }

  if (observation.responseModel) {
    span.setAttribute('gen_ai.response.model', observation.responseModel);
  }

  applyGenAiMessagesToSpan(span, context, {
    outputText: observation.outputText,
  });

  const input = observation.usage?.inputTokens;
  const output = observation.usage?.outputTokens;
  if (input != null) {
    span.setAttribute('gen_ai.usage.input_tokens', input);
  }

  if (output != null) {
    span.setAttribute('gen_ai.usage.output_tokens', output);
  }
  if (input != null && output != null) {
    span.setAttribute('gen_ai.usage.total_tokens', input + output);
  }
  if (observation.costUsd != null) {
    span.setAttribute('gen_ai.cost.usd', observation.costUsd);
  }
}

function buildGenAiChatSpanAttributes(
  context: LlmCallContext,
  options?: { streaming?: boolean },
): Record<string, string | boolean> {
  return {
    'gen_ai.operation.name': 'chat',
    'gen_ai.request.model': context.modelId,
    'gen_ai.provider.name': toGenAiProviderName(context.provider),
    requestId: context.requestId,
    modelAlias: context.modelAlias,
    ...(options?.streaming && { 'gen_ai.response.streaming': true }),
  };
}

@Injectable()
export class SentryAiMetricsAdapter implements AiMetricsBackend {
  async observeLlmCall<T>(
    context: LlmCallContext,
    fn: () => Promise<T>,
    mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T> {
    if (context.conversationId) {
      Sentry.setConversationId(context.conversationId);
    }

    if (context.metadata) {
      applyRequestMetadataContext(context.metadata);
    }

    try {
      return await Sentry.startSpan(
        {
          op: 'gen_ai.chat',
          name: `chat ${context.modelId}`,
          attributes: buildGenAiChatSpanAttributes(context),
        },
        async (span) => {
          applyGenAiMessagesToSpan(span, context);
          if (context.conversationId) {
            applyGenAiConversationIdToSpan(span, context.conversationId);
          }

          const result = await fn();
          const obs = mapResult?.(result);
          if (obs) {
            applyObservationToSpan(span, context, obs);
          }
          return result;
        },
      );
    } finally {
      clearLlmScopeContext(context);
    }
  }

  observeLlmStream(context: LlmCallContext): LlmStreamSpanController {
    if (context.conversationId) {
      Sentry.setConversationId(context.conversationId);
    }

    if (context.metadata) {
      applyRequestMetadataContext(context.metadata);
    }

    const span = Sentry.startInactiveSpan({
      op: 'gen_ai.chat',
      name: `chat ${context.modelId}`,
      attributes: buildGenAiChatSpanAttributes(context, { streaming: true }),
    });

    applyGenAiMessagesToSpan(span, context);
    if (context.conversationId) {
      applyGenAiConversationIdToSpan(span, context.conversationId);
    }

    let finalized = false;
    const finalize = (observation?: LlmCallObservation): void => {
      if (finalized) {
        return;
      }
      finalized = true;
      applyObservationToSpan(span, context, observation);
      span.end();
      clearLlmScopeContext(context);
    };

    return {
      withActiveSpan: <T>(fn: () => T): T => Sentry.withActiveSpan(span, fn),
      end: (observation: LlmCallObservation) => finalize(observation),
      fail: (observation?: LlmCallObservation) => finalize(observation),
    };
  }
}
