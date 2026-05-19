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

**Klucze gateway (nagłówek `X-Gateway-Key`):**

- W **`gateway.config.yaml`**: pole **`masterKeyRef`** (nazwa zmiennej env dla klucza master, np. `MASTER_KEY`) oraz opcjonalna sekcja **`clients`** — każdy klient ma **`gatewayKeyRef`** wskazujący nazwę zmiennej env z kluczem tego klienta (np. `GATEWAY_KEY_WEBAPP`).
- Przy starcie **`buildGatewayKeyRuntime`** (`src/config/configuration.ts`) wczytuje wartość master z env, iteruje klientów i buduje **`allowList`**: master + wszystkie **niepuste** wartości kluczy klientów. Ta lista jest dostępna w aplikacji jako konfiguracja **`gatewayKey`** i jest używana przez **`GatewayKeyGuard`**.
- **Brak niepustego klucza master** → wyjątek przy ładowaniu konfiguracji (`[GatewayKey] Missing master key.`), proces się nie uruchomi.
- Endpointy czatu wymagają **`X-Gateway-Key`** na allowliście (`@GatewayKeyAndSmartRateLimit()`); **`GET /api/v1/health`** i **`GET /api/v1/health/ready`** nie.

### Cache odpowiedzi i Redis (opcjonalnie)

Zmienne są walidowane przy starcie klasą **`EnvironmentVariables`** w `src/config/env.validation.ts` (m.in. typy i wartości domyślne). Wartości używane w runtime składa też `configuration.ts` (`cache`, `redis` w obiekcie zwracanym przez `load`).

| Zmienna | Domyślnie | Znaczenie |
|---------|-----------|-----------|
| `CACHE_ENABLED` | `false` | Gdy **`true`**, cache jest **włączony** w konfiguracji; faktyczny backend wybiera `CACHE_BACKEND` (patrz niżej). Gdy `false`, w konfiguracji wymuszany jest backend **`noop`** — brak odczytu/zapisu cache. |
| `CACHE_BACKEND` | `noop` | Dozwolone wartości w walidatorze: `noop`, `redis`, `memory`, `other`. **W kodzie zarejestrowane są `noop` i `redis`.** Nieznany backend → ostrzeżenie w logu i fallback do **`noop`** (`CacheRegistryService.resolve`). |
| `CACHE_TTL` | `3600` | TTL wpisów cache w **sekundach** (liczba całkowita ≥ 1). |
| `CACHE_KEY_PREFIX` | `aigw:` | Prefiks kluczy zapisu odpowiedzi czatu (`ResponseCacheService`). |
| `REDIS_HOST` | `localhost` | Host Redis (gdy ładowany moduł Redis). |
| `REDIS_PORT` | `6379` | Port Redis. |
| `REDIS_PASSWORD` | *(pusty)* | Hasło; puste → połączenie bez hasła. |
| `REDIS_DB` | `0` | Numer bazy Redis. |
| `REDIS_KEY_PREFIX` | `aigw:` | Prefiks konfiguracyjny Redis (osobny od `CACHE_KEY_PREFIX`; przy braku `cache.keyPrefix` w serwisie cache używany jest fallback). |

**Ładowanie modułu Redis w Nest:** w `src/app.module.ts` stos Redis (`RedisCacheModule` wewnątrz `CacheModule.register`) jest importowany tylko gdy **`CACHE_ENABLED === 'true'`** oraz **`CACHE_BACKEND`** (po `toLowerCase()`) to **`redis`**. W przeciwnym razie działa wyłącznie backend **`noop`** (brak zależności od działającego Redis przy starcie).

**Zachowanie:** `ChatService.executeChat` przed wywołaniem providera sprawdza cache (`ResponseCacheService`); przy trafieniu zwracana jest zapisana odpowiedź z polami **`cached: true`** i **`cachedAt`** (ISO 8601). Streaming (`POST /api/v1/chat/stream`) **nie** korzysta z tej warstwy.

Szablon zmiennych: `.env.example`.

### Smart rate limiting i Throttler (opcjonalnie)

