# Endpoint list — AI Provider Gateway

Document version: **1.9**.  
**OpenAPI:** [`openapi.json`](../openapi.json) (v0.14.0) — synchronized with `src/` (health, native chat, **models**, OpenAI/Anthropic facades, smart rate limit `src/rate-limit/`, `params`, tooling, cache, SSE, `ChatProviderCallService`, retry/fallback/`effectiveModelAlias` via `ResilientExecutor` (`src/chat/resilience/`), `@nestjs/swagger` decorators). **Errors:** native chat and models — `ErrorEnvelope` (`GlobalExceptionFilter`); facades — `OpenAiErrorResponseDto` / `AnthropicErrorResponseDto` (local filters). **`RequestIdMiddleware`** — body + response header **`x-request-id`**. **Auth in spec:** `GatewayKeyAuth` (chat, models), `BearerAuth` (OpenAI), `ApiKeyAuth` (Anthropic). **Chat / models:** `@GatewayKeyAndSmartRateLimit()` on `ChatController`, `ChatStreamController`, `ModelsController`; allowlist from `gateway.config.yaml` + env (`configuration.md`). **Offline validation:** `npm run config:validate`. **Cache:** `src/cache/` — `POST /chat`, `POST /chat/stream`, and facade streams (shared store).

## Global conventions

| Element | Value |
|--------|---------|
| **Base (example)** | `http://localhost:3000` |
| **Path prefix** | `/api/v1` (`API_GLOBAL_PREFIX` in `src/setup.app.ts`) |
| **Format** | JSON (`application/json`) for standard; SSE (`text/event-stream`) for streaming |
| **POST success (JSON)** | **201 Created** — native chat and official contract facades (non-stream); matches `openapi.json` (`@ApiResponse({ status: 201 })`) |
| **POST success (stream)** | **200** — `text/event-stream` (`POST .../chat/stream`, `stream: true` on facades) |
| **Errors (JSON)** | `ErrorEnvelope` envelope (`{statusCode, code, message, requestId, details?}`) — schema in `openapi.json`, implementation in `src/common/filters/http-exception.filter.ts` |
| **`x-request-id`** | Response header (all routes with `RequestIdMiddleware`, including health) — echo of request header or `req_<uuid>` |

**Service startup:** every enabled provider instance in `gateway.config.yaml` requires valid secrets in env (API key / base URL) — facade `assertEnabledProviderSecretsPresent` (`src/config/configuration-validation.service.ts`; rules in `provider-*-validation.ts`).
Additionally at startup the `gateway.config.yaml` file is loaded (Zod validation + `buildEffectiveGatewayConfig`). After cloning, fill in `.env` and YAML or run `gateway config:init` — `configuration.md`.

---

## Health *(public)*

### `GET /api/v1/health`

| | |
|--|--|
| **200** | Liveness: `status: "healthy"`, `timestamp` (**ISO 8601**, `toISOString()` in `HealthService.getLiveness`) — `openapi.json` |

### `GET /api/v1/health/ready`

| | |
|--|--|
| **200** | Readiness in body: `status` (`ready` \| `not_ready`), `timestamp` (ISO 8601), `version`, `uptime`, `checks.config`, `checks.redis`, `checks.cache`, optionally `checks.embeddings` and `checks.vectorStore`. **HTTP always 200** — the probe evaluates the `status` field, not the HTTP code. `checks.redis: degraded`, `checks.cache: degraded`, `checks.embeddings: degraded`, and `checks.vectorStore: degraded` do **not** block `ready` (fail-open). `checks.embeddings` / `checks.vectorStore` present only when `SEMANTIC_CACHE_ENABLED=true`. After evaluation, Prometheus metrics sync (`publishMetrics`). Details: `api-documentation.md`. |

---

## Prometheus metrics *(public, without `/api/v1` prefix)*

### `GET /metrics`

