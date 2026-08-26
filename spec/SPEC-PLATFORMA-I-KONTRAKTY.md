---
wersja: 4
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-26
---

# SPEC — Platforma i kontrakty (AI Provider Gateway)

## Cel / problem

Gateway ma być komponentem “plug&play”: użytkownik dostarcza konfigurację i klucze, a następnie korzysta z jednego API niezależnie od providera LLM.

Ten dokument definiuje **wspólne kontrakty** i zasady obowiązujące endpointy **natywne** (czat, katalog modeli, health):

- envelope błędów,
- requestId,
- stabilne kody błędów,
- zasady walidacji,
- zasady uwierzytelnienia na brzegu (gateway key),
- smart rate limit serwisu (RPS / burst / równoległe streamy),
- zasady logowania i error reportingu (bez sekretów),
- twardnienie HTTP (Helmet, limit body, shutdown),
- Swagger UI jako opcjonalna powierzchnia deweloperska.

**Stan implementacji (skrót):** `openapi.json` (v0.14.0). Natywny czat i models: `GlobalExceptionFilter` (`ErrorEnvelope`). Fasady IDE: lokalne filtry + format vendora (kontrakt fasad **poza tym plikiem**). `RequestIdMiddleware` (nagłówek `x-request-id` + pole `requestId`). Czat i models: `@GatewayKeyAndSmartRateLimit()`. Kody: `docs/pl/dictionary.md` / `docs/dictionary.md`. Bootstrap: `src/main.ts`, `src/setup.app.ts`.

## Użytkownicy i scenariusze

### Scenariusz A — uruchomienie lokalne

1. Użytkownik wypełnia `.env`: sekrety pod `apiKeyRef` / `baseUrlRef` z YAML (patrz `SPEC-KONFIGURACJA.md`, `docs/pl/konfiguracja.md`). Dodatkowo przygotowuje `gateway.config.yaml`.
2. Uruchamia serwis.
3. Wysyła request na `/chat` lub `/chat/stream` z nagłówkiem `X-Gateway-Key`.

### Scenariusz B — użycie w infrastrukturze

1. Użytkownik wdraża serwis w kontenerze.
2. Sekrety są dostarczone przez menedżer sekretów.
3. Konfiguracja modeli jest montowana jako plik.
4. System jest monitorowany przez healthchecki, logi i (opcjonalnie) scrape `/metrics` oraz Sentry.

### Scenariusz C — limit RPS na kluczu klienta

1. Operator włącza `RATE_LIMIT_SMART_ENABLED=true` i Redis (`docs/pl/konfiguracja.md`).
2. Klient przekracza RPS/burst (env albo `clients[].rateLimit` w YAML).
3. Gateway zwraca **429** z `code=RATE_LIMITED` **bez** wywołania LLM.

## Wymagania funkcjonalne

### Envelope błędów

F-1. Każdy błąd zwracany jako JSON **w kontrakcie natywnym** ma kształt:

- `statusCode: number`
- `code: string`
- `message: string`
- `requestId: string`
- `details?: unknown[]`

Fasady OpenAI/Anthropic zwracają błąd w formacie vendora, nie `ErrorEnvelope`.

F-2. `code` jest stabilny i opisany w `docs/pl/dictionary.md` / `docs/dictionary.md`.

F-15. Gdy wyjątek **nie** niesie jawnego `code`, `GlobalExceptionFilter` mapuje status HTTP przez `DEFAULT_HTTP_STATUS_TO_CODE`; brak wpisu → `INTERNAL_SERVER_ERROR`. Nieobsłużony wyjątek serwera → **500** + `INTERNAL_SERVER_ERROR` (bez surowego stack trace w body).

### Request ID

F-3. Gateway musi propagować requestId:

- jeśli klient przysłał requestId w nagłówku (np. `x-request-id`) → użyj go,
- jeśli nie → wygeneruj nowy.

F-4. `requestId` musi pojawić się:

- w envelope błędów,
- w odpowiedziach sukcesu (czat standard),
- w zdarzeniu `meta` (streaming),
- w logach,
- w nagłówku odpowiedzi HTTP **`x-request-id`** (echo wartości z `req.requestId`).

