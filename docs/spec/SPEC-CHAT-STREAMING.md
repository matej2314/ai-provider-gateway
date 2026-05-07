# SPEC — Chat (streaming) — `POST /chat/stream`

## Cel / problem

Udostępnić endpoint streamingowy (SSE), który zwraca odpowiedź LLM w formie strumienia zdarzeń w **jednym** formacie gateway, niezależnym od providera.

## Warunki wstępne (env)

Identycznie jak dla `POST /chat`: w **production** gateway wymaga **co najmniej jednego** niepustego klucza spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`, `docs/konfiguracja.md`), oraz poprawnego `gateway.config.yaml`.

**Stan implementacji:** endpoint `POST /api/v1/chat/stream` z **openapi.json** **nie jest zaimplementowany** (Faza 4 w `PLAN_IMPLEMENTACJI.md`). Nagłówek `X-Gateway-Key` — docelowo (`SPEC-PLATFORMA-I-KONTRAKTY`), bez egzekucji w kodzie.

## Użytkownicy i scenariusze

### Scenariusz A — streaming w UI

1. Klient otwiera połączenie do `/chat/stream`.
2. Odbiera `meta`, potem serię `delta`, na końcu `done`.
3. Renderuje tekst na bieżąco.

### Scenariusz B — provider bez streamingu

1. Klient wywołuje `/chat/stream` z aliasem modelu, który nie wspiera streamingu.
2. Gateway odrzuca request deterministycznym błędem bez wywołania providera.

## Wymagania funkcjonalne

F-1. Endpoint przyjmuje taki sam request jak `POST /chat` (standard).

F-2. Odpowiedź jest `text/event-stream` (SSE).

F-3. Gateway musi wysłać `event: meta` na początku strumienia.

F-4. Gateway musi wysyłać `event: delta` dla kolejnych fragmentów tekstu.

F-5. Gateway musi wysłać `event: done` na końcu (z usage, jeśli dostępne).

F-6. Jeśli `modelAlias` nie wspiera streamingu → `400` z `code=STREAMING_NOT_SUPPORTED`.

F-7. W przypadku błędu po rozpoczęciu streamingu zachowanie musi być spójne:

- zamknięcie połączenia w sposób przewidywalny, oraz
- log z `requestId` i `code` błędu.

## Wymagania niefunkcjonalne

NFR-1. Streaming nie może powodować wycieku pamięci (brak niekończących się buforów).

NFR-2. `requestId` musi być widoczny w `meta`.

NFR-3. Gateway nie może emitować surowych payloadów SDK providerów jako SSE.

## Kryteria akceptacji

- [ ] `meta` pojawia się raz i zawiera `requestId`, `provider`, `model`.
- [ ] `delta` składa się w finalny tekst zgodny ze standardową odpowiedzią (na ile to możliwe).
- [ ] `done` kończy stream.
- [ ] Dla modelu bez streamingu zwracany jest deterministyczny błąd.

## Poza zakresem (MVP)

- Wznawianie streamingu, reconnect, exactly-once semantics.

