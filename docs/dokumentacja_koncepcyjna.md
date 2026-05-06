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

## Zakres MVP

MVP obejmuje:

- **Dwa endpointy czatu**:
  - standardowa odpowiedź (pełna, JSON),
  - **streaming** (SSE / strumień zdarzeń).
- Integracja z co najmniej dwoma providerami:
  - **Anthropic**,
  - **Google Gemini**.
- Konfiguracja “plug&play”:
  - klucze API i sekrety w `.env`,
  - modele / aliasy / polityki w pliku(ach) konfiguracyjnych,
  - walidacja konfiguracji przy starcie (fail‑fast).
- Spójny format błędów (envelope) i requestId.
- Podstawowe testy jednostkowe warstwy wyboru providera i mapowania request/response.

## Poza zakresem MVP (na start)

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

## Kierunek po MVP (orientacyjnie)

- OpenAI jako trzeci provider (wymaga płatnego konta API).
- Retry/circuit‑breaker i metryki per provider.
- “Policy packs”: profile ustawień per środowisko (dev/prod) i per alias modelu.
- Opcjonalnie: SDK klienta, OpenAPI, przykłady integracji.

---

*Dokument żywy — wersjonowany razem z kodem. Zmiany kontraktów API wymagają aktualizacji `dokumentacja_api.md`, `lista_endpointów.md` i specyfikacji w `spec/`.*

