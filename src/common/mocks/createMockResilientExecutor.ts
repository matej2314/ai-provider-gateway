import { ppid } from 'process';
import type { ResilientExecutor } from '../resilience/resilient-executor';

export function createMockResilientExecutor(): Partial<ResilientExecutor> {
  return {
    executeWithRetryAndFallback: jest.fn(),
  };
}
