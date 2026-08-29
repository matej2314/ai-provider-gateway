# Configuration — AI Provider Gateway

Goal: “plug&play” — the user fills in env + configuration files and runs the gateway without code changes.

## 0) First run (configuration wizard)

The repository includes a PLACEHOLDER sample **`gateway.config.example.yaml`**. Before the first `npm run start:dev`, copy it to **`gateway.config.yaml`**, fill in **`.env`** from **`.env.example`** (provider keys, master key, optionally client keys — names must match `*KeyRef` in YAML), or run the wizard:

```bash
cp gateway.config.example.yaml gateway.config.yaml
cp .env.example .env
# then either edit manually, or:
npm run cli config:init
# or: npx gateway config:init
```

The wizard generates or overwrites `gateway.config.yaml`, `.env`, `.env.example`, and optionally system prompt files (templates: `src/cli/templates/`). It detects boilerplate configuration via **`CliConfigLoaderService.isBoilerplateConfig()`** — when `masterKeyRef` or entry IDs in `providers:` / `clients:` contain `placeholder` / `PLACEHOLDER` (as in the root `gateway.config.example.yaml`).

**Important:** Runtime loads only **`gateway.config.yaml`** from the working directory. Flow details: **`command_line_interface.md`**.

## 1) Secrets and env (`.env`)

Rule: **secrets only in env**. Configuration files do not contain key values — only variable **names** (`apiKeyRef` per provider instance in YAML).

### Provider keys (`apiKeyRef`)

Runtime does **not** globally require `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY`. Instead, `buildEffectiveGatewayConfig()` (`src/config/configuration.ts`) calls the facade **`assertEnabledProviderSecretsPresent()`** (`src/config/configuration-validation.service.ts`), which delegates to `provider-api-key.validation.ts` / `provider-base-url.validation.ts`: for each instance with **`enabled !== false`**, the env under **`apiKeyRef`** must be non-empty after `trim()` (exception: OpenAI types — the key may be empty; a valid URL under **`baseUrlRef`** is required).

Example names:

| Source | `providerInstance` | `apiKeyRef` in YAML |
|--------|--------------------|---------------------|
| Wizard (default) | `anthropic-primary` | `ANTHROPIC_PRIMARY_API_KEY` |
| Wizard (default) | `google-primary` | `GOOGLE_PRIMARY_API_KEY` |
| Manual / older example | `anthropic` | `ANTHROPIC_API_KEY` |

The wizard (`deriveApiKeyRef()` in `src/cli/utils/provider-id.util.ts`) builds `apiKeyRef` as `{INSTANCE_ID}_API_KEY` (slug in uppercase). Default instance IDs: `{type}-primary` (e.g. `anthropic-primary`).

Runtime **reads only `apiKeyRef` from YAML** — the env variable name in `.env` must match the YAML (e.g. only `ANTHROPIC_API_KEY` in env, while YAML has `ANTHROPIC_PRIMARY_API_KEY` → start fails). Anthropic/Google key format is validated by the CLI on input (`validateProviderApiKey` in `src/cli/utils/api-key-validation.util.ts`), not by `validateEnvironment()`.

The primary env template for users is **`.env.example` in the repository root**, paired with root **`gateway.config.example.yaml`** (PLACEHOLDER `*KeyRef` names). An optional copy may also exist under `deployment/templates/` (CI / mirror). `apiKeyRef` / `gatewayKeyRef` names must match the YAML.

**Note on `.env.example` vs default values in code:** the repository template may enable optional features (e.g. `CACHE_ENABLED=true`, `RATE_LIMIT_SMART_ENABLED=true`) for local development convenience. **Validator defaults** (`EnvironmentVariables` in `src/config/env.validation.ts`) when a variable is missing are: `CACHE_ENABLED=false`, `CACHE_BACKEND=noop`, `RATE_LIMIT_SMART_ENABLED=false`. Effective configuration depends on what you actually set in `.env`.

**Gateway keys (`X-Gateway-Key` header):**

- In **`gateway.config.yaml`**: the **`masterKeyRef`** field (env variable name for the master key, e.g. `MASTER_KEY`) and an optional **`clients`** section — each client has **`gatewayKeyRef`** pointing to the env variable name with that client’s key (e.g. `GATEWAY_KEY_WEBAPP`).
- At startup **`buildGatewayKeyRuntime`** (`src/config/configuration.ts`) loads the master value from env, iterates clients, and builds **`allowList`**: master + all **non-empty** client key values. This list is available in the app as **`gatewayKey`** configuration and is used by **`GatewayKeyGuard`**.
- **No non-empty master key** → exception when loading configuration (`[GatewayKey] Missing master key.`), the process will not start.
- Chat endpoints require **`X-Gateway-Key`** on the allowlist (`@GatewayKeyAndSmartRateLimit()`); **`GET /api/v1/health`** and **`GET /api/v1/health/ready`** do not.

### Response cache and Redis (optional)

Variables are validated at startup by **`validateEnvironment()`** (facade → `EnvironmentVariables` in `env.validation.ts`; including types and defaults). Values used at runtime are also assembled by `configuration.ts` (`cache`, `redis` in the object returned by `load`).

