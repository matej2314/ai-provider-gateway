# Architektura — AI Provider Gateway

## Cel dokumentu

Opisuje **docelową architekturę** mikroserwisu “LLM Gateway”: granice modułów, warstwy odpowiedzialności, integracje z providerami oraz założenia operacyjne (konfiguracja, bezpieczeństwo, observability).

## Widok logiczny

```mermaid
flowchart TB
  subgraph clients [Klienci]
    app[aplikacje — kontrakt gateway]
    cursor[Cursor — OpenAI API]
    claude[Claude Code — Anthropic API]
  end

  subgraph gw [AI Provider Gateway - NestJS]
    http[wejście HTTP: walidacja, requestId, logi]
    integrations[Integrations Module — fasady IDE]
    chat[Chat Module]
    cache[Cache Module — opcjonalny backend odpowiedzi]
    providers[Providers Module]
    health[Health Module]
    config[Config — Nest ConfigModule + src/config/]
  end

  subgraph external [Zewnętrzne systemy]
    anthropic[(Anthropic API)]
    google[(Google Gemini API)]
  end

  app --> http
  cursor --> integrations
  claude --> integrations
  http --> chat
  integrations --> chat
  chat --> cache
  chat --> providers
  http --> health
  http --> config
  providers --> anthropic
  providers --> google
```

## Moduły (bounded areas — rdzeń funkcjonalny)

| Moduł | Odpowiedzialność |
|------|------------------|
| **Chat** (`src/chat`) | Czat standardowy (`POST /api/v1/chat`) i streaming SSE (`POST /api/v1/chat/stream` — `ChatStreamController`). **`ChatService`**: cache, limity, `ResilientExecutor`, odpowiedź gateway. **`ChatProviderCallService`**: wywołania adapterów, metryki LLM, SSE `meta`/`delta`. Eksport **`ChatService`** i **`SmartRateLimitGuard`** dla fasad. System prompt z plików (`helpers/system-prompt.ts`); `messages[]` + opcjonalne `metadata` → port providerów (`helpers/provider-input.ts`). Cache tylko dla czatu standardowego (`ResponseCacheService`, `helpers/cache-policy.ts`). Odpowiedź: `toolCalls`, `finishReason`, `usageDetails`, `systemFingerprint`. |
| **Integrations** (`src/integrations`) | Równoległe fasady **OpenAI API** (`/api/v1/openai/…`) i **Anthropic Messages API** (`/api/v1/anthropic/…`) dla IDE — mapowanie HTTP na `ChatService` bez duplikacji logiki providerów. Osobne guardy auth (Bearer / `x-api-key`), lokalne filtry błędów w kształcie vendora. **Stan:** obie fasady wdrożone (`integracje.md`). |
| **Cache** (`src/cache`) | Globalny moduł dynamiczny: rejestr backendów (`noop` zawsze, `redis` warunkowo), `ResponseCacheService` — cache wyłącznie dla **`POST /api/v1/chat`** (klucz m.in. z `modelAlias`, treści wiadomości i sygnatury warstw system promptu). Konfiguracja env: `docs/konfiguracja.md`. |
| **Providers** (`src/providers`) | Fabryki SDK (`factories/`), bootstrap instancji (`ProviderInstancesBootstrap`), rejestr po **`providerInstance`** (`ProviderRegistryService`). Mapery tool calling: `anthropic-tools.mapper.ts`, `google-tools.mapper.ts`. Ukrywa SDK i szczegóły HTTP providerów. |
| **Config** (`src/config` + `ConfigModule.forRoot` w `AppModule`) | Walidacja env + konfiguracja aplikacji (w tym ścieżki do plików konfiguracyjnych modeli/polityk). Brak osobnego Nest feature module — loader `configuration.ts` w `ConfigModule`. Fail‑fast przy starcie. |
| **Health** (`src/health`) | Liveness (`GET /api/v1/health`) i readiness (`GET /api/v1/health/ready` — `checks.config`, `checks.cache`). Walidacja konfiguracji przy **starcie** procesu. `checks.cache` dotyczy backendu **cache odpowiedzi** (`noop`/`redis`), nie osobnego probe smart rate limit (limitery używają tego samego `RedisConnectionService` gdy Redis jest załadowany — `RateLimitModule` → `RedisCacheModule`). |
| **Rate limit** (`src/rate-limit`) | Jedyna warstwa limitów gateway: smart limiting per `X-Gateway-Key` (Redis) — token bucket (RPS/burst), równoległe streamy (`SmartRateLimitGuard`, `SmartRateLimiterService`); cooldown po 429 od providera w **`ChatService.executeChat`**. Limity: opcjonalnie `clients[].rateLimit` w YAML, inaczej env; przełącznik `RATE_LIMIT_SMART_ENABLED`. Bez `@nestjs/throttler`. |
| **Logging / Metrics** | Structured logging (Pino), opcjonalnie Sentry (błędy + spany LLM). |
| **Swagger / OpenAPI** (`src/swagger`) | Jeden dokument OpenAPI 3.1 dla **natywnego czatu**, **health** i **fasad IDE** (OpenAI + Anthropic). Dekoratory `@Api*` na wszystkich kontrolerach HTTP; `swagger.setup.ts` rejestruje `extraModels` i trzy `securitySchemes` (`GatewayKeyAuth`, `BearerAuth`, `ApiKeyAuth`). UI: `/api/v1/api-docs`, JSON: `/api/v1/swagger.json`; eksport: `npm run openapi:export` → `openapi.json`. |
| **CLI** (`src/cli`, `bin/`) | Narzędzie wiersza poleceń dla konfiguracji i operacji developerskich. **Osobny entry point** (`bin/gateway-cli-wrapper.js` → `CommandFactory.run(CliModule)`), **bez** importu `ConfigModule`. Reużywa schematy Zod z `src/config/`, ale ładuje YAML bez rozwiązywania env (`CliConfigLoaderService`). **Wdrożone:** wizard `config:init`, `config:validate` / `config:show`, CRUD providerów (multi-instance), modeli i klientów, `provider:test`, `key:generate`. Szczegóły: `CLI.md`, `architektura-katalogi-pliki.md` (sekcja 2a). |

