# Dokumentacja — AI Provider Gateway

Ten katalog zawiera dokumentację projektu **AI Provider Gateway** (NestJS): koncepcję, architekturę, kontrakty API oraz specyfikacje w duchu **Spec‑Driven Development**.

## Dystrybucja i kontrybucje (upstream)

Projekt jest na licencji **MIT**: możesz **klonować**, **forkować**, modyfikować i wdrażać gateway we **własnej infrastrukturze**.

**To repozytorium upstream nie przyjmuje zewnętrznych kontrybucji** — pull requesty od osób trzecich **nie będą mergowane**. Kod w oryginalnym remote utrzymuje wyłącznie autor. Chcesz własne zmiany? **Sforkuj repo na swój GitHub** i rozwijaj kopię u siebie. Klonowanie w celach rekrutacyjnych (portfolio, code review) jest mile widziane.

Szczegóły modelu: [`dokumentacja_koncepcyjna.md`](dokumentacja_koncepcyjna.md) (sekcja „Model repozytorium”). Skrót w katalogu głównym: [`../README.md`](../README.md) (sekcja „Dystrybucja”).

## Jak czytać tę dokumentację

0. **Po sklonowaniu repozytorium:** uzupełnij `.env` i `gateway.config.yaml` albo uruchom `gateway config:init` — wizard generuje konfigurację z szablonów CLI (`konfiguracja.md` sekcja 0, `CLI.md`). Do wdrożenia Docker: `deployment.md`.
   0a. **Fasada (`src/integrations/`) ≠ adapter runtime (`src/providers/`):** szczególnie przy **OpenAI** — fasada `/api/v1/openai/*` to kształt HTTP dla IDE (Cursor); adapter `type: openai` / `openai-compatible` woła SDK po `baseUrlRef` + `apiKeyRef`. Warstwy są **ortogonalne**. Skrót: [`dictionary.md`](dictionary.md) (sekcja „Fasada vs provider runtime”), fasada: `integracja-openai-kontrakt.md`, adapter: `provider-openai-runtime.md`.
1. Zacznij od `dokumentacja_koncepcyjna.md` (WHAT/WHY).
2. Następnie `architektura.md` (moduły i granice) oraz `architektura_api.md` (konwencje API).
3. Dla szczegółów HTTP: **kontrakt** w `openapi.json` (katalog główny repo; generowany z kodu — `npm run openapi:export`), interaktywnie **Swagger UI** (`/api/v1/api-docs`), oraz opis ludzki: `lista_endpointów.md` i `dokumentacja_api.md`.
4. Dla konfiguracji „plug&play”: `konfiguracja.md`.
5. Dla przepływów: `data_flow.md`.
6. Dla ryzyk: `anty-patterny.md`.
7. Dla pracy spec‑first: katalog `spec/`.
8. **System prompt po stronie serwera** (brak `role=system` w API, pliki w `src/config/system-prompt/`) — opis warstw: `konfiguracja.md`, `architektura.md`, `dokumentacja_api.md`.
   8a. **Tool calling** — role `tool`, pole `tooling`, `toolCalls` / `finishReason` w odpowiedzi; `capabilities.tools` w YAML; kody `TOOLS_NOT_SUPPORTED` — `dokumentacja_api.md`, `dictionary.md`.
   8a1. **`finishReason` (gateway)** — znormalizowany typ `GatewayFinishReason` (`src/chat/types/gateway-finish-reason.type.ts`): `stop` \| `tool_calls` \| `length` \| `content_filter`; mapowanie `mapStopReasonToFinishReason` (`src/chat/helpers/map-provider-finish-reason.ts`); fasada Anthropic: reverse map `anthropic-stop-reason.mapper.ts` (`content_filter` → `refusal`).
   8b. **`params.responseFormat`** (JSON mode + opcjonalny `jsonSchema`) — tylko z body requestu; mapowane do SDK Anthropic (`output_config.format`) i Google (`response_format` / `response_schema`); macierz: `dictionary.md`, `konfiguracja.md`.
   8c. **`metadata`** w body czatu — opcjonalne metadane klienta; Anthropic mapuje `userId` → `metadata.user_id` w SDK (`buildProviderInputForAlias`).
   8d. **Extended thinking mode** — wsparcie reasoning models (Anthropic Claude Opus/Sonnet 4.5+, Google Gemini 3.0+, OpenAI przez Responses API dla `type: openai`); parametry `thinkingEnabled` i `thinkingBudget` w `params`; fasada OpenAI mapuje `reasoning_effort` → `params.thinking*`; odpowiedź zawiera opcjonalne pole `thinkingContent`; `capabilities.thinking` w YAML; wysokie koszty 2-10x, domyślnie wyłączone — szczegóły: `dokumentacja_api.md`, `provider-openai-runtime.md`.