| Variable           | Default     | Meaning                                                                                                                                                                                                                                                                                                              |
| ------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CACHE_ENABLED`    | `false`     | When **`true`**, cache is **enabled** in configuration; the actual backend is chosen by `CACHE_BACKEND` (see below). When `false`, configuration forces the **`noop`** backend — no cache read/write.                                                                                                            |
| `CACHE_BACKEND`    | `noop`      | Allowed values: `noop` \| `redis`. Any other value **fails startup** (`validate()`). When `CACHE_ENABLED=false`, configuration forces **`noop`**. |
| `CACHE_TTL`        | `3600`      | Cache entry TTL in **seconds** (integer ≥ 1).                                                                                                                                                                                                                                                               |
| `CACHE_KEY_PREFIX` | `aigw:`     | Prefix for chat response cache keys (`ResponseCacheService`).                                                                                                                                                                                                                                                       |
| `REDIS_HOST`       | `localhost` | Redis host (when the Redis module is loaded). In Docker Compose networks use the service name `redis`.                                                                                                                                                                                                                                                                                 |
| `REDIS_PORT`       | `6379`      | Redis port (code/validator default). **Redis Stack** in this repo’s Compose listens on **6380** — set `REDIS_PORT=6380` in `.env` (see root `.env.example`).                                                                                                                                                                                                                                                                                                            |
| `REDIS_PASSWORD`   | _(empty)_   | Password; empty → connection without a password.                                                                                                                                                                                                                                                                                   |
| `REDIS_DB`         | `0`         | Redis database number.                                                                                                                                                                                                                                                                                                      |
| `REDIS_KEY_PREFIX` | `aigw:`     | Redis configuration prefix (separate from `CACHE_KEY_PREFIX`; when `cache.keyPrefix` is missing in the cache service, this is used as a fallback).                                                                                                                                                                                      |

**Loading the Redis module in Nest:**

- **Shared Redis infrastructure:** `RedisConnectionService` (`src/cache/adapters/redis-cache/`) is shared by **exact response cache**, **smart rate limiting**, and **semantic cache** (Redis Search). Predicate: `isRedisRequired()` in `src/cache/should-include-redis-stack.ts`.
- **When Redis connects:** when `isRedisRequiredFromEnv()` = true, i.e.:
  - `CACHE_ENABLED=true` **and** `CACHE_BACKEND=redis`, **or**
  - `RATE_LIMIT_SMART_ENABLED=true`, **or**
  - `SEMANTIC_CACHE_ENABLED=true` (Redis Search is required even when exact cache is `noop`).
- **Implementation:** `CacheModule.register({ includeRedisStack: isRedisRequiredFromEnv(), semanticEnabled: isSemanticCacheEnabledFromEnv() })` in `src/app.module.ts`. The option name `includeRedisStack` is historical — it covers all Redis infrastructure, not only cache. `semanticEnabled` uses the **same** env predicate as the Redis `semantic-cache` consumer.
- **When Redis is required but unavailable:** smart rate limit → fail-open (requests allowed through); readiness → `checks.redis: degraded` (details below).

**Behavior:** `ChatService.executeChat` and the stream path (`resolveStreamCache` / `executeStreamMiss`) check the cache before calling the provider (`ChatCachePipelineService` → `ResponseCacheService` / semantic); on a hit — only when the alias and related provider are **enabled** in YAML (`isCachedChatAllowedForModelAlias` in `src/chat/helpers/cache-policy.ts`) — the stored response is returned: JSON with **`cached: true`**, **`cachedAt`** (ISO 8601), and **`cacheSource`** (`"exact"` or `"semantic"`), or SSE with those fields in `meta` (replay in 64-char chunks — `StreamCacheReplayService`). `cacheSource` and **`requestId` are not** written to Redis; a hit stamps the current `requestId`. **`id`** (`gw_*`) comes from the payload. Store (`shouldStoreChatResponse`): only `finishReason=stop`, non-empty text, no `toolCalls`; `content_filter` / `length` / tool-invocation replies are not cached. Redis reads are parsed by **`parseCachedChatResponse`** (`CachedChatResponseSchema` in `src/cache/schemas/cached-chat-response.schema.ts`); invalid shape or unservable entry (`isUnservableCachedReply`) → key deletion and treat as MISS. Streaming (`POST /api/v1/chat/stream` and facade `stream: true`) uses the **same** store as JSON (cross-endpoint).

**Redis write (first-writer-wins):** exact — `SET … NX` (+ `EX` when TTL &gt; 0) in `RedisCacheAdapter`; semantic — `HSETNX` on field `reply`, then `MULTI` for remaining fields + `EXPIRE`. Second writer: NX noop → **debug** log (not “Failed to cache”); no overwrite.

**Cache identity (exact key and semantic partition):** the hash covers `modelAlias`, `clientId`, `messages[]`, system prompt signature (`systemSignature`), and serialized effective call params (`serializeCallParamsForCache`). Body **`metadata` is explicitly excluded** — by design: metadata is propagated to the adapter only (tracking/analytics, e.g. Anthropic `user_id`) and **does not** affect model output in the gateway. Two identical payloads with different `metadata` may share the same cache entry.

**Cache enablement policy:** there is no per-alias `cache` flag in YAML. Cache is allowed when the provider instance linked to the alias has `enabled: true` (`isCachedChatAllowedForModelAlias`). A per-model toggle is not planned — enable/disable is global (`CACHE_ENABLED`, `SEMANTIC_CACHE_ENABLED`) plus `providers[].enabled`.

**Fallback:** when `ResilientExecutor` succeeds on the fallback alias (`didFallback: true`), the response is **not** written to exact or semantic cache (`executeChat` / `executeStreamMiss`). The next identical request retries the requested alias instead of serving a cached fallback answer.

**Singleflight (concurrent misses):** v1 — in-process coalescing on `buildIdentityKey` (`createInProcessSingleflight` in `ChatService`) **JSON only** (`executeChat`); concurrent identical requests in the **same** process share one provider call. Streaming has **no** soft singleflight (parallel miss may run 2× LLM; NX protects stored content). v2 (planned) — Redis distributed lock on the identity key for JSON.

**Invalidation:** `ResponseCacheService.invalidateCache()` exists in code but is **not** wired to production paths (no operational API). Entries expire via TTL or become unreachable after prompt/params signature changes. Intentionally deferred — no change in the current iteration.

Variable template: `.env.example`.

### Semantic cache (`src/cache/semantic/`)

Semantic cache is a **parallel store** to exact KV (no promotion of a semantic hit into exact). Lookup after exact miss in the `POST /api/v1/chat` pipeline and on stream (`resolveStreamCache`): cooldown → alias policy → exact (hash) → semantic HASH (trimmed last-user) → embed + KNN → provider → dual-write sync. It is independent of `CACHE_BACKEND` — `SEMANTIC_CACHE_ENABLED` is its own switch; semantic-only (`CACHE_ENABLED=false`) is supported. Redis Search (part of Redis Stack) is required for the vector index. Default similarity 0.85. Vector TTL = `CACHE_TTL`.

**Lookup order:**

1. **Cooldown** — `checkCooldown` in `prepareRequestForExecution` runs **before** any cache I/O; during cooldown the gateway returns 429 with **no** cache read/write.
2. **Exact hit** — hash of `(modelAlias, clientId, messages, system prompt, effective params)` → stored response returned immediately.
3. **Semantic hit** — only for **single-turn** requests (exactly one `role: user` message and no `assistant` / `tool` roles): cheap Redis HASH lookup on trimmed last-user text in the same partition (`VectorStore.getByTextIdentity`, no embed); on miss, embed that user message, KNN query in Redis Search with partition TAG filter, cosine similarity ≥ threshold → stored response returned (`cacheSource: "semantic"`; HASH match is metric `hash-hit`).
4. **Miss** — call the provider; **await** exact `SET NX` **and** semantic upsert (`HSETNX` + `MULTI`) before HTTP 201 / before SSE close (semantic upsert only when the request is single-turn).

**Skip conditions** (no semantic lookup / store): tooling requests, missing `gatewayKey`, `clientId === 'unknown'`, model alias not allowed by cache policy (`isCachedChatAllowedForModelAlias` — checked **before** exact Redis GET and before semantic I/O; also gates exact/semantic **store**), multi-turn history (any `assistant` / `tool` message, or more than one `user` message), no last user message with non-empty content, **success on fallback** (`didFallback` — no exact/semantic store). Exact and semantic **store** also require `shouldStoreChatResponse` (`stop` + non-empty text, no `toolCalls`). Streaming is **not** on the skip list — it uses the same layer.

**Fail-open:** when the embedding service or Redis Search is unavailable, the request is forwarded to the provider — the cache layer does not block chat. Degradation is **temporary**: the embedding circuit breaker recovers on the **hot path** only (half-open after cooldown; a successful chat `embed` closes the circuit). The `/ready` embeddings probe is **observation only** — it does **not** call `recordEmbedSuccess` / reset the breaker. `GET /api/v1/health/ready` may report `checks.embeddings: degraded` and/or `checks.vectorStore: degraded` without changing `status` to `not_ready`. Embedding probes are throttled and use `min(2000, EMBEDDING_TIMEOUT_MS)` — never at or above the gateway Docker HEALTHCHECK (3 s). When `EMBEDDING_TIMEOUT_MS` is above 2 s, the probe is strictly shorter; when it is ≤ 2 s, the probe uses the same budget as chat (not longer). `embeddings: healthy` means Ollama answered `'ping'`; breaker state is independent (`degraded` ≠ reset of failure counters).

**Partition:** semantic KNN is filtered by `modelAlias` + `clientId` + `embeddingModel` + `systemSignature` + `callParams` (same configuration identity as exact cache for prompt signature and effective call params; `embeddingModel` isolates the vector space). TAG fields are **case-sensitive** (`CASESENSITIVE`). Client IDs and model aliases must not contain RediSearch TAG specials other than hyphen (comma is forbidden — it is the default TAG separator). Changing the system prompt or params (e.g. `temperature`, `responseFormat`) yields a **different partition** → semantic miss (no bulk `FT.DROPINDEX`; old vectors expire via TTL). Embedding similarity applies only to the last-user text of a single-turn request. See `anti-patterns.md` §18 and §20.

**Miss path:** at most one `embed` per request (JSON or stream miss with passed `embedState`). Lookup returns an optional vector and whether `embed` was already attempted (`embedAttempted` in `SemanticCacheService`). On store: existing vector → upsert only (no second `embed`); `embed` already attempted and no vector → skip semantic write (no retry after a failed lookup); `embed` not attempted (e.g. open circuit) → store may run the **first** `embed` if the circuit allows a trial. Streaming (`POST /api/v1/chat/stream`) uses the same guard: lookup in `resolveStreamCache` before `flushHeaders`; store after a successful miss in `executeStreamMiss`.

**Redis:** uses the same `RedisConnectionService` and Redis Stack instance as exact cache and rate limit (port **6380**, image `redis/redis-stack-server`). The vector index name is `{PROJECT_ID}:sem:idx:{normalizedModel}-{DIM}-{schemaHash8}` where `PROJECT_ID` is the code constant `ai-provider-gateway` (plain text, first segment — visible in `FT._LIST`) and `schemaHash8` fingerprints the canonical SCHEMA used by `FT.CREATE`. Example: `qwen3-embedding:0.6b` + `1024` → `ai-provider-gateway:sem:idx:qwen3-embedding-0-6b-1024-<8hex>`. HASH keys use prefix `{index}:` (not legacy `aigw:sem:`). Same-family variants at the same DIM (e.g. `qwen3-embedding:4b`) do **not** share an index. Changing `EMBEDDING_MODEL`, `EMBEDDING_DIM`, or SCHEMA fields → a new index (old indexes / `aigw:sem:…` HASHes remain orphan until TTL or manual GC). KNN also filters by TAG `embeddingModel` (the configured model string).

**Embedding text:** store and lookup use the **bare** last-user `content` of a **single-turn** request (or a Qwen-specific instruction). Do **not** prefix with `search_query:` — that instruction belongs to `nomic-embed-text` / `mxbai` and `qwen3-embedding` does not understand it. Both sides must use the same format; a format change = a new index.

| Variable | Default in code | Meaning |
|----------|-----------------|---------|
| `SEMANTIC_CACHE_ENABLED` | `false` | When `true`, enables semantic lookup in `POST /api/v1/chat` and on stream (native + facades). Requires Redis Stack + embedding service. Wired via `CacheModule.register({ semanticEnabled: isSemanticCacheEnabledFromEnv() })` — the **same** predicate as the Redis `semantic-cache` consumer (not a separate `process.env` read inside the module). Code default is `false`; `true` in this project's `.env.example` / Compose is a **local** example, not a production certificate. |
| `EMBEDDING_BASE_URL` | `http://localhost:11435` | Base URL of the Ollama embedding service. In Docker networks: `http://ollama-embedding:11434`. |
| `EMBEDDING_MODEL` | `qwen3-embedding:0.6b` | Ollama model for embeddings (`POST /api/embed`). Changing the model (including another size tag of the same family) requires a new vector index — `{PROJECT_ID}:sem:idx:` + full normalized name + DIM + schema hash, not a short family slug. A lighter model (e.g. `nomic-embed-text`) is a new index, not a hot-swap. |
| `EMBEDDING_DIM` | `1024` | Embedding vector dimension. Must match the model (`qwen3-embedding:0.6b` → 1024). Changing this value requires a new Redis Search index (DIM enters both the name segment and the schema hash). |
| `EMBEDDING_TIMEOUT_MS` | `5000` | HTTP timeout for embedding requests (ms). On timeout → fail-open. `/ready` probes use `min(2000, this value)`, not a separate env var. |
| `SEMANTIC_CACHE_MIN_SIMILARITY` | `0.85` | Minimum cosine **similarity** for a hit. **Enforced** by env validator as **0–1** inclusive (`@Min(0)` / `@Max(1)`); values such as `5` or `1.01` **fail startup**. `gateway config:validate` **warns** (does not fail) when the value is **&lt; 0.85**. Redis Search stores cosine **distance** ≈ `1 − similarity`; cutoff ≈ 0.15 at default 0.85. |
| `SEMANTIC_CACHE_TTL` | ignored (deprecated) | Kept in env so existing `.env` files do not fail startup. Semantic entry TTL **always** follows `CACHE_TTL`. `gateway config:validate` **warns** when this variable is set. Every vector write **always** sets TTL (atomically with `HSET`); no eternal vectors. |
| `SEMANTIC_CACHE_K` | `3` | Number of nearest neighbours in the KNN query (`LIMIT 0 k` on `FT.SEARCH`). The service picks the **first** candidate with similarity ≥ `SEMANTIC_CACHE_MIN_SIMILARITY` (hits sorted by distance). |

