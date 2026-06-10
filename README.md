# AI Provider Gateway (NestJS)

Gateway HTTP dla LLM, który **ukrywa SDK providerów** i wystawia spójny kontrakt do:

- standardowego czatu (`POST /api/v1/chat`),
- streamingu SSE (`POST /api/v1/chat/stream`),
- healthchecka (`GET /api/v1/health`, `GET /api/v1/health/ready`),
- odporności (retry, timeout, opcjonalny fallback aliasu z `gateway.config.yaml`) — **`ResilientExecutor`**.

Aktualnie wspierani providerzy:

- **Anthropic** (`@anthropic-ai/sdk`)
- **Google Gemini** (`@google/genai`)

## Dokumentacja

Wejście od strony dokumentów: [`docs/README.md`](docs/README.md).

| Temat                       | Plik                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Kontrakt HTTP (OpenAPI 3.1) | [`openapi.json`](openapi.json) — natywny czat + health + fasady OpenAI/Anthropic; generowany: `npm run openapi:export` |
| Swagger UI (runtime)        | `http://localhost:3000/api/v1/api-docs` — JSON: `/api/v1/swagger.json` (`SWAGGER_ENABLED`); tagi: Health, Chat, OpenAI API, Anthropic API |
| API (ludzki opis)           | [`docs/dokumentacja_api.md`](docs/dokumentacja_api.md)                                     |
| Konfiguracja env + YAML     | [`docs/konfiguracja.md`](docs/konfiguracja.md)                                             |
| Kody błędów                 | [`docs/dictionary.md`](docs/dictionary.md)                                                 |
| Architektura                | [`docs/architektura.md`](docs/architektura.md)                                             |
| Struktura katalogów         | [`docs/architektura-katalogi-pliki.md`](docs/architektura-katalogi-pliki.md)               |
| Fasada OpenAI (Cursor IDE)  | [`docs/integracja-openai-kontrakt.md`](docs/integracja-openai-kontrakt.md)                  |
| Architektura fasad IDE      | [`docs/integracje.md`](docs/integracje.md)                                                  |
| Gateway CLI                 | [`docs/CLI.md`](docs/CLI.md)                                                                |

## Integracje API

Gateway wystawia równoległe kontrakty HTTP nad tym samym `ChatService`:

| Standard | Endpointy | Dokumentacja | Dla |
|----------|-----------|--------------|-----|
| **Natywny** | `/api/v1/chat`, `/api/v1/chat/stream` | [`docs/dokumentacja_api.md`](docs/dokumentacja_api.md) | Własne aplikacje |
| **OpenAI API** | `/api/v1/openai/models`, `/api/v1/openai/chat/completions` | [`docs/integracja-openai-kontrakt.md`](docs/integracja-openai-kontrakt.md) | Cursor IDE |
| **Anthropic Messages API** | `/api/v1/anthropic/messages`, `/api/v1/anthropic/models` | [`docs/integracja-anthropic-messages.md`](docs/integracja-anthropic-messages.md) | Claude Code |

**Autoryzacja:** ta sama allowlista (`GATEWAY_KEY_*` z `.env`), różne nagłówki:

- Natywny: `X-Gateway-Key`
- OpenAI: `Authorization: Bearer` — Base URL: `.../api/v1/openai`
- Anthropic: `x-api-key` (lub Bearer) — Base URL: `.../api/v1/anthropic`

## Szybki start (lokalnie)

Wymagania: Node.js + npm.

1. Instalacja:

```bash
npm install
```

2. Konfiguracja (wymagane po sklonowaniu — repozytorium zawiera przykładowy [`gateway.config.yaml`](gateway.config.yaml); uzupełnij `.env` kluczami providerów i gateway):

```bash
npm run cli config:init
# lub: npx gateway config:init
```

