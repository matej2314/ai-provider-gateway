# Konfiguracja — AI Provider Gateway

Cel: “plug&play” — użytkownik wypełnia env + pliki konfiguracyjne i uruchamia gateway bez zmian w kodzie.

## 1) Sekrety i env (`.env`)

Zasada: **sekrety tylko w env**. Pliki konfiguracyjne nie zawierają wartości kluczy — jedynie **nazwy** zmiennych (`apiKeyRef`).

Zmienne providerów (Anthropic + Google Gemini — bieżący zestaw w repozytorium):

- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`

**Walidacja przy starcie (`src/config/env.validation.ts`):**

- W **`NODE_ENV=production`** wymagane jest, aby **co najmniej jedna** z powyższych zmiennych była niepusta po `trim()`. W przeciwnym razie start się nie powiedzie.
- W środowisku innym niż production ta reguła **nie jest sprawdzana** — nadal potrzebujesz jednak realnego klucza dla providera, którego alias wywołujesz (adapter rzuci błąd konfiguracji lub API).

W repo powinien istnieć `.env.example` bez wartości sekretów.

**Uwaga o `.env.example` vs domyślne wartości w kodzie:** szablon w repozytorium może mieć włączone funkcje opcjonalne (np. `CACHE_ENABLED=true`, `RATE_LIMIT_SMART_ENABLED=true`) dla wygody lokalnego developmentu. **Domyślne wartości walidatora** (`EnvironmentVariables` w `src/config/env.validation.ts`) przy braku zmiennej to: `CACHE_ENABLED=false`, `CACHE_BACKEND=noop`, `RATE_LIMIT_SMART_ENABLED=false`. Efektywna konfiguracja zależy od tego, co faktycznie ustawisz w `.env`.

**Klucze gateway (nagłówek `X-Gateway-Key`):**

- W **`gateway.config.yaml`**: pole **`masterKeyRef`** (nazwa zmiennej env dla klucza master, np. `MASTER_KEY`) oraz opcjonalna sekcja **`clients`** — każdy klient ma **`gatewayKeyRef`** wskazujący nazwę zmiennej env z kluczem tego klienta (np. `GATEWAY_KEY_WEBAPP`).
- Przy starcie **`buildGatewayKeyRuntime`** (`src/config/configuration.ts`) wczytuje wartość master z env, iteruje klientów i buduje **`allowList`**: master + wszystkie **niepuste** wartości kluczy klientów. Ta lista jest dostępna w aplikacji jako konfiguracja **`gatewayKey`** i jest używana przez **`GatewayKeyGuard`**.
- **Brak niepustego klucza master** → wyjątek przy ładowaniu konfiguracji (`[GatewayKey] Missing master key.`), proces się nie uruchomi.
- Endpointy czatu wymagają **`X-Gateway-Key`** na allowliście (`@GatewayKeyAndSmartRateLimit()`); **`GET /api/v1/health`** i **`GET /api/v1/health/ready`** nie.

### Cache odpowiedzi i Redis (opcjonalnie)

Zmienne są walidowane przy starcie klasą **`EnvironmentVariables`** w `src/config/env.validation.ts` (m.in. typy i wartości domyślne). Wartości używane w runtime składa też `configuration.ts` (`cache`, `redis` w obiekcie zwracanym przez `load`).

| Zmienna            | Domyślnie   | Znaczenie                                                                                                                                                                                                               |
| ------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CACHE_ENABLED`    | `false`     | Gdy **`true`**, cache jest **włączony** w konfiguracji; faktyczny backend wybiera `CACHE_BACKEND` (patrz niżej). Gdy `false`, w konfiguracji wymuszany jest backend **`noop`** — brak odczytu/zapisu cache.             |
| `CACHE_BACKEND`    | `noop`      | Dozwolone wartości w walidatorze: `noop`, `redis`, `memory`, `other`. **W kodzie zarejestrowane są `noop` i `redis`.** Nieznany backend → ostrzeżenie w logu i fallback do **`noop`** (`CacheRegistryService.resolve`). |
| `CACHE_TTL`        | `3600`      | TTL wpisów cache w **sekundach** (liczba całkowita ≥ 1).                                                                                                                                                                |
| `CACHE_KEY_PREFIX` | `aigw:`     | Prefiks kluczy zapisu odpowiedzi czatu (`ResponseCacheService`).                                                                                                                                                        |
| `REDIS_HOST`       | `localhost` | Host Redis (gdy ładowany moduł Redis).                                                                                                                                                                                  |
| `REDIS_PORT`       | `6379`      | Port Redis.                                                                                                                                                                                                             |
| `REDIS_PASSWORD`   | _(pusty)_   | Hasło; puste → połączenie bez hasła.                                                                                                                                                                                    |
| `REDIS_DB`         | `0`         | Numer bazy Redis.                                                                                                                                                                                                       |
| `REDIS_KEY_PREFIX` | `aigw:`     | Prefiks konfiguracyjny Redis (osobny od `CACHE_KEY_PREFIX`; przy braku `cache.keyPrefix` w serwisie cache używany jest fallback).                                                                                       |