`CACHE_*` / `REDIS_*` variables retain their meaning for exact cache KV. Semantic cache is **not** a value of `CACHE_BACKEND`.

### Smart rate limiting (`src/rate-limit/`)

Implementation: **`RateLimitModule`**, **`SmartRateLimiterService`**, **`SmartRateLimitGuard`** (decorator `@GatewayKeyAndSmartRateLimit()` on chat controllers: first `GatewayKeyGuard`, then `SmartRateLimitGuard`). **`SmartRateLimitGuard`** re-verifies the `X-Gateway-Key` header (`requireGatewayKey`) — intentionally, when the guard is used **without** `GatewayKeyGuard` (defense in depth). Does **not** use `@nestjs/throttler`.

**Limit order (per `X-Gateway-Key` value):**

1. If the client at runtime has a **`clients[].rateLimit`** section in `gateway.config.yaml` → `rps`, `burst`, `maxConcurrentStreams` from YAML are used (mapped by the actual key value from env, not by the client entry ID).
2. Otherwise → default values from env (table below).

| Variable                        | Default | Meaning                                                                                                                                                         |
| ------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RATE_LIMIT_SMART_ENABLED`      | `false` | When **`true`**, `SmartRateLimitGuard` enforces limits per `X-Gateway-Key` (requires ready Redis).                                                               |
| `RATE_LIMIT_RPS_PER_KEY`        | `10`    | Default RPS (token bucket) when the client has no `rateLimit` in YAML.                                                                                                 |
| `RATE_LIMIT_BURST_PER_KEY`      | `20`    | Default burst.                                                                                                                                                   |
| `RATE_LIMIT_STREAMS_CONCURRENT` | `3`     | Max concurrent streams per key.                                                                                                                            |
| `RATE_LIMIT_COOLDOWN_AFTER_429` | `60`    | Seconds of lockout per key+provider after a 429 from upstream. **Checking** cooldown (`checkCooldown`) and **setting** it (`setCooldown` via `ChatErrorHandlerService.handleProviderError`) apply to **`executeChat` and `executeStream`** — shared `prepareRequestForExecution`. |

In **`gateway.config.yaml`**, optional section **`clients.<id>.rateLimit`**. The `config:init` wizard can configure per-client limits; a client without `rateLimit` uses env values.

**Health** (`GET /api/v1/health`, `GET /api/v1/health/ready`) — without chat guards and without gateway limits.

When Redis is unavailable or not `ready`, `SmartRateLimiterService` **allows** requests through (graceful degradation). Gateway limit error code: **`RATE_LIMITED`** (HTTP 429). Upstream provider limit: **`PROVIDER_RATE_LIMITED`** (separate path in `provider-error.mapper.ts`).

### Observability (env)

| Variable                    | Default / behavior                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`                 | `info` — log level (`LoggingModule`; **no** entry in `EnvironmentVariables` — read directly in the module).                                                                                                                                                                                                                                                               |
| `LOG_ADAPTER`               | `pino` — log backend (`pino` / `console`; as above — outside the env validator).                                                                                                                                                                                                                                                                                                 |
| `LOG_PRETTY`                | `false` in the validator; readable Pino output (dev).                                                                                                                                                                                                                                                                                                                             |
| `SENTRY_DSN`                | Empty — required when the Sentry adapter is enabled (metrics or error reporting).                                                                                                                                                                                                                                                                                                   |
| `SENTRY_ENABLED`            | `false` in the validator; in **development** enables Sentry error reporting when `ERROR_REPORTING_ADAPTER` does not override (`LoggingModule`). In **production** error reporting by default tries Sentry (when `SENTRY_DSN` is set).                                                                                                                                            |
| `SENTRY_ENVIRONMENT`        | `development` in the validator; passed to Sentry.                                                                                                                                                                                                                                                                                                                           |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` in the validator; in `instrument.ts` fallback `1.0` when no value.                                                                                                                                                                                                                                                                                                       |
| `ERROR_REPORTING_ADAPTER`   | `noop` in the validator; allowed: `sentry` \| `noop`. In production without override → Sentry when `SENTRY_DSN` is set.                                                                                                                                                                                                                                                       |
| `METRICS_BACKEND`           | `noop` in the validator; allowed: `prometheus` \| `noop`. In **production** without override → Prometheus (`AppMetricsModule` / `ObservabilityModule`, endpoint `GET /metrics`).                                                                                                                                                                                                      |
| `AI_METRICS_BACKEND`        | `noop` in the validator; allowed: `sentry` \| `noop`. In **production** without override → Sentry when `SENTRY_DSN` is set (`instrument.ts`, `AiMetricsModule` / `ObservabilityModule`).                                                                                                                                                                                           |
| `SENTRY_INCLUDE_PROMPTS`    | Not in the validator; when `true` — `gen_ai.input.messages` / `gen_ai.output.messages` on spans (required e.g. for the Conversations view).                                                                                                                                                                                                                                      |
| `APP_VERSION`               | In readiness (`GET /api/v1/health/ready`) — fallback **`1.0.0`** (`HealthService`). In logs (`LoggingModule`) — fallback **`dev`**.                                                                                                                                                                                                                                            |
| `SWAGGER_ENABLED`           | Enabled by default outside production (`SWAGGER_ENABLED !== 'false'`). In **production** Swagger UI/JSON only when **`SWAGGER_ENABLED=true`** (`src/swagger/swagger.setup.ts`). UI: `/api/v1/api-docs`, JSON spec: `/api/v1/swagger.json` — includes tags **Health**, **Chat**, **OpenAI API**, **Anthropic API** (same document as `openapi.json` from `npm run openapi:export`). |
| `PORT`                      | `3000`; also used when exporting OpenAPI (`openapi:export`).                                                                                                                                                                                                                                                                                                                 |
| `NODE_ENV`                  | Used e.g. by `LoggingModule`, Sentry, default Swagger behavior — **no longer** enforces a global “≥1 Anthropic/Google key” rule; provider keys are validated per `apiKeyRef` in YAML (section 1). |

**Sentry — two initialization points:**

- **`src/instrument.ts`** (before Nest bootstrap): Sentry SDK with `streamGenAiSpans: true` when Sentry metrics are active — required for the **Conversations** view (`conversation-tracking.md`).
- **`LoggingModule`** / **`AiMetricsModule`** (in `ObservabilityModule`): error reporting and LLM metrics adapters (`SentryAiMetricsAdapter`, `SentryErrorReportingAdapter`).

**Readiness and Redis:** `GET /api/v1/health/ready` returns:

- **`checks.redis`** — shared Redis infrastructure state (PING probe only when `required: true`; fields `required`, `consumers`: `cache`, `rate-limit`, `semantic-cache`),
- **`checks.cache`** — aggregate of **enabled** pipeline layers (exact Redis KV and/or semantic embeddings + vectorStore); `healthy` only when all enabled layers work, otherwise `degraded` (`exact-redis`, `embeddings`, `vectorStore`). Both off → `Cache disabled (noop)`,
- **`checks.embeddings`** — present only when `SEMANTIC_CACHE_ENABLED=true`; Ollama availability probe (fail-open; does not reset the embedding circuit),
- **`checks.vectorStore`** — present only when `SEMANTIC_CACHE_ENABLED=true`; Redis Search / vector index probe (`FT.INFO` after lazy `ensureIndex`). Fail-open: missing Search module or index → `degraded`, does not block `ready`. Operator message when plain Redis lacks `FT.*` commands.

With `CACHE_ENABLED=false` and `RATE_LIMIT_SMART_ENABLED=true` or `SEMANTIC_CACHE_ENABLED=true`, readiness still reports **`checks.redis`** (PING of shared Redis). `checks.cache` then reflects only the enabled semantic layers (embeddings + vectorStore), not exact KV.

## 2) `gateway.config.yaml` file (models / instances / policies)

**Status:** the file is **loaded at application startup** (`ConfigModule` → `load: [configuration]` in `src/app.module.ts`). Structure validation: **Zod** in `src/config/gateway-config.schema.ts` (`GatewayConfigSchema`); assembling effective configuration and resolving env — `src/config/configuration.ts` → **`AppConfiguration`** object (`app-configuration.types.ts`). Runtime services read keys via **`getAppConfig` / `getAppConfigOrThrow`** (`typed-config.ts`) instead of raw `config.get('...')` strings. Missing file or schema mismatch causes **startup to stop** (`ENOENT` or `Invalid configuration file`).

A **PLACEHOLDER sample** lives in **`gateway.config.example.yaml`** (copy to `gateway.config.yaml`): `placeholder-provider`, `placeholder-client`, `placeholder-model`, with `*KeyRef` names containing `PLACEHOLDER`. The **`config:init`** wizard replaces boilerplate with a full operational configuration. The example below illustrates a typical wizard result.

### Schema (aligned with the Zod validator)

A minimal skeleton aligned with the repository includes among others **`masterKeyRef`**, **`clients`** (optional), and **`providers`** / **`models`**:

```yaml
schemaVersion: 1
masterKeyRef: MASTER_KEY

