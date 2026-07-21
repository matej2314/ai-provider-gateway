import type { ResilientExecutor } from '../../chat/resilience/resilient-executor';

export function createMockResilientExecutor(): Partial<ResilientExecutor> {
  return {
    executeWithRetryAndFallback: jest.fn(),
  };
}
