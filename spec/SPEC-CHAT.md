---
wersja: 19
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-29
---

# SPEC — Chat (standard) — `POST /chat`

## Cel / problem

Udostępnić jeden endpoint, który zwraca pełną odpowiedź LLM w spójnym formacie niezależnie od providera.

## Warunki wstępne (env)

Gateway musi działać na poprawnie zwalidowanym środowisku: sekrety włączonych instancji wg `SPEC-KONFIGURACJA.md` (F-1a — w tym wyjątek OpenAI: pusty `apiKeyRef`, wymagany `baseUrlRef`) oraz poprawny `gateway.config.yaml` (fail‑fast przy starcie).

**Stan implementacji:** nagłówek **`X-Gateway-Key`** — wymagany (`@GatewayKeyAndSmartRateLimit()`, `openapi.json`). Allowlista i RPS: `SPEC-PLATFORMA-I-KONTRAKTY.md`, `SPEC-KONFIGURACJA.md`. Body: `modelAlias`, `messages`, opcjonalne `conversationId` (`docs/pl/conversation_tracking.md`), opcjonalne `metadata`, opcjonalne `params` i `tooling`. Cache **exact-match** i opcjonalny **semantyczny** — wspólny magazyn `CachedChatResponse` dla JSON (`executeChat`) i streamingu (`resolveStreamCache` / `executeStreamMiss`) — `src/cache/`, `ChatCachePipelineService`; kontrakt SSE — `SPEC-CHAT-STREAMING.md` F-10.

Zmiana względem: w wersji 17 dokumentu ten sam serwis aplikacyjny nazywał się `ChatCacheGuardService`. Obowiązuje `ChatCachePipelineService` (`src/chat/services/chat-cache-pipeline.service.ts`) — lookup/store exact + semantic. Nazwa nie jest Nest Guard.

Zmiana względem: w wersji 18 dokumentu pipeline obejmował także `checkRateLimit` (mapowanie `checkCooldown` → HTTP 429). Cooldown po 429 upstream należy do `ChatProviderCooldownService.assertNotInCooldown` w `prepareRequestForExecution` (para z `ChatErrorHandlerService.setCooldown`); pipeline nie wstrzykuje limitera.

## Użytkownicy i scenariusze

### Scenariusz A — prosta rozmowa

1. Klient wysyła `modelAlias` i `messages`.
2. Gateway wykonuje request do właściwego providera.
3. Klient dostaje JSON z odpowiedzią i metadanymi (provider, model, usage).

### Scenariusz C — powtórzone zapytanie z cache

1. Operator włącza cache (`CACHE_ENABLED`, ewentualnie Redis — `docs/pl/konfiguracja.md`).
2. Klient wysyła `POST /api/v1/chat` z określonym `modelAlias` i `messages`.
3. Przy drugim identycznym żądaniu (w granicach klucza cache — `ResponseCacheService`) gateway może zwrócić odpowiedź z `cached: true`, `cachedAt` i `cacheSource: "exact"` bez wywołania providera.

### Scenariusz D — wieloturowa rozmowa z metrykami Sentry

**Wariant zalecany (konwersacja w Sentry od drugiej tury):**

1. **Tura 1:** `POST /api/v1/chat` bez `conversationId` — tylko `messages: [user₁]`. Sentry: span `gen_ai.chat` **bez** `gen_ai.conversation.id`. Odpowiedź: `conversationId: conv_*` — klient zapisuje.
2. **Tura 2+:** ten sam `conversationId` w body + **pełna** `messages[]`. Sentry: `gen_ai.conversation.id`.
3. Gateway **nie** persistuje historii — klient musi dokładać odpowiedzi assistenta do `messages[]`.

**Wariant alternatywny:** klient generuje `conversationId` (UUID) już w turze 1.

Szczegóły: `docs/pl/conversation_tracking.md` / `docs/conversation-tracking.md`.

## Wymagania funkcjonalne

F-1. Endpoint przyjmuje request zawierający:

- `modelAlias` (string, wymagane),
- `messages[]` (wymagane),
- `conversationId` (string, opcjonalnie — w **request** włącza grupowanie Sentry; w **response** zawsze echo lub `conv_*`),
- `metadata` (opcjonalnie — propagacja do adaptera; Anthropic: `userId` → SDK `metadata.user_id`),
- `params` (opcjonalnie: `temperature`, `maxOutputTokens`, `topP`, `topK`, `stop`, `frequencyPenalty`, `presencePenalty`, `seed`, `responseFormat`, `thinkingEnabled`, `thinkingBudget` — tylko pola z `policy.params.allowOverrides` dla aliasu; merge YAML defaults ← body dla grupy mergeowanej; `topK` / `stop` / `responseFormat` / `thinkingBudget` tylko z body; wartości po merge obcinane do `policy.params.bounds`),
- opcjonalne `params.parallelToolCalls` (boolean) — **nie** należy do `allowOverrides` / `OVERRIDE_KEYS`; przekazywane z body gdy podane,
- opcjonalne `tooling` (`definitions`, `toolChoice`).

F-1a. Niedozwolony override w `params` (pole z `OVERRIDE_KEYS` poza `allowOverrides`) → `400` z `code=MODEL_NOT_ALLOWED` (`resolveProviderCallOptions`).

F-1b. Żądanie thinking (`thinkingEnabled: true`, a dla `type: openai` także implicit reasoning z `thinkingBudget` string) przy `capabilities.thinking !== true` → `400` z `code=THINKING_NOT_SUPPORTED` (`ChatValidationService.validateThinking`).

F-2. `messages[]` wspiera role: `user`, `assistant`, `tool` (rola `system` w API jest zablokowana). Asystent może zawierać `toolCalls[]`; rola `tool` wymaga `toolCallId`.

F-2a. Gateway buduje `system` dla adaptera **wyłącznie z plików** w `src/config/system-prompt/`. Do adaptera trafia `messages[]` z turami użytkownika, asystenta i wyników narzędzi. `tooling` w body wymaga `capabilities.tools: true` — inaczej `TOOLS_NOT_SUPPORTED`.

F-2b. Odpowiedź może zawierać `toolCalls`, `finishReason` (`stop` | `tool_calls` | `length` | `content_filter` — `GatewayFinishReason`), opcjonalnie `usageDetails`, opcjonalnie `systemFingerprint` (gdy adapter upstream je dostarczy), opcjonalnie `thinkingContent`, opcjonalnie `warnings`. Żądania z toolingiem pomijają cache i fallback YAML.

F-3. Gateway musi zwrócić odpowiedź w spójnym formacie niezależnym od providera.

F-4. Gateway musi dołączyć `provider` (identyfikator **`providerInstance`** z YAML) i `model` (żądany `modelAlias`) do odpowiedzi.

F-5. Gateway powinien dołączyć `usage`, jeśli provider/SDK udostępnia te dane.

F-6. Nieznany `modelAlias` → `400` z `code=MODEL_ALIAS_NOT_FOUND` (`ProviderRegistryService.resolveModelAlias`).

F-7. Limity DTO: `messages` — **1..150** elementów; `content` — max **3000** znaków dla ról `user` i `assistant`, max **32000** dla roli `tool` (`chat-message.dto.ts`). Nadwyżkowe pola w body → `400` (`ValidationPipe`: `whitelist` + `forbidNonWhitelisted`).

Zmiana względem: wcześniejsze F-7 („max 3000 znaków na wiadomość” bez rozróżnienia roli). Powód: treść `tool` ma wyższy limit w DTO.

F-8. *(Opcjonalnie — cache exact-match)* Gateway może zwracać zapisaną odpowiedź dla `POST /api/v1/chat` z polami `cached: true`, `cachedAt` oraz `cacheSource: "exact"`, gdy włączony jest dostępny backend cache i istnieje pasujący wpis (`ResponseCacheService`). Odczyt walidowany `CachedChatResponseSchema` — uszkodzony wpis usuwany. Pole `cacheSource` należy do **tej** odpowiedzi lookupu i **nie** jest zapisywane w Redis (`CachedChatResponse` / Zod bez tego pola). Przy missie (odpowiedź z providera) pola `cached`, `cachedAt` i `cacheSource` są nieobecne. Ten sam magazyn i guard służą streamingowi — lookup/zapis/replay: `SPEC-CHAT-STREAMING.md` F-10 (nie jest już „bez cache”).

