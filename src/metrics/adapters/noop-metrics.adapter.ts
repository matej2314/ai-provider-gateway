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
    _mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T> {
    return fn();
  }

  observeLlmStream(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: LlmCallContext,
  ): llmStreamSpanController {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      end: (observation: LlmCallObservation) => {
        return;
      },
    };
  }
}
