/**
 * Plain-text project id — first segment of the Redis Search index name and
 * input to the schema hash. Must not contain spaces or colons (colon separates
 * index-name segments). Not read from package.json / env.
 */
export const SEMANTIC_CACHE_PROJECT_ID = 'ai-provider-gateway';

/** TAG fields shared by canonical schema string and `FT.CREATE` SCHEMA args. */
const SEMANTIC_SCHEMA_TAG_FIELDS = [
  'modelAlias',
  'clientId',
  'embeddingModel',
  'systemSignature',
  'callParams',
] as const;

/**
 * Deterministic SCHEMA fingerprint used in the index-name hash.
 * Same field list / order as `semanticSchemaFtCreateArgs` (single source of truth).
 */
export function canonicalSemanticSchema(dim: number): string {
  const tags = SEMANTIC_SCHEMA_TAG_FIELDS.map(
    (field) => `${field}:TAG:CASESENSITIVE`,
  );
  return [
    ...tags,
    'reply:TEXT',
    `vector:VECTOR:FLAT:FLOAT32:${dim}:COSINE`,
  ].join('\n');
}

/**
 * `FT.CREATE … SCHEMA` argument list — must stay aligned with
 * {@link canonicalSemanticSchema}.
 */
export function semanticSchemaFtCreateArgs(dim: number): string[] {
  const args: string[] = [];
  for (const field of SEMANTIC_SCHEMA_TAG_FIELDS) {
    args.push(field, 'TAG', 'CASESENSITIVE');
  }
  args.push(
    'reply',
    'TEXT',
    'vector',
    'VECTOR',
    'FLAT',
    '6',
    'TYPE',
    'FLOAT32',
    'DIM',
    String(dim),
    'DISTANCE_METRIC',
    'COSINE',
  );
  return args;
}

/** Consecutive `embed()` failures before the circuit opens. */
export const EMBEDDING_CIRCUIT_OPEN_AFTER = 3;

/** Cooldown in the open state before a single half-open trial. */
export const EMBEDDING_CIRCUIT_COOLDOWN_MS = 30_000;

/**
 * Cap for `/ready` embedding probes. Must stay below the gateway Docker
 * HEALTHCHECK timeout (see `GATEWAY_HEALTHCHECK_TIMEOUT_MS`).
 */
export const EMBEDDING_PROBE_TIMEOUT_MS = 2_000;

/**
 * Mirror of the gateway Docker HEALTHCHECK timeout (ms). Not an env var —
 * Compose/Dockerfile stay unchanged in this slice.
 */
export const GATEWAY_HEALTHCHECK_TIMEOUT_MS = 3_000;

/**
 * Budget for `probeEmbedding()`: never longer than the hot-path embed timeout,
 * never at or above the gateway HEALTHCHECK (3 s).
 *
 * When `embeddingTimeoutMs` is above the 2 s cap, the probe is strictly shorter.
 * When it is ≤ 2 s, the probe uses the same budget (not longer than chat).
 */
export function embeddingProbeTimeoutMs(embeddingTimeoutMs: number): number {
  const cap = Math.min(
    EMBEDDING_PROBE_TIMEOUT_MS,
    GATEWAY_HEALTHCHECK_TIMEOUT_MS - 1,
  );
  const budget = Math.min(cap, embeddingTimeoutMs);
  return Math.max(1, budget);
}
