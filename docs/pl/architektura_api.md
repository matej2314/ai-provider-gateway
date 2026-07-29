# Architektura API — AI Provider Gateway

## Styl API

Gateway udostępnia **trzy powierzchnie HTTP** pod prefiksem `/api/v1`:

| Powierzchnia | Odbiorca | Auth | Główne trasy |
|--------------|----------|------|--------------|
| **Natywna** | Aplikacje zintegrowane z kontraktem gateway | `X-Gateway-Key` | `GET /models`, `POST /chat`, `POST /chat/stream` |
| **OpenAI** | Cursor i klienty OpenAI SDK | `Authorization: Bearer` | `GET /openai/models`, `POST /openai/chat/completions` |
| **Anthropic** | Claude Code i klienty Messages API | `x-api-key` (lub Bearer) | `GET /anthropic/models`, `POST /anthropic/messages` |

Szczegóły fasad (mapowanie `model` → `modelAlias`, błędy vendora): **`integracje.md`**.

### OpenAPI / Swagger (wszystkie powierzchnie)

Jeden plik **[`openapi.json`](../../openapi.json)** (v0.14.0, OpenAPI 3.1) generowany z kodu (`npm run openapi:export`). Zawiera trasy health, czatu natywnego, **models**, oraz fasad OpenAI i Anthropic. Schematy bezpieczeństwa:

| Scheme | Nagłówek | Trasy |
|--------|----------|-------|
| `GatewayKeyAuth` | `X-Gateway-Key` | `GET /models`, `POST /chat`, `POST /chat/stream` |
| `BearerAuth` | `Authorization: Bearer` | `/openai/*` |
| `ApiKeyAuth` | `x-api-key` | `/anthropic/*` |

Błędy w spec: natywny czat i models — `ErrorEnvelope`; fasady — `OpenAiErrorResponseDto` / `AnthropicErrorResponseDto` (runtime: lokalne filtry, nie `GlobalExceptionFilter`). Swagger UI: `/api/v1/api-docs` (`SWAGGER_ENABLED` — `konfiguracja.md`).

### Natywny kontrakt (rdzeń)

- Spójne REST API nad zasobem *chat* (konwersacja).
- Dwa tryby odpowiedzi:
  - **standard** (pełna odpowiedź JSON),
  - **streaming** (SSE gateway: `meta` → `delta` → `done`).

**Warunek uruchomienia:** przy starcie wczytywany jest `gateway.config.yaml` (fail‑fast przy błędzie). Każda włączona instancja providera wymaga poprawnych sekretów w env (API key / base URL) przez fasadę `configuration-validation.service.ts` (szczegóły: `konfiguracja.md`).

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

**Kody HTTP:** udany **`POST /api/v1/chat`** (JSON) oraz udany **`POST`** fasad oficjalnych kontraktów bez streamu → **201 Created** (domyślne NestJS; `@ApiResponse({ status: 201 })` w kontrolerach). Streaming SSE → **200** (`POST /chat/stream`, `stream: true` na fasadach). Szczegóły: `dokumentacja_api.md`, `lista_endpointów.md`.

Minimalne pola (kierunek kontraktu; detale w `dokumentacja_api.md`):

- `id` — identyfikator odpowiedzi (gateway),
- `provider` — identyfikator **`providerInstance`** z YAML (np. `anthropic`, `google-office`), nie pole `type` adaptera,
- `model` — **alias** (`modelAlias`) z żądania; ten sam identyfikator w odpowiedzi standardowej (`ChatService.executeChat`) i w SSE **`meta`** (`ChatProviderCallService.streamOnce`). Vendorowy `modelId` nie jest zwracany w żadnej odpowiedzi,
- `output` — treść odpowiedzi (tekst i/lub struktura),
- `usage` — metadane tokenów (jeśli dostępne),
- `requestId` — korelacja z logami.
- `conversationId` — ID rozmowy (echo lub `conv_<uuid>` z gateway) — tylko czat; szczegóły: `conversation_tracking.md`.
- `effectiveModelAlias` — opcjonalnie, gdy `ResilientExecutor` obsłużył żądanie na aliasie `fallback` z YAML (pole `model` = żądany alias).
- `toolCalls`, `finishReason` — opcjonalnie przy function calling (`capabilities.tools` w YAML); `finishReason` w runtime: `stop` | `tool_calls` | `length` | `content_filter` — typ `GatewayFinishReason`, mapowanie `mapStopReasonToFinishReason` (`src/chat/helpers/map-provider-finish-reason.ts`).
- `usageDetails` — opcjonalnie tokeny cache Anthropic (`promptCacheHitTokens`, `promptCacheCreationTokens`).
- `thinkingContent` — opcjonalnie treść extended thinking (Anthropic / Gemini 3.0+), gdy `params.thinkingEnabled: true` i alias ma `capabilities.thinking`.
- `systemFingerprint` — opcjonalne, **provider-specific**: pass-through z adaptera; w praktyce dotyczy OpenAI `system_fingerprint`. Anthropic i Gemini **nie** zwracają odpowiednika — pole pomijane w odpowiedzi. Fasada OpenAI mapuje na `system_fingerprint` gdy ustawione (`dictionary.md`).

