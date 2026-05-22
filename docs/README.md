# Dokumentacja — AI Provider Gateway

Ten katalog zawiera dokumentację projektu **AI Provider Gateway** (NestJS): koncepcję, architekturę, kontrakty API oraz specyfikacje w duchu **Spec‑Driven Development**.

## Jak czytać tę dokumentację

1. Zacznij od `dokumentacja_koncepcyjna.md` (WHAT/WHY).
2. Następnie `architektura.md` (moduły i granice) oraz `architektura_api.md` (konwencje API).
3. Dla szczegółów HTTP: **kontrakt** w `openapi.json` (katalog główny repo), oraz opis ludzki: `lista_endpointów.md` i `dokumentacja_api.md`.
4. Dla konfiguracji “plug&play”: `konfiguracja.md` + `mcp.md`.
5. Dla przepływów: `data_flow.md`.
6. Dla ryzyk: `anty-patterny.md`.
7. Dla pracy spec‑first: katalog `spec/`.
8. **System prompt po stronie serwera** (wyłączenie `role=system` w API, pliki w `src/config/system-prompt/`) — opis warstw i ścieżek: `konfiguracja.md`, `architektura.md`, `dokumentacja_api.md`.
9. **Cache odpowiedzi czatu** (`src/cache/`, env `CACHE_*` / `REDIS_*`) — wdrożony dla **`POST /api/v1/chat`**; szczegóły: `konfiguracja.md`.
10. **Smart rate limiting** (`src/rate-limit/`, Redis; bez `@nestjs/throttler`), kody błędów **`RATE_LIMITED`** vs **`PROVIDER_RATE_LIMITED`** — `dictionary.md`; limity: YAML `clients[].rateLimit` lub env; szczegóły: `konfiguracja.md`, `architektura.md`.
11. **Request ID** — propagacja w body, logach i **nagłówku odpowiedzi** `x-request-id` (`RequestIdMiddleware`).
12. **Observability** — logging/metrics (Pino, Sentry), readiness, graceful shutdown — `architektura.md`.
13. **Śledzenie rozmów (`conversationId`)** — response zawsze z ID; Sentry Conversations tylko przy ID w request (zalecany start od tury 2 + pełne `messages[]`); szczegóły: `conversation-tracking.md`.
14. **Parametry generacji (`params`)** — opcjonalne `temperature` / `maxOutputTokens` w body; merge z `policy.params` w YAML (`resolveProviderCallOptions`); szczegóły: `konfiguracja.md`, `dokumentacja_api.md`.
15. **Odporność (retry, timeout, fallback)** — `ResilientExecutor` + `models[].fallback` w YAML; opcjonalne `effectiveModelAlias` w odpowiedzi; szczegóły: `konfiguracja.md`, `dokumentacja_api.md`, `dictionary.md`.
16. **Moduł czatu** — `ChatService` (cache, limity, odpowiedź gateway) + `ChatProviderCallService` (adaptery, metryki, SSE); helpery w `src/chat/helpers/` — `architektura-katalogi-pliki.md`, `data_flow.md`.

## Spis plików

- `../openapi.json` *(w katalogu głównym repo, v0.12.0)* — OpenAPI 3.1: kontrakt REST (czat, SSE, health, `ErrorEnvelope`, `RATE_LIMITED` / `PROVIDER_RATE_LIMITED`, smart rate limit, cache). Źródło prawdy dla zachowania: `src/` + ten katalog `docs/`.
- `dokumentacja_koncepcyjna.md` — cel produktu, zakres (MVP / v1), założenia.
- `architektura.md` — widok logiczny, moduły, warstwy, integracje providerów.
- `architektura_api.md` — styl API, envelope błędów, requestId, streaming.
- `lista_endpointów.md` — szybka lista endpointów (standard + streaming).
- `dokumentacja_api.md` — szczegółowy kontrakt endpointów, przykłady payloadów.
- `conversation-tracking.md` — `conversationId`, tryby Sentry (pojedyncza wiadomość vs konwersacja), przepływ tura 1→2, obowiązki klienta.
- `konfiguracja.md` — env + `gateway.config.yaml` (wczytywanie przy starcie, walidacja Zod i spójność `providers` ↔ `models`); w **production** wymóg **minimum jednego** klucza Anthropic lub Google (`src/config/env.validation.ts`); opcjonalnie **`CACHE_*`** / **`REDIS_*`** dla cache odpowiedzi czatu; skrypt `npm run config:validate` — wpis w `package.json` (obecnie placeholder; docelowo walidacja offline).
- `mcp.md` — integracja MCP (konfiguracja i granice odpowiedzialności).
- `data_flow.md` — przepływ danych (Mermaid) dla standard/stream.
- `dictionary.md` — słownik pojęć i kody błędów.
- `anty-patterny.md` — na co uważać, czego nie robić.

## Specyfikacje (SDD)

Katalog `spec/` zawiera pliki `SPEC-*.md`, z wymaganiami funkcjonalnymi i niefunkcjonalnymi oraz kryteriami akceptacji.

