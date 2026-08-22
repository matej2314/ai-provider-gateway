# Lista endpointów — AI Provider Gateway

Wersja dokumentu: **1.9**.  
**OpenAPI:** [`openapi.json`](../../openapi.json) (v0.14.0) — zsynchronizowany z `src/` (health, czat natywny, **models**, fasady OpenAI/Anthropic, smart rate limit `src/rate-limit/`, `params`, tooling, cache, SSE, `ChatProviderCallService`, retry/fallback/`effectiveModelAlias` przez `ResilientExecutor` (`src/chat/resilience/`), dekoratory `@nestjs/swagger`). **Błędy:** natywny czat i models — `ErrorEnvelope` (`GlobalExceptionFilter`); fasady — `OpenAiErrorResponseDto` / `AnthropicErrorResponseDto` (lokalne filtry). **`RequestIdMiddleware`** — body + nagłówek odpowiedzi **`x-request-id`**. **Auth w spec:** `GatewayKeyAuth` (czat, models), `BearerAuth` (OpenAI), `ApiKeyAuth` (Anthropic). **Czat / models:** `@GatewayKeyAndSmartRateLimit()` na `ChatController`, `ChatStreamController`, `ModelsController`; allowlista z `gateway.config.yaml` + env (`konfiguracja.md`). **Walidacja offline:** `npm run config:validate`. **Cache:** `src/cache/` — tylko `POST /chat`.

## Konwencje globalne

| Element | Wartość |
|--------|---------|
| **Baza (przykład)** | `http://localhost:3000` |
| **Prefiks ścieżek** | `/api/v1` (`API_GLOBAL_PREFIX` w `src/setup.app.ts`) |
| **Format** | JSON (`application/json`) dla standard; SSE (`text/event-stream`) dla streamingu |
| **Sukces POST (JSON)** | **201 Created** — natywny czat i fasady oficjalnych kontraktów (non-stream); zgodne z `openapi.json` (`@ApiResponse({ status: 201 })`) |
| **Sukces POST (stream)** | **200** — `text/event-stream` (`POST .../chat/stream`, `stream: true` na fasadach) |
| **Błędy (JSON)** | Envelope `ErrorEnvelope` (`{statusCode, code, message, requestId, details?}`) — schema w `openapi.json`, implementacja w `src/common/filters/http-exception.filter.ts` |
| **`x-request-id`** | Nagłówek odpowiedzi (wszystkie trasy z `RequestIdMiddleware`, w tym health) — echo nagłówka żądania lub `req_<uuid>` |

**Uruchomienie serwisu:** każda włączona instancja providera w `gateway.config.yaml` wymaga poprawnych sekretów w env (API key / base URL) — fasada `assertEnabledProviderSecretsPresent` (`src/config/configuration-validation.service.ts`; reguły w `provider-*-validation.ts`).
Ponadto przy starcie ładowany jest plik `gateway.config.yaml` (walidacja Zod + `buildEffectiveGatewayConfig`). Po sklonowaniu uzupełnij `.env` i YAML albo uruchom `gateway config:init` — `konfiguracja.md`.

---

## Health *(publiczne)*

### `GET /api/v1/health`

| | |
|--|--|
| **200** | Liveness: `status: "healthy"`, `timestamp` (**ISO 8601**, `toISOString()` w `HealthService.getLiveness`) — `openapi.json` |

### `GET /api/v1/health/ready`

| | |
|--|--|
| **200** | Readiness w body: `status` (`ready` \| `not_ready`), `timestamp` (ISO 8601), `version`, `uptime`, `checks.config`, `checks.redis`, `checks.cache`. **HTTP zawsze 200** — probe ocenia pole `status`, nie kod HTTP. `checks.redis: degraded` (Redis wymagany, ale niedostępny) i `checks.cache: degraded` **nie** blokują `ready`. Po ewaluacji sync metryk Prometheus (`publishMetrics`). Szczegóły: `dokumentacja_api.md`. |

---

## Metryki Prometheus *(publiczne, bez prefiksu `/api/v1`)*

### `GET /metrics`

