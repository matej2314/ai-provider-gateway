# Lista endpointów — AI Provider Gateway

Wersja dokumentu: **1.0**.  
**OpenAPI:** `openapi.json` (v0.11.0) — zsynchronizowany z `src/` (health, smart rate limit, `params`, cache, SSE, `ChatProviderCallService`, retry/fallback/`effectiveModelAlias` przez `ResilientExecutor`). Envelope `ErrorEnvelope` (`GlobalExceptionFilter`) + **`RequestIdMiddleware`**. **Czat:** `@GatewayKeyAndSmartRateLimit()` na `ChatController` / `ChatStreamController`; allowlista z `gateway.config.yaml` + env (`konfiguracja.md`). **Faza 5 (pozostałość):** `config:validate`, response header `x-request-id`. **Cache:** `src/cache/` + `helpers/cache-policy.ts` — tylko `POST /chat` (provider włączony w YAML).

## Konwencje globalne

| Element | Wartość |
|--------|---------|
| **Baza (przykład)** | `http://localhost:3000` |
| **Prefiks ścieżek** | `/api/v1` (`src/main.ts`: `setGlobalPrefix('api/v1')`) |
| **Format** | JSON (`application/json`) dla standard; SSE (`text/event-stream`) dla **`POST /api/v1/chat/stream`** |
| **Błędy (JSON)** | Envelope `ErrorEnvelope` (`{statusCode, code, message, requestId, details?}`) — schema w `openapi.json`, implementacja w `src/common/filters/http-exception.filter.ts` |

**Uruchomienie serwisu:** w **`NODE_ENV=production`** walidacja env wymaga **co najmniej jednego** niepustego klucza (po `trim()`) spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`. W development ten warunek **nie** jest egzekwowany (`src/config/env.validation.ts`).  
Ponadto przy starcie ładowany jest plik `gateway.config.yaml` (walidacja Zod + reguły efektywnej konfiguracji w `src/config/configuration.ts` — m.in. puste `models`, nieznany `providerInstance`, włączony provider bez modeli); brak pliku lub błąd walidacji kończy start aplikacji (`konfiguracja.md`).

---

## Health *(publiczne)*

### `GET /api/v1/health`

| | |
|--|--|
| **200** | Liveness: `status: "healthy"`, `timestamp` (**ISO 8601**, `toISOString()` w `HealthService.getLiveness`) — `openapi.json` |

### `GET /api/v1/health/ready`

| | |
|--|--|
| **200** | Readiness w body: `status` (`ready` \| `not_ready`), `timestamp` (ISO 8601), `version`, `uptime`, `checks.config`, `checks.redis`. **HTTP zawsze 200** — probe ocenia pole `status`, nie kod HTTP. `checks.redis: degraded` nie blokuje `ready`. Szczegóły `checks.config`: `dokumentacja_api.md`. |

---

## Chat *(wymaga `X-Gateway-Key`)*

### `POST /api/v1/chat`

Standardowa odpowiedź (pełna) — **zaimplementowane.** Guardy: `@GatewayKeyAndSmartRateLimit()`. Body: `modelAlias`, `messages`, opcjonalnie **`conversationId`** (Sentry: konwersacja tylko w request; response zawsze z ID — `conversation-tracking.md`), opcjonalnie **`params`** (`temperature`, `maxOutputTokens` — `resolveProviderCallOptions`).

| | |
|--|--|
| **200** | odpowiedź gateway (`dokumentacja_api.md`); **`conversationId`** w body; opcjonalnie **`effectiveModelAlias`** (fallback); opcjonalnie **`cached: true`**, **`cachedAt`** |
| **400** | walidacja DTO (m.in. `conversationId` ≠ `conv_<uuid>`); `MODEL_ALIAS_NOT_FOUND`; `MODEL_NOT_ALLOWED`; inne jawne `code` |
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
| GET | `/api/v1/health/ready` | readiness (config, redis) |
| POST | `/api/v1/chat` | standard (pełna odpowiedź) |
| POST | `/api/v1/chat/stream` | streaming SSE (`ChatStreamController`) |

Powiązane: `openapi.json`, `dokumentacja_api.md`, `architektura_api.md`, `dokumentacja_koncepcyjna.md`.

