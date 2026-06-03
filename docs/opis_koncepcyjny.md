# AI Provider Gateway

## Opis koncepcyjny

> Ten dokument został zastąpiony przez `docs/dokumentacja_koncepcyjna.md` (bardziej spójny układ i kompatybilność ze strukturą dokumentacji z `notesapp_nest_backend`).
>
> Zachowano go jako “alias” historyczny. Źródło prawdy: `docs/dokumentacja_koncepcyjna.md`.

AI Provider Gateway to backendowe API pełniące rolę warstwy pośredniej (gateway / orchestrator) pomiędzy aplikacjami klienckimi a różnymi dostawcami modeli LLM (Large Language Models).  
Projekt abstrahuje integrację z konkretnymi providerami AI i udostępnia jednolity, spójny interfejs API do komunikacji z wybranym modelem.

Aplikacja została zaprojektowana jako projekt skoncentrowany na architekturze, separacji odpowiedzialności, testowalności oraz gotowości do dalszego rozwoju.

---

## Główny cel projektu

Celem projektu jest:

- zaprojektowanie **skalowalnej i rozszerzalnej architektury backendowej** z wykorzystaniem NestJS,
- **integracja z zewnętrznymi API jako abstrakcja**,
- wykorzystanie wzorców takich jak:
  - Gateway / Adapter
  - Strategy
  - Dependency Injection
- stworzenie solidnej bazy pod system, który w przyszłości może obsługiwać:
  - wielu providerów,
  - różne modele,
  - różne polityki kosztowe i limity.

A także stać się pełnoprawnym mikroserwisem większego systemu.

---

## Główne założenia

### 1. Jednolity interfejs API

- Klient komunikuje się z jednym endpointem niezależnie od wybranego providera.
- Zmiana modelu lub dostawcy nie wymaga zmian po stronie klienta.

### 2. Abstrakcja providerów AI

- Każda **instancja** providera w YAML (`providerInstance`) to osobny obiekt `AIProvider` z własnym kluczem API; ten sam **`type`** (np. `google`) może wystąpić wielokrotnie z różnymi `apiKeyRef`.
- Logika biznesowa nie zna szczegółów implementacyjnych zewnętrznych API.

### 3. Konfigurowalność

- Wybór providera i modelu odbywa się:
  - przez konfigurację środowiskową,
  - lub parametry żądania.
- Klucze API są zarządzane wyłącznie po stronie serwera; w **production** walidacja env wymaga **co najmniej jednego** niepustego klucza spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (szczegóły: `docs/konfiguracja.md`, `src/config/env.validation.ts`). Do wywołań faktycznych providerów potrzebny jest klucz dla używanego aliasu.

### 4. Architektura modułowa

- Wyraźny podział na:
  - warstwę API (controllers),
  - warstwę aplikacyjną (services / use cases),
  - warstwę integracyjną (providers — fabryki, bootstrap, rejestr).
- Każdy moduł ma jasno określoną odpowiedzialność.

### 5. Testowalność

- Logika domenowa jest testowalna bez realnych wywołań zewnętrznych API.
- Providerzy mogą być mockowani w testach jednostkowych.

---

## Zakres funkcjonalny

Źródło prawdy: **`docs/dokumentacja_koncepcyjna.md`**:

- **Status projektu:** Rdzeń **MVP** (routing + chat + streaming) domknięty w Fazach 1–2 oraz 4; trwa **v1** (m.in. Fazy 3 oraz 5–7).
- **Providery (MVP):** Anthropic API + Google Gemini API
- **Cel MVP:** działające **kierowanie zapytań do providerów** (registry / routing), działający **chat** synchroniczny (`POST /api/v1/chat`) oraz działający **streaming** (SSE / `POST /api/v1/chat/stream`).
- **v1:** m.in. konfiguracja z plików (Faza 3), utwardzenie kontraktu API (Faza 5 — w kodzie m.in. `RATE_LIMITED`, nagłówek `x-request-id`, OpenAPI/Swagger z `@nestjs/swagger`), observability (Faza 6 — wdrożone), polish i deploy (Faza 7), wizard CLI `config:init`; cache odpowiedzi i smart rate limit (`src/cache/`, `src/rate-limit/`) — szczegóły w **`dokumentacja_koncepcyjna.md`**.

---

## Poza zakresem (na tym etapie)

- autoryzacja użytkowników,
- rozliczenia i billing,
- przechowywanie historii konwersacji,
- deployment produkcyjny.

---

## Wartość projektowa

Projekt demonstruje:

- świadome podejście do architektury backendu,
- umiejętność projektowania systemów integrujących wiele zewnętrznych usług,
- znajomość NestJS poza poziomem CRUD,
- myślenie systemowe.

---

## Zobacz też

- `dokumentacja_koncepcyjna.md`
- `architektura.md`
- `dokumentacja_api.md`
- `integracje.md` — fasady API dla IDE (OpenAI / Anthropic)
