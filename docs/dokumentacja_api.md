# Dokumentacja API — AI Provider Gateway

Wersja dokumentu: **0.7**. Dokument jest wersjonowany razem z kodem. **`openapi.json`** jest zsynchronizowany z **`src/`** (żądania, odpowiedzi sukcesu, envelope błędów `ErrorEnvelope`).

## Źródła prawdy (kolejność)

1. **`openapi.json`** — kontrakt HTTP (OpenAPI 3.1) zgodny z aktualnym kodem.
2. **Kod NestJS** (`src/**/*.controller.ts`, serwisy, DTO).
3. **`PLAN_IMPLEMENTACJI.md`** — kolejne fazy (m.in. **Faza 5**: nagłówek `X-Gateway-Key`, `params` w body, skrypt `config:validate`, limity DTO/body — Krok 5.4b, rozszerzenie mappingu kodów — Krok 5.1b; **Faza 6**: observability — pino + readiness + graceful shutdown). Envelope błędów (`code` + `requestId`) oraz propagacja nagłówka `x-request-id` z requestu do `requestId` w body — **już zaimplementowane** (`GlobalExceptionFilter` + `RequestIdInterceptor` w `src/common/`).
4. **`REDIS_IMPLEMENTATION_PLAN.md`** — opcjonalna warstwa cache / limitów / metryk (Redis jako adapter; start po zamknięciu Fazy 6).
5. **`SYSTEM_PROMPTS_REFACTOR-READY.md`** — plan i status refaktoru system promptu (✅ wykonane w kodzie: DTO + `ChatService` + `configuration.ts` + `openapi.json` + dokumentacja); ewentualne usprawnienia poza rdzeniem MVP są opisane w tym dokumencie.
6. **`docs/spec/`** — SDD (wymagania docelowe; część punktów może wyprzedzać wdrożenie — porównuj z `src/` i `openapi.json`).

## Podstawy

| Element | Wartość |
|---------|---------|
| Bazowy URL (przykład lokalny) | `http://localhost:3000` |
| Prefiks API | `/api/v1` (`src/main.ts`: `setGlobalPrefix`) |
| Kodowanie | UTF‑8 |
| Standard | `application/json` |
| Streaming | `text/event-stream` (`POST /api/v1/chat/stream`) |

**Konfiguracja przy starcie:**

- **`gateway.config.yaml`** — wczytanie i walidacja Zod (`src/config/configuration.ts`).
- **Pliki system promptu** — `MASTER_SYSTEM_PROMPT.md` (wymagany), opcjonalnie `MAIN_SYSTEM_PROMPT.md` oraz `models/<modelAlias>.md` dla aliasów z YAML; treść składana w `ChatService` (`MASTER` + `MAIN?` + warstwa per model). Szczegóły: `konfiguracja.md`.
- **Env** — w **`NODE_ENV=production`** wymagany jest co najmniej jeden niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`).

**Nagłówek `X-Gateway-Key`:** wymóg docelowy (`SPEC-PLATFORMA-I-KONTRAKTY`); **nie jest egzekwowany** w kontrolerach.

---

## Format błędów

Wszystkie odpowiedzi błędów (4xx i 5xx) są w envelope **`ErrorEnvelope`** (`openapi.json`) emitowanym przez `GlobalExceptionFilter` (`src/common/filters/http-exception.filter.ts`, podpięty globalnie w `src/main.ts`):

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Model alias … not found in config",
  "requestId": "req_01H...",
  "details": []
}
```

Pole `code` jest mapowane ze statusu HTTP w `mapHttpStatusToCode`:

| HTTP | `code`                  |
|------|-------------------------|
| 400  | `VALIDATION_FAILED`     |
| 429  | `PROVIDER_RATE_LIMITED` |
| 502  | `PROVIDER_UNAVAILABLE`  |
| 504  | `PROVIDER_TIMEOUT`      |
| inne | `INTERNAL_SERVER_ERROR` |

