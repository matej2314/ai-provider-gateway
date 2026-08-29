# Testing — AI Provider Gateway

Document version: **2.3** (synced with `package.json`, `test/`, and `src/**/*.spec.ts`).

## Overview

| Layer                             | Location                                           | Runner                                                | npm script                 |
| ----------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | -------------------------- |
| **Unit (runtime)**           | `src/**/*.spec.ts` (next to modules; **excluding** `src/cli/`) | Jest (`rootDir: src`, `testPathIgnorePatterns: cli/`) | `npm test`                 |
| **Unit (CLI)**               | `src/cli/**/*.spec.ts`                                | Jest (`test/jest-cli.json`)                           | `npm run test:cli`         |
| **E2E (HTTP, mocks)**               | `test/e2e/*.e2e-spec.ts`                              | Jest (`test/jest-e2e.json`)                           | `npm run test:e2e`         |
| **Security (HTTP, mocks)**          | `test/security/*.security-spec.ts`                    | Jest (`test/jest-security.json`)                      | `npm run test:security`    |
| **Integration (live SDK + Redis)** | `test/integration/*.integration-spec.ts`              | Jest (`test/jest-integration.json`)                   | `npm run test:integration` |
| **Runtime + E2E**                   | —                                                     | `npm test` + `npm run test:e2e`                       | `npm run test:all`         |

**Test counts (from last run):**

| Script                    | Suites | Cases |
| ------------------------- | ------- | --------- |
| `npm test`                | 92      | 1248      |
| `npm run test:cli`        | 12      | 62        |
| `npm run test:e2e`        | 10      | 105       |
| `npm run test:security`   | 5       | 51        |

Integration tests require Docker (Redis) and `.env.test` — see `test/integration/README.md`.

Additional scripts from `package.json`:

- `npm run test:watch` — runtime unit tests in watch mode
- `npm run test:cli:watch` — CLI unit tests in watch mode
- `npm run test:cov` — runtime code coverage (`coverage/`; CLI excluded from `collectCoverageFrom`)
- `npm run test:debug` — debug runtime unit tests (Node inspect)
- `npm run test:security:watch` — security in watch mode (`maxWorkers: 1`)
- `npm run test:security:ci` — security with `--ci` and coverage (`coverage-security/`)
- `npm run test:integration:redis:up` / `:down` — test Redis container (port **6380**, DB **15**)
- `npm run test:integration:semantic` — vector integration on Redis Stack (port **6381**); starts/stops `docker-compose.redis-stack.yml`; fake embedding (no Ollama)
- `npm run test:integration:semantic:redis:up` / `:down` — Redis Stack container only for semantic vector tests
- `npm run deploy:production` — `test:security` + `docker:build` + `docker:up:full`

**Unit, E2E, and security tests do not require** a running HTTP server, Redis, or provider API keys — E2E and security bootstrap the NestJS app in the test process with infrastructure mocks.

## Unit tests — runtime (`src/`, excluding CLI)

Config: `"jest"` section in `package.json` (`testRegex: .*\.spec\.ts$`, `rootDir: src`, `testPathIgnorePatterns: ["<rootDir>/cli/"]`).

### Coverage areas

