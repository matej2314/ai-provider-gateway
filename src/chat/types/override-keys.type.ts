export const OVERRIDE_KEYS = [
  'temperature',
  'maxOutputTokens',
  'topP',
  'stop',
  'frequencyPenalty',
  'presencePenalty',
  'seed',
  'topK',
  'responseFormat',
  'thinkingEnabled',
  'thinkingBudget',
] as const;
export type OverrideKey = (typeof OVERRIDE_KEYS)[number];