| | |
|--|--|
| **200** | Tekst w formacie Prometheus (`text/plain; version=0.0.4`). Przed exportem odświeżane są gauge'e readiness (`gateway_readiness`, `gateway_health_status{component=...}`, `gateway_process_uptime_seconds`) oraz metryki operacyjne (requesty, tokeny, cache, rate limit, Node.js defaults z prefiksem `gateway_`). **Bez** `X-Gateway-Key`. Backend noop w dev (pusty snapshot), Prometheus w production — `METRICS_BACKEND` / `NODE_ENV`. Scrape: `deployment/monitoring/prometheus.yml`. |

---

## Models *(wymaga `X-Gateway-Key`)*

### `GET /api/v1/models`

Lista aliasów modeli z `gateway.config.yaml` w kontrakcie gateway (`ModelsController`, `GatewayModelsCatalogService`).

| | |
|--|--|
| **200** | `{ models: GatewayModelDto[] }` — pola: `modelAlias`, `providerInstance`, `providerType`, `modelId`, opcjonalnie `capabilities`, `fallback` |
| **401** | brak `X-Gateway-Key` — `GATEWAY_KEY_MISSING` |
| **403** | niepoprawny klucz — `GATEWAY_KEY_INVALID` |
| **429** | `RATE_LIMITED` (smart rate limit) |

### `GET /api/v1/models/:modelAlias`

| | |
|--|--|
| **200** | pojedynczy `GatewayModelDto` |
| **404** | nieznany alias — `MODEL_ALIAS_NOT_FOUND` (`ErrorEnvelope`) |

> **Uwaga:** nieznany alias w **`POST /chat`** zwraca **400** + `MODEL_ALIAS_NOT_FOUND` (walidacja przed wywołaniem LLM). W katalogu modeli celowo **404**.

---

## Chat *(wymaga `X-Gateway-Key`)*

### `POST /api/v1/chat`

Standardowa odpowiedź (pełna) — **zaimplementowane.** Guardy: `@GatewayKeyAndSmartRateLimit()`. Body: `modelAlias`, `messages`, opcjonalnie **`conversationId`** (Sentry: konwersacja tylko w request; response zawsze z ID — `conversation_tracking.md`), opcjonalnie **`metadata`**, opcjonalnie **`params`** (`temperature`, `maxOutputTokens`, `topP`, `topK`, `stop`, `frequencyPenalty`, `presencePenalty`, `seed`, `responseFormat` — merge YAML ← body przez `resolveProviderCallOptions`; `topK` / `stop` / `responseFormat` tylko z body).

| | |
|--|--|
| **201** | odpowiedź gateway (JSON); opcjonalnie `toolCalls`, `finishReason` (`stop` \| `tool_calls` \| `length` \| `content_filter` — `GatewayFinishReason`), `usageDetails`, `systemFingerprint` (tylko gdy upstream OpenAI — patrz `dictionary.md`), `effectiveModelAlias`, `cached` |
| **400** | walidacja DTO; `MODEL_ALIAS_NOT_FOUND`; `MODEL_NOT_ALLOWED`; `TOOLS_NOT_SUPPORTED`; inne jawne `code` |
| **401** | brak `X-Gateway-Key` — `GATEWAY_KEY_MISSING` |
| **403** | niepoprawny klucz — `GATEWAY_KEY_INVALID` |
| **429** | `RATE_LIMITED` (smart limit / cooldown po 429 upstream — `checkCooldown` w `prepareRequestForExecution` przed wywołaniem LLM) lub `PROVIDER_RATE_LIMITED` (upstream) |
| **502** | m.in. `PROVIDER_UNSUPPORTED`, `PROVIDER_UNAVAILABLE` (w tym wyczerpanie retry+fallback) |
| **504** | `PROVIDER_TIMEOUT` (`policy.timeoutMs` + `AbortSignal` w `ResilientExecutor`) |
| **500** | nieobsłużony wyjątek; rzadko `GATEWAY_KEY_NOT_CONFIGURED` |

### `POST /api/v1/chat/stream`

**Kontrakt:** `openapi.json` (sekwencja SSE: `meta` → `delta` → `done`).  
**Implementacja:** `src/chat/chat-stream.controller.ts` (`@Controller('chat')` + `@Post('stream')`) przy prefiksie `/api/v1` — patrz `openapi.json` i `dokumentacja_api.md`. **`X-Gateway-Key`** — jak dla czatu standardowego.

