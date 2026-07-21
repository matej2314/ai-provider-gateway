import { Injectable } from '@nestjs/common';

export type PreMetricsScrapeHook = () => Promise<void>;

@Injectable()
export class PreMetricsScrapeRegistry {
  private hook: PreMetricsScrapeHook | undefined;

  register(hook: PreMetricsScrapeHook): void {
    this.hook = hook;
  }

  async runAll(): Promise<void> {
    await this.hook?.();
  }
}