clients:
  webapp:
    name: My web app
    type: webapp # allowed: webapp | ide | cli | service | backend | automation
    gatewayKeyRef: GATEWAY_KEY_WEBAPP
    rateLimit: # optional; missing → limits from env
      rps: 10
      burst: 10
      maxConcurrentStreams: 3

providers:
  anthropic-primary:
    type: anthropic
    apiKeyRef: ANTHROPIC_PRIMARY_API_KEY
    enabled: true
  google-primary:
    type: google
    apiKeyRef: GOOGLE_PRIMARY_API_KEY
    enabled: true

models:
  chat-default:
    providerInstance: anthropic-primary
    modelId: claude-sonnet-4-5-20250929
    capabilities:
      streaming: true
      tools: true
      thinking: true # optional; required for params.thinkingEnabled / thinkingBudget
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 500
          thinkingEnabled: false # opt-in in body; disabled by default (cost)
          # Anthropic: do NOT set topP in defaults alongside temperature (API rejects both at once)
        allowOverrides:
          - temperature
          - maxOutputTokens
          - topP
          - stop
          - frequencyPenalty
          - presencePenalty
          - seed
          - responseFormat
          - thinkingEnabled
          - thinkingBudget
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
          topP: { min: 0, max: 1 }
          frequencyPenalty: { min: -2, max: 2 }
          presencePenalty: { min: -2, max: 2 }

  claude-sonnet:
    providerInstance: anthropic-primary
    modelId: claude-sonnet-4-5-20250929
    fallback: chat-default
    capabilities:
      streaming: true
      tools: true
      thinking: true # optional; required for params.thinkingEnabled / thinkingBudget
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 1024
          thinkingEnabled: false
        allowOverrides:
          - temperature
          - maxOutputTokens
          - topP
          - stop
          - frequencyPenalty
          - presencePenalty
          - seed
          - responseFormat
          - thinkingEnabled
          - thinkingBudget
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
          topP: { min: 0, max: 1 }
          frequencyPenalty: { min: -2, max: 2 }
          presencePenalty: { min: -2, max: 2 }

  gemini-flash:
    providerInstance: google-primary
    modelId: gemini-2.5-flash
    fallback: chat-default
    capabilities:
      streaming: true
      tools: true
      thinking: false # in repo: false for gemini-2.5-flash; Gemini 3.0+ — set true when the model supports ThinkingConfig
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 1024
          topP: 0.95 # Google Gemini: temperature + topP in defaults is OK
          thinkingEnabled: false
        allowOverrides:
          - temperature
          - maxOutputTokens
          - topP
          - stop
          - frequencyPenalty
          - presencePenalty
          - seed
          - responseFormat
          - thinkingEnabled
          - thinkingBudget
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
          topP: { min: 0, max: 1 }
          frequencyPenalty: { min: -2, max: 2 }
          presencePenalty: { min: -2, max: 2 }