**Ładowanie modułu Redis w Nest:**

- **Cache odpowiedzi:** w `src/app.module.ts` stos Redis (`RedisCacheModule` w `CacheModule.register`) jest importowany tylko gdy **`CACHE_ENABLED === 'true'`** oraz **`CACHE_BACKEND=redis`**. W przeciwnym razie backend cache to **`noop`**.
- **Smart rate limit:** `RateLimitModule` **zawsze** importuje `RedisCacheModule` (wspólny `RedisConnectionService`). Przy `RATE_LIMIT_SMART_ENABLED=true` i działającym Redis limitery działają **niezależnie** od tego, czy cache odpowiedzi jest włączony. Gdy Redis niedostępny → fail-open (żądania przepuszczane) — `konfiguracja.md` (sekcja smart rate limiting).

**Zachowanie:** `ChatService.executeChat` przed wywołaniem providera sprawdza cache (`ResponseCacheService`); przy trafieniu — tylko gdy alias i powiązany provider są **włączone** w YAML (`isCachedChatAllowedForModelAlias` w `src/chat/helpers/cache-policy.ts`) — zwracana jest zapisana odpowiedź z polami **`cached: true`** i **`cachedAt`** (ISO 8601). Streaming (`POST /api/v1/chat/stream`) **nie** korzysta z tej warstwy.

Szablon zmiennych: `.env.example`.

### Smart rate limiting (`src/rate-limit/`)

Implementacja: **`RateLimitModule`**, **`SmartRateLimiterService`**, **`SmartRateLimitGuard`** (dekorator `@GatewayKeyAndSmartRateLimit()` na kontrolerach czatu: najpierw `GatewayKeyGuard`, potem `SmartRateLimitGuard`). **`SmartRateLimitGuard`** ponownie weryfikuje nagłówek `X-Gateway-Key` (`requireGatewayKey`) — celowo, gdy guard jest użyty **bez** `GatewayKeyGuard` (defense in depth). **Nie** używa `@nestjs/throttler`.

**Kolejność limitów (per wartość `X-Gateway-Key`):**

1. Jeśli klient w runtime ma sekcję **`clients[].rateLimit`** w `gateway.config.yaml` → używane są `rps`, `burst`, `maxConcurrentStreams` z YAML (mapowanie po faktycznej wartości klucza z env, nie po nazwie wpisu `webapp`).
2. W przeciwnym razie → domyślne wartości z env (tabela poniżej).

