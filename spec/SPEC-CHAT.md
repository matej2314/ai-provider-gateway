---
wersja: 10
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-27
---

# SPEC — Chat (standard) — `POST /chat`

## Cel / problem

Udostępnić jeden endpoint, który zwraca pełną odpowiedź LLM w spójnym formacie niezależnie od providera.

## Warunki wstępne (env)

Gateway musi działać na poprawnie zwalidowanym środowisku: sekrety włączonych instancji wg `SPEC-KONFIGURACJA.md` (F-1a — w tym wyjątek OpenAI: pusty `apiKeyRef`, wymagany `baseUrlRef`) oraz poprawny `gateway.config.yaml` (fail‑fast przy starcie).

**Stan implementacji:** nagłówek **`X-Gateway-Key`** — wymagany (`@GatewayKeyAndSmartRateLimit()`, `openapi.json`). Allowlista i RPS: `SPEC-PLATFORMA-I-KONTRAKTY.md`, `SPEC-KONFIGURACJA.md`. Body: `modelAlias`, `messages`, opcjonalne `conversationId` (`docs/pl/conversation_tracking.md`), opcjonalne `metadata`, opcjonalne `params` i `tooling`. Cache **exact-match** i opcjonalny **semantyczny** dla czatu JSON — `executeChat` (`src/cache/`, `ChatCacheGuardService`). Streaming v1 bez cache — `SPEC-CHAT-STREAMING.md`.

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

F-8. *(Opcjonalnie — cache exact-match)* Gateway może zwracać zapisaną odpowiedź dla `POST /api/v1/chat` z polami `cached: true`, `cachedAt` oraz `cacheSource: "exact"`, gdy włączony jest dostępny backend cache i istnieje pasujący wpis (`ResponseCacheService`). Odczyt walidowany `CachedChatResponseSchema` — uszkodzony wpis usuwany. Pole `cacheSource` należy do **tej** odpowiedzi lookupu i **nie** jest zapisywane w Redis (`CachedChatResponse` / Zod bez tego pola). Przy missie (odpowiedź z providera) pola `cached`, `cachedAt` i `cacheSource` są nieobecne. Streaming v1 nie podlega temu cache (`SPEC-CHAT-STREAMING.md`).

Klucz cache obejmuje m.in. `modelAlias`, `clientId`, `messages`, sygnaturę promptów systemowych oraz zserializowane parametry wywołania. Cache **pomija** żądania z toolingiem (F-2b) oraz alias, którego `providerInstance` ma `enabled !== true` (`isCachedChatAllowedForModelAlias`). Backendy i env — `SPEC-KONFIGURACJA.md` F-1b.

Exact i semantic dzielą tożsamość **konfiguracji** żądania (`systemSignature`, efektywne params). Semantyka podobieństwa dotyczy wyłącznie tekstu last-user przy żądaniu jednoturowym — F-8b.

Zmiana względem: wcześniejsze F-8 (wersja 5), które głosiło known limitation v1: „sygnatura promptu i params są w kluczu **tylko exact-match**; cache semantyczny partycjonuje wyłącznie `modelAlias` + `clientId`; zmiana promptu / `responseFormat` nie unieważnia KNN (granicą jest TTL)”. Powód: fałszywe trafienia przy zmianie promptu/params; kontrakt v1.1 = ta sama partycja konfiguracji co exact + skip wielotury.

F-8b. *(Opcjonalnie — cache semantyczny)* Po missie exact, gdy `SEMANTIC_CACHE_ENABLED=true`, gateway może zwrócić hit KNN z `cached: true`, `cachedAt` i `cacheSource: "semantic"`. Kolejność: polityka cache aliasu → exact → semantic → provider. Env: `SPEC-KONFIGURACJA.md` F-1d, `docs/pl/konfiguracja.md`.

