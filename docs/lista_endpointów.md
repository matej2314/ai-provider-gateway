# Lista endpointów — AI Provider Gateway

Wersja dokumentu: **0.2**.  
**Kontrakt docelowy (SSE, pełny envelope błędów, opcjonalne `params`, nagłówek `x-request-id`):** `openapi.json` w repozytorium.  
**Stan kodu:** zgodnie z `PLAN_IMPLEMENTACJI.md` działa m.in. standardowy chat i health; streaming (Faza 4) oraz ujednolicone błęde/requestId (Faza 5) są w toku lub zaplanowane — szczegóły: `dokumentacja_api.md`.

## Konwencje globalne

| Element | Wartość |
|--------|---------|
| **Baza (przykład)** | `http://localhost:3000` |
| **Prefiks ścieżek** | `/api/v1` (`src/main.ts`: `setGlobalPrefix('api/v1')`) |
| **Format** | JSON (`application/json`) dla standard; SSE (`text/event-stream`) — **docelowo** dla stream (`openapi.json`) |
| **Błędy (docelowo)** | `application/json` — envelope jak w `openapi.json` (`dictionary.md`) |

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
| **429** | limit (gateway lub provider) — mapowanie zależy od adaptera (Faza 5: ujednolicenie) |
| **502/504** | błąd providera / timeout — mapowanie zależy od adaptera (Faza 5: ujednolicenie) |

### `POST /api/v1/chat/stream`

**Kontrakt:** `openapi.json` (sekwencja SSE: `meta` → `delta` → `done`).  
**Implementacja:** endpoint zgodny ze ścieżką OpenAPI **nie jest jeszcze podłączony** — w kodzie istnieje pusty kontroler `ChatStreamController` pod inną ścieżką kontrolera (Faza 4 w `PLAN_IMPLEMENTACJI.md`).

| | |
|--|--|
| **200** | `text/event-stream` *(plan)* |
| **400** | walidacja / nieznany alias / brak wsparcia streamingu *(plan wg OpenAPI)* |

---

## Szybki indeks

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/health` | liveness |
| POST | `/api/v1/chat` | standard (pełna odpowiedź) — działa |
| POST | `/api/v1/chat/stream` | streaming (SSE) — kontrakt w OpenAPI; implementacja w fazie 4 |

Powiązane: `openapi.json`, `dokumentacja_api.md`, `architektura_api.md`, `PLAN_IMPLEMENTACJI.md`.

