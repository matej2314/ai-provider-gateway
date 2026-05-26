# Integracja OpenAI API (Cursor IDE)

Fasada **`/api/v1/openai`** pozwala podłączyć **Cursor** (i inne klienty ze sztywnym klientem OpenAI) do gatewaya, używając własnej allowlisty kluców zamiast klucza OpenAI.com.

> **Stan:** moduł `src/integrations/openai/` jest **wdrożony** — `GET /models`, `POST /chat/completions` (JSON + stream SSE w formacie OpenAI). Architektura wspólna: [`integracje.md`](integracje.md).

## Konfiguracja w Cursor

| Pole | Wartość |
|------|---------|
| **Override OpenAI Base URL** | `http://<host>:<port>/api/v1/openai` |
| **API Key** | Dowolna wartość z allowlisty klienta gateway (np. `GATEWAY_KEY_WEBAPP` z `.env`) — wysyłana jako **Bearer** |

Cursor dokleja standardowe ścieżki OpenAI do Base URL:

- `GET /models` → `GET /api/v1/openai/models`
- `POST /chat/completions` → `POST /api/v1/openai/chat/completions`

## Endpointy

| Metoda | Pełna ścieżka | Opis |
|--------|---------------|------|
| GET | `/api/v1/openai/models` | Lista aliasów z `gateway.config.yaml` (format OpenAI: `object: list`, `data[].id` = alias) |
| GET | `/api/v1/openai/models/:model` | Pojedynczy alias lub 404 |
| POST | `/api/v1/openai/chat/completions` | Chat; `stream: true` → SSE w formacie OpenAI (`data: {...}`, końcówka `data: [DONE]`) |

## Autoryzacja

```
Authorization: Bearer <GATEWAY_KEY_*>
```

Gateway weryfikuje token w **`gatewayKey.allowList`** (ta sama lista co `X-Gateway-Key` w natywnym API). Token **nie** jest przekazywany do Anthropic ani Google — adaptery używają `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` z `.env`.

Kolejność guardów na trasach OpenAI: **`OpenAiBearerAuthGuard`** (ustawia `req.gatewayKey`) → **`SmartRateLimitGuard`** (RPS i cooldown, gdy `RATE_LIMIT_SMART_ENABLED=true`). Klucz klienta jest odczytywany przez **`readClientGatewayKey`** (`req.gatewayKey` lub `X-Gateway-Key`).

**Równoległe streamy** (`stream: true`): limit i zwolnienie slotu w **`OpenAiChatCompletionsController`** (`checkConcurrentStreams` / `releaseStream`), nie w guardzie — ścieżka nie kończy się na `/stream` jak w natywnym API.

## Wybór modelu

W polu **`model`** żądania OpenAI podaj **`modelAlias`** z YAML (np. `chat-default`, `claude-sonnet`), nie vendorowy `modelId`.

Lista dostępnych ID: `GET /api/v1/openai/models`.

## Parametry żądania (MVP)

| Pole | Opis |
|------|------|
| `messages` | Wymagane; `content` musi być **stringiem** |
| `stream` | `true` — SSE OpenAI; `false` lub brak — JSON `chat.completion` |
| `temperature` | Opcjonalnie (0–2), mapowane na `params.temperature` gateway |
| `max_tokens` | Opcjonalnie, mapowane na `params.maxOutputTokens` |

Role **`system`** i **`tool`** w `messages` są **ignorowane** — instrukcja systemowa z plików w `src/config/system-prompt/`.

## Przykład (non-stream)

```bash
curl -s http://localhost:3000/api/v1/openai/chat/completions \
  -H "Authorization: Bearer $GATEWAY_KEY_WEBAPP" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chat-default",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Przykład (stream)

```bash
curl -N -X POST http://localhost:3000/api/v1/openai/chat/completions \
  -H "Authorization: Bearer $GATEWAY_KEY_WEBAPP" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chat-default",
    "messages": [{"role": "user", "content": "Count to 3"}],
    "stream": true
  }'
```

Odpowiedź: strumień SSE (`Content-Type: text/event-stream`) — linie `data: {"object":"chat.completion.chunk",...}`, na końcu **`data: [DONE]`**. Wewnętrznie: `ChatService.executeStream` + mapowanie zdarzeń gateway (`meta` / `delta` / `done`) w `openai-stream.mapper.ts`.

## Natywne API (bez zmian)

Jeśli budujesz własną aplikację pod kontrakt gateway:

- `POST /api/v1/chat` — nagłówek **`X-Gateway-Key`**
- `POST /api/v1/chat/stream` — natywny SSE (`meta` / `delta` / `done`)

## Ograniczenia MVP

- Wiadomości **`role: system`** z klienta są **ignorowane** — instrukcja systemowa pochodzi z plików w `src/config/system-prompt/`.
- Brak **tools** / function calling.
- **`messages[].content`** musi być stringiem (brak tablicy multimodalnej).
- Odpowiedzi fasady **nie** zawierają pól gateway (`provider`, `cached`, `conversationId`).

## Błędy

Format JSON jak w OpenAI API (`error.message`, `error.type`, `error.code`) — **`OpenAiExceptionFilter`**. Wewnętrzne kody gateway (`RATE_LIMITED`, `MODEL_ALIAS_NOT_FOUND`, …) są mapowane na typy OpenAI (np. `rate_limit_error`, `invalid_request_error`). Korelacja: nagłówek **`x-request-id`**.

## Swagger

Tag **OpenAI API** w Swagger UI (`/api/v1/api-docs`), gdy `SWAGGER_ENABLED=true`. Kontrakt natywny pozostaje w `openapi.json` z eksportu `npm run openapi:export`.

## Powiązane

- [`integracje.md`](integracje.md) — architektura fasad, rate limit, stan wdrożenia
- [`integracja-anthropic-messages.md`](integracja-anthropic-messages.md) — fasada Anthropic (Claude Code; **wdrożona**)
- [`konfiguracja.md`](konfiguracja.md) — `gateway.config.yaml`, klucze env
- [`lista_endpointów.md`](lista_endpointów.md)
