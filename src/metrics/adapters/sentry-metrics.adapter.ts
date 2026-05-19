import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type {
  MetricsBackend,
  LlmCallContext,
  LlmCallObservation,
  llmStreamSpanController,
} from '../interfaces/metrics-backend.interface';

function toGenAiProviderName(provider: string): string {
  const map: Record<string, string> = {
    anthropic: 'anthropic',
    google: 'gcp.gen_ai',
  };
  return map[provider.toLowerCase()] ?? provider;
}

@Injectable()
export class SentryAiMetricsAdapter implements MetricsBackend {
  async observeLlmCall<T>(
    context: LlmCallContext,
    fn: () => Promise<T>,
    mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T> {
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
        const result = await fn();
        const obs = mapResult?.(result);
        if (!obs) return result;

        if (obs.responseModel) {
          span.setAttribute('gen_ai.response.model', obs.responseModel);
        }

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
  }

  observeLlmStream(context: LlmCallContext): llmStreamSpanController {
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

    return {
      end: (observation: LlmCallObservation) => {
        if (observation.responseModel) {
          span.setAttribute('gen_ai.response.model', observation.responseModel);
        }

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
      },
    };
  }
}