| Zmienna                         | Domyślnie | Znaczenie                                                                                                                                                         |
| ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RATE_LIMIT_SMART_ENABLED`      | `false`   | Gdy **`true`**, `SmartRateLimitGuard` egzekwuje limity per `X-Gateway-Key` (wymaga gotowego Redis).                                                               |
| `RATE_LIMIT_RPS_PER_KEY`        | `10`      | Domyślny RPS (token bucket) gdy klient nie ma `rateLimit` w YAML.                                                                                                 |
| `RATE_LIMIT_BURST_PER_KEY`      | `20`      | Domyślny burst.                                                                                                                                                   |
| `RATE_LIMIT_STREAMS_CONCURRENT` | `3`       | Maks. równoległych streamów per klucz.                                                                                                                            |
| `RATE_LIMIT_COOLDOWN_AFTER_429` | `60`      | Sekundy blokady per klucz+provider po 429 od upstream (`ChatService.executeChat` → `SmartRateLimiterService.setCooldown`; tylko czat standardowy, nie streaming). |

W **`gateway.config.yaml`** opcjonalna sekcja **`clients.<id>.rateLimit`** (przykład: `webapp` w repozytoryjnym pliku; klient `ide-plugin` bez `rateLimit` → limity z env).

**Health** (`GET /api/v1/health`, `GET /api/v1/health/ready`) — bez guardów czatu i bez limitów gateway.

Gdy Redis niedostępny lub nie `ready`, `SmartRateLimiterService` **przepuszcza** żądania (graceful degradation). Kod błędu limitu gateway: **`RATE_LIMITED`** (HTTP 429). Limit upstream providera: **`PROVIDER_RATE_LIMITED`** (osobna ścieżka w `provider-error.mapper.ts`).

### Observability (env)

| Zmienna                                                                           | Domyślnie / zachowanie                                                                                            |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`                                                                       | `info` — poziom logów (`LoggingModule`).                                                                          |
| `LOG_ADAPTER`                                                                     | `pino` — backend logów (`pino` / `console`).                                                                      |
| `LOG_PRETTY`                                                                      | `false` w walidatorze; czytelny output Pino (dev).                                                                |
| `SENTRY_DSN`                                                                      | Pusty — wymagany, gdy włączony adapter Sentry (metrics lub error reporting).                                      |
| `SENTRY_ENABLED`                                                                  | `false` w walidatorze; w **development** włącza error reporting przez Sentry gdy `ERROR_REPORTING_ADAPTER` nie nadpisuje (`LoggingModule`). W **production** error reporting domyślnie próbuje Sentry (gdy `SENTRY_DSN` ustawiony). |
| `SENTRY_ENVIRONMENT`                                                              | `development` w walidatorze; przekazywane do Sentry.                                                            |
| `SENTRY_TRACES_SAMPLE_RATE`                                                       | `0.1` w walidatorze; w `instrument.ts` fallback `1.0` gdy brak wartości.                                        |
| `ERROR_REPORTING_ADAPTER`                                                         | `noop` w walidatorze; dozwolone: `sentry` \| `noop`. W production bez override → Sentry gdy `SENTRY_DSN` jest ustawiony. |
| `METRICS_BACKEND`                                                                 | `noop` w walidatorze; dozwolone: `sentry` \| `noop`. W **production** bez override → Sentry (`instrument.ts`, `MetricsModule`). |
| `SENTRY_INCLUDE_PROMPTS`                                                          | Brak w walidatorze; gdy `true` — `gen_ai.input.messages` / `gen_ai.output.messages` na spanach (wymagane m.in. dla widoku Conversations). |
| `APP_VERSION`                                                                     | W readiness (`GET /api/v1/health/ready`); fallback `dev` w logach.                                                |
| `CORS_ORIGINS`                                                                    | W `.env.example` — **nie** podłączone w `src/main.ts` (brak middleware CORS).                                     |
| `SWAGGER_ENABLED`                                                                 | Domyślnie włączone poza production (`SWAGGER_ENABLED !== 'false'`). W **production** Swagger UI/JSON tylko gdy **`SWAGGER_ENABLED=true`** (`src/swagger/swagger.setup.ts`). UI: `/api/v1/api-docs`, spec JSON: `/api/v1/swagger.json`. |
| `PORT`                                                                            | `3000`; używany też przy eksporcie OpenAPI (`openapi:export`).                                                    |
| `NODE_ENV`                                                                        | W **production** wymusza regułę co najmniej jednego klucza providera (sekcja 1).                                  |

**Sentry — dwa punkty inicjalizacji:**

- **`src/instrument.ts`** (przed bootstrapem Nest): SDK Sentry z `streamGenAiSpans: true` gdy metryki Sentry są aktywne — wymagane dla widoku **Conversations** (`conversation-tracking.md`).
- **`LoggingModule`** / **`MetricsModule`**: adaptery error reporting i metryk LLM (`SentryAiMetricsAdapter`, `SentryErrorReportingAdapter`).

**Readiness a Redis:** `GET /api/v1/health/ready` zwraca `checks.cache` (stan backendu cache `noop`/`redis`), **nie** osobny check pod smart rate limit. Przy `CACHE_ENABLED=false` i `RATE_LIMIT_SMART_ENABLED=true` operator powinien monitorować Redis poza readiness lub rozszerzyć health w przyszłości.

## 2) Plik `gateway.config.yaml` (modele / instancje / polityki)

**Status:** plik jest **wczytywany przy starcie** aplikacji (`ConfigModule` → `load: [configuration]` w `src/app.module.ts`). Walidacja struktury: **Zod** w `src/config/configuration.ts`. Brak pliku lub niezgodność ze schematem powoduje **zatrzymanie startu** (`ENOENT` lub `Invalid configuration file`).

