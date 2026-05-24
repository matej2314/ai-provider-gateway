# Integracja OpenAI API (Cursor IDE)

Fasada **`/api/v1/openai`** pozwala podłączyć **Cursor** (i inne klienty ze sztywnym klientem OpenAI) do gatewaya, używając własnej allowlisty kluczy zamiast klucza OpenAI.com.

> **Stan:** moduł `src/integrations/openai/` jest w przygotowaniu — poniższy opis dotyczy **docelowego** kontraktu po ukończeniu implementacji. Architektura wspólna: `integracje.md`.

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
| POST | `/api/v1/openai/chat/completions` | Chat; `stream: true` → SSE w formacie OpenAI |

## Autoryzacja

```
Authorization: Bearer <GATEWAY_KEY_*>
```

Gateway weryfikuje token w **`gatewayKey.allowList`** (ta sama lista co `X-Gateway-Key` w natywnym API). Token **nie** jest przekazywany do Anthropic ani Google — adaptery używają `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` z `.env`.

Przy włączonym smart rate limit (`RATE_LIMIT_SMART_ENABLED`) limit RPS i cooldown działają na tym samym kluczu klienta co dla natywnego czatu (po wdrożeniu `readClientGatewayKey`).

## Wybór modelu

W polu **`model`** żądania OpenAI podaj **`modelAlias`** z YAML (np. `chat-default`, `claude-sonnet`), nie vendorowy `modelId`.

Lista dostępnych ID: `GET /api/v1/openai/models`.

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
curl -N http://localhost:3000/api/v1/openai/chat/completions \
  -H "Authorization: Bearer $GATEWAY_KEY_WEBAPP" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chat-default",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

Odpowiedź: strumień SSE w formacie OpenAI (`data: {...}`), mapowany wewnętrznie z `ChatService.executeStream`.

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

Format JSON jak w OpenAI API (`error.message`, `error.type`, `error.code`). Wewnętrzne kody gateway (`RATE_LIMITED`, `MODEL_ALIAS_NOT_FOUND`, …) są mapowane na typy OpenAI (np. `rate_limit_error`, `invalid_request_error`). Korelacja: nagłówek **`x-request-id`**.

## Powiązane

- `integracje.md` — architektura fasad
- `integracja-anthropic-messages.md` — fasada Anthropic (Claude Code)
- `konfiguracja.md` — `gateway.config.yaml`, klucze env
- `lista_endpointów.md`
