# AI Provider Gateway (NestJS)

Gateway HTTP dla LLM, który **ukrywa SDK providerów** i wystawia spójny kontrakt do:

- standardowego czatu (`POST /api/v1/chat`),
- streamingu SSE (`POST /api/v1/chat/stream`),
- katalogu aliasów modeli (`GET /api/v1/models`, `GET /api/v1/models/:modelAlias`),
- healthchecka (`GET /api/v1/health`, `GET /api/v1/health/ready`),
- metryk Prometheusa (`GET /metrics` — poza prefiksem `/api/v1`),
- odporności (retry, timeout z anulowaniem in-flight przez `AbortSignal`, opcjonalny fallback aliasu z `gateway.config.yaml`) — **`ResilientExecutor`**.

Aktualnie wspierani **adaptery runtime** (`src/providers/`):

- **Anthropic** (`@anthropic-ai/sdk`) — z pełnym wsparciem **extended thinking** (reasoning models)
- **Google Gemini** (`@google/genai`) — z pełnym wsparciem **ThinkingConfig** (Gemini 3.0+)
- **OpenAI** (`type: openai`) — Responses API (`create-openai-provider.core.ts`); wymaga `baseUrlRef` w YAML
- **OpenAI-compatible** (`type: openai-compatible`) — Chat Completions (np. Ollama, lokalne endpointy); wymaga `baseUrlRef`, klucz API opcjonalny

> **Uwaga — dwa „OpenAI” w projekcie:**
>
> 1. **Fasada** — `/api/v1/openai/*`, `src/integrations/openai/` — kompatybilność kontraktu HTTP (np. Cursor).
> 2. **Adapter runtime** — `type: openai` / `openai-compatible`, `src/providers/` — wywołanie SDK po `baseUrlRef` + `apiKeyRef`.  
>    Fasada **nie wymaga** adaptera OpenAI; adapter **nie wymaga** fasady. Szczegóły: [`docs/pl/dictionary.md`](docs/pl/dictionary.md) · EN: [`docs/dictionary.md`](docs/dictionary.md).

## Dokumentacja / Documentation

- **English:** [`docs/README.md`](docs/README.md)
- **Polski:** [`docs/pl/README.md`](docs/pl/README.md)

