# SPEC — Chat (streaming) — `POST /chat/stream`

## Cel / problem

Udostępnić endpoint streamingowy (SSE), który zwraca odpowiedź LLM w formie strumienia zdarzeń w **jednym** formacie gateway, niezależnym od providera.

## Warunki wstępne (env)

Identycznie jak dla `POST /chat`: klucze providerów **per `apiKeyRef`** w YAML (`provider-api-key.validation.ts`, `docs/konfiguracja.md`), oraz poprawny `gateway.config.yaml`.

**Stan implementacji:** `POST /api/v1/chat/stream` — `ChatStreamController`, `validateForStreaming` + `executeStream`, `StreamCleanupInterceptor`. Auth/limity: `@GatewayKeyAndSmartRateLimit()`. Cache **nie** dotyczy streamingu.

## Użytkownicy i scenariusze

### Scenariusz A — streaming w UI

1. Klient otwiera połączenie do `/chat/stream`.
2. Odbiera `meta`, potem serię `delta`, na końcu `done`.
3. Renderuje tekst na bieżąco.

### Scenariusz B — provider bez streamingu

1. Klient wywołuje `/chat/stream` z aliasem modelu, który nie wspiera streamingu.
2. Gateway odrzuca request deterministycznym błędem bez wywołania providera.

## Wymagania funkcjonalne

F-1. Endpoint przyjmuje taki sam request jak `POST /chat` (standard), w tym opcjonalne **`conversationId`** — ten sam kontrakt Sentry co standard (konwersacja w request; pełna historia w `messages[]` od tury 2) — `docs/conversation-tracking.md`.

F-2. Odpowiedź jest `text/event-stream` (SSE).

F-3. Gateway musi wysłać `event: meta` na początku strumienia (w tym **`conversationId`** — echo lub `conv_<uuid>`).

F-4. Gateway musi wysyłać `event: delta` dla kolejnych fragmentów tekstu.

F-5. Gateway musi wysłać `event: done` na końcu strumienia. Payload `done` może zawierać: `usage` (z `totalTokens`), `toolCalls`, `finishReason` (`stop` | `tool_calls` | `length` | `content_filter` — `GatewayFinishReason`), opcjonalnie `usageDetails`, `thinkingContent`, `systemFingerprint` (tylko gdy adapter upstream je dostarczy), `warnings`, `effectiveModelAlias`.

F-6. Jeśli `modelAlias` nie wspiera streamingu lub adapter nie implementuje `stream` → `STREAMING_NOT_SUPPORTED` / `MODEL_ALIAS_NOT_FOUND` z **`validateForStreaming`** (**przed** `flushHeaders`) — JSON `ErrorEnvelope`. Błędy providera w **`executeStream`** mogą powstać **po** rozpoczęciu SSE.

F-7. W przypadku błędu po rozpoczęciu streamingu zachowanie musi być spójne:

- zamknięcie połączenia w sposób przewidywalny, oraz
- log z `requestId` i `code` błędu.

**Stan kodu:** nagłówek odpowiedzi **`x-request-id`** ustawiany przez `RequestIdMiddleware` przed `flushHeaders`. **Cooldown** po 429 od providera (`RATE_LIMITED` w `ChatService`) — **tylko** `POST /api/v1/chat`, nie streaming (`dokumentacja_api.md`).

## Wymagania niefunkcjonalne

NFR-1. Streaming nie może powodować wycieku pamięci (brak niekończących się buforów).

NFR-2. `requestId` musi być widoczny w `meta`.

NFR-3. Gateway nie może emitować surowych payloadów SDK providerów jako SSE.

## Kryteria akceptacji

- [x] `meta` pojawia się raz i zawiera `requestId`, `provider`, `model`, `conversationId` (oraz `id` gateway).
- [ ] `delta` składa się w finalny tekst zgodny ze standardową odpowiedzią (na ile to możliwe) — częściowo: E2E sprawdza obecność zdarzeń `meta`/`delta`/`done` (`gateway-chat.e2e-spec.ts`); pełna asercja treści — do rozszerzenia.
- [x] `done` kończy stream; payload może zawierać `usage`, `toolCalls`, `finishReason`, opcjonalnie `usageDetails`, `thinkingContent`, `warnings`, `effectiveModelAlias` (pusty `{}` gdy brak metadanych końcowych).
- [x] Dla modelu bez streamingu zwracany jest JSON z `code: STREAMING_NOT_SUPPORTED` (`validateForStreaming`, przed SSE).

## Poza zakresem (względem rdzenia MVP)

- Wznawianie streamingu, reconnect, exactly-once semantics.

