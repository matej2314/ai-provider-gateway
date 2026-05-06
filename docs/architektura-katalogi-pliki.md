# Architektura katalogów i plików

Ten dokument opisuje **strukturę katalogów i plików** projektu *AI Provider Gateway*.

Zasady:

- Struktura jest **modułowa** (NestJS), a integracje providerów są w `src/providers/`.
- Dokument zawiera **aktualne elementy repo** oraz **planowane** (oznaczone jako *(plan)*), potrzebne do osiągnięcia docelowego “plug&play” (konfig plikami, dwa endpointy: standard + streaming).

---

## 1) Drzewo repozytorium (wysoki poziom)

```
ai-provider-gateway/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   ├── dto/
│   │   │   ├── chat-request.dto.ts
│   │   │   └── chat-message.dto.ts
│   │   └── (streaming) *(plan)*:
│   │       ├── chat-stream.controller.ts *(plan, jeśli rozdzielisz kontrolery)*
│   │       └── sse/
│   │           ├── sse-event.type.ts *(plan)*
│   │           └── sse.serializer.ts *(plan)*
│   │
│   ├── providers/
│   │   ├── providers.module.ts
│   │   ├── provider-registry.service.ts
│   │   ├── interfaces/
│   │   │   └── ai-provider.interface.ts
│   │   ├── anthropic/
│   │   │   ├── anthropic.module.ts
│   │   │   └── anthropic.provider.ts
│   │   ├── google/
│   │   │   ├── google.module.ts
│   │   │   └── google.provider.ts
│   │   └── openai/ *(plan - wymaga płatnego API)*:
│   │       ├── openai.module.ts *(plan)*
│   │       └── openai.provider.ts *(plan)*
│   │
│   ├── config/
│   │   ├── configuration.ts
│   │   └── env.validation.ts
│   │
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   └── (ready) *(plan)*:
│   │       ├── health.service.ts *(plan)*
│   │       └── readiness.controller.ts *(plan lub rozbudowa health.controller.ts)*
│   │
│   └── common/
│       ├── enums/
│       │   └── ai-provider.enum.ts
│       ├── exceptions/
│       │   └── unsupported-provider.exception.ts
│       └── (obsługa błędów) *(plan)*:
│           ├── errors/
│           │   ├── api-error.code.ts *(plan)*
│           │   ├── api-error.dto.ts *(plan)*
│           │   └── provider-error.mapper.ts *(plan)*
│           ├── interceptors/
│           │   └── request-id.interceptor.ts *(plan)*
│           └── filters/
│               └── http-exception.filter.ts *(plan)*
│
├── test/
│   ├── chat.service.spec.ts
│   └── provider-registry.spec.ts
│
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
├── docker-compose.yml
├── package.json
├── README.md
└── (konfiguracja plug&play) *(plan)*:
    ├── gateway.config.yaml *(plan: plik modeli/aliasów/polityk)*
    └── mcp.json *(plan: konfiguracja MCP użytkownika)*
```

---

## 2) Opis katalogów (odpowiedzialności)

- **`src/chat/`**: warstwa przypadków użycia “chat” (standard i streaming), walidacja wejścia (DTO), delegacja do providerów, unifikacja formatu odpowiedzi.
- **`src/providers/`**: adaptery providerów i rejestr. Jedyny fragment kodu, który “zna” SDK providerów.
- **`src/config/`**: konfiguracja i walidacja env + (docelowo) wczytanie oraz walidacja plików configu modeli/polityk.
- **`src/health/`**: healthchecki (liveness, docelowo readiness związany z konfiguracją).
- **`src/common/`**: elementy współdzielone (enumy, wyjątki, mapowanie błędów, requestId, filtry/interceptory).
- **`test/`**: testy jednostkowe modułów (bez prawdziwych wywołań do providerów).
- **`docs/`**: dokumentacja architektury, kontraktów API i specyfikacje SDD.

---

## 3) Pliki “planowane” — minimalny zestaw do docelowego plug&play

Te pliki są rekomendowane do domknięcia założeń “skonfiguruj i używaj”:

- **`gateway.config.yaml`** *(plan)*: definicje provider instances, aliasy modeli, capabilities (streaming), policy (timeout/retry), allowlista parametrów + bounds.
- **`mcp.json`** *(plan)*: konfiguracja MCP użytkownika (sposób użycia opisany w `docs/mcp.md`).
- **`src/common/errors/*`** *(plan)*: spójne `code` błędów i mapowanie wyjątków providerów do envelope API.
- **`src/common/interceptors/request-id.interceptor.ts`** *(plan)*: generowanie/propagacja requestId.

