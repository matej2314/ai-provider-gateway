# Anty‑patterny / na co uważać — AI Provider Gateway

Ten plik zbiera typowe pułapki w projektach “LLM gateway”.

## 1) “Open proxy” przez nadmierną konfigurowalność

**Nie rób**:

- konfigurowalnych URL-i endpointów providerów,
- arbitralnych nagłówków i body z configu,
- “dowolnego HTTP request buildera” pod płaszczykiem integracji LLM.

**Dlaczego**: SSRF, exfiltracja, brak kontroli kosztów i bezpieczeństwa.

## 2) Sekrety w logach

**Nie rób**:

- logowania pełnych requestów do providerów (nagłówki, bearer tokeny),
- dumpowania configu/env w exception handlerach,
- zwracania surowych wyjątków SDK klientowi.

**Rób**:

- redakcję wrażliwych pól,
- requestId + logi strukturalne,
- minimalne komunikaty na zewnątrz, szczegóły tylko w logach.

## 3) Pozorna walidacja `modelId`

**Nie rób**: przyjmowania vendorowego `modelId` z request i “walidowania” go regexem.

**Rób**: allowlista przez konfigurację i/lub aliasy (`modelAlias`), walidacja fail‑fast na starcie.

## 4) Brak granic dla parametrów (`temperature`, `max_tokens`, …)

**Nie rób**: “przepuść wszystko, provider odrzuci”.

**Rób**:

- allowlista pól,
- bounds (min/max),
- domyślne wartości per alias,
- mapowanie parametrów per provider (różne nazwy i semantyka).

## 5) Mieszanie kontraktów providerów w API gateway

**Nie rób**:

- wystawiania 1:1 obiektów z SDK OpenAI/Anthropic w odpowiedzi gateway,
- wycieku “stop reasons” czy struktur, których nie da się ujednolicić.

**Rób**:

- własny kontrakt gateway (stabilny),
- opcjonalne pole debug `raw` tylko w trybie dev (i bez sekretów).

**Wyjątek (zamierzony):** osobne prefiksy `/api/v1/openai` i `/api/v1/anthropic` z formatem vendora — patrz §13 (Fasady integracji). Nie dotyczy natywnego `/api/v1/chat`.

Uzasadnienie: Fasady oficjalnych kontraktów wymagają zgodności z OpenAI API i Anthropic Messages API; osobne ścieżki są **zamierzone** i nie naruszają zasad tego anty-wzorca (dotyczy wyłącznie natywnego kontraktu gateway).

## 6) Streaming “jak leci”

**Nie rób**:

- założenia, że każdy provider streamuje identycznie,
- mieszania kilku formatów SSE w zależności od providera.

**Rób**:

- jeden format zdarzeń gateway (`meta`, `delta`, `done`),
- testy kontraktu streamingu,
- jasne zachowanie na błąd w trakcie strumienia.

## 7) Retry bez polityki i bez limitów

**Nie rób**: nieskończonych retry lub retry na błędy logiczne (400/401).

**Rób**:

- retry tylko na 429/5xx (`onStatus` / `RETRY_POLICY_DEFAULTS`),
- maksymalna liczba prób (`maxAttempts`, cap Zod = 5),
- backoff (`initialDelayMs` / `maxDelayMs`) i time budget (`timeoutMs`) w `ResilientExecutor` (`src/chat/resilience/`),
- anulowanie in-flight przez `AbortSignal` przy `timeoutMs` (SDK: Anthropic/OpenAI `signal`, Google `abortSignal`) — nie sam `Promise.race` bez abortu,
- trzymanie logiki odporności w module czatu (nie w kontrolerach ani fasadach).

## 8) “Framework first” w logice domenowej

**Nie rób**: logiki doboru modelu/parametrów w kontrolerach.

**Rób**:

- cienkie kontrolery,
- use-case w serwisach,
- fabryki providerów (`src/providers/factories/`) jako jedyne miejsce kontaktu z SDK LLM.

## 9) Brak testów kontraktu

**Nie rób**: testów tylko “czy serwis się odpala”.

**Rób**:

- testy mapowania parametrów,
- testy wyboru `modelAlias`,
- testy normalizacji błędów,
- testy formatu SSE (co najmniej jednostkowe na eventy).

## 10) Uruchomienie bez wymaganego klucza API

