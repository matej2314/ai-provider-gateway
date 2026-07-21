import { Inject, Injectable } from '@nestjs/common';
import { AI_METRICS_BACKEND } from './ai-metrics.tokens';
import type {
  AiMetricsBackend,
  LlmCallContext,
  LlmCallObservation,
  LlmStreamSpanController,
} from './interfaces/ai-metrics-backend.interface';

@Injectable()
export class AiMetricsService {
  constructor(
    @Inject(AI_METRICS_BACKEND)
    private readonly aiMetricsBackend: AiMetricsBackend,
  ) {}

  observeLlmCall<T>(
    context: LlmCallContext,
    fn: () => Promise<T>,
    mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T> {
    return this.aiMetricsBackend.observeLlmCall(context, fn, mapResult);
  }

  observeLlmStream(context: LlmCallContext): LlmStreamSpanController {
    return this.aiMetricsBackend.observeLlmStream(context);
  }
}