| Temat / Topic                               | English                                                                                                                                                                                 | Polski                                                                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kontrakt HTTP (OpenAPI 3.1)                 | [`openapi.json`](openapi.json) — native chat + models + health + OpenAI/Anthropic facades; generated: `npm run openapi:export`                                                          | j.w. / same                                                                                                                                                                             |
| Swagger UI (runtime)                        | `http://localhost:3000/api/v1/api-docs` — JSON: `/api/v1/swagger.json` (`SWAGGER_ENABLED`); tags: Health, Chat, **Models**, OpenAI API _(IDE facade)_, Anthropic API _(IDE facade)_     | j.w. / same                                                                                                                                                                             |
| API (human-readable)                        | [`docs/api-documentation.md`](docs/api-documentation.md)                                                                                                                                | [`docs/pl/dokumentacja_api.md`](docs/pl/dokumentacja_api.md)                                                                                                                            |
| Configuration (env + YAML)                  | [`docs/configuration.md`](docs/configuration.md)                                                                                                                                        | [`docs/pl/konfiguracja.md`](docs/pl/konfiguracja.md)                                                                                                                                    |
| Error codes / kody błędów                   | [`docs/dictionary.md`](docs/dictionary.md)                                                                                                                                               | [`docs/pl/dictionary.md`](docs/pl/dictionary.md)                                                                                                                                         |
| Brand types (TS type safety)                | [`docs/brand-types.md`](docs/brand-types.md)                                                                                                                                             | [`docs/pl/brand_types.md`](docs/pl/brand_types.md)                                                                                                                                       |
| Architecture / architektura                 | [`docs/architecture.md`](docs/architecture.md)                                                                                                                                           | [`docs/pl/architektura.md`](docs/pl/architektura.md)                                                                                                                                     |
| Project structure / struktura katalogów     | [`docs/project.structure.md`](docs/project.structure.md)                                                                                                                                | [`docs/pl/architektura_katalogi_pliki.md`](docs/pl/architektura_katalogi_pliki.md)                                                                                                       |
| OpenAI facade (Cursor IDE)                  | [`docs/openai-contract-integration.md`](docs/openai-contract-integration.md)                                                                                                            | [`docs/pl/integracja_openai_kontrakt.md`](docs/pl/integracja_openai_kontrakt.md)                                                                                                         |
| OpenAI runtime adapter                      | [`docs/provider-openai-runtime.md`](docs/provider-openai-runtime.md)                                                                                                                    | [`docs/pl/provider_openai_runtime.md`](docs/pl/provider_openai_runtime.md)                                                                                                               |
| IDE facade architecture                     | [`docs/integrations.md`](docs/integrations.md)                                                                                                                                           | [`docs/pl/integracje.md`](docs/pl/integracje.md)                                                                                                                                         |
| Gateway CLI                                 | [`docs/command_line_interface.md`](docs/command_line_interface.md)                                                                                                                       | [`docs/pl/CLI.md`](docs/pl/CLI.md)                                                                                                                                                       |
| Deployment (Docker + GitHub Actions / VPS)  | [`docs/deployment.md`](docs/deployment.md)                                                                                                                                               | [`docs/pl/deployment.md`](docs/pl/deployment.md)                                                                                                                                         |
| Tests (unit, CLI, E2E, security, integration) | [`docs/testing.md`](docs/testing.md)                                                                                                                                                   | [`docs/pl/testy.md`](docs/pl/testy.md)                                                                                                                                                   |
| Security (policy, keys, scope)              | [`SECURITY.md`](SECURITY.md)                                                                                                                                                            | [`SECURITY.md`](SECURITY.md)                                                                                                                                                            |

## Dystrybucja

Projekt jest open-source pod licencją **MIT** — możesz **klonować**, **forkować**, modyfikować i deployować własne instancje (np. na VPS, Kubernetes, Docker Compose).

**Brak zewnętrznych kontrybucji do upstream:** to repozytorium **nie przyjmuje pull requestów** od osób trzecich. Zmiany w gałęzi `main` autora wprowadza wyłącznie maintainer. Jeśli chcesz rozwijać gateway — **sforkuj repozytorium na swój GitHub** i pracuj na własnej kopii. Klonowanie w celach rekrutacyjnych (przegląd kodu, portfolio) jest w pełni OK.

**Uwaga:** `"private": true` w `package.json` oznacza, że **nie publikujemy** tego pakietu na npm. Jeśli chcesz użyć gateway:

1. Fork repozytorium.
2. Clone lokalnie i skonfiguruj (patrz „Szybki start”).
3. Deploy na własnej infrastrukturze — [`docs/pl/deployment.md`](docs/pl/deployment.md) (Docker Compose lokalnie; produkcja VPS przez GitHub Actions).

Alternatywnie: jeśli potrzebujesz pakietu npm, otwórz issue z use case.

## Integracje API

Gateway wystawia równoległe kontrakty HTTP nad tym samym `ChatService`:

| Standard                             | Endpointy                                                  | Dokumentacja                                                                     | Dla              |
| ------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------- |
| **Natywny**                          | `/api/v1/chat`, `/api/v1/chat/stream`, `/api/v1/models`    | [`docs/pl/dokumentacja_api.md`](docs/pl/dokumentacja_api.md)                           | Własne aplikacje |
| **Fasada OpenAI** (kontrakt HTTP)    | `/api/v1/openai/models`, `/api/v1/openai/chat/completions` | [`docs/pl/integracja_openai_kontrakt.md`](docs/pl/integracja_openai_kontrakt.md)       | Cursor IDE       |
| **Fasada Anthropic** (kontrakt HTTP) | `/api/v1/anthropic/messages`, `/api/v1/anthropic/models`   | [`docs/pl/integracja_anthropic_messages.md`](docs/pl/integracja_anthropic_messages.md) | Claude Code      |

