# Testy — AI Provider Gateway

Wersja dokumentu: **2.3** (zsynchronizowana z `package.json`, `test/` i `src/**/*.spec.ts`).

## Przegląd

| Warstwa                             | Lokalizacja                                           | Runner                                                | Skrypt npm                 |
| ----------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | -------------------------- |
| **Jednostkowe (runtime)**           | `src/**/*.spec.ts` (obok modułów; **bez** `src/cli/`) | Jest (`rootDir: src`, `testPathIgnorePatterns: cli/`) | `npm test`                 |
| **Jednostkowe (CLI)**               | `src/cli/**/*.spec.ts`                                | Jest (`test/jest-cli.json`)                           | `npm run test:cli`         |
| **E2E (HTTP, mocki)**               | `test/e2e/*.e2e-spec.ts`                              | Jest (`test/jest-e2e.json`)                           | `npm run test:e2e`         |
| **Security (HTTP, mocki)**          | `test/security/*.security-spec.ts`                    | Jest (`test/jest-security.json`)                      | `npm run test:security`    |
| **Integracyjne (live SDK + Redis)** | `test/integration/*.integration-spec.ts`              | Jest (`test/jest-integration.json`)                   | `npm run test:integration` |
| **Runtime + E2E**                   | —                                                     | `npm test` + `npm run test:e2e`                       | `npm run test:all`         |

**Liczniki testów (z ostatniego uruchomienia):**

| Skrypt                    | Zestawy | Przypadki |
| ------------------------- | ------- | --------- |
| `npm test`                | 92      | 1248      |
| `npm run test:cli`        | 12      | 62        |
| `npm run test:e2e`        | 10      | 105       |
| `npm run test:security`   | 5       | 51        |

Integracyjne wymagają Docker (Redis) i `.env.test` — patrz `test/integration/README.md`.

Dodatkowe skrypty z `package.json`:

- `npm run test:watch` — jednostkowe runtime w trybie watch
- `npm run test:cli:watch` — jednostkowe CLI w trybie watch
- `npm run test:cov` — pokrycie kodu runtime (`coverage/`; CLI wyłączone z `collectCoverageFrom`)
- `npm run test:debug` — debug jednostkowych runtime (Node inspect)
- `npm run test:security:watch` — security w trybie watch (`maxWorkers: 1`)
- `npm run test:security:ci` — security z `--ci` i pokryciem (`coverage-security/`)
- `npm run test:integration:redis:up` / `:down` — kontener Redis testowy (port **6380**, DB **15**)
- `npm run test:integration:semantic` — integracja wektorowa na Redis Stack (port **6381**); start/stop `docker-compose.redis-stack.yml`; fałszywy embedding (bez Ollamy)
- `npm run test:integration:semantic:redis:up` / `:down` — tylko kontener Redis Stack pod testy semantic
- `npm run deploy:production` — `test:security` + `docker:build` + `docker:up:full`

Testy **jednostkowe, E2E i security nie wymagają** uruchomionego serwera HTTP, Redis ani kluczy API providerów — E2E i security bootstrapują aplikację NestJS w procesie testowym z mockami infrastruktury.

## Testy jednostkowe — runtime (`src/`, bez CLI)

Konfiguracja: sekcja `"jest"` w `package.json` (`testRegex: .*\.spec\.ts$`, `rootDir: src`, `testPathIgnorePatterns: ["<rootDir>/cli/"]`).

### Obszary pokrycia