Repozytoryjny przykład: `gateway.config.yaml` w katalogu głównym projektu.

### Schemat (zgodny z walidatorem Zod)

Minimalny szkielet zgodny z repozytorium obejmuje m.in. **`masterKeyRef`**, **`clients`** (opcjonalnie) oraz **`providers`** / **`models`**:

```yaml
schemaVersion: 1
masterKeyRef: MASTER_KEY

clients:
  webapp:
    name: My web app
    type: webapp
    gatewayKeyRef: GATEWAY_KEY_WEBAPP
    rateLimit:
      rps: 10
      burst: 10
      maxConcurrentStreams: 3

providers:
  anthropic:
    type: anthropic
    apiKeyRef: ANTHROPIC_API_KEY
    enabled: true
  google:
    type: google
    apiKeyRef: GOOGLE_API_KEY
    enabled: true

models:
  chat-default:
    providerInstance: anthropic
    modelId: claude-sonnet-4-5-20250929
    capabilities:
      streaming: true
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 500
        allowOverrides: [temperature, maxOutputTokens]
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }

  claude-sonnet:
    providerInstance: anthropic
    modelId: claude-sonnet-4-5-20250929
    fallback: chat-default
    capabilities:
      streaming: true
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 1024
        allowOverrides: [temperature, maxOutputTokens]
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }

  gemini-flash:
    providerInstance: google
    modelId: gemini-2.5-flash
    fallback: chat-default
    capabilities:
      streaming: true
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 1024
        allowOverrides: [temperature, maxOutputTokens]
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
```

Uwagi:

- `apiKeyRef` to **nazwa** zmiennej env, nie wartość.
- `masterKeyRef` oraz każde `gatewayKeyRef` w `clients` to **nazwy** zmiennych env z wartościami kluczy gateway — ustawiane w `.env` (szablon: `.env.example`).
- Aliasy pod `models` są publicznym API (`modelAlias`).
- **Mapowanie kluczy do adapterów:** `configuration.ts` buduje obiekt `providers` jako `Record<type, { apiKey }>` iterując wpisy w `gateway.config.providers` i ustawiając `providersByType[instance.type]`. Nazwy instancji (np. `anthropic`, `google` w repozytoryjnym pliku) mogą być dowolne pod warunkiem unikalnego `providerInstance` w modelach.
- **Fallback aliasu (`models[].fallback`):** opcjonalny klucz wskazujący inny alias z sekcji `models`. Po wyczerpaniu retry na aliasie żądanym `ResilientExecutor` (`src/common/resilience/resilient-executor.ts`) próbuje alias fallback (z tą samą polityką retry/timeout z aliasu **pierwszego**). Walidacja Zod przy starcie: fallback musi istnieć, nie może wskazywać samego siebie ani tworzyć pętli A→B→A. Przy sukcesie na fallbacku odpowiedź HTTP zawiera opcjonalne **`effectiveModelAlias`** (alias faktycznie użyty); pole **`model`** pozostaje żądanym `modelAlias`.
- **Ograniczenie: jedna instancja per typ providera.** W `providers` może wystąpić **co najwyżej jeden** wpis o danym `type` (np. tylko jeden `type: anthropic`). Walidacja Zod (`GatewayConfigSchema.providers.superRefine` w `src/config/configuration.ts`) **odrzuca start** z czytelnym komunikatem przy duplikacie (komunikat wskazuje zduplikowany typ i nazwy zderzających się instancji). Różnice między środowiskami (dev/staging/prod) wyraża się **wartością** zmiennej środowiskowej wskazanej przez `apiKeyRef`, a nie przez deklarowanie wielu instancji tego samego typu w YAML.
- **Spójność grafu `providers` ↔ `models` (fail-fast przy starcie):**
  - sekcja `models` **nie może być pusta**;
  - każdy wpis w `models` musi wskazywać **istniejący** klucz w `providers` (`providerInstance`);
  - każda instancja providera z **`enabled !== false`** (w praktyce w YAML ustaw **`enabled: true`** dla providerów używanych w runtime; pominięte `enabled` → po parsowaniu Zod domyślnie **`false`**, wtedy instancja jest wyłączona) musi mieć **co najmniej jeden** alias w `models` z tym samym `providerInstance`;
  - po filtrze `enabled` funkcja `buildEffectiveGatewayConfig` ponownie wymusza, że każdy **aktywny** provider ma ≥1 **aktywny** model (modele powiązane z providerem `enabled: false` są pomijane z ostrzeżeniem w logu).
  - Instancja z **`enabled: false`** **nie wymaga** wpisów w `models` (może pozostać w YAML jako wyłączona rezerwa).
