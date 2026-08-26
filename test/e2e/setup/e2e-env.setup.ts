/**
 * E2E env defaults — runs before test files load (CacheModule.register reads env).
 * Semantic suite stays opt-in; regular E2E must not require Redis Stack / Ollama.
 */
if (process.env.SEMANTIC_CACHE_ENABLED === undefined) {
  process.env.SEMANTIC_CACHE_ENABLED = 'false';
}
