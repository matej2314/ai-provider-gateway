# Architektura katalogów i plików

Ten dokument opisuje **strukturę katalogów i plików** projektu *AI Provider Gateway* (stan zsynchronizowany z repozytorium).

Zasady:

- Struktura jest **modułowa** (NestJS); adaptery LLM — `src/providers/`; fasady HTTP dla IDE — `src/integrations/`.
- Elementy oznaczone *(plan)* nie istnieją w kodzie lub są poza rdzeniem MVP.
- **Pominięte w drzewie:** `node_modules/`, `dist/`, `.git/`, lokalne `.env` (nie commitować).
- Pliki **`*.spec.ts`** — testy jednostkowe obok modułów; wypisane zbiorczo tam, gdzie występują.
- Pliki **`*.md`** w katalogu głównym poza `README.md` — notatki/plany robocze (poza kontraktem produktu).

---

## 1) Drzewo repozytorium

```
ai-provider-gateway/
├── openapi.json                    # OpenAPI 3.1 (kontrakt HTTP)
├── gateway.config.yaml             # aliasy modeli, providery, polityki
├── package.json
├── package-lock.json
├── README.md
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.mjs
├── .prettierrc
├── .env.example
├── .env                            # lokalnie — nie commitować
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── mcp.json                        # konfiguracja MCP (integracja z IDE; patrz docs/mcp.md)
│
├── bin/                            # entry point CLI (osobny od HTTP app)
│   ├── gateway-cli-wrapper.js      # npm bin — compiled dist/ lub fallback ts-node (bez build)
│   └── gateway-cli.ts              # CommandFactory.run(CliModule)
│
├── scripts/
│   ├── validate-config.ts          # npm run config:validate — walidacja gateway.config.yaml + env offline
│   ├── generate-key.sh             # *(plan)* wrapper generowania klucza (Faza 7)
│   └── generate-key.ps1            # *(plan)* wrapper generowania klucza (Faza 7)
│
├── test/                           # testy e2e (Jest)
│   ├── jest-e2e.json
│   └── app.e2e-spec.ts
│
├── src/
│   ├── main.ts                     # bootstrap NestJS, ValidationPipe, Swagger, graceful shutdown
│   ├── setup.app.ts                # placeholder pod wspólny setup aplikacji (obecnie pusty)
│   ├── instrument.ts               # inicjalizacja Sentry (import przed app)
│   ├── app.module.ts
│   │
│   ├── swagger/
│   │   ├── swagger.constants.ts    # OPENAPI_VERSION, SWAGGER_UI_PATH, OPENAPI_OUTPUT_FILENAME
│   │   ├── swagger.setup.ts        # createOpenApiDocument, setupSwagger (UI + jsonDocumentUrl)
│   │   └── export-openapi.ts       # npm run openapi:export → openapi.json
│   │
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts              # POST /chat
│   │   ├── chat.controller.spec.ts
│   │   ├── chat-stream.controller.ts       # POST /chat/stream (SSE)
│   │   ├── chat-stream.controller.spec.ts
│   │   ├── chat.service.ts                 # cache, limity, ResilientExecutor, odpowiedź gateway
│   │   ├── chat.service.spec.ts
│   │   ├── chat-provider-call.service.ts   # complete/stream, metryki LLM, SSE meta/delta
│   │   ├── dto/
│   │   │   ├── chat-request.dto.ts
│   │   │   ├── chat-params.dto.ts
│   │   │   ├── chat-message.dto.ts
│   │   │   ├── chat-response.dto.ts
│   │   │   ├── chat-output-text.dto.ts
│   │   │   ├── chat-usage.dto.ts
│   │   │   ├── sse-meta-payload.dto.ts
│   │   │   ├── sse-delta-payload.dto.ts
│   │   │   ├── sse-done-payload.dto.ts
│   │   │   └── sse-stream-description.ts
│   │   ├── helpers/
│   │   │   ├── cache-policy.ts
│   │   │   ├── conversation-id.ts
│   │   │   ├── metrics.ts
│   │   │   ├── provider-input.ts
│   │   │   ├── resolve-provider-call-options.ts
│   │   │   ├── resolve-provider-call-options.spec.ts
│   │   │   ├── retry-policy.ts
│   │   │   └── system-prompt.ts
│   │   └── sse/
│   │       ├── sse-event.type.ts
│   │       └── sse.serializer.ts
│   │
│   ├── providers/
│   │   ├── providers.module.ts             # dynamiczna rejestracja adapterów
│   │   ├── provider-registry.module.ts
│   │   ├── provider-registry.service.ts
│   │   ├── provider-registry.service.spec.ts
│   │   ├── interfaces/
│   │   │   └── ai-provider.interface.ts
│   │   ├── anthropic/
│   │   │   ├── anthropic.module.ts
│   │   │   └── anthropic.adapter.ts
│   │   └── google/
│   │       ├── google.module.ts
│   │       └── google.adapter.ts
│   │
│   ├── integrations/                       # fasady OpenAI / Anthropic API → ChatService (wdrożone)
│   │   ├── integrations.module.ts
│   │   ├── integrations.constants.ts       # OPENAI_INTEGRATION_PATH, ANTHROPIC_INTEGRATION_PATH
│   │   ├── openai/
│   │   │   ├── openai.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── openai-chat-completions.controller.ts
│   │   │   │   └── openai-models.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── openai-orchestration.service.ts
│   │   │   │   └── openai-models-catalog.service.ts
│   │   │   ├── mappers/
│   │   │   │   ├── openai-request.mapper.ts
│   │   │   │   ├── openai-response.mapper.ts
│   │   │   │   └── openai-stream.mapper.ts
│   │   │   ├── guards/
│   │   │   │   └── openai-bearer-auth.guard.ts
│   │   │   ├── filters/
│   │   │   │   └── openai-exception.filter.ts
│   │   │   ├── decorators/
│   │   │   │   └── openai-auth.decorator.ts
│   │   │   └── dtos/
│   │   │       ├── openai-chat-message.dto.ts
│   │   │       ├── openai-chat-completion-request.dto.ts
│   │   │       ├── openai-chat-completion-response.dto.ts
│   │   │       └── openai-models-list-response.dto.ts
│   │   └── anthropic/
│   │       ├── anthropic.module.ts
│   │       ├── controllers/
│   │       │   ├── anthropic-messages.controller.ts
│   │       │   └── anthropic-models.controller.ts
│   │       ├── services/
│   │       │   └── anthropic-models-catalog.service.ts
│   │       ├── mappers/
│   │       │   ├── anthropic-request.mapper.ts
│   │       │   ├── anthropic-response.mapper.ts
│   │       │   └── anthropic-stream.mapper.ts
│   │       ├── guards/
│   │       │   └── anthropic-api-key.guard.ts
│   │       ├── filters/
│   │       │   └── anthropic-exception.filter.ts
│   │       ├── decorators/
│   │       │   └── anthropic-auth.decorator.ts
│   │       └── dtos/
│   │           ├── anthropic-content-block.dto.ts
│   │           ├── anthropic-message.dto.ts
│   │           ├── anthropic-messages-request.dto.ts
│   │           ├── anthropic-messages-response.dto.ts
│   │           └── anthropic-models-list-response.dto.ts
│   │
│   ├── cli/                                # CLI developerskie (osobny entry point — patrz bin/)
│   │   ├── cli.module.ts                   # root module CLI — bez ConfigModule
│   │   ├── gateway.command.ts              # root command (welcome + lista komend)
│   │   ├── commands/
│   │   │   ├── config/                     # *(plan)* namespace config:*
│   │   │   ├── provider/                   # *(plan)* namespace provider:*
│   │   │   ├── model/                      # *(plan)* namespace model:*
│   │   │   ├── client/                     # *(plan)* namespace client:*
│   │   │   └── key/                        # *(plan)* namespace key:*
│   │   ├── services/
│   │   │   ├── cli-config-loader.service.ts  # YAML + Zod bez wymagania .env
│   │   │   └── file-manager.service.ts       # backup, read/write YAML i .env
│   │   ├── utils/
│   │   │   ├── cli-logger.util.ts          # kolorowy output (chalk, ora)
│   │   │   └── validation-formatter.util.ts  # format błędów Zod dla terminala
│   │   └── templates/                      # *(plan)* szablony plików (Faza 1+)
│   │
│   ├── config/
│   │   ├── configuration.ts                # gateway.config.yaml + Zod, cache/redis z env
│   │   ├── configuration.types.ts
│   │   ├── configuration.helpers.ts
│   │   ├── env.validation.ts
│   │   ├── provider-types.ts
│   │   └── system-prompt/
│   │       ├── MASTER_SYSTEM_PROMPT.md     # wymagany przy starcie
│   │       ├── MAIN_SYSTEM_PROMPT.md       # opcjonalny
│   │       └── models/
│   │           └── chat-default.md         # przykład per alias (więcej wg YAML)
│   │
│   ├── guards/
│   │   ├── gateway-key.guard.ts
│   │   └── smart-rate-limit-guard.ts
│   │
│   ├── rate-limit/
│   │   ├── rate-limit.module.ts
│   │   └── smart-rate-limiter.service.ts
│   │
│   ├── logging/
│   │   ├── logging.module.ts
│   │   ├── logging.service.ts
│   │   ├── logging.service.spec.ts
│   │   ├── logging.tokens.ts
│   │   ├── interfaces/
│   │   │   └── logger.interface.ts
│   │   └── adapters/
│   │       ├── pino-logger.adapter.ts
│   │       ├── console-logger.adapter.ts
│   │       ├── sentry-error-reporting.adapter.ts
│   │       └── noop-error-reporting.adapter.ts
│   │
│   ├── metrics/
│   │   ├── metrics.module.ts
│   │   ├── metrics.service.ts
│   │   ├── metrics.service.spec.ts
│   │   ├── metrics.tokens.ts
│   │   ├── interfaces/
│   │   │   └── metrics-backend.interface.ts
│   │   └── adapters/
│   │       ├── sentry-metrics.adapter.ts
│   │       └── noop-metrics.adapter.ts
│   │
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   ├── health.controller.spec.ts
│   │   ├── health.service.ts
│   │   ├── health.service.spec.ts
│   │   └── dto/
│   │       ├── health-liveness-response.dto.ts
│   │       ├── health-readiness-response.dto.ts
│   │       └── health-check-item.dto.ts
│   │
│   ├── cache/
│   │   ├── cache.module.ts                 # CacheModule.register({ includeRedisStack })
│   │   ├── cache.tokens.ts
│   │   ├── cache-registry.service.ts
│   │   ├── response-cache.service.ts
│   │   ├── interfaces/
│   │   │   └── cache-backend-interface.ts
│   │   └── adapters/
│   │       ├── noop-cache/
│   │       │   ├── noop-cache.module.ts
│   │       │   └── noop-cache.adapter.ts
│   │       └── redis-cache/
│   │           ├── redis-cache.module.ts
│   │           ├── redis-cache.adapter.ts
│   │           └── redis-connection.service.ts
│   │
│   └── common/
│       ├── readGatewayKeyHeader.ts
│       ├── readClientGatewayKey.ts         # (docelowo) req.gatewayKey lub X-Gateway-Key — smart limit
│       ├── retry-policy-defaults.ts        # domyślne onStatus / maxAttempts / timeoutMs
│       ├── decorators/
│       │   ├── gateway-key-and-smart-rate-limit.decorator.ts
│       │   ├── api-gateway-error-responses.decorator.ts
│       │   └── api-request-id-header.decorator.ts
│       ├── dtos/
│       │   └── error-envelope.dto.ts
│       ├── errors/
│       │   ├── api-error.code.ts
│       │   ├── api-error.dto.ts
│       │   ├── provider-error.mapper.ts
│       │   └── provider-error.mapper.helpers.ts
│       ├── exceptions/
│       │   └── unsupported-provider.exception.ts
│       ├── filters/
│       │   └── http-exception.filter.ts    # GlobalExceptionFilter
│       ├── interceptors/
│       │   └── stream-cleanup.interceptor.ts
│       ├── middleware/
│       │   └── request-id.middleware.ts
│       ├── resilience/
│       │   ├── resilient-executor.ts
│       │   ├── fallback-chain.ts
│       │   ├── is-retryable-http-error.ts
│       │   └── resilience.types.ts
│       └── types/
│           └── express.d.ts                # Request.requestId, Request.gatewayKey (fasady)
│
└── docs/
    ├── README.md
    ├── dokumentacja_koncepcyjna.md
    ├── architektura.md
    ├── architektura_api.md
    ├── architektura-katalogi-pliki.md      # ten plik
    ├── lista_endpointów.md
    ├── dokumentacja_api.md
    ├── conversation-tracking.md
    ├── data_flow.md
    ├── konfiguracja.md
    ├── dictionary.md
    ├── anty-patterny.md
    ├── mcp.md
    ├── integracje.md                       # fasady OpenAI / Anthropic (IDE)
    ├── integracja-openai-kontrakt.md
    ├── integracja-anthropic-messages.md
    ├── opis_koncepcyjny.md                 # alias → dokumentacja_koncepcyjna.md
    ├── CLI.md                              # *(plan, Faza 8)* — dokumentacja komend CLI
    └── spec/
        ├── SPEC-README.md
        ├── SPEC-PLATFORMA-I-KONTRAKTY.md
        ├── SPEC-CHAT.md
        ├── SPEC-CHAT-STREAMING.md
        ├── SPEC-PROVIDERS.md
        ├── SPEC-KONFIGURACJA.md
        └── SPEC-HEALTH.md
```

