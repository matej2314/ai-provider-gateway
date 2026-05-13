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
│   │   └── gateway-key.guard.ts
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
│   ├── common/                     # współdzielone artefakty brzegowe
│   │   ├── dtos/
│   │   │   └── error-envelope.dto.ts
│   │   ├── errors/                 # kody błędów API, DTO błędów, mapowanie provider → HTTP
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts   # GlobalExceptionFilter (global)
│   │   ├── interceptors/
│   │   │   └── request-id.interceptor.ts  # RequestIdInterceptor (global)
│   │   └── types/
│   │       └── express.d.ts        # augmentacja: Request.requestId: string
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

- **`src/chat/`**: HTTP dla czatu standardowego i streamingu (`chat-stream.controller.ts`, SSE). Orkiestracja przez `ChatService` i rejestr providerów; podkatalog `sse/` (serializer zdarzeń).
- **`src/providers/`**: adaptery Anthropic / Google i `ProviderRegistryService`. Jedyna warstwa bezpośrednio używająca SDK vendorów.
- **`src/config/`**: `configuration.ts` — wczytanie `gateway.config.yaml`, walidacja Zod, złożenie `gatewayKey`, `resolvedSystemPrompts`, `providers`, obiektów **`cache`** / **`redis`** z env; `configuration.types.ts` / `configuration.helpers.ts`; `env.validation.ts` — reguły env (klucze API w production, opcjonalnie **`CACHE_*`** / **`REDIS_*`**).
- **`src/health/`**: liveness (`GET /api/v1/health`). Readiness jako osobny endpoint/service *(plan / rozszerzenie)*.
- **`src/cache/`**: warstwa cache odpowiedzi dla **`POST /api/v1/chat`** (nie dotyczy streamingu). Rejestr backendów (`CacheRegistryService`), implementacje **`noop`** (zawsze) i **`redis`** (gdy `AppModule` załaduje stos Redis — patrz `konfiguracja.md`), `ResponseCacheService` używany w `ChatService`.
- **`src/common/`**: współdzielone artefakty brzegowe — **`filters/http-exception.filter.ts`** (`GlobalExceptionFilter`), **`interceptors/request-id.interceptor.ts`** (`RequestIdInterceptor`), **`dtos/error-envelope.dto.ts`**, kody i mapowanie błędów w **`errors/`**. Podpięte globalnie w `src/main.ts` (filtry i interceptory).
- **`src/guards/gateway-key.guard.ts`**: weryfikacja nagłówka **`X-Gateway-Key`** względem allowlisty z konfiguracji — używany na kontrolerach czatu (`@UseGuards(GatewayKeyGuard)`). Rozszerzenia mappingu kodów błędów dla wszystkich przypadków domenowych — **Faza 5** (`dokumentacja_koncepcyjna.md`, `dokumentacja_api.md`).
- **`src/common/types/express.d.ts`**: augmentacja `Express.Request` o `requestId: string` dla kontrolerów i filtrów.
- **Testy jednostkowe**: obok kodu, np. `src/**/*.spec.ts`.
- **`docs/`**: dokumentacja oraz specyfikacje SDD.

---

## 3) Stan wdrożenia vs dokumentacja

**Zamknięte lub częściowo zamknięte** (porównuj z kodem i `openapi.json`):

- Fundament: config z YAML, registry, adaptery Anthropic + Google.
- Error envelope `ErrorEnvelope` (`GlobalExceptionFilter` global) i propagacja `x-request-id` z requestu do `requestId` w body (`RequestIdInterceptor` global); system prompt składany z plików w `src/config/system-prompt/`; **cache odpowiedzi czatu standardowego** (`src/cache/`) — podstawowa implementacja (`noop` / `redis`).
- W toku / kolejne fazy: pełne wykorzystanie policy z YAML w adapterach, działający `npm run config:validate`, rozszerzenie mappingu kodów i limity DTO/body (**Faza 5** — `dokumentacja_koncepcyjna.md`, `dokumentacja_api.md`). **Cache odpowiedzi** jest wdrożony dla czatu standardowego; dalsze elementy (limity, metryki na Redis itd.) — `dokumentacja_koncepcyjna.md`.

Powiązane: `openapi.json`, `docs/konfiguracja.md`, `docs/dokumentacja_koncepcyjna.md`.