### Fasady integracji ≠ providerzy runtime

**Fasada** (`/api/v1/openai/*`, `/api/v1/anthropic/*`) to **warstwa HTTP** — implementuje kształt kontraktu, który stał się standardem branżowym dla narzędzi (OpenAI Chat Completions API, Anthropic Messages API). Służy kompatybilności klientów (Cursor, Claude Code), **nie** oznacza integracji z api.openai.com ani z API Anthropic po stronie gatewaya.

**Provider runtime** (`src/providers/`) to **adaptery SDK** wywoływane po konfiguracji — każdy alias modelu w `gateway.config.yaml` wskazuje `providerInstance` i vendorowy `modelId`. Za aliasem może stać dowolny włączony typ providera (Anthropic, Google, OpenAI, OpenAI-compatible); **nie musi** to być ten sam vendor co kształt HTTP fasady.

| Fasada                | Kontrakt HTTP dla klienta                | Gwarancja backendu LLM                                                 |
| --------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| `/api/v1/openai/*`    | OpenAI API (np. Cursor)                  | **Brak** — routing zależy wyłącznie od `model` (= `modelAlias`) w YAML |
| `/api/v1/anthropic/*` | Anthropic Messages API (np. Claude Code) | **Brak** — alias może wskazywać np. Google Gemini, nie Anthropic       |

**Routing do providera** jest wyłącznie **konfiguracyjny**: `model` / `modelAlias` → wpis `models[]` → `providerInstance` → fabryka w `src/providers/`. Nie wynika z nagłówka auth ani z wyboru fasady.

Szczegóły: [`docs/pl/integracje.md`](docs/pl/integracje.md), [`docs/pl/dictionary.md`](docs/pl/dictionary.md) (sekcja „Fasada vs provider runtime”), [`docs/pl/integracja_openai_kontrakt.md`](docs/pl/integracja_openai_kontrakt.md), [`docs/pl/integracja_anthropic_messages.md`](docs/pl/integracja_anthropic_messages.md).

**Autoryzacja klienta** — ta sama allowlista gateway (`GATEWAY_KEY_*` z `.env` / YAML), **nie** klucze vendorów OpenAI ani Anthropic:

- Natywny: `X-Gateway-Key`
- OpenAI fasada: `Authorization: Bearer <klucz_klienta_gateway>` — Base URL: `.../api/v1/openai`
- Anthropic fasada: `x-api-key` lub Bearer `<klucz_klienta_gateway>` — Base URL: `.../api/v1/anthropic`

Klucze providerów (`.env` pod nazwami z **`apiKeyRef`** w YAML — wizard domyślnie `{INSTANCE_ID}_API_KEY`, np. `ANTHROPIC_PRIMARY_API_KEY`; CLI synchronizuje też legacy `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY`) są używane **wyłącznie** w warstwie `src/providers/` przy wywołaniu SDK.

## Features

Gateway capabilities for generation control and monitoring:

