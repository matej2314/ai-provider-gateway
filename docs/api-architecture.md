# API architecture — AI Provider Gateway

## API style

The gateway exposes **three HTTP surfaces** under the `/api/v1` prefix:

| Surface | Audience | Auth | Main routes |
|--------------|----------|------|--------------|
| **Native** | Applications integrated with the gateway contract | `X-Gateway-Key` | `GET /models`, `POST /chat`, `POST /chat/stream` |
| **OpenAI** | Cursor and OpenAI SDK clients | `Authorization: Bearer` | `GET /openai/models`, `POST /openai/chat/completions` |
| **Anthropic** | Claude Code and Messages API clients | `x-api-key` (or Bearer) | `GET /anthropic/models`, `POST /anthropic/messages` |

Facade details (`model` → `modelAlias` mapping, vendor errors): **`integrations.md`**.

### OpenAPI / Swagger (all surfaces)

One **[`openapi.json`](../openapi.json)** file (v0.14.0, OpenAPI 3.1) generated from code (`npm run openapi:export`). Contains health, native chat, **models**, and OpenAI and Anthropic facade routes. Security schemes:

| Scheme | Header | Routes |
|--------|----------|-------|
| `GatewayKeyAuth` | `X-Gateway-Key` | `GET /models`, `POST /chat`, `POST /chat/stream` |
| `BearerAuth` | `Authorization: Bearer` | `/openai/*` |
| `ApiKeyAuth` | `x-api-key` | `/anthropic/*` |

Errors in the spec: native chat and models — `ErrorEnvelope`; facades — `OpenAiErrorResponseDto` / `AnthropicErrorResponseDto` (runtime: local filters, not `GlobalExceptionFilter`). Swagger UI: `/api/v1/api-docs` (`SWAGGER_ENABLED` — `configuration.md`).

### Native contract (core)

- Consistent REST API over the *chat* resource (conversation).
- Two response modes:
  - **standard** (full JSON response),
  - **streaming** (gateway SSE: `meta` → `delta` → `done`).

**Startup requirement:** at startup `gateway.config.yaml` is loaded (fail-fast on error). Every enabled provider instance requires valid secrets in env (API key / base URL) via the `configuration-validation.service.ts` facade (details: `configuration.md`).

## Model identification (aliases)

Preferred model selection form in the request:

- `modelAlias` — name from gateway configuration.

The gateway maps the alias to:

- provider instance,
- vendor `modelId`,
- policies and limits.

Assumption: `modelAlias` is a customary/readable model name (e.g. `claude-sonnet-4-5`), mapped to the vendor `modelId` required by the given provider (e.g. `claude-sonnet-4-5-20250929` in Anthropic). Analogous mapping applies to all providers.

## Success response conventions (standard)

The gateway responds with JSON in a consistent shape, independent of the provider.

**HTTP codes:** successful **`POST /api/v1/chat`** (JSON) and successful non-stream official contract facade **`POST`** → **201 Created** (NestJS default; `@ApiResponse({ status: 201 })` in controllers). SSE streaming → **200** (`POST /chat/stream`, `stream: true` on facades). Details: `api-documentation.md`, `endpoints.md`.

Minimal fields (contract direction; details in `api-documentation.md`):

- `id` — response identifier (gateway),
- `provider` — **`providerInstance`** identifier from YAML (e.g. `anthropic`, `google-office`), not the adapter `type` field,
- `model` — **alias** (`modelAlias`) from the request; the same identifier in the standard response (`ChatService.executeChat`) and in SSE **`meta`** (`ChatProviderCallService.streamOnce`). The vendor `modelId` is not returned in any response,
- `output` — response content (text and/or structure),
- `usage` — token metadata (if available),
- `requestId` — correlation with logs.
- `conversationId` — conversation ID (echo or `conv_<uuid>` from gateway) — chat only; details: `conversation-tracking.md`.
- `effectiveModelAlias` — optionally, when `ResilientExecutor` handled the request on a YAML `fallback` alias (field `model` = requested alias).
- `toolCalls`, `finishReason` — optionally with function calling (`capabilities.tools` in YAML); `finishReason` at runtime: `stop` | `tool_calls` | `length` | `content_filter` — type `GatewayFinishReason`, mapping `mapStopReasonToFinishReason` (`src/chat/helpers/map-provider-finish-reason.ts`).
- `usageDetails` — optionally Anthropic cache tokens (`promptCacheHitTokens`, `promptCacheCreationTokens`).
- `thinkingContent` — optionally extended thinking content (Anthropic / Gemini 3.0+), when `params.thinkingEnabled: true` and the alias has `capabilities.thinking`.
- `systemFingerprint` — optional, **provider-specific**: pass-through from the adapter; in practice concerns OpenAI `system_fingerprint`. Anthropic and Gemini **do not** return an equivalent — field omitted in the response. The OpenAI facade maps to `system_fingerprint` when set (`dictionary.md`).

## Streaming (SSE)

