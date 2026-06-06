# Dokumentacja koncepcyjna — AI Provider Gateway

## Cel produktu

AI Provider Gateway to backendowe API pełniące rolę **warstwy pośredniej (gateway/proxy)** pomiędzy aplikacjami klienckimi a różnymi dostawcami modeli LLM (Large Language Models).

Najważniejsza wartość:

- **Plug&play**: użytkownik konfiguruje klucze i modele, a następnie korzysta z jednego, stabilnego API.
- **Unifikacja kontraktu**: spójne request/response niezależne od providera.
- **Odporność i operacyjność**: timeouty, retry, normalizacja błędów, requestId, obserwowalność.

Projekt powstaje jako ćwiczenie NestJS, architektury i wzorców projektowych, ale docelowo ma być **w pełni działającym i skalowalnym mikroserwisem**.

## Dla kogo jest system

| Segment | Potrzeba |
|---------|----------|
| **Użytkownik (developer / zespół)** | Szybko uruchomić gateway lokalnie lub w swojej infrastrukturze; używać własnych kluczy do OpenAI/Anthropic/Google; mieć przewidywalne API. |
| **Integrator / platform team** | Ustandaryzować integrację z LLM w organizacji, spiąć limity, logi, requestId, polityki retry i timeouts. |
| **Operacje / DevOps** | Statyczne, proste wdrożenie; konfiguracja przez env + pliki; healthchecki; logi na stdout. |

## Zakres produktu (MVP i v1)

Poniższy opis definiuje **MVP** i **v1** w rozumieniu tego repozytorium. Kontrakt HTTP: **`openapi.json`** oraz `dokumentacja_api.md`.

**Pierwsze uruchomienie:** repozytorium zawiera `gateway.config.placeholder.yaml` jako wzorzec — przed startem serwera uruchom `gateway config:init`, aby wygenerować właściwy plik `gateway.config.yaml` (szczegóły: `konfiguracja.md`, `CLI.md`).

- **Status projektu:** Rdzeń **MVP** (routing + chat + streaming) domknięty w Fazach 1–2 oraz 4; Faza 0 zamknięta. Trwa **v1** (m.in. Fazy 3 oraz 5–7 według tabeli w planie).
- **Providery (MVP):** Anthropic API + Google Gemini API
- **Cel MVP:** Działające **kierowanie zapytań do providerów** (registry / routing), działający **chat** synchroniczny (`POST /api/v1/chat`) oraz działający **streaming** (SSE / `POST /api/v1/chat/stream`).
- **v1:** Wszystko ponadto — m.in. konfiguracja z plików (Faza 3 — wdrożona), utwardzenie kontraktu API (Faza 5 — w większości wdrożona; pozostałość: CORS), observability (Faza 6 — wdrożona), polish i deploy (Faza 7), **fasady integracji IDE** (OpenAI + Anthropic Messages API — wdrożone w MVP, `integracje.md`; pełne dopasowanie kontraktu vendora — kolejne iteracje), oraz pozostałe elementy poza rdzeniem MVP.

**Podział MVP / v1:** Rdzeń MVP realizują **Fazy 1–2** oraz **4** (routing, chat, streaming). **Faza 3** i **Fazy 5–7** traktuj jako **v1** — numeracja faz jest chronologiczna w projekcie, nie równa się kolejności „MVP najpierw”.

### Stan realizacji (skrót)