## CLI — izolacja od runtime HTTP

CLI i serwis HTTP współdzielą repozytorium, ale **nie ten sam bootstrap**:

```mermaid
flowchart LR
  subgraph cliEntry [CLI]
    wrapper[bin/gateway-cli-wrapper.js]
    cliMod[CliModule]
    loader[CliConfigLoaderService]
  end

  subgraph httpEntry [HTTP app]
    main[src/main.ts]
    appMod[AppModule + ConfigModule]
    cfg[configuration.ts]
  end

  configFiles[gateway.config.yaml + .env]
  schemas[src/config — gateway-config.schema.ts]

  wrapper --> cliMod
  cliMod --> loader
  loader --> schemas
  loader -.->|read YAML only| configFiles

  main --> appMod
  appMod --> cfg
  cfg --> schemas
  cfg -->|buildEffectiveGatewayConfig + env| configFiles
```

Zasady:

- **CLI nie może wymagać `ConfigModule`** — tworzy pliki, których runtime potrzebuje przy starcie (deadlock).
- **CLI nie wymaga build** — wrapper używa `ts-node`, gdy brak `dist/bin/gateway-cli.js`.
- **Dozwolone importy:** typy, schematy, `validateGatewayConfig()` z `src/config/`; **zabronione:** modyfikacja logiki runtime przez warstwę CLI.
- **Walidacja:** wizard może generować niedokończony config; pełna walidacja (identyczna jak przy starcie aplikacji) — na końcu `config:init` (`validateGatewayConfig()` + interaktywna pętla retry).

Uruchomienie: `npm run cli`, `npx gateway`, opcjonalnie `npm link` → bin **`gateway`** z `package.json`.

