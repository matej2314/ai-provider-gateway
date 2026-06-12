# Dokumentacja API — AI Provider Gateway

Wersja dokumentu: **1.2**. Dokument jest wersjonowany razem z kodem. **`openapi.json`** jest zsynchronizowany z **`src/`** — obejmuje **trzy powierzchnie API** (natywny czat, fasada OpenAI, fasada Anthropic) oraz health. Schematy sukcesu i błędów pochodzą z dekoratorów `@Api*` na kontrolerach i DTO; rejestracja modeli w `src/swagger/swagger.setup.ts`.

## Źródła prawdy (kolejność)

1. **Kod NestJS** (`src/**/*.controller.ts`, serwisy, DTO) — dekoratory `@nestjs/swagger` na kontrolerach i klasach odpowiedzi (`@ApiProperty`, `@ApiOperation`, `@ApiGatewayChatErrorResponses`, `@ApiOpenAiErrorResponses`, `@ApiAnthropicErrorResponses`, `@ApiRequestIdHeader`, …). Konfiguracja dokumentu: `src/swagger/swagger.setup.ts` (`extraModels`, trzy `securitySchemes`).
2. **`openapi.json`** — kontrakt HTTP (OpenAPI 3.1) **generowany z kodu** (`npm run openapi:export` → `src/swagger/export-openapi.ts`). W runtime ten sam dokument serwowany jako `/api/v1/swagger.json` (gdy Swagger włączony).
3. **Swagger UI** — interaktywna dokumentacja pod `/api/v1/api-docs` (`setupSwagger` w `src/main.ts`; wyłączanie: `SWAGGER_ENABLED` — `konfiguracja.md`).
4. **`docs/dokumentacja_koncepcyjna.md`** — zakres MVP/v1 (pozostałość v1: m.in. CORS). **Wdrożone w `src/`:** `GlobalExceptionFilter`, **`RequestIdMiddleware`** (body + nagłówek odpowiedzi `x-request-id`), **`@GatewayKeyAndSmartRateLimit()`** (`GatewayKeyGuard` + `SmartRateLimitGuard`), mapowanie błędów SDK (`provider-error.mapper.ts`, kody **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`**), **`params` w body**, logging/metrics (Pino, Sentry opcjonalnie), readiness, graceful shutdown (`main.ts`). **Walidacja offline:** `npm run config:validate` — `konfiguracja.md`.
5. **Cache odpowiedzi** dla `POST /api/v1/chat` jest w kodzie (`src/cache/`, backend `noop` / `redis` — `docs/konfiguracja.md`). Dalszy rozwój warstwy Redis (limity, metryki, observability): `dokumentacja_koncepcyjna.md`.
6. **System prompt po stronie serwera** — wczytanie plików w `configuration.ts`, składanie w `composeSystemPrompt` / `buildProviderInputForAlias` (`src/chat/helpers/`).
7. **`docs/spec/`** — SDD (wymagania docelowe; część punktów może wyprzedzać wdrożenie — porównuj z `src/` i `openapi.json`).

## Podstawy

| Element | Wartość |
|---------|---------|
| Bazowy URL (przykład lokalny) | `http://localhost:3000` |
| Prefiks API | `/api/v1` (`API_GLOBAL_PREFIX` w `src/setup.app.ts`) |
| Kodowanie | UTF‑8 |
| Standard | `application/json` |
| Streaming | `text/event-stream` (`POST /api/v1/chat/stream`) |

**Konfiguracja przy starcie:**

- **`gateway.config.yaml`** — wczytanie i walidacja Zod (`src/config/gateway-config.schema.ts`) + `buildEffectiveGatewayConfig` (`src/config/configuration.ts`): m.in. spójność `providers` ↔ `models` (niepuste `models`, alias → provider, włączony provider → ≥1 model). Po sklonowaniu uzupełnij plik ręcznie lub uruchom `gateway config:init` — szczegóły: `konfiguracja.md`.
- **Pliki system promptu** — `MASTER_SYSTEM_PROMPT.md` (wymagany), opcjonalnie `MAIN_SYSTEM_PROMPT.md` oraz `models/<modelAlias>.md` dla aliasów z YAML; treść składana w runtime (`composeSystemPrompt` w `src/chat/helpers/system-prompt.ts`). Szczegóły: `konfiguracja.md`.
- **Env** — w **`NODE_ENV=production`** wymagany jest co najmniej jeden niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`). Opcjonalnie zmienne **`CACHE_*`** / **`REDIS_*`** — `konfiguracja.md`.

**Nagłówek `X-Gateway-Key`:** **wymagany** dla czatu (`@GatewayKeyAndSmartRateLimit()` na kontrolerach). Allowlista: `buildGatewayKeyRuntime` w `configuration.ts`. Przy `RATE_LIMIT_SMART_ENABLED=true` i gotowym Redis — dodatkowo limity per klucz (`SmartRateLimitGuard`, `SmartRateLimiterService`; szczegóły `konfiguracja.md`). **`GET /api/v1/health`** i **`GET /api/v1/health/ready`** — bez klucza (guardy czatu ich nie obejmują).

**`requestId`:** `RequestIdMiddleware` ustawia `req.requestId` z nagłówka żądania **`x-request-id`** (jeśli niepusty) lub generuje `req_<uuid>`, oraz ustawia **nagłówek odpowiedzi** `x-request-id` na tę samą wartość (`src/common/middleware/request-id.middleware.ts`). Pole **`requestId`** w JSON (sukces, błąd, SSE `meta`) pochodzi z `req.requestId`. Klient może korelować logi po nagłówku odpowiedzi lub po polu w body.

---

## Format błędów

Wszystkie odpowiedzi błędów obsłużone przez `GlobalExceptionFilter` jako JSON są w envelope **`ErrorEnvelope`** (`openapi.json`) — patrz `src/common/filters/http-exception.filter.ts` (rejestracja: `APP_FILTER` w `src/app.module.ts`). **Uwaga:** przy `POST /api/v1/chat/stream` część błędów może powstać **po** `flushHeaders` (patrz sekcja streamingu) — wtedy klient może nie otrzymać poprawnego JSON.

```json
{
  "statusCode": 400,
  "code": "MODEL_ALIAS_NOT_FOUND",
  "message": "Model alias unknown-alias not found in config",
  "requestId": "req_01H...",
  "details": []
}
```

Jeśli wyjątek przekazuje w obiekcie odpowiedzi pole **`code`** (np. `GatewayKeyGuard`, `ProviderRegistryService`, `ChatService.executeStream`), **`GlobalExceptionFilter`** zachowuje je (`GATEWAY_KEY_MISSING`, `GATEWAY_KEY_INVALID`, `GATEWAY_KEY_NOT_CONFIGURED`, `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, …). W przeciwnym razie **`code`** pochodzi z domyślnego mapowania statusu HTTP (`DEFAULT_HTTP_STATUS_TO_CODE` w `src/common/errors/api-error.code.ts`), m.in.:

