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
│   │   └── dto/
│   │       └── chat-request.dto.ts
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
│   │   └── openai/ *(plan — post-MVP)*
│   │
│   ├── config/
│   │   ├── configuration.ts       # load gateway.config.yaml + Zod
│   │   ├── env.validation.ts
│   │   └── system-prompt/        # MASTER / MAIN / models/<alias>.md — składanie system promptu (configuration.ts + ChatService)
│   │
│   └── health/
│       ├── health.module.ts
│       ├── health.controller.ts
│       └── health.service.ts
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
├── README.md
└── mcp.json *(plan — konfiguracja MCP użytkownika; patrz docs/mcp.md)*
```

---

## 2) Opis katalogów (odpowiedzialności)

- **`src/chat/`**: HTTP dla czatu standardowego i streamingu (`chat-stream.controller.ts`, SSE). Orkiestracja przez `ChatService` i rejestr providerów; podkatalog `sse/` (serializer zdarzeń).
- **`src/providers/`**: adaptery Anthropic / Google i `ProviderRegistryService`. Jedyna warstwa bezpośrednio używająca SDK vendorów.
- **`src/config/`**: `configuration.ts` — wczytanie `gateway.config.yaml` i walidacja Zod; `env.validation.ts` — reguły env (m.in. klucze API w production).
- **`src/health/`**: liveness (`GET /api/v1/health`). Readiness jako osobny endpoint/service *(plan / rozszerzenie)*.
- **`src/common/`** *(plan pod Fazę 5 i dalej)*: współdzielone filtry (envelope błędów), interceptory `request-id`, mapowanie kodów — **obecnie brak tego katalogu** w repo.
- **Testy jednostkowe**: obok kodu, np. `src/**/*.spec.ts`.
- **`docs/`**: dokumentacja oraz specyfikacje SDD.

---

## 3) Powiązanie z planem implementacji

Zamknięte lub częściowo zamknięte (śledź tabele statusów w `PLAN_IMPLEMENTACJI.md`):

- Fundament: config z YAML, registry, adaptery Anthropic + Google.
- W toku / kolejne fazy: pełne wykorzystanie policy z YAML w adapterach, spójny error envelope + `x-request-id`, działający `npm run config:validate`; plan promptów serwerowych: `SYSTEM_PROMPTS_REFACTOR.md`.

Powiązane: `PLAN_IMPLEMENTACJI.md`, `openapi.json`, `docs/konfiguracja.md`.