## Warstwy wewnątrz modułów (konwencja NestJS)

1. **Controller** — mapowanie HTTP, statusy, nagłówki; brak logiki biznesowej i brak bezpośrednich wywołań SDK providerów. Kontrolery fasad (`src/integrations/*/controllers/`) delegują wyłącznie do mapperów + `ChatService`. Limit rozmiaru body JSON: **`1mb`** (`express.json` w `src/setup.app.ts`); globalny prefiks **`/api/v1`** — `API_GLOBAL_PREFIX` w tym samym pliku.
2. **Service (use case)** — **`ChatService`**: orkiestracja (cache, rate limit, `ResilientExecutor`, envelope odpowiedzi). **`ChatProviderCallService`**: pojedyncze wywołanie providera (`completeOnce` / `streamOnce`), `resolveProviderCallOptions`, metryki.
3. **Providers (fabryki + rejestr)** — tłumaczenie kontraktu gateway ↔ kontrakt SDK providera; jedna fabryka per **typ**, wiele instancji runtime per wpis YAML; obsługa błędów specyficznych dla SDK.
4. **DTO + walidacja** — walidacja wejścia i konfiguracji jako brzeg systemu.

### System prompt i wiadomości do adaptera

Kontrakt HTTP **nie** przyjmuje roli `system` w `messages[]` (walidacja DTO). Treść systemowa dla LLM jest **polityką gatewaya**: przy starcie wczytywane są pliki z `src/config/system-prompt/`, a w runtime składane są warstwy (`composeSystemPrompt` w `src/chat/helpers/system-prompt.ts`):

- **MASTER** — wymagany plik `MASTER_SYSTEM_PROMPT.md`,
- **MAIN** — opcjonalny `MAIN_SYSTEM_PROMPT.md`,
- **per model** — opcjonalny `models/<modelAlias>.md` dla aliasu z `gateway.config.yaml`.

Łączenie sekcji: podwójna nowa linia (`\n\n`). Wynik trafia do portu providerów jako `ProviderChatInput.system`. Tablica `messages[]` w żądaniu zawiera **`user`**, **`assistant`** i **`tool`** (oraz opcjonalne `toolCalls` na turze assistenta) i jest mapowana na `ProviderChatTurn[]`. Opcjonalne **`tooling`** w body dostarcza definicje narzędzi do adaptera (`buildProviderInputForAlias`).

W warstwie fabryki providera `system` z portu jest mapowany na natywne pole SDK:

- **Anthropic** (`@anthropic-ai/sdk`) — `messages.create({ system })`.
- **Google Gemini** (`@google/genai` 1.52+) — `config.systemInstruction` przekazywane do `ai.models.generateContent({ config })` / stream. Fabryka mapuje rolę `assistant` na `model` (wymóg SDK Gemini). Szczegóły mapowania: `spec/SPEC-PROVIDERS.md`.

Szerszy kontekst warstw promptu: `konfiguracja.md`, `spec/SPEC-KONFIGURACJA.md` (tam, gdzie dotyczy plików promptu).

## Konfiguracja i sekrety

- Sekrety (klucze providerów) **wyłącznie** w env (`.env` lokalnie, w infrastrukturze użytkownika: menedżer sekretów).
- Przy starcie w **`NODE_ENV=production`** walidowane jest, że ustawiony jest **co najmniej jeden** klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`env.validation.ts`).
- Pliki konfiguracyjne opisują **modele, aliasy, limity i polityki** (bez wartości sekretów).
- Gateway uruchamia się w trybie “plug&play”: jeśli konfiguracja jest błędna → proces kończy się na starcie z czytelną informacją.
- **Multi-instance — wiele wpisów z tym samym `type`.** W `providers:` może być np. `google` i `google-office` (oba `type: google`), każdy z **unikalnym** `apiKeyRef`. Walidacja Zod odrzuca duplikat `apiKeyRef`, nie duplikat `type`. Przy starcie `ProviderInstancesBootstrap` tworzy osobny `AIProvider` (osobny klient SDK) per wpis YAML; `ProviderRegistryService.resolve()` wybiera instancję po **`models[].providerInstance`**. Szczegóły: `spec/SPEC-PROVIDERS.md`, `dictionary.md`.
- **Spójność `providers` ↔ `models`.** Przy starcie wymuszany jest dwukierunkowy graf konfiguracji: niepuste `models`, każdy alias → istniejący `providerInstance`, każdy **włączony** provider → co najmniej jeden alias (Zod + `buildEffectiveGatewayConfig`). Szczegóły i wyjątki (`enabled: false`): `konfiguracja.md`, `spec/SPEC-KONFIGURACJA.md` (F-3b, F-3c). Pierwsza konfiguracja: wizard **`config:init`** (`CLI.md`).

