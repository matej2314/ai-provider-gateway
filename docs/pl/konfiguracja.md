# Konfiguracja — AI Provider Gateway

## 0) Pierwsze uruchomienie (wizard konfiguracji)

Repozytorium zawiera przykładowy PLACEHOLDER **`gateway.config.example.yaml`**. Przed pierwszym `npm run start:dev` skopiuj go do **`gateway.config.yaml`**, uzupełnij **`.env`** na bazie **`.env.example`** (klucze providerów, master key, opcjonalnie klucze klientów — nazwy muszą zgadzać się z `*KeyRef` w YAML) albo uruchom wizard:

```bash
cp gateway.config.example.yaml gateway.config.yaml
cp .env.example .env
# potem edycja ręczna albo:
npm run cli config:init
# lub: npx gateway config:init
```

Wizard generuje lub nadpisuje `gateway.config.yaml`, `.env`, `.env.example` oraz opcjonalnie pliki system prompt (szablony: `src/cli/templates/`). Wykrywa konfigurację boilerplate przez **`CliConfigLoaderService.isBoilerplateConfig()`** — gdy `masterKeyRef` lub ID wpisów w `providers:` / `clients:` zawierają `placeholder` / `PLACEHOLDER` (jak w rootowym `gateway.config.example.yaml`).

**Ważne:** Runtime wczytuje wyłącznie **`gateway.config.yaml`** z katalogu roboczego. Szczegóły flow: **`CLI.md`**.

## 1) Sekrety i env (`.env`)

Zasada: **sekrety tylko w env**. Pliki konfiguracyjne nie zawierają wartości kluczy — jedynie **nazwy** zmiennych (`apiKeyRef` per instancja providera w YAML).

### Klucze providerów (`apiKeyRef`)

`buildEffectiveGatewayConfig()` (`src/config/configuration.ts`) woła fasadę **`assertEnabledProviderSecretsPresent()`** (`src/config/configuration-validation.service.ts`), która deleguje do `provider-api-key.validation.ts` / `provider-base-url.validation.ts`: dla każdej instancji z **`enabled !== false`** env pod **`apiKeyRef`** musi być niepusty po `trim()` (wyjątek: typy OpenAI — klucz może być pusty; wymagany poprawny URL pod **`baseUrlRef`**).

Przykłady nazw:

| Źródło | `providerInstance` | `apiKeyRef` w YAML |
|--------|--------------------|--------------------|
| Wizard (domyślnie) | `anthropic-primary` | `ANTHROPIC_PRIMARY_API_KEY` |
| Wizard (domyślnie) | `google-primary` | `GOOGLE_PRIMARY_API_KEY` |

Wizard (`deriveApiKeyRef()` w `src/cli/utils/provider-id.util.ts`) buduje `apiKeyRef` jako `{INSTANCE_ID}_API_KEY` (slug wielkimi literami). Domyślne ID instancji: `{type}-primary` (np. `anthropic-primary`).

Runtime **czyta wyłącznie `apiKeyRef` z YAML** — nazwa zmiennej w `.env` musi być zgodna z YAML (np. tylko `ANTHROPIC_API_KEY` w env, a YAML ma `ANTHROPIC_PRIMARY_API_KEY` → start fail). Format klucza Anthropic/Google waliduje CLI przy wprowadzaniu (`validateProviderApiKey` w `src/cli/utils/api-key-validation.util.ts`), nie `validateEnvironment()`.

Główny szablon env dla użytkownika to **`.env.example` w katalogu głównym**, sparowany z rootowym **`gateway.config.example.yaml`** (nazwy `*KeyRef` z `PLACEHOLDER`). Opcjonalna kopia może też istnieć w `deployment/templates/` (CI / mirror). Nazwy `apiKeyRef` / `gatewayKeyRef` muszą być zgodne z YAML.

**Uwaga o `.env.example` vs domyślne wartości w kodzie:** szablon w repozytorium może mieć włączone funkcje opcjonalne (np. `CACHE_ENABLED=true`, `RATE_LIMIT_SMART_ENABLED=true`) dla wygody lokalnego developmentu. **Domyślne wartości walidatora** (`EnvironmentVariables` w `src/config/env.validation.ts`) przy braku zmiennej to: `CACHE_ENABLED=false`, `CACHE_BACKEND=noop`, `RATE_LIMIT_SMART_ENABLED=false`. Efektywna konfiguracja zależy od tego, co faktycznie ustawisz w `.env`.

**Klucze gateway (nagłówek `X-Gateway-Key`):**

- W **`gateway.config.yaml`**: pole **`masterKeyRef`** (nazwa zmiennej env dla klucza master, np. `MASTER_KEY`) oraz opcjonalna sekcja **`clients`** — każdy klient ma **`gatewayKeyRef`** wskazujący nazwę zmiennej env z kluczem tego klienta (np. `GATEWAY_KEY_WEBAPP`).
- Przy starcie **`buildGatewayKeyRuntime`** (`src/config/configuration.ts`) wczytuje wartość master z env, iteruje klientów i buduje **`allowList`**: master + wszystkie **niepuste** wartości kluczy klientów. Ta lista jest dostępna w aplikacji jako konfiguracja **`gatewayKey`** i jest używana przez **`GatewayKeyGuard`**.
- **Brak niepustego klucza master** → wyjątek przy ładowaniu konfiguracji (`[GatewayKey] Missing master key.`), proces się nie uruchomi.
- Endpointy czatu wymagają **`X-Gateway-Key`** na allowliście (`@GatewayKeyAndSmartRateLimit()`); **`GET /api/v1/health`** i **`GET /api/v1/health/ready`** nie.

