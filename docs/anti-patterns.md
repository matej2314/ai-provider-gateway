# Anti-patterns / what to watch for — AI Provider Gateway

This file collects common pitfalls in “LLM gateway” projects.

## 1) “Open proxy” through excessive configurability

**Don’t:**

- configurable provider endpoint URLs,
- arbitrary headers and bodies from config,
- a “generic HTTP request builder” under the guise of LLM integration.

**Why:** SSRF, exfiltration, loss of cost and security control.

## 2) Secrets in logs

**Don’t:**

- log full requests to providers (headers, bearer tokens),
- dump config/env in exception handlers,
- return raw SDK exceptions to the client.

**Do:**

- redact sensitive fields,
- requestId + structured logs,
- minimal messages externally, details only in logs.

## 3) Fake `modelId` validation

**Don’t:** accept a vendor `modelId` from the request and “validate” it with a regex.

**Do:** allowlist via configuration and/or aliases (`modelAlias`), fail-fast validation at startup.

## 4) No bounds for parameters (`temperature`, `max_tokens`, …)

**Don’t:** “pass everything through, the provider will reject it”.

**Do:**

- field allowlist,
- bounds (min/max),
- default values per alias,
- parameter mapping per provider (different names and semantics).

## 5) Mixing provider contracts in the gateway API

**Don’t:**

- expose 1:1 objects from the OpenAI/Anthropic SDK in the gateway response,
- leak “stop reasons” or structures that cannot be unified.

**Do:**

- your own gateway contract (stable),
- optional debug `raw` field only in dev mode (and without secrets).

**Exception (intentional):** separate `/api/v1/openai` and `/api/v1/anthropic` prefixes with vendor format — see §13 (Integration facades). Does not apply to native `/api/v1/chat`.

Rationale: official contract facades require compatibility with the OpenAI API and Anthropic Messages API; separate paths are **intentional** and do not violate this anti-pattern’s rules (which apply only to the native gateway contract).

## 6) Streaming “as it comes”

**Don’t:**

- assume every provider streams identically,
- mix several SSE formats depending on the provider.

**Do:**

- one gateway event format (`meta`, `delta`, `done`),
- streaming contract tests,
- clear behavior on error mid-stream.

## 7) Retry without policy and without limits

**Don’t:** infinite retries or retries on logical errors (400/401).

**Do:**

- retry only on 429/5xx (`onStatus` / `RETRY_POLICY_DEFAULTS`),
- maximum number of attempts (`maxAttempts`, Zod cap = 5),
- backoff (`initialDelayMs` / `maxDelayMs`) and time budget (`timeoutMs`) in `ResilientExecutor` (`src/chat/resilience/`),
- cancel in-flight work via `AbortSignal` on `timeoutMs` (SDK: Anthropic/OpenAI `signal`, Google `abortSignal`) — not just `Promise.race` without abort,
- keep resilience logic in the chat module (not in controllers or facades).

## 8) “Framework first” in domain logic

**Don’t:** put model/parameter selection logic in controllers.

**Do:**

- thin controllers,
- use-cases in services,
- provider factories (`src/providers/factories/`) as the only place that talks to LLM SDKs.

## 9) No contract tests

**Don’t:** tests that only check “whether the service starts”.

**Do:**

- parameter mapping tests,
- `modelAlias` selection tests,
- error normalization tests,
- SSE format tests (at least unit tests on events).

## 10) Starting without a required API key

**Don’t:** start the gateway when env is missing secrets for any **enabled** provider instance in YAML (`assertEnabledProviderSecretsPresent` in `configuration-validation.service.ts` — API key / base URL).

**Do:** fail-fast at startup; locally ensure `.env` contains values for all `apiKeyRef` of enabled providers (details: `configuration.md`).

## 11) Confusing rate-limit codes (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`)

**Don’t:** treat every HTTP **429** as a provider limit.

**Do:**

- **`RATE_LIMITED`** — gateway smart rate limit (`SmartRateLimitGuard`: RPS/burst/streams) and cooldown after upstream 429 (`prepareRequestForExecution` → `checkCooldown`; `ChatErrorHandlerService` → `setCooldown` — JSON chat and stream).
- **`PROVIDER_RATE_LIMITED`** — solely SDK error mapping (`provider-error.mapper.ts`).

Details: `dictionary.md`, `api-documentation.md`.

## 12) Response cache without awareness of “freshness”

**Don’t:** assume every response from **`POST /api/v1/chat`** is “live” from the provider — with cache enabled, a return with **`cached: true`** is possible.