Zmiana względem: F-8 w wersji 15 („Streaming v1 nie podlega temu cache”). Powód: wspólny `CachedChatResponse` + `resolveStreamCache` / `executeStreamMiss`.

Hit native ma ten sam kształt co live: `finishReason`, opcjonalnie `thinkingContent`, `effectiveModelAlias`, `usageDetails`, `systemFingerprint`. `toolCalls` nie są zapisywane. `id` zostaje z pierwszego zapisu (tożsamość odpowiedzi w Redis). `requestId` **nie** jest w payloadzie Redis — hit stempluje bieżący `requestId` żądania (`ChatService.executeChat`, `toChatResponseDtoFromCache`). `conversationId` nie jest w magazynie — echo lub `conv_*` z bieżącego żądania (F-9).

Zmiana względem: F-8 w wersji 13 („`id` i `requestId` zostają z pierwszego zapisu”). Powód: `requestId` z pierwszego zapisu psuł korelację z `x-request-id`; `id` zostaje tożsamością odpowiedzi.

Klucz cache obejmuje m.in. `modelAlias`, `clientId`, `messages`, sygnaturę promptów systemowych oraz zserializowane parametry wywołania. Pole **`metadata`** z body **nie** wchodzi do klucza exact ani partycji semantic — świadoma decyzja: metadata służy propagacji do adaptera (tracking/analityka) i **nie** wpływa na tożsamość odpowiedzi w gateway (`docs/pl/konfiguracja.md`). Cache **pomija** żądania z toolingiem (F-2b) oraz alias, którego `providerInstance` ma `enabled !== true` (`isCachedChatAllowedForModelAlias`). Brak flagi `cache` per alias w YAML — włączenie globalne (`CACHE_ENABLED`, `SEMANTIC_CACHE_ENABLED`) plus `providers[].enabled`; per-model toggle nie jest planowany (F-8c). Backendy i env — `SPEC-KONFIGURACJA.md` F-1b.

Zmiana względem: F-8 w wersji 14 (klucz bez jawnego wyłączenia `metadata`; brak normy o braku per-model toggle). Powód: świadome rozstrzygnięcia projektowe — metadata to tracking, nie output; cache sterowany globalnie i przez `enabled` providera.

Exact i semantic dzielą tożsamość **konfiguracji** żądania (`systemSignature`, efektywne params). Semantyka podobieństwa dotyczy wyłącznie tekstu last-user przy żądaniu jednoturowym — F-8b.

Zmiana względem: wcześniejsze F-8 (wersja 5), które głosiło known limitation v1: „sygnatura promptu i params są w kluczu **tylko exact-match**; cache semantyczny partycjonuje wyłącznie `modelAlias` + `clientId`; zmiana promptu / `responseFormat` nie unieważnia KNN (granicą jest TTL)”. Powód: fałszywe trafienia przy zmianie promptu/params; kontrakt v1.1 = ta sama partycja konfiguracji co exact + skip wielotury.

F-8b. *(Opcjonalnie — cache semantyczny)* Po missie exact, gdy `SEMANTIC_CACHE_ENABLED=true`, gateway może zwrócić hit HASH albo KNN z `cached: true`, `cachedAt` i `cacheSource: "semantic"`. Kolejność (kod): cooldown → polityka cache aliasu → exact KV → semantic HASH (trim last-user) → embed+KNN → provider → dual-write sync. Env: `SPEC-KONFIGURACJA.md` F-1d, `docs/pl/konfiguracja.md`. Semantic-only (`CACHE_ENABLED=false` + `SEMANTIC_CACHE_ENABLED=true`) jest wspierany. Brak promocji semantic→exact. Domyślny próg 0.85. TTL wektorów = `CACHE_TTL`.

