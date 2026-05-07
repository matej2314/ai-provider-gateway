# Dokumentacja API — AI Provider Gateway

Wersja dokumentu: **0.2**. Dokument jest wersjonowany razem z kodem. Przy rozbieżnościach między opisem a maszynowym schematem pierwszeństwo ma **`openapi.json`**; dla zachowania runtime pierwszeństwo ma **implementacja** — poniżej sekcja „Stan implementacji”.

## Źródła prawdy (kolejność)

1. **`openapi.json`** — docelowy kontrakt HTTP (OpenAPI 3.1): ścieżki, schematy, przykłady SSE i envelope błędów.
2. **Kod NestJS** (`src/**/*.controller.ts`, serwisy, DTO) — co faktycznie działa dziś.
3. **`PLAN_IMPLEMENTACJI.md`** — które elementy kontraktu są już zrobione, a które w kolejnych fazach (np. Faza 4: streaming, Faza 5: błędy + requestId + `config:validate`).
4. **`docs/spec/`** — wymagania SDD (docelowe zachowanie); mogą wyprzedzać kod.

## Podstawy

| Element | Wartość |
|---------|---------|
| Bazowy URL (przykład lokalny) | `http://localhost:3000` |
| Prefiks API | `/api/v1` (`src/main.ts`) |
| Kodowanie | UTF‑8 |
| Standard | `application/json` |
| Streaming (docelowo) | `text/event-stream` (SSE), patrz `openapi.json` `/api/v1/chat/stream` |

**Konfiguracja przy starcie:**

- Wczytanie i walidacja **`gateway.config.yaml`** (ścieżka: katalog roboczy procesu). Implementacja: `src/config/configuration.ts` (schema Zod).
- Walidacja env: `src/config/env.validation.ts` — **wymóg „co najmniej jednego klucza API” dotyczy wyłącznie `NODE_ENV=production`** (po `trim()` na `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`). W development aplikacja może wystartować bez ustawionych kluczy (wywołanie providera i tak się nie powiedzie bez klucza w adapterze).

**Nagłówek `X-Gateway-Key`:** opisany w `docs/spec/SPEC-PLATFORMA-I-KONTRAKTY.md` i `dictionary.md` jako **wymóg docelowy** — **nie jest obecnie egzekwowany** w kontrolerach (`src/chat/*.ts`). Nie występuje w `openapi.json`.

**Nagłówek `x-request-id`:** opcjonalna propagacja korelacji — w `openapi.json`; **generowanie/propagacja po HTTP nie jest jeszcze zaimplementowane** (Faza 5). Pole `requestId` w odpowiedzi czatu jest obecnie ustawiane w `ChatService` (losowy prefiks `req_`).

---

## Stan implementacji vs `openapi.json`

| Obszar | OpenAPI (docelowo) | Kod (bieżący) |
|--------|-------------------|---------------|
| `GET /api/v1/health` | `status`, `message`, `timestamp` | Zgodne (`HealthService`) |
| `POST /api/v1/chat` — body | `modelAlias`, `messages`, opcjonalnie `params` | DTO: tylko `modelAlias` i `messages`. Pole **`params` nie istnieje** — żądanie z `params` kończy się **400** (`forbidNonWhitelisted`). |
| `POST /api/v1/chat/stream` | SSE `meta` / `delta` / `done` | **Brak implementacji** endpointu pod tą ścieżką; istnieje szkielet `ChatStreamController` bez handlera (Faza 4). |
| Envelope błędów (`code`, `requestId`, …) | Tak | Nest domyślny format dla wyjątków; **brak** mapowania na `ErrorEnvelope` z OpenAPI (Faza 5). |
| `MODEL_ALIAS_NOT_FOUND` itd. | Kody stabilne w `dictionary.md` | Nieznany alias → `BadRequestException` z komunikatem tekstowym (nie ten sam kształt co envelope docelowy). |

---

## Format błędów (envelope) — docelowy kontrakt

