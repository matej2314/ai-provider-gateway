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

- retry tylko na 429/5xx,
- maksymalna liczba prób,
- backoff,
- time budget.

## 8) “Framework first” w logice domenowej

**Nie rób**: logiki doboru modelu/parametrów w kontrolerach.

**Rób**:

- cienkie kontrolery,
- use-case w serwisach,
- adaptery jako jedyne miejsce kontaktu z SDK providerów.

## 9) Brak testów kontraktu

**Nie rób**: testów tylko “czy serwis się odpala”.

**Rób**:

- testy mapowania parametrów,
- testy wyboru `modelAlias`,
- testy normalizacji błędów,
- testy formatu SSE (co najmniej jednostkowe na eventy).

## 10) Uruchomienie bez wymaganego klucza API

**Nie rób**: zwalniania **produkcyjnej** instancji do ruchu, gdy w env nie ma **co najmniej jednego** niepustego klucza spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`NODE_ENV=production`; reguła w `src/config/env.validation.ts`).

**Rób**: fail-fast w production przy starcie; lokalnie pamiętaj, że wywołanie adaptera i tak wymaga realnego klucza dla używanego providera (szczegóły: `docs/konfiguracja.md`).

## 11) Mylenie kodów limitów (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`)

**Nie rób**: traktowania każdego HTTP **429** jako limitu providera.

**Rób**:

- **`RATE_LIMITED`** — smart rate limit gateway, cooldown po 429 upstream, równoległe streamy (`SmartRateLimitGuard`, `ChatService` + `SmartRateLimiterService`).
- **`PROVIDER_RATE_LIMITED`** — wyłącznie mapowanie błędu z SDK (`provider-error.mapper.ts`).

Szczegóły: `dictionary.md`, `dokumentacja_api.md`.

## 12) Cache odpowiedzi bez świadomości “świeżości”

**Nie rób**: zakładania, że każda odpowiedź z **`POST /api/v1/chat`** jest “na żywo” z providera — przy włączonym cache możliwy jest zwrot z **`cached: true`**.

**Nie rób**: oczekiwania, że **`requestId`** w odpowiedzi z cache zawsze odpowiada bieżącemu żądaniu — w implementacji zwracany jest identyfikator zapisany wraz z pierwszą odpowiedzią.

**Rób**: świadomie włączać cache tylko tam, gdzie powtarzalność odpowiedzi jest akceptowalna; monitorować TTL i invalidację (zmiana system promptu zmienia klucz cache w obecnej implementacji). Czytaj `konfiguracja.md` (env `CACHE_*`, `REDIS_*`); streaming jest ścieżką bez cache (`docs/spec/SPEC-CHAT-STREAMING.md`).

## 13) Mylenie trzech kontraktów API (natywny vs fasady IDE)

**Nie rób**:

- wystawiania jednej trasy `GET /api/v1/models` dla wszystkich klientów (OpenAI i Anthropic mają różny kształt listy),
- przekazywania klucza klienta (Bearer / `x-api-key`) do adapterów providerów zamiast kluczy z `.env`,
- duplikowania logiki cache/retry/fallback w kontrolerach fasad zamiast delegacji do `ChatService`,
- oczekiwania `ErrorEnvelope` z fasad OpenAI/Anthropic — mają własne filtry błędów.

**Rób**:

- osobne prefiksy `/api/v1/openai` i `/api/v1/anthropic` + natywny `/api/v1/chat`,
- `readClientGatewayKey` + ta sama allowlista dla wszystkich powierzchni,
- mapowanie `model` (vendor) → `modelAlias` (YAML) w warstwie mapperów.

Szczegóły: `integracje.md`, `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`.

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

Szczegóły: `architektura.md`, `architektura-katalogi-pliki.md` (sekcja 2a).
