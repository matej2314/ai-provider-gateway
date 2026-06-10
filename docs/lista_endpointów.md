# Lista endpointów — AI Provider Gateway

Wersja dokumentu: **1.1**.  
**OpenAPI:** `openapi.json` (v0.12.0) — zsynchronizowany z `src/` (health, czat natywny, fasady OpenAI/Anthropic, smart rate limit `src/rate-limit/`, `params`, tooling, cache, SSE, `ChatProviderCallService`, retry/fallback/`effectiveModelAlias` przez `ResilientExecutor`, dekoratory `@nestjs/swagger`). **Błędy:** natywny czat — `ErrorEnvelope` (`GlobalExceptionFilter`); fasady — `OpenAiErrorResponseDto` / `AnthropicErrorResponseDto` (lokalne filtry). **`RequestIdMiddleware`** — body + nagłówek odpowiedzi **`x-request-id`**. **Auth w spec:** `GatewayKeyAuth` (czat), `BearerAuth` (OpenAI), `ApiKeyAuth` (Anthropic). **Czat:** `@GatewayKeyAndSmartRateLimit()` na `ChatController` / `ChatStreamController`; allowlista z `gateway.config.yaml` + env (`konfiguracja.md`). **Walidacja offline:** `npm run config:validate`. **Cache:** `src/cache/` — tylko `POST /chat`.

## Konwencje globalne

| Element | Wartość |
|--------|---------|
| **Baza (przykład)** | `http://localhost:3000` |
| **Prefiks ścieżek** | `/api/v1` (`API_GLOBAL_PREFIX` w `src/setup.app.ts`) |
| **Format** | JSON (`application/json`) dla standard; SSE (`text/event-stream`) dla **`POST /api/v1/chat/stream`** |
| **Błędy (JSON)** | Envelope `ErrorEnvelope` (`{statusCode, code, message, requestId, details?}`) — schema w `openapi.json`, implementacja w `src/common/filters/http-exception.filter.ts` |
| **`x-request-id`** | Nagłówek odpowiedzi (wszystkie trasy z `RequestIdMiddleware`, w tym health) — echo nagłówka żądania lub `req_<uuid>` |