```

### Generation parameters vs provider type

An alias in `models` points to **`providerInstance`** → **`type`** in `providers:` (`anthropic`, `google`, …). **`params`** fields in the HTTP body and official contract facades are **shared** across the whole gateway; the **effect at the vendor** depends on the adapter bound to the alias. Full matrix: **`dictionary.md`** (section “Parameter mapping to providers”).

| Provider type (`providers.*.type`) | Runtime adapter                                                  | Example aliases in the repo       |
| ---------------------------------- | ---------------------------------------------------------------- | ------------------------------- |
| **`anthropic`**                    | `create-anthropic-provider.ts`                                   | `chat-default`, `claude-sonnet` (with `anthropic-primary`) |
| **`google`**                       | `create-google-provider.ts`                                      | `gemini-flash` (with `google-primary`)                  |
| **`openai`**                       | `create-openai-provider.ts` — **always** Responses API (`create-openai-provider.core.ts`) | `gpt-cheap` (with `openai` in the sample YAML in the repo) |
| **`openai-compatible`**            | `create-openai-compatible-provider-instance.ts` — **always** Chat Completions | `ollama-local-chat` (with `ollama-local`)          |

**OpenAI in the project:** there are **two orthogonal layers** — the HTTP facade `/api/v1/openai` (official OpenAI API contract shape — Cursor and other clients) and the **runtime adapter** `type: openai` / `openai-compatible` (SDK call via `baseUrlRef` + `apiKeyRef`). The facade maps `temperature`, `top_p`, `stop`, penalties, `seed` to `params.*`; the runtime adapter passes them to the SDK when the alias points to an OpenAI instance. Adapter details: [`provider-openai-runtime.md`](provider-openai-runtime.md), [`pl/spec/SPEC-PROVIDERS.md`](pl/spec/SPEC-PROVIDERS.md).

#### OpenAI-specific fields in YAML (`providers`)

| Field | Types | Meaning |
|------|------|-----------|
| `baseUrlRef` | `openai`, `openai-compatible` | **Required** — env variable name with the base API URL (e.g. `OPENAI_BASE_URL`, `OLLAMA_BASE_URL`) |
| `apiSurface` | `openai` | **Forbidden** — `type: openai` always uses Responses API (`GatewayConfigSchema` rejects the field) |
| `apiSurface` | `openai-compatible` | Optional: only `chat-completions` or omitted (defaults to Chat Completions) |

**API routing (implementation):** `create-openai-provider.core.ts` — `type: openai` → `responses.adapter.ts` adapter; `type: openai-compatible` → `chat-completions.adapter.ts`. No dynamic surface selection per model and no `apiSurface: auto` / `responses` field.

**API key:** for OpenAI types `apiKeyRef` is optional at startup (empty key allowed — e.g. local Ollama). When the variable is set, format validation happens in the CLI (`api-key-validation.util.ts`).

Example OpenAI provider entry:

```yaml
providers:
  openai:
    type: openai
    enabled: true
    apiKeyRef: OPENAI_API_KEY
    baseUrlRef: OPENAI_BASE_URL

  ollama-local:
    type: openai-compatible
    enabled: true
    apiKeyRef: OLLAMA_API_KEY
    baseUrlRef: OLLAMA_BASE_URL