### Notatki robocze (katalog główny, opcjonalnie)

Poza dokumentacją produktową w `docs/` mogą występować lokalne plany/notatki, np. `PLAN_IMPLEMENTACJI.md`, `*_refactor.md` — nie są częścią kontraktu API ani wdrożenia gatewaya.

---

## 2) Opis katalogów (odpowiedzialności)

| Katalog | Odpowiedzialność |
|---------|------------------|
| **`src/chat/`** | HTTP czat + SSE. **`ChatService`**: cache, smart rate limit (cooldown po 429), `ResilientExecutor`, envelope odpowiedzi. **`ChatProviderCallService`**: wywołania adapterów, metryki, emisja SSE. Eksport **`ChatService`**, **`SmartRateLimitGuard`** dla modułu integracji. Helpery: system prompt, provider input, params, retry policy, cache policy, `conversationId`. |
| **`src/providers/`** | Adaptery Anthropic / Google, `ProviderRegistryService` + moduł rejestru. Jedyna warstwa z bezpośrednim użyciem SDK vendorów. |
| **`src/integrations/`** | Fasady HTTP (OpenAI API, Anthropic Messages API) — mapowanie kontraktu vendora ↔ `ChatRequestDto` / `ChatService`. Bez wywołań SDK; błędy w formacie vendora (lokalne filtry). Szczegóły: `integracje.md`. |
| **`src/config/`** | Wczytanie `gateway.config.yaml`, walidacja Zod, `buildEffectiveGatewayConfig`, `gatewayKey`, `resolvedSystemPrompts`, obiekty `cache`/`redis` z env. Pliki promptu w `system-prompt/`. |
| **`src/common/resilience/`** | `ResilientExecutor` — retry, timeout, fallback; używany przez `ChatService`. Polityka per alias: `src/chat/helpers/retry-policy.ts` + `retry-policy-defaults.ts`. |
| **`src/common/`** | Filtr błędów, middleware `requestId`, interceptor streamu, mapowanie błędów SDK, dekoratory guardów i OpenAPI (`ApiGatewayChatErrorResponses`, `ApiRequestIdHeader`), typy Express. |
| **`src/cache/`** | Cache odpowiedzi tylko dla **`POST /api/v1/chat`** (`noop` / `redis`). |
| **`src/guards/`**, **`src/rate-limit/`** | `GatewayKeyGuard`, `SmartRateLimitGuard` (może być użyty samodzielnie — wtedy sam weryfikuje `X-Gateway-Key`); `SmartRateLimiterService` + Redis przez `RateLimitModule` → `RedisCacheModule`. |
| **`src/logging/`**, **`src/metrics/`** | Pino / Sentry (opcjonalnie), spany LLM, `conversationId` → Sentry — patrz `conversation-tracking.md`. |
| **`src/health/`** | Liveness i readiness; DTO z dekoratorami `@Api*` dla OpenAPI. |
| **`src/swagger/`** | Generowanie dokumentu OpenAPI z kodu (`@nestjs/swagger`); UI pod `/api/v1/api-docs`, JSON pod `/api/v1/swagger.json`; eksport statyczny → `openapi.json`. |
| **`bin/`** | Entry point CLI: wrapper JS (`gateway-cli-wrapper.js`) uruchamia skompilowany `dist/bin/gateway-cli.js` lub — gdy brak build — TypeScript przez `ts-node` (`gateway-cli.ts` → `CliModule`). Dostęp: `npm run cli`, bin `gateway-cli` z `package.json`. |
| **`src/cli/`** | Warstwa CLI: **nie importuje** `ConfigModule` (działa przed/pełnej konfiguracji). NestJS tylko dla DI. **`CliConfigLoaderService`** reużywa `GatewayConfigSchema` z `src/config/`, pomija `buildEffectiveGatewayConfig()`. **`FileManagerService`** — operacje na plikach YAML/env. Komendy namespace (`config:*`, `model:*`, …) — *(plan)*, katalogi placeholder w `commands/`. Szczegóły: `architektura.md`. |
| **`scripts/`** | Walidacja konfiguracji offline (`npm run config:validate`); *(plan)* skrypty generowania klucza (`generate-key.sh` / `.ps1`). |
| **`test/`** | Testy e2e Jest. |
| **`docs/`** | Dokumentacja i specyfikacje SDD (`spec/`). |