| | |
|--|--|
| **200** | `text/event-stream`; w `meta` m.in. **`conversationId`**, opcjonalnie **`effectiveModelAlias`**; w `done` m.in. `usage`, `toolCalls`, `finishReason`, opcjonalnie `usageDetails`, `thinkingContent`, `warnings` |
| **400** | JSON `ErrorEnvelope` **przed** SSE: walidacja DTO, `validateForStreaming` (`MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`) |
| **401** / **403** / **429** | guardy klucza i smart rate limit — przed `flushHeaders`; cooldown (429) także z `prepareRequestForExecution` przed startem SSE |
| *(po SSE)* | błędy providera — częściowy strumień / zamknięcie połączenia zamiast JSON `ErrorEnvelope`; `setCooldown` po 429 upstream nadal możliwy (`ChatErrorHandlerService`) |

---

## Szybki indeks

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/health` | liveness |
| GET | `/api/v1/health/ready` | readiness (`checks.config`, `checks.redis`, `checks.cache`) |
| GET | `/metrics` | metryki Prometheus (health gauges odświeżane przy scrape) |
| GET | `/api/v1/models` | lista aliasów modeli (kontrakt gateway) |
| GET | `/api/v1/models/:modelAlias` | szczegóły aliasu |
| POST | `/api/v1/chat` | standard (pełna odpowiedź) |
| POST | `/api/v1/chat/stream` | streaming SSE (`ChatStreamController`) |
| GET | `/api/v1/openai/models` | lista modeli (fasada OpenAI) |
| GET | `/api/v1/openai/models/:model` | pojedynczy alias (fasada OpenAI) |
| POST | `/api/v1/openai/chat/completions` | chat OpenAI (JSON + `stream: true`) |
| GET | `/api/v1/anthropic/models` | lista modeli (fasada Anthropic) |
| GET | `/api/v1/anthropic/models/:model` | pojedynczy alias (fasada Anthropic) |
| POST | `/api/v1/anthropic/messages` | messages Anthropic (JSON + `stream: true`) |

---

## Fasady oficjalnych kontraktów (`src/integrations/`)

Fasady dla klientów oczekujących API vendora. Wspólna allowlista kluczy klienta; **inny** nagłówek auth niż natywny czat. Trasy i schematy w **[`openapi.json`](../../openapi.json)** (security `BearerAuth` / `ApiKeyAuth`). Błędy w formacie vendora, nie `ErrorEnvelope`. Szczegóły: `integracje.md`, `integracja_openai_kontrakt.md`, `integracja_anthropic_messages.md`.

### OpenAI API *(Cursor — Bearer)*

Base URL w IDE: `http://<host>:<port>/api/v1/openai`

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/openai/models` | lista aliasów (`gateway.config.yaml`), format OpenAI |
| GET | `/api/v1/openai/models/:model` | pojedynczy alias |
| POST | `/api/v1/openai/chat/completions` | chat; `stream: true` → SSE OpenAI |

Kody sukcesu `POST .../chat/completions`: **201** (JSON), **200** (`stream: true`, SSE). Błędy — format OpenAI (`OpenAiErrorResponseDto`).

### Anthropic Messages API *(Claude Code — x-api-key)*

Base URL w IDE: `http://<host>:<port>/api/v1/anthropic`

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/anthropic/models` | lista aliasów, format Anthropic |
| GET | `/api/v1/anthropic/models/:model` | pojedynczy alias |
| POST | `/api/v1/anthropic/messages` | messages; `stream: true` → SSE Anthropic |

Kody sukcesu `POST .../messages`: **201** (JSON), **200** (`stream: true`, SSE). Stream: finalne `message_delta.usage` z `input_tokens` / cache; opcjonalne bloki `thinking` w fazie `done`. Błędy — format Anthropic (`AnthropicErrorResponseDto`).

Auth: `x-api-key` (priorytet) lub `Authorization: Bearer` — ta sama allowlista co natywny czat. Szczegóły: [`integracja_anthropic_messages.md`](integracja_anthropic_messages.md).

---

Powiązane: [`openapi.json`](../../openapi.json), `dokumentacja_api.md`, `architektura_api.md`, `dokumentacja_koncepcyjna.md`, `integracje.md`.

