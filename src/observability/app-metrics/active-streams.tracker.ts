import { Injectable } from '@nestjs/common';
import { AppMetricsService } from './app-metrics.service';
import { asClientId, type ClientId } from '../../common/types/branded.types';

@Injectable()
export class ActiveStreamsTracker {
  private readonly streamCount = new Map<ClientId, number>();

  constructor(private readonly appMetrics: AppMetricsService) {}

  async trackStream<T>(client: ClientId, fn: () => Promise<T>): Promise<T> {
    this.increment(client);
    try {
      return await fn();
    } finally {
      this.decrement(client);
    }
  }

  private increment(client: ClientId): void {
    const key = asClientId(client);
    const next = (this.streamCount.get(key) ?? 0) + 1;
    this.streamCount.set(key, next);
    this.appMetrics.setActiveStreams(client, next);
  }

  private decrement(client: ClientId): void {
    const key = asClientId(client);
    const next = Math.max(0, (this.streamCount.get(key) ?? 1) - 1);
    if (next === 0) {
      this.streamCount.delete(key);
    } else {
      this.streamCount.set(key, next);
    }
    this.appMetrics.setActiveStreams(client, next);
  }
}
