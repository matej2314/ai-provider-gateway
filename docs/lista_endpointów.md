# Lista endpointów — AI Provider Gateway

Wersja dokumentu: **1.0**.  
**OpenAPI:** `openapi.json` — zsynchronizowany z `src/` (m.in. limity DTO, pola cache w schemacie odpowiedzi, `MODEL_ALIAS_NOT_FOUND`, opis `flushHeaders` dla streamu). Envelope błędów `ErrorEnvelope` (`GlobalExceptionFilter`) + `RequestIdInterceptor` w `src/common/`. **Uwierzytelnienie na brzegu:** nagłówek **`X-Gateway-Key`** jest **wymagany** dla czatu (`GatewayKeyGuard` na `ChatController` i `ChatStreamController`); allowlista z `gateway.config.yaml` + env (`docs/konfiguracja.md`). **Faza 5** (m.in. body `params`, skrypt `config:validate`, dalsze usprawnienia kontraktu): `dokumentacja_koncepcyjna.md`, `dokumentacja_api.md`. **Cache odpowiedzi** dla czatu standardowego: `src/cache/` + `konfiguracja.md`; dalszy rozwój Redis (limity, observability): `dokumentacja_koncepcyjna.md`.

## Konwencje globalne

| Element | Wartość |
|--------|---------|
| **Baza (przykład)** | `http://localhost:3000` |
| **Prefiks ścieżek** | `/api/v1` (`src/main.ts`: `setGlobalPrefix('api/v1')`) |
| **Format** | JSON (`application/json`) dla standard; SSE (`text/event-stream`) dla **`POST /api/v1/chat/stream`** |
| **Błędy (JSON)** | Envelope `ErrorEnvelope` (`{statusCode, code, message, requestId, details?}`) — schema w `openapi.json`, implementacja w `src/common/filters/http-exception.filter.ts` |

**Uruchomienie serwisu:** w **`NODE_ENV=production`** walidacja env wymaga **co najmniej jednego** niepustego klucza (po `trim()`) spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`. W development ten warunek **nie** jest egzekwowany (`src/config/env.validation.ts`).  
Ponadto przy starcie ładowany jest plik `gateway.config.yaml` (walidacja Zod w `src/config/configuration.ts`); brak pliku lub błąd schema kończy start aplikacji.

---

## Health *(publiczne)*

### `GET /api/v1/health`

| | |
|--|--|
| **200** | JSON: `status`, `message`, `timestamp` (ISO 8601) — zgodnie z `openapi.json` i `HealthService` |

---

## Chat *(wymaga `X-Gateway-Key`)*

### `POST /api/v1/chat`

Standardowa odpowiedź (pełna) — **zaimplementowane.** Nagłówek **`X-Gateway-Key`** musi być na allowliście (`src/guards/gateway-key.guard.ts`).

| | |
|--|--|
| **200** | odpowiedź gateway (patrz `dokumentacja_api.md`, schemas w `openapi.json`); przy trafieniu w cache mogą wystąpić dodatkowo **`cached: true`** i **`cachedAt`** (`ResponseCacheService` / `ChatService.executeChat`) |
| **400** | walidacja DTO / nieznany `modelAlias` (`MODEL_ALIAS_NOT_FOUND`) / inne `400` z jawnego `code` w payloadzie; nadwyżkowe pola w body (`ValidationPipe`) |
| **401** | brak `X-Gateway-Key` — `code: GATEWAY_KEY_MISSING` |
| **403** | niepoprawny klucz — `code: GATEWAY_KEY_INVALID` |
| **502** | m.in. `PROVIDER_UNSUPPORTED` (brak adaptera dla typu z YAML) — patrz `dokumentacja_api.md` |
| **500** | m.in. nieobsłużone wyjątki (np. SDK) lub skrajnie rzadko `GATEWAY_KEY_NOT_CONFIGURED` |

### `POST /api/v1/chat/stream`

**Kontrakt:** `openapi.json` (sekwencja SSE: `meta` → `delta` → `done`).  
**Implementacja:** `src/chat/chat-stream.controller.ts` (`@Controller('chat')` + `@Post('stream')`) przy prefiksie `/api/v1` — patrz `openapi.json` i `dokumentacja_api.md`. **`X-Gateway-Key`** — jak dla czatu standardowego.

| | |
|--|--|
| **200** | `text/event-stream` |
| **400** | wyłącznie gdy **`ValidationPipe`** odrzuci body **przed** `flushHeaders` — JSON `ErrorEnvelope`. Błędy z `executeStream` (m.in. brak streamingu → `STREAMING_NOT_SUPPORTED`, nieznany alias) występują **po** `flushHeaders` — patrz `dokumentacja_api.md` / `openapi.json`. |
| **401** / **403** | jak przy `POST /chat`, o ile guard zadziała **przed** `flushHeaders` |

---

## Szybki indeks

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/health` | liveness |
| POST | `/api/v1/chat` | standard (pełna odpowiedź) — działa |
| POST | `/api/v1/chat/stream` | streaming SSE (`ChatStreamController`) |

Powiązane: `openapi.json`, `dokumentacja_api.md`, `architektura_api.md`, `dokumentacja_koncepcyjna.md`.

