# Dokumentacja — AI Provider Gateway

Ten katalog zawiera dokumentację projektu **AI Provider Gateway** (NestJS): koncepcję, architekturę, kontrakty API oraz specyfikacje w duchu **Spec‑Driven Development**.

## Jak czytać tę dokumentację

1. Zacznij od `dokumentacja_koncepcyjna.md` (WHAT/WHY).
2. Następnie `architektura.md` (moduły i granice) oraz `architektura_api.md` (konwencje API).
3. Dla szczegółów HTTP: `lista_endpointów.md` i `dokumentacja_api.md`.
4. Dla konfiguracji “plug&play”: `konfiguracja.md` + `mcp.md`.
5. Dla przepływów: `data_flow.md`.
6. Dla ryzyk: `anty-patterny.md`.
7. Dla pracy spec‑first: katalog `spec/`.

## Spis plików

- `dokumentacja_koncepcyjna.md` — cel produktu, zakres MVP, założenia.
- `architektura.md` — widok logiczny, moduły, warstwy, integracje providerów.
- `architektura_api.md` — styl API, envelope błędów, requestId, streaming.
- `lista_endpointów.md` — szybka lista endpointów (standard + streaming).
- `dokumentacja_api.md` — szczegółowy kontrakt endpointów, przykłady payloadów.
- `konfiguracja.md` — env + pliki konfiguracyjne modeli/polityk (m.in. wymóg **minimum jednego** klucza: Anthropic lub Google — patrz `src/config/env.validation.ts`).
- `mcp.md` — integracja MCP (konfiguracja i granice odpowiedzialności).
- `data_flow.md` — przepływ danych (Mermaid) dla standard/stream.
- `dictionary.md` — słownik pojęć i kody błędów.
- `anty-patterny.md` — na co uważać, czego nie robić.

## Specyfikacje (SDD)

Katalog `spec/` zawiera pliki `SPEC-*.md`, z wymaganiami funkcjonalnymi i niefunkcjonalnymi oraz kryteriami akceptacji.