## Streaming (SSE)

Kontrakt (OpenAPI + `dokumentacja_api.md`): **Server‑Sent Events** (`text/event-stream`), zdarzenia `meta` → `delta*` → `done`.

**Implementacja:** `POST /api/v1/chat/stream` — `ChatStreamController`, `ChatService.executeStream` + `ChatProviderCallService.streamOnce` (`meta` → `delta*` → `done`; `done` może zawierać `usage`, `toolCalls`, `finishReason`).

- Gateway nie gwarantuje identycznego zachowania token‑po‑token między providerami.
- Klient powinien traktować SSE jako strumień fragmentów + metadane z `meta`.

## Błędy HTTP

**Kontrakt ([`openapi.json`](../../openapi.json)):** envelope **`ErrorEnvelope`** z `GlobalExceptionFilter` (`APP_FILTER` w `AppModule`). Jawne **`code`** z payloadu wyjątku (guardy, `RATE_LIMITED`, kody z `provider-error.mapper.ts`); inaczej `DEFAULT_HTTP_STATUS_TO_CODE` (dla HTTP **429** fallback to **`RATE_LIMITED`** — patrz `dictionary.md`). **`requestId`:** `RequestIdMiddleware` — nagłówek żądania `x-request-id` (echo) lub `req_<uuid>`; to samo ID w polu JSON (`requestId`) oraz w **nagłówku odpowiedzi** `x-request-id` (`res.setHeader` w `src/common/middleware/request-id.middleware.ts`).

Przekroczenie limitu rozmiaru body (**1 MB**) → **413 Payload Too Large** z kodem **`VALIDATION_FAILED`** i komunikatem `request entity too large` (`GlobalExceptionFilter` obsługuje błąd Express `entity.too.large`).

## Parametry generacji (`params` w body)

Opcjonalne **`params`** w `ChatRequestDto` (`ChatParamsDto`, `ResponseFormatDto`): `temperature`, `maxOutputTokens`, `topP`, `topK`, `stop` (string \| string[]), `frequencyPenalty`, `presencePenalty`, `seed`, `responseFormat` (`type`, opcjonalny `jsonSchema`), `thinkingEnabled`, `thinkingBudget`; merge z `policy.params.defaults` w YAML przez `resolveProviderCallOptions` (defaults YAML ← body dla pierwszej grupy pól; **`topK`**, **`stop`**, **`responseFormat`**, **`thinkingBudget`** — tylko z body). **Efekt u vendora** zależy od adaptera aliasu — macierz: `dictionary.md`, YAML: `konfiguracja.md` (Anthropic: jeden parametr losowości — priorytet `topK` > `topP` > `temperature`). Opcjonalne **`tooling`** (`definitions`, `toolChoice`) — wymaga `capabilities.tools` na aliasie. Opcjonalne **`metadata`** w body — propagacja do adaptera (Anthropic: `userId` → SDK `metadata.user_id`). Niedozwolony override params → **`MODEL_NOT_ALLOWED`**; tooling bez capability → **`TOOLS_NOT_SUPPORTED`**. Cache pomijany dla żądań z toolingiem. **`frequencyPenalty` / `presencePenalty`**: akceptowane w API, ale adaptery `anthropic` / `google` ich nie przekazują do SDK. **`responseFormat`**: mapowane do SDK Anthropic, Google i OpenAI gdy `type: json_object`. **`thinkingEnabled` / `thinkingBudget`**: wymaga `capabilities.thinking: true` + `allowOverrides`; mapowanie w `anthropic-thinking.mapper.ts`, fabryce Google i adapterach OpenAI (Responses API). Fasada `/openai` mapuje `reasoning_effort` → `params.thinking*`.

## Rozszerzenia

- **`npm run config:validate`** — walidacja offline YAML + reguły runtime (`validateGatewayConfig()` → m.in. fasada sekretów). Pełna walidacja: **`gateway config:validate`** (`validateEnvironment()`) — `konfiguracja.md`.