**Nie rób**: uruchamiania gatewaya, gdy w env brakuje sekretów dla którejkolwiek **włączonej** instancji providera w YAML (`assertEnabledProviderSecretsPresent` w `configuration-validation.service.ts` — API key / base URL).

**Rób**: fail-fast przy starcie; lokalnie upewnij się, że `.env` zawiera wartości dla wszystkich `apiKeyRef` włączonych providerów (szczegóły: `konfiguracja.md`).

## 11) Mylenie kodów limitów (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`)

**Nie rób**: traktowania każdego HTTP **429** jako limitu providera.

**Rób**:

- **`RATE_LIMITED`** — smart rate limit gateway (`SmartRateLimitGuard`: RPS/burst/streamy) oraz cooldown po 429 upstream (`prepareRequestForExecution` → `checkCooldown`; `ChatErrorHandlerService` → `setCooldown` — czat JSON i stream).
- **`PROVIDER_RATE_LIMITED`** — wyłącznie mapowanie błędu z SDK (`provider-error.mapper.ts`).

Szczegóły: `dictionary.md`, `dokumentacja_api.md`.

## 12) Cache odpowiedzi bez świadomości “świeżości”

**Nie rób**: zakładania, że każda odpowiedź z **`POST /api/v1/chat`** jest “na żywo” z providera — przy włączonym cache możliwy jest zwrot z **`cached: true`**.

**Nie rób**: oczekiwania, że **`id`** (`gw_*`) na hicie będzie nowy — to tożsamość zapisanej odpowiedzi. **`requestId`** na hicie **musi** zgadzać się z bieżącym żądaniem (`x-request-id`); nie jest trzymany w Redis.

**Rób**: świadomie włączać cache tylko tam, gdzie powtarzalność odpowiedzi jest akceptowalna; monitorować TTL i invalidację (zmiana system promptu lub params zmienia klucz exact **oraz** partycję KNN semantic — pkt 20). Zapis wyłącznie dokończonej odpowiedzi tekstowej (`finishReason=stop`, niepusty tekst, bez `toolCalls` / `content_filter` / `length`) — `shouldStoreChatResponse` / `isUnservableCachedReply`. Czytaj `konfiguracja.md` (env `CACHE_*`, `REDIS_*`); odczyt z Redis walidowany schematem Zod (`CachedChatResponseSchema` — uszkodzony lub nieserwowalny wpis usuwany); streaming używa tego samego magazynu co JSON z replay SSE (`spec/SPEC-CHAT-STREAMING.md` F-10); zapis Redis first-writer-wins (`SET NX` / `HSETNX`).

## 13) Mylenie trzech kontraktów API (natywny vs fasady oficjalnych kontraktów)

**Nie rób**:

- wystawiania **jednej** trasy `GET /api/v1/models` w **formacie vendora** dla wszystkich klientów (OpenAI i Anthropic mają różny kształt listy) — natywny `/models` ma **własny** kontrakt gateway; fasady mają osobne prefiksy,
- przekazywania klucza klienta (Bearer / `x-api-key`) do warstwy providerów zamiast kluczy z `.env` (per `apiKeyRef`),
- **zakładania, że fasada `/openai` lub `/anthropic` oznacza backend tego samego vendora** — to tylko kształt HTTP; LLM wybiera `modelAlias` → `providerInstance` w YAML,
- **traktowania Bearer na `/openai` jako klucza OpenAI.com** lub `x-api-key` na `/anthropic` jako klucza z konsole Anthropic — to klucze klienta gateway,
- duplikowania logiki cache/retry/fallback w kontrolerach fasad zamiast delegacji do `ChatService`,
- oczekiwania `ErrorEnvelope` z fasad OpenAI/Anthropic — mają własne filtry błędów.

**Rób**:

- osobne prefiksy `/api/v1/openai` i `/api/v1/anthropic` + natywny `/api/v1/chat` i **`GET /api/v1/models`** (kontrakt gateway),
- wspólny katalog `GatewayModelsCatalogService` + mappery outbound per fasada (nie duplikować logiki odczytu YAML),
- `readClientGatewayKey` + ta sama allowlista dla wszystkich powierzchni,
- mapowanie `model` (vendor) → `modelAlias` (YAML) w warstwie mapperów,
- rozróżnienie **fasady integracji** (`src/integrations/`) vs **providera runtime** (`src/providers/`) — patrz `dictionary.md` (sekcja „Fasada vs provider runtime”).