---

## 2a) CLI — izolacja runtime (Faza 0)

CLI to **osobna warstwa** z własnym entry pointem, niezależna od bootstrapu HTTP (`src/main.ts` → `AppModule`):

| Zasada | Opis |
|--------|------|
| **Bez `ConfigModule`** | `CliModule` nie importuje `ConfigModule.forRoot()` — unika deadlocku (CLI tworzy config, którego runtime wymaga przy starcie). |
| **Bez wymogu build** | Wrapper w `bin/` uruchamia TypeScript przez `ts-node`, gdy brak `dist/` — CLI dostępne po `npm install`. |
| **Kierunek zależności** | Dozwolone: `src/config/*` → `src/cli/*` (typy, schematy Zod). Zabronione odwrotnie — CLI nie modyfikuje logiki runtime. |
| **Ładowanie configu** | `CliConfigLoaderService.loadRawConfig()` — parsowanie YAML + `GatewayConfigSchema`; **bez** rozwiązywania env (`buildEffectiveGatewayConfig`, `assertMasterKeyPresent`). Pełna walidacja runtime — dopiero w komendach wizarda / `config:validate` *(plan)*. |
| **Konwencja komend** | `gateway <namespace>:<action>` (np. `gateway config:init`); root command (`gateway`) wyświetla welcome i listę planowanych komend. |

