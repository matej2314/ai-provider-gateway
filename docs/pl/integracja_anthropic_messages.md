# Integracja Anthropic Messages API (Claude Code)

> **Ważne — fasada ≠ provider Anthropic:**  
> Ten dokument opisuje **fasadę oficjalnego kontraktu** — warstwę HTTP w `src/integrations/anthropic/`, która implementuje **kształt** Anthropic Messages API. Służy kompatybilności z Claude Code i innymi klientami oczekującymi tego kontraktu. 
> **To nie jest** gwarancja, że w projekcie istnieje włączony provider `type: anthropic` ani że wywołanie LLM trafi do API Anthropic. Routing zależy wyłącznie od **`model`** (= `modelAlias` w YAML) i `providerInstance` — alias może wskazywać np. Google Gemini.  
> **Auth:** `x-api-key` / Bearer to **klucz klienta gateway** z allowlisty, nie klucz z konsole Anthropic.  
> Odpowiednik dla fasady OpenAI: [`integracja_openai_kontrakt.md`](integracja_openai_kontrakt.md), [`dictionary.md`](dictionary.md).

Fasada **`/api/v1/anthropic`** pozwala podłączyć **Claude Code** i inne klienty oczekujące Anthropic Messages API do gatewaya z własną allowlistą kluczy.

> Moduł `src/integrations/anthropic/` — `GET /models`, `POST /messages` (JSON + stream SSE w formacie Anthropic). Architektura wspólna: [`integracje.md`](integracje.md).

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

Kolejność guardów na trasach Anthropic: **`AnthropicApiKeyGuard`** (ustawia `req.gatewayKey`) → **`SmartRateLimitGuard`** (RPS i równoległe streamy, gdy `RATE_LIMIT_SMART_ENABLED=true`). **Cooldown** po 429 od upstream — **`prepareRequestForExecution`** (`checkCooldown`) oraz **`ChatErrorHandlerService`** (`setCooldown` po błędzie providera); dotyczy zarówno JSON, jak i streamu. Klucz klienta jest odczytywany przez **`readClientGatewayKey`**.

**Równoległe streamy** (`stream: true`): limit i zwolnienie slotu w **`AnthropicMessagesController`** (`checkConcurrentStreams` / `releaseStream`), nie w guardzie — ścieżka nie kończy się na `/stream` jak w natywnym API.

## System prompt (polityka gateway)

> **Ważne dla integratorów Claude Code:**  
> Mimo że Anthropic Messages API wspiera pole `system` w request body, gateway **nadpisuje** je własnymi promptami z `src/config/system-prompt/`.  
> Klient nie może kontrolować system promptu przez API. Jeśli potrzebujesz własnego promptu, edytuj pliki w `src/config/system-prompt/` i zrestartuj gateway.  
> Patrz: [`konfiguracja.md`](konfiguracja.md), sekcja „System prompt".

## Wybór modelu

W polu **`model`** żądania podaj **`modelAlias`** z YAML (np. `chat-default`, `claude-sonnet`), nie vendorowy `modelId`.

Lista dostępnych ID: `GET /api/v1/anthropic/models`.

## Structured outputs (JSON mode)

Fasada wspiera parametr **`output_config.format`** w oficjalnym kształcie Anthropic Messages API — zgodnie z dokumentacją https://platform.claude.com/docs/en/build-with-claude/structured-outputs.

### Przykład żądania

```bash
curl -s http://localhost:3000/api/v1/anthropic/messages \
  -H "x-api-key: $GATEWAY_KEY_IDE_PLUGIN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "chat-default",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Generate user profile JSON with name and age"
          }
        ]
      }
    ],
    "output_config": {
      "format": {
        "type": "json_schema",
        "schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "age": { "type": "number" }
          },
          "required": ["name"],
          "additionalProperties": false
        }
      }
    }
  }'
```

### Mapowanie na gateway

- `output_config.format.type: 'json_schema'` → gateway `responseFormat: { type: 'json_object' }`
- `output_config.format.schema` → gateway `responseFormat.jsonSchema`

Gateway propaguje to do Anthropic provider, który używa **natywnego `output_config.format`** w wywołaniu SDK.

### Ograniczenia