- **Advanced generation params**: nucleus sampling (`topP`), stop sequences, frequency/presence penalties, deterministic seed
- **Structured outputs**: JSON mode with optional JSON Schema (in runtime adapters — depends on the alias and `providerInstance` in YAML, not on the HTTP surface / facade)
- **Extended thinking mode**: reasoning models (Anthropic Claude Opus/Sonnet 4.5+, Google Gemini 3.0+, OpenAI Responses API) with `thinkingEnabled` and `thinkingBudget` — higher answer quality for complex tasks (2–10× cost)
- **Extended usage tracking**: prompt cache tokens (Anthropic — 90% discount on cached tokens), `usageDetails` in the response
- **Tool calling / Function calling**: tool definitions in `tooling`, results in `toolCalls`, support for the `tool` role in messages
- **Metadata propagation**: user tracking (`userId`), custom metadata for analytics
- **Request/conversation tracking**: `requestId` (header + body), `conversationId` (conversation grouping in Sentry)
- **Smart rate limiting**: per-client RPS/burst/concurrent streams (Redis backend)
- **Response caching**: optional cache for `POST /api/v1/chat` (Redis backend)
- **Resilient execution**: retry with exponential backoff, per-model timeout (`AbortSignal` → cancel in-flight SDK call), optional fallback chain
- **Multi-provider (runtime)**: SDK adapters in `src/providers/` — Anthropic, Google Gemini, OpenAI, OpenAI-compatible — [`docs/provider-openai-runtime.md`](docs/provider-openai-runtime.md)
- **IDE-friendly facades**: OpenAI API shape (Cursor) and Anthropic Messages API (Claude Code) over the same `ChatService` — client contract compatibility, LLM routing from YAML
- **Models catalog**: native `GET /api/v1/models` + facades — shared `GatewayModelsCatalogService`, same alias set from YAML
- **Production-ready**: Helmet.js security headers (`main.ts`), `x-powered-by` disabled, JSON body limit **1 MB**, dedicated security tests (`test/security/`), Pino logging, Sentry AI observability, **Prometheus app metrics** (`GET /metrics`, health gauges refreshed on scrape), alert rules in `deployment/monitoring/alerts.yml`, graceful shutdown, readiness probes, Docker Compose (`deployment/`), VPS deploy via GitHub Actions (`.github/workflows/deploy.yml`)
- **Type safety (brand types)**: nominal TS types for keys, identifiers, metrics, and policy (`src/common/types/`) — compile-time with no runtime cost; guide: [`docs/brand-types.md`](docs/brand-types.md)
- **CLI wizard**: `gateway config:init` — interactive setup, `provider:test`, model/client management

## Szybki start (lokalnie)

Wymagania: Node.js 20+ i npm.

1. Instalacja:

```bash
npm install
```

2. Konfiguracja (wymagane po sklonowaniu):

Repozytorium może zawierać [`gateway.config.yaml`](gateway.config.yaml) gotowy do developmentu. Przed pierwszym startem uzupełnij **`.env`** albo uruchom wizard.

**Opcja A — wizard CLI (zalecane lokalnie):**

```bash
npm run cli config:init
# lub: npx gateway config:init
```

Wizard generuje lub nadpisuje `gateway.config.yaml`, `.env`, `.env.example` oraz pliki system prompt (szablony w `src/cli/templates/`). Wykrywa konfigurację boilerplate (`isBoilerplateConfig()` — ID/refy z `placeholder` / `PLACEHOLDER`) i uruchamia pełny flow bez pytania o nadpisanie.

**Opcja B — szablony (prod / Docker / ręcznie):**

```bash
cp deployment/templates/gateway.config.example.yaml gateway.config.yaml
cp deployment/templates/.env.example .env
# uzupełnij .env i YAML — nazwy env muszą odpowiadać *KeyRef w YAML
```

Szczegóły obu ścieżek: [`docs/pl/konfiguracja.md`](docs/pl/konfiguracja.md), [`docs/pl/deployment.md`](docs/pl/deployment.md).

Zweryfikuj konfigurację:

```bash
npm run cli config:validate
# alternatywa: npm run config:validate
```

Przy starcie każda **włączona** instancja providera w YAML musi mieć niepusty klucz w env pod nazwą wskazaną przez **`apiKeyRef`** (np. `ANTHROPIC_PRIMARY_API_KEY`) — **wyjątek:** typy `openai` / `openai-compatible` dopuszczają pusty klucz (np. lokalny Ollama), ale wymagają **`baseUrlRef`**. Wizard generuje nazwy `{INSTANCE_ID}_API_KEY` i dodatkowo synchronizuje legacy `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` w `.env`. Opcjonalne legacy zmienne mają walidację formatu (`sk-ant-`, `AIza` / `AQ.`) — szczegóły: [`docs/pl/konfiguracja.md`](docs/pl/konfiguracja.md).