Zmiana względem: F-8 / F-8b w wersji 8 (hit exact i semantic miały ten sam kształt JSON bez rozróżnienia warstwy; F-8b: „ten sam kształt odpowiedzi co exact”). Powód: klient nie mógł odróżnić exact od semantic; `cacheSource` jest metadaną lookupu, nie payloadu w Redis.

**Indeks Redis Search:** nazwa = `{PROJECT_ID}:sem:idx:{znormalizowanyModel}-{DIM}-{schemaHash8}`, gdzie `PROJECT_ID` to stała w kodzie `ai-provider-gateway` (plain text, pierwszy segment — widoczny w `FT._LIST`), a `schemaHash8` to pierwsze 8 hex znaków SHA-256 z `{PROJECT_ID}\n{embeddingModel}\n{DIM}\n{canonicalSchema}` (kanoniczna SCHEMA = ta sama lista pól/typów co `FT.CREATE`). Przykład: `qwen3-embedding:0.6b` + `1024` → `ai-provider-gateway:sem:idx:qwen3-embedding-0-6b-1024-<8hex>`. Prefiks kluczy HASH = `{index}:` (bez legacy `aigw:sem:`). Warianty tej samej rodziny przy tym samym DIM (np. `:4b`) → **osobny** indeks. Zmiana `EMBEDDING_MODEL`, `EMBEDDING_DIM`, `PROJECT_ID` albo treści SCHEMA → nowy indeks (stary orphan do TTL / ręcznego GC; bez automatycznego `FT.DROPINDEX`).

Zmiana względem: F-8b w wersji 9 (nazwa = tylko znormalizowany model + DIM, np. `qwen3-embedding-0-6b-1024`; prefiks HASH `aigw:sem:{index}:`). Powód: w współdzielonym Redis brak rozpoznawalnego projektu w `FT._LIST` oraz cichy reuse indeksu przy zmianie SCHEMA przy tym samym model+DIM.

**Partycja TAG (filtr KNN):** `modelAlias` + `clientId` + `embeddingModel` + `systemSignature` + `callParams`. TAG-i są **case-sensitive** (`CASESENSITIVE`). Klucze `clients` / `models` w YAML nie mogą zawierać przecinka ani innych separatorów TAG (poza dozwolonym myślnikiem) — `GatewayConfigSchema`. Zmiana promptu systemowego albo efektywnych params → inna partycja → **brak** semantic hit (bez hurtowego dropu indeksu; stare wektory do TTL). TAG `embeddingModel` dodatkowo izoluje przestrzeń wektorów w filtrze (obok nazwy indeksu).

**Jednotura:** lookup i store semantyczny **tylko** gdy `messages[]` zawiera dokładnie jedną wiadomość `role: user` i żadnych ról `assistant` / `tool`. Wielotura / frazy anaforyczne przy historii → skip (jak tooling).

Na jednym żądaniu JSON **co najwyżej jeden** `embed`: lookup przekazuje do zapisu wektor oraz czy `embed` już był wołany. Jest wektor → tylko upsert. `embed` już był i brak wektora → zapis semantyczny **pomijany** (bez retry / bez drugiego timeoutu). `embed` nie był wołany (np. otwarty obwód) → zapis **może** zrobić pierwszy `embed`, jeśli obwód wpuszcza. Skip jak exact (tooling, brak klucza, `clientId === 'unknown'`, alias poza polityką cache) plus brak ostatniej wiadomości `user` z niepustym `content` **oraz** brak jednotury. Polityka `isCachedChatAllowedForModelAlias` jest sprawdzana **przed** I/O exact i semantic (odczyt i zapis).

Zmiana względem: F-8b w wersji 7 (kolejność exact→semantic bez jawnej polityki przed I/O; milczenie o CASESENSITIVE / zakazie przecinka w ID). Powód: S3/S4/S16/S17 — ta sama polityka przed I/O i na zapisie; izolacja TAG case-sensitive bez wycieku na przecinku.