Lookup semantic: `VectorStore.getByTextIdentity` (HASH last-user + partycja, bez embed) → przy missie embed + KNN. Trafienie HASH: `cacheSource: "semantic"`, metryka `hash-hit`.
Zapis (`shouldStoreChatResponse`): wyłącznie `finishReason === 'stop'`, niepusty `output.text`, brak `toolCalls`. Nie zapisujemy `length`, `content_filter`, `tool_calls` ani zwrotki z narzędziami. Odczyt (`isUnservableCachedReply`): `finishReason !== 'stop'` albo pusty tekst → DEL.

Zmiana względem: F-8b w wersji 13 (bramka zapisu/odczytu tylko `length` + pusty tekst + `toolCalls`). Powód: cache ma trzymać wyłącznie dokończoną odpowiedź tekstową, bez safety/refusal i bez wezwań do tool-call.

Singleflight in-process na `buildIdentityKey` (także gdy exact noop) dla równoległych identycznych JSON (v1 — `createInProcessSingleflight`). v2 planowane: distributed lock w Redis na identity key (ograniczenie thundering herd między replikami; F-8c).
Dual-write synchroniczny przed 201 — **wyłącznie** gdy brak fallbacku (`!didFallback`; F-10).
Zmiana względem: F-8b tylko KNN po exact miss; subset payloadu. Powód: koszt embedu przy identycznym tekście; pełny kontrakt native.

Zmiana względem: F-8 / F-8b w wersji 8 (hit exact i semantic miały ten sam kształt JSON bez rozróżnienia warstwy; F-8b: „ten sam kształt odpowiedzi co exact”). Powód: klient nie mógł odróżnić exact od semantic; `cacheSource` jest metadaną lookupu, nie payloadu w Redis.

**Indeks Redis Search:** nazwa = `{PROJECT_ID}:sem:idx:{znormalizowanyModel}-{DIM}-{schemaHash8}`, gdzie `PROJECT_ID` to stała w kodzie `ai-provider-gateway` (plain text, pierwszy segment — widoczny w `FT._LIST`), a `schemaHash8` to pierwsze 8 hex znaków SHA-256 z `{PROJECT_ID}\n{embeddingModel}\n{DIM}\n{canonicalSchema}` (kanoniczna SCHEMA = ta sama lista pól/typów co `FT.CREATE`). Przykład: `qwen3-embedding:0.6b` + `1024` → `ai-provider-gateway:sem:idx:qwen3-embedding-0-6b-1024-<8hex>`. Prefiks kluczy HASH = `{index}:` (bez legacy `aigw:sem:`). Warianty tej samej rodziny przy tym samym DIM (np. `:4b`) → **osobny** indeks. Zmiana `EMBEDDING_MODEL`, `EMBEDDING_DIM`, `PROJECT_ID` albo treści SCHEMA → nowy indeks (stary orphan do TTL / ręcznego GC; bez automatycznego `FT.DROPINDEX`).

Zmiana względem: F-8b w wersji 9 (nazwa = tylko znormalizowany model + DIM, np. `qwen3-embedding-0-6b-1024`; prefiks HASH `aigw:sem:{index}:`). Powód: w współdzielonym Redis brak rozpoznawalnego projektu w `FT._LIST` oraz cichy reuse indeksu przy zmianie SCHEMA przy tym samym model+DIM.

**Partycja TAG (filtr KNN):** `modelAlias` + `clientId` + `embeddingModel` + `systemSignature` + `callParams`. TAG-i są **case-sensitive** (`CASESENSITIVE`). Klucze `clients` / `models` w YAML nie mogą zawierać przecinka ani innych separatorów TAG (poza dozwolonym myślnikiem) — `GatewayConfigSchema`. Zmiana promptu systemowego albo efektywnych params → inna partycja → **brak** semantic hit (bez hurtowego dropu indeksu; stare wektory do TTL). TAG `embeddingModel` dodatkowo izoluje przestrzeń wektorów w filtrze (obok nazwy indeksu).

