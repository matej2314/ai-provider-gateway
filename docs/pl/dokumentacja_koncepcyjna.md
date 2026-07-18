# Dokumentacja koncepcyjna — AI Provider Gateway

## Cel produktu

AI Provider Gateway to backendowe API pełniące rolę **warstwy pośredniej (gateway/proxy)** pomiędzy aplikacjami klienckimi a różnymi dostawcami modeli LLM (Large Language Models).

Najważniejsza wartość:

- **Plug&play**: użytkownik konfiguruje klucze i modele, a następnie korzysta z jednego, stabilnego API.
- **Unifikacja kontraktu**: spójne request/response niezależne od providera.
- **Odporność i operacyjność**: timeouty, retry, normalizacja błędów, requestId, obserwowalność.

Projekt jest **działającym mikroserwisem** NestJS — ćwiczeniem architektury i wzorców projektowych, a jednocześnie gotowym do uruchomienia w infrastrukturze użytkownika.

## Dla kogo jest system

| Segment | Potrzeba |
|---------|----------|
| **Użytkownik (developer / zespół)** | Szybko uruchomić gateway lokalnie lub w swojej infrastrukturze; używać własnych kluczy do **Anthropic, Google i OpenAI** (providery runtime); korzystać z fasady **OpenAI** dla IDE (Cursor); mieć przewidywalne API. |
| **Integrator / platform team** | Ustandaryzować integrację z LLM w organizacji, spiąć limity, logi, requestId, polityki retry i timeouts. |
| **Operacje / DevOps** | Statyczne, proste wdrożenie; konfiguracja przez env + pliki; healthchecki; logi na stdout. |
| **Rekruter / reviewer** | Klonowanie repozytorium i przegląd kodu (portfolio) — bez konieczności forkowania ani wysyłania PR. |

## Model repozytorium (open source, bez kontrybucji upstream)

Repozytorium jest **publiczne** i na licencji **MIT**, ale **nie jest projektem community-driven**:

- **Dozwolone:** `git clone`, fork na własny GitHub, modyfikacje i deploy na własnej infrastrukturze, użycie kodu zgodnie z MIT.
- **Niedozwolone / nieakceptowane:** pull requesty i inne próby mergowania zmian do **upstream** (oryginalnego repozytorium autora) przez osoby trzecich.
- **Własny rozwój:** sforkuj repozytorium i utrzymuj zmiany wyłącznie we **swojej kopii** — upstream pozostaje pod kontrolą maintainera.

Ten model nie ogranicza użytkowania produktu — ogranicza wyłącznie współtworzenie kodu w oryginalnym remote. Skrót: [`README.md`](../../README.md) (sekcja „Dystrybucja”), [`README.md`](README.md) (sekcja „Dystrybucja i kontrybucje”).

## Zakres produktu

Poniższy opis definiuje zakres produktu w rozumieniu tego repozytorium. Kontrakt HTTP: **[`openapi.json`](../../openapi.json)** oraz `dokumentacja_api.md`.

**Pierwsze uruchomienie:** uzupełnij `.env` i `gateway.config.yaml` albo uruchom `gateway config:init` przed startem serwera (szczegóły: `konfiguracja.md`, `CLI.md`).

- **Produkt:** Rdzeń obejmuje routing, chat i streaming. Warstwa operacyjna dodaje konfigurację z plików, observability, polish, deploy oraz fasady integracji IDE (OpenAI + Anthropic Messages API). Dalsze dopasowanie kontraktów vendora — opcjonalne rozszerzenia.
- **Providery:** Anthropic API, Google Gemini API, OpenAI API oraz `openai-compatible` (np. Ollama).
- **Czat:** synchroniczny `POST /api/v1/chat` oraz streaming SSE `POST /api/v1/chat/stream`.

## Funkcje produktu (skrót)

| Funkcjonalność | Zakres |
|----------------|--------|
| Natywne API (`/chat`, `/chat/stream`) | Routing, JSON i SSE |
| Fasada OpenAI (Cursor IDE) | `/api/v1/openai/*` |
| Fasada Anthropic (Claude Code) | `/api/v1/anthropic/*` |
| Tool calling | Definicje i wywołania narzędzi w czacie |
| Extended thinking (reasoning models) | Parametry thinking / reasoning |
| Response caching (Redis) | Cache odpowiedzi `POST /chat` |
| Smart rate limiting | Limity per klucz klienta |

**Podsumowanie:** Wymienione funkcje są częścią produktu. Architektura i integracje: `architektura.md`, `integracje.md`, `testy.md`.