F-9. *(Conversation tracking i metryki LLM)* `conversationId` opcjonalne w żądaniu w formacie `conv_<uuid>`. Do Sentry trafia **tylko** ID z body klienta. Gateway **zawsze** zwraca `conversationId` w odpowiedzi (echo lub `conv_<uuid>`). Klient od tury 2+ z ID musi wysyłać pełną historię w `messages[]`.

Adapter metryk LLM (`AiMetricsModule`): `AI_METRICS_BACKEND=noop` | `sentry`; brak override — w **production** Sentry gdy `SENTRY_DSN` ustawiony, w przeciwnym razie noop. `AI_METRICS_BACKEND=sentry` bez DSN → błąd startu. Spany `gen_ai.*`; `gen_ai.conversation.id` tylko przy ID z body. Treści wiadomości na spanie — `SENTRY_INCLUDE_PROMPTS=true`. Inicjalizacja SDK: `src/instrument.ts`. Szczegóły: `docs/pl/conversation_tracking.md` / `docs/conversation-tracking.md`. Error reporting (wyjątki procesu) — `SPEC-PLATFORMA-I-KONTRAKTY.md` F-22; scrape Prometheus — `SPEC-METRYKI.md`.

F-10. *(Odporność)* Gateway stosuje `policy.retry` i `policy.timeoutMs` z YAML przez `ResilientExecutor`. Po wyczerpaniu prób na aliasie żądanym, gdy skonfigurowano `models[].fallback`, próbuje alias zapasowy. Przy sukcesie na fallbacku odpowiedź zawiera opcjonalne `effectiveModelAlias`; pole `model` = żądany `modelAlias`.

F-11. *(Cooldown po 429 upstream)* Po błędzie providera 429 gateway może ustawić cooldown per klucz klienta + provider (`ChatErrorHandlerService` → `setCooldown`). Kolejne żądania — **JSON i streaming** — są odrzucane z `RATE_LIMITED` przez `checkCooldown` w wspólnym `prepareRequestForExecution`. Szczegóły env: `docs/pl/konfiguracja.md` (`RATE_LIMIT_COOLDOWN_AFTER_429`). Gdy Redis nie jest `ready` — fail-open (jak RPS — `SPEC-PLATFORMA-I-KONTRAKTY.md` F-17). Limit RPS/burst na brzegu (przed `ChatService`) — tamże F-16.

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
- [x] Cache semantyczny: co najwyżej jeden `embed` na żądanie JSON; brak retry `embed` przy zapisie, gdy lookup już go wołał; stream v1 bez tej warstwy.
- [x] Cache semantyczny: inne efektywne params albo inna `systemSignature` → brak semantic hit (ta sama ostatnia fraza user nie wystarcza).
- [x] Cache semantyczny: wieloturowa `messages[]` (lub więcej niż jeden `user`) → brak lookupu/store semantic (brak wywołania `embed`).
- [x] Cache semantyczny: indeks zaczyna się od `ai-provider-gateway:sem:idx:` i zawiera pełny `embeddingModel` + DIM + hash SCHEMA — zmiana `EMBEDDING_MODEL` / DIM / SCHEMA izoluje przestrzeń KNN (brak cross-hit między wariantami; brak cichego reuse przy zmianie pól indeksu).

## Poza zakresem (względem rdzenia MVP)

- Pamięć rozmowy i persistence po stronie gateway (klient nadal dostarcza `messages[]`).
- Narzędzia wykonywane po stronie gateway (tool runner) — function calling przez adaptery jest wdrożony.
- Fasady HTTP vendora (`/openai`, `/anthropic`) — `SPEC-FASADY.md`.
- Natywny katalog modeli — `SPEC-MODELS.md`.
- Zapis i odczyt cache na `POST /chat/stream` — `SPEC-CHAT-STREAMING.md` (v1 bez cache; plan Faza 5).
