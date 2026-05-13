# Dokumentacja API — AI Provider Gateway

Wersja dokumentu: **1.0**. Dokument jest wersjonowany razem z kodem. **`openapi.json`** jest zsynchronizowany z **`src/`** (żądania, odpowiedzi sukcesu w tym opcjonalne pola cache, envelope błędów `ErrorEnvelope`, security `X-Gateway-Key` dla czatu).

## Źródła prawdy (kolejność)

1. **`openapi.json`** — kontrakt HTTP (OpenAPI 3.1) zgodny z aktualnym kodem.
2. **Kod NestJS** (`src/**/*.controller.ts`, serwisy, DTO).
3. **`PLAN_IMPLEMENTACJI.md`** — kolejne fazy (m.in. **Faza 5**: `params` w body, skrypt `config:validate`, ewentualne dalsze limity / rozszerzenia mapowań; **Faza 6**: observability — pino + readiness + graceful shutdown). Envelope błędów (`code` + `requestId`), propagacja `x-request-id` oraz **`X-Gateway-Key`** na endpointach czatu — **wdrożone** (`GlobalExceptionFilter`, `RequestIdInterceptor`, `GatewayKeyGuard` w `src/`). Wybrane kody domenowe przy **400** (`MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED` w payloadzie wyjątku) są **zachowywane przez filtr** — patrz `ProviderRegistryService` i `ChatService.executeStream`.
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

Wszystkie odpowiedzi błędów obsłużone przez `GlobalExceptionFilter` jako JSON są w envelope **`ErrorEnvelope`** (`openapi.json`) — patrz `src/common/filters/http-exception.filter.ts` (globalnie w `src/main.ts`). **Uwaga:** przy `POST /api/v1/chat/stream` część błędów może powstać **po** `flushHeaders` (patrz sekcja streamingu) — wtedy klient może nie otrzymać poprawnego JSON.

```json
{
  "statusCode": 400,
  "code": "MODEL_ALIAS_NOT_FOUND",
  "message": "Model alias unknown-alias not found in config",
  "requestId": "req_01H...",
  "details": []
}
```

