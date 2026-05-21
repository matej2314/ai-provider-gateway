export const RETRY_POLICY_DEFAULTS = {
  maxAttempts: 3,
  onStatus: [429, 500, 502, 503, 504],
  timeoutMs: 30000,
};