| HTTP | `code` (domyślnie)       |
|------|--------------------------|
| 400  | `VALIDATION_FAILED` *(gdy wyjątek nie nadpisuje `code`; inaczej np. `MODEL_ALIAS_NOT_FOUND`)* |
| 401  | `PROVIDER_AUTH_FAILED`*    |
| 403  | `GATEWAY_KEY_INVALID`*     |
| 429  | `RATE_LIMITED` (gateway), `PROVIDER_RATE_LIMITED` (upstream) |
| 502  | `PROVIDER_UNAVAILABLE`     |
| 504  | `PROVIDER_TIMEOUT`         |
| inne | `INTERNAL_SERVER_ERROR`    |

\* Przy guardzie klucza i jawnych kodach w payloadzie wyjątku używane są **`GATEWAY_KEY_MISSING`** / **`GATEWAY_KEY_INVALID`**, nie wartości z tej tabeli.

Przy walidacji `ValidationPipe` źródłowe `message` bywa tablicą stringów; **`GlobalExceptionFilter`** emituje **`message` jako jeden string** (`array.join('; ')`). Pełny słownik kodów — `dictionary.md`.

---

### System prompt, role w `messages[]` i tool calling

**Rola `system`:** zablokowana w API (walidacja `400`). Instrukcja systemowa jest **składana po stronie serwera** w `composeSystemPrompt` (`src/chat/helpers/system-prompt.ts`) i przekazywana adapterom przez `buildProviderInputForAlias` (`src/chat/helpers/provider-input.ts`).