**Uwaga:** Przed pierwszym uruchomieniem uzupełnij `.env` (klucze providerów + `MASTER_KEY` / `GATEWAY_KEY_*`) albo uruchom `npm run cli config:init`. Bez poprawnego YAML i env start aplikacji kończy się błędem walidacji.

3. Uruchomienie:

```bash
npm run start:dev
```

Domyślnie: `http://localhost:3000`, prefiks API: `/api/v1` ([`src/setup.app.ts`](src/setup.app.ts)).

## Wdrożenie (Docker Compose i VPS)

Artefakty w katalogu [`deployment/`](deployment/) — pełny przewodnik: [`docs/pl/deployment.md`](docs/pl/deployment.md).

### Lokalnie (Compose)

```bash
# jednorazowo: sieć współdzielona przez compose
docker network create ai-gateway-network

# konfiguracja w katalogu głównym (gateway.config.yaml + .env)
cp deployment/templates/gateway.config.example.yaml gateway.config.yaml
cp deployment/templates/.env.example .env

# MVP (sam gateway)
npm run docker:build
npm run docker:up

# pełny stack (gateway + Redis + Prometheus + Grafana)
npm run docker:up:full
```

Alternatywa: `make docker-up` / `make docker-up-full` (wymaga Make). W kontenerze montowane są `gateway.config.yaml` i `.env` z katalogu głównego repozytorium.

### Produkcja na VPS (GitHub Actions)

Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) na **self-hosted** runnerze:

1. Zielony [`ci.yml`](.github/workflows/ci.yml) dla docelowego SHA.
2. Actions → **Deploy to VPS** (`workflow_dispatch`) — tip `branch` albo konkretny `sha` / tag.
3. Pipeline: sync do `/opt/ai-provider-gateway` → sekrety z **Vault** → Compose (pełny stack) → readiness → zapis `.deployed-sha`.
4. Przy failu po mutacji hosta: **auto-rollback** do last known-good (`deployment/scripts/rollback.sh`); job i tak kończy się czerwono, gdy recovery się udał.

Szczegóły (inputy, DooD, Vault, weryfikacja): [`docs/pl/deployment.md`](docs/pl/deployment.md) — sekcja **Deploy na VPS (GitHub Actions)**.

## Endpointy (przykłady)

Wszystkie odpowiedzi (w tym health) zwracają nagłówek **`x-request-id`** (echo żądania lub `req_<uuid>`) — [`RequestIdMiddleware`](src/common/middleware/request-id.middleware.ts).

### Health (bez `X-Gateway-Key`)

```bash
curl -i http://localhost:3000/api/v1/health
curl -i http://localhost:3000/api/v1/health/ready
```

Readiness: HTTP zawsze **200** — sprawdzaj `body.status` (`ready` / `not_ready`). Pola w `checks`: **`config`**, **`redis`** (współdzielona infrastruktura; probe tylko gdy `required: true`), **`cache`** (stan feature cache). Metryki readiness są też eksportowane do Prometheusa — patrz `/metrics` poniżej.

### Metryki Prometheus (bez `X-Gateway-Key`)

```bash
curl -s http://localhost:3000/metrics | grep -E 'gateway_readiness|gateway_health_status'
```

Endpoint **`GET /metrics`** jest **poza** prefiksem `/api/v1` (`src/setup.app.ts`). Przed zwróceniem snapshotu aplikacja odświeża gauge'e health (`gateway_readiness`, `gateway_health_status{component=...}`) przez hook w `HealthService` — bez osobnego schedulera. W production backend Prometheus wybierany automatycznie (`METRICS_BACKEND=prometheus` lub `NODE_ENV=production`). Stack monitoring: `npm run docker:up:monitoring` — [`docs/pl/deployment.md`](docs/pl/deployment.md).

### Models (wymaga `X-Gateway-Key`)

