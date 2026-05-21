# Lista endpointów — AI Provider Gateway

Wersja dokumentu: **1.0**.  
**OpenAPI:** `openapi.json` (v0.9.0) — zsynchronizowany z `src/` (health liveness/readiness, smart rate limit, limity DTO, opcjonalne `params`, cache, SSE). Envelope `ErrorEnvelope` (`GlobalExceptionFilter`) + **`RequestIdMiddleware`** (`src/common/middleware/request-id.middleware.ts`). **Czat:** `@GatewayKeyAndSmartRateLimit()` → `GatewayKeyGuard` + `SmartRateLimitGuard` na `ChatController` / `ChatStreamController`; allowlista z `gateway.config.yaml` + env (`konfiguracja.md`). Opcjonalny smart rate limit: `RATE_LIMIT_SMART_ENABLED`, Redis — `konfiguracja.md`. **Faza 5 (pozostałość):** `config:validate`, response header `x-request-id` — `dokumentacja_koncepcyjna.md`. **Cache:** `src/cache/` — tylko `POST /chat` standardowy (klucz z efektywnymi parametrami wywołania).

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
| **200** | Liveness: `status: "healthy"`, `timestamp` (locale string z `HealthService.getLiveness`) — `openapi.json` |

### `GET /api/v1/health/ready`

| | |
|--|--|
| **200** | Readiness: `status` (`ready` \| `not_ready`), `version`, `uptime`, `checks.config`, `checks.redis` — `HealthService.getReadiness` |

---

## Chat *(wymaga `X-Gateway-Key`)*

### `POST /api/v1/chat`

Standardowa odpowiedź (pełna) — **zaimplementowane.** Guardy: `@GatewayKeyAndSmartRateLimit()`. Body: `modelAlias`, `messages`, opcjonalnie **`conversationId`** (Sentry: konwersacja tylko w request; response zawsze z ID — `conversation-tracking.md`), opcjonalnie **`params`** (`temperature`, `maxOutputTokens` — `resolveProviderCallOptions`).

| | |
|--|--|
| **200** | odpowiedź gateway (`dokumentacja_api.md`); **`conversationId`** w body; opcjonalnie **`cached: true`**, **`cachedAt`** |
| **400** | walidacja DTO (m.in. pusty `conversationId`); `MODEL_ALIAS_NOT_FOUND`; `MODEL_NOT_ALLOWED` (niedozwolony override w `params`); inne jawne `code` |
| **401** | brak `X-Gateway-Key` — `GATEWAY_KEY_MISSING` |
| **403** | niepoprawny klucz — `GATEWAY_KEY_INVALID` |
| **429** | `RATE_LIMITED` (smart limit / cooldown) lub `PROVIDER_RATE_LIMITED` (upstream) |
| **502** | m.in. `PROVIDER_UNSUPPORTED`, `PROVIDER_UNAVAILABLE` (`provider-error.mapper.ts`) |
| **500** | nieobsłużony wyjątek; rzadko `GATEWAY_KEY_NOT_CONFIGURED` |

### `POST /api/v1/chat/stream`

**Kontrakt:** `openapi.json` (sekwencja SSE: `meta` → `delta` → `done`).  
**Implementacja:** `src/chat/chat-stream.controller.ts` (`@Controller('chat')` + `@Post('stream')`) przy prefiksie `/api/v1` — patrz `openapi.json` i `dokumentacja_api.md`. **`X-Gateway-Key`** — jak dla czatu standardowego.

| | |
|--|--|
| **200** | `text/event-stream`; w `meta` m.in. **`conversationId`** |
| **400** | JSON `ErrorEnvelope` **przed** SSE: walidacja DTO, `validateForStreaming` (`MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`) |
| **401** / **403** / **429** | guardy klucza i smart rate limit — przed `flushHeaders` |
| *(po SSE)* | błędy providera w `executeStream` — patrz `dokumentacja_api.md` |

---

## Szybki indeks

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/health` | liveness |
| GET | `/api/v1/health/ready` | readiness (config, redis) |
| POST | `/api/v1/chat` | standard (pełna odpowiedź) |
| POST | `/api/v1/chat/stream` | streaming SSE (`ChatStreamController`) |

Powiązane: `openapi.json`, `dokumentacja_api.md`, `architektura_api.md`, `dokumentacja_koncepcyjna.md`.

