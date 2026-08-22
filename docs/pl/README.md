# Dokumentacja — AI Provider Gateway

Dokumentacja projektu **AI Provider Gateway** (NestJS) w języku polskim: koncepcja, architektura, kontrakty API, konfiguracja, wdrożenie i narzędzia.

> **Języki:** ten katalog (`docs/pl/`) zawiera wersję polską. Docelowo natywna dokumentacja angielska trafi bezpośrednio do `docs/` (poza `pl/`).

## Dystrybucja i kontrybucje

Projekt jest na licencji **MIT** — możesz klonować, forkować, modyfikować i wdrażać gateway we własnej infrastrukturze.

**Upstream nie przyjmuje zewnętrznych kontrybucji** — pull requesty od osób trzecich nie są mergowane. Własne zmiany utrzymuj w forku. Klonowanie w celach rekrutacyjnych (portfolio, code review) jest mile widziane.

Szczegóły: [`dokumentacja_koncepcyjna.md`](dokumentacja_koncepcyjna.md) (sekcja „Model repozytorium”), [`README.md`](../../README.md) (sekcja „Dystrybucja”).

## Jak czytać tę dokumentację

1. **Pierwsze uruchomienie** — skopiuj `gateway.config.example.yaml` → `gateway.config.yaml` oraz `.env.example` → `.env`, potem uzupełnij sekrety / zastąp placeholdery, albo uruchom `gateway config:init` ([`konfiguracja.md`](konfiguracja.md), [`CLI.md`](CLI.md)); Docker: [`deployment.md`](deployment.md).
2. **Koncepcja** — [`dokumentacja_koncepcyjna.md`](dokumentacja_koncepcyjna.md) (WHAT / WHY, zakres produktu).
3. **Architektura** — [`architektura.md`](architektura.md) (moduły i granice), [`architektura_api.md`](architektura_api.md) (konwencje HTTP), [`architektura_katalogi_pliki.md`](architektura_katalogi_pliki.md) (drzewo repo).
4. **API** — kontrakt: [`openapi.json`](../../openapi.json) (generowany: `npm run openapi:export`); Swagger UI: `/api/v1/api-docs`; opis ludzki: [`lista_endpointów.md`](lista_endpointów.md), [`dokumentacja_api.md`](dokumentacja_api.md).
5. **Konfiguracja i przepływy** — [`konfiguracja.md`](konfiguracja.md), [`data_flow.md`](data_flow.md), [`conversation_tracking.md`](conversation_tracking.md).
6. **Fasady oficjalnych kontraktów** — fasada ≠ adapter runtime ([`dictionary.md`](dictionary.md)); [`integracje.md`](integracje.md), [`integracja_openai_kontrakt.md`](integracja_openai_kontrakt.md), [`integracja_anthropic_messages.md`](integracja_anthropic_messages.md), [`provider_openai_runtime.md`](provider_openai_runtime.md).
7. **Operacje** — [`CLI.md`](CLI.md), [`deployment.md`](deployment.md), [`testy.md`](testy.md), [`anty_patterny.md`](anty_patterny.md).

## Spis plików

| Plik | Opis |
|------|------|
| [`dokumentacja_koncepcyjna.md`](dokumentacja_koncepcyjna.md) | Cel produktu, odbiorcy, zakres, założenia |
| [`opis_koncepcyjny.md`](opis_koncepcyjny.md) | Alias → `dokumentacja_koncepcyjna.md` |
| [`architektura.md`](architektura.md) | Moduły, warstwy, observability, bezpieczeństwo |
| [`architektura_api.md`](architektura_api.md) | Styl API, envelope błędów, streaming, auth |
| [`architektura_katalogi_pliki.md`](architektura_katalogi_pliki.md) | Drzewo katalogów i odpowiedzialności |
| [`lista_endpointów.md`](lista_endpointów.md) | Szybka lista endpointów |
| [`dokumentacja_api.md`](dokumentacja_api.md) | Szczegółowy kontrakt HTTP i przykłady |
| [`conversation_tracking.md`](conversation_tracking.md) | `conversationId` i Sentry Conversations |
| [`konfiguracja.md`](konfiguracja.md) | Env, YAML, cache, rate limit, walidacja |
| [`data_flow.md`](data_flow.md) | Przepływy danych (Mermaid) |
| [`dictionary.md`](dictionary.md) | Słownik pojęć, kody błędów, macierz parametrów |
| [`brand_types.md`](brand_types.md) | Brand types TypeScript |
| [`anty_patterny.md`](anty_patterny.md) | Pułapki i praktyki do unikania |
| [`integracje.md`](integracje.md) | Architektura fasad OpenAI / Anthropic |
| [`integracja_openai_kontrakt.md`](integracja_openai_kontrakt.md) | Fasada oficjalnego kontraktu OpenAI |
| [`integracja_anthropic_messages.md`](integracja_anthropic_messages.md) | Fasada oficjalnego kontraktu Anthropic |
| [`provider_openai_runtime.md`](provider_openai_runtime.md) | Adapter runtime OpenAI / openai-compatible |
| [`CLI.md`](CLI.md) | Gateway CLI (`gateway <namespace>:<action>`) |
| [`deployment.md`](deployment.md) | Docker Compose i deploy VPS (GitHub Actions) |
| [`testy.md`](testy.md) | Warstwy testów i skrypty npm (SoT liczników) |
| [`openapi.json`](../../openapi.json) | OpenAPI 3.1 (v0.14.0) — kontrakt REST |
| [`SECURITY.md`](../../SECURITY.md) | Polityka bezpieczeństwa |

## Wybrane tematy

| Temat | Gdzie |
|-------|--------|
| Fasada vs provider runtime | [`dictionary.md`](dictionary.md), [`integracje.md`](integracje.md) |
| System prompt (pliki serwerowe) | [`konfiguracja.md`](konfiguracja.md), [`architektura.md`](architektura.md) |
| Tool calling / `finishReason` | [`dokumentacja_api.md`](dokumentacja_api.md), [`dictionary.md`](dictionary.md) |
| Cache i smart rate limit | [`konfiguracja.md`](konfiguracja.md) |
| Retry, timeout, fallback | [`konfiguracja.md`](konfiguracja.md), [`dokumentacja_api.md`](dokumentacja_api.md) |
| Observability (Pino, Sentry, Prometheus) | [`architektura.md`](architektura.md), [`deployment.md`](deployment.md) |
| Testy (92 / 1248 jednostkowych runtime) | [`testy.md`](testy.md) |

## Specyfikacje (SDD)

Katalog [`spec/`](spec/) zawiera pliki `SPEC-*.md` (wymagania i kryteria akceptacji). Jest przewidziany do usunięcia lub migracji — przy pracy nad kontraktem API preferuj `src/`, [`openapi.json`](../../openapi.json) i dokumenty powyżej.
