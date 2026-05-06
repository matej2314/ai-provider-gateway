# SPEC — Chat (standard) — `POST /chat`

## Cel / problem

Udostępnić jeden endpoint, który zwraca pełną odpowiedź LLM w spójnym formacie niezależnie od providera.

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

F-2. `messages[]` wspiera role co najmniej: `system`, `user`, `assistant`.

F-3. Gateway musi zwrócić odpowiedź w spójnym formacie niezależnym od providera.

F-4. Gateway musi dołączyć `provider` i resolved `model` do odpowiedzi.

F-5. Gateway powinien dołączyć `usage`, jeśli provider/SDK udostępnia te dane.

F-6. Nieznany `modelAlias` → `400` z `code=MODEL_ALIAS_NOT_FOUND`.

F-7. Parametry poza allowlistą → `400` z `code=VALIDATION_FAILED` (lub dedykowanym kodem).

## Wymagania niefunkcjonalne

NFR-1. Timeout wywołania providera jest kontrolowany polityką per alias.

NFR-2. Retry jest ograniczony do błędów 429/5xx i do maxAttempts z konfiguracji.

NFR-3. Odpowiedź nie może zawierać surowych sekretów ani surowych stack trace.

## Kryteria akceptacji

- [ ] Dla poprawnego requestu gateway zwraca `200` i spójny JSON.
- [ ] Dla nieznanego `modelAlias` gateway zwraca `400` bez wywołania providera.
- [ ] Parametry są walidowane (allowlista + bounds).
- [ ] `requestId` jest obecny w odpowiedzi (patrz `SPEC-PLATFORMA-I-KONTRAKTY`).

## Poza zakresem (MVP)

- Pamięć rozmowy i persistence.
- Narzędzia (MCP tool runner) wykonywane przez gateway.