```bash
curl -i http://localhost:3000/api/v1/models ^
  -H "X-Gateway-Key: YOUR_GATEWAY_KEY"

curl -i http://localhost:3000/api/v1/models/chat-default ^
  -H "X-Gateway-Key: YOUR_GATEWAY_KEY"
```

Odpowiedź zawiera aliasy z `gateway.config.yaml` w kontrakcie gateway (`modelAlias`, `providerInstance`, `providerType`, `modelId`, opcjonalnie `capabilities`, `fallback`). Fasady OpenAI/Anthropic zwracają ten sam zestaw aliasów w formacie vendora — wspólna warstwa: `GatewayModelsCatalogService` (`src/models/`). Szczegóły: [`docs/pl/dokumentacja_api.md`](docs/pl/dokumentacja_api.md), [`docs/pl/lista_endpointów.md`](docs/pl/lista_endpointów.md).

### Chat (wymaga `X-Gateway-Key`)

```bash
curl -i -X POST "http://localhost:3000/api/v1/chat" ^
  -H "content-type: application/json" ^
  -H "X-Gateway-Key: YOUR_GATEWAY_KEY" ^
  -d "{\"modelAlias\":\"chat-default\",\"messages\":[{\"role\":\"user\",\"content\":\"Napisz krótkie streszczenie.\"}]}"
```

Opcjonalnie w body: **`params`** (`temperature`, `maxOutputTokens`, `responseFormat` z opcjonalnym `jsonSchema`), **`conversationId`** (`conv_<uuid>`), **`metadata`** (propagacja do adapterów — Anthropic mapuje `userId` → `metadata.user_id`) — [`docs/pl/dokumentacja_api.md`](docs/pl/dokumentacja_api.md).

### Streaming SSE

```bash
curl -i -X POST "http://localhost:3000/api/v1/chat/stream" ^
  -H "content-type: application/json" ^
  -H "X-Gateway-Key: YOUR_GATEWAY_KEY" ^
  -d "{\"modelAlias\":\"chat-default\",\"messages\":[{\"role\":\"user\",\"content\":\"Powiedz coś krótko.\"}]}" ^
  --no-buffer
```

### Extended Thinking Mode (reasoning models)

```bash
curl -i -X POST "http://localhost:3000/api/v1/chat" ^
  -H "content-type: application/json" ^
  -H "X-Gateway-Key: YOUR_GATEWAY_KEY" ^
  -d "{\"modelAlias\":\"chat-reasoning\",\"messages\":[{\"role\":\"user\",\"content\":\"Solve this step by step: What is 234 * 567?\"}],\"params\":{\"thinkingEnabled\":true,\"thinkingBudget\":\"medium\"}}"
```

Odpowiedź zawiera opcjonalne pole **`thinkingContent`** z rozumowaniem modelu. Wspierane dla **Anthropic Claude Opus/Sonnet 4.5+**, **Google Gemini 3.0+** oraz **OpenAI** (Responses API). Wymaga `capabilities.thinking: true` + `allowOverrides: [thinkingEnabled, thinkingBudget]` w YAML. **Uwaga:** 2-10x większe koszty i latencja — szczegóły: [`docs/pl/dokumentacja_api.md`](docs/pl/dokumentacja_api.md).

## Auth i limity

- **Auth:** nagłówek **`X-Gateway-Key`** — allowlista z `gateway.config.yaml` + env ([`docs/pl/konfiguracja.md`](docs/pl/konfiguracja.md)).
- **Smart rate limit** (opcjonalnie): `RATE_LIMIT_SMART_ENABLED=true` + Redis (wspólny `RedisConnectionService` — ładowany także bez cache odpowiedzi) — [`src/rate-limit/`](src/rate-limit/). Kody **429**: **`RATE_LIMITED`** (gateway) vs **`PROVIDER_RATE_LIMITED`** (upstream) — [`docs/pl/dictionary.md`](docs/pl/dictionary.md).
- **Cooldown** po 429 od upstream — JSON i streaming (`prepareRequestForExecution`, `handleProviderError`)

## Cache odpowiedzi

