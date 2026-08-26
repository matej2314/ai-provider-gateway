---
wersja: 3
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-26
---

# SPEC — Chat (streaming) — `POST /chat/stream`

## Cel / problem

Udostępnić endpoint streamingowy (SSE), który zwraca odpowiedź LLM w formie strumienia zdarzeń w **jednym** formacie gateway, niezależnym od providera.

## Warunki wstępne (env)

Identycznie jak dla `POST /chat`: sekrety per instancja wg `SPEC-KONFIGURACJA.md`, poprawny `gateway.config.yaml`.

**Stan implementacji:** `POST /api/v1/chat/stream` — `ChatStreamController`, `validateForStreaming` + `executeStream`, `StreamCleanupInterceptor`. Auth/limity: `@GatewayKeyAndSmartRateLimit()`. Cache exact **i** semantyczny **nie** dotyczą streamingu (v1) — `executeStream` nie woła guarda cache.

## Użytkownicy i scenariusze

### Scenariusz A — streaming w UI

1. Klient otwiera połączenie do `/chat/stream`.
2. Odbiera `meta`, potem serię `delta`, na końcu `done`.
3. Renderuje tekst na bieżąco.

### Scenariusz B — provider bez streamingu

1. Klient wywołuje `/chat/stream` z aliasem modelu, który nie wspiera streamingu.
2. Gateway odrzuca request deterministycznym błędem bez wywołania providera.

## Wymagania funkcjonalne

F-1. Endpoint przyjmuje taki sam request jak `POST /chat` (standard), w tym opcjonalne `conversationId` — ten sam kontrakt Sentry co standard — `docs/pl/conversation_tracking.md`.

F-2. Odpowiedź jest `text/event-stream` (SSE).

F-3. Gateway musi wysłać `event: meta` na początku strumienia (w tym `conversationId` — echo lub `conv_<uuid>`).

F-4. Gateway musi wysyłać `event: delta` dla kolejnych fragmentów tekstu.

F-5. Gateway musi wysłać `event: done` na końcu strumienia. Payload `done` może zawierać: `usage` (z `totalTokens`), `toolCalls`, `finishReason` (`stop` | `tool_calls` | `length` | `content_filter`), opcjonalnie `usageDetails`, `thinkingContent`, `systemFingerprint` (tylko gdy adapter upstream je dostarczy), `warnings`, `effectiveModelAlias`.

F-6. Jeśli `modelAlias` nie wspiera streamingu lub adapter nie implementuje `stream` → `STREAMING_NOT_SUPPORTED` / `MODEL_ALIAS_NOT_FOUND` z `validateForStreaming` (**przed** `flushHeaders`) — JSON `ErrorEnvelope`. Błędy w `executeStream` (w tym cooldown i `MODEL_NOT_ALLOWED`) mogą powstać **po** `flushHeaders` / starcie SSE.

F-7. W przypadku błędu po rozpoczęciu streamingu zachowanie musi być spójne:

- zamknięcie połączenia w sposób przewidywalny (`res.end()` w `finally`), oraz
- log z `requestId` i `code` błędu.

F-8. *(Cooldown po 429 upstream)* Ta sama polityka co czat JSON: `checkCooldown` w `prepareRequestForExecution` (wołane z `executeStream` **po** `flushHeaders`) oraz `setCooldown` w `ChatErrorHandlerService.handleProviderError`. Kod błędu: `RATE_LIMITED`.

Zmiana względem: wcześniejszy „Stan kodu” w tym pliku (cooldown **tylko** dla `POST /chat`, nie streaming; powołanie na `dokumentacja_api.md`). Powód: `executeChat` i `executeStream` współdzielą `prepareRequestForExecution` i `handleProviderError` — zgodnie z `src/chat/chat.service.ts` oraz `docs/pl/dokumentacja_api.md` / `docs/api-documentation.md`.

**Kolejność w kontrolerze:** `validateForStreaming` → nagłówki SSE + `flushHeaders` → `executeStream`. Guardy klucza i RPS/streamów działają **przed** `flushHeaders`. Cooldown providera — **po** wysłaniu nagłówków SSE.

F-9. *(Równoległe streamy)* Przy `RATE_LIMIT_SMART_ENABLED=true` i gotowym Redis `SmartRateLimitGuard` rezerwuje slot `maxConcurrentStreams` dla URL kończącego się na `/stream` **zanim** polecą nagłówki SSE. Przekroczenie → JSON **429** `RATE_LIMITED`. Slot zwalnia `StreamCleanupInterceptor` w `finalize` (także przy błędzie / zerwaniu klienta). Polityka liczbowa: `SPEC-PLATFORMA-I-KONTRAKTY.md` F-16–F-18, `SPEC-KONFIGURACJA.md` F-1c.

Nagłówek odpowiedzi `x-request-id` ustawia `RequestIdMiddleware` przed `flushHeaders`.

## Wymagania niefunkcjonalne

NFR-1. Streaming nie może powodować wycieku pamięci (brak niekończących się buforów); slot strumienia zwalniany przez `StreamCleanupInterceptor`.

NFR-2. `requestId` musi być widoczny w `meta`.

NFR-3. Gateway nie może emitować surowych payloadów SDK providerów jako SSE.

## Kryteria akceptacji

- [x] `meta` pojawia się raz i zawiera `requestId`, `provider`, `model`, `conversationId` (oraz `id` gateway).
- [ ] `delta` składa się w finalny tekst zgodny ze standardową odpowiedzią (na ile to możliwe) — częściowo: E2E sprawdza obecność zdarzeń `meta`/`delta`/`done` (`gateway-chat.e2e-spec.ts`); pełna asercja treści — do rozszerzenia.
- [x] `done` kończy stream; payload może zawierać `usage`, `toolCalls`, `finishReason`, opcjonalnie `usageDetails`, `thinkingContent`, `warnings`, `effectiveModelAlias` (pusty `{}` gdy brak metadanych końcowych).
- [x] Dla modelu bez streamingu zwracany jest JSON z `code: STREAMING_NOT_SUPPORTED` (`validateForStreaming`, przed SSE).
- [x] Cooldown po 429 dotyczy także `executeStream` (unit: `chat-error-handler.service.spec.ts`, `chat-cache-guard.service.spec.ts`).
- [x] Slot równoległego streamu jest zwalniany przez `StreamCleanupInterceptor` (NFR-1 / F-9).

## Poza zakresem (względem rdzenia MVP)

- Wznawianie streamingu, reconnect, exactly-once semantics.
- Zapis exact + semantic po udanym streamie oraz replay SSE z cache. Zmiana względem: wcześniejsze poza zakresem tylko reconnect. Powód: v1 celowo bez cache na streamie; ten sam kontrakt co JSON (`SPEC-CHAT.md` F-8b — `embedAttempted`) wchodzi w planie Faza 5 (5.A: SET z `{ embedAttempted: false }` po `done`; 5.B: lookup na starcie, miss → SET ze stanem z lookupu). Szczegóły: `docs/pl/konfiguracja.md` (ścieżka miss), `semantic-cache-plan.md`.