Wizard generuje lub nadpisuje `gateway.config.yaml`, `.env`, `.env.example` oraz pliki system prompt (szablony w `src/cli/templates/`). Wykrywa też konfigurację boilerplate (`isBoilerplateConfig()` — ID/nazwy z `placeholder` / `PLACEHOLDER`). Alternatywnie: ręcznie skopiuj [`.env.example`](.env.example) i uzupełnij YAML — szczegóły: [`docs/konfiguracja.md`](docs/konfiguracja.md).

Zweryfikuj konfigurację:

```bash
npm run cli config:validate
# alternatywa: npm run config:validate
```

W **`NODE_ENV=production`** przy starcie wymagany jest **co najmniej jeden** niepusty klucz providera (po `trim()`). W development start nie jest blokowany — nadal potrzebujesz klucza dla używanego providera.

**Uwaga:** Przed pierwszym uruchomieniem uzupełnij `.env` (klucze providerów + `MASTER_KEY` / `GATEWAY_KEY_*`) albo uruchom `npm run cli config:init`. Bez poprawnego YAML i env start aplikacji kończy się błędem walidacji.

3. Uruchomienie:

```bash
npm run start:dev
```

Domyślnie: `http://localhost:3000`, prefiks API: `/api/v1` ([`src/main.ts`](src/main.ts)).

## Endpointy (przykłady)

Wszystkie odpowiedzi (w tym health) zwracają nagłówek **`x-request-id`** (echo żądania lub `req_<uuid>`) — [`RequestIdMiddleware`](src/common/middleware/request-id.middleware.ts).

### Health (bez `X-Gateway-Key`)

```bash
curl -i http://localhost:3000/api/v1/health
curl -i http://localhost:3000/api/v1/health/ready
```

Readiness: HTTP zawsze **200** — sprawdzaj `body.status` (`ready` / `not_ready`). Pola w `checks`: **`config`**, **`cache`** (nie `redis`).

### Chat (wymaga `X-Gateway-Key`)

```bash
curl -i -X POST "http://localhost:3000/api/v1/chat" ^
  -H "content-type: application/json" ^
  -H "X-Gateway-Key: YOUR_GATEWAY_KEY" ^
  -d "{\"modelAlias\":\"chat-default\",\"messages\":[{\"role\":\"user\",\"content\":\"Napisz krótkie streszczenie.\"}]}"
```

Opcjonalnie w body: **`params`** (`temperature`, `maxOutputTokens`), **`conversationId`** (`conv_<uuid>`) — [`docs/dokumentacja_api.md`](docs/dokumentacja_api.md).

### Streaming SSE

```bash
curl -i -X POST "http://localhost:3000/api/v1/chat/stream" ^
  -H "content-type: application/json" ^
  -H "X-Gateway-Key: YOUR_GATEWAY_KEY" ^
  -d "{\"modelAlias\":\"chat-default\",\"messages\":[{\"role\":\"user\",\"content\":\"Powiedz coś krótko.\"}]}" ^
  --no-buffer
```

## Auth i limity

- **Auth:** nagłówek **`X-Gateway-Key`** — allowlista z `gateway.config.yaml` + env ([`docs/konfiguracja.md`](docs/konfiguracja.md)).
- **Smart rate limit** (opcjonalnie): `RATE_LIMIT_SMART_ENABLED=true` + Redis — [`src/rate-limit/`](src/rate-limit/). Kody **429**: **`RATE_LIMITED`** (gateway) vs **`PROVIDER_RATE_LIMITED`** (upstream) — [`docs/dictionary.md`](docs/dictionary.md).
- **Cooldown** po 429 od providera — tylko `POST /api/v1/chat`, nie streaming.

## Cache odpowiedzi

Opcjonalny cache tylko dla **`POST /api/v1/chat`** (`CACHE_ENABLED`, `CACHE_BACKEND=redis`) — [`src/cache/`](src/cache/). Pomijany dla żądań z toolingiem. Odpowiedź może zawierać `cached: true`, `cachedAt`.

