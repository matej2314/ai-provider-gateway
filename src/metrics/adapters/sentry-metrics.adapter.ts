import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Span } from '@sentry/core';
import type {
  MetricsBackend,
  LlmCallContext,
  LlmCallObservation,
  llmStreamSpanController,
  LlmCallMessage,
} from '../interfaces/metrics-backend.interface';

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
  conversationId: string,
): void {
  span.setAttribute('gen_ai.conversation.id', conversationId);
}

@Injectable()
export class SentryAiMetricsAdapter implements MetricsBackend {
  async observeLlmCall<T>(
    context: LlmCallContext,
    fn: () => Promise<T>,
    mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T> {
    if (context.conversationId) {
      Sentry.setConversationId(context.conversationId);
    }

    try {
      return Sentry.startSpan(
        {
          op: 'gen_ai.chat',
          name: `chat ${context.modelId}`,
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.request.model': context.modelId,
            'gen_ai.provider.name': toGenAiProviderName(context.provider),
            requestId: context.requestId,
            modelAlias: context.modelAlias,
          },
        },
        async (span) => {
          applyGenAiMessagesToSpan(span, context);
          if (context.conversationId) {
            applyGenAiConversationIdToSpan(span, context.conversationId);
          }

          const result = await fn();
          const obs = mapResult?.(result);
          if (!obs) return result;

          if (obs.responseModel) {
            span.setAttribute('gen_ai.response.model', obs.responseModel);
          }

          applyGenAiMessagesToSpan(span, context, {
            outputText: obs.outputText,
          });

          const input = obs.usage?.inputTokens;
          const output = obs.usage?.outputTokens;
          if (input != null) {
            span.setAttribute('gen_ai.usage.input_tokens', input);
          }

          if (output != null) {
            span.setAttribute('gen_ai.usage.output_tokens', output);
          }
          if (input != null && output != null) {
            span.setAttribute('gen_ai.usage.total_tokens', input + output);
          }
          if (obs.costUsd != null) {
            span.setAttribute('gen_ai.cost.total_tokens', obs.costUsd);
          }
          return result;
        },
      );
    } finally {
      if (context.conversationId) {
        Sentry.setConversationId(null);
      }
    }
  }

  observeLlmStream(context: LlmCallContext): llmStreamSpanController {
    if (context.conversationId) {
      Sentry.setConversationId(context.conversationId);
    }

    const span = Sentry.startInactiveSpan({
      op: 'gen_ai.chat',
      name: `chat ${context.modelId}`,
      attributes: {
        'gen_ai.operation.name': 'chat',
        'gen_ai.request.model': context.modelId,
        'gen_ai.provider.name': toGenAiProviderName(context.provider),
        requestId: context.requestId,
        modelAlias: context.modelAlias,
      },
    });

    applyGenAiMessagesToSpan(span, context);
    if (context.conversationId) {
      applyGenAiConversationIdToSpan(span, context.conversationId);
    }

    return {
      end: (observation: LlmCallObservation) => {
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
          span.setAttribute('gen_ai.cost.total_tokens', observation.costUsd);
        }
        span.end();

        if (context.conversationId) {
          Sentry.setConversationId(null);
        }
      },
    };
  }
}