9. **Cache odpowiedzi czatu** (`src/cache/`, env `CACHE_*` / `REDIS_*`) — wdrożony dla **`POST /api/v1/chat`**; odczyt walidowany schematem Zod `CachedChatResponseSchema` (`src/cache/schemas/cached-chat-response.schema.ts`); szczegóły: `konfiguracja.md`.
10. **Smart rate limiting** (`src/rate-limit/`, Redis; bez `@nestjs/throttler`), kody błędów **`RATE_LIMITED`** vs **`PROVIDER_RATE_LIMITED`** — `dictionary.md`; limity: YAML `clients[].rateLimit` lub env; szczegóły: `konfiguracja.md`, `architektura.md`.
11. **Request ID** — propagacja w body, logach i **nagłówku odpowiedzi** `x-request-id` (`RequestIdMiddleware`).
12. **Observability** — `src/observability/`: Pino logging, **AiMetrics** (Sentry LLM spans), **AppMetrics** (Prometheus RED + health gauges na `GET /metrics`), readiness (`checks.config`, `checks.redis`, `checks.cache`), alerty w `deployment/monitoring/alerts.yml` — `architektura.md`, `deployment.md`.
13. **Śledzenie rozmów (`conversationId`)** — response zawsze z ID; Sentry Conversations tylko przy ID w request (zalecany start od tury 2 + pełne `messages[]`); szczegóły: `conversation-tracking.md`.
14. **Parametry generacji (`params`)** — opcjonalne pola w body; merge YAML `defaults` ← body (`resolveProviderCallOptions`) dla `temperature`, `maxOutputTokens`, `topP`, penalties, `seed`; **`topK`**, **`stop`**, **`responseFormat`** — tylko z body; **macierz wsparcia per provider**: `dictionary.md`, reguły YAML: `konfiguracja.md`; API: `dokumentacja_api.md`.
15. **Odporność (retry, timeout, fallback)** — `ResilientExecutor` + `models[].fallback` w YAML; opcjonalne `effectiveModelAlias` w odpowiedzi; szczegóły: `konfiguracja.md`, `dokumentacja_api.md`, `dictionary.md`.
16. **Moduł czatu** — `ChatService` (`prepareRequestForExecution` wspólne dla JSON/stream; cache tylko JSON) + `ChatProviderCallService` (adaptery, metryki, SSE); profile ingress `validateChatIngress` (`native` \| `facade-openai` \| `facade-anthropic`); helpery w `src/chat/helpers/` — `architektura-katalogi-pliki.md`, `data_flow.md`.
17. **Typed config** — `AppConfiguration` (`src/config/app-configuration.types.ts`) + `getAppConfig` / `getAppConfigOrThrow` (`src/config/typed-config.ts`); runtime czyta klucze konfiguracji przez typowany kontrakt zamiast surowych stringów.
    17a. **Brand types (Fazy 0–5)** — nominalne typy TS w `src/common/types/` (`Brand`, security keys, identyfikatory, metryki, policy, `WarningCode`); granica HTTP = `string` w DTO; przewodnik: **`brand-types.md`**, skrót: `dictionary.md` (sekcja „Brand types”). CLI (`src/cli/`) — plan Faza 5a.
18. **OpenAPI / Swagger** — `@nestjs/swagger` w kontrolerach i DTO (`src/swagger/`); jeden dokument obejmuje **natywny czat**, **models**, **health** oraz **fasady** OpenAI/Anthropic (osobne `securitySchemes`: `GatewayKeyAuth`, `BearerAuth`, `ApiKeyAuth`); dekoratory błędów: `ApiGatewayChatErrorResponses`, `ApiGatewayModelsErrorResponses`, `ApiOpenAiErrorResponses`, `ApiAnthropicErrorResponses`. UI: `/api/v1/api-docs`, JSON: `/api/v1/swagger.json`; eksport: `npm run openapi:export` → `openapi.json`; env `SWAGGER_ENABLED` — `konfiguracja.md`, `dokumentacja_api.md`.
19. **ModelsModule** (`src/models/`) — natywny `GET /api/v1/models` + `GET /api/v1/models/:modelAlias`; wspólny katalog `GatewayModelsCatalogService` (odczyt `gateway.config.yaml`, bez wywołań SDK); fasady OpenAI/Anthropic mapują `GatewayModelDto` przez `openai-models.mapper.ts` / `anthropic-models.mapper.ts`. Błędy natywne: `ErrorEnvelope`; nieznany alias → **404** + `MODEL_ALIAS_NOT_FOUND` (czat z nieznanym aliasem nadal **400**). Szczegóły: `dokumentacja_api.md`, `lista_endpointów.md`, `integracje.md`.
20. **Fasady integracji (IDE)** — równoległe API OpenAI i Anthropic nad tym samym `ChatService` (`src/integrations/`). **Fasada ≠ provider runtime:** `/api/v1/openai/*` i `/api/v1/anthropic/*` to kształty kontraktów HTTP (standardy dla Cursor / Claude Code), **nie** gwarancja backendu OpenAI.com ani Anthropic — routing LLM wyłącznie przez `modelAlias` w YAML. Adapter runtime OpenAI (`type: openai`, `openai-compatible`) jest **wdrożony** w `src/providers/`. Szczegóły: **`dictionary.md`** (sekcja „Fasada vs provider runtime”), `integracje.md`, `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`, **`provider-openai-runtime.md`**.
21. **CLI** — osobny entry point `bin/`, moduł `src/cli/` bez `ConfigModule`; wizard **`gateway config:init`**, `config:validate` / `config:show`, CRUD providerów (multi-instance), modeli i klientów, `provider:test`, `key:generate`. Backup mutacji YAML → katalog `backup/`. Uruchomienie: `npm run cli`, `npx gateway`, opcjonalnie `npm link` → `gateway`. Szczegóły: **`CLI.md`**, `architektura-katalogi-pliki.md` (sekcja 2a), `architektura.md`.
22. **Wdrożenie** — Docker Compose w `deployment/` (multi-stage Dockerfile, modularne compose: MVP, Redis, monitoring, Ollama, dev); szablony `deployment/templates/`; skrypty `npm run docker:*`, `make docker-*`. Szczegóły: **`deployment.md`**.
23. **Testy** — cztery warstwy: jednostkowe runtime (`npm test`, **91** zestawów / **1220** przypadków, bez `src/cli/`), jednostkowe CLI (`npm run test:cli`, **12** / **62**), E2E HTTP mock (`test/e2e/`, **10** / **105**), integracyjne live SDK+Redis (`test/integration/`, **15** zestawów, `npm run test:integration`); `npm run test:all` = runtime + E2E — **`testy.md`** (single source of truth dla liczników).

