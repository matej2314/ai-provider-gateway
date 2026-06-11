# Dokumentacja — AI Provider Gateway

Ten katalog zawiera dokumentację projektu **AI Provider Gateway** (NestJS): koncepcję, architekturę, kontrakty API oraz specyfikacje w duchu **Spec‑Driven Development**.

## Jak czytać tę dokumentację

0. **Po sklonowaniu repozytorium:** uzupełnij `.env` i `gateway.config.yaml` albo uruchom `gateway config:init` — wizard generuje konfigurację z szablonów CLI (`konfiguracja.md` sekcja 0, `CLI.md`).
1. Zacznij od `dokumentacja_koncepcyjna.md` (WHAT/WHY).
2. Następnie `architektura.md` (moduły i granice) oraz `architektura_api.md` (konwencje API).
3. Dla szczegółów HTTP: **kontrakt** w `openapi.json` (katalog główny repo; generowany z kodu — `npm run openapi:export`), interaktywnie **Swagger UI** (`/api/v1/api-docs`), oraz opis ludzki: `lista_endpointów.md` i `dokumentacja_api.md`.
4. Dla konfiguracji “plug&play”: `konfiguracja.md` + `mcp.md`.
5. Dla przepływów: `data_flow.md`.
6. Dla ryzyk: `anty-patterny.md`.
7. Dla pracy spec‑first: katalog `spec/`.
8. **System prompt po stronie serwera** (brak `role=system` w API, pliki w `src/config/system-prompt/`) — opis warstw: `konfiguracja.md`, `architektura.md`, `dokumentacja_api.md`.
8a. **Tool calling** — role `tool`, pole `tooling`, `toolCalls` / `finishReason` w odpowiedzi; `capabilities.tools` w YAML; kody `TOOLS_NOT_SUPPORTED` — `dokumentacja_api.md`, `dictionary.md`.
9. **Cache odpowiedzi czatu** (`src/cache/`, env `CACHE_*` / `REDIS_*`) — wdrożony dla **`POST /api/v1/chat`**; szczegóły: `konfiguracja.md`.
10. **Smart rate limiting** (`src/rate-limit/`, Redis; bez `@nestjs/throttler`), kody błędów **`RATE_LIMITED`** vs **`PROVIDER_RATE_LIMITED`** — `dictionary.md`; limity: YAML `clients[].rateLimit` lub env; szczegóły: `konfiguracja.md`, `architektura.md`.
11. **Request ID** — propagacja w body, logach i **nagłówku odpowiedzi** `x-request-id` (`RequestIdMiddleware`).
12. **Observability** — logging/metrics (Pino, Sentry), readiness, graceful shutdown — `architektura.md`.
13. **Śledzenie rozmów (`conversationId`)** — response zawsze z ID; Sentry Conversations tylko przy ID w request (zalecany start od tury 2 + pełne `messages[]`); szczegóły: `conversation-tracking.md`.
14. **Parametry generacji (`params`)** — opcjonalne pola w body; merge z `policy.params` w YAML (`resolveProviderCallOptions`); **macierz wsparcia per provider** (Anthropic / Google / OpenAI planowany): `dictionary.md`, reguły konfiguracji YAML: `konfiguracja.md`; API: `dokumentacja_api.md`.
15. **Odporność (retry, timeout, fallback)** — `ResilientExecutor` + `models[].fallback` w YAML; opcjonalne `effectiveModelAlias` w odpowiedzi; szczegóły: `konfiguracja.md`, `dokumentacja_api.md`, `dictionary.md`.
16. **Moduł czatu** — `ChatService` (cache, limity, odpowiedź gateway) + `ChatProviderCallService` (adaptery, metryki, SSE); helpery w `src/chat/helpers/` — `architektura-katalogi-pliki.md`, `data_flow.md`.
17. **OpenAPI / Swagger** — `@nestjs/swagger` w kontrolerach i DTO (`src/swagger/`); jeden dokument obejmuje **natywny czat**, **health** oraz **fasady** OpenAI/Anthropic (osobne `securitySchemes`: `GatewayKeyAuth`, `BearerAuth`, `ApiKeyAuth`); dekoratory błędów: `ApiGatewayChatErrorResponses`, `ApiOpenAiErrorResponses`, `ApiAnthropicErrorResponses`. UI: `/api/v1/api-docs`, JSON: `/api/v1/swagger.json`; eksport: `npm run openapi:export` → `openapi.json`; env `SWAGGER_ENABLED` — `konfiguracja.md`, `dokumentacja_api.md`.
18. **Fasady integracji (IDE)** — równoległe API OpenAI i Anthropic nad tym samym `ChatService` (`src/integrations/`); **OpenAI** — `integracja-openai-kontrakt.md` (Cursor); **Anthropic** — `integracja-anthropic-messages.md` (Claude Code / klient Messages API); przegląd: `integracje.md`.
19. **CLI** — osobny entry point `bin/`, moduł `src/cli/` bez `ConfigModule`; wizard **`gateway config:init`**, `config:validate` / `config:show`, CRUD providerów (multi-instance), modeli i klientów, `provider:test`, `key:generate`. Backup mutacji YAML → katalog `backup/`. Uruchomienie: `npm run cli`, `npx gateway`, opcjonalnie `npm link` → `gateway`. Szczegóły: **`CLI.md`**, `architektura-katalogi-pliki.md` (sekcja 2a), `architektura.md`.