- Polityki (`timeoutMs`, `retry`, `params`) są w pliku zdefiniowane. **`policy.params`** — merge w `resolveProviderCallOptions`. **`timeoutMs`** i **`retry`** — egzekwowane w `ResilientExecutor` przy wywołaniu adaptera (timeout → `PROVIDER_TIMEOUT` / HTTP 504; retry tylko dla statusów z `onStatus`, domyślnie `[429, 500, 502, 503, 504]` lub `RETRY_POLICY_DEFAULTS`). Brak wartości w YAML → domyślne `maxAttempts: 3`, `timeoutMs: 30000`.

## 3) Walidacja i fail-fast

Gateway kończy start m.in. gdy:

- **`gateway.config.yaml`** nie istnieje lub nie przechodzi walidacji Zod (`GatewayConfigSchema` + `buildEffectiveGatewayConfig` w `src/config/configuration.ts`),
- w `providers` występują **dwa lub więcej** wpisy o tym samym `type` (jedna instancja per typ — patrz pkt 2),
- sekcja **`models` jest pusta**,
- alias w `models` wskazuje **nieznany** `providerInstance`,
- **włączony** provider (`enabled !== false`) **nie ma** żadnego aliasu w `models` z tym `providerInstance`,
- po zastosowaniu flag `enabled` **nie ma żadnego aktywnego modelu** albo **aktywny** provider nie ma przypisanego aktywnego modelu,
- dla **aktywnego** providera brakuje niepustego env wskazanego przez `apiKeyRef` (`[GatewayConfig] Missing API key…`),
- brakuje niepustego klucza **master** (`[GatewayKey] Missing master key.`),
- w **production** nie ma co najmniej jednego klucza API providera w env (patrz sekcja 1).

**Warstwy walidacji YAML:**

| Warstwa                | Gdzie                         | Przykładowe reguły                                                                                                                   |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Zod (surowy YAML)      | `GatewayConfigSchema`         | duplikat `type`; puste `models`; model → provider; provider (aktywny) → ≥1 model; `fallback` istnieje, bez samoodwołania i pętli A↔B |
| Efektywna konfiguracja | `buildEffectiveGatewayConfig` | filtr `enabled`; ≥1 aktywny model globalnie; aktywny provider → aktywny model; klucz API dla aktywnych providerów                    |

**Poza zakresem obecnej implementacji (plan — krok 5.6, część pozostała):** pełny katalog aliasów wszystkich modeli API Anthropic/Google oraz walidacja kompletności aliasów „zwyczajowych” względem ustalonej listy MVP.

### Skrypt diagnostyczny `npm run config:validate`

Skrypt waliduje konfigurację **offline** (bez uruchamiania serwera HTTP), używając tej samej logiki co start aplikacji:

- walidacja YAML przez `GatewayConfigSchema` (Zod),
- walidacja reguł runtime przez `buildEffectiveGatewayConfig` (filtr `enabled` + wymagane klucze `apiKeyRef` dla włączonych providerów),
- walidacja wymogu klucza master (`masterKeyRef`) jak w `buildGatewayKeyRuntime` (brak → błąd),
- ostrzeżenia (nie blokują) m.in. dla klientów z pustym env pod `gatewayKeyRef`.

Uruchomienie:

```bash
npm run config:validate
```

Opcje przez env:

- `CONFIG_PATH`: ścieżka do pliku YAML (domyślnie `gateway.config.yaml` w `process.cwd()`).
- `CONFIG_VALIDATE_STRICT=true`: tryb CI — błąd, jeśli po `trim()` brak **obu** `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (szersze niż reguła production-only z `env.validation.ts`).

Exit code:

- `0` gdy `errors.length === 0` (warnings są dozwolone),
- `1` gdy walidacja wykryje błąd.

Uwaga: skrypt próbuje doładować `.env` przez `dotenv` **jeśli** paczka jest zainstalowana; w CI zwykle env pochodzi z sekretów i `dotenv` nie jest wymagany.

### CLI a ładowanie konfiguracji (Faza 0)

Runtime HTTP i CLI **nie używają tej samej ścieżki** ładowania configu:

| Aspekt | Runtime (`ConfigModule` → `configuration.ts`) | CLI (`CliConfigLoaderService`) |
|--------|-----------------------------------------------|--------------------------------|
| Entry point | `src/main.ts` → `AppModule` | `bin/gateway-cli-wrapper.js` → `CliModule` |
| Wymaga `.env` przy starcie CLI | tak (przy starcie serwera HTTP) | **nie** — CLI startuje bez `.env` |
| Parsowanie YAML | `yaml.load` + `GatewayConfigSchema` | to samo (`loadRawConfig`) |
| Rozwiązywanie env | `buildEffectiveGatewayConfig()`, klucze master/provider/client | **pominięte** w `loadRawConfig`; opcjonalny raport braków w `loadWithEnvCheck()` |
| Pełna walidacja jak przy starcie serwera | przy każdym boot HTTP | komendy CLI *(plan)* — wizard / `config:validate` |

Uruchomienie CLI (Faza 0 — root command + lista planowanych komend):

```bash
npm run cli
# lub po npm link: gateway-cli
```

Konwencja komend: `gateway <namespace>:<action>` (np. `gateway config:init` — *(plan, Faza 2)*). Szczegóły architektury: `architektura.md`, `architektura-katalogi-pliki.md` (sekcja 2a).

## 4) Nadpisywanie parametrów per request

**DTO i `openapi.json`** przyjmują `modelAlias`, `messages` (ostatnie: **1–150** elementów, `content` do **3000** znaków na wiadomość), opcjonalne **`conversationId`** w formacie **`conv_<uuid>`** (regex w `ChatRequestDto`; w **response** zawsze echo lub nowe `conv_<uuid>`; w **request** włącza `gen_ai.conversation.id` w Sentry — `conversation-tracking.md`) oraz opcjonalne zagnieżdżone **`params`** (`temperature`, `maxOutputTokens`). Treść wiadomości w spanach: `SENTRY_INCLUDE_PROMPTS=true`.

**Merge parametrów:** `resolveProviderCallOptions` (`src/chat/helpers/resolve-provider-call-options.ts`) bierze `policy.params` z YAML dla aliasu, nakłada body `params` tylko dla pól z **`allowOverrides`**, następnie **clamp** do **`bounds`**. Niedozwolone pole → HTTP **400** + `MODEL_NOT_ALLOWED`. Efektywne wartości trafiają do adapterów (`ProviderCallOptions`) i do klucza cache (`ResponseCacheService`).

Szczegóły: `dokumentacja_api.md`, `openapi.json`.

## 5) Profile środowiskowe (opcjonalnie)

W praktyce wygodne są osobne pliki, np.:

- `gateway.config.dev.yaml`
- `gateway.config.prod.yaml`

albo łączenie plików (bazowy + override). Obecna implementacja wczytuje **jeden** plik o stałej ścieżce `gateway.config.yaml` w `process.cwd()` — zmiana profili wymaga podmiany pliku lub rozwoju kodu.

## 6) Pliki system promptu (`src/config/system-prompt/`)

Przy starcie `configuration.ts` wczytuje treści używane do złożenia instrukcji systemowej dla providerów (pole `system` w porcie adapterów). Kolejność składania w runtime: **MASTER** → opcjonalnie **MAIN** → opcjonalnie warstwa **per alias modelu**, oddzielane podwójną newline (`\n\n`).

| Plik                      | Wymagany | Opis                                                                                                                                                              |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MASTER_SYSTEM_PROMPT.md` | tak      | Guardrails i obowiązkowa warstwa polityki; brak pliku lub treść pusta po obróbce → **fail-fast** przy starcie.                                                    |
| `MAIN_SYSTEM_PROMPT.md`   | nie      | Opcjonalna warstwa wdrożeniowa (np. styl, format); brak lub pusto → pomijana.                                                                                     |
| `models/<modelAlias>.md`  | nie      | Opcjonalna warstwa dla danego aliasu z `gateway.config.yaml` → `models`; nazwa pliku = dokładnie klucz aliasu (np. `chat-default.md`). Brak lub pusto → pomijana. |

Dla plików opcjonalnych komentarze HTML `<!-- ... -->` są usuwane przy ładowaniu — można umieścić w nich dokumentację bez wysyłania jej do modelu (`stripHtmlComments` w `configuration.ts`).

Powiązane: `dokumentacja_api.md`.