Zgodnie z `openapi.json` / `dictionary.md`:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Niepoprawne dane wejściowe.",
  "requestId": "…",
  "details": []
}
```

Klienci powinni opierać logikę na polu **`code`**. Do czasu Fazy 5 realne odpowiedzi błędów mogą odbiegać od powyższego — porównuj z Zachowaniem Nest przy `ValidationPipe` i wyjątkach HTTP.

---

## Modele i wybór providera

Klient wybiera model przez **`modelAlias`** (np. `chat-default`, `gemini-flash`). Alias jest mapowany w **`gateway.config.yaml`** na:

- instancję providera (`providerInstance`),
- vendorowy `modelId`,
- polityki i capabilities (w pliku; **część pól np. timeout/retry nie jest jeszcze wykorzystywana** przez adaptery — patrz plan).

Rejestr w kodzie: `ProviderRegistryService.resolve()` + adaptery rejestrowane pod kluczami `anthropic` i `google` (`ProvidersModule`).

Szczegóły pliku konfiguracyjnego: `konfiguracja.md`, repozytoryjny `gateway.config.yaml`.

---

## `POST /api/v1/chat` — standard

### Request body

Minimalny request zgodny z **aktualnym** DTO:

```json
{
  "modelAlias": "chat-default",
  "messages": [
    { "role": "user", "content": "Napisz krótkie streszczenie." }
  ]
}
```

W **`openapi.json`** opcjonalne jest także:

```json
"params": { "temperature": 0.7, "maxOutputTokens": 512 }
```

— wdrożenie w DTO i warstwie policy jest **zaplanowane** (polityki już są w YAML; mapowanie do SDK — kolejne iteracje).

#### `messages[]`

- `role`: `system` \| `user` \| `assistant`
- `content`: string (OpenAPI: `minLength: 1`; w DTO warto dopilnować tego samego w przyszłości)

#### Normalizacja `system`

Przed wywołaniem adaptera wiadomości są normalizowane (`normalizeMessagesForProvider` w `ai-provider.interface.ts`): role systemowe → pole `system`, pozostałe → `user`/`assistant`.

### Response (`200`)

Kształt zgodny z OpenAPI (`ChatResponse`), generowany w `ChatService`:

```json
{
  "id": "gw_01H…",
  "provider": "anthropic",
  "model": "claude-sonnet-4-5-20250929",
  "output": {
    "type": "text",
    "text": "…"
  },
  "usage": {
    "inputTokens": 123,
    "outputTokens": 456,
    "totalTokens": 579
  },
  "requestId": "req_…"
}
```

Uwagi:

- `usage` zależy od adaptera; pola mogą być niekompletne (np. brak `totalTokens` jeśli SDK go nie zwraca).
- `id` / `requestId` są generowane po stronie gateway (nie są to identyfikatory vendorów).

---

## `POST /api/v1/chat/stream` — streaming (SSE)

Opis kontraktu i przykładowy strumień: **`openapi.json`** (`text/event-stream`, zdarzenia `meta`, `delta`, `done`).

**Status:** implementacja zaplanowana w **Fazie 4** (`PLAN_IMPLEMENTACJI.md`). Nie używaj tej ścieżki jako działającej usługi do czasu domknięcia tej fazy.

---

## `GET /api/v1/health`

Endpoint bez gateway key — przeznaczony do liveness.

### Response (`200`)

```json
{
  "status": "ok",
  "message": "Gateway is running",
  "timestamp": "2026-05-07T13:54:00.000Z"
}
```

---

## Kody błędów (skrót)

Pełna lista (w tym kody planowane pod Fazę 5 i gateway key): `dictionary.md`.  
W `openapi.json` jako przykłady m.in.: `VALIDATION_FAILED`, `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `PROVIDER_RATE_LIMITED`, `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`.

---

## Uwagi dla klientów

1. Traktuj **`openapi.json`** jako referencję kontraktu pod integracje i generatory klientów; sprawdzaj „Stan implementacji” powyżej.
2. Parsuj **`code`** w envelope (gdy Faza 5 wejdzie), nie `message`.
3. Przy streamingu (po wdrożeniu) traktuj `delta` jako fragmenty tekstu.
4. Nie zakładaj pełnego `usage` dla wszystkich providerów.

Powiązane: `lista_endpointów.md`, `architektura_api.md`, `konfiguracja.md`, `anty-patterny.md`, `PLAN_IMPLEMENTACJI.md`.