```

In `.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OLLAMA_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

#### YAML configuration rules (`policy.params`)

| Provider                      | `defaults` — randomness parameters                                                            | Operational note                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anthropic**                 | Set **`temperature` or `topP` or `topK`** in defaults (logically one randomness mode) | The adapter sends **one** randomness parameter to the SDK — priority: **`topK` > `topP` > `temperature`** (`resolveAnthropicSamplingParams`). Repo example: default `temperature: 0.4`, **without** `topP` / `topK` in defaults. |
| **Google Gemini**             | **`temperature` and `topP` together** are allowed                                                      | Repo example: `temperature: 0.4`, `topP: 0.95`.                                                                                                                                                                       |
| **OpenAI** (adapter `type: openai`) | **`temperature` and `topP` together** are allowed (like upstream) | Always Responses API — `create-openai-provider.core.ts` |
| **OpenAI-compatible** | Like upstream Chat Completions | Always Chat Completions |

**Override from body (`params.topP` / `params.topK` etc.):** YAML ← body merge may set multiple randomness parameters in `ProviderCallOptions`, but the Anthropic adapter sends **only one** to the SDK — priority **`topK` > `topP` > `temperature`**. E.g. defaults `temperature` + body `topP` → SDK gets `top_p`, not `temperature`.

**Fields accepted in the API but with no effect at the vendor:** `frequencyPenalty`, `presencePenalty` — Anthropic/Google adapters do **not** pass them to the SDK. `seed` — **Google** only. **`topK`** — **Anthropic** (`top_k`, priority over `topP` / `temperature`) and **Google** (`topK`); only from body, no YAML `defaults`. **`responseFormat`** — mapped to SDK for **Anthropic** (`output_config.format` with `json_schema`) and **Google** (`response_format` / `response_schema`); only from body (`params.responseFormat`), requires `type: json_object`; optional `jsonSchema`.

**Multi-instance example** (two Google accounts, same `type`):

```yaml
providers:
  google:
    type: google
    apiKeyRef: GOOGLE_API_KEY
    enabled: true
  google-office:
    type: google
    apiKeyRef: GOOGLE_OFFICE_API_KEY
    enabled: true

models:
  gemini-flash:
    providerInstance: google
    modelId: gemini-2.5-flash
    # ...
  gemini-flash-office:
    providerInstance: google-office
    modelId: gemini-2.5-flash
    # ...
```

