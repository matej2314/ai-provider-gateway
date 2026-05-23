# Architektura katalogów i plików

Ten dokument opisuje **strukturę katalogów i plików** projektu *AI Provider Gateway* (stan zsynchronizowany z repozytorium).

Zasady:

- Struktura jest **modułowa** (NestJS); integracje providerów — `src/providers/`.
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
├── scripts/
│   └── validate-config.ts          # docelowo: npm run config:validate (obecnie placeholder w package.json)
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
│           └── express.d.ts                # Request.requestId
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
    ├── opis_koncepcyjny.md                 # alias → dokumentacja_koncepcyjna.md
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
| **`src/chat/`** | HTTP czat + SSE. **`ChatService`**: cache, smart rate limit (cooldown po 429), `ResilientExecutor`, envelope odpowiedzi. **`ChatProviderCallService`**: wywołania adapterów, metryki, emisja SSE. Helpery: system prompt, provider input, params, retry policy, cache policy, `conversationId`. |
| **`src/providers/`** | Adaptery Anthropic / Google, `ProviderRegistryService` + moduł rejestru. Jedyna warstwa z bezpośrednim użyciem SDK vendorów. |
| **`src/config/`** | Wczytanie `gateway.config.yaml`, walidacja Zod, `buildEffectiveGatewayConfig`, `gatewayKey`, `resolvedSystemPrompts`, obiekty `cache`/`redis` z env. Pliki promptu w `system-prompt/`. |
| **`src/common/resilience/`** | `ResilientExecutor` — retry, timeout, fallback; używany przez `ChatService`. Polityka per alias: `src/chat/helpers/retry-policy.ts` + `retry-policy-defaults.ts`. |
| **`src/common/`** | Filtr błędów, middleware `requestId`, interceptor streamu, mapowanie błędów SDK, dekoratory guardów i OpenAPI (`ApiGatewayChatErrorResponses`, `ApiRequestIdHeader`), typy Express. |
| **`src/cache/`** | Cache odpowiedzi tylko dla **`POST /api/v1/chat`** (`noop` / `redis`). |
| **`src/guards/`**, **`src/rate-limit/`** | `GatewayKeyGuard`, `SmartRateLimitGuard` (może być użyty samodzielnie — wtedy sam weryfikuje `X-Gateway-Key`); `SmartRateLimiterService` + Redis przez `RateLimitModule` → `RedisCacheModule`. |
| **`src/logging/`**, **`src/metrics/`** | Pino / Sentry (opcjonalnie), spany LLM, `conversationId` → Sentry — patrz `conversation-tracking.md`. |
| **`src/health/`** | Liveness i readiness; DTO z dekoratorami `@Api*` dla OpenAPI. |
| **`src/swagger/`** | Generowanie dokumentu OpenAPI z kodu (`@nestjs/swagger`); UI pod `/api/v1/api-docs`, JSON pod `/api/v1/swagger.json`; eksport statyczny → `openapi.json`. |
| **`scripts/`** | Walidacja konfiguracji offline (w przygotowaniu). |
| **`test/`** | Testy e2e Jest. |
| **`docs/`** | Dokumentacja i specyfikacje SDD (`spec/`). |

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

**Pozostałość v1:** `npm run config:validate` (placeholder w `scripts/validate-config.ts`), `src/setup.app.ts` (pusty placeholder), opcjonalnie CORS.

Powiązane: `openapi.json`, `docs/konfiguracja.md`, `docs/dokumentacja_koncepcyjna.md`.
