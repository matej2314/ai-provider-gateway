import { Injectable } from '@nestjs/common';
import type {
  AiMetricsBackend,
  LlmCallContext,
  LlmCallObservation,
  LlmStreamSpanController,
} from '../interfaces/ai-metrics-backend.interface';

@Injectable()
export class NoopAiMetricsAdapter implements AiMetricsBackend {
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
  ): LlmStreamSpanController {
    return {
      withActiveSpan: <T>(fn: () => T): T => fn(),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      end: (observation: LlmCallObservation) => {
        return;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      fail: (observation?: LlmCallObservation) => {
        return;
      },
    };
  }
}