Opcjonalny cache tylko dla **`POST /api/v1/chat`** (`CACHE_ENABLED`, `CACHE_BACKEND=redis`) — [`src/cache/`](src/cache/). Redis łączy się także przy samym smart rate limit (`should-include-redis-stack.ts`). Pomijany dla żądań z toolingiem. Odpowiedź może zawierać `cached: true`, `cachedAt`.

## System prompt i tool calling

Rola **`system`** w `messages[]` jest zablokowana — instrukcja systemowa jest składana po stronie serwera przez [`composeSystemPrompt`](src/chat/helpers/system-prompt.ts) z plików w [`src/config/system-prompt/`](src/config/system-prompt/).

W `messages[]` dozwolone są role **`user`**, **`assistant`** i **`tool`** (wynik wywołania narzędzia — wymaga `toolCallId`). Asystent może zwracać **`toolCalls`** w odpowiedzi. Opcjonalne pole **`tooling`** w body (`definitions`, `toolChoice`) włącza function calling — wymaga `capabilities.tools: true` dla aliasu w YAML; inaczej **`400`** + **`TOOLS_NOT_SUPPORTED`**.

Odpowiedź JSON / SSE `done` może zawierać **`toolCalls`**, **`finishReason`** (runtime: `stop` | `tool_calls` | `length` | `content_filter` — `mapStopReasonToFinishReason`), opcjonalnie **`usageDetails`** (tokeny cache Anthropic) oraz opcjonalnie **`systemFingerprint`** — tylko gdy upstream zwraca odpowiednik OpenAI `system_fingerprint` (Anthropic i Gemini **nie** mają tego pola; przy aliasach na te providery klucz jest pomijany). Fasada OpenAI mapuje je na `system_fingerprint` gdy obecne. Szczegóły: [`docs/pl/dictionary.md`](docs/pl/dictionary.md). Cache i fallback YAML są **wyłączone** dla żądań z toolingiem — w czacie standardowym i streamingu.

Szczegóły: [`docs/pl/dokumentacja_api.md`](docs/pl/dokumentacja_api.md), [`docs/pl/architektura.md`](docs/pl/architektura.md).

## Struktura kodu

| Warstwa                     | Lokalizacja                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Orkiestracja czatu          | [`ChatService`](src/chat/chat.service.ts)                                                                                                       |
| Odporność (retry/timeout/fallback) | [`ResilientExecutor`](src/chat/resilience/resilient-executor.ts) — `ChatModule`; `timeoutMs` → `AbortSignal` do adapterów; defaults: [`retry-policy-defaults.ts`](src/common/retry-policy-defaults.ts) |
| Katalog aliasów modeli      | [`GatewayModelsCatalogService`](src/models/services/gateway-models-catalog.service.ts) — natywny `GET /models` + fasady przez mappery           |
| Wywołania providerów + SSE  | [`ChatProviderCallService`](src/chat/services/chat-provider-call.service.ts)                                                                    |
| Adaptery LLM + tool mappers | [`src/providers/`](src/providers/) (`anthropic-tools.mapper.ts`, `google-tools.mapper.ts`, `openai/` — Chat Completions + Responses)            |
| Błędy / `requestId`         | [`GlobalExceptionFilter`](src/common/filters/http-exception.filter.ts) (w tym **413** dla `entity.too.large`), [`RequestIdMiddleware`](src/common/middleware/request-id.middleware.ts) |
| Observability               | [`src/observability/`](src/observability/) — `AiMetricsModule` (Sentry LLM), `AppMetricsModule` (Prometheus RED + health gauges, `GET /metrics`) |
| Brand types (TS)            | [`src/common/types/`](src/common/types/) — `Brand`, guardy, helpery `as*` / `create*`; barrel: `index.ts`                                       |

Pełne drzewo: [`docs/pl/architektura_katalogi_pliki.md`](docs/pl/architektura_katalogi_pliki.md). Wdrożenie: [`deployment/`](deployment/), [`docs/pl/deployment.md`](docs/pl/deployment.md) (Compose lokalnie + Actions na VPS).