- **Endpoint czatu standardowego** `POST /api/v1/chat` — zaimplementowany; opcjonalnie **cache odpowiedzi** (`src/cache/`, env — `konfiguracja.md`).
- **Streaming** (`POST /api/v1/chat/stream`, SSE) — zaimplementowany; envelope `ErrorEnvelope` — **wdrożony**. **Gateway key** + opcjonalny **smart rate limit** — **wdrożony** (`@GatewayKeyAndSmartRateLimit()`; kody **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`** — `dictionary.md`). **Readiness**, **logging/metrics** (Pino, Sentry), **graceful shutdown** — **wdrożone** (Faza 6 w planie). **`params` w body**, **policy `timeoutMs` / `retry` + fallback**, **nagłówek odpowiedzi `x-request-id`** — **wdrożone**. **OpenAPI / Swagger** — dekoratory `@nestjs/swagger`, eksport `npm run openapi:export`, UI `/api/v1/api-docs` — **wdrożone** (kontrakt natywny). **Fasady IDE** (`src/integrations/`) — `IntegrationsModule`; trasy `/api/v1/openai/…`, `/api/v1/anthropic/…` — **wdrożone** (`integracje.md`). **Walidacja offline konfiguracji:** `npm run config:validate` oraz **`gateway config:validate`** — **wdrożone** (`konfiguracja.md`). **CLI v1** — wizard `config:init` + komendy zarządzania configiem, providerami, modelami, klientami, testy SDK, `key:generate` — **wdrożone** (`CLI.md`).
- **Fasady integracji** — moduł `src/integrations/` (OpenAI API dla Cursor, Anthropic Messages dla Claude Code); wspólny silnik `ChatService` — patrz `integracje.md`.
- **Providery** Anthropic i Google Gemini — fabryki SDK, bootstrap per `providerInstance` i rejestr zaimplementowane.
- **Konfiguracja z plików** (`gateway.config.yaml`) — wczytywanie i walidacja przy starcie zaimplementowane (**Faza 3** w planie; wg nagłówka planu jest to część **v1**, nie rdzenia MVP). Rozszerzona walidacja grafu `providers` ↔ `models` (fail-fast) — `konfiguracja.md`, `spec/SPEC-KONFIGURACJA.md` (F-3b, F-3c).
- Klucze API w `.env`; **w production** obowiązuje **co najmniej jeden** niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`).
- Policy z YAML: **`params`** w `resolveProviderCallOptions`; **`timeoutMs` / `retry` / `fallback`** w `ResilientExecutor` (`dokumentacja_api.md`, `konfiguracja.md`); fail‑fast przy braku/błędzie pliku konfiguracyjnego — działa.
- Spójny format błędów (**envelope `ErrorEnvelope`**) — **wdrożone** (`GlobalExceptionFilter`). **`requestId`**: propagacja w body, logach i **nagłówku odpowiedzi** `x-request-id` (`RequestIdMiddleware`). Mapowanie błędów SDK (`provider-error.mapper.ts`) — **wdrożone** dla Anthropic/Google (`PROVIDER_*`); limity gateway — **`RATE_LIMITED`** (`SmartRateLimitGuard`, cooldown w `ChatService`).
- Testy jednostkowe przy modułach (`*.spec.ts`).

## Poza zakresem (wybrane wykluczenia na start)

- Autoryzacja użytkowników końcowych (AuthN/AuthZ) — gateway jest narzędziem dla infrastruktury użytkownika.
- Billing / rozliczenia — koszty ponosi użytkownik przez własne klucze.
- Przechowywanie historii konwersacji (persistence).
- Własny “tool runner” MCP (wykonywanie narzędzi) — na start tylko konfiguracja/kontrakt (patrz `mcp.md`).

## Główne założenia

### 1) Gateway, nie “open proxy”

- Endpointy providerów są **zaszyte** w fabrykach SDK (`src/providers/factories/`).
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
- Adaptery providerów mogą być mockowane.

## Trzy powierzchnie API (kierunek v1)

| Klient | Kontrakt | Przykładowe trasy |
|--------|----------|-------------------|
| Aplikacja / BFF | Natywny gateway | `POST /api/v1/chat`, `POST /api/v1/chat/stream` |
| Cursor IDE | OpenAI-compatible | `GET/POST /api/v1/openai/…` |
| Claude Code | Anthropic Messages | `GET/POST /api/v1/anthropic/…` |

Wszystkie trzy delegują do **`ChatService`** (jeden silnik: cache, retry, fallback, limity). Szczegóły: `integracje.md`.

## Kierunek rozwoju (v1 i dalej)

- **Fasady IDE** — **wdrożone** (`src/integrations/`); rozszerzenia kontraktu (tools, pełny `usage`, …) — kolejne iteracje.
- **System prompt po stronie serwera** — **wdrożone**: pliki w `src/config/system-prompt/`, brak roli `system` w API; szczegóły w `konfiguracja.md` i `architektura.md`.
- **Cache / Redis** — cache odpowiedzi (`src/cache/`) i smart rate limit (`src/rate-limit/`, wspólny `RedisConnectionService` gdy Redis załadowany) — `konfiguracja.md`. Metryki LLM — `MetricsService` / Sentry (Faza 6 wdrożona).
- OpenAI jako trzeci provider (wymaga płatnego konta API).
- Retry/circuit‑breaker i metryki per provider.
- **CLI developerskie** — pełny zestaw komend v1 wdrożony (`CLI.md`): wizard `config:init`, `config:validate` / `config:show`, CRUD providerów (multi-instance), modeli, klientów, `provider:test`, `key:generate`. Walidacja offline także: `npm run config:validate`.
- “Policy packs”: profile ustawień per środowisko (dev/prod) i per alias modelu.
- Opcjonalnie: SDK klienta, OpenAPI, przykłady integracji.

---

*Dokument żywy — wersjonowany razem z kodem. Zmiany kontraktów API wymagają aktualizacji `dokumentacja_api.md`, `lista_endpointów.md` i specyfikacji w `spec/`.*