**Role w `messages[]`:** `user`, `assistant`, `tool` (`ChatMessageDto`):

| Rola | Pola | Limity |
|------|------|--------|
| `user` | `content` | max 3000 znaków |
| `assistant` | `content`; opcjonalnie `toolCalls[]` | max 3000 znaków |
| `tool` | `content`, **`toolCallId`** (wymagane) | max 32000 znaków |

**Pole `tooling` (opcjonalne):** obiekt z `definitions[]` (`name`, `description?`, `parameters` — JSON Schema) oraz opcjonalnym `toolChoice`. Włącza function calling — alias musi mieć **`capabilities.tools: true`** w YAML; inaczej **`400`** + **`TOOLS_NOT_SUPPORTED`**.

**Odpowiedź:** opcjonalne **`toolCalls`** (`id`, `name`, `arguments` jako JSON string) oraz **`finishReason`**. W runtime gateway mapuje `stopReason` providera funkcją **`mapStopReasonToFinishReason`** (`src/chat/helpers/map-provider-finish-reason.ts`) na: **`stop`** (domyślnie, m.in. `end_turn`, `stop_sequence`), **`tool_calls`** (gdy są `toolCalls` lub `stopReason === tool_use`), **`length`** (gdy `stopReason === max_tokens`). Enum w OpenAPI/DTO może zawierać dodatkowe wartości vendora — **emitowane w odpowiedzi są wyłącznie powyższe trzy**.

Opcjonalnie w odpowiedzi JSON: **`usageDetails`** (`promptCacheHitTokens`, `promptCacheCreationTokens` — gdy adapter Anthropic zwraca statystyki cache, obecnie w ścieżce `parseAnthropicResponseWithTools`) oraz **`systemFingerprint`** (pole kontraktu; bieżące fabryki Anthropic/Google zwykle go nie wypełniają).

**SSE `done`:** może zawierać `usage` (z `totalTokens`), `toolCalls`, `finishReason` (jak wyżej), opcjonalnie `systemFingerprint`. W czacie standardowym `done` bywa pusty `{}` tylko gdy brak metadanych końcowych.

**Cache i fallback:** żądania z toolingiem (`isToolingRequest`) **pomijają cache** i **nie używają fallbacku** w `POST /api/v1/chat`. Streaming **nadal** stosuje fallback z YAML.

Fasady OpenAI / Anthropic mapują `tools`, `tool_calls`, bloki `tool_use` / `tool_result` na ten sam kontrakt wewnętrzny — patrz `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`.

**Spójny opis warstw promptu:** `konfiguracja.md`, `architektura.md`.

---

## Modele i wybór providera

Klient podaje **`modelAlias`** z **`gateway.config.yaml`**. Rejestr: `ProviderRegistryService.resolve()` — lookup po **`models[].providerInstance`**, nie po `type`. Runtime: fabryki `anthropic` / `google` tworzone w `ProviderInstancesBootstrap` (`ProvidersModule`).

**Odporność:** `policy.timeoutMs` i `policy.retry` z YAML są egzekwowane przez **`ResilientExecutor`**. Opcjonalny **`models[].fallback`**: po wyczerpaniu prób gateway próbuje alias zapasowy; przy sukcesie — opcjonalne **`effectiveModelAlias`**. **Fallback jest wyłączony** dla żądań z toolingiem w czacie standardowym (`isToolingRequest`); w streamingu fallback pozostaje aktywny.

---

## `POST /api/v1/chat` — standard

### Request body

Zgodnie z DTO: **`modelAlias`** (string), **`messages`** (tablica **od 1 do 150** wiadomości) — role `user` | `assistant` | `tool` (patrz sekcja wyżej), opcjonalnie **`tooling`**, **`params`**, **`conversationId`** w formacie **`conv_<uuid>`** (walidacja regex w `ChatRequestDto`): w **request** włącza grupowanie Sentry; bez niego span = pojedyncza wiadomość. Od **drugiej tury** z `conversationId` klient powinien wysłać **pełną** historię w `messages[]` (w tym odpowiedzi `assistant` i tury `tool`). Szczegóły: **`conversation-tracking.md`**. Opcjonalnie **`metadata`** — obiekt klucz–wartość (`string` | `number` | `boolean`); propagowany do adaptera (`buildProviderInputForAlias`). **Anthropic** mapuje `metadata.userId` → `messages.create({ metadata: { user_id } })`; **Google** obecnie ignoruje.