Contract (OpenAPI + `api-documentation.md`): **Server-Sent Events** (`text/event-stream`), events `meta` → `delta*` → `done`.

**Implementation:** `POST /api/v1/chat/stream` — `ChatStreamController`, `ChatService.executeStream` + `ChatProviderCallService.streamOnce` (`meta` → `delta*` → `done`; `done` may contain `usage`, `toolCalls`, `finishReason`).

- The gateway does not guarantee identical token-by-token behavior across providers.
- The client should treat SSE as a fragment stream + metadata from `meta`.

## Response cache and idempotency

For `POST /api/v1/chat`, the gateway uses this pipeline (code order): **cooldown → alias policy → exact KV → semantic HASH (trim last-user) → embed+KNN → provider → dual-write sync** (`await` exact SET and semantic upsert). No semantic→exact promotion. Semantic-only (`CACHE_ENABLED=false`) is supported. Default similarity 0.85. Vector TTL = `CACHE_TTL`.

1. **Exact hit** — deterministic hash of `(modelAlias, clientId, messages, system prompt, effective params)` matches a stored response → returned with `cached: true`, `cachedAt`, and `cacheSource: "exact"`. Semantically identical to a fresh provider call.
2. **Semantic hit** — no exact match, but the request is **single-turn**: cheap HASH on trimmed last-user text in the **same** partition, or (on HASH miss) the last `role: user` message embeds close enough to a cached query in that partition (`modelAlias` + `clientId` + `embeddingModel` + `systemSignature` + `callParams`), cosine similarity ≥ `SEMANTIC_CACHE_MIN_SIMILARITY` (default 0.85) → stored response returned with `cached: true` and `cacheSource: "semantic"`.
3. **Miss** — provider is called; both stores are written **before** HTTP 201 (semantic upsert only for single-turn). Fields `cached`, `cachedAt`, and `cacheSource` are omitted.

**Idempotency note:** exact and semantic hits share `cached: true` / `cachedAt` and are distinguished by **`cacheSource`**. They are **not** unrestricted substitutes: a semantic hit is valid only inside the same configuration partition and for a single-turn body. Streaming (`POST /api/v1/chat/stream`) uses the **same** store (lookup before `flushHeaders`; hit → SSE replay with `meta.cached*`). OpenAI/Anthropic facade JSON does not include `cacheSource`; facades set HTTP header `X-Gateway-Cache: exact | semantic` on a hit (JSON **and** stream; absent on miss).

## HTTP errors

**Contract ([`openapi.json`](../openapi.json)):** **`ErrorEnvelope`** envelope from `GlobalExceptionFilter` (`APP_FILTER` in `AppModule`). Explicit **`code`** from the exception payload (guards, `RATE_LIMITED`, codes from `provider-error.mapper.ts`); otherwise `DEFAULT_HTTP_STATUS_TO_CODE` (for HTTP **429** fallback is **`RATE_LIMITED`** — see `dictionary.md`). **`requestId`:** `RequestIdMiddleware` — request header `x-request-id` (echo) or `req_<uuid>`; the same ID in the JSON field (`requestId`) and in the **response header** `x-request-id` (`res.setHeader` in `src/common/middleware/request-id.middleware.ts`).

Body size limit exceeded (**1 MB**) → **413 Payload Too Large** with code **`VALIDATION_FAILED`** and message `request entity too large` (`GlobalExceptionFilter` handles Express `entity.too.large` error).

## Generation parameters (`params` in body)

Optional **`params`** in `ChatRequestDto` (`ChatParamsDto`, `ResponseFormatDto`): `temperature`, `maxOutputTokens`, `topP`, `topK`, `stop` (string \| string[]), `frequencyPenalty`, `presencePenalty`, `seed`, `responseFormat` (`type`, optional `jsonSchema`), `thinkingEnabled`, `thinkingBudget`; merge with `policy.params.defaults` in YAML via `resolveProviderCallOptions` (YAML defaults ← body for the first field group; **`topK`**, **`stop`**, **`responseFormat`**, **`thinkingBudget`** — body only). **Vendor effect** depends on the alias adapter — matrix: `dictionary.md`, YAML: `configuration.md` (Anthropic: one randomness parameter — priority `topK` > `topP` > `temperature`). Optional **`tooling`** (`definitions`, `toolChoice`) — requires `capabilities.tools` on the alias. Optional **`metadata`** in body — propagation to the adapter (Anthropic: `userId` → SDK `metadata.user_id`). Disallowed params override → **`MODEL_NOT_ALLOWED`**; tooling without capability → **`TOOLS_NOT_SUPPORTED`**. Cache skipped for requests with tooling. **`frequencyPenalty` / `presencePenalty`**: accepted in the API, but `anthropic` / `google` adapters do not pass them to the SDK. **`responseFormat`**: mapped to Anthropic, Google, and OpenAI SDKs when `type: json_object`. **`thinkingEnabled` / `thinkingBudget`**: requires `capabilities.thinking: true` + `allowOverrides`; mapping in `anthropic-thinking.mapper.ts`, Google factory, and OpenAI adapters (Responses API). The `/openai` facade maps `reasoning_effort` → `params.thinking*`.