Jeśli wyjątek przekazuje w obiekcie odpowiedzi pole **`code`** (np. `GatewayKeyGuard`, `ProviderRegistryService`, `ChatService.executeStream`), **`GlobalExceptionFilter`** zachowuje je (`GATEWAY_KEY_MISSING`, `GATEWAY_KEY_INVALID`, `GATEWAY_KEY_NOT_CONFIGURED`, `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, …). W przeciwnym razie **`code`** pochodzi z domyślnego mapowania statusu HTTP (`DEFAULT_HTTP_STATUS_TO_CODE` w `src/common/errors/api-error.code.ts`), m.in.:

| HTTP | `code` (domyślnie)       |
|------|--------------------------|
| 400  | `VALIDATION_FAILED` *(gdy wyjątek nie nadpisuje `code`; inaczej np. `MODEL_ALIAS_NOT_FOUND`)* |
| 401  | `PROVIDER_AUTH_FAILED`*    |
| 403  | `GATEWAY_KEY_INVALID`*     |
| 429  | `PROVIDER_RATE_LIMITED`    |
| 502  | `PROVIDER_UNAVAILABLE`     |
| 504  | `PROVIDER_TIMEOUT`         |
| inne | `INTERNAL_SERVER_ERROR`    |

\* Przy guardzie klucza i jawnych kodach w payloadzie wyjątku używane są **`GATEWAY_KEY_MISSING`** / **`GATEWAY_KEY_INVALID`**, nie wartości z tej tabeli.

Przy walidacji `ValidationPipe` źródłowe `message` bywa tablicą stringów; **`GlobalExceptionFilter`** emituje **`message` jako jeden string** (`array.join('; ')`). Pełny słownik kodów — `dictionary.md`.

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

Zgodnie z DTO: **`modelAlias`** (string), **`messages`** (tablica **od 1 do 50** wiadomości), każda wiadomość: **`role`** ∈ `{user, assistant}`, **`content`** string **do 3000** znaków (`src/chat/dto/chat-request.dto.ts`, `chat-message.dto.ts`). Bez **`params`** (nadwyżkowe pola odrzuca `ValidationPipe`: `whitelist` + `forbidNonWhitelisted`). Maksymalny rozmiar JSON body: **1 MB** (`express.json` w `src/main.ts`).

### Response (`200`)

`ChatService.executeChat`: `id`, `provider`, `model`, `output`, `usage` (opcjonalnie, zależnie od adaptera), `requestId`.

**Cache (opcjonalny):** gdy backend cache jest dostępny (`ResponseCacheService` + `CACHE_ENABLED` / `CACHE_BACKEND` — `konfiguracja.md`), przed wywołaniem providera wykonywany jest lookup; przy trafieniu zwracany jest zapisany JSON z **`cached: true`** oraz **`cachedAt`** (timestamp ISO). W przeciwnym razie po udanym wywołaniu providera odpowiedź jest zapisywana pod kluczem zależnym m.in. od `modelAlias`, treści `messages` i sygnatury warstw system promptu (SHA-256). **Streaming nie jest cache’owany.**

Pole **`model`** to **alias** z żądania (`modelAlias`) zarówno w odpowiedzi standardowej, jak i w SSE (`meta.model`) — vendorowy `modelId` nie jest zwracany w żadnej odpowiedzi (`ChatService.executeChat` i `ChatService.executeStream` zwracają `requestBody.modelAlias`).

### Typowe kody

| HTTP | Kiedy |
|------|--------|
| 200 | Sukces |
| 400 | Walidacja DTO; nieznany `modelAlias` → zwykle `code: MODEL_ALIAS_NOT_FOUND` (`ProviderRegistryService`); inne `BadRequestException` mogą nadpisać `code` (np. `VALIDATION_FAILED`) |
| 401 | Brak nagłówka `X-Gateway-Key` (`GATEWAY_KEY_MISSING`) |
| 403 | Niepoprawny `X-Gateway-Key` (`GATEWAY_KEY_INVALID`) |
| 502 | M.in. `PROVIDER_UNSUPPORTED` gdy typ providera z YAML nie ma adaptera w runtime (`UnsupportedProviderException`); inne błędy upstream — `provider-error.mapper.ts` |
| 500 | Nieobsłużony błąd (np. SDK); wyjątkowo brak allowlisty kluczy (`GATEWAY_KEY_NOT_CONFIGURED`) |

---

## `POST /api/v1/chat/stream` — SSE

**Kontroler:** `ChatStreamController`. Ustawiane są nagłówki `200` + `text/event-stream`, następnie wywoływane jest **`flushHeaders()`**, a potem `ChatService.executeStream` (zapis zdarzeń przez callback).

**Zdarzenia:**

1. `meta` — `{ id, provider, model, requestId }`
2. `delta` — `{ text }`
3. `done` — `{}` (pusty obiekt)

**Błędy i JSON `ErrorEnvelope`:**

- **Pewny JSON** (jak przy czacie standardowym): odrzucenie przez **`ValidationPipe`** (np. zła rola, za długi `content`, >50 wiadomości) oraz błędy **`GatewayKeyGuard`** — zachodzą **przed** wejściem w metodę zapisującą nagłówki SSE.
- **Po `flushHeaders`:** błędy z **`executeStream`** (m.in. nieznany alias → `MODEL_ALIAS_NOT_FOUND`, brak streamingu → `STREAMING_NOT_SUPPORTED`, problemy z `resolve`) powstają **po** rozpoczęciu odpowiedzi `text/event-stream`. W takiej sytuacji klient **nie powinien** zakładać poprawnego JSON `ErrorEnvelope` — zachowanie zależy od częściowego zapisu i obsługi wyjątku po nagłówkach.

Kody **`STREAMING_NOT_SUPPORTED`** i komunikaty są zwracane w payloadzie `HttpException` z `ChatService.executeStream` — patrz `src/chat/chat.service.ts`.

---

## `GET /api/v1/health`

Liveness — `HealthService.check()` (`status`, `message`, `timestamp` ISO).

---

## Kody i słownik

Stabilne kody maszynowe — **`dictionary.md`**. **`GlobalExceptionFilter`** zachowuje **`code`** z obiektowego payloadu wyjątku (m.in. `GATEWAY_KEY_*`, `MODEL_ALIAS_NOT_FOUND`, `STREAMING_NOT_SUPPORTED`, `PROVIDER_UNSUPPORTED`), w przeciwnym razie stosuje mapowanie ze statusu HTTP (`DEFAULT_HTTP_STATUS_TO_CODE`).

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
