import { Injectable } from '@nestjs/common';
import type {
  MetricsBackend,
  LlmCallContext,
  LlmCallObservation,
  llmStreamSpanController,
} from '../interfaces/metrics-backend.interface';

@Injectable()
export class NoopAiMetricsAdapter implements MetricsBackend {
  async observeLlmCall<T>(
    context: LlmCallContext,
    fn: () => Promise<T>,
    mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T> {
    return fn();
  }

  observeLlmStream(context: LlmCallContext): llmStreamSpanController {
    return {
      end: (observation: LlmCallObservation) => {
        return;
      },
    };
  }
}