**Uruchomienie serwisu:** w **`NODE_ENV=production`** walidacja env wymaga **co najmniej jednego** niepustego klucza (po `trim()`) spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`. W development ten warunek **nie** jest egzekwowany (`src/config/env.validation.ts`).  
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
| **200** | Readiness w body: `status` (`ready` \| `not_ready`), `timestamp` (ISO 8601), `version`, `uptime`, `checks.config`, `checks.cache`. **HTTP zawsze 200** — probe ocenia pole `status`, nie kod HTTP. `checks.cache: degraded` (Redis cache niedostępny) nie blokuje `ready`. Szczegóły: `dokumentacja_api.md`. |

---

## Chat *(wymaga `X-Gateway-Key`)*

### `POST /api/v1/chat`

Standardowa odpowiedź (pełna) — **zaimplementowane.** Guardy: `@GatewayKeyAndSmartRateLimit()`. Body: `modelAlias`, `messages`, opcjonalnie **`conversationId`** (Sentry: konwersacja tylko w request; response zawsze z ID — `conversation-tracking.md`), opcjonalnie **`params`** (`temperature`, `maxOutputTokens`, `topP`, `stop`, `frequencyPenalty`, `presencePenalty`, `seed` — merge z `policy.params` przez `resolveProviderCallOptions`).

| | |
|--|--|
| **200** | odpowiedź gateway; opcjonalnie `toolCalls`, `finishReason`, `effectiveModelAlias`, `cached` |
| **400** | walidacja DTO; `MODEL_ALIAS_NOT_FOUND`; `MODEL_NOT_ALLOWED`; `TOOLS_NOT_SUPPORTED`; inne jawne `code` |
| **401** | brak `X-Gateway-Key` — `GATEWAY_KEY_MISSING` |
| **403** | niepoprawny klucz — `GATEWAY_KEY_INVALID` |
| **429** | `RATE_LIMITED` (smart limit / cooldown po 429 upstream — cooldown tylko w tej ścieżce) lub `PROVIDER_RATE_LIMITED` (upstream) |
| **502** | m.in. `PROVIDER_UNSUPPORTED`, `PROVIDER_UNAVAILABLE` (w tym wyczerpanie retry+fallback) |
| **504** | `PROVIDER_TIMEOUT` (`policy.timeoutMs`) |
| **500** | nieobsłużony wyjątek; rzadko `GATEWAY_KEY_NOT_CONFIGURED` |

### `POST /api/v1/chat/stream`

**Kontrakt:** `openapi.json` (sekwencja SSE: `meta` → `delta` → `done`).  
**Implementacja:** `src/chat/chat-stream.controller.ts` (`@Controller('chat')` + `@Post('stream')`) przy prefiksie `/api/v1` — patrz `openapi.json` i `dokumentacja_api.md`. **`X-Gateway-Key`** — jak dla czatu standardowego.

| | |
|--|--|
| **200** | `text/event-stream`; w `meta` m.in. **`conversationId`**, opcjonalnie **`effectiveModelAlias`** |
| **400** | JSON `ErrorEnvelope` **przed** SSE: walidacja DTO, `validateForStreaming` (`MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`) |
| **401** / **403** / **429** | guardy klucza i smart rate limit — przed `flushHeaders` |
| *(po SSE)* | m.in. `MODEL_NOT_ALLOWED` (`params`), `PROVIDER_*`, `PROVIDER_TIMEOUT` — częściowy strumień zamiast JSON; bez cooldownu jak w czacie standardowym — `dokumentacja_api.md` |

---

## Szybki indeks

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/health` | liveness |
| GET | `/api/v1/health/ready` | readiness (`checks.config`, `checks.cache`) |
| POST | `/api/v1/chat` | standard (pełna odpowiedź) |
| POST | `/api/v1/chat/stream` | streaming SSE (`ChatStreamController`) |
| GET | `/api/v1/openai/models` | lista modeli (fasada OpenAI) |
| GET | `/api/v1/openai/models/:model` | pojedynczy alias (fasada OpenAI) |
| POST | `/api/v1/openai/chat/completions` | chat OpenAI (JSON + `stream: true`) |
| GET | `/api/v1/anthropic/models` | lista modeli (fasada Anthropic) |
| GET | `/api/v1/anthropic/models/:model` | pojedynczy alias (fasada Anthropic) |
| POST | `/api/v1/anthropic/messages` | messages Anthropic (JSON + `stream: true`) |

---

## Integracje IDE (`src/integrations/`)

Fasady dla klientów oczekujących API vendora. Wspólna allowlista kluczy klienta; **inny** nagłówek auth niż natywny czat. Trasy i schematy w **`openapi.json`** (security `BearerAuth` / `ApiKeyAuth`). Błędy w formacie vendora, nie `ErrorEnvelope`. Szczegóły: `integracje.md`, `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`.

### OpenAI API *(Cursor — Bearer)* — **wdrożone**

Base URL w IDE: `http://<host>:<port>/api/v1/openai`

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/openai/models` | lista aliasów (`gateway.config.yaml`), format OpenAI |
| GET | `/api/v1/openai/models/:model` | pojedynczy alias |
| POST | `/api/v1/openai/chat/completions` | chat; `stream: true` → SSE OpenAI |

### Anthropic Messages API *(Claude Code — x-api-key)* — **wdrożone**

Base URL w IDE: `http://<host>:<port>/api/v1/anthropic`

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/anthropic/models` | lista aliasów, format Anthropic |
| GET | `/api/v1/anthropic/models/:model` | pojedynczy alias |
| POST | `/api/v1/anthropic/messages` | messages; `stream: true` → SSE Anthropic |

Auth: `x-api-key` (priorytet) lub `Authorization: Bearer` — ta sama allowlista co natywny czat. Szczegóły: [`integracja-anthropic-messages.md`](integracja-anthropic-messages.md).

---

Powiązane: `openapi.json`, `dokumentacja_api.md`, `architektura_api.md`, `dokumentacja_koncepcyjna.md`, `integracje.md`.

