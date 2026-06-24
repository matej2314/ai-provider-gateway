# Testy — AI Provider Gateway

Wersja dokumentu: **1.5** (zsynchronizowana z `package.json`, `test/` i `src/**/*.spec.ts`).

## Przegląd

| Warstwa | Lokalizacja | Runner | Skrypt npm |
|---------|-------------|--------|------------|
| **Jednostkowe** | `src/**/*.spec.ts` (obok modułów) | Jest (`rootDir: src`) | `npm test` |
| **E2E (HTTP)** | `test/e2e/*.e2e-spec.ts` | Jest (`test/jest-e2e.json`) | `npm run test:e2e` |
| **Wszystkie** | — | oba powyższe | `npm run test:all` |

Dodatkowe skrypty z `package.json`:

- `npm run test:watch` — jednostkowe w trybie watch
- `npm run test:cov` — pokrycie kodu (`coverage/`)
- `npm run test:debug` — debug jednostkowych (Node inspect)

Testy **nie wymagają** uruchomionego serwera HTTP, Redis ani kluczy API providerów — E2E bootstrapują aplikację NestJS w procesie testowym z mockami infrastruktury.

## Testy jednostkowe (`src/`)

Konfiguracja: sekcja `"jest"` w `package.json` (`testRegex: .*\.spec\.ts$`, `rootDir: src`).

**Stan repozytorium:** **63** zestawy testów (`src/**/*.spec.ts`); liczba przypadków — wynik `npm test` (aktualizuj po większych zmianach w testach).

### Obszary pokrycia

| Moduł / obszar | Przykładowe pliki |
|----------------|-------------------|
| **Czat** | `chat.service.spec.ts`, `chat.controller.spec.ts`, `chat-stream.controller.spec.ts`, `services/chat-cache-guard.service.spec.ts`, `chat-validation.service.spec.ts`, `chat-error-handler.service.spec.ts`, `chat-provider-call.service.spec.ts`, `chat-response-builder.service.spec.ts`, `validation/chat-ingress.validator.spec.ts`, `helpers/*.spec.ts` (m.in. `map-provider-finish-reason`, `provider-input`, `generation-warnings`, `cache-policy`, `tooling-request`, `retry-policy`), `sse/sse.serializer.spec.ts` |
| **Providery** | `provider-registry.service.spec.ts`, `factories/create-*-provider.spec.ts`, `anthropic/anthropic-*.mapper.spec.ts`, `google/google-tools.mapper.spec.ts` |
| **Cache** | `cache-registry.service.spec.ts`, `response-cache.service.spec.ts`, `should-include-redis-stack.spec.ts`, adaptery `noop` / `redis` |
| **Rate limit** | `smart-rate-limiter.service.spec.ts` |
| **Guardy** | `gateway-key.guard.spec.ts`, `openai-bearer-auth.guard.spec.ts`, `anthropic-api-key.guard.spec.ts` |
| **Fasady** (`src/integrations/`) | kontrolery fasad (`openai-chat-completions.controller.spec.ts`, `anthropic-messages.controller.spec.ts`, …), filtry błędów (`openai-exception.filter.spec.ts`, `anthropic-exception.filter.spec.ts`), katalogi modeli (`*-models-catalog.service.spec.ts`), mapery (`openai-*.mapper.spec.ts`, `anthropic-*.mapper.spec.ts`, w tym `anthropic-stop-reason.spec.ts`), helpery (`normalize-openai-content.spec.ts`) |
| **Odporność** | `resilient-executor.spec.ts`, `fallback-chain.spec.ts`, `is-retryable-http-error.spec.ts` |
| **Błędy** | `provider-error.mapper.spec.ts`, `provider-error-mapper.helpers.spec.ts` |
| **Health / logging / metrics** | `health.*.spec.ts` (w tym `checkRedis`, mock `RedisConnectionService.ping`), `logging.service.spec.ts`, `metrics.service.spec.ts` |
| **Wspólne** | `readGatewayKeyHeader.spec.ts` |

Współdzielone stałe i fabryki mocków: `src/common/mocks/` (`test-constants.ts`, `createMockConfigService`, `createMockSmartRateLimiter`, `createMockResolvedProviderConfig`, `createMockResponseCacheService`, `http-mocks.ts`, itd.).

## Testy E2E (`test/e2e/`)

Konfiguracja: `test/jest-e2e.json` — `testRegex: .e2e-spec.ts$`, `setupFilesAfterEnv: e2e/setup/jest-e2e.setup.ts`, `moduleNameMapper` dla aliasu `src/`.

**Stan repozytorium:** **7** zestawów, **72** przypadki (`npm run test:e2e`).