Opcjonalnie **`params`** (`src/chat/dto/chat-params.dto.ts`, `response-format.dto.ts`): zagnieżdżony obiekt z opcjonalnymi polami **`temperature`** (0–2), **`maxOutputTokens`** (1–8192), **`topP`** (0–1), **`stop`** (string \| string[]), **`frequencyPenalty`** / **`presencePenalty`** (-2–2), **`seed`** (integer 0–2³²−1), **`responseFormat`** (`{ type: "text" | "json_object", jsonSchema?: object }`). Wartości efektywne = merge **`policy.params.defaults`** z YAML ← nadpisanie z body tylko dla pól w **`allowOverrides`**; po merge **clamp** do **`bounds`** (`resolveProviderCallOptions`). Niedozwolone pole w body → **`400`** + **`MODEL_NOT_ALLOWED`** — w czacie standardowym sprawdzane **przed** wywołaniem providera. **Które pola trafiają do SDK** zależy od **`providerInstance`** aliasu (Anthropic / Google; OpenAI adapter planowany) — macierz: **`dictionary.md`**, reguły YAML: **`konfiguracja.md`**. **`frequencyPenalty` / `presencePenalty`**: akceptowane w API; adaptery `anthropic` / `google` nie przekazują ich do SDK. **`responseFormat`**: mapowane do SDK Anthropic (`output_config.format`) i Google (`response_format` / `response_schema`) gdy `type === json_object`. Nadwyżkowe pola w body → **`400`** (`ValidationPipe`: `whitelist` + `forbidNonWhitelisted`). Limit body: **1 MB**.

### Response (`200`)

`ChatService.executeChat`: `id`, **`provider`** (identyfikator **`providerInstance`** z YAML), `model` (żądany `modelAlias`), opcjonalnie **`effectiveModelAlias`**, opcjonalnie **`toolCalls`**, **`finishReason`**, **`usageDetails`**, **`systemFingerprint`**, `output`, `usage`, `requestId`, **`conversationId`**.

**Cache (opcjonalny):** lookup przed wywołaniem providera; **pomijany** dla żądań z toolingiem. Przy trafieniu — gdy alias i provider są **włączone** w YAML — zwracany JSON z **`cached: true`**, **`cachedAt`**. Streaming nie jest cache’owany.

**Cooldown po 429 od providera** (`SmartRateLimiterService.setCooldown`) jest ustawiany w `ChatService.executeChat` po błędzie upstream — **nie** dotyczy `executeStream` (brak przekazania klucza do `handleProviderError` w streamingu).

Pole **`model`** to **alias** z żądania (`modelAlias`) zarówno w odpowiedzi standardowej, jak i w SSE (`meta.model`) — vendorowy `modelId` nie jest zwracany w żadnej odpowiedzi. SSE **`meta`** jest emitowane w `ChatProviderCallService.streamOnce` (pierwsze udane wywołanie w łańcuchu retry/fallback).

### Typowe kody

| HTTP | Kiedy |
|------|--------|
| 200 | Sukces |
| 400 | Walidacja DTO; nieznany `modelAlias` → `MODEL_ALIAS_NOT_FOUND`; niedozwolony override w `params` → `MODEL_NOT_ALLOWED`; tooling bez `capabilities.tools` → `TOOLS_NOT_SUPPORTED` |
| 401 | Brak nagłówka `X-Gateway-Key` (`GATEWAY_KEY_MISSING`) |
| 403 | Niepoprawny `X-Gateway-Key` (`GATEWAY_KEY_INVALID`) |
| 429 | Smart rate limit / cooldown (`RATE_LIMITED`) lub limit providera (`PROVIDER_RATE_LIMITED`) |
| 502 | M.in. `PROVIDER_UNSUPPORTED`, `PROVIDER_UNAVAILABLE` (w tym wyczerpanie retry+fallback) — `provider-error.mapper.ts`, `ResilientExecutor` |
| 504 | `PROVIDER_TIMEOUT` — przekroczony `policy.timeoutMs` (`ResilientExecutor`) |
| 500 | Nieobsłużony błąd (np. SDK); wyjątkowo brak allowlisty kluczy (`GATEWAY_KEY_NOT_CONFIGURED`) |