## Spis plików

- `../openapi.json` _(w katalogu głównym repo, v0.14.0)_ — OpenAPI 3.1: kontrakt REST (czat natywny + SSE, **models**, health, fasady `/openai/*` i `/anthropic/*`, `ErrorEnvelope` + kształty błędów vendora, `RATE_LIMITED` / `PROVIDER_RATE_LIMITED`, smart rate limit, cache, tooling). **Generowany z kodu** (`src/swagger/export-openapi.ts`, dekoratory `@Api*` na kontrolerach/DTO). Źródło prawdy dla zachowania: `src/` + ten katalog `docs/`.
- `dokumentacja_koncepcyjna.md` — cel produktu, zakres (MVP / v1), założenia.
- `architektura.md` — widok logiczny, moduły, warstwy, integracje providerów.
- `architektura_api.md` — styl API, envelope błędów, requestId, streaming.
- `lista_endpointów.md` — szybka lista endpointów (standard + streaming).
- `dokumentacja_api.md` — szczegółowy kontrakt endpointów, przykłady payloadów.
- `conversation-tracking.md` — `conversationId`, tryby Sentry (pojedyncza wiadomość vs konwersacja), przepływ tura 1→2, obowiązki klienta.
- `konfiguracja.md` — env + `gateway.config.yaml` (wizard `config:init`, wczytywanie przy starcie, walidacja Zod, klucze providerów **per `apiKeyRef`** w YAML); `gateway config:validate` vs `npm run config:validate`; opcjonalnie **`CACHE_*`** / **`REDIS_*`**.
- `data_flow.md` — przepływ danych (Mermaid) dla standard/stream.
- `dictionary.md` — słownik pojęć, kody błędów, **macierz parametrów generacji ↔ provider** (Anthropic / Google / OpenAI / OpenAI-compatible).
- `brand-types.md` — brand types TypeScript (Fazy 0–5 wdrożone w runtime): katalog typów, konwencje `create*` / `as*`, granica DTO vs serwisy, mocki testowe.
- `anty-patterny.md` — na co uważać, czego nie robić.
- `integracje.md` — architektura fasad OpenAI / Anthropic (IDE), auth, rate limit, stan wdrożenia.
- `integracja-openai-kontrakt.md` — **fasada** kontraktu OpenAI: podłączenie Cursor (Base URL `/api/v1/openai`); models + chat/completions (JSON i stream).
- `provider-openai-runtime.md` — **adapter runtime** OpenAI (`type: openai`, `openai-compatible`, `src/providers/`) — wdrożony, mapowanie SDK, status.
- `integracja-anthropic-messages.md` — **fasada** kontraktu Anthropic: podłączenie Claude Code (Base URL `/api/v1/anthropic`); models + messages (JSON i stream).
- `architektura-katalogi-pliki.md` — drzewo katalogów repo, w tym **CLI** (`bin/`, `src/cli/`, sekcja 2a).
- `CLI.md` — dokumentacja Gateway CLI (18 komend: `config:*`, `provider:*`, `model:*`, `client:*`, `key:generate`; wizard, backup w `backup/`, uruchomienie).
- `deployment.md` — wdrożenie Docker Compose (`deployment/`), szablony z `deployment/templates/`, warianty stacku (MVP, Redis, monitoring), checklist produkcyjny.
- `testy.md` — testy jednostkowe (runtime + CLI), E2E i integracyjne; skrypty `npm test`, `npm run test:cli`, `npm run test:e2e`, `npm run test:integration`, `npm run test:all`.

## Specyfikacje (SDD)

Katalog `spec/` zawiera pliki `SPEC-*.md`, z wymaganiami funkcjonalnymi i niefunkcjonalnymi oraz kryteriami akceptacji.
