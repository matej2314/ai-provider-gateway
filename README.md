# AI Provider Gateway (NestJS)

Gateway HTTP dla LLM, który **ukrywa SDK providerów** i wystawia spójny kontrakt do:

- standardowego czatu (`POST /api/v1/chat`) — **działa**,
- streamingu SSE (`POST /api/v1/chat/stream`) — **działa**, kontrakt w `openapi.json`,
- healthchecka (`GET /api/v1/health`) — **działa**,
- odporności (retry, timeout, opcjonalny fallback aliasu z `gateway.config.yaml`) — **`ResilientExecutor`**.

Aktualnie wspierani providerzy (rdzeń produktu — Anthropic + Google Gemini):

- **Anthropic** (`@anthropic-ai/sdk`)
- **Google Gemini** (`@google/genai`)

## Dokumentacja

Wejście od strony dokumentów: `docs/README.md`.

Najważniejsze pliki:

- `docs/dokumentacja_koncepcyjna.md` — WHAT/WHY, zakres produktu (MVP / v1)
- `docs/architektura.md` — moduły, warstwy, integracje providerów
- `docs/architektura_api.md` — konwencje API, requestId, streaming
- `docs/lista_endpointów.md` — szybka lista endpointów
- `docs/dokumentacja_api.md` — kontrakt request/response + przykłady
- `docs/konfiguracja.md` — env + “plug&play” konfiguracja
- `docs/spec/` — specyfikacje (SDD), np. `SPEC-CHAT.md`, `SPEC-PROVIDERS.md`
- `openapi.json` — OpenAPI 3.1 (zsynchronizowany z kodem)

## Szybki start (lokalnie)

Wymagania: Node.js + npm.

1) Instalacja zależności:

```bash
npm install
```

2) Konfiguracja env:

```bash
copy .env.example .env
```

**Ważne:** w **`NODE_ENV=production`** przy starcie wymagany jest **co najmniej jeden** niepusty klucz (po `trim()`): `ANTHROPIC_API_KEY` albo `GOOGLE_API_KEY`. W development ta reguła nie blokuje startu — nadal ustaw klucz dla providera, którego alias wywołujesz. Potrzebny jest też poprawny `gateway.config.yaml` w katalogu roboczym (patrz `docs/konfiguracja.md`).

3) Uruchomienie (dev):

```bash
npm run start:dev
```

Serwis nasłuchuje domyślnie na `http://localhost:3000`, a API ma prefiks `/api/v1` (patrz `src/main.ts`).

## Endpointy

### Health

```bash
curl http://localhost:3000/api/v1/health
```

### Chat (standard)

```bash
curl -X POST "http://localhost:3000/api/v1/chat" ^
  -H "content-type: application/json" ^
  -d "{\"modelAlias\":\"chat-default\",\"messages\":[{\"role\":\"user\",\"content\":\"Napisz krótkie streszczenie.\"}]}"
```

Opcjonalne body **`params`** (`temperature`, `maxOutputTokens`) — merge z `policy.params` w YAML; szczegóły: `docs/dokumentacja_api.md`.

### Chat (streaming SSE)

```bash
curl -X POST "http://localhost:3000/api/v1/chat/stream" ^
  -H "content-type: application/json" ^
  -d "{\"modelAlias\":\"chat-default\",\"messages\":[{\"role\":\"user\",\"content\":\"Powiedz coś krótko.\"}]}" ^
  --no-buffer
```

Szczegóły kontraktów: `openapi.json`, `docs/dokumentacja_api.md`.

## System prompt i `messages[]`

W żądaniu HTTP dozwolone są wyłącznie role **`user`** i **`assistant`** (`ChatMessageDto`). Rola `system` w body jest odrzucana walidacją (**400**).

Instrukcja systemowa dla LLM jest **składana po stronie serwera** z plików w `src/config/system-prompt/` (warstwy MASTER / MAIN / opcjonalnie per alias) i trafia do adapterów jako `ProviderChatInput.system` (`src/chat/helpers/system-prompt.ts`, `provider-input.ts`).

Powód i mapowania SDK: `docs/architektura.md` + `docs/spec/SPEC-PROVIDERS.md`.

## Skrypty

```bash
# dev
npm run start:dev

# build
npm run build

# prod (po build)
npm run start:prod

# walidacja gateway.config.yaml + env (placeholder — szczegóły: docs/konfiguracja.md, docs/dokumentacja_koncepcyjna.md)
npm run config:validate

# testy
npm test
```

## Struktura repo

Moduł czatu: **`ChatService`** (orkiestracja) + **`ChatProviderCallService`** (wywołania providerów, metryki) + helpery w `src/chat/helpers/`.

Opis katalogów i plików: `docs/architektura-katalogi-pliki.md`.
