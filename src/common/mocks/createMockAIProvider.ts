import type { AIProvider } from '../../providers/interfaces/ai-provider.interface';

export function createMockAIProvider(): Partial<AIProvider> {
  return {
    complete: jest.fn(),
    stream: jest.fn(),
  };
}