## System prompt i tool calling

Rola **`system`** w `messages[]` jest zablokowana — instrukcja systemowa jest składana po stronie serwera z [`src/config/system-prompt/`](src/config/system-prompt/) (`composeSystemPrompt`).

W `messages[]` dozwolone są role **`user`**, **`assistant`** i **`tool`** (wynik wywołania narzędzia — wymaga `toolCallId`). Asystent może zwracać **`toolCalls`** w odpowiedzi. Opcjonalne pole **`tooling`** w body (`definitions`, `toolChoice`) włącza function calling — wymaga `capabilities.tools: true` dla aliasu w YAML; inaczej **`400`** + **`TOOLS_NOT_SUPPORTED`**.

Odpowiedź JSON / SSE `done` może zawierać **`toolCalls`**, **`finishReason`** (`stop` | `tool_calls` | `length` | `content_filter`). Cache i fallback YAML są **wyłączone** dla żądań z toolingiem w czacie standardowym; streaming nadal używa fallbacku z YAML.

Szczegóły: [`docs/dokumentacja_api.md`](docs/dokumentacja_api.md), [`docs/architektura.md`](docs/architektura.md).

## Struktura kodu

| Warstwa                    | Lokalizacja                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Orkiestracja czatu         | [`ChatService`](src/chat/chat.service.ts)                                                                                                       |
| Wywołania providerów + SSE | [`ChatProviderCallService`](src/chat/chat-provider-call.service.ts)                                                                             |
| Adaptery LLM + tool mappers | [`src/providers/`](src/providers/) (`anthropic-tools.mapper.ts`, `google-tools.mapper.ts`)                                                   |
| Błędy / `requestId`        | [`GlobalExceptionFilter`](src/common/filters/http-exception.filter.ts), [`RequestIdMiddleware`](src/common/middleware/request-id.middleware.ts) |

Pełne drzewo: [`docs/architektura-katalogi-pliki.md`](docs/architektura-katalogi-pliki.md).

## Gateway CLI

Osobny entry point od serwera HTTP — działa **bez build** (ts-node), bin: `gateway`.

```bash
npm run cli                              # welcome + lista komend
npm run cli config:init                  # wizard konfiguracji (pierwsze uruchomienie)
npm run cli config:validate              # walidacja YAML + env
npm run cli config:show                  # podgląd sparsowanego YAML

npm run cli provider:list                # lista instancji providerów
npm run cli provider:test                # test połączeń SDK (opcjonalnie: [instanceId] lub --provider)
npm run cli provider:add                 # dodaj instancję providera (interaktywnie)
npm run cli provider:edit <instanceId>   # włącz/wyłącz lub rotacja klucza API
npm run cli provider:remove <instanceId> # usuń instancję, modele i klucz z .env

npm run cli model:list                   # lista aliasów modeli
npm run cli model:add                    # dodaj alias (interaktywnie)
npm run cli model:edit <alias>           # edycja pól modelu
npm run cli model:remove <alias>         # usuń alias z YAML

npm run cli client:list                  # lista klientów gateway
npm run cli client:add                   # dodaj klienta (interaktywnie)
npm run cli client:edit <clientId>       # edycja klienta / rotacja klucza
npm run cli client:remove <clientId>     # usuń klienta

npm run cli key:generate -- --type master
npm run cli key:generate -- --type client --client-id webapp
```

Mutacje YAML tworzą backup w katalogu `backup/` (ignorowany przez git). Pełna dokumentacja komend: [`docs/CLI.md`](docs/CLI.md).

## Skrypty

```bash
npm run start:dev       # development
npm run build
npm run start:prod      # po build
npm run openapi:export  # openapi.json z dekoratorów @nestjs/swagger
npm run cli             # Gateway CLI (alias: npx gateway)
npm run config:validate # walidacja offline (scripts/validate-config.ts)
npm test
npm run test:e2e
```