### Cache odpowiedzi i Redis (opcjonalnie)

Zmienne są walidowane przy starcie przez **`validateEnvironment()`** (fasada → `EnvironmentVariables` w `env.validation.ts`; m.in. typy i wartości domyślne). Wartości używane w runtime składa też `configuration.ts` (`cache`, `redis` w obiekcie zwracanym przez `load`).

| Zmienna            | Domyślnie   | Znaczenie                                                                                                                                                                                                                                                                                                              |
| ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CACHE_ENABLED`    | `false`     | Gdy **`true`**, cache jest **włączony** w konfiguracji; faktyczny backend wybiera `CACHE_BACKEND` (patrz niżej). Gdy `false`, w konfiguracji wymuszany jest backend **`noop`** — brak odczytu/zapisu cache.                                                                                                            |
| `CACHE_BACKEND`    | `noop`      | Dozwolone wartości w walidatorze: `noop`, `redis`, `memory`, `other`. **W kodzie zarejestrowane są `noop` i `redis`.** Wizard `config:init` oferuje tylko `redis` \| `noop`; wartość `memory` można ustawić ręcznie w `.env` — runtime traktuje nieznany backend jak **`noop`** (`CacheRegistryService.resolve`). Nieznany backend → ostrzeżenie w logu i fallback do **`noop`**. |
| `CACHE_TTL`        | `3600`      | TTL wpisów cache w **sekundach** (liczba całkowita ≥ 1).                                                                                                                                                                                                                                                               |
| `CACHE_KEY_PREFIX` | `aigw:`     | Prefiks kluczy zapisu odpowiedzi czatu (`ResponseCacheService`).                                                                                                                                                                                                                                                       |
| `REDIS_HOST`       | `localhost` | Host Redis (gdy ładowany moduł Redis).                                                                                                                                                                                                                                                                                 |
| `REDIS_PORT`       | `6379`      | Port Redis.                                                                                                                                                                                                                                                                                                            |
| `REDIS_PASSWORD`   | _(pusty)_   | Hasło; puste → połączenie bez hasła.                                                                                                                                                                                                                                                                                   |
| `REDIS_DB`         | `0`         | Numer bazy Redis.                                                                                                                                                                                                                                                                                                      |
| `REDIS_KEY_PREFIX` | `aigw:`     | Prefiks konfiguracyjny Redis (osobny od `CACHE_KEY_PREFIX`; przy braku `cache.keyPrefix` w serwisie cache używany jest fallback).                                                                                                                                                                                      |

**Ładowanie modułu Redis w Nest:**

- **Wspólna infrastruktura Redis:** `RedisConnectionService` (`src/cache/adapters/redis-cache/`) jest współdzielony przez **cache odpowiedzi** i **smart rate limiting**. Predykat: `isRedisRequired()` w `src/cache/should-include-redis-stack.ts`.
- **Kiedy Redis się łączy:** gdy `isRedisRequiredFromEnv()` = true, tj.:
  - `CACHE_ENABLED=true` **oraz** `CACHE_BACKEND=redis`, **lub**
  - `RATE_LIMIT_SMART_ENABLED=true`.
- **Implementacja:** `CacheModule.register({ includeRedisStack: isRedisRequiredFromEnv() })` w `src/app.module.ts`. Nazwa opcji `includeRedisStack` jest historyczna — dotyczy całej infrastruktury Redis, nie tylko cache.
- **Gdy Redis wymagany, ale niedostępny:** smart rate limit → fail-open (żądania przepuszczane); readiness → `checks.redis: degraded` (szczegóły poniżej).

**Zachowanie:** `ChatService.executeChat` przed wywołaniem providera sprawdza cache (`ResponseCacheService`); przy trafieniu — tylko gdy alias i powiązany provider są **włączone** w YAML (`isCachedChatAllowedForModelAlias` w `src/chat/helpers/cache-policy.ts`) — zwracana jest zapisana odpowiedź z polami **`cached: true`** i **`cachedAt`** (ISO 8601). Odczyt z Redis parsowany jest przez **`parseCachedChatResponse`** (`CachedChatResponseSchema` w `src/cache/schemas/cached-chat-response.schema.ts`); niepoprawny kształt → usunięcie klucza i traktowanie jako MISS. Streaming (`POST /api/v1/chat/stream`) **nie** korzysta z tej warstwy.

Szablon zmiennych: `.env.example`.

### Smart rate limiting (`src/rate-limit/`)

Implementacja: **`RateLimitModule`**, **`SmartRateLimiterService`**, **`SmartRateLimitGuard`** (dekorator `@GatewayKeyAndSmartRateLimit()` na kontrolerach czatu: najpierw `GatewayKeyGuard`, potem `SmartRateLimitGuard`). **`SmartRateLimitGuard`** ponownie weryfikuje nagłówek `X-Gateway-Key` (`requireGatewayKey`) — celowo, gdy guard jest użyty **bez** `GatewayKeyGuard` (defense in depth). **Nie** używa `@nestjs/throttler`.

**Kolejność limitów (per wartość `X-Gateway-Key`):**

1. Jeśli klient w runtime ma sekcję **`clients[].rateLimit`** w `gateway.config.yaml` → używane są `rps`, `burst`, `maxConcurrentStreams` z YAML (mapowanie po faktycznej wartości klucza z env, nie po ID wpisu klienta).
2. W przeciwnym razie → domyślne wartości z env (tabela poniżej).

| Zmienna                         | Domyślnie | Znaczenie                                                                                                                                                         |
| ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RATE_LIMIT_SMART_ENABLED`      | `false`   | Gdy **`true`**, `SmartRateLimitGuard` egzekwuje limity per `X-Gateway-Key` (wymaga gotowego Redis).                                                               |
| `RATE_LIMIT_RPS_PER_KEY`        | `10`      | Domyślny RPS (token bucket) gdy klient nie ma `rateLimit` w YAML.                                                                                                 |
| `RATE_LIMIT_BURST_PER_KEY`      | `20`      | Domyślny burst.                                                                                                                                                   |
| `RATE_LIMIT_STREAMS_CONCURRENT` | `3`       | Maks. równoległych streamów per klucz.                                                                                                                            |
| `RATE_LIMIT_COOLDOWN_AFTER_429` | `60`      | Sekundy blokady per klucz+provider po 429 od upstream. **Sprawdzenie** cooldownu (`checkCooldown`) i **ustawienie** (`setCooldown` przez `ChatErrorHandlerService.handleProviderError`) dotyczy **`executeChat` i `executeStream`** — wspólne `prepareRequestForExecution`. |

