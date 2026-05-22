# SPEC — Platforma i kontrakty (AI Provider Gateway)

## Cel / problem

Gateway ma być komponentem “plug&play”: użytkownik dostarcza konfigurację i klucze, a następnie korzysta z jednego API niezależnie od providera LLM.

Ten dokument definiuje **wspólne kontrakty** i zasady obowiązujące wszystkie endpointy:

- envelope błędów,
- requestId,
- stabilne kody błędów,
- zasady walidacji,
- zasady uwierzytelnienia na brzegu (gateway key),
- zasady logowania (bez sekretów).

**Stan implementacji (skrót):** **`openapi.json`** (v0.11.1): czat, SSE, health, `params`, `cached`/`cachedAt`, retry/fallback/`effectiveModelAlias`, smart rate limit (`src/rate-limit/`), **`RATE_LIMITED`** (gateway) / **`PROVIDER_RATE_LIMITED`** (upstream), **`MODEL_NOT_ALLOWED`**, **`PROVIDER_TIMEOUT`**. **`ChatService`** + **`ChatProviderCallService`**. **`GlobalExceptionFilter`** + **`RequestIdMiddleware`** (nagłówek odpowiedzi **`x-request-id`** + pole `requestId` w JSON). Czat: **`@GatewayKeyAndSmartRateLimit()`**. **`ResilientExecutor`**. Pozostałość v1: `config:validate` — `dokumentacja_koncepcyjna.md`.

## Użytkownicy i scenariusze

### Scenariusz A — uruchomienie lokalne

1. Użytkownik wypełnia `.env`: w **production** **minimum jeden** niepusty klucz spośród `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` (patrz `src/config/env.validation.ts` i `docs/konfiguracja.md`). Dodatkowo przygotowuje `gateway.config.yaml`.
2. Użytkownik przygotowuje plik konfiguracyjny modeli/polityk.
3. Uruchamia serwis.
4. Wysyła request na `/chat` lub `/chat/stream`.

### Scenariusz B — użycie w infrastrukturze

1. Użytkownik wdraża serwis w kontenerze.
2. Sekrety są dostarczone przez menedżer sekretów.
3. Konfiguracja modeli jest montowana jako plik.
4. System jest monitorowany przez healthchecki i logi.

## Wymagania funkcjonalne

### Envelope błędów

F-1. Każdy błąd zwracany jako JSON ma kształt:

- `statusCode: number`
- `code: string`
- `message: string`
- `requestId: string`
- `details?: unknown[]`

F-2. `code` jest stabilny i opisany w `docs/dictionary.md`.

### Request ID

F-3. Gateway musi propagować requestId:

- jeśli klient przysłał requestId w nagłówku (np. `x-request-id`) → użyj go,
- jeśli nie → wygeneruj nowy.

F-4. `requestId` musi pojawić się:

- w envelope błędów,
- w odpowiedziach sukcesu (standard),
- w zdarzeniu `meta` (streaming),
- w logach,
- w nagłówku odpowiedzi HTTP **`x-request-id`** (echo wartości z `req.requestId`).

### Walidacja

F-5. Wejście do endpointów jest walidowane na brzegu; niepoprawne requesty kończą się `400` z `code=VALIDATION_FAILED` (lub bardziej szczegółowym, jeśli rozróżniasz).

F-6. Nieznany `modelAlias` kończy się deterministycznym błędem (np. `MODEL_ALIAS_NOT_FOUND`) bez wywołania providera.

### Gateway Key (nagłówek `X-Gateway-Key`)

**Stan kodu:** `openapi.json` definiuje **`GatewayKeyAuth`**; **`GatewayKeyGuard`** (`src/guards/gateway-key.guard.ts`) jest zarejestrowany na kontrolerach czatu.

F-9. Gateway musi weryfikować nagłówek `X-Gateway-Key` dla endpointów czatu:

- `POST /api/v1/chat`
- `POST /api/v1/chat/stream`

F-10. `X-Gateway-Key` jest porównywany z **allowlistą kluczy** (lista/array), aby umożliwić rotację i dokładanie kluczy bez zmian w kontrakcie.

F-11. Brak nagłówka `X-Gateway-Key` kończy się błędem `401` z dedykowanym `code` (opis w `docs/dictionary.md`).

F-12. Niepoprawny `X-Gateway-Key` kończy się błędem `403` z dedykowanym `code` (opis w `docs/dictionary.md`).

F-13. `GET /api/v1/health` nie wymaga `X-Gateway-Key` (integracje orchestratorów).

### Logowanie

F-7. Logi nie mogą zawierać sekretów (kluczy API, tokenów, nagłówków autoryzacji).

F-8. W logach musi być możliwa korelacja request→provider (co najmniej przez `requestId` i pola `provider`, `modelAlias`).

## Wymagania niefunkcjonalne

NFR-1. Fail‑fast konfiguracji: serwis nie startuje, jeśli konfiguracja env/plików jest błędna lub niekompletna.

NFR-2. Brak “open proxy”: konfiguracja nie może pozwalać na dowolne URL-e providerów.

NFR-3. Domyślne zachowanie powinno być bezpieczne: bez dumpowania surowych wyjątków SDK w odpowiedziach.

## Kryteria akceptacji (checklista)

- [x] Wszystkie błędy mają envelope z `code` i `requestId` (`GlobalExceptionFilter`); rozszerzenie zestawu wartości `code` na pełny słownik z `dictionary.md` jest w **Fazie 5** (Krok 5.1b).
- [x] Endpointy czatu wymagają `X-Gateway-Key` zgodnie z allowlistą (`GatewayKeyGuard`, konfiguracja w `src/config/configuration.ts`).
- [x] Nieznany `modelAlias` nie wykonuje żadnego wywołania do providerów (`ProviderRegistryService.resolve` rzuca `BadRequestException` przed wywołaniem adaptera).
- [ ] Logi nie zawierają kluczy i nagłówków auth (weryfikacja przez test/manual) — strukturalne logi z redakcją w **Fazie 6.1** (pino + redaction).
- [x] `requestId` jest widoczny w odpowiedziach standard/stream (body sukcesu, envelope błędu, SSE `meta`) oraz w nagłówku odpowiedzi **`x-request-id`** (`RequestIdMiddleware`).

## Poza zakresem (względem rdzenia MVP)

- Uwierzytelnianie użytkowników końcowych (AuthN/AuthZ).
- Billing i limity użytkownikowe (poza podstawowym throttlingiem serwisu).