### Zakres funkcjonalny (skrót)

- **Endpoint czatu standardowego** `POST /api/v1/chat` — opcjonalnie **cache odpowiedzi** (`src/cache/`, walidacja odczytu `CachedChatResponseSchema`, env — `konfiguracja.md`).
- **Streaming** (`POST /api/v1/chat/stream`, SSE) — envelope `ErrorEnvelope`. **Gateway key** + opcjonalny **smart rate limit** (`@GatewayKeyAndSmartRateLimit()`; kody **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`** — `dictionary.md`). **Readiness**, **logging/metrics** (Pino, Sentry), **graceful shutdown**. **`params` w body**, **policy `timeoutMs` / `retry` + fallback**, **nagłówek odpowiedzi `x-request-id`**. **OpenAPI / Swagger** — dekoratory `@nestjs/swagger` na czacie, health i fasadach IDE; jeden [`openapi.json`](../../openapi.json) (tagi Health, Chat, OpenAI API, Anthropic API); eksport `npm run openapi:export`, UI `/api/v1/api-docs`. **Fasady IDE** (`src/integrations/`) — `IntegrationsModule`; trasy `/api/v1/openai/…`, `/api/v1/anthropic/…` (`integracje.md`). **Walidacja offline konfiguracji:** `npm run config:validate` oraz **`gateway config:validate`** (`konfiguracja.md`). **CLI** — wizard `config:init` + komendy zarządzania configiem, providerami, modelami, klientami, testy SDK, `key:generate` (`CLI.md`).
- **Fasady integracji** — moduł `src/integrations/` (OpenAI API dla Cursor, Anthropic Messages dla Claude Code); wspólny silnik `ChatService` — patrz `integracje.md`.
- **Providery** Anthropic, Google Gemini oraz OpenAI (`openai`, `openai-compatible`) — fabryki SDK, bootstrap per `providerInstance` i rejestr.
- **Konfiguracja z plików** (`gateway.config.yaml`) — wczytywanie i walidacja przy starcie. Rozszerzona walidacja grafu `providers` ↔ `models` (fail-fast) — `konfiguracja.md`, `spec/SPEC-KONFIGURACJA.md` (F-3b, F-3c).
- Klucze API w `.env` pod **`apiKeyRef`** z YAML (per włączona instancja providera); CLI synchronizuje opcjonalnie legacy `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` — `konfiguracja.md`.
- Policy z YAML: **`params`** w `resolveProviderCallOptions`; **`timeoutMs` / `retry` / `fallback`** w `ResilientExecutor` z anulowaniem in-flight przez **`AbortSignal`** (`dokumentacja_api.md`, `konfiguracja.md`); fail‑fast przy braku/błędzie pliku konfiguracyjnego.
- Spójny format błędów (**envelope `ErrorEnvelope`**) — `GlobalExceptionFilter`. **`requestId`**: propagacja w body, logach i **nagłówku odpowiedzi** `x-request-id` (`RequestIdMiddleware`). Mapowanie błędów SDK (`provider-error.mapper.ts`) dla Anthropic/Google/OpenAI (`PROVIDER_*`); limity gateway — **`RATE_LIMITED`** (`SmartRateLimitGuard`: RPS/streamy; cooldown: `prepareRequestForExecution` + `ChatErrorHandlerService`).
- Testy jednostkowe przy modułach (`src/**/*.spec.ts`, `npm test`).
- Testy E2E HTTP (`test/e2e/`, `npm run test:e2e`, `npm run test:all`) — kontrakt natywnego czatu (w tym cache, stream), fasad OpenAI/Anthropic (w tym tooling, thinking) z mockowanymi providerami — **`testy.md`**.
- Testy security HTTP (`test/security/`, `npm run test:security`) — auth bypass, Helmet, information disclosure, rate limit, fuzzing property-based — **`testy.md`**; w deploy produkcyjnym: `npm run deploy:production`.

## Poza zakresem produktu

- Autoryzacja użytkowników końcowych (AuthN/AuthZ) — gateway jest narzędziem dla infrastruktury użytkownika.
- Billing / rozliczenia — koszty ponosi użytkownik przez własne klucze.
- Przechowywanie historii konwersacji (persistence).
- Własny „tool runner” MCP (wykonywanie narzędzi) — poza zakresem rdzenia; gateway nie uruchamia serwerów MCP ani narzędzi po stronie serwera.

## Główne założenia

### 1) Gateway, nie “open proxy”

- Endpointy providerów Anthropic i Google są **zaszyte** w fabrykach SDK (`src/providers/factories/`). Typy **`openai`** / **`openai-compatible`** używają konfigurowalnego **`baseUrlRef`** w env (walidowany URL http(s) — np. api.openai.com, Ollama); szczegóły: `provider_openai_runtime.md`, `konfiguracja.md`.
- Konfiguracja nie pozwala dowolnie ustawiać URL/headers w sposób, który zmieniłby usługę w ogólny proxy HTTP.

### 2) Modele jako aliasy (preferowane)

Zamiast zmuszać klientów do podawania vendorowego `modelId`, gateway wspiera **aliasy modeli** (np. `chat-default`, `chat-fast`), mapowane na:

- provider (instancja),
- dokładny `modelId`,
- polityki i limity.

### 3) Dwa tryby wykonania: standard i streaming

- Standard: odpowiedź zwracana jako JSON w jednym payloadzie.
- Streaming: odpowiedź jako strumień zdarzeń (SSE) zgodny z kontraktem gateway (niekoniecznie 1:1 z formatem providera).

### 4) Walidacja na brzegu

- Body requestów walidowane w DTO.
- Konfiguracja env i plików walidowana przy starcie.

### 5) Testowalność

- Logika wyboru providera/modelu oraz mapowanie parametrów jest testowalne bez realnych wywołań providerów.
- Adaptery providerów mogą być mockowane (jednostkowo i w E2E — `testy.md`).

## Trzy powierzchnie API

| Klient | Kontrakt | Przykładowe trasy |
|--------|----------|-------------------|
| Aplikacja / BFF | Natywny gateway | `POST /api/v1/chat`, `POST /api/v1/chat/stream` |
| Cursor IDE | OpenAI-compatible | `GET/POST /api/v1/openai/…` |
| Claude Code | Anthropic Messages | `GET/POST /api/v1/anthropic/…` |

Wszystkie trzy delegują do **`ChatService`** (jeden silnik: cache, retry, fallback, limity). Szczegóły: `integracje.md`.

### Powierzchnia HTTP vs silnik LLM

Gateway rozdziela **fasadę integracji** (kształt kontraktu HTTP dla narzędzi) od **providera runtime** (adapter SDK w `src/providers/`). Fasada OpenAI lub Anthropic **nie gwarantuje**, że wywołanie LLM trafi do tego samego vendora — routing jest wyłącznie konfiguracyjny (`modelAlias` → `providerInstance` w YAML).

| Powierzchnia | Format kontraktu HTTP | Backend LLM (wywołanie SDK) |
|--------------|----------------------|----------------------------|
| Natywny `/api/v1/chat` | Kontrakt gateway (`modelAlias`, `messages`, `params`) | Adapter wskazany przez alias w YAML (dowolny włączony `providerInstance`) |
| Fasada OpenAI `/api/v1/openai/*` | Kształt OpenAI Chat Completions API (standard dla IDE, np. Cursor) | **Nie** api.openai.com z definicji fasady — ten sam silnik `ChatService`; backend z YAML |
| Fasada Anthropic `/api/v1/anthropic/*` | Kształt Anthropic Messages API (standard dla IDE, np. Claude Code) | **Nie** API Anthropic z definicji fasady — backend z YAML (np. Anthropic, Google, …) |

Pole `model` w fasadach = `modelAlias` z `gateway.config.yaml` (nie vendorowy `modelId`). Auth na fasadach: klucz **klienta gateway** (Bearer / `x-api-key`), nie klucz vendora.

Szczegóły: `integracje.md`, `dictionary.md` (sekcja „Fasada vs provider runtime”), `integracja_openai_kontrakt.md`, `integracja_anthropic_messages.md`.

## Dalszy rozwój (opcjonalnie)

Elementy świadomie **poza bieżącym zakresem** lub jako możliwe rozszerzenia:

- dalsze dopasowanie kontraktów vendora na fasadach (pełny `usage`, edge-case’y tools),
- metryki per provider; circuit breaker,
- tryb non-interactive CLI,
- “policy packs” (profile per środowisko / alias),
- opcjonalne SDK klienta i przykłady integracji.

Funkcje już obecne w produkcie (fasady IDE, system prompt, cache/Redis, rate limit, adapter OpenAI, CLI, observability) opisują dokumenty: `architektura.md`, `konfiguracja.md`, `CLI.md`, `provider_openai_runtime.md`.

---

*Dokument wersjonowany razem z kodem. Zmiany kontraktów API wymagają aktualizacji `dokumentacja_api.md`, `lista_endpointów.md` oraz — dopóki istnieje — katalogu `spec/`.*