| Zmienna | Domyślnie | Znaczenie |
|---------|-----------|-----------|
| `RATE_LIMIT_ENABLED` | `true` | Rejestracja `ThrottlerModule` w `AppModule` (storage Redis gdy cache+redis gotowy). **Uwaga:** globalny `ThrottlerGuard` nie jest podpięty — limit HTTP opiera się na smart limiterze poniżej. |
| `RATE_LIMIT_TTL` | `60000` | Okno Throttler (ms). |
| `RATE_LIMIT_MAX` | `100` | Limit żądań w oknie Throttler. |
| `RATE_LIMIT_SMART_ENABLED` | `false` | Gdy **`true`**, `SmartRateLimitGuard` egzekwuje limity per `X-Gateway-Key` (wymaga gotowego Redis). |
| `RATE_LIMIT_RPS_PER_KEY` | `10` | Domyślny RPS (token bucket) gdy klient nie ma `rateLimit` w YAML. |
| `RATE_LIMIT_BURST_PER_KEY` | `20` | Domyślny burst. |
| `RATE_LIMIT_STREAMS_CONCURRENT` | `3` | Maks. równoległych streamów per klucz. |
| `RATE_LIMIT_COOLDOWN_AFTER_429` | `60` | Sekundy blokady per klucz+provider po 429 od upstream (`ChatService.setCooldown`). |

W **`gateway.config.yaml`** sekcja **`clients[].rateLimit`** nadpisuje `rps`, `burst`, `maxConcurrentStreams` dla danego klucza (przykład: `webapp` w repozytoryjnym pliku).

Gdy Redis niedostępny, `SmartRateLimiterService` **przepuszcza** żądania (graceful degradation). Kod błędu limitu gateway: **`RATE_LIMITED`** (HTTP 429).

### Observability (env)

| Zmienna | Znaczenie |
|---------|-----------|
| `LOG_LEVEL`, `LOG_ADAPTER` | Poziom i backend logów (`pino` / `console`) — `LoggingModule`. |
| `LOG_PRETTY` | Czytelny output Pino (dev). |
| `SENTRY_DSN`, `SENTRY_ENABLED`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` | Sentry (`src/instrument.ts`, opcjonalnie metrics/errors). |
| `ERROR_REPORTING_ADAPTER` | `sentry` \| `noop`. |
| `METRICS_BACKEND` | `sentry` \| `noop` — spany LLM w `MetricsService`. |
| `APP_VERSION` | Wersja w readiness. |

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
    name: Web Application
    type: webapp
    gatewayKeyRef: GATEWAY_KEY_WEBAPP

providers:
  anthropic-main:
    type: anthropic
    apiKeyRef: ANTHROPIC_API_KEY
  google-main:
    type: google
    apiKeyRef: GOOGLE_API_KEY

models:
  chat-default:
    providerInstance: anthropic-main
    modelId: claude-sonnet-4-5-20250929
    capabilities:
      streaming: true
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 2
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.7
          maxOutputTokens: 1024
        allowOverrides:
          - temperature
          - maxOutputTokens
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
```

Uwagi:

- `apiKeyRef` to **nazwa** zmiennej env, nie wartość.
- `masterKeyRef` oraz każde `gatewayKeyRef` w `clients` to **nazwy** zmiennych env z wartościami kluczy gateway — ustawiane w `.env` (szablon: `.env.example`).
- Aliasy pod `models` są publicznym API (`modelAlias`).
- **Mapowanie kluczy do adapterów:** `configuration.ts` buduje obiekt `providers` jako `Record<type, { apiKey }>` iterując wpisy w `gateway.config.providers` i ustawiając `providersByType[instance.type]`. Nazwy instancji (np. `anthropic-main`) mogą być dowolne pod warunkiem unikalnego `providerInstance` w modelach.
- **Ograniczenie: jedna instancja per typ providera.** W `providers` może wystąpić **co najwyżej jeden** wpis o danym `type` (np. tylko jeden `type: anthropic`). Walidacja Zod (`GatewayConfigSchema.providers.superRefine` w `src/config/configuration.ts`) **odrzuca start** z czytelnym komunikatem przy duplikacie (komunikat wskazuje zduplikowany typ i nazwy zderzających się instancji). Różnice między środowiskami (dev/staging/prod) wyraża się **wartością** zmiennej środowiskowej wskazanej przez `apiKeyRef`, a nie przez deklarowanie wielu instancji tego samego typu w YAML.
- Polityki (`timeoutMs`, `retry`, `params`) są w pliku zdefiniowane, ale **adaptery nie korzystają z nich w pełni** — część parametrów pochodzi ze stałych w kodzie adaptera lub wyłącznie z `policy.params.defaults` w `ChatService`; kierunek dopięcia: `dokumentacja_koncepcyjna.md`, `spec/SPEC-PROVIDERS.md`.