## Spis plików

- `../openapi.json` *(w katalogu głównym repo, v0.12.0)* — OpenAPI 3.1: kontrakt REST (czat natywny + SSE, health, fasady `/openai/*` i `/anthropic/*`, `ErrorEnvelope` + kształty błędów vendora, `RATE_LIMITED` / `PROVIDER_RATE_LIMITED`, smart rate limit, cache, tooling). **Generowany z kodu** (`src/swagger/export-openapi.ts`, dekoratory `@Api*` na kontrolerach/DTO). Źródło prawdy dla zachowania: `src/` + ten katalog `docs/`.
- `dokumentacja_koncepcyjna.md` — cel produktu, zakres (MVP / v1), założenia.
- `architektura.md` — widok logiczny, moduły, warstwy, integracje providerów.
- `architektura_api.md` — styl API, envelope błędów, requestId, streaming.
- `lista_endpointów.md` — szybka lista endpointów (standard + streaming).
- `dokumentacja_api.md` — szczegółowy kontrakt endpointów, przykłady payloadów.
- `conversation-tracking.md` — `conversationId`, tryby Sentry (pojedyncza wiadomość vs konwersacja), przepływ tura 1→2, obowiązki klienta.
- `konfiguracja.md` — env + `gateway.config.yaml` (wizard `config:init`, wczytywanie przy starcie, walidacja Zod w `gateway-config.schema.ts` i spójność `providers` ↔ `models`); w **production** wymóg **minimum jednego** klucza Anthropic lub Google (`src/config/env.validation.ts`); opcjonalnie **`CACHE_*`** / **`REDIS_*`** dla cache odpowiedzi czatu; skrypt `npm run config:validate` — walidacja offline (YAML + reguły env) bez uruchamiania serwera.
- `mcp.md` — integracja MCP (konfiguracja i granice odpowiedzialności).
- `data_flow.md` — przepływ danych (Mermaid) dla standard/stream.
- `dictionary.md` — słownik pojęć, kody błędów, **macierz parametrów generacji ↔ provider** (Anthropic / Google / OpenAI planowany).
- `anty-patterny.md` — na co uważać, czego nie robić.
- `integracje.md` — architektura fasad OpenAI / Anthropic (IDE), auth, rate limit, stan wdrożenia.
- `integracja-openai-kontrakt.md` — podłączenie Cursor (Base URL `/api/v1/openai`); models + chat/completions (JSON i stream).
- `integracja-anthropic-messages.md` — podłączenie Claude Code (Base URL `/api/v1/anthropic`); models + messages (JSON i stream).
- `architektura-katalogi-pliki.md` — drzewo katalogów repo, w tym **CLI** (`bin/`, `src/cli/`, sekcja 2a).
- `CLI.md` — dokumentacja Gateway CLI (18 komend: `config:*`, `provider:*`, `model:*`, `client:*`, `key:generate`; wizard, backup w `backup/`, uruchomienie).

## Specyfikacje (SDD)

Katalog `spec/` zawiera pliki `SPEC-*.md`, z wymaganiami funkcjonalnymi i niefunkcjonalnymi oraz kryteriami akceptacji.

