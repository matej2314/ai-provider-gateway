---
wersja: 7
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-29
---

# SPEC — Chat (streaming) — `POST /chat/stream`

## Cel / problem

Udostępnić endpoint streamingowy (SSE), który zwraca odpowiedź LLM w formie strumienia zdarzeń w **jednym** formacie gateway, niezależnym od providera.

## Warunki wstępne (env)

Identycznie jak dla `POST /chat`: sekrety per instancja wg `SPEC-KONFIGURACJA.md`, poprawny `gateway.config.yaml`.

**Stan implementacji:** `POST /api/v1/chat/stream` — `ChatStreamController`, `validateForStreaming` → `resolveStreamCache` (prepare + cooldown + `ChatCachePipelineService.getCachedIfAllowed`) → `flushHeaders` → hit: `replayStreamCacheHit` (`StreamCacheReplayService`) / miss: `executeStreamMiss` (live SSE + opcjonalny zapis), `StreamCleanupInterceptor`. Auth/limity: `@GatewayKeyAndSmartRateLimit()`. Cache exact **i** semantyczny **dotyczą** streamingu na **wspólnym** magazynie `CachedChatResponse` z JSON (`SPEC-CHAT.md` F-8, F-8b, F-8c, F-10): ta sama tożsamość klucza, polityka aliasu, skip tooling / `unknown` / `didFallback`, brak per-model cache flag. Soft singleflight **nie** dotyczy streamu (równoległy miss może dać 2× LLM; first-writer-wins w Redis chroni treść — `SPEC-CHAT.md` F-8d).

Zmiana względem: wersja 4 („Cache exact i semantyczny **nie** dotyczą streamingu (v1) — `executeStream` nie woła guarda cache”; „przy planowanym cache…”). Powód: wdrożony lookup/zapis/replay w `src/chat/` (`resolveStreamCache`, `executeStreamMiss`, `StreamCacheReplayService`).

## Użytkownicy i scenariusze

### Scenariusz A — streaming w UI

1. Klient otwiera połączenie do `/chat/stream`.
2. Odbiera `meta`, potem serię `delta`, na końcu `done`.
3. Renderuje tekst na bieżąco.

### Scenariusz B — provider bez streamingu

1. Klient wywołuje `/chat/stream` z aliasem modelu, który nie wspiera streamingu.
2. Gateway odrzuca request deterministycznym błędem bez wywołania providera.

### Scenariusz C — trafienie cache na streamie

1. Operator włącza cache (jak dla JSON — `docs/pl/konfiguracja.md`).
2. Klient (lub wcześniejsze `POST /chat`) zapisuje wpis w wspólnym magazynie.
3. Kolejne `POST /chat/stream` z tym samym kluczem exact (lub semantic hit) dostaje SSE: `meta` z `cached: true`, `cachedAt`, `cacheSource` → `delta` (chunki po 64 znaki z `output.text`) → `done` — **bez** wywołania LLM.

## Wymagania funkcjonalne

F-1. Endpoint przyjmuje taki sam request jak `POST /chat` (standard), w tym opcjonalne `conversationId` — ten sam kontrakt Sentry co standard — `docs/pl/conversation_tracking.md`.

F-2. Odpowiedź jest `text/event-stream` (SSE).

F-3. Gateway musi wysłać `event: meta` na początku strumienia (w tym `conversationId` — echo lub `conv_<uuid>`).

F-4. Gateway musi wysyłać `event: delta` dla kolejnych fragmentów tekstu.

F-5. Gateway musi wysłać `event: done` na końcu strumienia. Payload `done` może zawierać: `usage` (z `totalTokens`), `toolCalls`, `finishReason` (`stop` | `tool_calls` | `length` | `content_filter`), opcjonalnie `usageDetails`, `thinkingContent`, `systemFingerprint` (tylko gdy adapter upstream je dostarczy), `warnings`, `effectiveModelAlias`.

F-6. Jeśli `modelAlias` nie wspiera streamingu lub adapter nie implementuje `stream` → `STREAMING_NOT_SUPPORTED` / `MODEL_ALIAS_NOT_FOUND` z `validateForStreaming` (**przed** `flushHeaders`) — JSON `ErrorEnvelope`. Cooldown (`RATE_LIMITED`) oraz błędy prepare w `resolveStreamCache` także **przed** `flushHeaders` — JSON, bez SSE. Błędy w `executeStreamMiss` (np. po starcie live streamu, w tym `MODEL_NOT_ALLOWED` jeśli wystąpi po headers) mogą powstać **po** `flushHeaders`.

Zmiana względem: F-6 w wersji 4 („Błędy w `executeStream` (w tym cooldown i `MODEL_NOT_ALLOWED`) mogą powstać **po** `flushHeaders`”). Powód: cooldown i lookup cache są w `resolveStreamCache` przed nagłówkami SSE (`ChatStreamController`).

F-7. W przypadku błędu po rozpoczęciu streamingu zachowanie musi być spójne:

- zamknięcie połączenia w sposób przewidywalny (`res.end()` w `finally`), oraz
- log z `requestId` i `code` błędu.

F-8. *(Cooldown po 429 upstream)* Ta sama polityka co czat JSON: `ChatProviderCooldownService.assertNotInCooldown` w `prepareRequestForExecution` (wołane z `resolveStreamCache` / ścieżki miss **przed** `flushHeaders` w happy-path kontrolera) oraz `setCooldown` w `ChatErrorHandlerService.handleProviderError`. Kod błędu: `RATE_LIMITED` — odpowiedź JSON `ErrorEnvelope`, **bez** startu SSE.

