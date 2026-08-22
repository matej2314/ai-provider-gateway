# Conceptual documentation — AI Provider Gateway

## Product purpose

AI Provider Gateway is a backend API that acts as an **intermediary layer (gateway/proxy)** between client applications and various LLM (Large Language Model) providers.

Key value:

- **Plug&play**: the user configures keys and models, then uses a single, stable API.
- **Contract unification**: consistent request/response independent of the provider.
- **Resilience and operability**: timeouts, retry, error normalization, requestId, observability.

The project is a **working NestJS microservice** — an exercise in architecture and design patterns, and at the same time ready to run in the user’s infrastructure.

## Who the system is for

| Segment | Need |
|---------|----------|
| **User (developer / team)** | Quickly run the gateway locally or in their own infrastructure; use their own keys for **Anthropic, Google, and OpenAI** (runtime providers); use the **OpenAI** / **Anthropic** official contract facades (Cursor, Claude Code, and other clients that expect those HTTP shapes); have a predictable API. |
| **Integrator / platform team** | Standardize LLM integration across the organization, wire limits, logs, requestId, retry and timeout policies. |
| **Operations / DevOps** | Static, simple deployment; configuration via env + files; health checks; logs on stdout. |
| **Recruiter / reviewer** | Clone the repository and review the code (portfolio) — without forking or sending a PR. |

## Repository model (open source, no upstream contributions)

The repository is **public** and licensed under **MIT**, but **it is not a community-driven project**:

- **Allowed:** `git clone`, fork to your own GitHub, modifications and deploy on your own infrastructure, use of the code under MIT.
- **Not allowed / not accepted:** pull requests and other attempts to merge changes into **upstream** (the author’s original repository) by third parties.
- **Own development:** fork the repository and maintain changes only in **your copy** — upstream remains under the maintainer’s control.

This model does not restrict product usage — it only restricts co-authoring code in the original remote. Summary: [`README.md`](../README.md) (“Distribution” section), [`README.md`](README.md) (“Distribution and contributions” section).

## Product scope

The description below defines product scope as understood in this repository. HTTP contract: **[`openapi.json`](../openapi.json)** and `api-documentation.md`.

**First run:** fill in `.env` and `gateway.config.yaml`, or run `gateway config:init` before starting the server (details: `configuration.md`, `command_line_interface.md`).

- **Product:** The core covers routing, chat, and streaming. The operational layer adds file-based configuration, observability, polish, deploy, and official contract facades (OpenAI + Anthropic Messages API). Further vendor-contract alignment — optional extensions.
- **Providers:** Anthropic API, Google Gemini API, OpenAI API, and `openai-compatible` (e.g. Ollama).
- **Chat:** synchronous `POST /api/v1/chat` and SSE streaming `POST /api/v1/chat/stream`.

## Product features (summary)

| Feature | Scope |
|----------------|--------|
| Native API (`/chat`, `/chat/stream`) | Routing, JSON and SSE |
| OpenAI facade (official OpenAI API contract) | `/api/v1/openai/*` — IDEs and other clients |
| Anthropic facade (official Anthropic Messages contract) | `/api/v1/anthropic/*` — IDEs and other clients |
| Tool calling | Tool definitions and invocations in chat |
| Extended thinking (reasoning models) | Thinking / reasoning parameters |
| Response caching (Redis) | Response cache for `POST /chat` |
| Smart rate limiting | Limits per client key |

**Summary:** The listed features are part of the product. Architecture and integrations: `architecture.md`, `integrations.md`, `testing.md`.

### Functional scope (summary)

