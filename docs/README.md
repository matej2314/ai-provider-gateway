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
8. Dla harmonogramu i faz rozwoju: `PLAN_IMPLEMENTACJI.md` (w katalogu głównym repo).
9. **System prompt po stronie serwera** (wyłączenie `role=system` w API, pliki w `src/config/system-prompt/`) — wdrożone w kodzie; dokumentacja refaktoru: `SYSTEM_PROMPTS_REFACTOR-READY.md` (w katalogu głównym repo).
10. Opcjonalna warstwa **cache / Redis** (port + adapter; start po Fazie 6): `REDIS_IMPLEMENTATION_PLAN.md` (w katalogu głównym repo).

## Spis plików

- `../openapi.json` *(w katalogu głównym repo)* — OpenAPI 3.1: kontrakt REST zsynchronizowany z kodem (czat, streaming SSE, health, błędy NestJS).
- `dokumentacja_koncepcyjna.md` — cel produktu, zakres produktu (nagłówek `PLAN_IMPLEMENTACJI.md`: MVP / v1), założenia.
- `architektura.md` — widok logiczny, moduły, warstwy, integracje providerów.
- `architektura_api.md` — styl API, envelope błędów, requestId, streaming.
- `lista_endpointów.md` — szybka lista endpointów (standard + streaming).
- `dokumentacja_api.md` — szczegółowy kontrakt endpointów, przykłady payloadów.
- `konfiguracja.md` — env + `gateway.config.yaml` (wczytywanie przy starcie); w **production** wymóg **minimum jednego** klucza Anthropic lub Google (`src/config/env.validation.ts`); skrypt `npm run config:validate` — wpis w `package.json`, implementacja w planie (Faza 5).
- `mcp.md` — integracja MCP (konfiguracja i granice odpowiedzialności).
- `data_flow.md` — przepływ danych (Mermaid) dla standard/stream.
- `dictionary.md` — słownik pojęć i kody błędów.
- `anty-patterny.md` — na co uważać, czego nie robić.

## Specyfikacje (SDD)

Katalog `spec/` zawiera pliki `SPEC-*.md`, z wymaganiami funkcjonalnymi i niefunkcjonalnymi oraz kryteriami akceptacji.