| | |
|--|--|
| **200** | Text in Prometheus format (`text/plain; version=0.0.4`). Before export, readiness gauges are refreshed (`gateway_readiness`, `gateway_health_status{component=...}`, `gateway_process_uptime_seconds`) and operational metrics (requests, tokens, cache, rate limit, Node.js defaults with `gateway_` prefix). **No** `X-Gateway-Key`. Backend noop in dev (empty snapshot), Prometheus in production — `METRICS_BACKEND` / `NODE_ENV`. Scrape: `deployment/monitoring/prometheus.yml`. |

---

## Models *(requires `X-Gateway-Key`)*

### `GET /api/v1/models`

List of model aliases from `gateway.config.yaml` in the gateway contract (`ModelsController`, `GatewayModelsCatalogService`).

| | |
|--|--|
| **200** | `{ models: GatewayModelDto[] }` — fields: `modelAlias`, `providerInstance`, `providerType`, `modelId`, optionally `capabilities`, `fallback` |
| **401** | missing `X-Gateway-Key` — `GATEWAY_KEY_MISSING` |
| **403** | invalid key — `GATEWAY_KEY_INVALID` |
| **429** | `RATE_LIMITED` (smart rate limit) |

### `GET /api/v1/models/:modelAlias`

| | |
|--|--|
| **200** | single `GatewayModelDto` |
| **404** | unknown alias — `MODEL_ALIAS_NOT_FOUND` (`ErrorEnvelope`) |

> **Note:** an unknown alias in **`POST /chat`** returns **400** + `MODEL_ALIAS_NOT_FOUND` (validation before the LLM call). In the models catalog intentionally **404**.

---

## Chat *(requires `X-Gateway-Key`)*

### `POST /api/v1/chat`

Standard response (full) — **implemented.** Guards: `@GatewayKeyAndSmartRateLimit()`. Body: `modelAlias`, `messages`, optionally **`conversationId`** (Sentry: conversation only in request; response always with ID — `conversation-tracking.md`), optionally **`metadata`**, optionally **`params`** (`temperature`, `maxOutputTokens`, `topP`, `topK`, `stop`, `frequencyPenalty`, `presencePenalty`, `seed`, `responseFormat` — YAML ← body merge via `resolveProviderCallOptions`; `topK` / `stop` / `responseFormat` only from body).

| | |
|--|--|
| **201** | gateway response (JSON); optionally `toolCalls`, `finishReason` (`stop` \| `tool_calls` \| `length` \| `content_filter` — `GatewayFinishReason`), `usageDetails`, `systemFingerprint` (only when upstream OpenAI — see `dictionary.md`), `effectiveModelAlias`, `cached` |
| **400** | DTO validation; `MODEL_ALIAS_NOT_FOUND`; `MODEL_NOT_ALLOWED`; `TOOLS_NOT_SUPPORTED`; other explicit `code` |
| **401** | missing `X-Gateway-Key` — `GATEWAY_KEY_MISSING` |
| **403** | invalid key — `GATEWAY_KEY_INVALID` |
| **429** | `RATE_LIMITED` (smart limit / cooldown after upstream 429 — `checkCooldown` in `prepareRequestForExecution` before LLM call) or `PROVIDER_RATE_LIMITED` (upstream) |
| **502** | e.g. `PROVIDER_UNSUPPORTED`, `PROVIDER_UNAVAILABLE` (including retry+fallback exhaustion) |
| **504** | `PROVIDER_TIMEOUT` (`policy.timeoutMs` + `AbortSignal` in `ResilientExecutor`) |
| **500** | unhandled exception; rarely `GATEWAY_KEY_NOT_CONFIGURED` |

### `POST /api/v1/chat/stream`

**Contract:** `openapi.json` (SSE sequence: `meta` → `delta` → `done`).  
**Implementation:** `src/chat/chat-stream.controller.ts` (`@Controller('chat')` + `@Post('stream')`) with `/api/v1` prefix — see `openapi.json` and `api-documentation.md`. **`X-Gateway-Key`** — same as standard chat.

