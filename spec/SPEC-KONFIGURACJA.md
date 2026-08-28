---
wersja: 10
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-28
---

# SPEC — Konfiguracja (plug&play)

## Cel / problem

Użytkownik ma móc skonfigurować gateway bez zmian w kodzie:

- podać swoje sekrety (env),
- zdefiniować aliasy modeli, polityki, **klientów** (klucze gateway) i opcjonalne limity per klient,
- uruchomić serwis lokalnie lub w swojej infrastrukturze.

## Użytkownicy i scenariusze

### Scenariusz A — minimalna konfiguracja

1. Użytkownik uruchamia **`gateway config:init`** (zalecane po sklonowaniu — zastępuje boilerplate w repo) **lub** ręcznie ustawia env i YAML. Szczegóły CLI: `SPEC-CLI.md`, `docs/pl/CLI.md` / `docs/command_line_interface.md`.
2. Ustawia sekrety w `.env` pod nazwami `apiKeyRef` / `baseUrlRef` z YAML (wizard generuje np. `ANTHROPIC_PRIMARY_API_KEY` dla instancji `anthropic-primary`).
3. W YAML dodaje instancję z `enabled: true`, alias modelu z `providerInstance` oraz wpis w `clients` z `gatewayKeyRef`.
4. Uruchamia serwis i wywołuje `/chat`.

### Scenariusz B — konfiguracja dwóch providerów + streaming

1. Użytkownik ustawia w `.env` sekrety dla **każdej włączonej** instancji (klucz i/lub URL wg typu — F-1a).
2. Tworzy dwa aliasy modeli, jeden z `capabilities.streaming: true`.
3. Wywołuje `POST /api/v1/chat/stream` dla aliasu wspierającego streaming.

## Wymagania funkcjonalne

F-1. Sekrety muszą być pobierane wyłącznie z env (YAML trzyma **nazwy** zmiennych, nie wartości).

F-1a. Przy starcie `buildEffectiveGatewayConfig` woła fasadę **`assertEnabledProviderSecretsPresent`** (`configuration-validation.service.ts`): klucze (`assertEnabledProviderApiKeysPresent`) **oraz** URL-e (`assertEnabledProviderBaseUrlPresent`).

- Dla instancji z `enabled !== false` i typem **innym niż** `openai` / `openai-compatible`: env pod `apiKeyRef` musi być niepusty po `trim()` (`isApiKeyRequiredForProviderType`).
- Dla typów **`openai`** i **`openai-compatible`**: pusty klucz API jest **dozwolony** (np. lokalny endpoint); wymagany jest poprawny URL w env pod **`baseUrlRef`**.

Zmiana względem: wcześniejsze F-1a („niepusty env pod `apiKeyRef` dla każdej włączonej instancji”, wyłącznie `assertEnabledProviderApiKeysPresent`). Powód: OpenAI types nie wymagają klucza; sekrety to też `baseUrlRef`. Źródło: `provider-api-key.validation.ts`, `docs/pl/konfiguracja.md` / `docs/configuration.md`.

Gdy ustawione — opcjonalne legacy `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` mają walidację formatu w `env.validation.ts`.

F-1b. *(Opcjonalnie — cache exact-match)* Zmienne `CACHE_ENABLED`, `CACHE_BACKEND`, `CACHE_TTL` (domyślnie 3600), `CACHE_KEY_PREFIX` (domyślnie `aigw:`) oraz `REDIS_*` włączają zapis/odczyt odpowiedzi czatu JSON (`SPEC-CHAT.md` F-8, `docs/pl/konfiguracja.md`). Tożsamość klucza, polityka włączenia, fallback, singleflight i invalidation — `SPEC-CHAT.md` F-8c.