| Moduł / obszar                   | Przykładowe pliki                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Czat**                         | `chat.service.spec.ts`, `chat.controller.spec.ts`, `chat-stream.controller.spec.ts`, `services/chat-cache-pipeline.service.spec.ts`, `chat-validation.service.spec.ts`, `chat-error-handler.service.spec.ts`, `chat-provider-call.service.spec.ts`, `chat-response-builder.service.spec.ts`, `validation/chat-ingress.validator.spec.ts`, `helpers/*.spec.ts` (m.in. `map-provider-finish-reason`, `provider-input`, `generation-warnings`, `cache-policy`, `tooling-request`, `retry-policy`), `sse/sse.serializer.spec.ts` |
| **Models**                       | `models/controllers/models.controller.spec.ts`, `models/services/gateway-models-catalog.service.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Config**                       | `config-validator.spec.ts`, `configuration-validation.service.spec.ts`, `provider-api-key.validation.spec.ts`, `provider-base-url.validation.spec.ts`, `provider-types.openai.spec.ts`                                                                                                                                                                                                                                                                                                                                    |
| **Providery**                    | `provider-registry.service.spec.ts`, `factories/create-*-provider*.spec.ts`, `openai/**/*.spec.ts` (adapters `chat-completions` / `responses`, mappers, `openai-api-surface.models.ts`, `create-openai-provider.core.spec.ts`), `anthropic/anthropic-*.mapper.spec.ts`, `google/google-tools.mapper.spec.ts`                                                                                                                                                                                                              |
| **Cache (exact)**                | `cache-registry.service.spec.ts`, `response-cache.service.spec.ts`, `should-include-redis-stack.spec.ts`, adaptery `noop` / `redis`                                                                                                                                                                                                                                                                                                                                                                                       |
| **Cache (semantyczny — Faza 2)** | `src/cache/semantic/**/*.spec.ts` — fałszywy `EmbeddingBackend` (stały wektor) + fałszywy `VectorStore`; scenariusze: próg podobieństwa 0.85, pominięcie tooling / `unknown` clientId / brak ostatniego usera / **historii wieloturowej**, ponowne użycie wektora przy SET, brak retry `embed` gdy lookup już go wołał, pierwszy `embed` przy zapisie gdy nie był wołany, filtr partycji alias+klient+`systemSignature`+`callParams` (miss przy innych params lub sygnaturze promptu), fail-open przy błędzie embeddingu, klucz exact z `clientId` (regresja izolacji) |
| **Rate limit**                   | `smart-rate-limiter.service.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Guardy**                       | `gateway-key.guard.spec.ts`, `openai-bearer-auth.guard.spec.ts`, `anthropic-api-key.guard.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Fasady** (`src/integrations/`) | kontrolery fasad, filtry błędów, mapery modeli (`openai-models.mapper`, `anthropic-models.mapper`), mapery czatu (w tym `anthropic-stop-reason`, `anthropic-usage.mapper`)                                                                                                                                                                                                                                                                                                                                                |
| **Odporność** (`src/chat/resilience/`) | `resilient-executor.spec.ts`, `fallback-chain.spec.ts`, `is-retryable-http-error.spec.ts`; polityka: `helpers/retry-policy.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                  |
| **Błędy**                        | `provider-error.mapper.spec.ts`, `provider-error-mapper.helpers.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Health / logging / observability** | `health.*.spec.ts`, `logging.service.spec.ts`, `observability/app-metrics/*.spec.ts`, `observability/ai-metrics/*.spec.ts`, `pre-metrics-scrape.registry.spec.ts` |
| **Wspólne**                      | `common/types/branded.spec.ts` (brand utilities — target 100% coverage), `readGatewayKeyHeader.spec.ts` |
| Mocki współdzielone          | `src/common/mocks/` — `createMockContext.ts`, `createTestGatewayConfig.ts`, `createMockConfigService.ts`, `createMockResilientExecutor.ts`, `test-constants.ts` (branded types w fixture'ach) |

Współdzielone stałe E2E/integracyjne z branded types: `test/e2e/helpers/e2e-constants.ts`, `e2e-gateway-config.ts`, `e2e-provider-registry.ts`; `test/integration/helpers/integration-constants.ts`, `integration-gateway-config.ts`.

## Testy jednostkowe — CLI (`src/cli/`)

Konfiguracja: `test/jest-cli.json` — `roots: ["<rootDir>/../src/cli"]`.

| Obszar               | Przykładowe pliki                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config / persistence | `services/config-persistence.service.spec.ts`, `services/cli-config-loader.service.spec.ts`, `services/file-manager.service.spec.ts`                                                                                                                                                              |
| Utils                | `utils/default-model-policy.util.spec.ts`, `utils/effective-config-preview.util.spec.ts`, `utils/client-rate-limit.util.spec.ts`, `utils/api-key-validation.util.spec.ts`, `utils/provider-base-url.cli.util.spec.ts`, `utils/provider-id.util.spec.ts` |
| Schemas / klucze     | `schemas/wizard-state.schema.spec.ts`, `services/key-generator.service.spec.ts`                                                                                                                                                                                                                   |

## Testy E2E (`test/e2e/`)

Konfiguracja: `test/jest-e2e.json` — `testRegex: .e2e-spec.ts$`, `setupFiles: e2e/setup/e2e-env.setup.ts` (domyślnie `SEMANTIC_CACHE_ENABLED=false`), `setupFilesAfterEnv: e2e/setup/jest-e2e.setup.ts`.

### Pliki spec

Konwencja nazw: `*-facade*.e2e-spec.ts` = test **fasady HTTP** (`src/integrations/`), nie adaptera SDK (`src/providers/`). Adaptery runtime są mockowane przez `e2e-provider-registry.ts`.

| Plik                                        | Zakres                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `gateway-chat.e2e-spec.ts`                  | Natywny czat: `POST /api/v1/chat`, `POST /api/v1/chat/stream`, generation warnings                                            |
| `gateway-chat-stream-scenarios.e2e-spec.ts` | SSE: nagłówki, zdarzenia, fallback w streamie, limity równoległych streamów, `warnings` w `done`                              |
| `gateway-chat-cache.e2e-spec.ts`            | Exact cache odpowiedzi `POST /api/v1/chat` (mock backendu cache), persystencja `warnings`                                           |
| `gateway-chat-semantic-cache.e2e-spec.ts`   | Ścieżka HTTP semantic cache: fałszywy embedding + in-memory vector store; miss→hit; pominięcie tooling; negatywne: inne params / wielotura → brak semantic hit (bez Redis Stack / Ollamy) |
| `native-models.e2e-spec.ts`                 | Natywny katalog: `GET /models`, auth, `ErrorEnvelope` 404, parity aliasów z fasadami                                          |
| `facade-models.e2e-spec.ts`                 | Katalogi modeli fasad OpenAI i Anthropic (`GET /openai/models`, `GET /anthropic/models`) — auth, kształt listy, wiele aliasów |
| `openai-facade.e2e-spec.ts`                 | Fasada OpenAI: auth, kształt odpowiedzi, streaming                                                                            |
| `openai-facade-extended.e2e-spec.ts`        | Fasada OpenAI: tool calling, rozszerzone scenariusze kontraktu                                                                |
| `gateway-chat-openai.e2e-spec.ts`           | Natywny czat z mockiem `providerType: openai`: warnings, walidacja surface/thinking, streaming                                |
| `anthropic-facade.e2e-spec.ts`              | Fasada Anthropic: auth, kształt odpowiedzi, streaming                                                                         |
| `anthropic-facade-extended.e2e-spec.ts`     | Fasada Anthropic: thinking mode, tool calling                                                                                 |

### Infrastruktura E2E

**`helpers/create-e2e-app.ts`** — `createE2eApp()` / `withE2eApp()`:

- `Test.createTestingModule({ imports: [AppModule] })` + `setupApp(app)`.
- Opcja **`applyHelmet: true`** — `helmet()` przed `setupApp()` (ta sama kolejność co `src/main.ts`; używana w testach security nagłówków).
- **Override'y** (bez Redis / bez realnych SDK): `ConfigService`, `ProviderRegistryService`, `RedisConnectionService` (mock z `ping()` i `isReady()` — wymagane przez warm-up health przy starcie), `ProviderInstancesBootstrap`, `LoggingService`; opcjonalnie `SmartRateLimiterService`.

**`helpers/e2e-provider-registry.ts`** — mock `AIProvider` per alias; wariant fallback; wsparcie `providerType: openai`.

**`setup/jest-e2e.setup.ts`** — mock `uuid`, podmiana `src/config/configuration` na `mock-configuration.ts`.

### Kody HTTP w E2E (201 vs 200)

| Ścieżka                                | Tryb           | Oczekiwany sukces w testach |
| -------------------------------------- | -------------- | --------------------------- |
| `GET /api/v1/models`                   | JSON           | **200**                     |
| `GET /api/v1/models/:modelAlias`       | JSON           | **200**                     |
| `GET /api/v1/openai/models`            | JSON           | **200**                     |
| `GET /api/v1/anthropic/models`         | JSON           | **200**                     |
| `POST /api/v1/chat`                    | JSON           | **201**                     |
| `POST /api/v1/chat/stream`             | SSE            | **200**                     |
| `POST /api/v1/openai/chat/completions` | JSON           | **201**                     |
| `POST /api/v1/openai/chat/completions` | `stream: true` | **200**                     |
| `POST /api/v1/anthropic/messages`      | JSON           | **201**                     |
| `POST /api/v1/anthropic/messages`      | `stream: true` | **200**                     |

## Testy integracyjne (`test/integration/`)

Osobny runner — **nie** wchodzi w `npm test`, `npm run test:cli` ani `npm run test:all`.

| Wymaganie | Opis                                                                                                                                                                                                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker    | `npm run test:integration:redis:up` — Redis na hoście **6380**, DB **15**                                                                                                                                                                                                                                                                                      |
| Env       | `.env.test` (wzorzec: `.env.test.example`) — `INTEGRATION_ANTHROPIC_API_KEY` / `INTEGRATION_GOOGLE_API_KEY`, opcjonalnie `INTEGRATION_OPENAI_API_KEY` + `INTEGRATION_OPENAI_BASE_URL`, `INTEGRATION_OLLAMA_API_KEY` + `INTEGRATION_OLLAMA_BASE_URL`, `INTEGRATION_DEEPSEEK_API_KEY` + `INTEGRATION_DEEPSEEK_BASE_URL`, `MASTER_KEY`, `INTEGRATION_GATEWAY_KEY` |

**Co jest prawdziwe vs mock** (skrót):

| Prawdziwe                                      | Mock                                                                                  |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| Redis, fabryki providerów, registry, bootstrap | Graf gateway (`integration-mock-configuration.ts`), `ConfigService`, `LoggingService` |

Pliki spec (`test/integration/*.integration-spec.ts`, **15** zestawów):

| Plik                                                     | Zakres                            |
| -------------------------------------------------------- | --------------------------------- |
| `gateway-chat-live.integration-spec.ts`                  | Natywny czat (live SDK)           |
| `gateway-chat-stream-live.integration-spec.ts`           | Natywny SSE (live)                |
| `gateway-chat-alias.integration-spec.ts`                 | Routing aliasów                   |
| `gateway-chat-cache-redis.integration-spec.ts`           | Cache + Redis                     |
| `gateway-chat-cache-tooling.integration-spec.ts`         | Cache + tooling                   |
| `gateway-semantic-cache.integration-spec.ts`             | Semantic KNN na Redis Stack (port **6381**; `npm run test:integration:semantic`); m.in. miss przy innych params / wieloturze |
| `gateway-chat-openai-live.integration-spec.ts`           | Natywny czat z adapterem OpenAI   |
| `gateway-chat-openai-stream-live.integration-spec.ts`    | Natywny stream z adapterem OpenAI |
| `gateway-openai-compatible.integration-spec.ts`          | Adapter openai-compatible (live)  |
| `openai-provider-harness-smoke.integration-spec.ts`      | Smoke harness providera OpenAI    |
| `openai-facade-live.integration-spec.ts`                 | Fasada OpenAI (backend Anthropic) |
| `openai-facade-stream-live.integration-spec.ts`          | Fasada OpenAI stream              |
| `openai-facade-openai-provider-live.integration-spec.ts` | Fasada OpenAI + adapter OpenAI    |
| `anthropic-facade-live.integration-spec.ts`              | Fasada Anthropic (JSON)           |
| `anthropic-facade-stream-live.integration-spec.ts`       | Fasada Anthropic stream           |
| `harness-smoke.integration-spec.ts`                      | Smoke harness (ogólny)            |

Szczegóły setupu: **`test/integration/README.md`**.

**Integracja semantic cache (Faza 4):** testy wektorowe działają na Redis Stack (`test/integration/docker-compose.redis-stack.yml`, port hosta **6381**), **nie** na alpine Redis z `test/integration/docker-compose.redis.yml`. Runner: `npm run test:integration:semantic` (pre/post startuje/zatrzymuje kontener Stack). Serwis embeddingów (Ollama) jest **zaślepiony** fałszywym stałym wektorem — w CI nie jest potrzebna żywa Ollama. Spec jest pomijany, gdy brak `SEMANTIC_CACHE_ENABLED=true` i `REDIS_PORT=6381`. Testy KV exact cache i rate limit nadal używają alpine Redis.

## Testy security (`test/security/`)

Konfiguracja: `test/jest-security.json` — `testMatch: **/*.security-spec.ts`, `roots: test/security`, `maxWorkers: 1`, `setupFilesAfterEnv: test/e2e/setup/jest-e2e.setup.ts`, pokrycie → `coverage-security/`.

Warstwa weryfikuje **hardening HTTP** (auth, nagłówki, disclosure, rate limit, odporność na złe wejście) bez live SDK i Redis. Bootstrap przez **`helpers/create-security-app.ts`** — cienki wrapper nad `createE2eApp` / `withE2eApp` z tymi samymi override'ami mocków.

| Plik | Zakres |
| ---- | ------ |
| `auth-bypass.security-spec.ts` | Próby obejścia auth: injekcja tablic w nagłówkach, warianty wielkości liter, trim, puste wartości, Bearer/`x-api-key` na fasadach, health bez klucza |
| `helmet-headers.security-spec.ts` | Nagłówki Helmet (`x-frame-options`, `x-content-type-options`, HSTS), brak `x-powered-by`, brak CSP/COEP (wyłączone w `main.ts`), spójność na health/chat/404/metrics |
| `information-disclosure.security-spec.ts` | Brak wycieku sekretów/stack trace w body i nagłówkach błędów (natywny + fasady); helper `scan-response-for-secrets.ts` |
| `rate-limit-bypass.security-spec.ts` | Smart rate limit: burst, równoległe streamy, izolacja kluczy klientów, health poza limitem |
| `fuzzing-inputs.security-spec.ts` | Property-based (`fast-check`): losowe `modelAlias`, `messages`, pola JSON — brak **5xx**, brak disclosure przy **4xx** |

**Czego security nie obejmują:** live Redis, realne SDK providerów, pełny łańcuch `configuration.ts` z dysku (jak E2E — mock w setup).

## Czego testy E2E nie obejmują

- Rzeczywiste wywołania API Anthropic / Google / OpenAI (SDK mockowane).
- **Realny** Redis (connection mock; cache E2E używa mock backendu).
- Pełny łańcuch `configuration.ts` z plikiem YAML na dysku (mock w setup).
- Health endpoints — pokrycie jednostkowe w `src/health/`.
- Natywny extended thinking z **live** OpenAI API (pokrycie: jednostkowe `responses.adapter.spec.ts`, mock E2E `gateway-chat-openai.e2e-spec.ts`, integracyjne `*openai*integration-spec.ts` przy ustawionych kluczach).
- Pole `warnings` w fasadach OpenAI / Anthropic (tylko natywny czat).

## CI / lokalnie

```bash
npm test                  # jednostkowe runtime
npm run test:cli          # jednostkowe CLI
npm run test:e2e          # E2E HTTP
npm run test:security     # security HTTP (auth, helmet, fuzzing, disclosure)
npm run test:all          # runtime + E2E
npm run test:integration  # live (Docker + .env.test)
npm run test:cov          # pokrycie runtime
npm run deploy:production # test:security + build + docker:up:full
```

Nie są wymagane zmienne env providerów ani działający Redis dla `npm test`, `npm run test:cli`, `npm run test:e2e` i `npm run test:security`.

Powiązane: `architektura_katalogi_pliki.md` (drzewo `test/`), `architektura.md`, `CLI.md` (testy CLI).