---

## `POST /api/v1/chat/stream` — SSE

**Kontroler:** `ChatStreamController` + `StreamCleanupInterceptor` (zwolnienie slotu streamu w `finalize`).

Przepływ: `validateForStreaming(modelAlias)` → nagłówki SSE + **`flushHeaders()`** → `executeStream`. Body jak dla czatu standardowego (w tym opcjonalne **`conversationId`** — `conversation-tracking.md`).

**Zdarzenia:** `meta` → `delta`* → `done`. W **`meta`**: `id`, `provider`, `model`, opcjonalnie **`effectiveModelAlias`**, `requestId`, **`conversationId`**. W **`done`**: opcjonalnie `usage` (z `totalTokens`), **`toolCalls`**, **`finishReason`**, **`systemFingerprint`**. Retry/fallback — `ResilientExecutor` (fallback aktywny także przy tooling w streamingu).

**Błędy i JSON `ErrorEnvelope`:**

- **Przed SSE (pewny JSON):** `ValidationPipe`, guardy (`GatewayKeyGuard`, `SmartRateLimitGuard`), **`validateForStreaming`** — m.in. `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`.
- **Po `flushHeaders`:** błędy z **`executeStream`** / **`ChatProviderCallService.streamOnce`** — m.in. `MODEL_NOT_ALLOWED` (niedozwolone pole w `params` sprawdzane dopiero w `resolveProviderCallOptions` wewnątrz `streamOnce`), błędy providera (`PROVIDER_*`), timeout (`PROVIDER_TIMEOUT`), wyczerpanie retry+fallback (`PROVIDER_UNAVAILABLE`). Klient może dostać **częściowy** strumień (`meta` / `delta`) zamiast poprawnego JSON; połączenie kończy się w `finally` kontrolera (`res.end()`).

Patrz: `src/chat/chat-stream.controller.ts`, `src/chat/chat.service.ts`, `src/chat/chat-provider-call.service.ts`.

---

## `GET /api/v1/health`

Liveness — `HealthService.getLiveness()`: `{ status: "healthy", timestamp }`. Pole **`timestamp`** to **`new Date().toISOString()`** (ISO 8601, UTC), nie locale string.

## `GET /api/v1/health/ready`

Readiness — `HealthService.getReadiness()`: `status` (`ready` | `not_ready`), `timestamp` (ISO 8601), `version`, `uptime`, `checks` (`config`, `cache`).

| Aspekt | Zachowanie w kodzie |
|--------|---------------------|
| **HTTP** | Zawsze **200** — gotowość oceniasz po polu **`status`** w body (`ready` / `not_ready`), nie po kodzie HTTP. |
| **`checks.config`** | **`healthy`** gdy załadowane są **`gateway`** i **`resolvedSystemPrompts`** (typowy start po poprawnym YAML). **`unhealthy`** gdy brakuje któregoś z tych obiektów w config — wtedy body często ma `status: not_ready`. Implementacja: `HealthService.checkConfig`. |
| **`checks.cache`** | Gdy cache wyłączony (`noop`) → **`healthy`** („Cache disabled”). Gdy backend `redis` włączony, ale adapter niedostępny → **`degraded`** — **nie** blokuje `ready` (traktowane jak OK w `allHealthy`). **Nie** jest to osobny probe smart rate limit; limitery mogą używać tego samego `RedisConnectionService` (`RateLimitModule` importuje `RedisCacheModule`). |

Orchestrator powinien traktować instancję jako gotową tylko przy `status === "ready"` w JSON.

---

## Fasady integracji (IDE)

Osobne kontrakty HTTP dla narzędzi IDE — **uwzględnione w `openapi.json`** (tagi **OpenAI API**, **Anthropic API**) oraz w Swagger UI (`/api/v1/api-docs`).