**Jednotura:** lookup i store semantyczny **tylko** gdy `messages[]` zawiera dokładnie jedną wiadomość `role: user` i żadnych ról `assistant` / `tool`. Wielotura / frazy anaforyczne przy historii → skip (jak tooling).

Na jednym żądaniu JSON **co najwyżej jeden** `embed`: lookup przekazuje do zapisu wektor oraz czy `embed` już był wołany. Jest wektor → tylko upsert. `embed` już był i brak wektora → zapis semantyczny **pomijany** (bez retry / bez drugiego timeoutu). `embed` nie był wołany (np. otwarty obwód) → zapis **może** zrobić pierwszy `embed`, jeśli obwód wpuszcza. Skip jak exact (tooling, brak klucza, `clientId === 'unknown'`, alias poza polityką cache, **sukces na fallbacku** — `didFallback`) plus brak ostatniej wiadomości `user` z niepustym `content` **oraz** brak jednotury. Polityka `isCachedChatAllowedForModelAlias` jest sprawdzana **przed** I/O exact i semantic (odczyt i zapis).

Zmiana względem: F-8b w wersji 14 (brak jawnego skipu zapisu przy `didFallback`). Powód: odpowiedź fallbacku nie może być serwowana jako cache primary aliasu — F-10.

Zmiana względem: F-8b w wersji 7 (kolejność exact→semantic bez jawnej polityki przed I/O; milczenie o CASESENSITIVE / zakazie przecinka w ID). Powód: S3/S4/S16/S17 — ta sama polityka przed I/O i na zapisie; izolacja TAG case-sensitive bez wycieku na przecinku.

F-8c. *(Polityka cache — decyzje v1)* Uzupełnienie F-8 / F-8b:

- **`metadata` wyłączone z tożsamości** — exact key i partycja semantic; szczegóły operacyjne: `docs/pl/konfiguracja.md`.
- **Brak flagi `cache` per alias** — cache dozwolony gdy `providers[].enabled === true` dla instancji aliasu + globalne env; per-model toggle **nie** jest planowany.
- **Invalidation odroczone** — `ResponseCacheService.invalidateCache()` istnieje w kodzie, lecz **nie** jest podpięte do ścieżek produkcyjnych (brak API operacyjnego). Wpisy wygasają przez TTL lub stają się niedostępne po zmianie `systemSignature` / params; semantic bez dedykowanego API invalidation.
- **Singleflight v1 in-process** — **tylko** ścieżka JSON (`executeChat`); streaming **bez** soft singleflight (`SPEC-CHAT-STREAMING.md` F-10). **v2 planowane** — distributed lock w Redis na `buildIdentityKey` (między replikami) dla JSON.

F-8d. *(Atomowy zapis Redis — first-writer-wins)* Zapis exact przez backend Redis: `SET … NX` (z `EX` gdy TTL &gt; 0) — `RedisCacheAdapter.set`. Zapis semantic: `HSETNX` pola `reply` jako wartownik tożsamości treści, potem `MULTI` `HSET` pozostałych pól + `EXPIRE` — `RedisVectorStoreAdapter.upsert`. Drugi writer przy **kompletnym** wpisie (jest `vector` i TTL ≥ 0): NX/`HSETNX` noop → log **debug** (nie `warn` / nie „Failed to cache”). Gdy `HSETNX` = 0, ale wpis jest **niekompletny** (brak `vector` albo TTL &lt; 0 — orphan po crashu między claim a `MULTI`): **heal** — `MULTI` `HSET` meta+vector + `EXPIRE` **bez** nadpisywania `reply` → log **warn**. Hash-hit (`getByTextIdentity`) wymaga `reply` **i** `vector`; orphan / in-flight → miss **bez** `DEL` (żeby nie wyścigać `MULTI`). Ścieżka aplikacyjna traktuje NX noop / heal jako sukces. **Bez** nowych metod na portach `CacheBackend` / `VectorStore` i **bez** Lua. Noop backend nadal nadpisuje lokalnie (bez NX). Współdzielony `RedisConnectionService`: po failu connect na starcie kolejne `getClient` / `isReady` mogą odtworzyć klienta (exact + semantic + rate-limit + health) bez restartu procesu; po udanym connect — `retryStrategy` ioredis.

