# Integracja Anthropic Messages API (Claude Code)

Fasada **`/api/v1/anthropic`** pozwala podłączyć **Claude Code** i inne klienty oczekujące Anthropic Messages API do gatewaya z własną allowlistą kluców.

> **Stan:** moduł `src/integrations/anthropic/` jest **wdrożony** — `GET /models`, `POST /messages` (JSON + stream SSE w formacie Anthropic). Architektura wspólna: [`integracje.md`](integracje.md).

## Konfiguracja (Claude Code i inne klienty)

| Pole | Wartość |
|------|---------|
| **Anthropic Base URL** (custom API URL) | `http://<host>:<port>/api/v1/anthropic` |
| **API Key** | Dowolna wartość z allowlisty klienta gateway (np. `GATEWAY_KEY_IDE_PLUGIN` z `.env`) — wysyłana jako **`x-api-key`** lub **Bearer** |

Klient dokleja standardowe ścieżki Anthropic do Base URL:

- `GET /models` → `GET /api/v1/anthropic/models`
- `POST /messages` → `POST /api/v1/anthropic/messages`

## Endpointy

| Metoda | Pełna ścieżka | Opis |
|--------|---------------|------|
| GET | `/api/v1/anthropic/models` | Lista aliasów z `gateway.config.yaml` (format Anthropic: `data[].id`, `display_name`, `created_at`, …) |
| GET | `/api/v1/anthropic/models/:model` | Pojedynczy alias lub 404 |
| POST | `/api/v1/anthropic/messages` | Wiadomości; `stream: true` → SSE zdarzeń Anthropic (`message_start`, `content_block_delta`, …) |

## Autoryzacja

Priorytet nagłówków (`AnthropicApiKeyGuard`):

1. **`x-api-key: <GATEWAY_KEY_*>`**
2. **`Authorization: Bearer <GATEWAY_KEY_*>`** (fallback)

Gateway weryfikuje klucz w **`gatewayKey.allowList`** (ta sama lista co `X-Gateway-Key` / Bearer OpenAI). Klucz klienta **nie** trafia do wywołań SDK providera — klucze z `.env` są rozwiązywane per **`providerInstance`** (`apiKeyRef` w YAML).

Kolejność guardów na trasach Anthropic: **`AnthropicApiKeyGuard`** (ustawia `req.gatewayKey`) → **`SmartRateLimitGuard`** (RPS i cooldown, gdy `RATE_LIMIT_SMART_ENABLED=true`). Klucz klienta jest odczytywany przez **`readClientGatewayKey`**.

**Równoległe streamy** (`stream: true`): limit i zwolnienie slotu w **`AnthropicMessagesController`** (`checkConcurrentStreams` / `releaseStream`), nie w guardzie — ścieżka nie kończy się na `/stream` jak w natywnym API.

## Wybór modelu

W polu **`model`** żądania podaj **`modelAlias`** z YAML (np. `chat-default`, `claude-sonnet`), nie vendorowy `modelId`.

Lista dostępnych ID: `GET /api/v1/anthropic/models`.

## Mapowanie treści wiadomości

Każda wiadomość musi zawierać co najmniej jeden blok **`type: text`** z polem `text`. Oficjalne API dopuszcza też skrót `content` jako string — w tej fasadzie MVP wymagana jest **tablica bloków**.

Bloki **`type: image`** → **400** (`VALIDATION_FAILED`).

Treść tekstowa jest mapowana na `messages[]` kontraktu gateway (`role` + `content` jako string).

## Parametry żądania (MVP)

| Pole | Opis |
|------|------|
| `messages` | Wymagane; `content` = tablica bloków z co najmniej jednym `type: text` |
| `stream` | `true` — SSE Anthropic; `false` lub brak — JSON `Message` |
| `temperature` | Opcjonalnie (0–1), mapowane na `params.temperature` gateway |
| `max_tokens` | Opcjonalnie; mapowane na `params.maxOutputTokens`; bez wartości — domyślne z YAML |
| `tools`, `tool_choice` | Opcjonalnie — mapowane na `tooling` gateway; wymaga `capabilities.tools: true` na aliasie |
| `system` | **Ignorowane** — instrukcja systemowa z `src/config/system-prompt/` |