W **`gateway.config.yaml`** opcjonalna sekcja **`clients.<id>.rateLimit`**. Wizard `config:init` pozwala skonfigurować limity per klient; klient bez `rateLimit` korzysta z wartości env.

**Health** (`GET /api/v1/health`, `GET /api/v1/health/ready`) — bez guardów czatu i bez limitów gateway.

Gdy Redis niedostępny lub nie `ready`, `SmartRateLimiterService` **przepuszcza** żądania (graceful degradation). Kod błędu limitu gateway: **`RATE_LIMITED`** (HTTP 429). Limit upstream providera: **`PROVIDER_RATE_LIMITED`** (osobna ścieżka w `provider-error.mapper.ts`).

### Observability (env)

| Zmienna                     | Domyślnie / zachowanie                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LOG_LEVEL`                 | `info` — poziom logów (`LoggingModule`; **brak** wpisu w `EnvironmentVariables` — odczyt bezpośrednio w module).                                                                                                                                                                                                                                                               |
| `LOG_ADAPTER`               | `pino` — backend logów (`pino` / `console`; jak wyżej — poza walidatorem env).                                                                                                                                                                                                                                                                                                 |
| `LOG_PRETTY`                | `false` w walidatorze; czytelny output Pino (dev).                                                                                                                                                                                                                                                                                                                             |
| `SENTRY_DSN`                | Pusty — wymagany, gdy włączony adapter Sentry (metrics lub error reporting).                                                                                                                                                                                                                                                                                                   |
| `SENTRY_ENABLED`            | `false` w walidatorze; w **development** włącza error reporting przez Sentry gdy `ERROR_REPORTING_ADAPTER` nie nadpisuje (`LoggingModule`). W **production** error reporting domyślnie próbuje Sentry (gdy `SENTRY_DSN` ustawiony).                                                                                                                                            |
| `SENTRY_ENVIRONMENT`        | `development` w walidatorze; przekazywane do Sentry.                                                                                                                                                                                                                                                                                                                           |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` w walidatorze; w `instrument.ts` fallback `1.0` gdy brak wartości.                                                                                                                                                                                                                                                                                                       |
| `ERROR_REPORTING_ADAPTER`   | `noop` w walidatorze; dozwolone: `sentry` \| `noop`. W production bez override → Sentry gdy `SENTRY_DSN` jest ustawiony.                                                                                                                                                                                                                                                       |
| `METRICS_BACKEND`           | `noop` w walidatorze; dozwolone: `prometheus` \| `noop`. W **production** bez override → Prometheus (`AppMetricsModule` / `ObservabilityModule`, endpoint `GET /metrics`).                                                                                                                                                                                                      |
| `AI_METRICS_BACKEND`        | `noop` w walidatorze; dozwolone: `sentry` \| `noop`. W **production** bez override → Sentry gdy `SENTRY_DSN` ustawiony (`instrument.ts`, `AiMetricsModule` / `ObservabilityModule`).                                                                                                                                                                                           |
| `SENTRY_INCLUDE_PROMPTS`    | Brak w walidatorze; gdy `true` — `gen_ai.input.messages` / `gen_ai.output.messages` na spanach (wymagane m.in. dla widoku Conversations).                                                                                                                                                                                                                                      |
| `APP_VERSION`               | W readiness (`GET /api/v1/health/ready`) — fallback **`1.0.0`** (`HealthService`). W logach (`LoggingModule`) — fallback **`dev`**.                                                                                                                                                                                                                                            |
| `SWAGGER_ENABLED`           | Domyślnie włączone poza production (`SWAGGER_ENABLED !== 'false'`). W **production** Swagger UI/JSON tylko gdy **`SWAGGER_ENABLED=true`** (`src/swagger/swagger.setup.ts`). UI: `/api/v1/api-docs`, spec JSON: `/api/v1/swagger.json` — obejmuje tagi **Health**, **Chat**, **OpenAI API**, **Anthropic API** (ten sam dokument co `openapi.json` z `npm run openapi:export`). |
| `PORT`                      | `3000`; używany też przy eksporcie OpenAPI (`openapi:export`).                                                                                                                                                                                                                                                                                                                 |
| `NODE_ENV`                  | Używany m.in. przez `LoggingModule`, Sentry, domyślne zachowanie Swagger — **nie** wymusza już globalnej reguły „≥1 klucz Anthropic/Google”; klucze providerów walidowane per `apiKeyRef` w YAML (sekcja 1). |

