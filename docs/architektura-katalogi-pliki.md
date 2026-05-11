# Architektura katalogów i plików

Ten dokument opisuje **strukturę katalogów i plików** projektu *AI Provider Gateway*.

Zasady:

- Struktura jest **modułowa** (NestJS), a integracje providerów są w `src/providers/`.
- Elementy oznaczone *(plan)* pochodzą z `PLAN_IMPLEMENTACJI.md` / specyfikacji i nie mają jeszcze pełnej implementacji.

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
│   │   ├── configuration.ts       # load gateway.config.yaml + Zod
│   │   ├── env.validation.ts
│   │   └── system-prompt/        # MASTER / MAIN / models/<alias>.md — składanie system promptu (configuration.ts + ChatService)
│   │
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   └── health.service.ts
│   │
│   ├── common/                     # współdzielone artefakty brzegowe
│   │   ├── dtos/
│   │   │   └── error-envelope.dto.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts   # GlobalExceptionFilter (global)
│   │   └── interceptors/
│   │       └── request-id.interceptor.ts  # RequestIdInterceptor (global)
│   │
│   └── types/
│       └── express.d.ts            # augmentacja: Request.requestId: string
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
├── PLAN_IMPLEMENTACJI.md
├── SYSTEM_PROMPTS_REFACTOR-READY.md
├── REDIS_IMPLEMENTATION_PLAN.md
├── README.md
└── mcp.json *(plan — konfiguracja MCP użytkownika; patrz docs/mcp.md)*
```

---

## 2) Opis katalogów (odpowiedzialności)

- **`src/chat/`**: HTTP dla czatu standardowego i streamingu (`chat-stream.controller.ts`, SSE). Orkiestracja przez `ChatService` i rejestr providerów; podkatalog `sse/` (serializer zdarzeń).
- **`src/providers/`**: adaptery Anthropic / Google i `ProviderRegistryService`. Jedyna warstwa bezpośrednio używająca SDK vendorów.
- **`src/config/`**: `configuration.ts` — wczytanie `gateway.config.yaml` i walidacja Zod; `env.validation.ts` — reguły env (m.in. klucze API w production).
- **`src/health/`**: liveness (`GET /api/v1/health`). Readiness jako osobny endpoint/service *(plan / rozszerzenie)*.
- **`src/common/`**: współdzielone artefakty brzegowe — **`filters/http-exception.filter.ts`** (`GlobalExceptionFilter` z mappingiem statusu HTTP na `code` i envelope `ErrorEnvelope`), **`interceptors/request-id.interceptor.ts`** (`RequestIdInterceptor` ustawiający `request.requestId` z nagłówka `x-request-id` lub generowany `req_<uuid>`), **`dtos/error-envelope.dto.ts`** (kształt envelope). Wszystkie podpięte globalnie w `src/main.ts`. Rozszerzenia mappingu kodów oraz dodatkowe filtry/interceptory (np. `X-Gateway-Key` guard) — kolejne kroki w **Fazie 5** (`PLAN_IMPLEMENTACJI.md`).
- **`src/types/`**: augmentacja typów innych pakietów; `express.d.ts` dodaje `requestId: string` do `Express.Request`, żeby `req.requestId` było typowane w kontrolerach i filtrach.
- **Testy jednostkowe**: obok kodu, np. `src/**/*.spec.ts`.
- **`docs/`**: dokumentacja oraz specyfikacje SDD.

---

## 3) Powiązanie z planem implementacji

Zamknięte lub częściowo zamknięte (śledź tabele statusów w `PLAN_IMPLEMENTACJI.md`):

- Fundament: config z YAML, registry, adaptery Anthropic + Google.
- Już w kodzie (poza zamknięciem MVP): error envelope `ErrorEnvelope` (`GlobalExceptionFilter` global) i propagacja `x-request-id` z requestu do `requestId` w body (`RequestIdInterceptor` global); refaktor promptów serwerowych — ✅ wg `SYSTEM_PROMPTS_REFACTOR-READY.md`.
- W toku / kolejne fazy: pełne wykorzystanie policy z YAML w adapterach, działający `npm run config:validate`, gateway key `X-Gateway-Key`, rozszerzenie mappingu kodów i limity DTO/body (Faza 5); opcjonalny cache/Redis — `REDIS_IMPLEMENTATION_PLAN.md`.

Powiązane: `PLAN_IMPLEMENTACJI.md`, `REDIS_IMPLEMENTATION_PLAN.md`, `openapi.json`, `docs/konfiguracja.md`.
