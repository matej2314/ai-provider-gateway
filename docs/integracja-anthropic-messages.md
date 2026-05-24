# Integracja Anthropic Messages API (Claude Code)

Fasada **`/api/v1/anthropic`** pozwala podłączyć **Claude Code** i inne klienty oczekujące Anthropic Messages API do gatewaya z własną allowlistą kluczy.

> **Stan:** moduł `src/integrations/anthropic/` jest w przygotowaniu — poniższy opis dotyczy **docelowego** kontraktu. Architektura wspólna: `integracje.md`.

## Konfiguracja w Claude Code

| Pole | Wartość |
|------|---------|
| **Anthropic Base URL** (custom API URL) | `http://<host>:<port>/api/v1/anthropic` |
| **API Key** | Wartość z allowlisty klienta gateway (np. `GATEWAY_KEY_IDE_PLUGIN`) |

Klient dokleja ścieżki ze specyfikacji Anthropic:

- `GET /models` → `GET /api/v1/anthropic/models`
- `POST /messages` → `POST /api/v1/anthropic/messages`

## Endpointy

| Metoda | Pełna ścieżka | Opis |
|--------|---------------|------|
| GET | `/api/v1/anthropic/models` | Lista aliasów (format Anthropic: `data[].id`, `display_name`, …) |
| POST | `/api/v1/anthropic/messages` | Wiadomości; `stream: true` → SSE zdarzeń Anthropic |

## Autoryzacja

Priorytet nagłówków (docelowo `AnthropicApiKeyGuard`):

1. **`x-api-key: <klucz_klienta>`**
2. **`Authorization: Bearer <klucz_klienta>`** (fallback)

Weryfikacja w **`gatewayKey.allowList`** — ten sam sekret co `X-Gateway-Key` / Bearer OpenAI. Klucz klienta **nie** trafia do wywołań SDK providera.

## Wybór modelu

Pole **`model`** w body = **`modelAlias`** z `gateway.config.yaml`.

## Mapowanie treści wiadomości

W MVP każda wiadomość musi zawierać co najmniej jeden blok **`type: text`**. Bloki **`type: image`** → **400** (multimodal poza zakresem).

Treść tekstowa jest mapowana na `messages[]` kontraktu gateway (`role` + `content` string).

Opcjonalne parametry:

| Anthropic | Gateway (`params`) |
|-----------|-------------------|
| `temperature` | `temperature` |
| `max_tokens` | `maxOutputTokens` |

## Przykład (non-stream)

```bash
curl -s http://localhost:3000/api/v1/anthropic/messages \
  -H "x-api-key: $GATEWAY_KEY_IDE_PLUGIN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": [{"type": "text", "text": "Hello"}]}
    ]
  }'
```

## Przykład (stream)

```bash
curl -N http://localhost:3000/api/v1/anthropic/messages \
  -H "x-api-key: $GATEWAY_KEY_IDE_PLUGIN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet",
    "max_tokens": 1024,
    "stream": true,
    "messages": [
      {"role": "user", "content": [{"type": "text", "text": "Hello"}]}
    ]
  }'
```

Wewnętrznie: `ChatService.executeStream` + `anthropic-stream.mapper` → zdarzenia SSE Anthropic.

## Natywne API (bez zmian)

- `POST /api/v1/chat` + `X-Gateway-Key`
- `POST /api/v1/chat/stream` — SSE gateway

## Ograniczenia MVP

- Pole **`system`** w żądaniu klienta — ignorowane (prompt z `src/config/system-prompt/`).
- Brak **tools** w fasadzie.
- Brak obrazów w content blocks.
- Odpowiedzi bez pól gateway (`provider`, `cached`, `conversationId`).

## Błędy

Format zgodny z Anthropic API (`type`, `message` w body błędu). Lokalny `AnthropicExceptionFilter` na kontrolerach. Korelacja: **`x-request-id`**.

## Powiązane

- `integracje.md`
- `integracja-openai-kontrakt.md`
- `konfiguracja.md`
- `lista_endpointów.md`
