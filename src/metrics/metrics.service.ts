import { Inject, Injectable } from '@nestjs/common';
import { METRICS_BACKEND } from './metrics.tokens';
import type {
  MetricsBackend,
  LlmCallContext,
  LlmCallObservation,
} from './interfaces/metrics-backend.interface';

@Injectable()
export class MetricsService {
  constructor(
    @Inject(METRICS_BACKEND) private readonly metricsBackend: MetricsBackend,
  ) {}

  observeLlmCall<T>(
    context: LlmCallContext,
    fn: () => Promise<T>,
    mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T> {
    return this.metricsBackend.observeLlmCall(context, fn, mapResult);
  }
}