### Pliki spec

Konwencja nazw: `*-facade*.e2e-spec.ts` = test **fasady HTTP** (`src/integrations/`), nie adaptera SDK (`src/providers/`). Adaptery runtime są mockowane przez `e2e-provider-registry.ts`.

| Plik | Zakres |
|------|--------|
| `gateway-chat.e2e-spec.ts` | Natywny czat: `POST /api/v1/chat`, `POST /api/v1/chat/stream`, generation warnings |
| `gateway-chat-stream-scenarios.e2e-spec.ts` | SSE: nagłówki, zdarzenia, fallback w streamie, limity równoległych streamów, `warnings` w `done` |
| `gateway-chat-cache.e2e-spec.ts` | Cache odpowiedzi `POST /api/v1/chat` (mock backendu cache), persystencja `warnings` |
| `openai-facade.e2e-spec.ts` | Fasada OpenAI: auth, kształt odpowiedzi, streaming |
| `openai-facade-extended.e2e-spec.ts` | Fasada OpenAI: tool calling, rozszerzone scenariusze kontraktu |
| `anthropic-facade.e2e-spec.ts` | Fasada Anthropic: auth, kształt odpowiedzi, streaming |
| `anthropic-facade-extended.e2e-spec.ts` | Fasada Anthropic: thinking mode, tool calling |

Usunięty został wcześniejszy szkielet `test/app.e2e-spec.ts` — zastąpiony przez powyższe zestawy z dedykowanymi helperami.

### Infrastruktura E2E

**`helpers/create-e2e-app.ts`** — `createE2eApp()` / `withE2eApp()`:

- `Test.createTestingModule({ imports: [AppModule] })` + `setupApp(app)` (ten sam pipeline co produkcja: prefiks `/api/v1`, `ValidationPipe`, middleware).
- **Override'y** (bez Redis / bez realnych SDK):
  - `ConfigService` → `createMockConfigService()` (cache `noop`, `RATE_LIMIT_SMART_ENABLED: false` domyślnie),
  - `ProviderRegistryService` → mock z `createE2eProviderRegistry()`,
  - `RedisConnectionService`, `ProviderInstancesBootstrap`, `LoggingService` → stuby z `e2e-infra-mocks.ts`,
  - opcjonalnie `SmartRateLimiterService` (testy limitów).

**`helpers/e2e-infra-mocks.ts`** — `createE2eRedisConnectionMock()`, `createE2eProviderBootstrapMock()`, `createE2eLoggingServiceMock()` (opakowuje `createMockLoggingService()`).

**`helpers/e2e-provider-registry.ts`** — mock `AIProvider` (`complete` / `stream`) i `resolve()` per alias; wariant `createE2eFallbackProviderRegistry()` dla łańcucha fallback.

**`helpers/e2e-rate-limiter.ts`** — deterministyczne limity: burst RPS, nasycony concurrent streams.

**`helpers/e2e-constants.ts`** — trasy (`E2E_ROUTES`), klucz testowy (`TEST_GATEWAY_KEY` z `src/common/mocks/test-constants.ts`), `E2E_POST_SUCCESS_STATUS = 201` (udany POST z odpowiedzią JSON — natywny czat i fasady non-stream).

**`setup/jest-e2e.setup.ts`** — mock `uuid` (stałe ID), podmiana `src/config/configuration` na `mock-configuration.ts` (brak odczytu `gateway.config.yaml` z dysku).

**`setup/mock-configuration.ts`** — minimalna konfiguracja testowa (`createTestGatewayConfig()`).

### Scenariusze E2E (skrót)

**Gateway Chat (`gateway-chat.e2e-spec.ts`):**

- Auth: brak / zły / poprawny `X-Gateway-Key` → 401 / 403 / 201
- Odpowiedź JSON: kształt gateway (`id`, `conversationId`, `output`, `usage`, `finishReason`, `requestId`)
- Nagłówek `x-request-id`
- SSE: zdarzenia `meta`, `delta`, `done`
- Walidacja DTO: brak `modelAlias`, pusta `messages[]`
- Rate limit: `RATE_LIMITED` (429) przy burst limiterze
- Mapowanie błędów providera → envelope gateway
- Fallback: `effectiveModelAlias` przy awarii primary
- **Generation warnings (D5):** ignorowane parametry generacji (`frequencyPenalty`, `presencePenalty`, `seed`) → pole `warnings` w odpowiedzi JSON (provider Anthropic)

**OpenAI fasada (`openai-facade.e2e-spec.ts`, `openai-facade-extended.e2e-spec.ts`):**

