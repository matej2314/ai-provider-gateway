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

Gateway weryfikuje token w **`gatewayKey.allowList`** (ta sama lista co `X-Gateway-Key` w natywnym API). Token **nie** jest przekazywany do Anthropic ani Google — wywołania SDK używają kluczy z `.env` wskazanych przez **`apiKeyRef`** w YAML (per `providerInstance`).

Kolejność guardów na trasach OpenAI: **`OpenAiBearerAuthGuard`** (ustawia `req.gatewayKey`) → **`SmartRateLimitGuard`** (RPS i cooldown, gdy `RATE_LIMIT_SMART_ENABLED=true`). Klucz klienta jest odczytywany przez **`readClientGatewayKey`** (`req.gatewayKey` lub `X-Gateway-Key`).

**Równoległe streamy** (`stream: true`): limit i zwolnienie slotu w **`OpenAiChatCompletionsController`** (`checkConcurrentStreams` / `releaseStream`), nie w guardzie — ścieżka nie kończy się na `/stream` jak w natywnym API.

## Wybór modelu

W polu **`model`** żądania OpenAI podaj **`modelAlias`** z YAML (np. `chat-default`, `claude-sonnet`), nie vendorowy `modelId`.

Lista dostępnych ID: `GET /api/v1/openai/models`.

## Parametry żądania

| Pole | Opis |
|------|------|
| `messages` | Wymagane; `content` string; role `user`, `assistant`, `tool` (`tool_call_id` wymagane); `assistant` może mieć `tool_calls` |
| `tools`, `tool_choice` | Opcjonalnie — mapowane na `tooling` gateway; wymaga `capabilities.tools: true` na aliasie |
| `stream` | `true` — SSE OpenAI; `false` lub brak — JSON `chat.completion` |
| `temperature` | Opcjonalnie (0–2), mapowane na `params.temperature` |
| `max_tokens` | Opcjonalnie, mapowane na `params.maxOutputTokens` |
| `top_p` | Opcjonalnie (0–1), mapowane na `params.topP` |
| `stop` | Opcjonalnie (string \| string[]), mapowane na `params.stop` |
| `frequency_penalty` | Opcjonalnie (-2–2), mapowane na `params.frequencyPenalty` (adaptery `anthropic`/`google` ignorują) |
| `presence_penalty` | Opcjonalnie (-2–2), mapowane na `params.presencePenalty` (adaptery `anthropic`/`google` ignorują) |
| `seed` | Opcjonalnie (integer), mapowane na `params.seed` (Anthropic ignoruje) |

Limit **`messages`**: 1–15 000 (DTO fasady; natywny czat: 1–150).

Role **`system`** w `messages` są **pomijane** — instrukcja systemowa z plików w `src/config/system-prompt/`.

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

## Ograniczenia

- Wiadomości **`role: system`** z klienta są **pomijane** — instrukcja systemowa pochodzi z plików w `src/config/system-prompt/`.
- **`messages[].content`** musi być stringiem (brak tablicy multimodalnej).
- Function calling wymaga `capabilities.tools: true` na aliasie w YAML.
- Odpowiedzi fasady **nie** zawierają pól gateway (`provider`, `cached`, `conversationId`).

## Błędy

Format JSON jak w OpenAI API (`error.message`, `error.type`, `error.code`) — **`OpenAiExceptionFilter`**. Wewnętrzne kody gateway (`RATE_LIMITED`, `MODEL_ALIAS_NOT_FOUND`, …) są mapowane na typy OpenAI (np. `rate_limit_error`, `invalid_request_error`). Korelacja: nagłówek **`x-request-id`**.

## Swagger / OpenAPI

Trasy OpenAI są w **`openapi.json`** (tag **OpenAI API**, security `BearerAuth`) oraz w Swagger UI (`/api/v1/api-docs`), gdy `SWAGGER_ENABLED=true`. Schematy żądań/odpowiedzi i błędów (`OpenAiErrorResponseDto`) pochodzą z dekoratorów `@Api*` na kontrolerach; eksport statyczny: `npm run openapi:export`.

## Powiązane

- [`integracje.md`](integracje.md) — architektura fasad, rate limit, stan wdrożenia
- [`integracja-anthropic-messages.md`](integracja-anthropic-messages.md) — fasada Anthropic (Claude Code; **wdrożona**)
- [`konfiguracja.md`](konfiguracja.md) — `gateway.config.yaml`, klucze env
- [`lista_endpointów.md`](lista_endpointów.md)