**Sentry — dwa punkty inicjalizacji:**

- **`src/instrument.ts`** (przed bootstrapem Nest): SDK Sentry z `streamGenAiSpans: true` gdy metryki Sentry są aktywne — wymagane dla widoku **Conversations** (`conversation_tracking.md`).
- **`LoggingModule`** / **`AiMetricsModule`** (w `ObservabilityModule`): adaptery error reporting i metryk LLM (`SentryAiMetricsAdapter`, `SentryErrorReportingAdapter`).

**Readiness a Redis:** `GET /api/v1/health/ready` zwraca:

- **`checks.redis`** — stan współdzielonej infrastruktury Redis (probe `PING` tylko gdy `required: true`; pola `required`, `consumers`: `cache`, `rate-limit`),
- **`checks.cache`** — stan feature cache (gdy backend `redis`, dostępność wynika z `checks.redis`, bez osobnego probe).

Przy `CACHE_ENABLED=false` i `RATE_LIMIT_SMART_ENABLED=true` readiness **sprawdza Redis** przez `checks.redis`, nie `checks.cache`.

## 2) Plik `gateway.config.yaml` (modele / instancje / polityki)

**Status:** plik jest **wczytywany przy starcie** aplikacji (`ConfigModule` → `load: [configuration]` w `src/app.module.ts`). Walidacja struktury: **Zod** w `src/config/gateway-config.schema.ts` (`GatewayConfigSchema`); składanie efektywnej konfiguracji i rozwiązywanie env — `src/config/configuration.ts` → obiekt **`AppConfiguration`** (`app-configuration.types.ts`). Serwisy runtime odczytują klucze przez **`getAppConfig` / `getAppConfigOrThrow`** (`typed-config.ts`) zamiast surowych stringów `config.get('...')`. Brak pliku lub niezgodność ze schematem powoduje **zatrzymanie startu** (`ENOENT` lub `Invalid configuration file`).

**Przykład PLACEHOLDER** jest w **`gateway.config.example.yaml`** (kopiuj do `gateway.config.yaml`): `placeholder-provider`, `placeholder-client`, `placeholder-model`, z nazwami `*KeyRef` zawierającymi `PLACEHOLDER`. Wizard **`config:init`** zastępuje boilerplate pełną konfiguracją operacyjną. Poniższy przykład ilustruje typowy wynik wizarda.

### Schemat (zgodny z walidatorem Zod)

Minimalny szkielet zgodny z repozytorium obejmuje m.in. **`masterKeyRef`**, **`clients`** (opcjonalnie) oraz **`providers`** / **`models`**:

```yaml
schemaVersion: 1
masterKeyRef: MASTER_KEY

clients:
  webapp:
    name: My web app
    type: webapp # dozwolone: webapp | ide | cli | service | backend | automation
    gatewayKeyRef: GATEWAY_KEY_WEBAPP
    rateLimit: # opcjonalne; brak → limity z env
      rps: 10
      burst: 10
      maxConcurrentStreams: 3

providers:
  anthropic-primary:
    type: anthropic
    apiKeyRef: ANTHROPIC_PRIMARY_API_KEY
    enabled: true
  google-primary:
    type: google
    apiKeyRef: GOOGLE_PRIMARY_API_KEY
    enabled: true

models:
  chat-default:
    providerInstance: anthropic-primary
    modelId: claude-sonnet-4-5-20250929
    capabilities:
      streaming: true
      tools: true
      thinking: true # opcjonalne; wymagane dla params.thinkingEnabled / thinkingBudget
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 500
          thinkingEnabled: false # opt-in w body; domyślnie wyłączone (koszt)
          # Anthropic: NIE ustawiaj topP w defaults obok temperature (API odrzuca oba naraz)
        allowOverrides:
          - temperature
          - maxOutputTokens
          - topP
          - stop
          - frequencyPenalty
          - presencePenalty
          - seed
          - responseFormat
          - thinkingEnabled
          - thinkingBudget
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
          topP: { min: 0, max: 1 }
          frequencyPenalty: { min: -2, max: 2 }
          presencePenalty: { min: -2, max: 2 }

  claude-sonnet:
    providerInstance: anthropic-primary
    modelId: claude-sonnet-4-5-20250929
    fallback: chat-default
    capabilities:
      streaming: true
      tools: true
      thinking: true # opcjonalne; wymagane dla params.thinkingEnabled / thinkingBudget
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 1024
          thinkingEnabled: false
        allowOverrides:
          - temperature
          - maxOutputTokens
          - topP
          - stop
          - frequencyPenalty
          - presencePenalty
          - seed
          - responseFormat
          - thinkingEnabled
          - thinkingBudget
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
          topP: { min: 0, max: 1 }
          frequencyPenalty: { min: -2, max: 2 }
          presencePenalty: { min: -2, max: 2 }

  gemini-flash:
    providerInstance: google-primary
    modelId: gemini-2.5-flash
    fallback: chat-default
    capabilities:
      streaming: true
      tools: true
      thinking: false # w repo: false dla gemini-2.5-flash; Gemini 3.0+ — ustaw true gdy model wspiera ThinkingConfig
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.4
          maxOutputTokens: 1024
          topP: 0.95 # Google Gemini: temperature + topP w defaults jest OK
          thinkingEnabled: false
        allowOverrides:
          - temperature
          - maxOutputTokens
          - topP
          - stop
          - frequencyPenalty
          - presencePenalty
          - seed
          - responseFormat
          - thinkingEnabled
          - thinkingBudget
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
          topP: { min: 0, max: 1 }
          frequencyPenalty: { min: -2, max: 2 }
          presencePenalty: { min: -2, max: 2 }
```