**Don’t:** expect that **`id`** (`gw_*`) on a cache hit is newly generated — it is the identity of the stored reply. **`requestId`** on a hit **must** match the current request (`x-request-id`); it is not stored in Redis.

**Do:** consciously enable cache only where response repeatability is acceptable; monitor TTL and invalidation (changing the system prompt or call params changes the exact cache key **and** the semantic KNN partition — see 20). Store only a completed text reply (`finishReason=stop`, non-empty text, no `toolCalls` / `content_filter` / `length`) — `shouldStoreChatResponse` / `isUnservableCachedReply`. Read `configuration.md` (env `CACHE_*`, `REDIS_*`); Redis reads are validated with a Zod schema (`CachedChatResponseSchema` — corrupt or unservable entry removed); streaming uses the same store as JSON with SSE replay (`spec/SPEC-CHAT-STREAMING.md` F-10); Redis write is first-writer-wins (`SET NX` / `HSETNX`).

## 13) Confusing three API contracts (native vs official contract facades)

**Don’t:**

- expose a **single** `GET /api/v1/models` route in **vendor format** for all clients (OpenAI and Anthropic have different list shapes) — native `/models` has its **own** gateway contract; facades have separate prefixes,
- pass the client key (Bearer / `x-api-key`) to the provider layer instead of keys from `.env` (per `apiKeyRef`),
- **assume that the `/openai` or `/anthropic` facade means a backend of that same vendor** — it is only the HTTP shape; the LLM is chosen via `modelAlias` → `providerInstance` in YAML,
- **treat Bearer on `/openai` as an OpenAI.com key** or `x-api-key` on `/anthropic` as a key from the Anthropic console — these are gateway client keys,
- duplicate cache/retry/fallback logic in facade controllers instead of delegating to `ChatService`,
- expect `ErrorEnvelope` from OpenAI/Anthropic facades — they have their own error filters.

**Do:**

- separate `/api/v1/openai` and `/api/v1/anthropic` prefixes + native `/api/v1/chat` and **`GET /api/v1/models`** (gateway contract),
- shared catalog `GatewayModelsCatalogService` + outbound mappers per facade (do not duplicate YAML read logic),
- `readClientGatewayKey` + the same allowlist for all surfaces,
- map `model` (vendor) → `modelAlias` (YAML) in the mapper layer,
- distinguish **integration facade** (`src/integrations/`) vs **provider runtime** (`src/providers/`) — see `dictionary.md` (section “Facade vs provider runtime”).

Details: `integrations.md`, `openai-contract-integration.md`, `anthropic-messages-integration.md`.

## 14) CLI dependent on `ConfigModule` (configuration deadlock)

**Don’t:**

- import `ConfigModule.forRoot()` in `CliModule` — runtime already requires an existing, valid `gateway.config.yaml` and `.env`, which the CLI is supposed to **create**,
- require `npm run build` before first CLI use,
- import `buildEffectiveGatewayConfig()` / `configuration.ts` in the CLI layer at startup (requires env).

**Do:**

- a separate entry point (`bin/gateway-cli-wrapper.js` → `CliModule`),
- `CliConfigLoaderService` with YAML parsing + `GatewayConfigSchema` without resolving env,
- reuse **only** types/schemas/validators from `src/config/` (direction: config → cli, not the reverse),
- wrapper with `ts-node` fallback when `dist/` is missing.

Details: `command_line_interface.md`, `architecture.md`, `project.structure.md` (section 2a).

## 15) Starting the server without a proper config file

**Don’t:** expect `npm run start:dev` to work right after cloning without a filled `.env` (provider keys + `MASTER_KEY`) and a valid `gateway.config.yaml`.

**Do:** run `gateway config:init` or manually fill YAML + `.env` (`configuration.md`); verify with `gateway config:validate` (full) or `npm run config:validate` (YAML + runtime rules).
## 16) Extending `CacheBackend` with vector search

**Don’t:** add Redis Search / KNN queries to the existing `CacheBackend` / `noop` / `redis` adapters in `src/cache/adapters/`. The KV `CacheBackend` interface is for exact key-value lookup and has no similarity-search concept.

**Do:** implement semantic lookup as a **separate port** (`EmbeddingBackend`, `VectorStore`) in `src/cache/semantic/` — independent adapters wired by `SemanticCacheService`. Lookup order (cooldown → alias policy → exact KV → semantic HASH on trimmed last-user → embed + KNN → provider → dual-write sync) is orchestrated in `ChatCachePipelineService` / `SemanticCacheService`, not inside the KV adapters. Cheap `VectorStore.getByTextIdentity` runs **before** embed. Do **not** promote a semantic HASH/KNN hit into exact KV — the stores stay parallel. On store, reuse the lookup vector; do **not** call `embed` again when lookup already attempted it (failed or succeeded without a usable vector).