Zmiana względem: F-8 w wersji 6 (`checkRateLimit` na `ChatCachePipelineService` mapujące `checkCooldown` → 429). Cooldown nie należy do pipeline.

Zmiana względem: F-8 w wersji 4 (`checkCooldown` w `executeStream` **po** `flushHeaders`; „Cooldown providera — **po** wysłaniu nagłówków SSE”). Powód: kontroler woła `resolveStreamCache` przed `flushHeaders` — cooldown blokuje także serwowanie hitu cache (jak JSON).

**Kolejność w kontrolerze:** `validateForStreaming` → `resolveStreamCache` (prepare + cooldown + lookup) → nagłówki SSE + `flushHeaders` → hit: `replayStreamCacheHit` / miss: `executeStreamMiss`. Guardy klucza i RPS/streamów działają **przed** `flushHeaders`.

F-9. *(Równoległe streamy)* Przy `RATE_LIMIT_SMART_ENABLED=true` i gotowym Redis `SmartRateLimitGuard` rezerwuje slot `maxConcurrentStreams` dla URL kończącego się na `/stream` **zanim** polecą nagłówki SSE. Przekroczenie → JSON **429** `RATE_LIMITED`. Slot zwalnia `StreamCleanupInterceptor` w `finalize` (także przy błędzie / zerwaniu klienta). Polityka liczbowa: `SPEC-PLATFORMA-I-KONTRAKTY.md` F-16–F-18, `SPEC-KONFIGURACJA.md` F-1c.

Nagłówek odpowiedzi `x-request-id` ustawia `RequestIdMiddleware` przed `flushHeaders`.

F-10. *(Cache exact + semantic na streamie)* Wspólny magazyn z `POST /chat` (`CachedChatResponse`). Lookup: `ChatCachePipelineService.getCachedIfAllowed` w `resolveStreamCache` — **przed** `flushHeaders`. Hit: `StreamCacheReplayService.replay` — `meta` z `cached: true`, `cachedAt`, `cacheSource` (`exact` | `semantic`); `id` / `provider` / `model` z payloadu cache; `requestId` i `conversationId` z bieżącego żądania; potem `delta` z `output.text` w chunkach po **64** znaki (stała `STREAM_CACHE_REPLAY_CHUNK_SIZE`; delay **0**); potem `done` z metadanymi z cache. Miss: live `streamOnce` + po sukcesie `buildChatResponse` z `assembledText` i `setCachedIfAllowed` (ta sama polityka zapisu co JSON, w tym brak zapisu przy `didFallback` — F-10 w `SPEC-CHAT.md`). Brak soft singleflight / live tee na streamie — równoległy miss może wywołać LLM więcej niż raz; first-writer-wins w Redis (`SPEC-CHAT.md` F-8d).

Zmiana względem: wersja 4 („Cache … **nie** dotyczą streamingu”; poza zakresem: „Zapis exact + semantic … v1 celowo bez cache”). Powód: wspólny magazyn + replay SSE wdrożone w `src/chat/`.

Zmiana względem: w wersji 5 lookup na streamie wskazywał `ChatCacheGuardService.getCachedIfAllowed`. Obowiązuje `ChatCachePipelineService` (ten sam kontrakt metod).

## Wymagania niefunkcjonalne

NFR-1. Streaming nie może powodować wycieku pamięci (brak niekończących się buforów); slot strumienia zwalniany przez `StreamCleanupInterceptor`.

NFR-2. `requestId` musi być widoczny w `meta`.

NFR-3. Gateway nie może emitować surowych payloadów SDK providerów jako SSE.

## Kryteria akceptacji

- [x] `meta` pojawia się raz i zawiera `requestId`, `provider`, `model`, `conversationId` (oraz `id` gateway).
- [ ] `delta` składa się w finalny tekst zgodny ze standardową odpowiedzią (na ile to możliwe) — częściowo: E2E sprawdza obecność zdarzeń `meta`/`delta`/`done` (`gateway-chat.e2e-spec.ts`); pełna asercja treści — do rozszerzenia.
- [x] `done` kończy stream; payload może zawierać `usage`, `toolCalls`, `finishReason`, opcjonalnie `usageDetails`, `thinkingContent`, `warnings`, `effectiveModelAlias` (pusty `{}` gdy brak metadanych końcowych).
- [x] Dla modelu bez streamingu zwracany jest JSON z `code: STREAMING_NOT_SUPPORTED` (`validateForStreaming`, przed SSE).
- [x] Cooldown po 429 dotyczy ścieżki stream **przed** `flushHeaders` (`resolveStreamCache` → `prepareRequestForExecution`); unit/controller: `chat-stream.controller.spec.ts`, `chat-error-handler.service.spec.ts`.
- [x] Slot równoległego streamu jest zwalniany przez `StreamCleanupInterceptor` (NFR-1 / F-9).
- [x] *(Cache stream)* Hit: SSE `meta` z `cached` / `cachedAt` / `cacheSource`; replay chunkami 64; brak live LLM (`stream-cache-replay.service.spec.ts`, `chat.service.spec.ts`, E2E/integration stream-cache).
- [x] *(Cache cross-endpoint)* Wpis z JSON może trafić stream i odwrotnie (wspólny magazyn).
- [x] *(Cooldown + cache)* Aktywny cooldown → 429 JSON bez SSE nawet gdy wpis cache istnieje.

## Poza zakresem (względem rdzenia MVP)

- Wznawianie streamingu, reconnect, exactly-once semantics, soft singleflight / live tee na streamie.
- Sztuczne delaye między chunkami replay, osobny magazyn chunków, per-model flaga cache w YAML.