`CACHE_BACKEND`: wyłącznie `noop` | `redis`. Inna wartość → fail startu (`validate()`). Przy `CACHE_ENABLED=false` backend jest `noop`. **Brak flagi `cache` per alias** w YAML — włączenie przez globalne env oraz `providers[].enabled` powiązanej instancji (`isCachedChatAllowedForModelAlias`).

Zmiana względem: F-1b w wersji 9 (brak odesłania do F-8c i braku normy o braku per-model toggle). Powód: świadome rozstrzygnięcia projektowe cache zsynchronizowane ze `SPEC-CHAT.md`.
Zmiana względem: F-1b dopuszczające `memory` | `other` i cichy fallback rejestru. Powód: martwy kontrakt bez adapterów.

F-1c. *(Opcjonalnie — smart rate limit)* `RATE_LIMIT_SMART_ENABLED` (domyślnie `false`) włącza egzekwowanie RPS/burst/streamów — `SPEC-PLATFORMA-I-KONTRAKTY.md` F-16. Domyślne limity env: `RATE_LIMIT_RPS_PER_KEY=10`, `RATE_LIMIT_BURST_PER_KEY=20`, `RATE_LIMIT_STREAMS_CONCURRENT=3`, `RATE_LIMIT_COOLDOWN_AFTER_429=60`. Redis jest wymagany także wtedy, gdy smart rate limit jest włączony przy wyłączonym cache (`isRedisRequiredFromEnv`).

F-1d. *(Opcjonalnie — cache semantyczny)* `SEMANTIC_CACHE_ENABLED` (domyślnie `false`) oraz `EMBEDDING_*` / `SEMANTIC_CACHE_*` — tabela w `docs/pl/konfiguracja.md`. Zachowanie lookup i zapisu (co najwyżej jeden `embed` na żądanie JSON, `embedAttempted`; brak zapisu przy `didFallback`) — `SPEC-CHAT.md` F-8b, F-8c, F-10. Redis jest wymagany także gdy ta flaga jest `true` (`isRedisRequiredFromEnv` / `isSemanticCacheEnabledFromEnv` — **jedno** źródło prawdy z `CacheModule.register({ semanticEnabled })`).

Nazwa indeksu Redis Search i filtr KNN `@embeddingModel` używają **pełnego** `EMBEDDING_MODEL` (znormalizowany) + `EMBEDDING_DIM` — szczegóły i przykład: `SPEC-CHAT.md` F-8b, `docs/pl/konfiguracja.md`. Zmiana `EMBEDDING_MODEL` przy stałym DIM izoluje przestrzeń KNN (osobny indeks).

`SEMANTIC_CACHE_MIN_SIMILARITY`: domyślnie **0.85**; zakres **0–1** egzekwowany walidatorem env (`@Max(1)`); wartości &gt; 1 **failują start**. `gateway config:validate` ostrzega przy wartości &lt; 0.85 (bez fail). `SEMANTIC_CACHE_K` (≥ 1) = rozmiar KNN + `LIMIT 0 k`; serwis bierze pierwszego kandydata ≥ progu.

`SEMANTIC_CACHE_TTL` jest **przestarzałe i ignorowane** (pole zostaje w env, żeby istniejące `.env` nie psuły startu). TTL wpisów semantycznych **zawsze** = `CACHE_TTL`. `gateway config:validate` ostrzega, gdy zmienna jest ustawiona.

Klucze `clients` / `models` w YAML: bez przecinka i innych separatorów TAG (myślnik dozwolony) — `RedisSearchTagSafeIdSchema`.

Zmiana względem: F-1d w wersji 6 (brak `@Max(1)` / warn &lt; 0.85 / jawnego `LIMIT` dla `k` / jednego predykatu toggle). Powód: S5/S19/S20 — spójny kontrakt `k`, jedno źródło `SEMANTIC_CACHE_ENABLED`, egzekwowany zakres podobieństwa.

Zmiana względem: F-1d, w którym `SEMANTIC_CACHE_TTL` było aktywnym TTL wektorów (osobnym od `CACHE_TTL`). Powód: P6x.C — jeden TTL partycji wektorowej, bez drugiego źródła prawdy.