Przy walidacji `ValidationPipe` pole `message` bywa **tablicą** stringów (przekazywaną z `HttpException.getResponse().message`). Pełny słownik **docelowych** kodów (`MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `PROVIDER_AUTH_FAILED`, …) — `dictionary.md`; rozszerzenie mappingu w filtrze jest planowane w **Fazie 5** (`PLAN_IMPLEMENTACJI.md` Krok 5.1b).

---

### System prompt i role w `messages[]`

**Stan kodu:** w żądaniu HTTP dozwolone są wyłącznie role `user` i `assistant` (`ChatMessageDto`, walidacja `400` przy `role=system`). Instrukcja systemowa dla providera jest **składana po stronie serwera** w `ChatService.buildProviderInput`: `MASTER` + opcjonalnie `MAIN` + opcjonalnie treść z `src/config/system-prompt/models/<modelAlias>.md`, a następnie przekazywana adapterom jako `ProviderChatInput.system`. Nie ma już agregacji `system` z treści żądania.

**Spójny opis warstw i ścieżek plików:** `konfiguracja.md`, dokumentacja refaktoru: `SYSTEM_PROMPTS_REFACTOR-READY.md`.

---

## Modele i wybór providera

Klient podaje **`modelAlias`** z **`gateway.config.yaml`**. Rejestr: `ProviderRegistryService.resolve()`; adaptery: typy `anthropic`, `google` (`ProvidersModule`).

Część pól policy (timeout, retry per YAML) nie jest jeszcze w pełni wykorzystywana w adapterach — szczegóły: `PLAN_IMPLEMENTACJI.md`.

---

## `POST /api/v1/chat` — standard

### Request body

Zgodnie z DTO: **`modelAlias`**, **`messages`** — bez **`params`** (nadwyżkowe pola odrzuca `ValidationPipe`: `forbidNonWhitelisted`).

### Response (`200`)

`ChatService.executeChat`: `id`, `provider`, `model`, `output`, `usage` (opcjonalnie, zależnie od adaptera), `requestId`.

Pole **`model`** to **alias** z żądania (`modelAlias`) zarówno w odpowiedzi standardowej, jak i w SSE (`meta.model`) — vendorowy `modelId` nie jest zwracany w żadnej odpowiedzi (`ChatService.executeChat` i `ChatService.executeStream` zwracają `requestBody.modelAlias`).

### Typowe kody

| HTTP | Kiedy |
|------|--------|
| 200 | Sukces |
| 400 | Walidacja / nieznany alias lub konfiguracja providera |
| 500 | Nieobsłużony błąd (np. SDK) |

---

## `POST /api/v1/chat/stream` — SSE

**Kontroler:** `ChatStreamController`. Nagłówki SSE, potem `ChatService.executeStream`.

**Zdarzenia:**

1. `meta` — `{ id, provider, model, requestId }`
2. `delta` — `{ text }`
3. `done` — `{}` (pusty obiekt)

**Błędy:** jeśli żądanie nie przechodzi walidacji lub pada wczesny `BadRequestException` **przed** `flushHeaders`, odpowiedź jest JSON jak przy czacie standardowym. Po rozpoczęciu strumienia błąd zwykle **zamyka połączenie**.

---

## `GET /api/v1/health`

Liveness — `HealthService.check()` (`status`, `message`, `timestamp` ISO).

---

## Kody i słownik

Stabilne kody maszynowe (`MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, …) — **`dictionary.md`** (kontrakt docelowy). Obecnie filtr emituje uproszczony zestaw 5 wartości `code` (mapping w sekcji "Format błędów" wyżej); rozszerzenie mappingu (rozróżnianie błędów typu `MODEL_ALIAS_NOT_FOUND` od ogólnego `VALIDATION_FAILED`) jest w **Fazie 5** (Krok 5.1b).

---

## Uwagi dla klientów

1. Używaj **`openapi.json`** do generatorów i integracji.
2. Nie wysyłaj **`params`** w body — nie są częścią DTO (konfiguracja aliasu w YAML dostarcza domyślne wartości używane w serwisie).
3. Nie polegaj na **`role=system`** w `messages[]` — jest odrzucane; politykę systemową ustala operator gateway w plikach `src/config/system-prompt/`.
4. Przy streamingu składaj tekst z kolejnych `delta`; `done` nie niesie metryk tokenów w obecnej wersji.
5. **`usage`** może być niekompletne między providerami.

Powiązane: `lista_endpointów.md`, `architektura_api.md`, `konfiguracja.md`, `PLAN_IMPLEMENTACJI.md`.