Szczegóły: `integracje.md`, `integracja_openai_kontrakt.md`, `integracja_anthropic_messages.md`.

## 14) CLI zależne od `ConfigModule` (deadlock konfiguracji)

**Nie rób**:

- importowania `ConfigModule.forRoot()` w `CliModule` — runtime wymaga już istniejącego, poprawnego `gateway.config.yaml` i `.env`, które CLI ma **utworzyć**,
- wymuszania `npm run build` przed pierwszym użyciem CLI,
- importowania `buildEffectiveGatewayConfig()` / `configuration.ts` w warstwie CLI na starcie (wymaga env).

**Rób**:

- osobny entry point (`bin/gateway-cli-wrapper.js` → `CliModule`),
- `CliConfigLoaderService` z parsowaniem YAML + `GatewayConfigSchema` bez rozwiązywania env,
- reużycie **tylko** typów/schematów/walidatorów z `src/config/` (kierunek: config → cli, nie odwrotnie),
- wrapper z fallbackiem `ts-node`, gdy brak `dist/`.

Szczegóły: `CLI.md`, `architektura.md`, `architektura_katalogi_pliki.md` (sekcja 2a).

## 15) Start serwera bez właściwego pliku konfiguracyjnego

**Nie rób**: oczekiwania, że `npm run start:dev` zadziała od razu po sklonowaniu bez uzupełnionego `.env` (klucze providerów + `MASTER_KEY`) i poprawnego `gateway.config.yaml`.

**Rób**: uruchom `gateway config:init` albo ręcznie uzupełnij YAML + `.env` (`konfiguracja.md`); zweryfikuj przez `gateway config:validate` (pełna) lub `npm run config:validate` (YAML + reguły runtime).
## 16) Rozszerzanie CacheBackend o vector search

**Nie rób:** dodawaj zapytan Redis Search / KNN do istniejacych adapterow `CacheBackend` / `noop` / `redis` w `src/cache/adapters/`. Interfejs KV `CacheBackend` jest zaprojektowany dla dokladnych lookupu klucz-wartosc i nie ma koncepcji wyszukiwania podobienstwa.

**Rób:** implementuj lookup semantyczny jako **osobny port** (`EmbeddingBackend`, `VectorStore`) w `src/cache/semantic/` — niezalezne adaptery powiazane przez `SemanticCacheService`. Kolejnosc lookup (cooldown → polityka aliasu → exact KV → semantic HASH przyciętego last-user → embed + KNN → provider → dual-write sync) jest orkiestrowana w `ChatCachePipelineService` / `SemanticCacheService`, nie wewnatrz istniejacych adapterow. Tani `VectorStore.getByTextIdentity` działa **przed** embed. **Nie** promuj trafienia HASH/KNN do exact KV — magazyny zostają równoległe. Przy zapisie reuse wektora z lookupu; **nie** wołaj ponownie `embed`, gdy lookup już go próbował (sukces bez wektora albo błąd).

## 17) Nadpisywanie command: w Redis Stack Compose

**Nie rób:** nadpisuj `command:` w `docker-compose.redis.yml` aby konfigurowac polityke pamieci Redis lub inne opcje. Nadpisanie `command:` na obrazie `redis/redis-stack-server` usuwa domyslne argumenty entry point ktore laduja moduly Redis Search i JSON — modul `search` zniknie cicho.

**Rób:** przekazuj parametry Redis przez zmienna srodowiskowa **`REDIS_ARGS`** w serwisie Compose. Przyklad: `REDIS_ARGS: '--port 6380 --maxmemory 2gb --maxmemory-policy noeviction'`.

## 18) Złe trafienie semantyczne — niski próg lub oczekiwanie na wieloturze

**Nie rób:** ustaw `SEMANTIC_CACHE_MIN_SIMILARITY` poniżej 0.85 w produkcji. Niski próg powoduje, że odpowiedzi na semantycznie różne prompty są serwowane z cache — treściowo niepoprawne dla aktualnego zapytania. Start **odrzuca** wartości poza 0–1; `gateway config:validate` **ostrzega** przy wartości &lt; 0.85.

