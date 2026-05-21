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
10. **Smart rate limiting**, **readiness**, **logging/metrics** — wdrożone; szczegóły: `konfiguracja.md`, `architektura.md`.
11. **Śledzenie rozmów (`conversationId`)** — response zawsze z ID; Sentry Conversations tylko przy ID w request (zalecany start od tury 2 + pełne `messages[]`); szczegóły: `conversation-tracking.md`.
12. **Parametry generacji (`params`)** — opcjonalne `temperature` / `maxOutputTokens` w body; merge z `policy.params` w YAML (`resolveProviderCallOptions`); szczegóły: `konfiguracja.md`, `dokumentacja_api.md`.

## Spis plików

- `../openapi.json` *(w katalogu głównym repo, v0.9.0)* — OpenAPI 3.1: kontrakt REST zsynchronizowany z kodem (czat + opcjonalne `params`, `securitySchemes.GatewayKeyAuth`, streaming SSE, health, envelope `ErrorEnvelope`).
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