F-2. Plik konfiguracyjny musi wspierać:

- definicję **klientów** (`clients` — F-6),
- definicję provider instances (`type`, `apiKeyRef`; dla typów OpenAI także `baseUrlRef`, reguły `apiSurface`),
- definicję `modelAlias` → (`providerInstance`, `modelId`),
- polityki (timeout, retry, allowlista parametrów, bounds),
- capabilities (co najmniej `streaming`; opcjonalnie `tools`, `thinking`),
- opcjonalny `fallback` (alias zapasowy — walidacja bez pętli przy starcie).

Zmiana względem: wcześniejsze F-2 nie wymieniało sekcji `clients`. Powód: allowlista `X-Gateway-Key` i limity per klucz pochodzą z YAML `clients` (`gateway-config.schema.ts`).

F-3. Gateway musi walidować konfigurację przy starcie (fail‑fast). Plik `gateway.config.yaml` — Zod `GatewayConfigSchema` (`gateway-config.schema.ts`); składanie — `configuration.ts` → `AppConfiguration`; odczyt — `getAppConfig` / `getAppConfigOrThrow`. Walidacja offline: `validateGatewayConfig()` (`npm run config:validate`, wizard `config:init`).

F-3a. W sekcji `providers` **dozwolone** jest wiele wpisów o tym samym `type`, pod warunkiem **unikalnego** `apiKeyRef` na instancję. Duplikat `apiKeyRef` jest odrzucany (`GatewayConfigSchema.providers.superRefine`). Runtime rozwiązuje wywołania LLM po `model.providerInstance`, nie po `type`.

F-3b. Sekcja `models` **nie może być pusta**. Każdy alias musi wskazywać `providerInstance` istniejący w `providers`.

F-3c. Dla każdej instancji z `enabled !== false` musi istnieć **co najmniej jeden** wpis w `models` z tym samym `providerInstance`. Instancje wyłączone nie podlegają tej regule. Po filtrze `enabled` reguła jest powtórzona w `buildEffectiveGatewayConfig`.

F-4. Brak wymaganej zmiennej env (`apiKeyRef` tam, gdzie klucz jest obowiązkowy, albo `baseUrlRef` dla typów OpenAI) → start odrzucony z czytelnym komunikatem. Brak niepustego klucza master (`masterKeyRef`) → start odrzucony (`assertMasterKeyPresent`).

F-5. W runtime gateway nie przyjmuje modelu spoza allowlisty YAML. W **natywnym** API jedynym polem wyboru jest `modelAlias`. Fasady HTTP (poza tym plikiem) przyjmują pole vendora `model` mapowane **na ten sam alias**, nie na surowe ID vendora.

Zmiana względem: wcześniejsze F-5 / nieodhaczone kryterium „`modelAlias` jest jedyną publiczną metodą wyboru modelu w API”. Powód: fasady wystawiają pole `model`, ale wartość musi być skonfigurowanym aliasem.

F-6. Sekcja `clients` (opcjonalna, domyślnie `{}`) opisuje tożsamość wywołującego, nie użytkownika końcowego. Każdy wpis:

- `name` (niepusty string),
- `type`: `webapp` | `ide` | `cli` | `service` | `backend` | `automation` (`GATEWAY_CLIENT_TYPES`),
- `gatewayKeyRef` — nazwa zmiennej env z kluczem klienta,
- opcjonalne `rateLimit`: `rps`, `burst`, `maxConcurrentStreams` (gdy brak — limity z env, F-1c).

Runtime: niepuste wartości env → allowlista (`SPEC-PLATFORMA-I-KONTRAKTY.md` F-10). Pusty env pod `gatewayKeyRef` → ostrzeżenie w `config:validate`, **start HTTP nie jest odrzucany**; pusta allowlista ujawnia się dopiero na chronionej trasie (`GATEWAY_KEY_NOT_CONFIGURED`).

