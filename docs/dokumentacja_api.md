# Dokumentacja API — AI Provider Gateway

Wersja dokumentu: **0.4**. Dokument jest wersjonowany razem z kodem. **`openapi.json`** jest zsynchronizowany z **`src/`** (żądania, odpowiedzi sukcesu, domyślne błędy NestJS).

## Źródła prawdy (kolejność)

1. **`openapi.json`** — kontrakt HTTP (OpenAPI 3.1) zgodny z aktualnym kodem.
2. **Kod NestJS** (`src/**/*.controller.ts`, serwisy, DTO).
3. **`PLAN_IMPLEMENTACJI.md`** — kolejne fazy (m.in. **Faza 5**: envelope z polem `code`, `x-request-id`, `params` w body, skrypt `config:validate`).
4. **`SYSTEM_PROMPTS_REFACTOR.md`** — plan zmiany ról w `messages[]` (**jeszcze nie wdrożony** — po zmianie konieczna aktualizacja OpenAPI i tego dokumentu).
5. **`docs/spec/`** — SDD (wymagania docelowe, mogą wyprzedzać wdrożenie).

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
- **Env** — w **`NODE_ENV=production`** wymagany jest co najmniej jeden niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`).

**Nagłówek `X-Gateway-Key`:** wymóg docelowy (`SPEC-PLATFORMA-I-KONTRAKTY`); **nie jest egzekwowany** w kontrolerach.

---

## Format błędów (dziś)

Zgodnie z **`openapi.json`** (`NestHttpExceptionBody`): NestJS zwraca m.in.

```json
{
  "statusCode": 400,
  "message": "Model alias … not found in config",
  "error": "Bad Request"
}
```

Przy walidacji `ValidationPipe` pole `message` bywa **tablicą** stringów.

---

### System prompt i role w `messages[]` *(kod vs plan refaktora)*

**Dziś:** `ChatRequestDto` dopuszcza role `system`, `user`, `assistant`; `normalizeMessagesForProvider` (`ai-provider.interface.ts`) składa treść systemową przed wywołaniem adaptera.

**Plan (`SYSTEM_PROMPTS_REFACTOR.md`):** usunięcie `system` z API na rzecz plików w `src/config/system-prompt/`.

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

Stabilne kody maszynowe (`MODEL_ALIAS_NOT_FOUND`, itd.) — **`dictionary.md`**; wdrożenie w odpowiedziach HTTP przewidziane w **Fazie 5**. Obecnie klienci opierają się na **`statusCode`** oraz **`message`** z Nest.

---

## Uwagi dla klientów

1. Używaj **`openapi.json`** do generatorów i integracji.
2. Nie wysyłaj **`params`** w body — nie są częścią DTO (konfiguracja aliasu w YAML dostarcza domyślne wartości używane w serwisie).
3. Przy streamingu składaj tekst z kolejnych `delta`; `done` nie niesie metryk tokenów w obecnej wersji.
4. **`usage`** może być niekompletne między providerami.

Powiązane: `lista_endpointów.md`, `architektura_api.md`, `konfiguracja.md`, `PLAN_IMPLEMENTACJI.md`.