In `.env`: separate values for `GOOGLE_API_KEY` and `GOOGLE_OFFICE_API_KEY`. Runtime creates **two** `AIProvider` objects (`createGoogleProvider` factory called twice).

Notes:

- `apiKeyRef` is the env variable **name**, not the value.
- `masterKeyRef` and each `gatewayKeyRef` in `clients` are env variable **names** with gateway key values — set in `.env` (template: `.env.example`).
- Aliases under `models` are the public API (`modelAlias`).
- **Key mapping to runtime:** `configuration.ts` builds a `providersByInstance` map (type + `apiKeyRef` + resolved `apiKey` from env) for **every** key in the YAML `providers:` section. In the Nest configuration object (`ConfigService`) it is available under the **`providers`** key (e.g. `configService.get('providers')['google-office']`). Bootstrap (`ProviderInstancesBootstrap`) creates a separate `AIProvider` per entry with its own API key.
- **Multiple instances of the same `type`:** in `providers:` you may have e.g. `google` and `google-office`, both with `type: google`, each with a **unique** `apiKeyRef`. Zod validation (`GatewayConfigSchema.providers.superRefine`) rejects a **duplicate `apiKeyRef`**, not a duplicate `type`. Different environments / API accounts are expressed as separate instances + env variables, not a shared key per type.
- **`providers` ↔ `models` graph consistency (fail-fast at startup):**
  - the `models` section **must not be empty**;
  - each entry in `models` must point to an **existing** key in `providers` (`providerInstance`);
  - every provider instance with **`enabled !== false`** (in practice in YAML set **`enabled: true`** for providers used at runtime; omitted `enabled` → after Zod parsing defaults to **`false`**, then the instance is disabled) must have **at least one** alias in `models` with the same `providerInstance`;
  - after the `enabled` filter, `buildEffectiveGatewayConfig` again requires that every **active** provider has ≥1 **active** model (models linked to a provider with `enabled: false` are skipped with a warning in the log).
  - An instance with **`enabled: false`** does **not** require entries in `models` (it may remain in YAML as a disabled reserve).
- Policies (`timeoutMs`, `retry`, `params`) are defined in the file. **`capabilities`**: `streaming` (required for SSE), optionally **`tools: true`** — without it, request flags with `tooling` / `tool` turns return **`TOOLS_NOT_SUPPORTED`**; optionally **`thinking: true`** — required for `params.thinkingEnabled` / `thinkingBudget` to be allowed (mapping: `anthropic-thinking.mapper.ts`, Google adapter). **`policy.params`**: in YAML `defaults` (Zod) — `temperature`, `maxOutputTokens`, `topP`, `frequencyPenalty`, `presencePenalty`, `seed`, `thinkingEnabled`; in `allowOverrides` — the above plus `topK`, `stop`, `responseFormat`, `thinkingBudget`. Merge in `resolveProviderCallOptions`: YAML defaults ← body for fields in the first group; **`topK`**, **`stop`**, **`responseFormat`**, **`thinkingBudget`** — **only from body** (when in `allowOverrides`). **`retry.maxAttempts`** — max **5** (Zod validation). **Defaults configuration depends on provider type** — see “Generation parameters vs provider type” above. **`timeoutMs`** and **`retry`** — enforced in **`ResilientExecutor`** (`src/chat/resilience/`; timeout → `AbortSignal` to the SDK adapter + `PROVIDER_TIMEOUT` / HTTP 504; Anthropic/OpenAI: request option `signal`, Google: `config.abortSignal`; retry only for statuses in `onStatus`, default `[429, 500, 502, 503, 504]` from `RETRY_POLICY_DEFAULTS` in `src/common/retry-policy-defaults.ts`; build: `buildRetryPolicyFromResolved`). Missing values in YAML → defaults `maxAttempts: 3`, `timeoutMs: 30000`. One-hop fallback: `models[].fallback` + `assertNoFallbackCycle`.

## 3) Validation and fail-fast

**Orchestration:** `ConfigurationValidationService` (`src/config/configuration-validation.service.ts`) — plain class (no Nest DI; bootstrap before the container). The facade assembles rules from `env.validation.ts`, `provider-api-key.validation.ts`, `provider-base-url.validation.ts` (master key, provider secrets, env format). It does **not** load YAML or run Zod — that is done by `gateway-config.schema.ts` / `config-validator.ts` / `configuration.ts`.

The gateway stops startup among other cases when:

- **`gateway.config.yaml`** does not exist or fails Zod validation (`GatewayConfigSchema` in `src/config/gateway-config.schema.ts` + `buildEffectiveGatewayConfig` in `src/config/configuration.ts`),
- `providers` contains **two or more** entries with the same **`apiKeyRef`** (env reference uniqueness per file),
- the **`models` section is empty**,
- an alias in `models` points to an **unknown** `providerInstance`,
- an **enabled** provider (`enabled !== false`) has **no** alias in `models` with that `providerInstance`,
- after applying `enabled` flags there is **no active model** or an **active** provider has no assigned active model,
- for an **active** provider a non-empty env under **`apiKeyRef`** from YAML is missing (`[GatewayConfig] Missing API key for enabled provider instance…`) or (OpenAI types) a valid URL under **`baseUrlRef`** is missing,
- a non-empty **master** key is missing (`[GatewayKey] Missing master key.` — `assertMasterKeyPresent` in the facade),

| Layer                  | Where                                      | Example rules                                                                                                                        |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Zod (raw YAML)         | `GatewayConfigSchema`                      | duplicate `apiKeyRef`; empty `models`; model → provider; provider (active) → ≥1 model; `fallback` exists, no self-reference and A↔B loops |
| Effective configuration | `buildEffectiveGatewayConfig`              | `enabled` filter; ≥1 active model globally; active provider → active model; secrets via facade (`assertEnabledProviderSecretsPresent`) |
| Validation facade      | `configuration-validation.service.ts`      | `validateEnvironment`; `assertMasterKeyPresent`; API keys + base URL (delegation to `provider-*-validation.ts`)                            |

**Out of scope of the current implementation (plan — step 5.6, remaining part):** a full catalog of aliases for all Anthropic/Google API models and validation of “customary” alias completeness against a fixed MVP list.

