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
- `model` — **alias** (`modelAlias`) z żądania; ten sam identyfikator w odpowiedzi standardowej i w SSE **`meta`**. Vendorowy `modelId` nie jest zwracany w żadnej odpowiedzi (`ChatService.executeChat` i `ChatService.executeStream`),
- `output` — treść odpowiedzi (tekst i/lub struktura),
- `usage` — metadane tokenów (jeśli dostępne),
- `requestId` — korelacja z logami.
- `conversationId` — ID rozmowy (echo lub `conv_<uuid>` z gateway) — tylko czat; szczegóły: `conversation-tracking.md`.

## Streaming (SSE)

Kontrakt (OpenAPI + `dokumentacja_api.md`): **Server‑Sent Events** (`text/event-stream`), zdarzenia `meta` → `delta*` → `done`.

**Stan kodu:** `POST /api/v1/chat/stream` — `ChatStreamController`, `ChatService.executeStream` (`meta` → `delta*` → `done`; `done` ma pusty payload — `openapi.json`).

- Gateway nie gwarantuje identycznego zachowania token‑po‑token między providerami.
- Klient powinien traktować SSE jako strumień fragmentów + metadane z `meta`.

## Błędy HTTP

**Stan kodu (`openapi.json`):** envelope **`ErrorEnvelope`** z `GlobalExceptionFilter` (`APP_FILTER` w `AppModule`). Jawne **`code`** z payloadu wyjątku (guardy, `RATE_LIMITED`, kody z `provider-error.mapper.ts`); inaczej `DEFAULT_HTTP_STATUS_TO_CODE`. `requestId` z **`RequestIdMiddleware`** lub z payloadu wyjątku.

## Rozszerzenia (Faza 5 i dalsze)

Parametry **`params`** w body, skrypt `npm run config:validate`, nagłówek odpowiedzi `x-request-id` oraz pełniejsze wykorzystanie policy w adapterach — `dokumentacja_koncepcyjna.md`, `dokumentacja_api.md`. Słownik kodów (`dictionary.md`) obejmuje też kody na przyszłe scenariusze (np. `MODEL_NOT_ALLOWED`).

**Stan kodu (skrót):** `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `PROVIDER_UNSUPPORTED` są już emitowane w payloadach wyjątków i zachowywane przez `GlobalExceptionFilter`.

## Opcjonalne śledzenie rozmowy (`conversationId`)

- Pole opcjonalne w body **`POST /api/v1/chat`** i **`POST /api/v1/chat/stream`**.
- Służy grupowaniu metryk LLM w Sentry (`gen_ai.conversation.id`) oraz jest **zwracane** do klienta: w JSON (`ChatResponse`) i w SSE **`meta`**.
- Bez pola w żądaniu gateway generuje `conv_<uuid>` i oddaje je klientowi (front może użyć w kolejnych turach).
- Szczegóły: `conversation-tracking.md`, schema `ChatRequest` w `openapi.json`.

## Walidacja

- Walidacja DTO na brzegu (`ValidationPipe`: m.in. `messages` 1–50, `content` max 3000 znaków, opcjonalne `conversationId` min. 1 znak, `forbidNonWhitelisted`).
- Limit rozmiaru JSON body: **1 MB** (`express.json` w `main.ts`).
- Walidacja konfiguracji przy starcie (fail‑fast) i w runtime (np. unknown `modelAlias` → błąd deterministyczny z kodem `MODEL_ALIAS_NOT_FOUND` przy `POST /chat`).

## Idempotencja i retry

- Standardowy chat nie jest idempotentny w sensie biznesowym (ten sam request może generować różną odpowiedź), **chyba że** zadziała warstwa cache dla **`POST /api/v1/chat`** — wtedy identyczny payload (włącznie z wpływem na klucz cache: `modelAlias`, `messages`, warstwy system promptu) może zwrócić wcześniejszą odpowiedź z **`cached: true`** (`ResponseCacheService`, `konfiguracja.md`).
- Retry po stronie gateway jest ograniczony do błędów “bezpiecznych” (np. 429/5xx) i kontrolowany polityką w konfiguracji.

## CORS / Auth

Endpointy czatu wymagają **`X-Gateway-Key`** (`@GatewayKeyAndSmartRateLimit()`). Opcjonalny smart rate limit per klucz (`RATE_LIMIT_SMART_ENABLED`, Redis). Health: **`GET /api/v1/health`**, **`GET /api/v1/health/ready`** — publiczne.

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