## Przykład (non-stream)

```bash
curl -s http://localhost:3000/api/v1/anthropic/messages \
  -H "x-api-key: $GATEWAY_KEY_IDE_PLUGIN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "chat-default",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": [{"type": "text", "text": "Hello"}]}
    ]
  }'
```

Odpowiedź (uproszczony kształt `Message`): `type: message`, `role: assistant`, `content[]` z blokiem tekstowym, `model` = alias z żądania, `stop_reason`, `usage.input_tokens` / `output_tokens`.

## Przykład (stream)

```bash
curl -N -X POST http://localhost:3000/api/v1/anthropic/messages \
  -H "x-api-key: $GATEWAY_KEY_IDE_PLUGIN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "chat-default",
    "max_tokens": 1024,
    "stream": true,
    "messages": [
      {"role": "user", "content": [{"type": "text", "text": "Count to 3"}]}
    ]
  }'
```

Odpowiedź: strumień SSE (`Content-Type: text/event-stream; charset=utf-8`, nagłówek `anthropic-version: 2023-06-01`) — zdarzenia `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`. Wewnętrznie: `ChatService.executeStream` + `anthropic-stream.mapper.ts` (mapowanie zdarzeń gateway `meta` / `delta` / `done`).

## Test manualny bez Claude Code

Wystarczy curl, Postman lub Swagger UI (`/api/v1/api-docs`, tag **Anthropic API**). Szczegółową checklistę curl (w tym regresję natywnego API) zobacz w planie integracji — sekcja ETAP 3 w `integrations-plan.md`.

## Natywne API (bez zmian)

Jeśli budujesz własną aplikację pod kontrakt gateway:

- `POST /api/v1/chat` — nagłówek **`X-Gateway-Key`**
- `POST /api/v1/chat/stream` — natywny SSE (`meta` / `delta` / `done`)

## Różnice względem pełnego kontraktu Anthropic API

Fasada MVP celuje w prosty czat tekstowy i klienty IDE — **nie** jest drop-in zastępstwem `api.anthropic.com` bez adaptacji:

| Temat | Oficjalnie | Gateway (MVP) |
|-------|------------|---------------|
| `model` w odpowiedzi | ID modelu Anthropic | **Echo aliasu** z żądania (`chat-default`, …) |
| `usage` | m.in. cache, `service_tier` | Tylko `input_tokens`, `output_tokens` |
| `stop_reason` | m.in. `tool_use`, `max_tokens` | Mapowane z gateway (`tool_calls` → `tool_use`) |
| `system`, obrazy | Obsługiwane oficjalnie | `system` ignorowany; `image` → 400 |
| `tools` | Obsługiwane oficjalnie | Mapowane przez fasadę gdy alias ma `capabilities.tools` |
| `messages[].content` | string lub tablica | Tylko tablica bloków `text` |

Pełne dopasowanie kontraktu — kolejne iteracje (poza ETAP 2.5).

## Ograniczenia

- Pole **`system`** w żądaniu klienta — ignorowane (prompt z `src/config/system-prompt/`).
- Brak obrazów w content blocks (`type: image` → 400).
- Function calling wymaga `capabilities.tools: true` na aliasie w YAML.
- Odpowiedzi **nie** zawierają pól gateway (`provider`, `cached`, `conversationId`).

## Błędy

Format JSON jak w Anthropic API:

```json
{
  "type": "error",
  "error": { "type": "invalid_request_error", "message": "..." }
}
```

**`AnthropicExceptionFilter`** na kontrolerach (`@AnthropicAuth()`). Korelacja: nagłówek **`x-request-id`**.

## Swagger

Tag **Anthropic API** w Swagger UI (`/api/v1/api-docs`), gdy `SWAGGER_ENABLED=true`.

## Powiązane

- [`integracje.md`](integracje.md) — architektura fasad, rate limit, stan wdrożenia
- [`integracja-openai-kontrakt.md`](integracja-openai-kontrakt.md) — fasada OpenAI (Cursor)
- [`konfiguracja.md`](konfiguracja.md) — `gateway.config.yaml`, klucze env
- [`lista_endpointów.md`](lista_endpointów.md)