## Testy

Szczegóły pokrycia, liczniki zestawów i przypadków testowych: [`docs/pl/testy.md`](docs/pl/testy.md).

Aktualne liczniki: `npm test` — **92** zestawów / **1248** przypadków; `npm run test:cli` — **12** / **62**; `npm run test:e2e` — **10** / **105**; `npm run test:security` — **5** / **51** (źródło: [`docs/pl/testy.md`](docs/pl/testy.md)).

Uruchomienie:

```bash
npm test                 # jednostkowe (src/, bez src/cli/)
npm run test:cli         # jednostkowe CLI (src/cli/)
npm run test:e2e         # end-to-end HTTP (mocki)
npm run test:security    # security HTTP (auth, helmet, fuzzing, disclosure)
npm run test:integration # live SDK + Redis (Docker, .env.test)
npm run test:all         # jednostkowe + E2E
```

## Gateway CLI

Osobny entry point od serwera HTTP — działa **bez build** (ts-node), bin: `gateway`.

```bash
npm run cli                              # welcome + lista komend
npm run cli config:init                  # wizard konfiguracji (pierwsze uruchomienie)
npm run cli config:validate              # walidacja YAML + env
npm run cli config:show                  # podgląd sparsowanego YAML

npm run cli provider:list                # lista instancji providerów
npm run cli provider:test                # test połączeń SDK (opcjonalnie: [instanceId] lub --provider)
npm run cli provider:add                 # dodaj instancję providera (interaktywnie)
npm run cli provider:edit <instanceId>   # włącz/wyłącz lub rotacja klucza API
npm run cli provider:remove <instanceId> # usuń instancję, modele i klucz z .env

npm run cli model:list                   # lista aliasów modeli
npm run cli model:add                    # dodaj alias (interaktywnie)
npm run cli model:edit <alias>           # edycja pól modelu
npm run cli model:remove <alias>         # usuń alias z YAML + plik promptu

npm run cli client:list                  # lista klientów gateway
npm run cli client:add                   # dodaj klienta (interaktywnie)
npm run cli client:edit <clientId>       # edycja klienta / rotacja klucza
npm run cli client:remove <clientId>     # usuń klienta

npm run cli key:generate -- --type master
npm run cli key:generate -- --type client --client-id webapp
```

Mutacje YAML tworzą backup w katalogu `backup/` (ignorowany przez git). Pełna dokumentacja komend: [`docs/pl/CLI.md`](docs/pl/CLI.md).

## Skrypty

```bash
# Serwer
npm run start:dev       # development
npm run build
npm run start:prod      # po build
npm run openapi:export  # openapi.json z dekoratorów @nestjs/swagger

# Konfiguracja
npm run cli             # Gateway CLI (alias: npx gateway)
npm run config:validate # walidacja offline (scripts/validate-config.ts)

# Testy
npm test                # jednostkowe (src/, bez cli/)
npm run test:cli        # jednostkowe CLI (src/cli/)
npm run test:e2e        # E2E HTTP (test/e2e/)
npm run test:security   # security HTTP (test/security/)
npm run test:integration # integracyjne live (test/integration/, Docker Redis)
npm run test:all        # jednostkowe + E2E

# Docker (pliki w deployment/docker/)
npm run docker:build
npm run docker:up              # MVP: sam gateway
npm run docker:up:redis        # + Redis
npm run docker:up:monitoring   # + Prometheus + Grafana
npm run docker:up:full         # gateway + Redis + monitoring
npm run docker:up:ollama       # + Ollama (lokalny LLM)
npm run docker:up:dev          # dev z hot reload
npm run docker:down
npm run deploy:mvp             # test:all + build + docker:up
npm run deploy:staging         # test:all + build + docker:up:monitoring
npm run deploy:production      # test:security + build + docker:up:full
```

Pełna lista targetów Make: [`Makefile`](Makefile).