### Walidacja

F-5. Wejście do endpointów jest walidowane na brzegu; niepoprawne requesty kończą się `400` z `code=VALIDATION_FAILED` (lub bardziej szczegółowym kodem, gdy handler go ustawia — np. `MODEL_NOT_ALLOWED`).

F-6. Nieznany `modelAlias` kończy się `MODEL_ALIAS_NOT_FOUND` **bez** wywołania providera. HTTP:

- `POST /api/v1/chat` oraz `POST /api/v1/chat/stream` → **400**,
- `GET /api/v1/models/:modelAlias` → **404**.

Zmiana względem: wcześniejsze F-6 nie rozróżniało statusów HTTP (tylko „deterministyczny błąd”). Powód: `ProviderRegistryService.resolveModelAlias` na czacie vs `ModelsController` na katalogu.

F-19. Limit rozmiaru body JSON: **1 MB** (`express.json` w `setup.app.ts`). Przekroczenie → **413** z `code=VALIDATION_FAILED` i komunikatem `request entity too large` (`GlobalExceptionFilter` obsługuje Express `entity.too.large`).

### Gateway Key (nagłówek `X-Gateway-Key`)

**Stan kodu:** `openapi.json` definiuje `GatewayKeyAuth`; `GatewayKeyGuard` + `SmartRateLimitGuard` przez `@GatewayKeyAndSmartRateLimit()`.

F-9. Gateway musi weryfikować nagłówek `X-Gateway-Key` dla:

- `POST /api/v1/chat`
- `POST /api/v1/chat/stream`
- `GET /api/v1/models`
- `GET /api/v1/models/:modelAlias`

Zmiana względem: wcześniejsze F-9 ograniczone do dwóch tras czatu. Powód: `ModelsController` wymaga tego samego guarda.

Pełny kontrakt odpowiedzi katalogu modeli (pola DTO, parytet z fasadami) — `SPEC-MODELS.md` / `SPEC-FASADY.md`.

F-10. `X-Gateway-Key` jest porównywany z **allowlistą kluczy** zbudowaną w runtime z niepustych wartości env wskazanych przez `clients.*.gatewayKeyRef` w YAML (`buildGatewayKeyRuntime`). Rotacja i dokładanie kluczy = nowy wpis klienta + env, bez zmiany kontraktu HTTP.

Zmiana względem: wcześniejsze F-10 („allowlista kluczy (lista/array)” bez źródła). Powód: źródłem allowlisty jest sekcja `clients` — `SPEC-KONFIGURACJA.md` F-6.

F-11. Brak nagłówka `X-Gateway-Key` kończy się błędem `401` z `code=GATEWAY_KEY_MISSING`.

F-12. Niepoprawny `X-Gateway-Key` kończy się błędem `403` z `code=GATEWAY_KEY_INVALID`.

F-13. Bez `X-Gateway-Key` i bez smart rate limitu: `GET /api/v1/health` oraz `GET /api/v1/health/ready`. `GET /metrics` (poza prefiksem `/api/v1`) również bez klucza — `SPEC-METRYKI.md`.

F-14. Pusta allowlista w runtime (brak niepustych kluczy klientów) na chronionej trasie → **500** z `code=GATEWAY_KEY_NOT_CONFIGURED` (`GatewayKeyGuard`; analogicznie guardy fasad). Przy poprawnym starcie z YAML + env i co najmniej jednym niepustym kluczem klienta scenariusz nie występuje. Brak klucza klienta w env **nie** blokuje startu procesu (ostrzeżenie w `config:validate`) — w przeciwieństwie do `masterKeyRef` (`SPEC-KONFIGURACJA.md` F-4).

### Smart rate limit (gateway, nie upstream)

F-16. Gdy `RATE_LIMIT_SMART_ENABLED=true`, po udanej weryfikacji klucza `SmartRateLimitGuard` egzekwuje limit **per wartość klucza klienta**:

1. Jeśli wpis `clients[]` ma `rateLimit` → `rps`, `burst`, `maxConcurrentStreams` z YAML (mapowanie po wartości klucza z env).
2. W przeciwnym razie → env: `RATE_LIMIT_RPS_PER_KEY` (domyślnie 10), `RATE_LIMIT_BURST_PER_KEY` (20), `RATE_LIMIT_STREAMS_CONCURRENT` (3).

Implementacja: token bucket w Redis (okno 1 s). Przekroczenie → **429** `RATE_LIMITED` **przed** wywołaniem LLM. Gdy flaga jest `false` (domyślnie), guard przepuszcza.

Szczegóły env i YAML: `SPEC-KONFIGURACJA.md`, `docs/pl/konfiguracja.md` / `docs/configuration.md`.

F-17. Gdy Redis jest niedostępny albo nie `ready`, `SmartRateLimiterService` **przepuszcza** żądanie (fail-open). To samo dotyczy cooldownu po 429 upstream (`SPEC-CHAT.md` F-11).

F-18. Limit równoległych streamów (`maxConcurrentStreams`) na ścieżce natywnej: `SmartRateLimitGuard` zlicza slot, gdy URL kończy się na `/stream`; zwolnienie slotu — `StreamCleanupInterceptor` (`finalize`). Fasady (`stream: true` bez sufiksu `/stream`) zliczają w kontrolerze — `SPEC-FASADY.md` F-5.

`RATE_LIMITED` (gateway) jest **osobnym** kodem od `PROVIDER_RATE_LIMITED` (429 upstream — `SPEC-PROVIDERS.md` F-4).

### Logowanie i error reporting

F-7. Logi nie mogą zawierać sekretów (kluczy API, tokenów, nagłówków autoryzacji). Implementacja: redakcja Pino (`src/logging/adapters/pino-logger.adapter.ts`, `redact.paths`).

Zmiana względem: wcześniejsze kryterium akceptacji traktowało redakcję jako Faza 6.1 (nieodhaczone). Powód: redakcja jest wdrożona.

F-8. W logach musi być możliwa korelacja request→provider (co najmniej przez `requestId` i pola `provider`, `modelAlias`).

F-21. Backend logów: `LOG_ADAPTER` (`pino` domyślnie; `console` — `ConsoleLoggerAdapter`). Awaria inicjalizacji Pino → fallback na console. Poziom: `LOG_LEVEL` (domyślnie `info`; odczyt w `LoggingModule`, poza `EnvironmentVariables`). W środowisku innym niż production Pino używa transportu `pino-pretty`.

Uwaga vs docs: `docs/pl/konfiguracja.md` opisuje `LOG_PRETTY` jako przełącznik czytelnego outputu. Zmienna jest w `env.validation.ts`, ale **nie** steruje adapterem Pino (decyduje `NODE_ENV`). Korekta dokumentacji — osobna decyzja.

F-22. Error reporting (osobno od scrape Prometheus — `SPEC-METRYKI.md` i od spanów LLM — `SPEC-CHAT.md` F-9):

- `ERROR_REPORTING_ADAPTER=noop` | `sentry`;
- brak override: **production** → Sentry gdy `SENTRY_DSN` niepusty, inaczej noop; poza production → Sentry tylko gdy `SENTRY_ENABLED=true` (i DSN);
- SDK Sentry inicjalizowane w `src/instrument.ts` gdy DSN jest ustawiony **oraz** włączone są metryki LLM albo error reporting.

Treści promptów na spanach / w kontekście Sentry — tylko gdy `SENTRY_INCLUDE_PROMPTS=true` (`docs/pl/conversation_tracking.md`).

### Swagger UI

F-20. Interaktywna dokumentacja OpenAPI (ten sam dokument co `openapi.json` / `npm run openapi:export`):

- ścieżka UI: `/api/v1/api-docs` (`SWAGGER_UI_PATH` + globalny prefiks);
- JSON: `/api/v1/swagger.json`;
- poza production: włączone, chyba że `SWAGGER_ENABLED=false`;
- w **production**: tylko gdy `SWAGGER_ENABLED=true`.

Swagger UI **nie** jest kontraktem klientów runtime; kontrakt HTTP to `openapi.json`.

## Wymagania niefunkcjonalne