Zmiana względem: F-8d w wersji 16 (sam `HSETNX` + `MULTI`, `claimed === 0` zawsze noop; brak heal / odmowy orphanów na hash-hit; brak recreate klienta po failu startu). Powód: orphan HASH blokował tożsamość na stałe i mógł serwować `reply` bez wektora; fail connect na starcie wyłączał cache do restartu procesu.

F-9. *(Conversation tracking i metryki LLM)* `conversationId` opcjonalne w żądaniu w formacie `conv_<uuid>`. Do Sentry trafia **tylko** ID z body klienta. Gateway **zawsze** zwraca `conversationId` w odpowiedzi (echo lub `conv_<uuid>`). Klient od tury 2+ z ID musi wysyłać pełną historię w `messages[]`.

Adapter metryk LLM (`AiMetricsModule`): `AI_METRICS_BACKEND=noop` | `sentry`; brak override — w **production** Sentry gdy `SENTRY_DSN` ustawiony, w przeciwnym razie noop. `AI_METRICS_BACKEND=sentry` bez DSN → błąd startu. Spany `gen_ai.*`; `gen_ai.conversation.id` tylko przy ID z body. Treści wiadomości na spanie — `SENTRY_INCLUDE_PROMPTS=true`. Inicjalizacja SDK: `src/instrument.ts`. Szczegóły: `docs/pl/conversation_tracking.md` / `docs/conversation-tracking.md`. Error reporting (wyjątki procesu) — `SPEC-PLATFORMA-I-KONTRAKTY.md` F-22; scrape Prometheus — `SPEC-METRYKI.md`.

F-10. *(Odporność)* Gateway stosuje `policy.retry` i `policy.timeoutMs` z YAML przez `ResilientExecutor`. Po wyczerpaniu prób na aliasie żądanym, gdy skonfigurowano `models[].fallback`, próbuje alias zapasowy. Przy sukcesie na fallbacku odpowiedź zawiera opcjonalne `effectiveModelAlias`; pole `model` = żądany `modelAlias`. Odpowiedź z sukcesu na fallbacku (`didFallback: true`) **nie** jest zapisywana do exact ani semantic cache — kolejne identyczne żądanie ponownie próbuje aliasu żądanego (`ChatService.completeChatAndStore` / analogicznie `executeStreamMiss`). Ten sam kontrakt obowiązuje na streamingu (`SPEC-CHAT-STREAMING.md` F-10).

Zmiana względem: F-10 w wersji 15 („przy przyszłym cache streamingu”). Powód: zapis po stream miss jest wdrożony; nadal bez cache przy `didFallback`.

F-11. *(Cooldown po 429 upstream)* Po błędzie providera 429 gateway może ustawić cooldown per klucz klienta + provider (`ChatErrorHandlerService` → `setCooldown`). Kolejne żądania — **JSON i streaming** — są odrzucane z `RATE_LIMITED` przez `ChatProviderCooldownService.assertNotInCooldown` (`checkCooldown`) w wspólnym `prepareRequestForExecution` **po** `registry.resolve` (potrzebny `providerName`) i **przed** lookupiem cache. Szczegóły env: `docs/pl/konfiguracja.md` (`RATE_LIMIT_COOLDOWN_AFTER_429`). Gdy Redis nie jest `ready` — fail-open (jak RPS — `SPEC-PLATFORMA-I-KONTRAKTY.md` F-17). Limit RPS/burst na brzegu (przed `ChatService`) — tamże F-16.

## Wymagania niefunkcjonalne

NFR-1. Timeout wywołania providera jest kontrolowany polityką per alias.

NFR-2. Retry jest ograniczony do błędów 429/5xx i do maxAttempts z konfiguracji.

NFR-3. Odpowiedź nie może zawierać surowych sekretów ani surowych stack trace.

## Kryteria akceptacji