- **Standard chat endpoint** `POST /api/v1/chat` — optionally **response cache** (`src/cache/`, read validation `CachedChatResponseSchema`, env — `configuration.md`).
- **Streaming** (`POST /api/v1/chat/stream`, SSE) — `ErrorEnvelope` envelope. **Gateway key** + optional **smart rate limit** (`@GatewayKeyAndSmartRateLimit()`; codes **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`** — `dictionary.md`). **Readiness**, **logging/metrics** (Pino, Sentry), **graceful shutdown**. **`params` in body**, **`timeoutMs` / `retry` policy + fallback**, **response header `x-request-id`**. **OpenAPI / Swagger** — `@nestjs/swagger` decorators on chat, health, and official contract facades; one [`openapi.json`](../openapi.json) (tags Health, Chat, OpenAI API, Anthropic API); export `npm run openapi:export`, UI `/api/v1/api-docs`. **Official contract facades** (`src/integrations/`) — `IntegrationsModule`; routes `/api/v1/openai/…`, `/api/v1/anthropic/…` (`integrations.md`). **Offline configuration validation:** `npm run config:validate` and **`gateway config:validate`** (`configuration.md`). **CLI** — `config:init` wizard + commands for managing config, providers, models, clients, SDK tests, `key:generate` (`command_line_interface.md`).
- **Official contract facades** — module `src/integrations/` (OpenAI API contract and Anthropic Messages contract — for IDEs and other clients that expect those shapes); shared engine `ChatService` — see `integrations.md`.
- **Providers** Anthropic, Google Gemini, and OpenAI (`openai`, `openai-compatible`) — SDK factories, bootstrap per `providerInstance` and registry.
- **File-based configuration** (`gateway.config.yaml`) — load and validate at startup. Extended graph validation `providers` ↔ `models` (fail-fast) — `configuration.md`, `pl/spec/SPEC-KONFIGURACJA.md` (F-3b, F-3c).
- API keys in `.env` under **`apiKeyRef`** from YAML (per enabled provider instance) — `configuration.md`.
- Policy from YAML: **`params`** in `resolveProviderCallOptions`; **`timeoutMs` / `retry` / `fallback`** in `ResilientExecutor` with in-flight cancellation via **`AbortSignal`** (`api-documentation.md`, `configuration.md`); fail-fast when the configuration file is missing or invalid.
- Consistent error format (**`ErrorEnvelope` envelope**) — `GlobalExceptionFilter`. **`requestId`**: propagation in body, logs, and **response header** `x-request-id` (`RequestIdMiddleware`). SDK error mapping (`provider-error.mapper.ts`) for Anthropic/Google/OpenAI (`PROVIDER_*`); gateway limits — **`RATE_LIMITED`** (`SmartRateLimitGuard`: RPS/streams; cooldown: `prepareRequestForExecution` + `ChatErrorHandlerService`).
- Unit tests next to modules (`src/**/*.spec.ts`, `npm test`).
- HTTP E2E tests (`test/e2e/`, `npm run test:e2e`, `npm run test:all`) — native chat contract (including cache, stream), OpenAI/Anthropic facades (including tooling, thinking) with mocked providers — **`testing.md`**.
- HTTP security tests (`test/security/`, `npm run test:security`) — auth bypass, Helmet, information disclosure, rate limit, property-based fuzzing — **`testing.md`**; in production deploy: `npm run deploy:production`.

## Out of product scope

- End-user authorization (AuthN/AuthZ) — the gateway is a tool for the user’s infrastructure.
- Billing / settlements — costs are borne by the user via their own keys.
- Conversation history storage (persistence).
- Own MCP “tool runner” (tool execution) — outside core scope; the gateway does not run MCP servers or tools on the server side.

## Main assumptions

### 1) Gateway, not an “open proxy”

- Anthropic and Google provider endpoints are **hard-coded** in SDK factories (`src/providers/factories/`). Types **`openai`** / **`openai-compatible`** use a configurable **`baseUrlRef`** in env (validated http(s) URL — e.g. api.openai.com, Ollama); details: `provider-openai-runtime.md`, `configuration.md`.
- Configuration does not allow arbitrary URL/headers in a way that would turn the service into a generic HTTP proxy.

### 2) Models as aliases (preferred)

Instead of forcing clients to supply a vendor `modelId`, the gateway supports **model aliases** (e.g. `chat-default`, `chat-fast`), mapped to:

- provider (instance),
- exact `modelId`,
- policies and limits.

### 3) Two execution modes: standard and streaming

- Standard: response returned as JSON in a single payload.
- Streaming: response as an event stream (SSE) matching the gateway contract (not necessarily 1:1 with the provider format).

### 4) Edge validation

- Request bodies validated in DTOs.
- Env and file configuration validated at startup.

### 5) Testability

- Provider/model selection logic and parameter mapping are testable without real provider calls.
- Provider adapters can be mocked (unit and E2E — `testing.md`).

## Three API surfaces

| Client | Contract | Example routes |
|--------|----------|-------------------|
| Application / BFF | Native gateway | `POST /api/v1/chat`, `POST /api/v1/chat/stream` |
| Cursor IDE | OpenAI-compatible | `GET/POST /api/v1/openai/…` |
| Claude Code | Anthropic Messages | `GET/POST /api/v1/anthropic/…` |

All three delegate to **`ChatService`** (one engine: cache, retry, fallback, limits). Details: `integrations.md`.

### HTTP surface vs LLM engine

The gateway separates the **official contract facade** (HTTP contract shape for clients expecting OpenAI / Anthropic APIs) from the **runtime provider** (SDK adapter in `src/providers/`). An OpenAI or Anthropic facade **does not guarantee** that the LLM call goes to the same vendor — routing is purely configuration-driven (`modelAlias` → `providerInstance` in YAML).

| Surface | HTTP contract format | LLM backend (SDK call) |
|--------------|----------------------|----------------------------|
| Native `/api/v1/chat` | Gateway contract (`modelAlias`, `messages`, `params`) | Adapter indicated by the alias in YAML (any enabled `providerInstance`) |
| OpenAI facade `/api/v1/openai/*` | Official OpenAI Chat Completions API shape (IDEs and other clients, e.g. Cursor) | **Not** api.openai.com by facade definition — same `ChatService` engine; backend from YAML |
| Anthropic facade `/api/v1/anthropic/*` | Official Anthropic Messages API shape (IDEs and other clients, e.g. Claude Code) | **Not** Anthropic API by facade definition — backend from YAML (e.g. Anthropic, Google, …) |

The `model` field on facades = `modelAlias` from `gateway.config.yaml` (not the vendor `modelId`). Auth on facades: **gateway client** key (Bearer / `x-api-key`), not the vendor key.

Details: `integrations.md`, `dictionary.md` (“Facade vs provider runtime” section), `openai-contract-integration.md`, `anthropic-messages-integration.md`.