## 3) Walidacja i fail-fast

Gateway kończy start m.in. gdy:

- **`gateway.config.yaml`** nie istnieje lub nie przechodzi walidacji Zod,
- w `providers` występują **dwa lub więcej** wpisy o tym samym `type` (jedna instancja per typ — patrz pkt 2),
- w **production** nie ma co najmniej jednego klucza API (patrz wyżej).

Docelowo (spec): dodatkowe reguły — brak env wskazanego przez `apiKeyRef` dla używanej instancji, niespójny `providerInstance`, zduplikowane aliasy — część z tego jest częściowo pokryta przez schema; szczegóły rozwoju w planie.

### Skrypt diagnostyczny `npm run config:validate`

Wpis w `package.json` istnieje (`"config:validate": ""`), ale **komenda jest na razie pusta** — nie uruchamia walidacji. Docelowo: walidacja `gateway.config.yaml` + reguł env **bez** podnoszenia serwera HTTP, kod wyjścia ≠ 0 przy błędzie (CI) — opis w `dokumentacja_koncepcyjna.md` i `spec/SPEC-KONFIGURACJA.md` (NFR-3).

## 4) Nadpisywanie parametrów per request

**DTO i `openapi.json`** przyjmują wyłącznie `modelAlias` i `messages` (ostatnie: **1–50** elementów, `content` do **3000** znaków na wiadomość). Domyślne **temperature** / **maxOutputTokens** dla wywołania pochodzą z **`policy.params.defaults`** w YAML (użycie w `ChatService`). Opcjonalne **`params` w body** jest zaplanowane (**Faza 5**): allowlista, bounds, mapowanie na SDK.

Szczegóły: `dokumentacja_api.md`, `openapi.json`.

## 5) Profile środowiskowe (opcjonalnie)

W praktyce wygodne są osobne pliki, np.:

- `gateway.config.dev.yaml`
- `gateway.config.prod.yaml`

albo łączenie plików (bazowy + override). Obecna implementacja wczytuje **jeden** plik o stałej ścieżce `gateway.config.yaml` w `process.cwd()` — zmiana profili wymaga podmiany pliku lub rozwoju kodu.

## 6) Pliki system promptu (`src/config/system-prompt/`)

Przy starcie `configuration.ts` wczytuje treści używane do złożenia instrukcji systemowej dla providerów (pole `system` w porcie adapterów). Kolejność składania w runtime: **MASTER** → opcjonalnie **MAIN** → opcjonalnie warstwa **per alias modelu**, oddzielane podwójną newline (`\n\n`).

| Plik | Wymagany | Opis |
|------|----------|------|
| `MASTER_SYSTEM_PROMPT.md` | tak | Guardrails i obowiązkowa warstwa polityki; brak pliku lub treść pusta po obróbce → **fail-fast** przy starcie. |
| `MAIN_SYSTEM_PROMPT.md` | nie | Opcjonalna warstwa wdrożeniowa (np. styl, format); brak lub pusto → pomijana. |
| `models/<modelAlias>.md` | nie | Opcjonalna warstwa dla danego aliasu z `gateway.config.yaml` → `models`; nazwa pliku = dokładnie klucz aliasu (np. `chat-default.md`). Brak lub pusto → pomijana. |

Dla plików opcjonalnych komentarze HTML `<!-- ... -->` są usuwane przy ładowaniu — można umieścić w nich dokumentację bez wysyłania jej do modelu (`stripHtmlComments` w `configuration.ts`).

Powiązane: `dokumentacja_api.md`.