| | |
|--|--|
| **200** | `text/event-stream`; in `meta` among others **`conversationId`**, optionally **`effectiveModelAlias`**; in `done` among others `usage`, `toolCalls`, `finishReason`, optionally `usageDetails`, `thinkingContent`, `warnings` |
| **400** | JSON `ErrorEnvelope` **before** SSE: DTO validation, `validateForStreaming` (`MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`) |
| **401** / **403** / **429** | key and smart rate limit guards — before `flushHeaders`; cooldown (429) also from `prepareRequestForExecution` before SSE start |
| *(after SSE)* | provider errors — partial stream / connection close instead of JSON `ErrorEnvelope`; `setCooldown` after upstream 429 still possible (`ChatErrorHandlerService`) |

---

## Quick index

| Method | Path | Description |
|--------|---------|------|
| GET | `/api/v1/health` | liveness |
| GET | `/api/v1/health/ready` | readiness (`checks.config`, `checks.redis`, `checks.cache`) |
| GET | `/metrics` | Prometheus metrics (health gauges refreshed on scrape) |
| GET | `/api/v1/models` | list of model aliases (gateway contract) |
| GET | `/api/v1/models/:modelAlias` | alias details |
| POST | `/api/v1/chat` | standard (full response) |
| POST | `/api/v1/chat/stream` | SSE streaming (`ChatStreamController`) |
| GET | `/api/v1/openai/models` | model list (OpenAI facade) |
| GET | `/api/v1/openai/models/:model` | single alias (OpenAI facade) |
| POST | `/api/v1/openai/chat/completions` | OpenAI chat (JSON + `stream: true`) |
| GET | `/api/v1/anthropic/models` | model list (Anthropic facade) |
| GET | `/api/v1/anthropic/models/:model` | single alias (Anthropic facade) |
| POST | `/api/v1/anthropic/messages` | Anthropic messages (JSON + `stream: true`) |

---

## Official contract facades (`src/integrations/`)

Facades for clients expecting vendor APIs. Shared client key allowlist; **different** auth header than native chat. Routes and schemas in **[`openapi.json`](../openapi.json)** (security `BearerAuth` / `ApiKeyAuth`). Errors in vendor format, not `ErrorEnvelope`. Details: `integrations.md`, `openai-contract-integration.md`, `anthropic-messages-integration.md`.

### OpenAI API *(Cursor — Bearer)*

Base URL in IDE: `http://<host>:<port>/api/v1/openai`

| Method | Path | Description |
|--------|---------|------|
| GET | `/api/v1/openai/models` | alias list (`gateway.config.yaml`), OpenAI format |
| GET | `/api/v1/openai/models/:model` | single alias |
| POST | `/api/v1/openai/chat/completions` | chat; `stream: true` → OpenAI SSE |

Success codes for `POST .../chat/completions`: **201** (JSON), **200** (`stream: true`, SSE). Errors — OpenAI format (`OpenAiErrorResponseDto`).

### Anthropic Messages API *(Claude Code — x-api-key)*

Base URL in IDE: `http://<host>:<port>/api/v1/anthropic`

| Method | Path | Description |
|--------|---------|------|
| GET | `/api/v1/anthropic/models` | alias list, Anthropic format |
| GET | `/api/v1/anthropic/models/:model` | single alias |
| POST | `/api/v1/anthropic/messages` | messages; `stream: true` → Anthropic SSE |

Success codes for `POST .../messages`: **201** (JSON), **200** (`stream: true`, SSE). Stream: final `message_delta.usage` with `input_tokens` / cache; optional `thinking` blocks in the `done` phase. Errors — Anthropic format (`AnthropicErrorResponseDto`).

Auth: `x-api-key` (priority) or `Authorization: Bearer` — same allowlist as native chat. Details: [`anthropic-messages-integration.md`](anthropic-messages-integration.md).

---

Related: [`openapi.json`](../openapi.json), `api-documentation.md`, `api-architecture.md`, `conceptual-documentation.md`, `integrations.md`.