NFR-1. Fail‑fast konfiguracji: serwis nie startuje, jeśli konfiguracja env/plików jest błędna lub niekompletna.

NFR-2. Klient HTTP **nie** może podać URL-a providera w requeście (brak open proxy na brzegu). Operator **może** wskazać URL runtime przez `baseUrlRef` w YAML dla typów OpenAI — wartość wyłącznie z env, walidowana przy starcie (`provider-base-url.validation.ts`).

Zmiana względem: wcześniejsze NFR-2 „konfiguracja nie może pozwalać na dowolne URL-e providerów”. Powód: `baseUrlRef` jest świadomym wyjątkiem operatorskim, nie parametrem requestu.

NFR-3. Domyślne zachowanie powinno być bezpieczne: bez dumpowania surowych wyjątków SDK w odpowiedziach.

NFR-4. Na wejściu HTTP: `helmet()` z wyłączonym CSP i COEP (`contentSecurityPolicy: false`, `crossOriginEmbedderPolicy: false`); wyłączony nagłówek `x-powered-by` (`setup.app.ts`). Aplikacja **nie** włącza CORS. Testy nagłówków: `helmet-headers.security-spec.ts`.

NFR-5. Graceful shutdown: `SIGTERM` / `SIGINT` (oraz `uncaughtException` / `unhandledRejection`) zamykają Nest (`app.close()`), z ochroną przed podwójnym shutdownem (`src/main.ts`). `enableShutdownHooks()` w `setup.app.ts`.

NFR-6. Domyślny port nasłuchu: `PORT` (domyślnie **3000**).

## Kryteria akceptacji (checklista)

- [x] Błędy natywne mają envelope z `code` i `requestId` (`GlobalExceptionFilter`).
- [x] Endpointy czatu **oraz** katalogu modeli wymagają `X-Gateway-Key` zgodnie z allowlistą.
- [x] Pusta allowlista → `500` `GATEWAY_KEY_NOT_CONFIGURED`; brak klucza → `401`; zły klucz → `403`.
- [x] Nieznany `modelAlias` nie wykonuje wywołania do providerów; czat **400**, katalog **404**.
- [x] Body > 1 MB → `413` `VALIDATION_FAILED`.
- [x] Przy `RATE_LIMIT_SMART_ENABLED=true` i gotowym Redis przekroczenie RPS/burst/streamów → `429` `RATE_LIMITED`; bez Redis — fail-open (`rate-limit-bypass.security-spec.ts`).
- [x] Logi strukturalne redagują sekrety i nagłówki auth (Pino `redact`; brak dedykowanego testu sinku logów — weryfikacja HTTP: `test/security/information-disclosure.security-spec.ts`).
- [x] `requestId` jest widoczny w odpowiedziach standard/stream (body sukcesu, envelope błędu, SSE `meta`) oraz w nagłówku **`x-request-id`**.
- [x] Helmet / brak `x-powered-by` (`helmet-headers.security-spec.ts`).
- [x] Swagger UI poza production pod `/api/v1/api-docs`, w production tylko przy `SWAGGER_ENABLED=true`.

## Poza zakresem (względem rdzenia MVP)

- Uwierzytelnianie użytkowników końcowych (AuthN/AuthZ).
- Billing i limity rozliczeniowe użytkownika końcowego (quota $ / plan SaaS). Zmiana względem: wcześniejsze „poza zakresem” obejmowało też smart rate limit serwisu jednym nawiasem. Powód: RPS/burst/streamy są wdrożone i opisane w F-16–F-18.
- Kontrakt HTTP fasad OpenAI/Anthropic — `SPEC-FASADY.md`.
- Szczegółowy kontrakt `GET /metrics` — `SPEC-METRYKI.md`.
- Spany LLM / `conversationId` w Sentry — `SPEC-CHAT.md` F-9.
- Pełny katalog `GET /models` — `SPEC-MODELS.md`.
- Szczegóły cache semantycznego — `SPEC-CHAT.md` F-8b, `SPEC-KONFIGURACJA.md` F-1d. Zmiana względem: punkt „Cache semantyczny” jako poza zakresem całego zestawu.