- Fasada przyjmuje kształt zgodny z **oficjalnym Anthropic Messages API** (wire-compatible): `output_config.format.type: 'json_schema'` z obowiązkowym `schema`.
- Nie ma wsparcia dla uproszczonego JSON mode bez schematu — oficjalne API Anthropic wymaga schematu przy `json_schema`.
- Gateway internal używa abstrakcji `responseFormat`, ale fasada respektuje oficjalny shape Anthropic.

## Mapowanie treści wiadomości

Każda wiadomość musi zawierać co najmniej jeden blok **`type: text`** z polem `text`. Oficjalne API dopuszcza też skrót `content` jako string — w tej fasadzie MVP wymagana jest **tablica bloków**.

Bloki **`type: image`** → **400** (`VALIDATION_FAILED`).

Treść tekstowa jest mapowana na `messages[]` kontraktu gateway (`role` + `content` jako string).

## Parametry żądania (MVP)

| Pole | Opis |
|------|------|
| `messages` | Wymagane; `content` = tablica bloków z co najmniej jednym `type: text` |
| `stream` | `true` — SSE Anthropic; `false` lub brak — JSON `Message` |
| `temperature` | Opcjonalnie (0–2 w gateway), mapowane na `params.temperature`; adapter Anthropic może odrzucić wartości poza zakresem vendora |
| `max_tokens` | Opcjonalnie; mapowane na `params.maxOutputTokens`; bez wartości — domyślne z YAML |
| `top_p` | Opcjonalnie (0–1), mapowane na `params.topP`. Adapter Anthropic wysyła **jeden** parametr losowości — priorytet: **`topK` > `topP` > `temperature`**. Przy defaults `temperature` w YAML override `top_p` w body **nadpisze** `temperature` w SDK. Patrz `konfiguracja.md`, `dictionary.md`. |
| `stop_sequences` | Opcjonalnie (tablica stringów), mapowane na `params.stop` |
| `output_config` | Opcjonalnie — structured outputs (JSON mode). Format: `{ format: { type: 'json_schema', schema: {...} } }`. Mapowane na `params.responseFormat`. Wymaga schematu JSON. Patrz sekcja „Structured outputs (JSON mode)". |
| `tools`, `tool_choice` | Opcjonalnie — mapowane na `tooling` gateway; wymaga `capabilities.tools: true` na aliasie |
| `thinking` | Opcjonalnie — extended thinking (Anthropic API shape). Mapowane na `params.thinkingEnabled` / `params.thinkingBudget`; wymaga `capabilities.thinking: true` na aliasie. W odpowiedzi JSON: blok `content[].type: thinking`; w streamie: bloki `content_block_*` z `thinking_delta` w fazie `done` (patrz sekcja stream). |
| `system` | **Ignorowane** — instrukcja systemowa z `src/config/system-prompt/` |

Limit **`messages`**: 1–15 000 (DTO fasady; natywny czat: 1–150).

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

Odpowiedź (uproszczony kształt `Message`): `type: message`, `role: assistant`, `content[]` z blokiem tekstowym (opcjonalnie blok `thinking` przed tekstem), `model` = alias z żądania, `stop_reason`, `usage` (`input_tokens`, `output_tokens`, opcjonalnie `cache_creation_input_tokens` / `cache_read_input_tokens` z `usageDetails` gateway).

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

Odpowiedź: strumień SSE (`Content-Type: text/event-stream; charset=utf-8`, nagłówek `anthropic-version: 2023-06-01`) — zdarzenia `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`. Wewnętrznie: `ChatService.executeStream` → `anthropic-stream.mapper.ts` (mapowanie zdarzeń gateway `meta` / `delta` / `done`).

**Mapowanie stream → Anthropic SSE:**

| Faza gateway | Zdarzenia Anthropic |
|--------------|---------------------|
| `meta` | `message_start` (id, model; usage zerowe) |
| `delta` | `content_block_start` (text) + `content_block_delta` (`text_delta`) |
| `done` | `content_block_stop` (text), opcjonalnie bloki `thinking` (`thinking_delta`), opcjonalnie `tool_use` (`input_json_delta`), `message_delta` (stop_reason + pełne usage), `message_stop` |

**Usage w streamie:** finalne `message_delta.usage` zawiera `input_tokens`, `output_tokens` oraz pola cache (`cache_creation_input_tokens`, `cache_read_input_tokens`) — ta sama logika co w JSON (`anthropic-usage.mapper.ts`).