| Module / area                   | Sample files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chat**                         | `chat.service.spec.ts`, `chat.controller.spec.ts`, `chat-stream.controller.spec.ts`, `services/chat-cache-pipeline.service.spec.ts`, `chat-validation.service.spec.ts`, `chat-error-handler.service.spec.ts`, `chat-provider-call.service.spec.ts`, `chat-response-builder.service.spec.ts`, `validation/chat-ingress.validator.spec.ts`, `helpers/*.spec.ts` (incl. `map-provider-finish-reason`, `provider-input`, `generation-warnings`, `cache-policy`, `tooling-request`, `retry-policy`), `sse/sse.serializer.spec.ts` |
| **Models**                       | `models/controllers/models.controller.spec.ts`, `models/services/gateway-models-catalog.service.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Config**                       | `config-validator.spec.ts`, `configuration-validation.service.spec.ts`, `provider-api-key.validation.spec.ts`, `provider-base-url.validation.spec.ts`, `provider-types.openai.spec.ts`                                                                                                                                                                                                                                                                                                                                    |
| **Providers**                    | `provider-registry.service.spec.ts`, `factories/create-*-provider*.spec.ts`, `openai/**/*.spec.ts` (adapters `chat-completions` / `responses`, mappers, `openai-api-surface.models.ts`, `create-openai-provider.core.spec.ts`), `anthropic/anthropic-*.mapper.spec.ts`, `google/google-tools.mapper.spec.ts`                                                                                                                                                                                                              |
| **Cache (exact)**                | `cache-registry.service.spec.ts`, `response-cache.service.spec.ts`, `should-include-redis-stack.spec.ts`, `noop` / `redis` adapters                                                                                                                                                                                                                                                                                                                                                                                       |
| **Cache (semantic — Faza 2)**    | `src/cache/semantic/**/*.spec.ts` — fake `EmbeddingBackend` (constant vector) + fake `VectorStore`; scenarios: similarity threshold 0.85, skip tooling / `unknown` clientId / no last user message / **multi-turn history**, vector reuse on SET, no `embed` retry when lookup already attempted, first `embed` on store when not attempted, partition filter by alias+client+`systemSignature`+`callParams` (miss when params or prompt signature differ), fail-open on embedding error, exact key includes `clientId` (isolation regression) |
| **Rate limit**                   | `smart-rate-limiter.service.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Guards**                       | `gateway-key.guard.spec.ts`, `openai-bearer-auth.guard.spec.ts`, `anthropic-api-key.guard.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Facades** (`src/integrations/`) | facade controllers, error filters, model mappers (`openai-models.mapper`, `anthropic-models.mapper`), chat mappers (incl. `anthropic-stop-reason`, `anthropic-usage.mapper`)                                                                                                                                                                                                                                                                                                                                                |
| **Resilience** (`src/chat/resilience/`) | `resilient-executor.spec.ts`, `fallback-chain.spec.ts`, `is-retryable-http-error.spec.ts`; policy: `helpers/retry-policy.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                  |
| **Errors**                        | `provider-error.mapper.spec.ts`, `provider-error-mapper.helpers.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Health / logging / observability** | `health.*.spec.ts`, `logging.service.spec.ts`, `observability/app-metrics/*.spec.ts`, `observability/ai-metrics/*.spec.ts`, `pre-metrics-scrape.registry.spec.ts` |
| **Shared**                      | `common/types/branded.spec.ts` (brand utilities — target 100% coverage), `readGatewayKeyHeader.spec.ts` |
| Shared mocks          | `src/common/mocks/` — `createMockContext.ts`, `createTestGatewayConfig.ts`, `createMockConfigService.ts`, `createMockResilientExecutor.ts`, `test-constants.ts` (branded types in fixtures) |

Shared E2E/integration constants with branded types: `test/e2e/helpers/e2e-constants.ts`, `e2e-gateway-config.ts`, `e2e-provider-registry.ts`; `test/integration/helpers/integration-constants.ts`, `integration-gateway-config.ts`.

## Unit tests — CLI (`src/cli/`)

Config: `test/jest-cli.json` — `roots: ["<rootDir>/../src/cli"]`.

| Area               | Sample files                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config / persistence | `services/config-persistence.service.spec.ts`, `services/cli-config-loader.service.spec.ts`, `services/file-manager.service.spec.ts`                                                                                                                                                              |
| Utils                | `utils/default-model-policy.util.spec.ts`, `utils/effective-config-preview.util.spec.ts`, `utils/client-rate-limit.util.spec.ts`, `utils/api-key-validation.util.spec.ts`, `utils/provider-base-url.cli.util.spec.ts`, `utils/provider-id.util.spec.ts` |
| Schemas / keys     | `schemas/wizard-state.schema.spec.ts`, `services/key-generator.service.spec.ts`                                                                                                                                                                                                                   |

## E2E tests (`test/e2e/`)

Config: `test/jest-e2e.json` — `testRegex: .e2e-spec.ts$`, `setupFiles: e2e/setup/e2e-env.setup.ts` (`SEMANTIC_CACHE_ENABLED=false` by default), `setupFilesAfterEnv: e2e/setup/jest-e2e.setup.ts`.

### Spec files

Naming convention: `*-facade*.e2e-spec.ts` = **HTTP facade** test (`src/integrations/`), not an SDK adapter (`src/providers/`). Runtime adapters are mocked via `e2e-provider-registry.ts`.

| File                                        | Scope                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `gateway-chat.e2e-spec.ts`                  | Native chat: `POST /api/v1/chat`, `POST /api/v1/chat/stream`, generation warnings                                            |
| `gateway-chat-stream-scenarios.e2e-spec.ts` | SSE: headers, events, fallback in stream, concurrent stream limits, `warnings` in `done`                              |
| `gateway-chat-cache.e2e-spec.ts`            | Exact response cache for `POST /api/v1/chat` (mock cache backend), `warnings` persistence                                           |
| `gateway-chat-semantic-cache.e2e-spec.ts`   | Semantic cache HTTP path: fake embedding + in-memory vector store; miss→hit; tooling bypass; negative: different params / multi-turn → no semantic hit (no Redis Stack / Ollama) |
| `native-models.e2e-spec.ts`                 | Native catalog: `GET /models`, auth, `ErrorEnvelope` 404, alias parity with facades                                          |
| `facade-models.e2e-spec.ts`                 | OpenAI and Anthropic facade model catalogs (`GET /openai/models`, `GET /anthropic/models`) — auth, list shape, multiple aliases |
| `openai-facade.e2e-spec.ts`                 | OpenAI facade: auth, response shape, streaming                                                                            |
| `openai-facade-extended.e2e-spec.ts`        | OpenAI facade: tool calling, extended contract scenarios                                                                |
| `gateway-chat-openai.e2e-spec.ts`           | Native chat with `providerType: openai` mock: warnings, surface/thinking validation, streaming                                |
| `anthropic-facade.e2e-spec.ts`              | Anthropic facade: auth, response shape, streaming                                                                         |
| `anthropic-facade-extended.e2e-spec.ts`     | Anthropic facade: thinking mode, tool calling                                                                                 |

### E2E infrastructure

**`helpers/create-e2e-app.ts`** — `createE2eApp()` / `withE2eApp()`:

- `Test.createTestingModule({ imports: [AppModule] })` + `setupApp(app)`.
- Option **`applyHelmet: true`** — `helmet()` before `setupApp()` (same order as `src/main.ts`; used in header security tests).
- **Overrides** (no Redis / no real SDKs): `ConfigService`, `ProviderRegistryService`, `RedisConnectionService` (mock with `ping()` and `isReady()` — required by health warm-up at startup), `ProviderInstancesBootstrap`, `LoggingService`; optionally `SmartRateLimiterService`.

**`helpers/e2e-provider-registry.ts`** — mock `AIProvider` per alias; fallback variant; `providerType: openai` support.

**`setup/jest-e2e.setup.ts`** — mock `uuid`, replace `src/config/configuration` with `mock-configuration.ts`.

### HTTP codes in E2E (201 vs 200)

| Path                                | Mode           | Expected success in tests |
| -------------------------------------- | -------------- | --------------------------- |
| `GET /api/v1/models`                   | JSON           | **200**                     |
| `GET /api/v1/models/:modelAlias`       | JSON           | **200**                     |
| `GET /api/v1/openai/models`            | JSON           | **200**                     |
| `GET /api/v1/anthropic/models`         | JSON           | **200**                     |
| `POST /api/v1/chat`                    | JSON           | **201**                     |
| `POST /api/v1/chat/stream`             | SSE            | **200**                     |
| `POST /api/v1/openai/chat/completions` | JSON           | **201**                     |
| `POST /api/v1/openai/chat/completions` | `stream: true` | **200**                     |
| `POST /api/v1/anthropic/messages`      | JSON           | **201**                     |
| `POST /api/v1/anthropic/messages`      | `stream: true` | **200**                     |

## Integration tests (`test/integration/`)

Separate runner — **not** included in `npm test`, `npm run test:cli`, or `npm run test:all`.

| Requirement | Description                                                                                                                                                                                                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker    | `npm run test:integration:redis:up` — Redis on host **6380**, DB **15**                                                                                                                                                                                                                                                                                      |
| Env       | `.env.test` (template: `.env.test.example`) — `INTEGRATION_ANTHROPIC_API_KEY` / `INTEGRATION_GOOGLE_API_KEY`, optionally `INTEGRATION_OPENAI_API_KEY` + `INTEGRATION_OPENAI_BASE_URL`, `INTEGRATION_OLLAMA_API_KEY` + `INTEGRATION_OLLAMA_BASE_URL`, `INTEGRATION_DEEPSEEK_API_KEY` + `INTEGRATION_DEEPSEEK_BASE_URL`, `MASTER_KEY`, `INTEGRATION_GATEWAY_KEY` |

**What is real vs mock** (summary):

| Real                                      | Mock                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Redis, provider factories, registry, bootstrap | Gateway graph (`integration-mock-configuration.ts`), `ConfigService`, `LoggingService` |

Spec files (`test/integration/*.integration-spec.ts`, **15** suites):

| File                                                     | Scope                            |
| -------------------------------------------------------- | --------------------------------- |
| `gateway-chat-live.integration-spec.ts`                  | Native chat (live SDK)           |
| `gateway-chat-stream-live.integration-spec.ts`           | Native SSE (live)                |
| `gateway-chat-alias.integration-spec.ts`                 | Alias routing                   |
| `gateway-chat-cache-redis.integration-spec.ts`           | Cache + Redis                     |
| `gateway-chat-cache-tooling.integration-spec.ts`         | Cache + tooling                   |
| `gateway-semantic-cache.integration-spec.ts`             | Semantic KNN on Redis Stack (port **6381**; run via `npm run test:integration:semantic`); incl. miss on different params / multi-turn |
| `gateway-chat-openai-live.integration-spec.ts`           | Native chat with OpenAI adapter   |
| `gateway-chat-openai-stream-live.integration-spec.ts`    | Native stream with OpenAI adapter |
| `gateway-openai-compatible.integration-spec.ts`          | openai-compatible adapter (live)  |
| `openai-provider-harness-smoke.integration-spec.ts`      | OpenAI provider smoke harness    |
| `openai-facade-live.integration-spec.ts`                 | OpenAI facade (Anthropic backend) |
| `openai-facade-stream-live.integration-spec.ts`          | OpenAI facade stream              |
| `openai-facade-openai-provider-live.integration-spec.ts` | OpenAI facade + OpenAI adapter    |
| `anthropic-facade-live.integration-spec.ts`              | Anthropic facade (JSON)           |
| `anthropic-facade-stream-live.integration-spec.ts`       | Anthropic facade stream           |
| `harness-smoke.integration-spec.ts`                      | Smoke harness (general)            |

Setup details: **`test/integration/README.md`**.

**Semantic cache integration (Faza 4):** vector integration tests run against Redis Stack (`test/integration/docker-compose.redis-stack.yml`, host port **6381**), **not** the alpine Redis in `test/integration/docker-compose.redis.yml`. Runner: `npm run test:integration:semantic` (pre/post bring the Stack container up/down). The embedding service (Ollama) is **stubbed** with a constant-vector fake — no live Ollama is needed in CI. Spec skips unless `SEMANTIC_CACHE_ENABLED=true` and `REDIS_PORT=6381`. Exact-cache KV and rate-limit tests continue to use the alpine Redis.

## Security tests (`test/security/`)

Config: `test/jest-security.json` — `testMatch: **/*.security-spec.ts`, `roots: test/security`, `maxWorkers: 1`, `setupFilesAfterEnv: test/e2e/setup/jest-e2e.setup.ts`, coverage → `coverage-security/`.

This layer verifies **HTTP hardening** (auth, headers, disclosure, rate limit, resilience to bad input) without live SDK and Redis. Bootstrap via **`helpers/create-security-app.ts`** — thin wrapper over `createE2eApp` / `withE2eApp` with the same mock overrides.

| File | Scope |
| ---- | ------ |
| `auth-bypass.security-spec.ts` | Auth bypass attempts: array injection in headers, case variants, trim, empty values, Bearer/`x-api-key` on facades, health without key |
| `helmet-headers.security-spec.ts` | Helmet headers (`x-frame-options`, `x-content-type-options`, HSTS), no `x-powered-by`, no CSP/COEP (disabled in `main.ts`), consistency on health/chat/404/metrics |
| `information-disclosure.security-spec.ts` | No secret/stack-trace leakage in error bodies and headers (native + facades); helper `scan-response-for-secrets.ts` |
| `rate-limit-bypass.security-spec.ts` | Smart rate limit: burst, concurrent streams, client key isolation, health outside the limit |
| `fuzzing-inputs.security-spec.ts` | Property-based (`fast-check`): random `modelAlias`, `messages`, JSON fields — no **5xx**, no disclosure on **4xx** |

**What security tests do not cover:** live Redis, real provider SDKs, full `configuration.ts` chain from disk (like E2E — mock in setup).

## What E2E tests do not cover

- Real Anthropic / Google / OpenAI API calls (SDKs mocked).
- **Real** Redis (connection mock; E2E cache uses a mock backend).
- Full `configuration.ts` chain with a YAML file on disk (mock in setup).
- Health endpoints — unit coverage in `src/health/`.
- Native extended thinking with **live** OpenAI API (coverage: unit `responses.adapter.spec.ts`, E2E mock `gateway-chat-openai.e2e-spec.ts`, integration `*openai*integration-spec.ts` when keys are set).
- `warnings` field on OpenAI / Anthropic facades (native chat only).

## CI / locally

```bash
npm test                  # runtime unit
npm run test:cli          # CLI unit
npm run test:e2e          # E2E HTTP
npm run test:security     # security HTTP (auth, helmet, fuzzing, disclosure)
npm run test:all          # runtime + E2E
npm run test:integration  # live (Docker + .env.test)
npm run test:cov          # runtime coverage
npm run deploy:production # test:security + build + docker:up:full
```

Provider env vars and a running Redis are not required for `npm test`, `npm run test:cli`, `npm run test:e2e`, or `npm run test:security`.

Related: `project.structure.md` (`test/` tree), `architecture.md`, `command_line_interface.md` (CLI tests).