### Diagnostic script `npm run config:validate`

The script (`scripts/validate-config.ts`) validates configuration **offline** (without starting the HTTP server) via `validateGatewayConfig()` from `src/config/config-validator.ts`:

- YAML validation via `GatewayConfigSchema` (Zod),
- runtime rule validation via `buildEffectiveGatewayConfig` (`enabled` filter + provider secrets via facade: `apiKeyRef` / `baseUrlRef`),
- master key requirement validation (`assertMasterKeyPresent` in the facade; missing → error),
- warnings (non-blocking) e.g. for clients with empty env under `gatewayKeyRef` and disabled providers.

Run:

```bash
npm run config:validate
```

Options via env:

- `CONFIG_PATH`: path to the YAML file (default `gateway.config.yaml` in `process.cwd()`).

The `CONFIG_VALIDATE_STRICT` variable in `.env.example` is reserved for future CLI extensions; currently the npm script does not read this flag — the provider key rule is always enforced in `validateGatewayConfig()`.

Exit code:

- `0` when `errors.length === 0` (warnings are allowed),
- `1` when validation detects an error.

Note: the script tries to load `.env` via `dotenv` **if** the package is installed; in CI, env usually comes from secrets and `dotenv` is not required.

### CLI vs configuration loading

HTTP runtime and CLI do **not** use the same config loading path:

| Aspect                                   | Runtime (`ConfigModule` → `configuration.ts`)                  | CLI (`CliConfigLoaderService`)                                                                            |
| ---------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Entry point                              | `src/main.ts` → `AppModule`                                    | `bin/gateway-cli-wrapper.js` → `CliModule`                                                                |
| Requires `.env` at CLI start             | yes (at HTTP server start)                                | **no** — CLI starts without `.env`                                                                         |
| YAML parsing                             | `yaml.load` + `GatewayConfigSchema`                            | the same (`loadRawConfig`)                                                                                 |
| Env resolution                           | `buildEffectiveGatewayConfig()`, master/provider/client keys | **skipped** in `loadRawConfig`; optional missing-env report in `loadWithEnvCheck()`                          |
| Full validation like server startup      | on every HTTP boot                                          | **`gateway config:init`** — at the end of the wizard; **`gateway config:validate`** (YAML + `validateEnvironment()`); **`npm run config:validate`** — YAML + runtime rules (without full `validateEnvironment()`) |

#### Configuration initialization (wizard)

```bash
npm run cli config:init
# or: npx gateway config:init
# or after npm link: gateway config:init
```

The wizard (`ConfigInitCommand`) collects data interactively (master key, providers, models, clients, server), generates `gateway.config.yaml`, `.env`, `.env.example`, and optionally system prompt files, then runs final validation with a retry loop. Incomplete session state: `.gateway-wizard-state.json` (resume on re-run).

After initialization you can extend configuration without re-running the wizard: `gateway provider:add`, `model:add`, `client:add`, etc. — **`command_line_interface.md`**. Mutating commands back up `gateway.config.yaml` in the `backup/` directory before writing.

Flow details, resume, and full command list: **`command_line_interface.md`**. Architecture: `architecture.md`, `project.structure.md` (section 2a).

## 4) Overriding parameters per request

**DTO and `openapi.json`** accept `modelAlias`, `messages` (last: **1–150** elements, `content` up to **3000** characters per message), optional **`conversationId`** in **`conv_<uuid>`** format (regex in `ChatRequestDto`; in **response** always echo or a new `conv_<uuid>`; in **request** enables `gen_ai.conversation.id` in Sentry — `conversation-tracking.md`), optional nested **`params`** (including **`responseFormat`**: `{ type, jsonSchema? }`), optional **`metadata`** (`Record<string, string | number | boolean>` — propagated to the adapter; Anthropic: `userId` → `metadata.user_id`). official contract facades allow up to **15 000** messages — see `integrations.md`. Message content in spans: `SENTRY_INCLUDE_PROMPTS=true`.

**Parameter merge:** `resolveProviderCallOptions` (`src/chat/helpers/resolve-provider-call-options.ts`) takes `policy.params.defaults` from YAML for the alias (fields: `temperature`, `maxOutputTokens`, `topP`, `frequencyPenalty`, `presencePenalty`, `seed`), applies body `params` only for fields in **`allowOverrides`**, then **clamps** to **`bounds`**. Fields **`topK`**, **`stop`**, **`responseFormat`** come **exclusively from the body** (no read from YAML `defaults`). Disallowed field → HTTP **400** + `MODEL_NOT_ALLOWED`. Effective values go to adapters (`ProviderCallOptions`) and to the cache key (`ResponseCacheService`).

**Target provider:** which fields actually reach the SDK depends on the alias **`providerInstance`** (Anthropic / Google / OpenAI in the future). Support matrix: “Generation parameters vs provider type” above and **`dictionary.md`**.

Details: `api-documentation.md`, `openapi.json`.

## 5) Environment profiles (optional)

In practice, separate files are convenient, e.g.:

- `gateway.config.dev.yaml`
- `gateway.config.prod.yaml`

or combining files (base + override). The current implementation loads **one** file at the fixed path `gateway.config.yaml` in `process.cwd()` — changing profiles requires swapping the file or extending the code.

## 6) System prompt files (`src/config/system-prompt/`)

At startup `configuration.ts` loads content used to compose the system instruction for providers (`system` field in the adapter port). Composition order at runtime: **MASTER** → optionally **MAIN** → optionally a **per model alias** layer, separated by a double newline (`\n\n`).

| File                      | Required | Description                                                                                                                                                              |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MASTER_SYSTEM_PROMPT.md` | yes      | Guardrails and mandatory policy layer; missing file or empty content after processing → **fail-fast** at startup.                                                    |
| `MAIN_SYSTEM_PROMPT.md`   | no       | Optional deployment layer (e.g. style, format); missing or empty → skipped.                                                                                     |
| `models/<modelAlias>.md`  | no       | Optional layer for a given alias from `gateway.config.yaml` → `models`; file name = exactly the alias key (e.g. `chat-default.md`). Missing or empty → skipped. |

For optional files, HTML comments `<!-- ... -->` are stripped on load — you can put documentation in them without sending it to the model (`stripHtmlComments` in `configuration.ts`).

Related: `api-documentation.md`.
