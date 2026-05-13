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

- **Status projektu:** Rdzeń **MVP** (routing + chat + streaming) domknięty w Fazach 1–2 oraz 4; Faza 0 zamknięta. Trwa **v1** (m.in. Fazy 3 oraz 5–7 według tabeli w planie).
- **Providery (MVP):** Anthropic API + Google Gemini API
- **Cel MVP:** Działające **kierowanie zapytań do providerów** (registry / routing), działający **chat** synchroniczny (`POST /api/v1/chat`) oraz działający **streaming** (SSE / `POST /api/v1/chat/stream`).
- **v1:** Wszystko ponadto — m.in. konfiguracja z plików (Faza 3), utwardzenie błędów i kontraktu API (Faza 5), observability (Faza 6), polish i deploy (Faza 7), oraz pozostałe elementy planu poza rdzeniem MVP.

**Podział MVP / v1:** Rdzeń MVP realizują **Fazy 1–2** oraz **4** (routing, chat, streaming). **Faza 3** i **Fazy 5–7** traktuj jako **v1** — numeracja faz jest chronologiczna w projekcie, nie równa się kolejności „MVP najpierw”.

### Stan realizacji (skrót)

- **Endpoint czatu standardowego** `POST /api/v1/chat` — zaimplementowany; opcjonalnie **cache odpowiedzi** (`src/cache/`, env — `konfiguracja.md`).
- **Streaming** (`POST /api/v1/chat/stream`, SSE) — zaimplementowany; envelope błędów `ErrorEnvelope` — **wdrożony** (`GlobalExceptionFilter` global). **Gateway key** (`X-Gateway-Key` na endpointach czatu) — **wdrożony** (`GatewayKeyGuard`). Pozostałe rozszerzenia kontraktu API (`params` w body, rozszerzenie mappingu kodów, response header `x-request-id`) — **Faza 5** (plan).
- **Providery** Anthropic i Google Gemini — adaptery i rejestr zaimplementowane.
- **Konfiguracja z plików** (`gateway.config.yaml`) — wczytywanie i walidacja przy starcie zaimplementowane (**Faza 3** w planie; wg nagłówka planu jest to część **v1**, nie rdzenia MVP).
- Klucze API w `.env`; **w production** obowiązuje **co najmniej jeden** niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`).
- Pełne odwzorowanie policy z YAML w adapterach — **stopniowo dopinane** (`spec/SPEC-PROVIDERS.md`, `dokumentacja_api.md`); fail‑fast przy braku/błędzie pliku konfiguracyjnego — działa.
- Spójny format błędów (**envelope `ErrorEnvelope`**) — **wdrożone** (`GlobalExceptionFilter` global). Propagacja nagłówka żądania **`x-request-id`** do `requestId` w body — **wdrożone** (`RequestIdInterceptor` global). Rozszerzenie mappingu kodów na pełny słownik (`dictionary.md`) oraz ustawianie response header `x-request-id` — **Faza 5**.
- Testy jednostkowe przy modułach (`*.spec.ts`).

## Poza zakresem (wybrane wykluczenia na start)

- Autoryzacja użytkowników końcowych (AuthN/AuthZ) — gateway jest narzędziem dla infrastruktury użytkownika.
- Billing / rozliczenia — koszty ponosi użytkownik przez własne klucze.
- Przechowywanie historii konwersacji (persistence).
- Własny “tool runner” MCP (wykonywanie narzędzi) — na start tylko konfiguracja/kontrakt (patrz `mcp.md`).

## Główne założenia

### 1) Gateway, nie “open proxy”

- Endpointy providerów są **zaszyte** w adapterach.
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

## Kierunek rozwoju (v1 i dalej)

- **System prompt po stronie serwera** — **wdrożone**: pliki w `src/config/system-prompt/`, brak roli `system` w API; szczegóły w `konfiguracja.md` i `architektura.md`.
- **Cache / Redis** — **odpowiedzi czatu standardowego:** moduł `src/cache/` (backend `noop` / `redis`, konfiguracja env w `konfiguracja.md`). Dalszy rozwój (limity, metryki itd.): ten dokument (sekcja „Kierunek rozwoju”) oraz `spec/SPEC-KONFIGURACJA.md` / `konfiguracja.md` tam, gdzie dotyczy env.
- OpenAI jako trzeci provider (wymaga płatnego konta API).
- Retry/circuit‑breaker i metryki per provider.
- “Policy packs”: profile ustawień per środowisko (dev/prod) i per alias modelu.
- Opcjonalnie: SDK klienta, OpenAPI, przykłady integracji.

---

*Dokument żywy — wersjonowany razem z kodem. Zmiany kontraktów API wymagają aktualizacji `dokumentacja_api.md`, `lista_endpointów.md` i specyfikacji w `spec/`.*

