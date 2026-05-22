# Architektura API — AI Provider Gateway

## Styl API

- Gateway udostępnia **spójne REST API** nad jednym zasobem: *chat completions* (konwersacja).
- Wersjonowanie przez prefiks ścieżki (np. `/api/v1`) — szczegóły zależą od implementacji global prefix w NestJS.
- Dwa tryby odpowiedzi:
  - **standard** (pełna odpowiedź JSON),
  - **streaming** (SSE).

**Warunek uruchomienia:** przy starcie wczytywany jest `gateway.config.yaml` (fail‑fast przy błędzie). Walidacja env: **minimum jeden** niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` obowiązuje **tylko gdy `NODE_ENV=production`** (`src/config/env.validation.ts`; szczegóły: `docs/konfiguracja.md`).

## Identyfikacja modeli (aliasy)

Preferowana forma wyboru modelu w request:

- `modelAlias` — nazwa z konfiguracji gateway.

Gateway mapuje alias do:

- instancji providera,
- vendorowego `modelId`,
- polityk i limitów.

Założenie: `modelAlias` jest zwyczajową/czytelną nazwą modelu (np. `claude-sonnet-4-5`), mapowaną na vendorowy `modelId` wymagany przez danego providera (np. `claude-sonnet-4-5-20250929` w Anthropic). Analogiczne mapowanie dotyczy wszystkich providerów.

## Konwencje odpowiedzi sukcesu (standard)

Gateway odpowiada JSON w spójnym kształcie, niezależnym od providera.

Minimalne pola (kierunek kontraktu; detale w `dokumentacja_api.md`):

- `id` — identyfikator odpowiedzi (gateway),
- `provider` — nazwa providera użytego do wykonania,
- `model` — **alias** (`modelAlias`) z żądania; ten sam identyfikator w odpowiedzi standardowej (`ChatService.executeChat`) i w SSE **`meta`** (`ChatProviderCallService.streamOnce`). Vendorowy `modelId` nie jest zwracany w żadnej odpowiedzi,
- `output` — treść odpowiedzi (tekst i/lub struktura),
- `usage` — metadane tokenów (jeśli dostępne),
- `requestId` — korelacja z logami.
- `conversationId` — ID rozmowy (echo lub `conv_<uuid>` z gateway) — tylko czat; szczegóły: `conversation-tracking.md`.
- `effectiveModelAlias` — opcjonalnie, gdy `ResilientExecutor` obsłużył żądanie na aliasie `fallback` z YAML (pole `model` = żądany alias).

## Streaming (SSE)

Kontrakt (OpenAPI + `dokumentacja_api.md`): **Server‑Sent Events** (`text/event-stream`), zdarzenia `meta` → `delta*` → `done`.

**Stan kodu:** `POST /api/v1/chat/stream` — `ChatStreamController`, `ChatService.executeStream` + `ChatProviderCallService.streamOnce` (`meta` → `delta*` → `done`; `done` ma pusty payload — `openapi.json`).

- Gateway nie gwarantuje identycznego zachowania token‑po‑token między providerami.
- Klient powinien traktować SSE jako strumień fragmentów + metadane z `meta`.

## Błędy HTTP

**Stan kodu (`openapi.json`):** envelope **`ErrorEnvelope`** z `GlobalExceptionFilter` (`APP_FILTER` w `AppModule`). Jawne **`code`** z payloadu wyjątku (guardy, `RATE_LIMITED`, kody z `provider-error.mapper.ts`); inaczej `DEFAULT_HTTP_STATUS_TO_CODE`. `requestId` z **`RequestIdMiddleware`** (`x-request-id` w żądaniu lub `req_<uuid>`) — pole w JSON odpowiedzi/błędu; nagłówek odpowiedzi `x-request-id` — planowany (Faza 5).

## Parametry generacji (`params` w body)

**Stan kodu:** opcjonalne **`params`** (`temperature`, `maxOutputTokens`) w `ChatRequestDto`; merge z `policy.params` w YAML (`defaults`, `allowOverrides`, `bounds`) w `resolveProviderCallOptions` (`src/chat/helpers/resolve-provider-call-options.ts`); ten sam kontrakt dla standard i stream. Niedozwolony override → **`MODEL_NOT_ALLOWED`** (400). Klucz cache uwzględnia efektywne parametry (`ResponseCacheService`).

## Rozszerzenia (Faza 5 i dalsze)

Skrypt `npm run config:validate` oraz nagłówek odpowiedzi `x-request-id` — `dokumentacja_koncepcyjna.md`, `dokumentacja_api.md`.

**Stan kodu (skrót):** `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `PROVIDER_UNSUPPORTED` są już emitowane w payloadach wyjątków i zachowywane przez `GlobalExceptionFilter`.

