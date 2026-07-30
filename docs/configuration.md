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
| `CACHE_BACKEND`    | `noop`      | Allowed values in the validator: `noop`, `redis`, `memory`, `other`. **Registered in code: `noop` and `redis`.** The `config:init` wizard offers only `redis` \| `noop`; `memory` can be set manually in `.env` — runtime treats an unknown backend as **`noop`** (`CacheRegistryService.resolve`). Unknown backend → warning in the log and fallback to **`noop`**. |
| `CACHE_TTL`        | `3600`      | Cache entry TTL in **seconds** (integer ≥ 1).                                                                                                                                                                                                                                                               |
| `CACHE_KEY_PREFIX` | `aigw:`     | Prefix for chat response cache keys (`ResponseCacheService`).                                                                                                                                                                                                                                                       |
| `REDIS_HOST`       | `localhost` | Redis host (when the Redis module is loaded).                                                                                                                                                                                                                                                                                 |
| `REDIS_PORT`       | `6379`      | Redis port.                                                                                                                                                                                                                                                                                                            |
| `REDIS_PASSWORD`   | _(empty)_   | Password; empty → connection without a password.                                                                                                                                                                                                                                                                                   |
| `REDIS_DB`         | `0`         | Redis database number.                                                                                                                                                                                                                                                                                                      |
| `REDIS_KEY_PREFIX` | `aigw:`     | Redis configuration prefix (separate from `CACHE_KEY_PREFIX`; when `cache.keyPrefix` is missing in the cache service, this is used as a fallback).                                                                                                                                                                                      |

**Loading the Redis module in Nest:**

- **Shared Redis infrastructure:** `RedisConnectionService` (`src/cache/adapters/redis-cache/`) is shared by **response cache** and **smart rate limiting**. Predicate: `isRedisRequired()` in `src/cache/should-include-redis-stack.ts`.
- **When Redis connects:** when `isRedisRequiredFromEnv()` = true, i.e.:
  - `CACHE_ENABLED=true` **and** `CACHE_BACKEND=redis`, **or**
  - `RATE_LIMIT_SMART_ENABLED=true`.
- **Implementation:** `CacheModule.register({ includeRedisStack: isRedisRequiredFromEnv() })` in `src/app.module.ts`. The option name `includeRedisStack` is historical — it covers all Redis infrastructure, not only cache.
- **When Redis is required but unavailable:** smart rate limit → fail-open (requests allowed through); readiness → `checks.redis: degraded` (details below).

**Behavior:** `ChatService.executeChat` checks the cache before calling the provider (`ResponseCacheService`); on a hit — only when the alias and related provider are **enabled** in YAML (`isCachedChatAllowedForModelAlias` in `src/chat/helpers/cache-policy.ts`) — the stored response is returned with **`cached: true`** and **`cachedAt`** (ISO 8601). Redis reads are parsed by **`parseCachedChatResponse`** (`CachedChatResponseSchema` in `src/cache/schemas/cached-chat-response.schema.ts`); invalid shape → key deletion and treat as MISS. Streaming (`POST /api/v1/chat/stream`) does **not** use this layer.

Variable template: `.env.example`.

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

- **`checks.redis`** — shared Redis infrastructure state (PING probe only when `required: true`; fields `required`, `consumers`: `cache`, `rate-limit`),
- **`checks.cache`** — cache feature state (when backend is `redis`, availability follows from `checks.redis`, without a separate probe).

With `CACHE_ENABLED=false` and `RATE_LIMIT_SMART_ENABLED=true`, readiness **checks Redis** via `checks.redis`, not `checks.cache`.

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
