# API documentation — AI Provider Gateway

Document version: **1.6**. The document is versioned with the code. **[`openapi.json`](../openapi.json)** is synchronized with **`src/`** — it covers **three API surfaces** (native chat + **models**, OpenAI facade, Anthropic facade) and health. **Prometheus metrics** (`GET /metrics`) are outside OpenAPI — described in this document and in `deployment.md`. Success and error schemas come from `@Api*` decorators on controllers and DTOs; model registration in `src/swagger/swagger.setup.ts`.

## Sources of truth (order)

1. **NestJS code** (`src/**/*.controller.ts`, services, DTOs) — `@nestjs/swagger` decorators on controllers and response classes (`@ApiProperty`, `@ApiOperation`, `@ApiGatewayChatErrorResponses`, `@ApiGatewayModelsErrorResponses`, `@ApiOpenAiErrorResponses`, `@ApiAnthropicErrorResponses`, `@ApiRequestIdHeader`, …). Document configuration: `src/swagger/swagger.setup.ts` (`extraModels`, three `securitySchemes`).
2. **[`openapi.json`](../openapi.json)** — HTTP contract (OpenAPI 3.1) **generated from code** (`npm run openapi:export` → `src/swagger/export-openapi.ts`). At runtime the same document is served as `/api/v1/swagger.json` (when Swagger is enabled).
3. **Swagger UI** — interactive documentation at `/api/v1/api-docs` (`setupSwagger` in `src/main.ts`; disable via `SWAGGER_ENABLED` — `configuration.md`).
4. **`conceptual-documentation.md`** — MVP/v1 scope. In `src/` among others: `GlobalExceptionFilter`, **`RequestIdMiddleware`** (body + response header `x-request-id`), **`@GatewayKeyAndSmartRateLimit()`** (`GatewayKeyGuard` + `SmartRateLimitGuard`), SDK error mapping (`provider-error.mapper.ts`, codes **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`**), **`params` in body**, logging + **observability** (`src/observability/` — Sentry AI metrics, Prometheus app metrics, health gauges), readiness, graceful shutdown (`main.ts`). **Offline validation:** `npm run config:validate` (YAML + runtime) or **`gateway config:validate`** (+ `validateEnvironment()`) — `configuration.md`.
5. **Response cache** for `POST /api/v1/chat` (`src/cache/`, backend `noop` / `redis`, read validated by `CachedChatResponseSchema` — `configuration.md`). Further Redis layer development (limits, metrics, observability): `conceptual-documentation.md`.
6. **Server-side system prompt** — file loading in `configuration.ts`, composition in `composeSystemPrompt` / `buildProviderInputForAlias` (`src/chat/helpers/`).
7. **`pl/spec/`** — SDD (requirements; compare with `src/` and [`openapi.json`](../openapi.json)).

## Basics

| Element                       | Value                                              |
| ----------------------------- | ---------------------------------------------------- |
| Base URL (local example) | `http://localhost:3000`                              |
| API prefix                   | `/api/v1` (`API_GLOBAL_PREFIX` in `src/setup.app.ts`) |
| Encoding                     | UTF‑8                                                |
| Standard                      | `application/json`                                   |
| Streaming                     | `text/event-stream` (`POST /api/v1/chat/stream`)     |

**Configuration at startup:**

- **`gateway.config.yaml`** — load and Zod validation (`src/config/gateway-config.schema.ts`) + `buildEffectiveGatewayConfig` (`src/config/configuration.ts`): among others `providers` ↔ `models` consistency (non-empty `models`, alias → provider, enabled provider → ≥1 model). After cloning, fill in the file manually or run `gateway config:init` — details: `configuration.md`.
- **System prompt files** — `MASTER_SYSTEM_PROMPT.md` (required), optionally `MAIN_SYSTEM_PROMPT.md` and `models/<modelAlias>.md` for aliases from YAML; content composed at runtime (`composeSystemPrompt` in `src/chat/helpers/system-prompt.ts`). Details: `configuration.md`.
- **Env** — every enabled provider instance in YAML requires a key under **`apiKeyRef`** (`provider-api-key.validation.ts`). Optionally **`CACHE_*`** / **`REDIS_*`** variables — `configuration.md`.

**`X-Gateway-Key` header:** **required** for chat and the models catalog (`@GatewayKeyAndSmartRateLimit()` on `ChatController`, `ChatStreamController`, `ModelsController`). Allowlist: `buildGatewayKeyRuntime` in `configuration.ts`. With `RATE_LIMIT_SMART_ENABLED=true` and ready Redis — additionally per-key limits (`SmartRateLimitGuard`, `SmartRateLimiterService`; details `configuration.md`). **`GET /api/v1/health`** and **`GET /api/v1/health/ready`** — no key (chat/models guards do not cover them).

**`requestId`:** `RequestIdMiddleware` sets `req.requestId` from the request header **`x-request-id`** (if non-empty) or generates `req_<uuid>`, and sets the **response header** `x-request-id` to the same value (`src/common/middleware/request-id.middleware.ts`). The **`requestId`** field in JSON (success, error, SSE `meta`) comes from `req.requestId`. The client can correlate logs via the response header or the body field.

---

## Error format

All error responses handled by `GlobalExceptionFilter` as JSON are in the **`ErrorEnvelope`** envelope (`openapi.json`) — see `src/common/filters/http-exception.filter.ts` (registration: `APP_FILTER` in `src/app.module.ts`). **Note:** for `POST /api/v1/chat/stream` some errors may occur **after** `flushHeaders` (see streaming section) — then the client may not receive valid JSON.

```json
{
  "statusCode": 400,
  "code": "MODEL_ALIAS_NOT_FOUND",
  "message": "Model alias unknown-alias not found in config",
  "requestId": "req_01H...",
  "details": []
}
```

If the exception passes a **`code`** field in the response object (e.g. `GatewayKeyGuard`, `ProviderRegistryService`, `ChatService.executeStream`), **`GlobalExceptionFilter`** preserves it (`GATEWAY_KEY_MISSING`, `GATEWAY_KEY_INVALID`, `GATEWAY_KEY_NOT_CONFIGURED`, `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, …). Otherwise **`code`** comes from the default HTTP status mapping (`DEFAULT_HTTP_STATUS_TO_CODE` in `src/common/errors/api-error.code.ts`), among others:

| HTTP | `code` (default)                                                                            |
| ---- | --------------------------------------------------------------------------------------------- |
| 400  | `VALIDATION_FAILED` _(when the exception does not override `code`; otherwise e.g. `MODEL_ALIAS_NOT_FOUND`)_ |
| 401  | `PROVIDER_AUTH_FAILED`\*                                                                      |
| 403  | `GATEWAY_KEY_INVALID`\*                                                                       |
| 429  | `RATE_LIMITED` (gateway), `PROVIDER_RATE_LIMITED` (upstream)                                  |
| 502  | `PROVIDER_UNAVAILABLE`                                                                        |
| 504  | `PROVIDER_TIMEOUT`                                                                            |
| other | `INTERNAL_SERVER_ERROR`                                                                       |

\* With the key guard and explicit codes in the exception payload, **`GATEWAY_KEY_MISSING`** / **`GATEWAY_KEY_INVALID`** are used, not the values from this table.

On `ValidationPipe` validation the source `message` is sometimes an array of strings; **`GlobalExceptionFilter`** emits **`message` as a single string** (`array.join('; ')`). Full code dictionary — `dictionary.md`.

---

### System prompt, roles in `messages[]`, and tool calling

**`system` role:** blocked in the API (validation `400`). The system instruction is **composed on the server** in `composeSystemPrompt` (`src/chat/helpers/system-prompt.ts`) and passed to adapters via `buildProviderInputForAlias` (`src/chat/helpers/provider-input.ts`).

**Roles in `messages[]`:** `user`, `assistant`, `tool` (`ChatMessageDto`):

| Role        | Fields                                   | Limits           |
| ----------- | -------------------------------------- | ---------------- |
| `user`      | `content`                              | max 3000 characters  |
| `assistant` | `content`; optionally `toolCalls[]`   | max 3000 characters  |
| `tool`      | `content`, **`toolCallId`** (required) | max 32000 characters |

**`tooling` field (optional):** object with `definitions[]` (`name`, `description?`, `parameters` — JSON Schema) and optional `toolChoice`. Enables function calling — the alias must have **`capabilities.tools: true`** in YAML; otherwise **`400`** + **`TOOLS_NOT_SUPPORTED`**.

**Response:** optional **`toolCalls`** (`id`, `name`, `arguments` as JSON string) and **`finishReason`**. At runtime the gateway maps the provider `stopReason` with **`mapStopReasonToFinishReason`** (`src/chat/helpers/map-provider-finish-reason.ts`) to the normalized type **`GatewayFinishReason`** (`src/chat/types/gateway-finish-reason.type.ts`):

| Gateway value      | Typical provider `stopReason` sources                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **`stop`**           | `end_turn`, `stop_sequence`, `pause_turn`, `stop`, `insufficient_system_resource`, missing / unknown |
| **`tool_calls`**     | `tool_use`, `tool_calls` or presence of `toolCalls[]`                                                |
| **`length`**         | `max_tokens`, `length`                                                                             |
| **`content_filter`** | `refusal`, `content_filter`                                                                        |

The enum in OpenAPI/DTO may contain additional vendor values — **only the four above are emitted in the native API**. The Anthropic facade maps `content_filter` → `stop_reason: refusal` (`anthropic-stop-reason.mapper.ts`).

Optionally in the JSON response: **`usageDetails`** (`promptCacheHitTokens`, `promptCacheCreationTokens` — when the Anthropic adapter returns cache stats, currently on the `parseAnthropicResponseWithTools` path) and **`systemFingerprint`** — optional, **provider-specific**: in practice filled when upstream returns an OpenAI `system_fingerprint` equivalent (adapter `type: openai` / `openai-compatible` — Chat Completions). **Anthropic and Google Gemini do not have this field** — for aliases on those providers the field **does not appear** in the response (gateway omits the key). Do not confuse with Gemini `model` / `modelVersion`. Details: **`dictionary.md`** (section “`systemFingerprint` — semantics and providers”).

**SSE `done`:** may contain `usage` (with `totalTokens`), `toolCalls`, `finishReason` (as above), optionally `systemFingerprint` (same rules as in JSON). In standard chat `done` may be empty `{}` only when there are no final metadata.

**Cache and fallback:** requests with tooling (`isToolingRequest`) **skip cache** and **do not use fallback** in `POST /api/v1/chat`. Streaming **still** applies YAML fallback.

OpenAI / Anthropic facades map `tools`, `tool_calls`, `tool_use` / `tool_result` blocks to the same internal contract — see `openai-contract-integration.md`, `anthropic-messages-integration.md`.

**Consistent prompt layer description:** `configuration.md`, `architecture.md`.

---

## Native API vs official contract facade differences

| Aspect                                     | Native (`/api/v1/chat`)                                                         | OpenAI/Anthropic facades                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Max messages                             | 150                                                                              | 15000                                                                          |
| Max `content` length (user/assistant)     | 3000 characters                                                                      | 128000 characters                                                                  |
| Max `content` length (tool)               | 32000 characters                                                                     | 128000 characters                                                                  |
| `warnings` field in response                 | Yes (`warnings[].code` — string in JSON; internally `WarningCode`, e.g. `PARAM_IGNORED_BY_PROVIDER`) | No (vendor compatibility)                                                      |
| `systemFingerprint` / `system_fingerprint` | Optionally in JSON and SSE `done` — only when upstream returns it (practically OpenAI) | OpenAI facade: `system_fingerprint` when set; Anthropic facade: no field |
| System prompt                              | Server                                                                           | Server (ignored from body)                                                     |

**Rationale:** Official contract facades are designed for long conversations and large contexts (IDEs such as Cursor or Claude Code, and other clients that speak those vendor contracts), while the native API has conservative limits for your own applications. Validation profile details: `integrations.md`; implementation: `validateChatIngress()` in `src/chat/validation/chat-ingress.validator.ts` (profiles passed from controllers to `ChatService`).

---

## Models and provider selection

The client provides **`modelAlias`** from **`gateway.config.yaml`**. Registry: `ProviderRegistryService.resolve()` — lookup by **`models[].providerInstance`**, not by `type`. Runtime: `anthropic` / `google` factories created in `ProviderInstancesBootstrap` (`ProvidersModule`).

**Resilience:** `policy.timeoutMs` and `policy.retry` from YAML are enforced by **`ResilientExecutor`** (`src/chat/resilience/`). After `timeoutMs` elapses the gateway cancels the current attempt via **`AbortSignal`** (passed to `ChatProviderCallService` → SDK adapter: Anthropic/OpenAI `{ signal }`, Google `config.abortSignal`) and returns **`PROVIDER_TIMEOUT`** (504). Optional **`models[].fallback`**: after exhausting attempts the gateway tries a backup alias (one hop); on success — optional **`effectiveModelAlias`**. **Fallback is disabled** for requests with tooling — both in standard chat (`executeChat`) and streaming (`executeStream`; `isToolingRequest` → `fallbackAlias: undefined`).

---

## `POST /api/v1/chat` — standard

### Request body

Per DTO: **`modelAlias`** (string), **`messages`** (array of **1 to 150** messages) — roles `user` | `assistant` | `tool` (see section above), optionally **`tooling`**, **`params`**, **`conversationId`** in **`conv_<uuid>`** format (regex validation in `ChatRequestDto`): in **request** enables Sentry grouping; without it the span = a single message. From the **second turn** with `conversationId` the client should send the **full** history in `messages[]` (including `assistant` responses and `tool` turns). Details: **`conversation-tracking.md`**. Optionally **`metadata`** — key–value object (`string` | `number` | `boolean`); propagated to the adapter (`buildProviderInputForAlias`). **Anthropic** maps `metadata.userId` → `messages.create({ metadata: { user_id } })`; **Google** currently ignores it.

Optionally **`params`** (`src/chat/dto/chat-params.dto.ts`, `response-format.dto.ts`): nested object with optional fields **`temperature`** (0–2), **`maxOutputTokens`** (1–8192), **`topP`** (0–1), **`topK`** (integer ≥0), **`stop`** (string \| string[]), **`frequencyPenalty`** / **`presencePenalty`** (-2–2), **`seed`** (integer 0–2³²−1), **`responseFormat`** (`{ type: "text" | "json_object", jsonSchema?: object }`). Effective values: merge **`policy.params.defaults`** from YAML ← body override for fields in **`allowOverrides`** (applies to `temperature`, `maxOutputTokens`, `topP`, `frequencyPenalty`, `presencePenalty`, `seed`); fields **`topK`**, **`stop`**, **`responseFormat`** — **only from body** (no merge from YAML `defaults`); after merge **clamp** to **`bounds`** (`resolveProviderCallOptions`). Disallowed field in body → **`400`** + **`MODEL_NOT_ALLOWED`** — in standard chat checked **before** calling the provider. **Which fields reach the SDK** depends on the alias **`providerInstance`** (Anthropic / Google / OpenAI / OpenAI-compatible) — matrix: **`dictionary.md`**, YAML rules: **`configuration.md`**. **`frequencyPenalty` / `presencePenalty`**: accepted in the API; `anthropic` / `google` adapters do not pass them to the SDK (OpenAI — does). **`topK`**: Anthropic (priority over `topP` / `temperature`) and Google; OpenAI ignores. **`responseFormat`**: mapped to Anthropic SDK (`output_config.format`), Google (`response_format` / `response_schema`) and OpenAI (`response_format` / Responses `text.format`) when `type === json_object`. Extra fields in body → **`400`** (`ValidationPipe`: `whitelist` + `forbidNonWhitelisted`). Body limit: **1 MB**.

### Response (`201`)

Successful JSON response: **201 Created** — default NestJS behavior for `POST` without `@HttpCode` (`ChatController` returns the handler result; `@ApiResponse({ status: 201 })` decorator in `src/chat/chat.controller.ts`). **`openapi.json`** and Swagger UI describe the same code. SSE streaming — **200** (`POST /chat/stream`).

`ChatService.executeChat`: `id`, **`provider`** (**`providerInstance`** identifier from YAML), `model` (requested `modelAlias`), optionally **`effectiveModelAlias`**, optionally **`toolCalls`**, **`finishReason`**, **`usageDetails`**, optionally **`systemFingerprint`** (only when the upstream adapter supplies it — see `dictionary.md`), `output`, `usage`, `requestId`, **`conversationId`**.

**Cache (optional):** lookup before calling the provider; **skipped** for requests with tooling. On a hit — when the alias and provider are **enabled** in YAML — JSON is returned with **`cached: true`**, **`cachedAt`**. Backend reads are parsed by **`parseCachedChatResponse`** (`CachedChatResponseSchema`); invalid entry is removed. Streaming is not cached.

**Cooldown after provider 429** (`SmartRateLimiterService.setCooldown`) is set in **`ChatErrorHandlerService.handleProviderError`** after an upstream error — applies to **`executeChat` and `executeStream`** (in both paths `gatewayKey` is passed). Shared cooldown check before the call: `prepareRequestForExecution` → `checkCooldown`.

The **`model`** field is the **alias** from the request (`modelAlias`) both in the standard response and in SSE (`meta.model`) — the vendor `modelId` is not returned in any response. SSE **`meta`** is emitted in `ChatProviderCallService.streamOnce` (first successful call in the retry/fallback chain).

### Typical codes

| HTTP | When                                                                                                                                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 201  | Success (default NestJS code for `POST` without `@HttpCode`)                                                                                                                          |
| 200  | SSE streaming success (`POST /chat/stream`)                                                                                                                                      |
| 400  | DTO validation; unknown `modelAlias` → `MODEL_ALIAS_NOT_FOUND`; disallowed override in `params` → `MODEL_NOT_ALLOWED`; tooling without `capabilities.tools` → `TOOLS_NOT_SUPPORTED` |
| 401  | Missing `X-Gateway-Key` header (`GATEWAY_KEY_MISSING`)                                                                                                                            |
| 403  | Invalid `X-Gateway-Key` (`GATEWAY_KEY_INVALID`)                                                                                                                              |
| 429  | Smart rate limit / cooldown (`RATE_LIMITED`) or provider limit (`PROVIDER_RATE_LIMITED`)                                                                                       |
| 502  | Among others `PROVIDER_UNSUPPORTED`, `PROVIDER_UNAVAILABLE` (including retry+fallback exhaustion) — `provider-error.mapper.ts`, `ResilientExecutor`                                        |
| 504  | `PROVIDER_TIMEOUT` — exceeded `policy.timeoutMs` (`ResilientExecutor` + `AbortSignal` to SDK)                                                                                  |
| 500  | Unhandled error (e.g. SDK); exceptionally missing key allowlist (`GATEWAY_KEY_NOT_CONFIGURED`)                                                                                     |

---

## `POST /api/v1/chat/stream` — SSE

**Controller:** `ChatStreamController` + `StreamCleanupInterceptor` (release stream slot in `finalize`).

Flow: `validateForStreaming(modelAlias)` → SSE headers + **`flushHeaders()`** → `executeStream`. Body same as standard chat (including optional **`conversationId`** — `conversation-tracking.md`).

**Events:** `meta` → `delta`\* → `done`. In **`meta`**: `id`, `provider`, `model`, optionally **`effectiveModelAlias`**, `requestId`, **`conversationId`**. In **`done`**: optionally `usage` (with `totalTokens`), **`toolCalls`**, **`finishReason`**, optionally **`systemFingerprint`** (rules as in JSON above). Retry/fallback — `ResilientExecutor` (fallback disabled with tooling, as in JSON).

**Errors and JSON `ErrorEnvelope`:**

- **Before SSE (reliable JSON):** `ValidationPipe`, guards (`GatewayKeyGuard`, `SmartRateLimitGuard`), **`validateForStreaming`** — among others `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`.
- **After `flushHeaders`:** errors from **`executeStream`** / **`ChatProviderCallService.streamOnce`** — among others `MODEL_NOT_ALLOWED` (disallowed field in `params` checked only in `resolveProviderCallOptions` inside `streamOnce`), provider errors (`PROVIDER_*`), timeout (`PROVIDER_TIMEOUT`), retry+fallback exhaustion (`PROVIDER_UNAVAILABLE`). The client may get a **partial** stream (`meta` / `delta`) instead of valid JSON; the connection ends in the controller `finally` (`res.end()`).

See: `src/chat/chat-stream.controller.ts`, `src/chat/chat.service.ts`, `src/chat/services/chat-provider-call.service.ts`.

---

## `GET /api/v1/health`

Liveness — `HealthService.getLiveness()`: `{ status: "healthy", timestamp }`. The **`timestamp`** field is **`new Date().toISOString()`** (ISO 8601, UTC), not a locale string.

## `GET /api/v1/health/ready`

Readiness — `HealthService.getReadiness()`: `status` (`ready` | `not_ready`), `timestamp` (ISO 8601), `version`, `uptime`, `checks` (`config`, `redis`, `cache`).

| Aspect              | Behavior in code                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **HTTP**            | Always **200** — assess readiness by the **`status`** field in the body (`ready` / `not_ready`), not by the HTTP code.                                                                                                                                                                                                                                                                          |
| **`checks.config`** | **`healthy`** when **`gateway`** and **`resolvedSystemPrompts`** are loaded (typical start after valid YAML). **`unhealthy`** when either object is missing from config — then the body often has `status: not_ready`. Implementation: `HealthService.checkConfig`.                                                                                                                  |
| **`checks.redis`**  | **`required: false`** → **`healthy`**, “Redis not required”, no probe. **`required: true`** → `RedisConnectionService.ping()`; **`healthy`** when PONG OK, **`degraded`** when connection/ping unavailable — does **not** block `ready`. **`consumers`** field: `cache`, `rate-limit` (who requires Redis in this deployment). Implementation: `isRedisRequiredFromConfig()` + `checkRedis`. |
| **`checks.cache`**  | Cache **feature** state: disabled → **`healthy`** (“Cache disabled (noop)”). Backend **`redis`** → status depends on **`checks.redis`** (no separate probe via `CacheRegistryService`). Other backends → probe via registry as before. **`degraded`** does not block `ready`.                                                                                                   |

The orchestrator should treat an instance as ready only when `status === "ready"` in the JSON.

After each readiness evaluation (`getReadiness()` or the hook on `GET /metrics`) `HealthService.publishMetrics()` is called — updating Prometheus gauges `gateway_readiness` and `gateway_health_status` (log only when the aggregate `ready` ↔ `not_ready` changes).

---

## `GET /metrics` — Prometheus (outside `/api/v1`)

**Controller:** `MetricsController` (`src/observability/app-metrics/metrics.controller.ts`). **No** `X-Gateway-Key` — excluded from the global prefix in `setup.app.ts`.

| Aspect | Behavior |
|--------|------------|
| **Format** | Prometheus text exposition (`Content-Type: text/plain; version=0.0.4`) |
| **Backend** | `PrometheusAppMetricsAdapter` in production / `METRICS_BACKEND=prometheus`; in dev default noop (empty body) |
| **Health gauges** | Before `getMetricsSnapshot()` — `PreMetricsScrapeRegistry.runAll()` → `HealthService.refreshMetricsForScrape()` (throttle 5s; full check without throttle on `GET /ready`) |
| **Example metrics** | `gateway_readiness`, `gateway_health_status{component="config\|redis\|cache"}`, `gateway_requests_total`, `gateway_tokens_total`, `gateway_nodejs_*` |
| **Monitoring stack** | `deployment/monitoring/prometheus.yml`, alerts: `alerts.yml` — `deployment.md` |

---

## `GET /api/v1/models` — alias catalog

**Module:** `ModelsModule` (`src/models/`). **Service:** `GatewayModelsCatalogService` — reads `gateway.config.yaml` (no provider SDK calls).

### `GET /api/v1/models`

|          |                                   |
| -------- | --------------------------------- |
| **Auth** | `X-Gateway-Key`                   |
| **200**  | `{ "models": GatewayModelDto[] }` |

**`GatewayModelDto`** fields:

| Field               | Description                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| `modelAlias`       | public alias from YAML                                                      |
| `providerInstance` | instance identifier in `providers[]`                                     |
| `providerType`     | `anthropic` \| `google` \| `openai` \| `gateway` (when provider entry is missing) |
| `modelId`          | vendor model identifier for the runtime adapter                         |
| `capabilities`     | optionally: `streaming`, `tools`, `thinking`                               |
| `fallback`         | optional backup alias from `models[].fallback`                             |

### `GET /api/v1/models/:modelAlias`

| HTTP | When                                                          |
| ---- | -------------------------------------------------------------- |
| 200  | Alias found — single `GatewayModelDto`                |
| 401  | Missing `X-Gateway-Key` (`GATEWAY_KEY_MISSING`)                   |
| 403  | Invalid key (`GATEWAY_KEY_INVALID`)                      |
| 404  | Unknown alias — **`MODEL_ALIAS_NOT_FOUND`** (`ErrorEnvelope`) |
| 429  | Smart rate limit (`RATE_LIMITED`)                              |

> **Difference vs chat:** `POST /chat` with an unknown `modelAlias` returns **400** + `MODEL_ALIAS_NOT_FOUND` (ingress validation before LLM). The models catalog uses **404** for a non-existent alias.

OpenAI (`GET /openai/models`) and Anthropic (`GET /anthropic/models`) facades return **the same set of aliases** in vendor format — mapping via `openai-models.mapper.ts` / `anthropic-models.mapper.ts`. Details: `integrations.md`.

---

## Official contract facades

Separate HTTP contracts for official OpenAI / Anthropic API shapes (IDEs and other clients) — **included in `openapi.json`** (tags **OpenAI API**, **Anthropic API**) and in Swagger UI (`/api/v1/api-docs`).

| Surface | Paths (prefix `/api/v1`)                                             | Auth in OpenAPI             | Errors in spec                                               |
| ------------ | ----------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| OpenAI       | `/openai/models`, `/openai/models/{model}`, `/openai/chat/completions`  | `BearerAuth`               | `OpenAiErrorResponseDto` (`ApiOpenAiErrorResponses`)       |
| Anthropic    | `/anthropic/models`, `/anthropic/models/{model}`, `/anthropic/messages` | `ApiKeyAuth` (`x-api-key`) | `AnthropicErrorResponseDto` (`ApiAnthropicErrorResponses`) |

| Surface         | Operational documentation            |
| -------------------- | ---------------------------------- |
| OpenAI               | `openai-contract-integration.md`    |
| Anthropic            | `anthropic-messages-integration.md` |
| Shared architecture | `integrations.md`                    |

Internally facades call the same **`ChatService`** as `POST /chat`. The **`model`** field in the vendor request = **`modelAlias`** from YAML. Runtime: errors in OpenAI / Anthropic shape (`OpenAiExceptionFilter`, `AnthropicExceptionFilter`) — not `ErrorEnvelope`. Streaming described in OpenAPI via constants `OPENAI_STREAM_API_DESCRIPTION` / `ANTHROPIC_STREAM_API_DESCRIPTION` (`src/integrations/*/helpers/*-stream-api-description.ts`).

**HTTP codes (facades):** as in native chat — **201** for JSON responses (`stream` false / omitted; `@ApiResponse({ status: 201 })` in facade controllers), **200** for SSE (`stream: true`; explicit `res.status(200)` in `handleStream`). OpenAPI declares both codes on one operation (`POST .../chat/completions`, `POST .../messages`). _Note:_ upstream OpenAI and Anthropic APIs return **200** on success; the gateway intentionally uses **201** on all successful JSON `POST`s (NestJS consistency across the service).

---

## Extended Thinking Mode

The gateway supports extended thinking / reasoning for models with deep reasoning — **Anthropic Claude**, **Google Gemini 3.0+**, and **OpenAI** (adapter `type: openai` via Responses API in `responses.adapter.ts`).

### Provider support matrix

| Provider              | API                                 | Supported models (examples)                                                | Status in Gateway                       | Thinking content in response                      |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| **Anthropic**         | `thinking` + `output_config.effort` | Claude Opus/Sonnet 4.5+                                                     | ✅ Full support                      | ✅ `thinkingContent` (JSON / SSE `done`)         |
| **Google Gemini**     | `ThinkingConfig`                    | Gemini 3.0+ (`capabilities.thinking: true`)                                 | ✅ Full support                      | ✅ `thinkingContent` when `includeThoughts: true` |
| **OpenAI**            | Responses API (`/v1/responses`)     | Models supported by Responses (e.g. `gpt-5*`, `o*`) with `type: openai` | ✅ Full support (runtime adapter)    | ✅ `thinkingContent` (reasoning summary)         |
| **OpenAI-compatible** | Chat Completions                    | Depends on backend (e.g. Ollama)                                             | ❌ No thinking mapping in adapter | ❌                                               |

**Note:** The OpenAI facade (`POST /api/v1/openai/chat/completions`) maps `reasoning_effort` to `params.thinkingEnabled` / `params.thinkingBudget` (`openai-request.mapper.ts`). Effect depends on the YAML alias — works when the alias points to a `providerInstance` with `type: openai` and has `capabilities.thinking: true`.

### Enabling thinking mode

**Gateway native API:**

```json
POST /api/v1/chat
{
  "modelAlias": "claude-sonnet",
  "messages": [{ "role": "user", "content": "Solve this complex problem..." }],
  "params": {
    "thinkingEnabled": true,
    "thinkingBudget": "medium"
  }
}
```

**OpenAI facade** (`reasoning_effort` → `params.thinking*`):

```json
POST /api/v1/openai/chat/completions
{
  "model": "gpt-cheap",
  "messages": [{ "role": "user", "content": "..." }],
  "reasoning_effort": "high"
}
```

Requires an alias with `capabilities.thinking: true` and a `providerInstance` of type `openai`. A numeric `thinkingBudget` in the native API for OpenAI may produce a `PARAM_IGNORED_BY_PROVIDER` warning (effort mapped from string) — see `generation-warnings.ts`.

**Anthropic facade:**

```json
POST /api/v1/anthropic/messages
{
  "model": "claude-sonnet",
  "messages": [{ "role": "user", "content": "..." }],
  "thinking": {
    "type": "enabled",
    "budget_tokens": 5000
  },
  "output_config": {
    "effort": "high"
  }
}
```

### Parameters

**Gateway unified params:**

- **`thinkingEnabled`** (boolean): Enables thinking mode
- **`thinkingBudget`** (string | number): Thinking budget/intensity:
  - **String:** `"none"` \| `"minimal"` \| `"low"` \| `"medium"` \| `"high"` \| `"xhigh"` \| `"max"`
  - **Number:** Integer token budget (min 1024, provider-specific)

**Vendor-specific mapping:**

| Gateway param            | Anthropic API                                 | Google Gemini API                           | OpenAI (`type: openai`, Responses)                                  |
| ------------------------ | --------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `thinkingEnabled: true`  | `thinking: { type: 'enabled' \| 'adaptive' }` | `thinkingConfig: { includeThoughts: true }` | `reasoning.effort` + `reasoning.summary: auto`                      |
| `thinkingBudget: number` | `thinking.budget_tokens` (min 1024)           | `thinkingConfig.thinkingBudget`             | Surface validation; numbers may produce a warning — prefer string effort |
| `thinkingBudget: "low"`  | `output_config.effort: "low"`                 | `thinkingConfig.thinkingLevel: "LOW"`       | `reasoning.effort: "low"`                                           |
| `thinkingBudget: "high"` | `output_config.effort: "high"`                | `thinkingConfig.thinkingLevel: "HIGH"`      | `reasoning.effort: "high"`                                          |

### Response

When the model uses thinking mode, the response may include a **`thinkingContent`** field:

```json
{
  "id": "gw_abc123",
  "output": {
    "text": "Based on my analysis..."
  },
  "thinkingContent": "Let me break this down step by step...",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 2500
  }
}
```

**Provider-specific notes:**

- **Anthropic (native chat):** `thinkingContent` in JSON; in stream — in the `done` event (not in text deltas).
- **Anthropic (facade):** JSON — block `{ type: 'thinking', thinking: string }` in `content[]`. Stream — `thinking_delta` in the `done` phase.
- **Google Gemini:** Thoughts when `includeThoughts: true` (Gemini 3.0+).
- **OpenAI (`type: openai`):** Reasoning summary from Responses API → `thinkingContent`; in stream — `getThinkingContent()` on `StreamResult` (`responses.adapter.ts`).

### Alias configuration

Anthropic example (from repository `gateway.config.yaml`):

```yaml
models:
  claude-sonnet:
    providerInstance: anthropic
    modelId: claude-sonnet-4-5-20250929
    capabilities:
      streaming: true
      tools: true
      thinking: true
    policy:
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
          - thinkingEnabled
          - thinkingBudget
```

**Note**: the `gpt-cheap` alias in the sample repo YAML currently has `thinking: false` (the `type: openai` adapter supports thinking via Responses API, but requires explicit `capabilities.thinking: true` in configuration).

An Anthropic alias with thinking (e.g. `claude-sonnet` in the repo) requires `capabilities.thinking: true` and `thinkingEnabled` / `thinkingBudget` entries in `allowOverrides`.

**Notes:**

- Thinking mode **significantly increases** latency and cost (2-10x more tokens).
- Disabled **by default** (`thinkingEnabled: false` in YAML defaults) — requires `capabilities.thinking: true` + `allowOverrides`.
- **Gemini 3.0+ ONLY** for `thinkingConfig` — earlier Gemini models return an error with thinking.
- **Cross-validation:** when `thinkingBudget` is a number, `maxOutputTokens >= thinkingBudget + 512` is required.
- Thinking content is **not streamed** in real-time in native SSE (returned in `done`); the OpenAI Responses adapter collects reasoning during the stream and exposes it via `getThinkingContent()`.

---

## Versioning

The gateway uses **three independent version numbers** (do not confuse them):

| Version                   | Location                                                 | Field in `openapi.json` | Meaning                            | Semver                  |
| ------------------------ | ----------------------------------------------------------- | --------------------- | ------------------------------------ | ----------------------- |
| **App version**          | `package.json` → `version`                                  | —                     | Application version (release)           | ✅                      |
| **OpenAPI version**      | `src/swagger/swagger.constants.ts` → `OPENAPI_VERSION`      | `info.version`        | HTTP API contract semver            | ✅                      |
| **OpenAPI spec version** | `src/swagger/swagger.constants.ts` → `OPENAPI_SPEC_VERSION` | `"openapi"` (root)    | Document format version (3.0 / 3.1) | ❌ (specification constant) |

### Bump rules

- **OPENAPI_VERSION:**
  - **MAJOR** — breaking change in JSON (removed fields, change of required field types).
  - **MINOR** — additive (new optional fields, new error codes).
  - **PATCH** — fixes without contract changes (typo in OpenAPI description).

- **package.json version:**
  - Application version; need not be synchronized 1:1 with OpenAPI.
  - Bump on every release (feat, fix, docs, refactor).

**Example:** `OPENAPI_VERSION = 0.12.1`, `package.json version = 1.0.5` — OK (app has more releases than API breaking changes).

**OpenAPI export:** `npm run openapi:export` — generates `openapi.json`; `info.version` from `OPENAPI_VERSION`, `"openapi"` key from `OPENAPI_SPEC_VERSION` (`export-openapi.ts`).

---

## Codes and dictionary

Stable machine codes — **`dictionary.md`**. **`GlobalExceptionFilter`** preserves **`code`** from the exception object payload (among others `GATEWAY_KEY_*`, `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `PROVIDER_UNSUPPORTED`), otherwise applies mapping from HTTP status (`DEFAULT_HTTP_STATUS_TO_CODE`).

---

## Notes for clients

1. Use **`openapi.json`** for generators and integrations — choose the correct **`securityScheme`**: `GatewayKeyAuth` (native chat), `BearerAuth` (OpenAI), `ApiKeyAuth` (Anthropic).
2. For **`POST /api/v1/chat`** and **`POST /api/v1/chat/stream`** include the **`X-Gateway-Key`** header with an operator value (allowlist — `configuration.md`).
3. **`params`** in the body are optional — without them only `policy.params.defaults` from YAML are used; override requires the field in `allowOverrides` for the alias (`configuration.md`). **Vendor effect** depends on the alias provider (e.g. Anthropic rejects simultaneous `temperature` + `topP`) — `dictionary.md`.
4. With cache enabled, repeated **`POST /api/v1/chat`** with the same body may return a response with **`cached: true`** without calling the provider (`configuration.md`).
5. Do not rely on **`role=system`** in `messages[]` — it is rejected; system policy is set by the operator in `src/config/system-prompt/`.
6. When streaming, assemble text from successive `delta`s; final metadata (`usage`, `toolCalls`, `finishReason`, optionally `systemFingerprint` — only when upstream supplies it) is in the **`done`** event.
7. **`usage`** may be incomplete across providers.
8. **`conversationId`**: always in the response (echo or `conv_*`). In **request** — only then Sentry groups the turn as a conversation; typical start: turn 1 without ID, turn 2+ with ID from the response + full `messages[]` (`conversation-tracking.md`).
9. **Streaming:** invalid `params` (outside `allowOverrides`) may return `MODEL_NOT_ALLOWED` **after** SSE has started — in standard chat the same error is **before** calling the provider.
10. **Readiness:** `GET /health/ready` always **200** — check `body.status === "ready"`. Fields in `checks`: **`config`**, **`redis`** (shared infrastructure; probe only when `required: true`), **`cache`** (cache feature state).
11. **Correlation:** response header **`x-request-id`** = the same ID as the `requestId` field in JSON (in the standard flow without overriding `requestId` in the exception payload).

Related: `endpoints.md`, `api-architecture.md`, `integrations.md`, `configuration.md`, `conversation-tracking.md`, `conceptual-documentation.md`.
