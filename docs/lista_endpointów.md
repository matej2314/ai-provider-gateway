# Lista endpointów — AI Provider Gateway

Wersja dokumentu: **0.1** (na start; źródłem prawdy pozostaje implementacja w `src/`).

## Konwencje globalne

| Element | Wartość |
|--------|---------|
| **Baza (przykład)** | `http://localhost:3000` |
| **Prefiks ścieżek** | `/api/v1` (jeśli skonfigurowany global prefix) |
| **Format** | JSON (`application/json`) dla standard; SSE (`text/event-stream`) dla stream |
| **Błędy** | `application/json` — envelope: `statusCode`, `code`, `message`, `requestId`, opcjonalnie `details[]` |

---

## Health *(publiczne)*

### `GET /api/v1/health`

| | |
|--|--|
| **200** | `{ "status": "ok" }` |

---

## Chat *(publiczne; plug&play)*

### `POST /api/v1/chat`

Standardowa odpowiedź (pełna).

| | |
|--|--|
| **200** | odpowiedź gateway (patrz `dokumentacja_api.md`) |
| **400** | walidacja body / nieznany modelAlias |
| **401/403** | opcjonalnie, jeśli użytkownik doda własne zabezpieczenia na reverse proxy |
| **429** | limit (gateway lub provider) |
| **502/504** | błąd providera / timeout |

### `POST /api/v1/chat/stream`

Streaming SSE.

| | |
|--|--|
| **200** | `text/event-stream` |
| **400** | walidacja body / nieznany modelAlias |
| **429** | limit (gateway lub provider) |
| **502/504** | błąd providera / timeout |

---

## Szybki indeks

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/v1/health` | liveness |
| POST | `/api/v1/chat` | standard (pełna odpowiedź) |
| POST | `/api/v1/chat/stream` | streaming (SSE) |

Powiązane: `dokumentacja_api.md`, `architektura_api.md`.