## 17) Overriding `command:` on Redis Stack Compose

**Don’t:** override `command:` in `docker-compose.redis.yml` to set Redis memory policy or other options. Overriding `command:` on `redis/redis-stack-server` drops the image entrypoint arguments that load Redis Search and JSON — the `search` module disappears silently.

**Do:** pass Redis parameters through the **`REDIS_ARGS`** environment variable on the Compose service. Example: `REDIS_ARGS: '--port 6380 --maxmemory 2gb --maxmemory-policy noeviction'`.

## 18) Bad semantic hit — low threshold or multi-turn expectation

**Don’t:** set `SEMANTIC_CACHE_MIN_SIMILARITY` below 0.85 in production. A low threshold serves cached answers for semantically different prompts — wrong content for the current query. Startup **rejects** values outside 0–1; `gateway config:validate` **warns** when the value is &lt; 0.85.

**Don’t:** put a comma (or other RediSearch TAG specials other than hyphen) in `clients.<id>` or `models.<alias>` keys — comma is the default TAG separator and would break client isolation.

**Don’t:** expect a semantic hit on multi-turn requests, or treat anaphoric last-user phrases (`continue`, `summarize that`, `translate`) as a safe cache key across different histories. Semantic cache runs only for **single-turn** bodies (exactly one `role: user`, no `assistant` / `tool`).

**Do:** keep the default 0.85 (cosine similarity) or raise it for high-precision domains. Rely on the full **case-sensitive** KNN partition (`modelAlias` + `clientId` + `embeddingModel` + `systemSignature` + `callParams`) and the single-turn gate. Monitor semantic `hit` / `hash-hit` / `below-threshold` / `error` / `skip` on `gateway_semantic_cache_lookup_total` (`hash-hit` = Redis HASH identity match without embed; `skip` = early-return without embed/KNN, including open circuit after HASH miss or disabled/multi-turn; `error` = failed embed/KNN I/O only). Corrupt semantic HASH `reply` values are deleted on HASH read and KNN (exact-cache hygiene parity). Sample cache hits while tuning.

## 19) Nomic / mxbai prefix on Qwen embeddings

**Don’t:** prefix embedding text with `search_query:` (or `search_document:`) when using `qwen3-embedding:0.6b`. That instruction belongs to `nomic-embed-text` / `mxbai`. Qwen 3 Embedding does not understand it — store and lookup drift, which looks like false misses.

**Do:** embed the bare last-user `content` of a **single-turn** request (or a Qwen-specific instruction) on **both** store and lookup. The two sides must use the same format. Changing the format or switching to `nomic-embed-text` (or another size tag of the same family, e.g. `qwen3-embedding:4b`) requires a new index named `{PROJECT_ID}:sem:idx:{normalizedModel}-{DIM}-{schemaHash8}` (e.g. default → `ai-provider-gateway:sem:idx:qwen3-embedding-0-6b-1024-<8hex>`), not a hot-swap. Do **not** assume a short family slug such as `qwen3` isolates model variants.

## 20) Assuming prompt/params change leaves semantic hits in the same partition

**Don’t:** assume that editing `MASTER_SYSTEM_PROMPT.md` / per-alias prompts, or changing call params (`responseFormat`, `temperature`, `seed`, …), still serves the previous semantic KNN hits. Exact and semantic now share the same configuration identity: Redis Search filters on `modelAlias` + `clientId` + `embeddingModel` + `systemSignature` + `callParams`. A prompt or params change → **different partition** → miss.

**Don’t:** expect a bulk `FT.DROPINDEX` / wholesale purge when prompt or params change. Old vectors in the previous partition remain until TTL (`CACHE_TTL`). `SEMANTIC_CACHE_TTL` is deprecated and ignored.

**Don’t:** treat a successful `FT.INFO` on a legacy index name (e.g. `qwen3-embedding-0-6b-1024` without the `ai-provider-gateway:sem:idx:` prefix, or HASH keys under `aigw:sem:…`) as the current gateway index. After a SCHEMA / project-prefix change those are **orphans** — leave them to TTL or drop only indexes whose name starts with `ai-provider-gateway:` (never `portfolio:*`).

**Do:** treat partition separation like exact-cache key separation. Shorten `CACHE_TTL` if you need old partitions to disappear faster (semantic TTL always follows `CACHE_TTL`). Do not lower the similarity threshold to “make up” for partition misses.