- [x] Dla poprawnego requestu gateway zwraca **201** i spójny JSON (`ChatController`, domyślne zachowanie NestJS dla `POST`).
- [x] *(Cache exact)* Przy włączonym i dostępnym backendzie cache powtórzone identyczne żądanie `POST /api/v1/chat` może zwrócić odpowiedź z `cached: true` i `cacheSource: "exact"`.
- [x] *(Cache source)* Trafienie semantic → `cacheSource: "semantic"`; miss providera → brak pól `cached`, `cachedAt`, `cacheSource`.
- [x] Dla nieznanego `modelAlias` gateway zwraca `400` z `code: MODEL_ALIAS_NOT_FOUND` (bez wywołania providera).
- [x] Parametry są walidowane (DTO, `allowOverrides`, clamp `bounds`; `THINKING_NOT_SUPPORTED` przy braku capability).
- [x] `requestId` jest obecny w odpowiedzi sukcesu; nagłówek odpowiedzi **`x-request-id`**.
- [x] Opcjonalne `conversationId` jest walidowane (`conv_<uuid>`); w odpowiedzi echo lub `conv_*`.
- [x] Retry/timeout/fallback z YAML (`effectiveModelAlias` przy fallbacku).
- [x] Cooldown po 429 dotyczy ścieżki `executeChat` (wspólne `prepareRequestForExecution` ze streamem — `SPEC-CHAT-STREAMING.md`).
- [x] Exact-match nie serwuje wpisu, gdy instancja aliasu jest wyłączona; klucz cache różni klientów.
- [x] Cache semantyczny: co najwyżej jeden `embed` na żądanie JSON; brak retry `embed` przy zapisie, gdy lookup już go wołał; stream używa tego samego guarda / magazynu (`SPEC-CHAT-STREAMING.md` F-10).
- [x] *(First-writer-wins)* Exact Redis `SET NX` i semantic `HSETNX` nie nadpisują kompletnego wpisu; NX noop → debug; orphan semantic → heal; hash-hit bez vector → miss bez DEL (F-8d).
- [x] Cache semantyczny: inne efektywne params albo inna `systemSignature` → brak semantic hit (ta sama ostatnia fraza user nie wystarcza).
- [x] Cache semantyczny: wieloturowa `messages[]` (lub więcej niż jeden `user`) → brak lookupu/store semantic (brak wywołania `embed`).
- [x] Cache semantyczny: identyczny przycięty last-user w tej samej partycji → HASH hit bez `embed` (`getByTextIdentity`, metryka `hash-hit`).
- [x] Cache: zapis tylko `finishReason=stop` + niepusty tekst bez `toolCalls`; odczyt innego `finishReason` lub pustego tekstu → DEL. `requestId` nie w Redis; hit stempluje bieżący `requestId`; `id` z payloadu.
- [x] Singleflight in-process na `buildIdentityKey` dla równoległych identycznych JSON (także gdy exact noop).
- [x] Dual-write synchroniczny (`await` exact SET i semantic upsert) przed HTTP 201; brak promocji semantic→exact; **brak zapisu przy `didFallback`**.
- [x] `metadata` nie wchodzi do klucza exact ani partycji semantic (F-8, F-8c).
- [x] Cache semantyczny: indeks zaczyna się od `ai-provider-gateway:sem:idx:` i zawiera pełny `embeddingModel` + DIM + hash SCHEMA — zmiana `EMBEDDING_MODEL` / DIM / SCHEMA izoluje przestrzeń KNN (brak cross-hit między wariantami; brak cichego reuse przy zmianie pól indeksu).

## Poza zakresem (względem rdzenia MVP)

- Pamięć rozmowy i persistence po stronie gateway (klient nadal dostarcza `messages[]`).
- Narzędzia wykonywane po stronie gateway (tool runner) — function calling przez adaptery jest wdrożony.
- Fasady HTTP vendora (`/openai`, `/anthropic`) — `SPEC-FASADY.md`.
- Natywny katalog modeli — `SPEC-MODELS.md`.
- Soft singleflight / live tee na streamie oraz distributed lock singleflight (v2) — `SPEC-CHAT-STREAMING.md` / F-8c.
