# Dokumentacja API — AI Provider Gateway

Wersja dokumentu: **1.6**. Dokument jest wersjonowany razem z kodem. **[`openapi.json`](../../openapi.json)** jest zsynchronizowany z **`src/`** — obejmuje **trzy powierzchnie API** (natywny czat + **models**, fasada OpenAI, fasada Anthropic) oraz health. **Metryki Prometheus** (`GET /metrics`) są poza OpenAPI — opis w tym dokumencie i w `deployment.md`. Schematy sukcesu i błędów pochodzą z dekoratorów `@Api*` na kontrolerach i DTO; rejestracja modeli w `src/swagger/swagger.setup.ts`.

## Źródła prawdy (kolejność)

1. **Kod NestJS** (`src/**/*.controller.ts`, serwisy, DTO) — dekoratory `@nestjs/swagger` na kontrolerach i klasach odpowiedzi (`@ApiProperty`, `@ApiOperation`, `@ApiGatewayChatErrorResponses`, `@ApiGatewayModelsErrorResponses`, `@ApiOpenAiErrorResponses`, `@ApiAnthropicErrorResponses`, `@ApiRequestIdHeader`, …). Konfiguracja dokumentu: `src/swagger/swagger.setup.ts` (`extraModels`, trzy `securitySchemes`).
2. **[`openapi.json`](../../openapi.json)** — kontrakt HTTP (OpenAPI 3.1) **generowany z kodu** (`npm run openapi:export` → `src/swagger/export-openapi.ts`). W runtime ten sam dokument serwowany jako `/api/v1/swagger.json` (gdy Swagger włączony).
3. **Swagger UI** — interaktywna dokumentacja pod `/api/v1/api-docs` (`setupSwagger` w `src/main.ts`; wyłączanie: `SWAGGER_ENABLED` — `konfiguracja.md`).
4. **`dokumentacja_koncepcyjna.md`** — zakres MVP/v1. W `src/` m.in.: `GlobalExceptionFilter`, **`RequestIdMiddleware`** (body + nagłówek odpowiedzi `x-request-id`), **`@GatewayKeyAndSmartRateLimit()`** (`GatewayKeyGuard` + `SmartRateLimitGuard`), mapowanie błędów SDK (`provider-error.mapper.ts`, kody **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`**), **`params` w body**, logging + **observability** (`src/observability/` — Sentry AI metrics, Prometheus app metrics, health gauges), readiness, graceful shutdown (`main.ts`). **Walidacja offline:** `npm run config:validate` (YAML + runtime) lub **`gateway config:validate`** (+ `validateEnvironment()`) — `konfiguracja.md`.
5. **Cache odpowiedzi** dla `POST /api/v1/chat` (`src/cache/`, backend `noop` / `redis`, odczyt walidowany `CachedChatResponseSchema` — `konfiguracja.md`). Dalszy rozwój warstwy Redis (limity, metryki, observability): `dokumentacja_koncepcyjna.md`.
6. **System prompt po stronie serwera** — wczytanie plików w `configuration.ts`, składanie w `composeSystemPrompt` / `buildProviderInputForAlias` (`src/chat/helpers/`).
7. **`spec/`** — SDD (wymagania; porównuj z `src/` i [`openapi.json`](../../openapi.json)).

## Podstawy

| Element                       | Wartość                                              |
| ----------------------------- | ---------------------------------------------------- |
| Bazowy URL (przykład lokalny) | `http://localhost:3000`                              |
| Prefiks API                   | `/api/v1` (`API_GLOBAL_PREFIX` w `src/setup.app.ts`) |
| Kodowanie                     | UTF‑8                                                |
| Standard                      | `application/json`                                   |
| Streaming                     | `text/event-stream` (`POST /api/v1/chat/stream`)     |

**Konfiguracja przy starcie:**

- **`gateway.config.yaml`** — wczytanie i walidacja Zod (`src/config/gateway-config.schema.ts`) + `buildEffectiveGatewayConfig` (`src/config/configuration.ts`): m.in. spójność `providers` ↔ `models` (niepuste `models`, alias → provider, włączony provider → ≥1 model). Po sklonowaniu uzupełnij plik ręcznie lub uruchom `gateway config:init` — szczegóły: `konfiguracja.md`.
- **Pliki system promptu** — `MASTER_SYSTEM_PROMPT.md` (wymagany), opcjonalnie `MAIN_SYSTEM_PROMPT.md` oraz `models/<modelAlias>.md` dla aliasów z YAML; treść składana w runtime (`composeSystemPrompt` w `src/chat/helpers/system-prompt.ts`). Szczegóły: `konfiguracja.md`.
- **Env** — każda włączona instancja providera w YAML wymaga klucza pod **`apiKeyRef`** (`provider-api-key.validation.ts`). Opcjonalnie zmienne **`CACHE_*`** / **`REDIS_*`** — `konfiguracja.md`.

**Nagłówek `X-Gateway-Key`:** **wymagany** dla czatu i katalogu modeli (`@GatewayKeyAndSmartRateLimit()` na kontrolerach `ChatController`, `ChatStreamController`, `ModelsController`). Allowlista: `buildGatewayKeyRuntime` w `configuration.ts`. Przy `RATE_LIMIT_SMART_ENABLED=true` i gotowym Redis — dodatkowo limity per klucz (`SmartRateLimitGuard`, `SmartRateLimiterService`; szczegóły `konfiguracja.md`). **`GET /api/v1/health`** i **`GET /api/v1/health/ready`** — bez klucza (guardy czatu/models ich nie obejmują).

**`requestId`:** `RequestIdMiddleware` ustawia `req.requestId` z nagłówka żądania **`x-request-id`** (jeśli niepusty) lub generuje `req_<uuid>`, oraz ustawia **nagłówek odpowiedzi** `x-request-id` na tę samą wartość (`src/common/middleware/request-id.middleware.ts`). Pole **`requestId`** w JSON (sukces, błąd, SSE `meta`) pochodzi z `req.requestId`. Klient może korelować logi po nagłówku odpowiedzi lub po polu w body.

---

## Format błędów

Wszystkie odpowiedzi błędów obsłużone przez `GlobalExceptionFilter` jako JSON są w envelope **`ErrorEnvelope`** (`openapi.json`) — patrz `src/common/filters/http-exception.filter.ts` (rejestracja: `APP_FILTER` w `src/app.module.ts`). **Uwaga:** przy `POST /api/v1/chat/stream` cooldown i błędy `resolveStreamCache` wracają jako JSON **przed** SSE; błędy live miss mogą powstać **po** `flushHeaders` (patrz sekcja streamingu).

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

| HTTP | `code` (domyślnie)                                                                            |
| ---- | --------------------------------------------------------------------------------------------- |
| 400  | `VALIDATION_FAILED` _(gdy wyjątek nie nadpisuje `code`; inaczej np. `MODEL_ALIAS_NOT_FOUND`)_ |
| 401  | `PROVIDER_AUTH_FAILED`\*                                                                      |
| 403  | `GATEWAY_KEY_INVALID`\*                                                                       |
| 429  | `RATE_LIMITED` (gateway), `PROVIDER_RATE_LIMITED` (upstream)                                  |
| 502  | `PROVIDER_UNAVAILABLE`                                                                        |
| 504  | `PROVIDER_TIMEOUT`                                                                            |
| inne | `INTERNAL_SERVER_ERROR`                                                                       |

\* Przy guardzie klucza i jawnych kodach w payloadzie wyjątku używane są **`GATEWAY_KEY_MISSING`** / **`GATEWAY_KEY_INVALID`**, nie wartości z tej tabeli.

Przy walidacji `ValidationPipe` źródłowe `message` bywa tablicą stringów; **`GlobalExceptionFilter`** emituje **`message` jako jeden string** (`array.join('; ')`). Pełny słownik kodów — `dictionary.md`.

---

### System prompt, role w `messages[]` i tool calling

**Rola `system`:** zablokowana w API (walidacja `400`). Instrukcja systemowa jest **składana po stronie serwera** w `composeSystemPrompt` (`src/chat/helpers/system-prompt.ts`) i przekazywana adapterom przez `buildProviderInputForAlias` (`src/chat/helpers/provider-input.ts`).

**Role w `messages[]`:** `user`, `assistant`, `tool` (`ChatMessageDto`):

| Rola        | Pola                                   | Limity           |
| ----------- | -------------------------------------- | ---------------- |
| `user`      | `content`                              | max 3000 znaków  |
| `assistant` | `content`; opcjonalnie `toolCalls[]`   | max 3000 znaków  |
| `tool`      | `content`, **`toolCallId`** (wymagane) | max 32000 znaków |

**Pole `tooling` (opcjonalne):** obiekt z `definitions[]` (`name`, `description?`, `parameters` — JSON Schema) oraz opcjonalnym `toolChoice`. Włącza function calling — alias musi mieć **`capabilities.tools: true`** w YAML; inaczej **`400`** + **`TOOLS_NOT_SUPPORTED`**.

**Odpowiedź:** opcjonalne **`toolCalls`** (`id`, `name`, `arguments` jako JSON string) oraz **`finishReason`**. W runtime gateway mapuje `stopReason` providera funkcją **`mapStopReasonToFinishReason`** (`src/chat/helpers/map-provider-finish-reason.ts`) na znormalizowany typ **`GatewayFinishReason`** (`src/chat/types/gateway-finish-reason.type.ts`):

| Wartość gateway      | Typowe źródła `stopReason` providera                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **`stop`**           | `end_turn`, `stop_sequence`, `pause_turn`, `stop`, `insufficient_system_resource`, brak / nieznane |
| **`tool_calls`**     | `tool_use`, `tool_calls` lub obecność `toolCalls[]`                                                |
| **`length`**         | `max_tokens`, `length`                                                                             |
| **`content_filter`** | `refusal`, `content_filter`                                                                        |

Enum w OpenAPI/DTO może zawierać dodatkowe wartości vendora — **emitowane w natywnym API są wyłącznie powyższe cztery**. Fasada Anthropic mapuje `content_filter` → `stop_reason: refusal` (`anthropic-stop-reason.mapper.ts`).

Opcjonalnie w odpowiedzi JSON: **`usageDetails`** (`promptCacheHitTokens`, `promptCacheCreationTokens` — gdy adapter Anthropic zwraca statystyki cache, obecnie w ścieżce `parseAnthropicResponseWithTools`) oraz **`systemFingerprint`** — opcjonalne, **provider-specific**: w praktyce wypełniane gdy upstream zwraca odpowiednik OpenAI `system_fingerprint` (adapter `type: openai` / `openai-compatible` — Chat Completions). **Anthropic i Google Gemini nie mają tego pola** — przy aliasach na te providery pole **nie występuje** w odpowiedzi (gateway pomija klucz). Nie mylić z `model` / `modelVersion` z Gemini. Szczegóły: **`dictionary.md`** (sekcja „`systemFingerprint` — semantyka i providerzy”).

**SSE `done`:** może zawierać `usage` (z `totalTokens`), `toolCalls`, `finishReason` (jak wyżej), opcjonalnie `systemFingerprint` (te same reguły co w JSON). W czacie standardowym `done` bywa pusty `{}` tylko gdy brak metadanych końcowych.

**Cache i fallback:** żądania z toolingiem (`isToolingRequest`) **pomijają cache** i **nie używają fallbacku** w `POST /api/v1/chat`. Streaming **nadal** stosuje fallback z YAML.

Fasady OpenAI / Anthropic mapują `tools`, `tool_calls`, bloki `tool_use` / `tool_result` na ten sam kontrakt wewnętrzny — patrz `integracja_openai_kontrakt.md`, `integracja_anthropic_messages.md`.

**Spójny opis warstw promptu:** `konfiguracja.md`, `architektura.md`.

---

## Różnice natywny API vs fasady oficjalnych kontraktów

| Aspekt                                     | Natywny (`/api/v1/chat`)                                                         | Fasady OpenAI/Anthropic                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Max wiadomości                             | 150                                                                              | 15000                                                                          |
| Max długość `content` (user/assistant)     | 3000 znaków                                                                      | 128000 znaków                                                                  |
| Max długość `content` (tool)               | 32000 znaków                                                                     | 128000 znaków                                                                  |
| Pole `warnings` w response                 | Tak (`warnings[].code` — string w JSON; wewnętrznie `WarningCode`, np. `PARAM_IGNORED_BY_PROVIDER`) | Nie (zgodność z vendorem)                                                      |
| `systemFingerprint` / `system_fingerprint` | Opcjonalnie w JSON i SSE `done` — tylko gdy upstream zwraca (praktycznie OpenAI) | OpenAI fasada: `system_fingerprint` gdy ustawione; Anthropic fasada: brak pola |
| System prompt                              | Serwer                                                                           | Serwer (ignorowane z body)                                                     |

**Uzasadnienie:** Fasady oficjalnych kontraktów są zaprojektowane dla długich konwersacji i dużych kontekstów (IDE takie jak Cursor lub Claude Code oraz inne klienty tych kontraktów vendora), podczas gdy natywne API ma konserwatywne limity dla własnych aplikacji. Szczegóły profili walidacji: `integracje.md`; implementacja: `validateChatIngress()` w `src/chat/validation/chat-ingress.validator.ts` (profile przekazywane z kontrolerów do `ChatService`).

---

## Modele i wybór providera

Klient podaje **`modelAlias`** z **`gateway.config.yaml`**. Rejestr: `ProviderRegistryService.resolve()` — lookup po **`models[].providerInstance`**, nie po `type`. Runtime: fabryki `anthropic` / `google` tworzone w `ProviderInstancesBootstrap` (`ProvidersModule`).

**Odporność:** `policy.timeoutMs` i `policy.retry` z YAML są egzekwowane przez **`ResilientExecutor`** (`src/chat/resilience/`). Po upływie `timeoutMs` gateway anuluje bieżącą próbę przez **`AbortSignal`** (przekazywany do `ChatProviderCallService` → adapter SDK: Anthropic/OpenAI `{ signal }`, Google `config.abortSignal`) i zwraca **`PROVIDER_TIMEOUT`** (504). Opcjonalny **`models[].fallback`**: po wyczerpaniu prób gateway próbuje alias zapasowy (jeden hop); przy sukcesie — opcjonalne **`effectiveModelAlias`**. **Fallback jest wyłączony** dla żądań z toolingiem — zarówno w czacie standardowym (`executeChat`), jak i w streamingu (`executeStream`; `isToolingRequest` → `fallbackAlias: undefined`).

---

## `POST /api/v1/chat` — standard

### Request body

Zgodnie z DTO: **`modelAlias`** (string), **`messages`** (tablica **od 1 do 150** wiadomości) — role `user` | `assistant` | `tool` (patrz sekcja wyżej), opcjonalnie **`tooling`**, **`params`**, **`conversationId`** w formacie **`conv_<uuid>`** (walidacja regex w `ChatRequestDto`): w **request** włącza grupowanie Sentry; bez niego span = pojedyncza wiadomość. Od **drugiej tury** z `conversationId` klient powinien wysłać **pełną** historię w `messages[]` (w tym odpowiedzi `assistant` i tury `tool`). Szczegóły: **`conversation_tracking.md`**. Opcjonalnie **`metadata`** — obiekt klucz–wartość (`string` | `number` | `boolean`); propagowany do adaptera (`buildProviderInputForAlias`). **Anthropic** mapuje `metadata.userId` → `messages.create({ metadata: { user_id } })`; **Google** obecnie ignoruje.

Opcjonalnie **`params`** (`src/chat/dto/chat-params.dto.ts`, `response-format.dto.ts`): zagnieżdżony obiekt z opcjonalnymi polami **`temperature`** (0–2), **`maxOutputTokens`** (1–8192), **`topP`** (0–1), **`topK`** (integer ≥0), **`stop`** (string \| string[]), **`frequencyPenalty`** / **`presencePenalty`** (-2–2), **`seed`** (integer 0–2³²−1), **`responseFormat`** (`{ type: "text" | "json_object", jsonSchema?: object }`). Wartości efektywne: merge **`policy.params.defaults`** z YAML ← nadpisanie z body dla pól w **`allowOverrides`** (dotyczy `temperature`, `maxOutputTokens`, `topP`, `frequencyPenalty`, `presencePenalty`, `seed`); pola **`topK`**, **`stop`**, **`responseFormat`** — **tylko z body** (brak merge z YAML `defaults`); po merge **clamp** do **`bounds`** (`resolveProviderCallOptions`). Niedozwolone pole w body → **`400`** + **`MODEL_NOT_ALLOWED`** — w czacie standardowym sprawdzane **przed** wywołaniem providera. **Które pola trafiają do SDK** zależy od **`providerInstance`** aliasu (Anthropic / Google / OpenAI / OpenAI-compatible) — macierz: **`dictionary.md`**, reguły YAML: **`konfiguracja.md`**. **`frequencyPenalty` / `presencePenalty`**: akceptowane w API; adaptery `anthropic` / `google` nie przekazują ich do SDK (OpenAI — przekazuje). **`topK`**: Anthropic (priorytet nad `topP` / `temperature`) i Google; OpenAI ignoruje. **`responseFormat`**: mapowane do SDK Anthropic (`output_config.format`), Google (`response_format` / `response_schema`) i OpenAI (`response_format` / Responses `text.format`) gdy `type === json_object`. Nadwyżkowe pola w body → **`400`** (`ValidationPipe`: `whitelist` + `forbidNonWhitelisted`). Limit body: **1 MB**.

### Response (`201`)

Udana odpowiedź JSON: **201 Created** — domyślne zachowanie NestJS dla `POST` bez `@HttpCode` (`ChatController` zwraca wynik z handlera; dekorator `@ApiResponse({ status: 201 })` w `src/chat/chat.controller.ts`). **`openapi.json`** i Swagger UI opisują ten sam kod. Streaming SSE — **200** (`POST /chat/stream`).

`ChatService.executeChat`: `id`, **`provider`** (identyfikator **`providerInstance`** z YAML), `model` (żądany `modelAlias`), opcjonalnie **`effectiveModelAlias`**, opcjonalnie **`toolCalls`**, **`finishReason`**, **`usageDetails`**, opcjonalnie **`systemFingerprint`** (tylko gdy adapter upstream je dostarczy — patrz `dictionary.md`), `output`, `usage`, `requestId`, **`conversationId`**.

**Cache (opcjonalny):** lookup przed wywołaniem providera; **pomijany** dla żądań z toolingiem. Przy trafieniu — gdy alias i provider są **włączone** w YAML — zwracany JSON z **`cached: true`**, **`cachedAt`** i **`cacheSource`** (`"exact"` albo `"semantic"`), albo na streamie SSE `meta` z tymi polami (replay 64 znaki). **`requestId`** w hicie = bieżące żądanie (nie z Redis); **`id`** = z payloadu. Zapis tylko dokończonej odpowiedzi tekstowej (`finishReason=stop`, niepusty tekst, bez `toolCalls`). Przy missie providera pola cache są nieobecne i **nie** są zapisywane w Redis. Odczyt z backendu parsowany przez **`parseCachedChatResponse`** (`CachedChatResponseSchema`); niepoprawny lub nieserwowalny wpis usuwany. Streaming native i fasady (`stream: true`) używają **wspólnego** magazynu z JSON; zapis Redis: first-writer-wins (`SET NX` / `HSETNX`). Fasady OpenAI/Anthropic **nie** eksponują `cacheSource` w body vendora — sygnał to nagłówek **`X-Gateway-Cache`** (JSON i stream).

**Cooldown po 429 od providera** (`SmartRateLimiterService.setCooldown`) jest ustawiany w **`ChatErrorHandlerService.handleProviderError`** po błędzie upstream — dotyczy **`executeChat` i `executeStream`** (w obu ścieżkach przekazywany jest `gatewayKey`). Wspólne sprawdzenie cooldownu przed wywołaniem: `prepareRequestForExecution` → `checkCooldown`.

Pole **`model`** to **alias** z żądania (`modelAlias`) zarówno w odpowiedzi standardowej, jak i w SSE (`meta.model`) — vendorowy `modelId` nie jest zwracany w żadnej odpowiedzi. SSE **`meta`** na live miss jest emitowane w `ChatProviderCallService.streamOnce` (pierwsze udane wywołanie w łańcuchu retry/fallback); na hicie cache — w `StreamCacheReplayService`.

### Typowe kody

| HTTP | Kiedy                                                                                                                                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 201  | Sukces (domyślny kod NestJS dla `POST` bez `@HttpCode`)                                                                                                                          |
| 200  | Sukces streamingu SSE (`POST /chat/stream`)                                                                                                                                      |
| 400  | Walidacja DTO; nieznany `modelAlias` → `MODEL_ALIAS_NOT_FOUND`; niedozwolony override w `params` → `MODEL_NOT_ALLOWED`; tooling bez `capabilities.tools` → `TOOLS_NOT_SUPPORTED` |
| 401  | Brak nagłówka `X-Gateway-Key` (`GATEWAY_KEY_MISSING`)                                                                                                                            |
| 403  | Niepoprawny `X-Gateway-Key` (`GATEWAY_KEY_INVALID`)                                                                                                                              |
| 429  | Smart rate limit / cooldown (`RATE_LIMITED`) lub limit providera (`PROVIDER_RATE_LIMITED`)                                                                                       |
| 502  | M.in. `PROVIDER_UNSUPPORTED`, `PROVIDER_UNAVAILABLE` (w tym wyczerpanie retry+fallback) — `provider-error.mapper.ts`, `ResilientExecutor`                                        |
| 504  | `PROVIDER_TIMEOUT` — przekroczony `policy.timeoutMs` (`ResilientExecutor` + `AbortSignal` do SDK)                                                                                  |
| 500  | Nieobsłużony błąd (np. SDK); wyjątkowo brak allowlisty kluczy (`GATEWAY_KEY_NOT_CONFIGURED`)                                                                                     |

---

## `POST /api/v1/chat/stream` — SSE

**Kontroler:** `ChatStreamController` + `StreamCleanupInterceptor` (zwolnienie slotu streamu w `finalize`).

Przepływ: `validateForStreaming(modelAlias)` → **`resolveStreamCache`** (prepare + cooldown + lookup cache) → nagłówki SSE + **`flushHeaders()`** → hit: **`replayStreamCacheHit`** / miss: **`executeStreamMiss`**. Body jak dla czatu standardowego (w tym opcjonalne **`conversationId`** — `conversation_tracking.md`).

**Zdarzenia:** `meta` → `delta`\* → `done`. W **`meta`**: `id`, `provider`, `model`, opcjonalnie **`effectiveModelAlias`**, `requestId`, **`conversationId`**; przy hicie cache dodatkowo **`cached: true`**, **`cachedAt`**, **`cacheSource`** (`exact` | `semantic`) — tekst w `delta` z replay chunkami po 64 znaki. W **`done`**: opcjonalnie `usage` (z `totalTokens`), **`toolCalls`**, **`finishReason`**, opcjonalnie **`systemFingerprint`** (reguły jak w JSON powyżej). Retry/fallback — `ResilientExecutor` (fallback wyłączony przy tooling, jak w JSON); po udanym missie zapis do wspólnego magazynu gdy `!didFallback`.

**Błędy i JSON `ErrorEnvelope`:**

- **Przed SSE (pewny JSON):** `ValidationPipe`, guardy (`GatewayKeyGuard`, `SmartRateLimitGuard`), **`validateForStreaming`**, **`resolveStreamCache`** (cooldown → `RATE_LIMITED`) — m.in. `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `RATE_LIMITED`.
- **Po `flushHeaders`:** błędy z **`executeStreamMiss`** / **`ChatProviderCallService.streamOnce`** — m.in. `MODEL_NOT_ALLOWED` (niedozwolone pole w `params` sprawdzane dopiero w `resolveProviderCallOptions` wewnątrz `streamOnce`), błędy providera (`PROVIDER_*`), timeout (`PROVIDER_TIMEOUT`), wyczerpanie retry+fallback (`PROVIDER_UNAVAILABLE`). Klient może dostać **częściowy** strumień (`meta` / `delta`) zamiast poprawnego JSON; połączenie kończy się w `finally` kontrolera (`res.end()`).

Patrz: `src/chat/chat-stream.controller.ts`, `src/chat/chat.service.ts`, `src/chat/services/stream-cache-replay.service.ts`, `src/chat/services/chat-provider-call.service.ts`.

---

## `GET /api/v1/health`

Liveness — `HealthService.getLiveness()`: `{ status: "healthy", timestamp }`. Pole **`timestamp`** to **`new Date().toISOString()`** (ISO 8601, UTC), nie locale string.

## `GET /api/v1/health/ready`

Readiness — `HealthService.getReadiness()`: `status` (`ready` | `not_ready`), `timestamp` (ISO 8601), `version`, `uptime`, `checks` (`config`, `redis`, `cache`, opcjonalnie `embeddings` i `vectorStore`).

| Aspekt              | Zachowanie w kodzie                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **HTTP**            | Zawsze **200** — gotowość oceniasz po polu **`status`** w body (`ready` / `not_ready`), nie po kodzie HTTP.                                                                                                                                                                                                                                                                          |
| **`checks.config`** | **`healthy`** gdy załadowane są **`gateway`** i **`resolvedSystemPrompts`** (typowy start po poprawnym YAML). **`unhealthy`** gdy brakuje któregoś z tych obiektów w config — wtedy body często ma `status: not_ready`. Implementacja: `HealthService.checkConfig`.                                                                                                                  |
| **`checks.redis`**  | **`required: false`** → **`healthy`**, „Redis not required”, bez probe. **`required: true`** → `RedisConnectionService.ping()`; **`healthy`** gdy PONG OK, **`degraded`** gdy połączenie/ping niedostępne — **nie** blokuje `ready`. Pole **`consumers`**: `cache`, `rate-limit`, `semantic-cache` (kto wymaga Redis w tym deploymencie). Implementacja: `isRedisRequiredFromConfig()` + `checkRedis`. |
| **`checks.cache`**  | Agregat **włączonych** warstw pipeline cache (exact Redis KV i/lub semantic embeddings + vectorStore). Obie wyłączone → **`healthy`** („Cache disabled (noop)”). `healthy` tylko gdy **wszystkie włączone** warstwy działają; inaczej **`degraded`** z listą `exact-redis`, `embeddings` i/lub `vectorStore`. Brak backendu `memory` / innych. **`degraded`** nie blokuje `ready`.                                                                                                   |
| **`checks.embeddings`** | Obecne tylko gdy `SEMANTIC_CACHE_ENABLED=true`. Sprawdza dostępność serwisu embeddingów Ollama (`EMBEDDING_BASE_URL`, domyślnie `qwen3-embedding:0.6b`). **`healthy`** przy sukcesie, **`degraded`** gdy niedostępny — **fail-open**: stan degraded **nie** blokuje `ready`. Probe **nie** resetuje obwodu embeddingu. Pole nieobecne gdy cache semantyczny wyłączony. `consumers` w `checks.redis` zawiera `semantic-cache` gdy włączony. |
| **`checks.vectorStore`** | Obecne tylko gdy `SEMANTIC_CACHE_ENABLED=true`. Sprawdza Redis Search / skonfigurowany indeks wektorowy (`FT.INFO` po leniwym `ensureIndex`). **`healthy`** gdy indeks dostępny; **`degraded`** gdy brak modułu Search lub indeksu (zwykły Redis → czytelny komunikat o braku `FT.*`) — **fail-open**, **nie** blokuje `ready`. `MODULE LIST` pozostaje checklistą Compose, nie jedynym sygnałem. |

Orchestrator powinien traktować instancję jako gotową tylko przy `status === "ready"` w JSON.

Po każdej ewaluacji readiness (`getReadiness()` lub hook przy `GET /metrics`) wywoływane jest `HealthService.publishMetrics()` — aktualizacja gauge'ów `gateway_readiness` i `gateway_health_status` w Prometheus (log tylko przy zmianie agregatu `ready` ↔ `not_ready`).

---

## `GET /metrics` — Prometheus (poza `/api/v1`)

**Kontroler:** `MetricsController` (`src/observability/app-metrics/metrics.controller.ts`). **Bez** `X-Gateway-Key` — wyłączone z globalnego prefiksu w `setup.app.ts`.

| Aspekt | Zachowanie |
|--------|------------|
| **Format** | Prometheus text exposition (`Content-Type: text/plain; version=0.0.4`) |
| **Backend** | `PrometheusAppMetricsAdapter` w production / `METRICS_BACKEND=prometheus`; dev domyślnie noop (pusty body) |
| **Health gauges** | Przed `getMetricsSnapshot()` — `PreMetricsScrapeRegistry.runAll()` → `HealthService.refreshMetricsForScrape()` (throttle 5s; pełny check bez throttle na `GET /ready`) |
| **Przykładowe metryki** | `gateway_readiness`, `gateway_health_status{component="config\|redis\|cache\|embeddings\|vectorStore"}`, exact cache hit/miss, semantic hit / hash-hit / below-threshold / error / skip, `gateway_requests_total`, `gateway_tokens_total`, `gateway_nodejs_*` |
| **Monitoring stack** | `deployment/monitoring/prometheus.yml`, alerty: `alerts.yml` — `deployment.md` |

---

## `GET /api/v1/models` — katalog aliasów

**Moduł:** `ModelsModule` (`src/models/`). **Serwis:** `GatewayModelsCatalogService` — odczyt `gateway.config.yaml` (bez wywołań SDK providerów).

### `GET /api/v1/models`

|          |                                   |
| -------- | --------------------------------- |
| **Auth** | `X-Gateway-Key`                   |
| **200**  | `{ "models": GatewayModelDto[] }` |

Pola **`GatewayModelDto`**:

| Pole               | Opis                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| `modelAlias`       | publiczny alias z YAML                                                      |
| `providerInstance` | identyfikator instancji w `providers[]`                                     |
| `providerType`     | `anthropic` \| `google` \| `openai` \| `gateway` (gdy brak wpisu providera) |
| `modelId`          | vendorowy identyfikator modelu dla adaptera runtime                         |
| `capabilities`     | opcjonalnie: `streaming`, `tools`, `thinking`                               |
| `fallback`         | opcjonalny alias zapasowy z `models[].fallback`                             |

### `GET /api/v1/models/:modelAlias`

| HTTP | Kiedy                                                          |
| ---- | -------------------------------------------------------------- |
| 200  | Znaleziony alias — pojedynczy `GatewayModelDto`                |
| 401  | Brak `X-Gateway-Key` (`GATEWAY_KEY_MISSING`)                   |
| 403  | Niepoprawny klucz (`GATEWAY_KEY_INVALID`)                      |
| 404  | Nieznany alias — **`MODEL_ALIAS_NOT_FOUND`** (`ErrorEnvelope`) |
| 429  | Smart rate limit (`RATE_LIMITED`)                              |

> **Różnica vs czat:** `POST /chat` z nieznanym `modelAlias` zwraca **400** + `MODEL_ALIAS_NOT_FOUND` (walidacja ingress przed LLM). Katalog modeli używa **404** dla nieistniejącego aliasu.

Fasady OpenAI (`GET /openai/models`) i Anthropic (`GET /anthropic/models`) zwracają **ten sam zestaw aliasów** w formacie vendora — mapowanie przez `openai-models.mapper.ts` / `anthropic-models.mapper.ts`. Szczegóły: `integracje.md`.

---

## Fasady oficjalnych kontraktów

Osobne kontrakty HTTP dla oficjalnych kształtów OpenAI / Anthropic (IDE i inne klienty) — **uwzględnione w `openapi.json`** (tagi **OpenAI API**, **Anthropic API**) oraz w Swagger UI (`/api/v1/api-docs`).

| Powierzchnia | Ścieżki (prefiks `/api/v1`)                                             | Auth w OpenAPI             | Błędy w spec                                               |
| ------------ | ----------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| OpenAI       | `/openai/models`, `/openai/models/{model}`, `/openai/chat/completions`  | `BearerAuth`               | `OpenAiErrorResponseDto` (`ApiOpenAiErrorResponses`)       |
| Anthropic    | `/anthropic/models`, `/anthropic/models/{model}`, `/anthropic/messages` | `ApiKeyAuth` (`x-api-key`) | `AnthropicErrorResponseDto` (`ApiAnthropicErrorResponses`) |

| Powierzchnia         | Dokumentacja operacyjna            |
| -------------------- | ---------------------------------- |
| OpenAI               | `integracja_openai_kontrakt.md`    |
| Anthropic            | `integracja_anthropic_messages.md` |
| Architektura wspólna | `integracje.md`                    |

Wewnętrznie fasady wywołują ten sam **`ChatService`** co `POST /chat`. Pole **`model`** w żądaniu vendora = **`modelAlias`** z YAML. Runtime: błędy w kształcie OpenAI / Anthropic (`OpenAiExceptionFilter`, `AnthropicExceptionFilter`) — nie `ErrorEnvelope`. Streaming opisany w OpenAPI przez stałe `OPENAI_STREAM_API_DESCRIPTION` / `ANTHROPIC_STREAM_API_DESCRIPTION` (`src/integrations/*/helpers/*-stream-api-description.ts`).

**Kody HTTP (fasady):** jak w natywnym czacie — **201** dla odpowiedzi JSON (`stream` false / pominięte; `@ApiResponse({ status: 201 })` w kontrolerach fasad), **200** dla SSE (`stream: true`; jawne `res.status(200)` w `handleStream`). OpenAPI deklaruje oba kody na jednej operacji (`POST .../chat/completions`, `POST .../messages`). _Uwaga:_ upstream OpenAI i Anthropic API zwracają przy sukcesie **200**; gateway celowo używa **201** na wszystkich udanych `POST` z JSON (spójność NestJS w całym serwisie).

---

## Extended Thinking Mode

Gateway wspiera extended thinking / reasoning dla modeli z głębokim rozumowaniem — **Anthropic Claude**, **Google Gemini 3.0+** oraz **OpenAI** (adapter `type: openai` przez Responses API w `responses.adapter.ts`).

### Provider support matrix

| Provider              | API                                 | Wspierane modele (przykłady)                                                | Status w Gateway                       | Thinking content w response                      |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| **Anthropic**         | `thinking` + `output_config.effort` | Claude Opus/Sonnet 4.5+                                                     | ✅ Pełne wsparcie                      | ✅ `thinkingContent` (JSON / SSE `done`)         |
| **Google Gemini**     | `ThinkingConfig`                    | Gemini 3.0+ (`capabilities.thinking: true`)                                 | ✅ Pełne wsparcie                      | ✅ `thinkingContent` gdy `includeThoughts: true` |
| **OpenAI**            | Responses API (`/v1/responses`)     | Modele obsługiwane przez Responses (np. `gpt-5*`, `o*`) przy `type: openai` | ✅ Pełne wsparcie (adapter runtime)    | ✅ `thinkingContent` (reasoning summary)         |
| **OpenAI-compatible** | Chat Completions                    | Zależy od backendu (np. Ollama)                                             | ❌ Brak mapowania thinking w adapterze | ❌                                               |

**Uwaga:** Fasada OpenAI (`POST /api/v1/openai/chat/completions`) mapuje `reasoning_effort` na `params.thinkingEnabled` / `params.thinkingBudget` (`openai-request.mapper.ts`). Efekt zależy od aliasu w YAML — działa, gdy alias wskazuje `providerInstance` z `type: openai` i ma `capabilities.thinking: true`.

### Włączanie thinking mode

**Gateway native API:**

```json
POST /api/v1/chat
{
  "modelAlias": "claude-sonnet",
  "messages": [{ "role": "user", "content": "Solve this complex problem..." }],
  "params": {
    "thinkingEnabled": true,
    "thinkingBudget": "medium"
  }
}
```

**Fasada OpenAI** (`reasoning_effort` → `params.thinking*`):

```json
POST /api/v1/openai/chat/completions
{
  "model": "gpt-cheap",
  "messages": [{ "role": "user", "content": "..." }],
  "reasoning_effort": "high"
}
```

Wymaga aliasu z `capabilities.thinking: true` i `providerInstance` typu `openai`. Numeryczny `thinkingBudget` w natywnym API dla OpenAI może wygenerować ostrzeżenie `PARAM_IGNORED_BY_PROVIDER` (effort mapowany ze stringa) — patrz `generation-warnings.ts`.

**Fasada Anthropic:**

```json
POST /api/v1/anthropic/messages
{
  "model": "claude-sonnet",
  "messages": [{ "role": "user", "content": "..." }],
  "thinking": {
    "type": "enabled",
    "budget_tokens": 5000
  },
  "output_config": {
    "effort": "high"
  }
}
```

### Parametry

**Gateway unified params:**

- **`thinkingEnabled`** (boolean): Włącza thinking mode
- **`thinkingBudget`** (string | number): Budżet/intensywność thinking:
  - **String:** `"none"` \| `"minimal"` \| `"low"` \| `"medium"` \| `"high"` \| `"xhigh"` \| `"max"`
  - **Number:** Integer token budget (min 1024, provider-specific)

**Vendor-specific mapping:**

| Gateway param            | Anthropic API                                 | Google Gemini API                           | OpenAI (`type: openai`, Responses)                                  |
| ------------------------ | --------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `thinkingEnabled: true`  | `thinking: { type: 'enabled' \| 'adaptive' }` | `thinkingConfig: { includeThoughts: true }` | `reasoning.effort` + `reasoning.summary: auto`                      |
| `thinkingBudget: number` | `thinking.budget_tokens` (min 1024)           | `thinkingConfig.thinkingBudget`             | Walidacja surface; numery mogą dać warning — preferuj string effort |
| `thinkingBudget: "low"`  | `output_config.effort: "low"`                 | `thinkingConfig.thinkingLevel: "LOW"`       | `reasoning.effort: "low"`                                           |
| `thinkingBudget: "high"` | `output_config.effort: "high"`                | `thinkingConfig.thinkingLevel: "HIGH"`      | `reasoning.effort: "high"`                                          |

### Response

Gdy model używa thinking mode, response może zawierać pole **`thinkingContent`**:

```json
{
  "id": "gw_abc123",
  "output": {
    "text": "Based on my analysis..."
  },
  "thinkingContent": "Let me break this down step by step...",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 2500
  }
}
```

**Provider-specific notes:**

- **Anthropic (natywny czat):** `thinkingContent` w JSON; w streamie — w evencie `done` (nie w deltach tekstu).
- **Anthropic (fasada):** JSON — blok `{ type: 'thinking', thinking: string }` w `content[]`. Stream — `thinking_delta` w fazie `done`.
- **Google Gemini:** Thoughts gdy `includeThoughts: true` (Gemini 3.0+).
- **OpenAI (`type: openai`):** Reasoning summary z Responses API → `thinkingContent`; w streamie — `getThinkingContent()` na `StreamResult` (`responses.adapter.ts`).

### Konfiguracja aliasu

Przykład Anthropic (z repozytorium `gateway.config.yaml`):

```yaml
models:
  claude-sonnet:
    providerInstance: anthropic
    modelId: claude-sonnet-4-5-20250929
    capabilities:
      streaming: true
      tools: true
      thinking: true
    policy:
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 1024
          thinkingEnabled: false
        allowOverrides:
          - temperature
          - maxOutputTokens
          - topP
          - stop
          - thinkingEnabled
          - thinkingBudget
```

**Uwaga**: alias `gpt-cheap` w przykładowym YAML repo ma obecnie `thinking: false` (adapter `type: openai` wspiera thinking przez Responses API, ale wymaga explicite `capabilities.thinking: true` w konfiguracji).

Alias Anthropic z thinking (np. `claude-sonnet` w repo) wymaga `capabilities.thinking: true` oraz wpisów `thinkingEnabled` / `thinkingBudget` w `allowOverrides`.

**Uwagi:**

- Thinking mode **znacząco zwiększa** latencję i koszty (2-10x więcej tokenów).
- Domyślnie **wyłączone** (`thinkingEnabled: false` w YAML defaults) — wymagane `capabilities.thinking: true` + `allowOverrides`.
- **Gemini 3.0+ ONLY** dla `thinkingConfig` — wcześniejsze modele Gemini zwracają błąd przy thinking.
- **Cross-validation:** gdy `thinkingBudget` jest numerem, wymagane `maxOutputTokens >= thinkingBudget + 512`.
- Thinking content **nie jest streamowany** w real-time w natywnym SSE (zwracany w `done`); adapter OpenAI Responses zbiera reasoning w trakcie streamu i udostępnia w `getThinkingContent()`.

---

## Wersjonowanie

Gateway stosuje **trzy niezależne numeracje wersji** (nie mylić ze sobą):

| Wersja                   | Lokalizacja                                                 | Pole w `openapi.json` | Znaczenie                            | Semver                  |
| ------------------------ | ----------------------------------------------------------- | --------------------- | ------------------------------------ | ----------------------- |
| **App version**          | `package.json` → `version`                                  | —                     | Wersja aplikacji (release)           | ✅                      |
| **OpenAPI version**      | `src/swagger/swagger.constants.ts` → `OPENAPI_VERSION`      | `info.version`        | Semver kontraktu HTTP API            | ✅                      |
| **OpenAPI spec version** | `src/swagger/swagger.constants.ts` → `OPENAPI_SPEC_VERSION` | `"openapi"` (root)    | Wersja formatu dokumentu (3.0 / 3.1) | ❌ (stała specyfikacji) |

### Zasady bump

- **OPENAPI_VERSION:**
  - **MAJOR** — breaking change w JSON (usunięte pola, zmiana typów wymaganych pól).
  - **MINOR** — additive (nowe pola opcjonalne, nowe kody błędów).
  - **PATCH** — fixy bez zmian kontraktu (typo w opisie OpenAPI).

- **package.json version:**
  - Wersja aplikacji; nie musi być zsynchronizowana 1:1 z OpenAPI.
  - Bump przy każdym release (feat, fix, docs, refactor).

**Przykład:** `OPENAPI_VERSION = 0.12.1`, `package.json version = 1.0.5` — OK (app ma więcej wydań niż breaking changes API).

**Eksport OpenAPI:** `npm run openapi:export` — generuje `openapi.json`; `info.version` z `OPENAPI_VERSION`, klucz `"openapi"` z `OPENAPI_SPEC_VERSION` (`export-openapi.ts`).

---

## Kody i słownik

Stabilne kody maszynowe — **`dictionary.md`**. **`GlobalExceptionFilter`** zachowuje **`code`** z obiektowego payloadu wyjątku (m.in. `GATEWAY_KEY_*`, `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `PROVIDER_UNSUPPORTED`), w przeciwnym razie stosuje mapowanie ze statusu HTTP (`DEFAULT_HTTP_STATUS_TO_CODE`).

---

## Uwagi dla klientów

1. Używaj **`openapi.json`** do generatorów i integracji — wybierz właściwy **`securityScheme`**: `GatewayKeyAuth` (czat natywny), `BearerAuth` (OpenAI), `ApiKeyAuth` (Anthropic).
2. Do **`POST /api/v1/chat`** i **`POST /api/v1/chat/stream`** dołącz nagłówek **`X-Gateway-Key`** z wartością operatora (allowlista — `konfiguracja.md`).
3. **`params`** w body są opcjonalne — bez nich używane są wyłącznie `policy.params.defaults` z YAML; override wymaga wpisu pola w `allowOverrides` dla aliasu (`konfiguracja.md`). **Skutek u vendora** zależy od providera aliasu (np. Anthropic odrzuca jednoczesne `temperature` + `topP`) — `dictionary.md`.
4. Przy włączonym cache powtórzone **`POST /api/v1/chat`** z tym samym body mogą zwrócić odpowiedź z **`cached: true`** i **`cacheSource: "exact"`** (albo `"semantic"` po hicie KNN) bez wywołania providera (`konfiguracja.md`).
5. Nie polegaj na **`role=system`** w `messages[]` — jest odrzucane; politykę systemową ustala operator w `src/config/system-prompt/`.
6. Przy streamingu składaj tekst z kolejnych `delta`; metadane końcowe (`usage`, `toolCalls`, `finishReason`, opcjonalnie `systemFingerprint` — tylko gdy upstream je dostarczy) są w evencie **`done`**.
7. **`usage`** może być niekompletne między providerami.
8. **`conversationId`**: w odpowiedzi zawsze (echo lub `conv_*`). W **request** — tylko wtedy Sentry grupuje turę jako konwersację; typowy start: tura 1 bez ID, tura 2+ z ID z odpowiedzi + pełne `messages[]` (`conversation_tracking.md`).
9. **Streaming:** nieprawidłowe `params` (poza `allowOverrides`) mogą zwrócić `MODEL_NOT_ALLOWED` **po** rozpoczęciu SSE — w czacie standardowym ten sam błąd jest **przed** wywołaniem providera.
10. **Readiness:** `GET /health/ready` zawsze **200** — sprawdzaj `body.status === "ready"`. Pola w `checks`: **`config`**, **`redis`** (infrastruktura współdzielona; probe tylko gdy `required: true`), **`cache`** (stan feature cache).
11. **Korelacja:** nagłówek odpowiedzi **`x-request-id`** = to samo ID co pole `requestId` w JSON (przy standardowym flow bez nadpisywania `requestId` w payloadzie wyjątku).

Powiązane: `lista_endpointów.md`, `architektura_api.md`, `integracje.md`, `konfiguracja.md`, `conversation_tracking.md`, `dokumentacja_koncepcyjna.md`.
