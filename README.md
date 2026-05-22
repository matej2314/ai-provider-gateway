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

| Temat                       | Plik                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| Kontrakt HTTP (OpenAPI 3.1) | [`openapi.json`](openapi.json) — Swagger UI: `http://localhost:3000/api-docs` |
| API (ludzki opis)           | [`docs/dokumentacja_api.md`](docs/dokumentacja_api.md)                        |
| Konfiguracja env + YAML     | [`docs/konfiguracja.md`](docs/konfiguracja.md)                                |
| Kody błędów                 | [`docs/dictionary.md`](docs/dictionary.md)                                    |
| Architektura                | [`docs/architektura.md`](docs/architektura.md)                                |

## Szybki start (lokalnie)

Wymagania: Node.js + npm, plik [`gateway.config.yaml`](gateway.config.yaml) w katalogu roboczym.

1. Instalacja:

```bash
npm install
```

2. Konfiguracja env (szablon: [`.env.example`](.env.example)):

```bash
copy .env.example .env
```

Uzupełnij m.in. `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY`, `MASTER_KEY`, klucze klientów (`GATEWAY_KEY_*`). W **`NODE_ENV=production`** przy starcie wymagany jest **co najmniej jeden** niepusty klucz providera (po `trim()`). W development start nie jest blokowany — nadal potrzebujesz klucza dla używanego providera.

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

- **Auth:** nagłówek **`X-Gateway-Key`** — allowlista z [`gateway.config.yaml`](gateway.config.yaml) + env ([`docs/konfiguracja.md`](docs/konfiguracja.md)).
- **Smart rate limit** (opcjonalnie): `RATE_LIMIT_SMART_ENABLED=true` + Redis — [`src/rate-limit/`](src/rate-limit/). Kody **429**: **`RATE_LIMITED`** (gateway) vs **`PROVIDER_RATE_LIMITED`** (upstream) — [`docs/dictionary.md`](docs/dictionary.md).
- **Cooldown** po 429 od providera — tylko `POST /api/v1/chat`, nie streaming.

## Cache odpowiedzi

Opcjonalny cache tylko dla **`POST /api/v1/chat`** (`CACHE_ENABLED`, `CACHE_BACKEND=redis`) — [`src/cache/`](src/cache/). Odpowiedź może zawierać `cached: true`, `cachedAt`.

## System prompt

W `messages[]` dozwolone są wyłącznie role **`user`** i **`assistant`**. Instrukcja systemowa jest składana po stronie serwera z [`src/config/system-prompt/`](src/config/system-prompt/) — szczegóły: [`docs/architektura.md`](docs/architektura.md).

## Struktura kodu

| Warstwa                    | Lokalizacja                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Orkiestracja czatu         | [`ChatService`](src/chat/chat.service.ts)                                                                                                       |
| Wywołania providerów + SSE | [`ChatProviderCallService`](src/chat/chat-provider-call.service.ts)                                                                             |
| Adaptery LLM               | [`src/providers/`](src/providers/)                                                                                                              |
| Błędy / `requestId`        | [`GlobalExceptionFilter`](src/common/filters/http-exception.filter.ts), [`RequestIdMiddleware`](src/common/middleware/request-id.middleware.ts) |

Pełne drzewo: [`docs/architektura-katalogi-pliki.md`](docs/architektura-katalogi-pliki.md).

## Skrypty

```bash
npm run start:dev    # development
npm run build
npm run start:prod   # po build
npm run config:validate  # placeholder (scripts/validate-config.ts)
npm test
```

## Pozostałość v1

- `npm run config:validate` — skrypt offline (jeszcze pusty)
- `CORS_ORIGINS` w `.env.example` — brak implementacji w `src/main.ts`
