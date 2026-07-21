const MAX_COMPLETION_TOKENS_MODEL_PATTERNS: RegExp[] = [
  /^o\d/i,
  /^gpt-5/i,
  /^gpt-4\.1/i,
  /^gpt-4o/i,
];

export function prefersMaxCompletionTokens(modelId: string): boolean {
  return MAX_COMPLETION_TOKENS_MODEL_PATTERNS.some((pattern) =>
    pattern.test(modelId),
  );
}
