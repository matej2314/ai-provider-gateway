# Architektura API — AI Provider Gateway

## Styl API

Gateway udostępnia **trzy powierzchnie HTTP** pod prefiksem `/api/v1`:

| Powierzchnia | Odbiorca | Auth | Główne trasy |
|--------------|----------|------|--------------|
| **Natywna** | Aplikacje zintegrowane z kontraktem gateway | `X-Gateway-Key` | `POST /chat`, `POST /chat/stream` |
| **OpenAI** | Cursor i klienty OpenAI SDK | `Authorization: Bearer` | `GET /openai/models`, `POST /openai/chat/completions` |
| **Anthropic** | Claude Code i klienty Messages API | `x-api-key` (lub Bearer) | `GET /anthropic/models`, `POST /anthropic/messages` |

Szczegóły fasad (mapowanie `model` → `modelAlias`, błędy vendora, stan wdrożenia): **`integracje.md`**.

### Natywny kontrakt (rdzeń)

- Spójne REST API nad zasobem *chat* (konwersacja).
- Dwa tryby odpowiedzi:
  - **standard** (pełna odpowiedź JSON),
  - **streaming** (SSE gateway: `meta` → `delta` → `done`).

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

**Stan kodu (`openapi.json`):** envelope **`ErrorEnvelope`** z `GlobalExceptionFilter` (`APP_FILTER` w `AppModule`). Jawne **`code`** z payloadu wyjątku (guardy, `RATE_LIMITED`, kody z `provider-error.mapper.ts`); inaczej `DEFAULT_HTTP_STATUS_TO_CODE` (dla HTTP **429** fallback to **`RATE_LIMITED`** — patrz `dictionary.md`). **`requestId`:** `RequestIdMiddleware` — nagłówek żądania `x-request-id` (echo) lub `req_<uuid>`; to samo ID w polu JSON (`requestId`) oraz w **nagłówku odpowiedzi** `x-request-id` (`res.setHeader` w `src/common/middleware/request-id.middleware.ts`).

## Parametry generacji (`params` w body)

**Stan kodu:** opcjonalne **`params`** (`temperature`, `maxOutputTokens`) w `ChatRequestDto`; merge z `policy.params` w YAML (`defaults`, `allowOverrides`, `bounds`) w `resolveProviderCallOptions` (`src/chat/helpers/resolve-provider-call-options.ts`); ten sam kontrakt dla standard i stream. Niedozwolony override → **`MODEL_NOT_ALLOWED`** (400). Klucz cache uwzględnia efektywne parametry (`ResponseCacheService`).

## Rozszerzenia (pozostałość v1)

- **`npm run config:validate`** — wpis w `package.json` istnieje, skrypt `scripts/validate-config.ts` jest **placeholder** (walidacja offline YAML + env bez HTTP) — `konfiguracja.md`, `dokumentacja_koncepcyjna.md`.
- **`CORS_ORIGINS`** w `.env.example` — **nie** zaimplementowane w `src/main.ts` (brak middleware CORS); przy wystawieniu do przeglądarki skonfiguruj reverse proxy lub dodaj CORS w kodzie.

**Stan kodu (skrót):** `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `PROVIDER_UNSUPPORTED`, `RATE_LIMITED` / `PROVIDER_RATE_LIMITED` — jawne kody w payloadach wyjątków, zachowywane przez `GlobalExceptionFilter`.

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

**Natywny czat** wymaga **`X-Gateway-Key`** (`@GatewayKeyAndSmartRateLimit()`).

**Fasady IDE** (w przygotowaniu) używają tej samej allowlisty kluczy klienta, ale innych nagłówków — Bearer (OpenAI) lub `x-api-key` (Anthropic); guard fasady ustawia `req.gatewayKey`, potem `SmartRateLimitGuard` (`readClientGatewayKey` — docelowo). Klucze providerów w `.env` pozostają wyłącznie w adapterach.

Opcjonalny smart rate limit per klucz klienta (`RATE_LIMIT_SMART_ENABLED`, Redis). Health: **`GET /api/v1/health`**, **`GET /api/v1/health/ready`** — publiczne (bez guardów czatu). Readiness: HTTP **200** zawsze; ocena po `body.status` (`ready` / `not_ready`) — `dokumentacja_api.md`.

W sieci publicznej nadal zaleca się dodatkowe warstwy; sam **`X-Gateway-Key`** nie zastępuje izolacji sieciowej ani obrony przed nadużyciami na dużą skalę.

- Reverse proxy z dodatkowym auth / mTLS w razie potrzeby,
- Rate limiting i WAF,
- Ograniczenia originów w CORS (jeśli wystawiane do przeglądarki) — zmienna `CORS_ORIGINS` w `.env.example` jest **zarezerwowana**; middleware CORS **nie** jest jeszcze w kodzie.

## Powiązane dokumenty

- Fasady IDE: `integracje.md`, `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`
- Kontrakt endpointów: `dokumentacja_api.md`
- Śledzenie rozmów (metryki): `conversation-tracking.md`
- Lista ścieżek: `lista_endpointów.md`
- Konfiguracja i aliasy: `konfiguracja.md`
- Streaming i format zdarzeń: `dokumentacja_api.md`
- Anty‑patterny: `anty-patterny.md`