F-7. Observability env (skrót; pełna tabela: `docs/pl/konfiguracja.md`): `METRICS_BACKEND`, `AI_METRICS_BACKEND`, `ERROR_REPORTING_ADAPTER`, `SENTRY_DSN` / `SENTRY_ENABLED` / `SENTRY_ENVIRONMENT` / `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_INCLUDE_PROMPTS`, `LOG_ADAPTER` / `LOG_LEVEL`, `SWAGGER_ENABLED`, `PORT`. Zachowanie HTTP: `SPEC-METRYKI.md`, `SPEC-CHAT.md` F-9, `SPEC-PLATFORMA-I-KONTRAKTY.md` F-20–F-22.

## Wymagania niefunkcjonalne

NFR-1. Konfiguracja powinna być wersjonowana (`schemaVersion`; oczekiwane `1` w walidatorze).

NFR-2. Dokumentacja configu musi być spójna z implementacją (`docs/pl/konfiguracja.md` / `docs/configuration.md`).

NFR-3. Dostępny jest skrypt npm `config:validate` (wpis w `package.json`), który waliduje `gateway.config.yaml` oraz reguły env **bez** uruchamiania serwera, z niezerowym kodem wyjścia przy błędzie.

## Kryteria akceptacji

- [x] Serwis nie startuje bez sekretów wymaganych przez włączone instancje (klucz i/lub `baseUrlRef` wg typu) oraz bez klucza master.
- [x] Serwis nie startuje z configiem niespójnym: nieznany `providerInstance`, puste `models`, włączony provider bez modeli (F-3b, F-3c).
- [x] Serwis nie startuje przy duplikacie `apiKeyRef` w `providers` (F-3a).
- [x] W YAML dozwolone są wiele instancji z tym samym `type`.
- [x] Native API wybiera model wyłącznie przez `modelAlias` z allowlisty YAML; wartość spoza listy jest odrzucana.
- [x] `clients` z `type` spoza enum / bez `gatewayKeyRef` jest odrzucane przez Zod; `rateLimit` per klient jest opcjonalne.
- [x] `npm run config:validate` przechodzi na poprawnym zestawie i kończy się błędem na świadomie niepoprawnym.
- [x] `config:validate` ostrzega (nie failuje startu) przy pustym env klucza klienta.

## Poza zakresem (względem rdzenia MVP)

- Hot reload konfiguracji bez restartu.
- UI do zarządzania konfiguracją.
- Pełny katalog aliasów wszystkich modeli API providerów oraz walidacja kompletności aliasów „zwyczajowych”.
- Pełny kontrakt CLI (wizard, CRUD provider/model/client) — `SPEC-CLI.md`.
- Wizard pytań semantic w CLI (Faza 5.C planu semantic-cache) — nadal poza zakresem.
- Aktywne API invalidation cache (exact / semantic) — odroczone; `invalidateCache()` w kodzie bez podpięcia produkcyjnego (`SPEC-CHAT.md` F-8c).
- Distributed singleflight (Redis lock między replikami) — v2 planowane (`SPEC-CHAT.md` F-8c).
- Zmiana względem: wcześniejszy zapis „Infra Compose embedding / provisioning żywego Redis Search w Compose … poza zakresem”. **Provisioning base stack** (Redis Stack + ollama-embedding, `infra:up` / `docker:up`, pin obrazu, runbook `MODULE LIST`) jest **domknięty** w `docs/deployment.md` / `docs/pl/deployment.md` i `deployment/docker/`. **Runtime probe** Search/indeksu (`checks.vectorStore` w `/ready`) należy do `SPEC-HEALTH.md` F-1b — poza zakresem tej normy konfiguracji YAML/env pozostaje tylko wizard CLI, nie sonda aplikacji ani Compose.
