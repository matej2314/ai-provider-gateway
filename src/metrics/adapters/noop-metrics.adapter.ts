import { Injectable } from '@nestjs/common';
import type {
  MetricsBackend,
  LlmCallContext,
  LlmCallObservation,
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
}