### Parametry generacji a typ providera

Alias w `models` wskazuje **`providerInstance`** → **`type`** w `providers:` (`anthropic`, `google`, …). Pola **`params`** w body HTTP i fasad oficjalnych kontraktów są **wspólne** dla całego gatewaya; **efekt u vendora** zależy od adaptera powiązanego z aliasem. Pełna macierz: **`dictionary.md`** (sekcja „Mapowanie parametrów na providerów”).

| Typ providera (`providers.*.type`) | Adapter runtime                                                  | Przykładowe aliasy w repo       |
| ---------------------------------- | ---------------------------------------------------------------- | ------------------------------- |
| **`anthropic`**                    | `create-anthropic-provider.ts`                                   | `chat-default`, `claude-sonnet` (przy `anthropic-primary`) |
| **`google`**                       | `create-google-provider.ts`                                      | `gemini-flash` (przy `google-primary`)                  |
| **`openai`**                       | `create-openai-provider.ts` — **zawsze** Responses API (`create-openai-provider.core.ts`) | `gpt-cheap` (przy `openai` w przykładowym YAML repo) |
| **`openai-compatible`**            | `create-openai-compatible-provider-instance.ts` — **zawsze** Chat Completions | `ollama-local-chat` (przy `ollama-local`)          |

**OpenAI w projekcie:** istnieją **dwie ortogonalne warstwy** — fasada HTTP `/api/v1/openai` (oficjalny kształt kontraktu OpenAI API — Cursor i inne klienty) oraz **adapter runtime** `type: openai` / `openai-compatible` (wywołanie SDK po `baseUrlRef` + `apiKeyRef`). Fasada mapuje `temperature`, `top_p`, `stop`, penalties, `seed` na `params.*`; adapter runtime przekazuje je do SDK gdy alias wskazuje instancję OpenAI. Szczegóły adaptera: [`provider_openai_runtime.md`](provider_openai_runtime.md), [`spec/SPEC-PROVIDERS.md`](spec/SPEC-PROVIDERS.md).

#### Pola specyficzne dla OpenAI w YAML (`providers`)

| Pole | Typy | Znaczenie |
|------|------|-----------|
| `baseUrlRef` | `openai`, `openai-compatible` | **Wymagane** — nazwa zmiennej env z bazowym URL API (np. `OPENAI_BASE_URL`, `OLLAMA_BASE_URL`) |
| `apiSurface` | `openai` | **Zabronione** — `type: openai` zawsze używa Responses API (`GatewayConfigSchema` odrzuca pole) |
| `apiSurface` | `openai-compatible` | Opcjonalne: wyłącznie `chat-completions` lub pominięte (domyślnie Chat Completions) |

**Routing API (implementacja):** `create-openai-provider.core.ts` — `type: openai` → adapter `responses.adapter.ts`; `type: openai-compatible` → `chat-completions.adapter.ts`. Brak dynamicznego wyboru surface per model ani pola `apiSurface: auto` / `responses`.

**Klucz API:** dla typów OpenAI `apiKeyRef` jest opcjonalny przy starcie (pusty klucz dozwolony — np. lokalny Ollama). Gdy zmienna jest ustawiona, walidacja formatu odbywa się w CLI (`api-key-validation.util.ts`).

Przykład wpisu providera OpenAI:

```yaml
providers:
  openai:
    type: openai
    enabled: true
    apiKeyRef: OPENAI_API_KEY
    baseUrlRef: OPENAI_BASE_URL

  ollama-local:
    type: openai-compatible
    enabled: true
    apiKeyRef: OLLAMA_API_KEY
    baseUrlRef: OLLAMA_BASE_URL
```