| Powierzchnia | Ścieżki (prefiks `/api/v1`) | Auth w OpenAPI | Błędy w spec |
|--------------|----------------------------|----------------|--------------|
| OpenAI | `/openai/models`, `/openai/models/{model}`, `/openai/chat/completions` | `BearerAuth` | `OpenAiErrorResponseDto` (`ApiOpenAiErrorResponses`) |
| Anthropic | `/anthropic/models`, `/anthropic/models/{model}`, `/anthropic/messages` | `ApiKeyAuth` (`x-api-key`) | `AnthropicErrorResponseDto` (`ApiAnthropicErrorResponses`) |

| Powierzchnia | Dokumentacja operacyjna |
|--------------|------------------------|
| OpenAI | `integracja-openai-kontrakt.md` |
| Anthropic | `integracja-anthropic-messages.md` |
| Architektura wspólna | `integracje.md` |

Wewnętrznie fasady wywołują ten sam **`ChatService`** co `POST /chat`. Pole **`model`** w żądaniu vendora = **`modelAlias`** z YAML. Runtime: błędy w kształcie OpenAI / Anthropic (`OpenAiExceptionFilter`, `AnthropicExceptionFilter`) — nie `ErrorEnvelope`. Streaming opisany w OpenAPI przez stałe `OPENAI_STREAM_API_DESCRIPTION` / `ANTHROPIC_STREAM_API_DESCRIPTION` (`src/integrations/*/helpers/*-stream-api-description.ts`).

---

## Kody i słownik

Stabilne kody maszynowe — **`dictionary.md`**. **`GlobalExceptionFilter`** zachowuje **`code`** z obiektowego payloadu wyjątku (m.in. `GATEWAY_KEY_*`, `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `PROVIDER_UNSUPPORTED`), w przeciwnym razie stosuje mapowanie ze statusu HTTP (`DEFAULT_HTTP_STATUS_TO_CODE`).

---

## Uwagi dla klientów

1. Używaj **`openapi.json`** do generatorów i integracji — wybierz właściwy **`securityScheme`**: `GatewayKeyAuth` (czat natywny), `BearerAuth` (OpenAI), `ApiKeyAuth` (Anthropic).
2. Do **`POST /api/v1/chat`** i **`POST /api/v1/chat/stream`** dołącz nagłówek **`X-Gateway-Key`** z wartością operatora (allowlista — `konfiguracja.md`).
3. **`params`** w body są opcjonalne — bez nich używane są wyłącznie `policy.params.defaults` z YAML; override wymaga wpisu pola w `allowOverrides` dla aliasu (`konfiguracja.md`). **Skutek u vendora** zależy od providera aliasu (np. Anthropic odrzuca jednoczesne `temperature` + `topP`) — `dictionary.md`.
4. Przy włączonym cache powtórzone **`POST /api/v1/chat`** z tym samym body mogą zwrócić odpowiedź z **`cached: true`** bez wywołania providera (`konfiguracja.md`).
5. Nie polegaj na **`role=system`** w `messages[]` — jest odrzucane; politykę systemową ustala operator w `src/config/system-prompt/`.
6. Przy streamingu składaj tekst z kolejnych `delta`; metadane końcowe (`usage`, `toolCalls`, `finishReason`, opcjonalnie `systemFingerprint`) są w evencie **`done`**.
7. **`usage`** może być niekompletne między providerami.
8. **`conversationId`**: w odpowiedzi zawsze (echo lub `conv_*`). W **request** — tylko wtedy Sentry grupuje turę jako konwersację; typowy start: tura 1 bez ID, tura 2+ z ID z odpowiedzi + pełne `messages[]` (`conversation-tracking.md`).
9. **Streaming:** nieprawidłowe `params` (poza `allowOverrides`) mogą zwrócić `MODEL_NOT_ALLOWED` **po** rozpoczęciu SSE — w czacie standardowym ten sam błąd jest **przed** wywołaniem providera.
10. **Readiness:** `GET /health/ready` zawsze **200** — sprawdzaj `body.status === "ready"`; pole w `checks` to **`cache`** (nie `redis`).
11. **Korelacja:** nagłówek odpowiedzi **`x-request-id`** = to samo ID co pole `requestId` w JSON (przy standardowym flow bez nadpisywania `requestId` w payloadzie wyjątku).

Powiązane: `lista_endpointów.md`, `architektura_api.md`, `integracje.md`, `konfiguracja.md`, `conversation-tracking.md`, `dokumentacja_koncepcyjna.md`.