Kody błędów (skrót): `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `TOOLS_NOT_SUPPORTED`, `PROVIDER_UNSUPPORTED`, `RATE_LIMITED` / `PROVIDER_RATE_LIMITED` — jawne kody w payloadach wyjątków, zachowywane przez `GlobalExceptionFilter`.

## Opcjonalne śledzenie rozmowy (`conversationId`)

- Pole opcjonalne w body **`POST /api/v1/chat`** i **`POST /api/v1/chat/stream`**.
- **Response:** zawsze `conversationId` (echo lub nowe `conv_<uuid>`) — JSON / SSE `meta`.
- **Sentry Conversations:** `gen_ai.conversation.id` **tylko**, gdy klient **podaje** `conversationId` w request; bez niego — span pojedynczej wiadomości. Od tury 2 klient wysyła pełną historię w `messages[]` (w tym pierwszą odpowiedź asystenta).
- Szczegóły: `conversation_tracking.md`, schema `ChatRequest` w [`openapi.json`](../../openapi.json).

## Walidacja

- Walidacja DTO na brzegu (`ValidationPipe`: m.in. **`messages` 1–150** w natywnym czacie, `content` max 3000 znaków (32000 dla `tool`), opcjonalne `conversationId` w formacie `conv_<uuid>`, opcjonalne zagnieżdżone `params` (w tym `responseFormat.jsonSchema`), opcjonalne `metadata`, `forbidNonWhitelisted`). Fasady OpenAI / Anthropic dopuszczają do **15 000** wiadomości (`MAX_MESSAGES` w DTO integracji).
- Limit rozmiaru JSON body: **1 MB** (`express.json` w `src/setup.app.ts`); przekroczenie → **413** (`VALIDATION_FAILED`).
- Walidacja konfiguracji przy starcie (fail‑fast) i w runtime (np. unknown `modelAlias` → błąd deterministyczny z kodem `MODEL_ALIAS_NOT_FOUND` przy `POST /chat`).

## Idempotencja, retry i fallback

- Standardowy chat nie jest idempotentny w sensie biznesowym (ten sam request może generować różną odpowiedź), **chyba że** zadziała warstwa cache dla **`POST /api/v1/chat`** — wtedy identyczny payload może zwrócić wcześniejszą odpowiedź z **`cached: true`** (`ResponseCacheService`, `konfiguracja.md`). Cooldown po 429 od providera (`checkCooldown` / `setCooldown`) — **JSON i streaming** (`prepareRequestForExecution`, `handleProviderError`).
- **`ResilientExecutor`** (`src/chat/resilience/`): dla aliasu z żądania stosuje `policy.retry` (max prób, lista `onStatus`) i `policy.timeoutMs` z YAML (domyślnie `RETRY_POLICY_DEFAULTS` w `src/common/retry-policy-defaults.ts`; budowa polityki: `buildRetryPolicyFromResolved`). Retry tylko dla `HttpException` ze statusem z `onStatus` (`is-retryable-http-error.ts`). Po wyczerpaniu prób — opcjonalnie wywołanie aliasu z **`models[].fallback`** (jeden hop; `assertNoFallbackCycle` w `fallback-chain.ts`; ta sama polityka retry co alias pierwszy). Timeout → **504** / `PROVIDER_TIMEOUT`. Szczegóły: `konfiguracja.md`, `dokumentacja_api.md`.

## Auth

**Natywny czat i models** wymagają **`X-Gateway-Key`** (`@GatewayKeyAndSmartRateLimit()` na `ChatController`, `ChatStreamController`, `ModelsController`).

**Fasady oficjalnych kontraktów** używają tej samej allowlisty kluczy klienta, ale innych nagłówków — Bearer (OpenAI) lub `x-api-key` / Bearer (Anthropic); guard fasady ustawia `req.gatewayKey`, potem `SmartRateLimitGuard` (`readClientGatewayKey`). Klucze providerów w `.env` (per `apiKeyRef` / `providerInstance`) pozostają wyłącznie w warstwie `src/providers/`.

Opcjonalny smart rate limit per klucz klienta (`RATE_LIMIT_SMART_ENABLED`, Redis przez wspólny `RedisConnectionService` — ładowany gdy `isRedisRequiredFromEnv()`). Health: **`GET /api/v1/health`**, **`GET /api/v1/health/ready`** — publiczne (bez guardów czatu). Readiness: HTTP **200** zawsze; ocena po `body.status` (`ready` / `not_ready`); pola `checks.config`, `checks.redis`, `checks.cache` — `dokumentacja_api.md`.

**Nagłówki bezpieczeństwa:** Helmet w `src/main.ts` (przed `setupApp`); `x-powered-by` wyłączone w `setup.app.ts`. Weryfikacja w testach security: `test/security/helmet-headers.security-spec.ts` — `testy.md`.

W sieci publicznej nadal zaleca się dodatkowe warstwy; sam **`X-Gateway-Key`** nie zastępuje izolacji sieciowej ani obrony przed nadużyciami na dużą skalę.

- Reverse proxy z dodatkowym auth / mTLS w razie potrzeby,
- Rate limiting i WAF.

## Powiązane dokumenty

- Fasady oficjalnych kontraktów: `integracje.md`, `integracja_openai_kontrakt.md`, `integracja_anthropic_messages.md`
- Kontrakt endpointów: `dokumentacja_api.md`
- Śledzenie rozmów (metryki): `conversation_tracking.md`
- Lista ścieżek: `lista_endpointów.md`
- Konfiguracja i aliasy: `konfiguracja.md`
- Streaming i format zdarzeń: `dokumentacja_api.md`
- Anty‑patterny: `anty_patterny.md`

