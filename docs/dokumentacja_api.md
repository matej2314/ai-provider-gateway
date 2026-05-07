# Dokumentacja API — AI Provider Gateway

Wersja dokumentu: **0.1**. Dokument jest wersjonowany razem z kodem. Przy rozbieżnościach pierwszeństwo ma implementacja w repozytorium.

## Źródło prawdy

1. Implementacja NestJS (`src/**/*.controller.ts`, serwisy, DTO).
2. Dokumenty w `docs/` jako opis kontraktu i intencji.

## Podstawy

| Element | Wartość |
|---------|---------|
| Bazowy URL (przykład lokalny) | `http://localhost:3000` |
| Prefiks API | `/api/v1` (jeśli włączony global prefix) |
| Kodowanie | UTF‑8 |
| Standard | `application/json` |
| Streaming | `text/event-stream` (SSE) |

**Walidacja env przy starcie:** w MVP wymagany jest **co najmniej jeden** niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (implementacja: `src/config/env.validation.ts`; opis: `docs/konfiguracja.md`). Bez spełnienia tego warunku endpointów HTTP nie udostępniasz.

## Format błędów (envelope)

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Niepoprawne dane wejściowe.",
  "requestId": "…",
  "details": []
}
```

Klienci powinni opierać logikę na polu **`code`** (patrz `dictionary.md`).

---

## Modele i wybór providera

Klient wybiera model przez **`modelAlias`** (np. `chat-default`). Alias jest mapowany przez gateway na:

- `provider` (np. `anthropic`, `google`),
- vendorowy `modelId` (np. `claude-3-5-sonnet-20241022`, `gemini-2.5-flash`),
- polityki i limity (timeout, retry, allowlista parametrów).

Założenie kontraktowe: `modelAlias` powinien być **zwyczajową / czytelną nazwą modelu**, stabilną dla klientów (np. `claude-sonnet-4-5`), a gateway mapuje ją na **vendorowy identyfikator wymagany przez API providera** (np. `claude-sonnet-4-5-20250929` dla Anthropic). Analogiczne mapowanie dotyczy wszystkich providerów.

Szczegóły konfiguracji: `konfiguracja.md`.

---

## `POST /api/v1/chat` — standard

### Request body

Minimalny kontrakt wejścia:

```json
{
  "modelAlias": "chat-default",
  "messages": [
    { "role": "user", "content": "Napisz krótkie streszczenie." }
  ],
  "params": {
    "temperature": 0.7,
    "maxOutputTokens": 512
  }
}
```

#### `messages[]`

- `role`: `system` \| `user` \| `assistant`
- `content`: tekst (na MVP)

#### `params`

`params` to zestaw **opcjonalnych** parametrów. Gateway:

- odrzuca nieznane pola,
- waliduje zakresy,
- mapuje parametry do właściwych pól SDK danego providera.

Wartości dozwolone zależą od konfiguracji (allowlista per alias / per provider).

### Response (`200`)

```json
{
  "id": "gw_01H…",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "output": {
    "type": "text",
    "text": "…"
  },
  "usage": {
    "inputTokens": 123,
    "outputTokens": 456,
    "totalTokens": 579
  },
  "requestId": "…"
}
```

Uwagi:

- `usage` może być częściowo puste, jeśli provider/SDK nie udostępnia danych wprost.
- Format `id` jest wewnętrzny dla gateway (nie musi pokrywać się z id providerów).

---

## `POST /api/v1/chat/stream` — streaming (SSE)

### Request body

Taki sam jak dla standardowego endpointu.

### Response (`200`) — `text/event-stream`

Przykładowy strumień:

```
event: meta
data: {"id":"gw_01H…","provider":"anthropic","model":"claude-…","requestId":"…"}

event: delta
data: {"text":"Cześć"}

event: delta
data: {"text":"! Jak mogę pomóc?"}

event: done
data: {"usage":{"inputTokens":12,"outputTokens":34,"totalTokens":46}}
```

Konwencje:

- `meta` pojawia się raz na początku.
- `delta` może pojawić się wiele razy (fragmenty tekstu).
- `done` kończy strumień.

W razie błędu po rozpoczęciu strumienia:

- gateway może zakończyć połączenie,
- lub wysłać `event: error` (w przyszłości) — decyzja powinna być spójna w implementacji i testach.

---

## `GET /api/v1/health`

### Response (`200`)

```json
{ "status": "ok" }
```

---

## Kody błędów (skrót)

Pełna lista: `dictionary.md`.

- `VALIDATION_FAILED`
- `MODEL_ALIAS_NOT_FOUND`
- `PROVIDER_UNSUPPORTED`
- `PROVIDER_AUTH_FAILED`
- `PROVIDER_RATE_LIMITED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_UNAVAILABLE`

---

## Uwagi dla klientów

1. Parsuj `code`, nie `message`.
2. Przy streamingu traktuj `delta` jako fragmenty, nie gwarancję tokenizacji.
3. Nie zakładaj, że `usage` zawsze jest obecne w tym samym stopniu dla wszystkich providerów.

Powiązane: `lista_endpointów.md`, `architektura_api.md`, `konfiguracja.md`, `anty-patterny.md`.