Uruchomienie:

```bash
npm run cli              # lokalnie
npm link && gateway-cli  # po linku (bin: gateway-cli)
```

`tsconfig.build.json` uwzględnia `bin/**/*` — build produkuje `dist/bin/gateway-cli.js` (szybszy start CLI).

---

## 3) Stan wdrożenia vs dokumentacja

**Wdrożone w kodzie** (porównuj z `openapi.json` i `src/`):

- Config z YAML (`gateway.config.yaml` w repo: aliasy `chat-default`, `claude-sonnet`, `gemini-flash`; klienci `webapp`, `ide-plugin`), registry, adaptery Anthropic + Google.
- Czat standard + SSE, `params`, retry/fallback/`effectiveModelAlias` (`ResilientExecutor`).
- Error envelope (`GlobalExceptionFilter`), kody **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`** (`api-error.code.ts`).
- `RequestIdMiddleware` — body + nagłówek odpowiedzi **`x-request-id`**.
- Gateway key + smart rate limit (`@GatewayKeyAndSmartRateLimit()`).
- System prompt z plików, cache (`noop`/`redis`), logging/metrics (Pino, Sentry), readiness (`checks.config`, `checks.cache`), graceful shutdown.
- OpenAPI/Swagger: dekoratory `@nestjs/swagger` na kontrolerach i DTO, `src/swagger/`, eksport `npm run openapi:export` → `openapi.json`.
- **Integracje IDE:** `src/integrations/` — fasady OpenAI i Anthropic (`IntegrationsModule` w `AppModule`), `Request.gatewayKey`, eksporty z `ChatModule`; trasy `/api/v1/openai/…` i `/api/v1/anthropic/…` (`integracje.md`, `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`).
- **CLI (Faza 0 — infrastruktura):** `bin/gateway-cli-wrapper.js`, `src/cli/` (`CliModule`, `GatewayCommand`, `CliConfigLoaderService`, `FileManagerService`, utilities). Root command z listą komend; namespace commands w `commands/` — *(plan, Fazy 1–7)*. Dokumentacja architektury: sekcja 2a powyżej, `architektura.md`.

**Pozostałość v1:** `src/setup.app.ts` (pusty placeholder), opcjonalnie CORS; dokończenie fasad OpenAI / Anthropic (`readClientGatewayKey`, kontrolery, mappery); **CLI** — wizard, komendy namespace, `docs/CLI.md` *(plan, Faza 8)*.

Powiązane: `openapi.json`, `docs/konfiguracja.md`, `docs/dokumentacja_koncepcyjna.md`.