**Extended thinking w streamie:** gdy gateway zwraca `thinkingContent` w evencie `done`, fasada emituje blok `content_block` z `type: thinking` i `thinking_delta`. Treść **nie** jest streamowana w czasie rzeczywistym (ograniczenie gateway SSE); w JSON blok `thinking` jest **przed** tekstem, w streamie — **po** deltach tekstu (przed `tool_use`, jeśli występują).

## Test manualny bez Claude Code

Wystarczy curl, Postman lub Swagger UI (`/api/v1/api-docs`, tag **Anthropic API** — trasy w `openapi.json` z security `ApiKeyAuth`).

## Natywne API (bez zmian)

Jeśli budujesz własną aplikację pod kontrakt gateway:

- `POST /api/v1/chat` — nagłówek **`X-Gateway-Key`**
- `POST /api/v1/chat/stream` — natywny SSE (`meta` / `delta` / `done`)

## Różnice względem pełnego kontraktu Anthropic API

Fasada MVP celuje w prosty czat tekstowy i klienty IDE — **nie** jest drop-in zastępstwem `api.anthropic.com` bez adaptacji:

| Temat | Oficjalnie | Gateway (MVP) |
|-------|------------|---------------|
| `model` w odpowiedzi | ID modelu Anthropic | **Echo aliasu** z żądania (`chat-default`, …) |
| `usage` | m.in. cache, `service_tier` | **`input_tokens`**, **`output_tokens`**, opcjonalnie **`cache_creation_input_tokens`** / **`cache_read_input_tokens`** — w JSON i w finalnym `message_delta` streamu (wspólny mapper `anthropic-usage.mapper.ts`). Brak `service_tier`. |
| Extended thinking | Streamowane bloki `thinking` przed tekstem | JSON: blok `thinking` przed tekstem. Stream fasady: blok `thinking` w fazie `done` (po deltach tekstu); nie w czasie rzeczywistym. |
| `stop_reason` | m.in. `tool_use`, `max_tokens`, `refusal` | Mapowane z `GatewayFinishReason` przez `anthropic-stop-reason.mapper.ts` (`tool_calls` → `tool_use`, `length` → `max_tokens`, `content_filter` → `refusal`, `stop` → `end_turn`) |
| `system`, obrazy | Obsługiwane oficjalnie | `system` ignorowany; `image` → 400 |
| `tools` | Obsługiwane oficjalnie | Mapowane przez fasadę gdy alias ma `capabilities.tools` |
| `messages[].content` | string lub tablica | Tylko tablica bloków `text` |
| `output_config.format` | Obsługiwane oficjalnie | Mapowane na `params.responseFormat`; wymaga schematu JSON |
| `frequency_penalty`, `presence_penalty`, `seed` | OpenAI-compat w innych klientach | **N/A** — brak w Messages API; gateway native `/chat` może je przyjąć, adapter Anthropic ignoruje |
| `temperature` + `top_p` | Wzajemnie wykluczające w jednym requestcie | Gateway przekazuje oba, jeśli oba są w efektywnych opcjach po merge YAML ← body; skonfiguruj policy tak, by nie wysyłać obu (domyślnie: tylko `temperature` w defaults) |
| `top_p`, `stop_sequences` | Obsługiwane oficjalnie | Mapowane na `params.topP` / `params.stop` |

Pełne dopasowanie kontraktu — kolejne iteracje (poza ETAP 2.5).

## Ograniczenia

- **`temperature` i `top_p`:** nie podawaj obu w jednym wywołaniu Anthropic. Dotyczy też aliasów z default `temperature` w YAML — override `params.topP` z klienta może nadal wysłać oba parametry do API. Macierz parametrów: `dictionary.md`, konfiguracja YAML: `konfiguracja.md`.
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

## Swagger / OpenAPI

Trasy Anthropic są w **`openapi.json`** (tag **Anthropic API**, security `ApiKeyAuth`) oraz w Swagger UI (`/api/v1/api-docs`), gdy `SWAGGER_ENABLED=true`. Schematy żądań/odpowiedzi i błędów (`AnthropicErrorResponseDto`) pochodzą z dekoratorów `@Api*`; eksport: `npm run openapi:export`.

## Powiązane

- [`integracje.md`](integracje.md) — architektura fasad, rate limit
- [`integracja_openai_kontrakt.md`](integracja_openai_kontrakt.md) — fasada OpenAI (Cursor)
- [`konfiguracja.md`](konfiguracja.md) — `gateway.config.yaml`, klucze env
- [`lista_endpointów.md`](lista_endpointów.md)