- Auth Bearer (401 / 403 / 201)
- Kształt `chat.completion` (non-stream)
- Streaming: chunki OpenAI + `data: [DONE]`, `stream_options.include_usage`
- Walidacja w formacie OpenAI (`error.message`, `error.type`)
- Concurrent streams → 429 w formacie OpenAI
- Błędy providera → 400 / 500 w formacie OpenAI
- Brak pola `warnings` w odpowiedzi OpenAI (ostrzeżenia generacji tylko w natywnym czacie)
- Extended: tool calling (`tools` / `tool_calls` w kontrakcie OpenAI)

**Anthropic fasada (`anthropic-facade.e2e-spec.ts`, `anthropic-facade-extended.e2e-spec.ts`):**

- Auth `x-api-key` (401 / 403 / 201)
- Kształt `message` (non-stream)
- Streaming: `message_start`, `content_block_*`, `message_stop`; nagłówek `anthropic-version`
- Walidacja (`max_tokens`, brak `model`)
- Concurrent streams → 429 w formacie Anthropic
- Błędy providera → 400 / 500 w formacie Anthropic
- Extended: thinking mode (`thinking` w request → thinking block w response), tool calling

**Gateway cache (`gateway-chat-cache.e2e-spec.ts`):**

- Trafienie cache → `cached: true`, `cachedAt` w odpowiedzi JSON
- Pominięcie cache dla żądań z toolingiem
- Persystencja `warnings` przy trafieniu cache (te same ostrzeżenia co przy pierwszym żądaniu)

**Gateway stream scenarios (`gateway-chat-stream-scenarios.e2e-spec.ts`):**

- Nagłówki SSE (`Cache-Control`, `Connection`)
- Sekwencja zdarzeń `meta` / `delta` / `done`
- Fallback alias w `meta.effectiveModelAlias`
- Rate limit równoległych streamów
- `warnings` w zdarzeniu `done` przy ignorowanych parametrach generacji

### Kody HTTP w E2E (201 vs 200)

| Ścieżka | Tryb | Oczekiwany sukces w testach |
|---------|------|----------------------------|
| `POST /api/v1/chat` | JSON | **201** (`E2E_POST_SUCCESS_STATUS`) |
| `POST /api/v1/chat/stream` | SSE | **200** |
| `POST /api/v1/openai/chat/completions` | JSON | **201** |
| `POST /api/v1/openai/chat/completions` | `stream: true` | **200** |
| `POST /api/v1/anthropic/messages` | JSON | **201** |
| `POST /api/v1/anthropic/messages` | `stream: true` | **200** |

Runtime: NestJS domyślnie **201** dla udanego `POST` bez `@HttpCode` (natywny czat przez `return`; fasady przez `res.json()` na obiekcie odpowiedzi z ustawionym kodem POST). OpenAPI (`@ApiResponse({ status: 201 })` na kontrolerach + `npm run openapi:export`) jest zsynchronizowany z powyższym — szczegóły: `dokumentacja_api.md`, `lista_endpointów.md`.

## Czego testy E2E nie obejmują

- Rzeczywiste wywołania API Anthropic / Google (SDK mockowane przez `ProviderRegistryService`).
- **Realny** Redis (connection mock — fail-open / brak persystencji; cache E2E używa mock backendu, nie `RedisCacheModule` produkcyjnego).
- Pełny łańcuch `configuration.ts` z plikiem YAML na dysku (mock w setup).
- Health endpoints (`GET /health`, `/health/ready`) — pokrycie jednostkowe w `src/health/` (w tym `checks.redis` / `checkRedis`).
- CLI (`gateway *`) — brak dedykowanych testów E2E CLI (planowane opcjonalnie).
- Natywny czat: extended thinking mode w E2E (pokrycie jednostkowe w `anthropic-thinking.mapper.spec.ts`; fasada Anthropic — `anthropic-facade-extended.e2e-spec.ts`).
- Pole `warnings` w fasadach OpenAI / Anthropic (tylko natywny `POST /api/v1/chat` i stream gateway).

## CI / lokalnie

```bash
npm test              # jednostkowe
npm run test:e2e      # E2E HTTP
npm run test:all      # oba zestawy (kolejno)
npm run test:cov      # pokrycie jednostkowe
```

Nie są wymagane zmienne env providerów ani działający Redis. Opcjonalnie `.env` nie wpływa na E2E dzięki override `ConfigService` i mockowi `configuration`.

Powiązane: `architektura-katalogi-pliki.md` (drzewo `test/`), `architektura.md` (sekcja testów), `dokumentacja_koncepcyjna.md` (testowalność).