## Opcjonalne śledzenie rozmowy (`conversationId`)

- Pole opcjonalne w body **`POST /api/v1/chat`** i **`POST /api/v1/chat/stream`**.
- **Response:** zawsze `conversationId` (echo lub nowe `conv_<uuid>`) — JSON / SSE `meta`.
- **Sentry Conversations:** `gen_ai.conversation.id` **tylko**, gdy klient **podaje** `conversationId` w request; bez niego — span pojedynczej wiadomości. Od tury 2 klient wysyła pełną historię w `messages[]` (w tym pierwszą odpowiedź assistenta).
- Szczegóły: `conversation-tracking.md`, schema `ChatRequest` w `openapi.json`.

## Walidacja

- Walidacja DTO na brzegu (`ValidationPipe`: m.in. `messages` 1–150, `content` max 3000 znaków, opcjonalne `conversationId` w formacie `conv_<uuid>`, opcjonalne zagnieżdżone `params`, `forbidNonWhitelisted`).
- Limit rozmiaru JSON body: **1 MB** (`express.json` w `main.ts`).
- Walidacja konfiguracji przy starcie (fail‑fast) i w runtime (np. unknown `modelAlias` → błąd deterministyczny z kodem `MODEL_ALIAS_NOT_FOUND` przy `POST /chat`).

## Idempotencja, retry i fallback

- Standardowy chat nie jest idempotentny w sensie biznesowym (ten sam request może generować różną odpowiedź), **chyba że** zadziała warstwa cache dla **`POST /api/v1/chat`** — wtedy identyczny payload może zwrócić wcześniejszą odpowiedź z **`cached: true`** (`ResponseCacheService`, `konfiguracja.md`). Cooldown po 429 od providera (`setCooldown`) — tylko ścieżka standardowego czatu, nie streaming.
- **`ResilientExecutor`** (`src/common/resilience/`): dla aliasu z żądania stosuje `policy.retry` (max prób, lista `onStatus`) i `policy.timeoutMs` z YAML (domyślnie `RETRY_POLICY_DEFAULTS`). Retry tylko dla `HttpException` ze statusem z `onStatus`. Po wyczerpaniu prób — opcjonalnie wywołanie aliasu z **`models[].fallback`** (ta sama polityka retry co alias pierwszy). Timeout → **504** / `PROVIDER_TIMEOUT`. Szczegóły: `konfiguracja.md`, `dokumentacja_api.md`.

## CORS / Auth

Endpointy czatu wymagają **`X-Gateway-Key`** (`@GatewayKeyAndSmartRateLimit()`). Opcjonalny smart rate limit per klucz (`RATE_LIMIT_SMART_ENABLED`, Redis). Health: **`GET /api/v1/health`**, **`GET /api/v1/health/ready`** — publiczne (bez guardów czatu). Readiness: HTTP **200** zawsze; ocena po `body.status` (`ready` / `not_ready`) — `dokumentacja_api.md`.

W sieci publicznej nadal zaleca się dodatkowe warstwy; sam **`X-Gateway-Key`** nie zastępuje izolacji sieciowej ani obrony przed nadużyciami na dużą skalę.

- Reverse proxy z dodatkowym auth / mTLS w razie potrzeby,
- Rate limiting i WAF,
- Ograniczenia originów w CORS (jeśli wystawiane do przeglądarki).

## Powiązane dokumenty

- Kontrakt endpointów: `dokumentacja_api.md`
- Śledzenie rozmów (metryki): `conversation-tracking.md`
- Lista ścieżek: `lista_endpointów.md`
- Konfiguracja i aliasy: `konfiguracja.md`
- Streaming i format zdarzeń: `dokumentacja_api.md`
- Anty‑patterny: `anty-patterny.md`