Szczegóły: `konfiguracja.md`.

## Bezpieczeństwo (przegląd)

- Gateway nie jest “open proxy”: endpointy providerów są zaszyte w fabrykach SDK (`src/providers/factories/`).
- **Dwa poziomy kluczy:** klient (IDE / aplikacja → allowlista gateway) vs provider (`.env` → SDK). Fasady używają tej samej allowlisty co `X-Gateway-Key`, ale innego nagłówka HTTP (`integracje.md`).
- Brak logowania sekretów: klucze i wrażliwe nagłówki są redagowane.
- Ustandaryzowane błędy nie zawierają surowych treści wyjątków SDK na produkcji (natywne API: `ErrorEnvelope`; fasady: format vendora).

Szczegóły: `architektura_api.md` + `anty-patterny.md` + `integracje.md`.

## Observability

- **Request ID**: `RequestIdMiddleware` — nagłówek żądania `x-request-id` (echo) lub `req_<uuid>`; to samo ID w body (`requestId`), envelope błędów, logach oraz **nagłówku odpowiedzi** `x-request-id`.
- **Logging**: `LoggingModule` (domyślnie Pino); opcjonalnie raportowanie błędów do Sentry.
- **Metryki LLM**: `MetricsService` + backend Sentry lub noop. **`conversationId` w request** grupuje spany (`gen_ai.conversation.id`); bez niego — pojedynczy span. Response zawsze zwraca ID sesji. Pełna treść wątku w Sentry wymaga pełnego `messages[]` od klienta — `docs/conversation-tracking.md`.
- **Graceful shutdown**: `SIGTERM` / `SIGINT` / `uncaughtException` / `unhandledRejection` w `main.ts` (`app.close()`).
- **OpenAPI**: dekoratory `@Api*` na kontrolerach (`ChatController`, `ChatStreamController`, `HealthController`, kontrolery fasad OpenAI/Anthropic) i DTO; wspólne dekoratory w `src/common/decorators/`: `ApiGatewayChatErrorResponses`, `ApiOpenAiErrorResponses`, `ApiAnthropicErrorResponses`, `ApiRequestIdHeader`.

## Testy

- **Jednostkowe:** `src/**/*.spec.ts` — logika czatu, mapery integracji, cache, rate limit, guardy, `ResilientExecutor`, health; mocki w `src/common/mocks/`. Uruchomienie: `npm test` (liczniki: [`testy.md`](testy.md)).
- **E2E HTTP:** `test/e2e/` — pełny `AppModule` z override mocków (`createE2eApp`); scenariusze kontraktu dla natywnego czatu (w tym cache i stream), fasad OpenAI/Anthropic (w tym tooling i thinking) bez realnych kluczy API i Redis. Uruchomienie: `npm run test:e2e`; `npm run test:all` łączy oba poziomy — szczegóły i liczniki: [`testy.md`](testy.md).
- Szczegóły struktury, helperów i ograniczeń: **`testy.md`**.

## Struktura repo (orientacyjnie)

Aktualna struktura katalogów źródłowych znajduje się w `README.md` repo oraz w `src/`.