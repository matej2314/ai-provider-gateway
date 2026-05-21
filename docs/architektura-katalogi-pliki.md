# Architektura katalogów i plików

Ten dokument opisuje **strukturę katalogów i plików** projektu *AI Provider Gateway*.

Zasady:

- Struktura jest **modułowa** (NestJS), a integracje providerów są w `src/providers/`.
- Elementy oznaczone *(plan)* pochodzą ze specyfikacji w `docs/spec/` i mogą wyprzedzać pełną implementację.

---

## 1) Drzewo repozytorium (wysoki poziom)

```
ai-provider-gateway/
├── openapi.json
├── gateway.config.yaml
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts
│   │   ├── chat-stream.controller.ts    # POST …/chat/stream (SSE)
│   │   ├── chat.service.ts
│   │   ├── dto/
│   │   │   ├── chat-request.dto.ts
│   │   │   └── chat-message.dto.ts
│   │   └── sse/
│   │       ├── sse-event.type.ts        # SseMetaEvent / SseDeltaEvent / SseDoneEvent
│   │       └── sse.serializer.ts        # `event: <name>\ndata: <json>\n\n`
│   │
│   ├── providers/
│   │   ├── providers.module.ts
│   │   ├── provider-registry.service.ts
│   │   ├── interfaces/
│   │   │   └── ai-provider.interface.ts
│   │   ├── anthropic/
│   │   │   ├── anthropic.module.ts
│   │   │   └── anthropic.adapter.ts
│   │   ├── google/
│   │   │   ├── google.module.ts
│   │   │   └── google.adapter.ts
│   │   └── openai/ *(plan — poza rdzeniem MVP / v1+)*
│   │
│   ├── config/
│   │   ├── configuration.ts       # load gateway.config.yaml + Zod; cache/redis w obiekcie config
│   │   ├── configuration.types.ts
│   │   ├── configuration.helpers.ts
│   │   ├── env.validation.ts
│   │   └── system-prompt/        # MASTER / MAIN / models/<alias>.md — składanie system promptu (configuration.ts + ChatService)
│   │
│   ├── guards/
│   │   ├── gateway-key.guard.ts
│   │   └── smart-rate-limit-guard.ts
│   ├── rate-limit/
│   │   ├── rate-limit.module.ts
│   │   └── smart-rate-limiter.service.ts
│   ├── logging/
│   │   ├── logging.module.ts
│   │   ├── logging.service.ts
│   │   └── adapters/          # pino, console, sentry error reporting
│   ├── metrics/
│   │   ├── metrics.module.ts
│   │   ├── metrics.service.ts
│   │   └── adapters/          # sentry, noop
│   ├── instrument.ts            # inicjalizacja Sentry (import w main.ts)
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   └── health.service.ts
│   │
│   ├── cache/                      # opcjonalny cache odpowiedzi (tylko POST …/chat standardowy)
│   │   ├── cache.module.ts         # CacheModule.register({ includeRedisStack }) — globalny moduł dynamiczny
│   │   ├── cache.tokens.ts
│   │   ├── cache-registry.service.ts
│   │   ├── response-cache.service.ts
│   │   ├── interfaces/
│   │   │   └── cache-backend-interface.ts
│   │   └── adapters/
│   │       ├── noop-cache/         # backend domyślny — brak zapisu/odczytu
│   │       └── redis-cache/        # ioredis — ładowany gdy CACHE_ENABLED=true i CACHE_BACKEND=redis
│   │
│   ├── common/
│   │   ├── dtos/
│   │   │   └── error-envelope.dto.ts
│   │   ├── decorators/
│   │   │   └── gateway-key-and-smart-rate-limit.decorator.ts
│   │   ├── errors/                 # api-error.code, provider-error.mapper
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts   # GlobalExceptionFilter (APP_FILTER)
│   │   ├── interceptors/
│   │   │   └── stream-cleanup.interceptor.ts
│   │   ├── middleware/
│   │   │   └── request-id.middleware.ts
│   │   ├── readGatewayKeyHeader.ts
│   │   └── types/
│   │       └── express.d.ts
│
├── test/                           # e2e (gdy rozbudowane)
├── docs/
│   ├── README.md
│   ├── dokumentacja_koncepcyjna.md
│   ├── architektura.md
│   ├── architektura_api.md
│   ├── lista_endpointów.md
│   ├── dokumentacja_api.md
│   ├── data_flow.md
│   ├── konfiguracja.md
│   ├── mcp.md
│   ├── dictionary.md
│   ├── anty-patterny.md
│   ├── architektura-katalogi-pliki.md
│   ├── opis_koncepcyjny.md
│   └── spec/
│       ├── SPEC-README.md
│       ├── SPEC-PLATFORMA-I-KONTRAKTY.md
│       ├── SPEC-CHAT.md
│       ├── SPEC-CHAT-STREAMING.md
│       ├── SPEC-PROVIDERS.md
│       ├── SPEC-KONFIGURACJA.md
│       └── SPEC-HEALTH.md
│
├── .env.example
├── .env *(lokalnie, nie commitować)*
├── docker-compose.yml *(jeśli obecny)*
├── package.json
├── README.md
└── mcp.json *(plan — konfiguracja MCP użytkownika; patrz docs/mcp.md)*
```

