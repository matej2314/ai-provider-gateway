import type {
  InputTokens,
  OutputTokens,
} from '../../src/common/types/branded.types';
import { unbrand } from '../../src/common/types/branded.types';

/** Usage block as returned by HTTP API (plain numbers at the boundary). */
export type ApiUsageBody = {
  inputTokens?: unknown;
  outputTokens?: unknown;
  totalTokens?: unknown;
};

export type ExpectedGatewayUsage = {
  inputTokens?: InputTokens;
  outputTokens?: OutputTokens;
};

/**
 * Asserts gateway usage statistics in API responses.
 * Validates non-negative integers at the HTTP boundary; optional exact match via branded types.
 */
export function expectGatewayUsage(
  usage: ApiUsageBody | undefined,
  expected?: ExpectedGatewayUsage,
): void {
  expect(usage).toBeDefined();
  expect(usage!.inputTokens).toEqual(expect.any(Number));
  expect(usage!.outputTokens).toEqual(expect.any(Number));
  expect(Number.isInteger(usage!.inputTokens)).toBe(true);
  expect(Number.isInteger(usage!.outputTokens)).toBe(true);
  expect(usage!.inputTokens as number).toBeGreaterThanOrEqual(0);
  expect(usage!.outputTokens as number).toBeGreaterThanOrEqual(0);

  if (expected?.inputTokens !== undefined) {
    expect(usage!.inputTokens).toBe(unbrand(expected.inputTokens));
  }
  if (expected?.outputTokens !== undefined) {
    expect(usage!.outputTokens).toBe(unbrand(expected.outputTokens));
  }

  if (usage!.totalTokens !== undefined) {
    expect(usage!.totalTokens).toEqual(expect.any(Number));
    expect(Number.isInteger(usage!.totalTokens)).toBe(true);
    expect(usage!.totalTokens as number).toBeGreaterThanOrEqual(0);
  }
}