## Extensions

- **`npm run config:validate`** — offline YAML validation + runtime rules (`validateGatewayConfig()` → among others secrets facade). Full validation: **`gateway config:validate`** (`validateEnvironment()`) — `configuration.md`.

Error codes (summary): `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `TOOLS_NOT_SUPPORTED`, `PROVIDER_UNSUPPORTED`, `RATE_LIMITED` / `PROVIDER_RATE_LIMITED` — explicit codes in exception payloads, preserved by `GlobalExceptionFilter`.

## Optional conversation tracking (`conversationId`)

- Optional field in body of **`POST /api/v1/chat`** and **`POST /api/v1/chat/stream`**.
- **Response:** always `conversationId` (echo or new `conv_<uuid>`) — JSON / SSE `meta`.
- **Sentry Conversations:** `gen_ai.conversation.id` **only** when the client **supplies** `conversationId` in the request; without it — single-message span. From turn 2 the client sends full history in `messages[]` (including the first assistant response).
- Details: `conversation-tracking.md`, `ChatRequest` schema in [`openapi.json`](../openapi.json).

## Validation

- DTO validation at the edge (`ValidationPipe`: among others **`messages` 1–150** in native chat, `content` max 3000 characters (32000 for `tool`), optional `conversationId` in `conv_<uuid>` format, optional nested `params` (including `responseFormat.jsonSchema`), optional `metadata`, `forbidNonWhitelisted`). OpenAI / Anthropic facades allow up to **15 000** messages (`MAX_MESSAGES` in integration DTOs).
- JSON body size limit: **1 MB** (`express.json` in `src/setup.app.ts`); overflow → **413** (`VALIDATION_FAILED`).
- Configuration validation at startup (fail-fast) and at runtime (e.g. unknown `modelAlias` → deterministic error with code `MODEL_ALIAS_NOT_FOUND` on `POST /chat`).

## Idempotency, retry, and fallback

- Standard chat is not idempotent in the business sense (the same request may generate a different response), **unless** the cache layer for **`POST /api/v1/chat`** kicks in — then an identical payload may return an earlier response with **`cached: true`** (`ResponseCacheService`, `configuration.md`). Cooldown after provider 429 (`checkCooldown` / `setCooldown`) — **JSON and streaming** (`prepareRequestForExecution`, `handleProviderError`).
- **`ResilientExecutor`** (`src/chat/resilience/`): for the request alias applies `policy.retry` (max attempts, `onStatus` list) and `policy.timeoutMs` from YAML (defaults `RETRY_POLICY_DEFAULTS` in `src/common/retry-policy-defaults.ts`; policy build: `buildRetryPolicyFromResolved`). Retry only for `HttpException` with status from `onStatus` (`is-retryable-http-error.ts`). After attempts are exhausted — optionally call the alias from **`models[].fallback`** (one hop; `assertNoFallbackCycle` in `fallback-chain.ts`; same retry policy as the first alias). Timeout → **504** / `PROVIDER_TIMEOUT`. Details: `configuration.md`, `api-documentation.md`.

## Auth

**Native chat and models** require **`X-Gateway-Key`** (`@GatewayKeyAndSmartRateLimit()` on `ChatController`, `ChatStreamController`, `ModelsController`).

**Official contract facades** use the same client-key allowlist, but different headers — Bearer (OpenAI) or `x-api-key` / Bearer (Anthropic); the facade guard sets `req.gatewayKey`, then `SmartRateLimitGuard` (`readClientGatewayKey`). Provider keys in `.env` (per `apiKeyRef` / `providerInstance`) remain exclusively in the `src/providers/` layer.

Optional smart rate limit per client key (`RATE_LIMIT_SMART_ENABLED`, Redis via shared `RedisConnectionService` — loaded when `isRedisRequiredFromEnv()`). Health: **`GET /api/v1/health`**, **`GET /api/v1/health/ready`** — public (no chat guards). Readiness: HTTP **200** always; assessment via `body.status` (`ready` / `not_ready`); fields `checks.config`, `checks.redis`, `checks.cache` — `api-documentation.md`.

**Security headers:** Helmet in `src/main.ts` (before `setupApp`); `x-powered-by` disabled in `setup.app.ts`. Verification in security tests: `test/security/helmet-headers.security-spec.ts` — `testing.md`.

On a public network additional layers are still recommended; **`X-Gateway-Key` alone** does not replace network isolation or large-scale abuse defense.

- Reverse proxy with additional auth / mTLS if needed,
- Rate limiting and WAF.

## Related documents

- Official contract facades: `integrations.md`, `openai-contract-integration.md`, `anthropic-messages-integration.md`
- Endpoint contract: `api-documentation.md`
- Conversation tracking (metrics): `conversation-tracking.md`
- Path list: `endpoints.md`
- Configuration and aliases: `configuration.md`
- Streaming and event format: `api-documentation.md`
- Anti-patterns: `anti-patterns.md`
