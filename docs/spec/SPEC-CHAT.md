# SPEC — Chat (standard) — `POST /chat`

## Cel / problem

Udostępnić jeden endpoint, który zwraca pełną odpowiedź LLM w spójnym formacie niezależnie od providera.

## Warunki wstępne (env)

Gateway musi działać na poprawnie zwalidowanym środowisku: w **`NODE_ENV=production`** obowiązuje **minimum jeden** niepusty klucz API spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (po `trim()`), zgodnie z `src/config/env.validation.ts` i `docs/konfiguracja.md`. Ponadto wymagany jest poprawny `gateway.config.yaml` (fail‑fast przy starcie).

**Stan implementacji:** nagłówek **`X-Gateway-Key`** — **wymagany** (`GatewayKeyGuard`, `openapi.json` security); allowlista z konfiguracji — `docs/konfiguracja.md`. Body **`params`** — zaplanowane (**Faza 5**); DTO i `openapi.json` przyjmują wyłącznie `modelAlias` i `messages`.

## Użytkownicy i scenariusze

### Scenariusz A — prosta rozmowa

1. Klient wysyła `modelAlias` i `messages`.
2. Gateway wykonuje request do właściwego providera.
3. Klient dostaje JSON z odpowiedzią i metadanymi (provider, model, usage).

### Scenariusz B — kontrola parametrów

1. Klient wysyła `params.temperature` i `params.maxOutputTokens`.
2. Gateway waliduje allowlistę i bounds.
3. Gateway mapuje parametry do pola SDK providera.

## Wymagania funkcjonalne

F-1. Endpoint przyjmuje request zawierający:

- `modelAlias` (string, wymagane),
- `messages[]` (wymagane),
- `params` (opcjonalnie).

F-2. `messages[]` wspiera role wyłącznie: `user`, `assistant` (rola `system` w API jest zablokowana).

F-2a. Gateway buduje `system` dla adaptera **wyłącznie z plików** w `src/config/system-prompt/` (warstwy MASTER / MAIN / opcjonalnie `models/<modelAlias>.md`), zgodnie z `ChatService` i `configuration.ts`. Do adaptera trafia `messages[]` zawierające wyłącznie `user` i `assistant`.

F-3. Gateway musi zwrócić odpowiedź w spójnym formacie niezależnym od providera.

F-4. Gateway musi dołączyć `provider` i resolved `model` do odpowiedzi.

F-5. Gateway powinien dołączyć `usage`, jeśli provider/SDK udostępnia te dane.

F-6. Nieznany `modelAlias` → `400` z `code=MODEL_ALIAS_NOT_FOUND` (**docelowy** kod). Obecnie: `400` z envelope `ErrorEnvelope` (`code=VALIDATION_FAILED`) — `GlobalExceptionFilter` mapuje wszystkie 400 na `VALIDATION_FAILED`. Rozróżnienie `MODEL_ALIAS_NOT_FOUND` vs ogólny `VALIDATION_FAILED` wymaga rozszerzenia mappingu w filtrze (Faza 5, Krok 5.1b).

F-7. Parametry poza allowlistą → `400` z `code=VALIDATION_FAILED` (lub dedykowanym kodem).

## Wymagania niefunkcjonalne

NFR-1. Timeout wywołania providera jest kontrolowany polityką per alias.

NFR-2. Retry jest ograniczony do błędów 429/5xx i do maxAttempts z konfiguracji.

NFR-3. Odpowiedź nie może zawierać surowych sekretów ani surowych stack trace.

## Kryteria akceptacji

- [x] Dla poprawnego requestu gateway zwraca `200` i spójny JSON (`ChatService.executeChat`).
- [x] Dla nieznanego `modelAlias` gateway zwraca `400` bez wywołania providera (envelope `ErrorEnvelope` z `code: VALIDATION_FAILED`; rozróżnienie `MODEL_ALIAS_NOT_FOUND` w **Fazie 5**).
- [ ] Parametry są walidowane (allowlista + bounds); DTO nie przyjmuje jeszcze `params`.
- [x] `requestId` jest obecny w odpowiedzi sukcesu; propagacja z nagłówka żądania `x-request-id` jest **aktywna** (`RequestIdInterceptor` global). Response header `x-request-id` (poza body) nie jest jeszcze ustawiany.

## Poza zakresem (względem rdzenia MVP)

- Pamięć rozmowy i persistence.
- Narzędzia (MCP tool runner) wykonywane przez gateway.