W `.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OLLAMA_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

#### Reguły konfiguracji YAML (`policy.params`)

| Provider                      | `defaults` — parametry losowości                                                            | Uwaga operacyjna                                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anthropic**                 | Ustaw **`temperature` albo `topP` albo `topK`** w defaults (logicznie jeden tryb losowości) | Adapter wysyła do SDK **jeden** parametr losowości — priorytet: **`topK` > `topP` > `temperature`** (`resolveAnthropicSamplingParams`). Przykład repo: default `temperature: 0.4`, **bez** `topP` / `topK` w defaults. |
| **Google Gemini**             | Można **`temperature` i `topP` razem**                                                      | Przykład repo: `temperature: 0.4`, `topP: 0.95`.                                                                                                                                                                       |
| **OpenAI** (adapter `type: openai`) | Można **`temperature` i `topP` razem** (jak upstream) | Zawsze Responses API — `create-openai-provider.core.ts` |
| **OpenAI-compatible** | Jak Chat Completions upstream | Zawsze Chat Completions |

**Override z body (`params.topP` / `params.topK` itd.):** merge YAML ← body może ustawić wiele parametrów losowości w `ProviderCallOptions`, ale adapter Anthropic wysyła do SDK **tylko jeden** — priorytet **`topK` > `topP` > `temperature`**. Np. defaults `temperature` + body `topP` → do SDK trafi `top_p`, nie `temperature`.

**Pola akceptowane w API, ale bez efektu u vendora:** `frequencyPenalty`, `presencePenalty` — adaptery Anthropic/Google **nie przekazują** ich do SDK. `seed` — tylko **Google**. **`topK`** — **Anthropic** (`top_k`, priorytet nad `topP` / `temperature`) i **Google** (`topK`); tylko z body, bez YAML `defaults`. **`responseFormat`** — mapowane do SDK **Anthropic** (`output_config.format` z `json_schema`) i **Google** (`response_format` / `response_schema`); tylko z body (`params.responseFormat`), wymaga `type: json_object`; opcjonalny `jsonSchema`.

**Przykład multi-instance** (dwa konta Google, ten sam `type`):

```yaml
providers:
  google:
    type: google
    apiKeyRef: GOOGLE_API_KEY
    enabled: true
  google-office:
    type: google
    apiKeyRef: GOOGLE_OFFICE_API_KEY
    enabled: true

models:
  gemini-flash:
    providerInstance: google
    modelId: gemini-2.5-flash
    # ...
  gemini-flash-office:
    providerInstance: google-office
    modelId: gemini-2.5-flash
    # ...
