# Architektura API — AI Provider Gateway

## Styl API

- Gateway udostępnia **spójne REST API** nad jednym zasobem: *chat completions* (konwersacja).
- Wersjonowanie przez prefiks ścieżki (np. `/api/v1`) — szczegóły zależą od implementacji global prefix w NestJS.
- Dwa tryby odpowiedzi:
  - **standard** (pełna odpowiedź JSON),
  - **streaming** (SSE).

**Warunek uruchomienia:** przy starcie wczytywany jest `gateway.config.yaml` (fail‑fast przy błędzie). Walidacja env: **minimum jeden** niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` obowiązuje **tylko gdy `NODE_ENV=production`** (`src/config/env.validation.ts`; szczegóły: `docs/konfiguracja.md`).

## Identyfikacja modeli (aliasy)

Preferowana forma wyboru modelu w request:

- `modelAlias` — nazwa z konfiguracji gateway.

Gateway mapuje alias do:

- instancji providera,
- vendorowego `modelId`,
- polityk i limitów.

Założenie: `modelAlias` jest zwyczajową/czytelną nazwą modelu (np. `claude-sonnet-4-5`), mapowaną na vendorowy `modelId` wymagany przez danego providera (np. `claude-sonnet-4-5-20250929` w Anthropic). Analogiczne mapowanie dotyczy wszystkich providerów.

## Konwencje odpowiedzi sukcesu (standard)

Gateway odpowiada JSON w spójnym kształcie, niezależnym od providera.

Minimalne pola (kierunek kontraktu; detale w `dokumentacja_api.md`):

- `id` — identyfikator odpowiedzi (gateway),
- `provider` — nazwa providera użytego do wykonania,
- `model` — vendorowy `modelId` po resolvie aliasu,
- `output` — treść odpowiedzi (tekst i/lub struktura),
- `usage` — metadane tokenów (jeśli dostępne),
- `requestId` — korelacja z logami.

## Streaming (SSE)

Docelowy kontrakt (OpenAPI + `dokumentacja_api.md`): **Server‑Sent Events** (`text/event-stream`), zdarzenia `meta` → `delta*` → `done`.

**Stan kodu:** endpoint `POST /api/v1/chat/stream` z kontraktu **nie jest zaimplementowany** — praca w **Fazie 4** (`PLAN_IMPLEMENTACJI.md`). Po wdrożeniu:

- Gateway nie będzie gwarantował identycznego zachowania token‑po‑token między providerami.
- Klient powinien traktować SSE jako strumień fragmentów + metadane.

## Konwencje błędów (envelope)

Wszystkie błędy z ciałem JSON mają jednolity kształt:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Niepoprawne dane wejściowe.",
  "requestId": "…",
  "details": []
}
```

| Pole | Znaczenie |
|------|-----------|
| `statusCode` | Powielenie kodu HTTP. |
| `code` | Stabilny kod maszynowy (patrz `dictionary.md`). |
| `message` | Komunikat dla człowieka (bez sekretów i surowych wyjątków SDK). |
| `requestId` | Korelacja z logami. |
| `details` | Opcjonalna lista szczegółów walidacji. |

## Walidacja

- Walidacja DTO na brzegu (`ValidationPipe`).
- Walidacja konfiguracji przy starcie (fail‑fast) i w runtime (np. unknown `modelAlias` → błąd deterministyczny).

## Idempotencja i retry

- Standardowy chat nie jest idempotentny (ten sam request może generować różną odpowiedź).
- Retry po stronie gateway jest ograniczony do błędów “bezpiecznych” (np. 429/5xx) i kontrolowany polityką w konfiguracji.

## CORS / Auth

Gateway **nie egzekwuje** jeszcze nagłówka `X-Gateway-Key` opisanego w `spec/SPEC-PLATFORMA-I-KONTRAKTY.md` — to jest **kierunek** (Faza 5 / bezpieczeństwo brzegowe). Dziś zabezpieczenie przed nieautoryzowanym dostępem pozostaje po stronie sieci użytkownika.

Jeżeli gateway jest używany w sieci publicznej, zalecane jest dodanie:

- API key (docelowo gateway key lub reverse proxy),
- mTLS / reverse proxy auth,
- rate limiting i WAF,
- ograniczeń originów w CORS (jeśli wystawiane do przeglądarki).

## Powiązane dokumenty

- Kontrakt endpointów: `dokumentacja_api.md`
- Lista ścieżek: `lista_endpointów.md`
- Konfiguracja i aliasy: `konfiguracja.md`
- Streaming i format zdarzeń: `dokumentacja_api.md`
- Anty‑patterny: `anty-patterny.md`

