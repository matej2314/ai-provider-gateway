# Dokumentacja API — AI Provider Gateway

Wersja dokumentu: **0.9**. Dokument jest wersjonowany razem z kodem. **`openapi.json`** jest zsynchronizowany z **`src/`** (żądania, odpowiedzi sukcesu, envelope błędów `ErrorEnvelope`, security `X-Gateway-Key` dla czatu). Odpowiedź z cache może zawierać pola **`cached`** / **`cachedAt`** — patrz sekcja czatu poniżej (schema OpenAPI może ich jeszcze nie listować).

## Źródła prawdy (kolejność)

1. **`openapi.json`** — kontrakt HTTP (OpenAPI 3.1) zgodny z aktualnym kodem.
2. **Kod NestJS** (`src/**/*.controller.ts`, serwisy, DTO).
3. **`PLAN_IMPLEMENTACJI.md`** — kolejne fazy (m.in. **Faza 5**: `params` w body, skrypt `config:validate`, limity DTO/body — Krok 5.4b, rozszerzenie mappingu kodów — Krok 5.1b; **Faza 6**: observability — pino + readiness + graceful shutdown). Envelope błędów (`code` + `requestId`), propagacja `x-request-id` oraz **`X-Gateway-Key`** na endpointach czatu — **wdrożone** (`GlobalExceptionFilter`, `RequestIdInterceptor`, `GatewayKeyGuard` w `src/`).
4. **`REDIS_IMPLEMENTATION_PLAN.md`** — dalsze cele (limity, metryki, observability na Redis). **Cache odpowiedzi** dla `POST /api/v1/chat` jest już częścią kodu (`src/cache/`, backend `noop` / `redis` — `docs/konfiguracja.md`).
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
- **Env** — w **`NODE_ENV=production`** wymagany jest co najmniej jeden niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`). Opcjonalnie zmienne **`CACHE_*`** / **`REDIS_*`** — `konfiguracja.md`.

**Nagłówek `X-Gateway-Key`:** **wymagany** dla **`POST /api/v1/chat`** i **`POST /api/v1/chat/stream`** (`@UseGuards(GatewayKeyGuard)`). Wartość musi znajdować się na allowliście zbudowanej przy starcie z env wskazanego przez `masterKeyRef` oraz z niepustych wartości env dla wpisów `clients` w `gateway.config.yaml` (`src/config/configuration.ts`, funkcja `buildGatewayKeyRuntime`). **`GET /api/v1/health`** pozostaje bez tego nagłówka.

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

Jeśli wyjątek przekazuje w obiekcie odpowiedzi pole **`code`** (np. `GatewayKeyGuard`), **`GlobalExceptionFilter`** zachowuje je (`GATEWAY_KEY_MISSING`, `GATEWAY_KEY_INVALID`, `GATEWAY_KEY_NOT_CONFIGURED`). W przeciwnym razie **`code`** pochodzi z domyślnego mapowania statusu HTTP (`DEFAULT_HTTP_STATUS_TO_CODE` w `src/common/errors/api-error.code.ts`), m.in.:

| HTTP | `code` (domyślnie)       |
|------|--------------------------|
| 400  | `VALIDATION_FAILED`      |
| 401  | `PROVIDER_AUTH_FAILED`*    |
| 403  | `GATEWAY_KEY_INVALID`*     |
| 429  | `PROVIDER_RATE_LIMITED`    |
| 502  | `PROVIDER_UNAVAILABLE`     |
| 504  | `PROVIDER_TIMEOUT`         |
| inne | `INTERNAL_SERVER_ERROR`    |

\* Przy guardzie klucza i jawnych kodach w payloadzie wyjątku używane są **`GATEWAY_KEY_MISSING`** / **`GATEWAY_KEY_INVALID`**, nie wartości z tej tabeli.

Przy walidacji `ValidationPipe` źródłowe `message` bywa tablicą stringów; **w JSON odpowiedzi** filtr zwykle emituje **`message` jako jeden string** (łączenie tablic). Pełny słownik **docelowych** kodów — `dictionary.md`; doprecyzowanie mappingu dla pozostałych przypadków (np. rozróżnienie `MODEL_ALIAS_NOT_FOUND`) — **Faza 5** (`PLAN_IMPLEMENTACJI.md` Krok 5.1b).

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

**Cache (opcjonalny):** gdy backend cache jest dostępny (`ResponseCacheService` + `CACHE_ENABLED` / `CACHE_BACKEND` — `konfiguracja.md`), przed wywołaniem providera wykonywany jest lookup; przy trafieniu zwracany jest zapisany JSON z **`cached: true`** oraz **`cachedAt`** (timestamp ISO). W przeciwnym razie po udanym wywołaniu providera odpowiedź jest zapisywana pod kluczem zależnym m.in. od `modelAlias`, treści `messages` i sygnatury warstw system promptu (SHA-256). **Streaming nie jest cache’owany.**

Pole **`model`** to **alias** z żądania (`modelAlias`) zarówno w odpowiedzi standardowej, jak i w SSE (`meta.model`) — vendorowy `modelId` nie jest zwracany w żadnej odpowiedzi (`ChatService.executeChat` i `ChatService.executeStream` zwracają `requestBody.modelAlias`).

### Typowe kody

| HTTP | Kiedy |
|------|--------|
| 200 | Sukces |
| 400 | Walidacja / nieznany alias lub konfiguracja providera |
| 401 | Brak nagłówka `X-Gateway-Key` (`GATEWAY_KEY_MISSING`) |
| 403 | Niepoprawny `X-Gateway-Key` (`GATEWAY_KEY_INVALID`) |
| 500 | Nieobsłużony błąd (np. SDK); wyjątkowo brak allowlisty kluczy (`GATEWAY_KEY_NOT_CONFIGURED`) |

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

Stabilne kody maszynowe (`MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, …) — **`dictionary.md`** (kontrakt docelowy). **`GlobalExceptionFilter`** zachowuje **`code`** z payloadu wyjątku (m.in. `GATEWAY_KEY_*`) lub mapuje ze statusu HTTP (sekcja „Format błędów”). Rozszerzenie rozróżnień (np. `MODEL_ALIAS_NOT_FOUND` vs `VALIDATION_FAILED` przy każdym 400) jest w **Fazie 5** (Krok 5.1b).

---

## Uwagi dla klientów

1. Używaj **`openapi.json`** do generatorów i integracji (w tym **`securitySchemes.GatewayKeyAuth`** dla czatu).
2. Do **`POST /api/v1/chat`** i **`POST /api/v1/chat/stream`** dołącz nagłówek **`X-Gateway-Key`** z wartością operatora (allowlista — `konfiguracja.md`).
3. Nie wysyłaj **`params`** w body — nie są częścią DTO (konfiguracja aliasu w YAML dostarcza domyślne wartości używane w serwisie).
4. Przy włączonym cache powtórzone **`POST /api/v1/chat`** z tym samym body mogą zwrócić odpowiedź z **`cached: true`** bez wywołania providera (`konfiguracja.md`).
5. Nie polegaj na **`role=system`** w `messages[]` — jest odrzucane; politykę systemową ustala operator gateway w plikach `src/config/system-prompt/`.
6. Przy streamingu składaj tekst z kolejnych `delta`; `done` nie niesie metryk tokenów w obecnej wersji.
7. **`usage`** może być niekompletne między providerami.

Powiązane: `lista_endpointów.md`, `architektura_api.md`, `konfiguracja.md`, `PLAN_IMPLEMENTACJI.md`.
