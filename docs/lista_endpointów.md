# Lista endpointów — AI Provider Gateway

Wersja dokumentu: **0.7**.  
**OpenAPI:** `openapi.json` — zsynchronizowany z `src/`. W kodzie już są: envelope błędów `ErrorEnvelope` (z `code` + `requestId`) — `GlobalExceptionFilter` + `RequestIdInterceptor` w `src/common/`. W **Fazie 5** planowane: nagłówek `X-Gateway-Key`, body `params`, skrypt `config:validate`, limity DTO/body (Krok 5.4b), rozszerzenie mappingu kodów (Krok 5.1b) — `PLAN_IMPLEMENTACJI.md`, `dokumentacja_api.md`. Opcjonalna warstwa cache / Redis (bez zmiany ścieżek REST na start) — `REDIS_IMPLEMENTATION_PLAN.md`.

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

## Chat *(publiczne; plug&play)*

### `POST /api/v1/chat`

Standardowa odpowiedź (pełna) — **zaimplementowane.**

| | |
|--|--|
| **200** | odpowiedź gateway (patrz `dokumentacja_api.md`, schemas w `openapi.json`) |
| **400** | walidacja DTO / nieznany `modelAlias` / dodatkowe pola w body (`ValidationPipe`: `forbidNonWhitelisted`) |
| **500** | nieobsłużone wyjątki (np. błędy SDK) — zwykle ten sam kształt Nest |

### `POST /api/v1/chat/stream`

**Kontrakt:** `openapi.json` (sekwencja SSE: `meta` → `delta` → `done`).  
**Implementacja:** `src/chat/chat-stream.controller.ts` (`@Controller('chat')` + `@Post('stream')`) przy prefiksie `/api/v1` — patrz `openapi.json` i `dokumentacja_api.md`.

| | |
|--|--|
| **200** | `text/event-stream` |
| **400** | walidacja DTO / nieznany alias / brak wsparcia streamingu — envelope `ErrorEnvelope` (`code: VALIDATION_FAILED`) |

---

## Szybki indeks

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/health` | liveness |
| POST | `/api/v1/chat` | standard (pełna odpowiedź) — działa |
| POST | `/api/v1/chat/stream` | streaming SSE (`ChatStreamController`) |

Powiązane: `openapi.json`, `dokumentacja_api.md`, `architektura_api.md`, `PLAN_IMPLEMENTACJI.md`.

