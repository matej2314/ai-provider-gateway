# Lista endpointów — AI Provider Gateway

Wersja dokumentu: **0.6**.  
**OpenAPI:** `openapi.json` — zsynchronizowany z `src/`; w **Fazie 5** planowane m.in.: envelope z `code`, `x-request-id`, body `params`, skrypt `config:validate` (`PLAN_IMPLEMENTACJI.md`, `dokumentacja_api.md`). Opcjonalna warstwa cache / Redis (bez zmiany ścieżek REST na start) — `REDIS_IMPLEMENTATION_PLAN.md`.

## Konwencje globalne

| Element | Wartość |
|--------|---------|
| **Baza (przykład)** | `http://localhost:3000` |
| **Prefiks ścieżek** | `/api/v1` (`src/main.ts`: `setGlobalPrefix('api/v1')`) |
| **Format** | JSON (`application/json`) dla standard; SSE (`text/event-stream`) dla **`POST /api/v1/chat/stream`** |
| **Błędy (JSON)** | Domyślny format NestJS — schema `NestHttpExceptionBody` w `openapi.json` |

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
| **400** | walidacja DTO / nieznany alias / brak wsparcia streamingu — format błędu Nest (`openapi.json`: `NestHttpExceptionBody`) |

---

## Szybki indeks

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/health` | liveness |
| POST | `/api/v1/chat` | standard (pełna odpowiedź) — działa |
| POST | `/api/v1/chat/stream` | streaming SSE (`ChatStreamController`) |

Powiązane: `openapi.json`, `dokumentacja_api.md`, `architektura_api.md`, `PLAN_IMPLEMENTACJI.md`.