**Nie rób:** wstawiaj przecinka (ani innych znaków specjalnych RediSearch TAG poza myślnikiem) w kluczach `clients.<id>` lub `models.<alias>` — przecinek to domyślny separator TAG i psuje izolację klienta.

**Nie rób:** oczekiwać semantic hit na żądaniach wieloturowych ani traktować anaforycznych fraz last-user (`kontynuuj`, `podsumuj to`, `przetłumacz`) jako bezpiecznego klucza cache przy różnych historiach. Cache semantyczny działa tylko dla body **jednoturowego** (dokładnie jedna `role: user`, bez `assistant` / `tool`).

**Rób:** zachowaj domyślne 0.85 (podobieństwo cosinusowe) lub zwiększ dla domen wymagających wysokiej precyzji. Opieraj się na pełnej **case-sensitive** partycji KNN (`modelAlias` + `clientId` + `embeddingModel` + `systemSignature` + `callParams`) i bramce jednoturowej. Monitoruj `hit` / `hash-hit` / `below-threshold` / `error` / `skip` na `gateway_semantic_cache_lookup_total` (`hash-hit` = trafienie HASH bez embed; `skip` = early-return bez embed/KNN, w tym otwarty circuit po missie HASH lub wyłączony/multi-turn; `error` = wyłącznie nieudany I/O embed/KNN). Uszkodzony `reply` w HASH semantycznym jest kasowany przy odczycie HASH i przy KNN (jak exact). Próbkuj trafienia cache podczas strojenia.

## 19) Prefiks nomic / mxbai przy embeddingu Qwen

**Nie rób:** dodawaj prefiksu `search_query:` (ani `search_document:`) do tekstu embeddingu przy `qwen3-embedding:0.6b`. Ta instrukcja należy do `nomic-embed-text` / `mxbai`. Qwen 3 Embedding jej nie rozumie — niespójność store vs lookup wygląda jak fałszywe missy.

**Rób:** embedduj gołą treść last-user żądania **jednoturowego** (albo dedykowaną instrukcję Qwena) po **obu** stronach (zapis i lookup). Format musi być identyczny. Zmiana formatu albo przejście na `nomic-embed-text` (albo inny tag rozmiaru tej samej rodziny, np. `qwen3-embedding:4b`) wymaga nowego indeksu `{PROJECT_ID}:sem:idx:{znormalizowanyModel}-{DIM}-{schemaHash8}` (np. domyślny → `ai-provider-gateway:sem:idx:qwen3-embedding-0-6b-1024-<8hex>`), nie hot-swapu. **Nie** zakładaj, że krótki slug rodziny w stylu `qwen3` izoluje warianty modelu.

## 20) Założenie, że zmiana promptu/params zostawia trafienia semantic w tej samej partycji

**Nie rób:** zakładać, że edycja `MASTER_SYSTEM_PROMPT.md` / promptów per alias albo zmiana parametrów wywołania (`responseFormat`, `temperature`, `seed`, …) nadal serwuje poprzednie trafienia KNN. Exact i semantic dzielą tę samą tożsamość konfiguracji: Redis Search filtruje po `modelAlias` + `clientId` + `embeddingModel` + `systemSignature` + `callParams`. Zmiana promptu lub params → **inna partycja** → miss.

**Nie rób:** oczekiwać hurtowego `FT.DROPINDEX` / masowego czyszczenia przy zmianie promptu lub params. Stare wektory w poprzedniej partycji zostają do TTL (`CACHE_TTL`). `SEMANTIC_CACHE_TTL` jest przestarzałe i ignorowane.

**Nie rób:** traktować udanego `FT.INFO` na legacy nazwie indeksu (np. `qwen3-embedding-0-6b-1024` bez prefiksu `ai-provider-gateway:sem:idx:`, albo HASH-y pod `aigw:sem:…`) jako bieżącego indeksu gatewaya. Po zmianie SCHEMA / prefiksu projektu to **orphany** — zostaw je do TTL albo dropuj tylko indeksy zaczynające się od `ai-provider-gateway:` (nigdy `portfolio:*`).

**Rób:** traktuj rozdział partycji jak rozdział klucza exact. Skróć `CACHE_TTL`, jeśli stare partycje mają znikać szybciej (TTL semantic zawsze = `CACHE_TTL`). Nie obniżaj progu podobieństwa, żeby „nadrobić” missy partycji.