```

W `.env`: osobne wartości dla `GOOGLE_API_KEY` i `GOOGLE_OFFICE_API_KEY`. Runtime tworzy **dwa** obiekty `AIProvider` (fabryka `createGoogleProvider` wywołana dwukrotnie).

Uwagi:

- `apiKeyRef` to **nazwa** zmiennej env, nie wartość.
- `masterKeyRef` oraz każde `gatewayKeyRef` w `clients` to **nazwy** zmiennych env z wartościami kluczy gateway — ustawiane w `.env` (szablon: `.env.example`).
- Aliasy pod `models` są publicznym API (`modelAlias`).
- **Mapowanie kluczy do runtime:** `configuration.ts` buduje mapę `providersByInstance` (typ + `apiKeyRef` + rozwiązany `apiKey` z env) dla **każdego** klucza w sekcji `providers:` YAML. W obiekcie konfiguracji Nest (`ConfigService`) jest dostępna pod kluczem **`providers`** (np. `configService.get('providers')['google-office']`). Bootstrap (`ProviderInstancesBootstrap`) tworzy osobny `AIProvider` per wpis z własnym kluczem API.
- **Wiele instancji tego samego `type`:** w `providers:` może być np. `google` i `google-office`, oba z `type: google`, każdy z **unikalnym** `apiKeyRef`. Walidacja Zod (`GatewayConfigSchema.providers.superRefine`) odrzuca **duplikat `apiKeyRef`**, nie duplikat `type`. Różne środowiska / konta API wyraża się osobnymi instancjami + zmiennymi env, nie współdzielonym kluczem per typ.
- **Spójność grafu `providers` ↔ `models` (fail-fast przy starcie):**
  - sekcja `models` **nie może być pusta**;
  - każdy wpis w `models` musi wskazywać **istniejący** klucz w `providers` (`providerInstance`);
  - każda instancja providera z **`enabled !== false`** (w praktyce w YAML ustaw **`enabled: true`** dla providerów używanych w runtime; pominięte `enabled` → po parsowaniu Zod domyślnie **`false`**, wtedy instancja jest wyłączona) musi mieć **co najmniej jeden** alias w `models` z tym samym `providerInstance`;
  - po filtrze `enabled` funkcja `buildEffectiveGatewayConfig` ponownie wymusza, że każdy **aktywny** provider ma ≥1 **aktywny** model (modele powiązane z providerem `enabled: false` są pomijane z ostrzeżeniem w logu).
  - Instancja z **`enabled: false`** **nie wymaga** wpisów w `models` (może pozostać w YAML jako wyłączona rezerwa).
- Polityki (`timeoutMs`, `retry`, `params`) są w pliku zdefiniowane. **`capabilities`**: `streaming` (wymagane dla SSE), opcjonalnie **`tools: true`** — bez tego flagi żądania z `tooling` / turami `tool` zwracają **`TOOLS_NOT_SUPPORTED`**; opcjonalnie **`thinking: true`** — wymagane, aby `params.thinkingEnabled` / `thinkingBudget` były dozwolone (mapowanie: `anthropic-thinking.mapper.ts`, adapter Google). **`policy.params`**: w YAML `defaults` (Zod) — `temperature`, `maxOutputTokens`, `topP`, `frequencyPenalty`, `presencePenalty`, `seed`, `thinkingEnabled`; w `allowOverrides` — powyższe plus `topK`, `stop`, `responseFormat`, `thinkingBudget`. Merge w `resolveProviderCallOptions`: defaults YAML ← body dla pól z pierwszej grupy; **`topK`**, **`stop`**, **`responseFormat`**, **`thinkingBudget`** — **tylko z body** (gdy w `allowOverrides`). **`retry.maxAttempts`** — maks. **5** (walidacja Zod). **Konfiguracja defaults zależy od typu providera** — sekcja „Parametry generacji a typ providera” powyżej. **`timeoutMs`** i **`retry`** — egzekwowane w **`ResilientExecutor`** (`src/chat/resilience/`; timeout → `AbortSignal` do adaptera SDK + `PROVIDER_TIMEOUT` / HTTP 504; Anthropic/OpenAI: request option `signal`, Google: `config.abortSignal`; retry tylko dla statusów z `onStatus`, domyślnie `[429, 500, 502, 503, 504]` z `RETRY_POLICY_DEFAULTS` w `src/common/retry-policy-defaults.ts`; budowa: `buildRetryPolicyFromResolved`). Brak wartości w YAML → domyślne `maxAttempts: 3`, `timeoutMs: 30000`. Fallback jednego hopu: `models[].fallback` + `assertNoFallbackCycle`.

## 3) Walidacja i fail-fast

**Orkiestracja:** `ConfigurationValidationService` (`src/config/configuration-validation.service.ts`) — plain class (bez Nest DI; bootstrap przed kontenerem). Fasada składa reguły z `env.validation.ts`, `provider-api-key.validation.ts`, `provider-base-url.validation.ts` (master key, sekrety providerów, format env). **Nie** ładuje YAML ani nie uruchamia Zod — to robią `gateway-config.schema.ts` / `config-validator.ts` / `configuration.ts`.

Gateway kończy start m.in. gdy:

- **`gateway.config.yaml`** nie istnieje lub nie przechodzi walidacji Zod (`GatewayConfigSchema` w `src/config/gateway-config.schema.ts` + `buildEffectiveGatewayConfig` w `src/config/configuration.ts`),
- w `providers` występują **dwa lub więcej** wpisy z tym samym **`apiKeyRef`** (unikalność referencji env per plik),
- sekcja **`models` jest pusta**,
- alias w `models` wskazuje **nieznany** `providerInstance`,
- **włączony** provider (`enabled !== false`) **nie ma** żadnego aliasu w `models` z tym `providerInstance`,
- po zastosowaniu flag `enabled` **nie ma żadnego aktywnego modelu** albo **aktywny** provider nie ma przypisanego aktywnego modelu,
- dla **aktywnego** providera brakuje niepustego env pod **`apiKeyRef`** z YAML (`[GatewayConfig] Missing API key for enabled provider instance…`) albo (typy OpenAI) brakuje poprawnego URL pod **`baseUrlRef`**,
- brakuje niepustego klucza **master** (`[GatewayKey] Missing master key.` — `assertMasterKeyPresent` w fasadzie),

| Warstwa                | Gdzie                                      | Przykładowe reguły                                                                                                                        |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Zod (surowy YAML)      | `GatewayConfigSchema`                      | duplikat `apiKeyRef`; puste `models`; model → provider; provider (aktywny) → ≥1 model; `fallback` istnieje, bez samoodwołania i pętli A↔B |
| Efektywna konfiguracja | `buildEffectiveGatewayConfig`              | filtr `enabled`; ≥1 aktywny model globalnie; aktywny provider → aktywny model; sekrety przez fasadę (`assertEnabledProviderSecretsPresent`) |
| Fasada walidacji       | `configuration-validation.service.ts`      | `validateEnvironment`; `assertMasterKeyPresent`; API keys + base URL (delegacja do `provider-*-validation.ts`)                            |

**Poza zakresem obecnej implementacji (plan — krok 5.6, część pozostała):** pełny katalog aliasów wszystkich modeli API Anthropic/Google oraz walidacja kompletności aliasów „zwyczajowych” względem ustalonej listy MVP.

### Skrypt diagnostyczny `npm run config:validate`

Skrypt (`scripts/validate-config.ts`) waliduje konfigurację **offline** (bez uruchamiania serwera HTTP) przez `validateGatewayConfig()` z `src/config/config-validator.ts`:

- walidacja YAML przez `GatewayConfigSchema` (Zod),
- walidacja reguł runtime przez `buildEffectiveGatewayConfig` (filtr `enabled` + sekrety providerów przez fasadę: `apiKeyRef` / `baseUrlRef`),
- walidacja wymogu klucza master (`assertMasterKeyPresent` w fasadzie; brak → błąd),
- ostrzeżenia (nie blokują) m.in. dla klientów z pustym env pod `gatewayKeyRef` i wyłączonych providerów.

Uruchomienie:

```bash
npm run config:validate
```

Opcje przez env:

- `CONFIG_PATH`: ścieżka do pliku YAML (domyślnie `gateway.config.yaml` w `process.cwd()`).

Zmienna `CONFIG_VALIDATE_STRICT` w `.env.example` jest zarezerwowana na przyszłe rozszerzenia CLI; obecnie skrypt npm nie odczytuje tej flagi — reguła kluczy providerów jest zawsze egzekwowana w `validateGatewayConfig()`.

Exit code:

- `0` gdy `errors.length === 0` (warnings są dozwolone),
- `1` gdy walidacja wykryje błąd.

Uwaga: skrypt próbuje doładować `.env` przez `dotenv` **jeśli** paczka jest zainstalowana; w CI zwykle env pochodzi z sekretów i `dotenv` nie jest wymagany.

### CLI a ładowanie konfiguracji

Runtime HTTP i CLI **nie używają tej samej ścieżki** ładowania configu:

| Aspekt                                   | Runtime (`ConfigModule` → `configuration.ts`)                  | CLI (`CliConfigLoaderService`)                                                                            |
| ---------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Entry point                              | `src/main.ts` → `AppModule`                                    | `bin/gateway-cli-wrapper.js` → `CliModule`                                                                |
| Wymaga `.env` przy starcie CLI           | tak (przy starcie serwera HTTP)                                | **nie** — CLI startuje bez `.env`                                                                         |
| Parsowanie YAML                          | `yaml.load` + `GatewayConfigSchema`                            | to samo (`loadRawConfig`)                                                                                 |
| Rozwiązywanie env                        | `buildEffectiveGatewayConfig()`, klucze master/provider/client | **pominięte** w `loadRawConfig`; opcjonalny raport braków w `loadWithEnvCheck()`                          |
| Pełna walidacja jak przy starcie serwera | przy każdym boot HTTP                                          | **`gateway config:init`** — na końcu wizarda; **`gateway config:validate`** (YAML + `validateEnvironment()`); **`npm run config:validate`** — YAML + reguły runtime (bez pełnego `validateEnvironment()`) |

#### Inicjalizacja konfiguracji (wizard)

```bash
npm run cli config:init
# lub: npx gateway config:init
# lub po npm link: gateway config:init
```

Wizard (`ConfigInitCommand`) zbiera dane interaktywnie (master key, providery, modele, klienci, serwer), generuje `gateway.config.yaml`, `.env`, `.env.example` oraz opcjonalnie pliki system prompt, a następnie uruchamia walidację końcową z pętlą retry. Stan niedokończonej sesji: `.gateway-wizard-state.json` (resume po ponownym uruchomieniu).

Po inicjalizacji konfigurację można rozszerzać bez ponownego wizarda: `gateway provider:add`, `model:add`, `client:add` itd. — **`CLI.md`**. Komendy mutujące robią backup `gateway.config.yaml` w katalogu `backup/` przed zapisem.

Szczegóły flow, resume i pełna lista komend: **`CLI.md`**. Architektura: `architektura.md`, `architektura_katalogi_pliki.md` (sekcja 2a).

## 4) Nadpisywanie parametrów per request

**DTO i `openapi.json`** przyjmują `modelAlias`, `messages` (ostatnie: **1–150** elementów, `content` do **3000** znaków na wiadomość), opcjonalne **`conversationId`** w formacie **`conv_<uuid>`** (regex w `ChatRequestDto`; w **response** zawsze echo lub nowe `conv_<uuid>`; w **request** włącza `gen_ai.conversation.id` w Sentry — `conversation_tracking.md`), opcjonalne zagnieżdżone **`params`** (w tym **`responseFormat`**: `{ type, jsonSchema? }`), opcjonalne **`metadata`** (`Record<string, string | number | boolean>` — propagacja do adaptera; Anthropic: `userId` → `metadata.user_id`). Fasady oficjalnych kontraktów dopuszczają do **15 000** wiadomości — patrz `integracje.md`. Treść wiadomości w spanach: `SENTRY_INCLUDE_PROMPTS=true`.

**Merge parametrów:** `resolveProviderCallOptions` (`src/chat/helpers/resolve-provider-call-options.ts`) bierze `policy.params.defaults` z YAML dla aliasu (pola: `temperature`, `maxOutputTokens`, `topP`, `frequencyPenalty`, `presencePenalty`, `seed`), nakłada body `params` tylko dla pól z **`allowOverrides`**, następnie **clamp** do **`bounds`**. Pola **`topK`**, **`stop`**, **`responseFormat`** pochodzą **wyłącznie z body** (brak odczytu z YAML `defaults`). Niedozwolone pole → HTTP **400** + `MODEL_NOT_ALLOWED`. Efektywne wartości trafiają do adapterów (`ProviderCallOptions`) i do klucza cache (`ResponseCacheService`).

**Provider docelowy:** to, które pola faktycznie trafiają do SDK, zależy od **`providerInstance`** aliasu (Anthropic / Google / w przyszłości OpenAI). Macierz wsparcia: sekcja „Parametry generacji a typ providera” powyżej oraz **`dictionary.md`**.

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