---

## 2) Opis katalogów (odpowiedzialności)

- **`src/chat/`**: HTTP dla czatu standardowego i streamingu (`chat-stream.controller.ts`, SSE). DTO (`chat-request.dto.ts`, `chat-params.dto.ts`, `chat-message.dto.ts`), `helpers/resolve-provider-call-options.ts`, orkiestracja `ChatService`, podkatalog `sse/` (serializer zdarzeń).
- **`src/providers/`**: adaptery Anthropic / Google i `ProviderRegistryService`. Jedyna warstwa bezpośrednio używająca SDK vendorów.
- **`src/config/`**: `configuration.ts` — wczytanie `gateway.config.yaml`, walidacja Zod (`GatewayConfigSchema`: m.in. jeden `type` per provider, spójność `providers` ↔ `models`), `buildEffectiveGatewayConfig` (filtr `enabled`, klucze API, aktywne modele), złożenie `gatewayKey`, `resolvedSystemPrompts`, `providers`, obiektów **`cache`** / **`redis`** z env; `configuration.types.ts` / `configuration.helpers.ts`; `env.validation.ts` — reguły env (klucze API w production, opcjonalnie **`CACHE_*`** / **`REDIS_*`**).
- **`src/health/`**: liveness (`GET /api/v1/health`) i readiness (`GET /api/v1/health/ready`).
- **`src/rate-limit/`**: smart rate limiting per klucz gateway (Redis token bucket, równoległe streamy, cooldown po 429).
- **`src/logging/`**, **`src/metrics/`**: Pino + spany LLM (Sentry/noop). `conversationId` z body → `gen_ai.conversation.id`; `messages[]` → input/output messages (gdy `SENTRY_INCLUDE_PROMPTS`). Response: echo lub `conv_*` (`conversation-tracking.md`).
- **`src/cache/`**: warstwa cache odpowiedzi dla **`POST /api/v1/chat`** (nie dotyczy streamingu). Rejestr backendów (`CacheRegistryService`), implementacje **`noop`** (zawsze) i **`redis`** (gdy `AppModule` załaduje stos Redis — patrz `konfiguracja.md`), `ResponseCacheService` używany w `ChatService`.
- **`src/common/resilience/`**: `ResilientExecutor` (retry, timeout, fallback chain), `fallback-chain.ts`, `is-retryable-http-error.ts`, `retry-policy-defaults.ts` — używane w `ChatService`.
- **`src/common/`**: `GlobalExceptionFilter` (APP_FILTER w `AppModule`), **`RequestIdMiddleware`** (wszystkie trasy), `StreamCleanupInterceptor` (streaming), `provider-error.mapper.ts`, dekorator **`@GatewayKeyAndSmartRateLimit()``.
- **`src/guards/`**: `GatewayKeyGuard` (allowlista kluczy), `SmartRateLimitGuard` (limity per klucz gdy `RATE_LIMIT_SMART_ENABLED`).
- **`src/common/types/express.d.ts`**: augmentacja `Express.Request` o `requestId: string` dla kontrolerów i filtrów.
- **Testy jednostkowe**: obok kodu, np. `src/**/*.spec.ts`.
- **`docs/`**: dokumentacja oraz specyfikacje SDD.

---

## 3) Stan wdrożenia vs dokumentacja

**Zamknięte lub częściowo zamknięte** (porównuj z kodem i `openapi.json`):

- Fundament: config z YAML, registry, adaptery Anthropic + Google.
- Error envelope, `RequestIdMiddleware`, gateway key + smart rate limit, mapowanie błędów SDK, system prompt z plików, cache (`noop`/`redis`), logging/metrics (w tym `conversationId` → Sentry), readiness, graceful shutdown (`main.ts`).
- Odporność: `ResilientExecutor` — retry/timeout/fallback z YAML (`effectiveModelAlias` w odpowiedzi).
- W toku (**Faza 5+**): `npm run config:validate`, pełny katalog aliasów modeli (dokończenie 5.6), response header `x-request-id`.
- **Wdrożone (params):** `src/chat/dto/chat-params.dto.ts`, `src/chat/helpers/resolve-provider-call-options.ts`, merge w `ChatService` + klucz cache w `ResponseCacheService`.

Powiązane: `openapi.json`, `docs/konfiguracja.md`, `docs/dokumentacja_koncepcyjna.md`.
