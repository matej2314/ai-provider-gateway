---
wersja: 6
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-29
---

## Specyfikacje (Spec‑Driven Development)

Ten katalog (`spec/` w rootcie repozytorium) zawiera **specyfikacje obszarów** systemu (1 plik = 1 obszar). Pliki skupiają się na **WHAT/WHY** (co system ma robić i po co), a nie na implementacji. Są **uszczegółowieniem** dokumentacji, nie jej zamiennikiem.

**Kontrakt HTTP:** `openapi.json` (OpenAPI 3.1, v0.14.0, generowany: `npm run openapi:export`).
**Dokumentacja:** kanoniczna EN w `docs/`; PL w `docs/pl/`. Opis HTTP: `docs/pl/dokumentacja_api.md` / `docs/api-documentation.md`. Lista tras: `docs/pl/lista_endpointów.md` / `docs/endpoints.md`.

**Stan kodu vs ten zestaw:** obszary poniżej są **wdrożone** w `src/` i opisane w odpowiadających `SPEC-*.md`. Cache exact/semantic (JSON + stream, wspólny magazyn, first-writer-wins `SET NX` / `HSETNX`): `SPEC-CHAT.md` F-8–F-8d, F-10; streaming SSE + replay: `SPEC-CHAT-STREAMING.md` F-10; fasady `X-Gateway-Cache` na JSON i streamie: `SPEC-FASADY.md` F-1a. Env: `SPEC-KONFIGURACJA.md` F-1d.

### Jak czytać te pliki

- **Cel / problem**: po co istnieje obszar i jaką wartość daje.
- **Użytkownicy i scenariusze**: typowe przepływy użycia.
- **Wymagania funkcjonalne**: testowalne, ponumerowane wymagania.
- **Wymagania niefunkcjonalne**: bezpieczeństwo, spójność kontraktów, limity.
- **Kryteria akceptacji**: obserwowalne warunki spełnienia.
- **Poza zakresem**: czego obszar nie obejmuje.

### Obszary (ten zestaw)

- `SPEC-PLATFORMA-I-KONTRAKTY.md` — wspólne kontrakty: requestId, błędy, walidacja, gateway key, smart rate limit, logi / error reporting, Helmet, limit body, Swagger UI, shutdown.
- `SPEC-CHAT.md` — endpoint standardowego czatu (`POST /chat`), cache exact-match i semantyczny (first-writer-wins), metryki LLM (Sentry).
- `SPEC-CHAT-STREAMING.md` — streaming SSE (`POST /chat/stream`), sloty równoległych streamów, cache + replay SSE.
- `SPEC-PROVIDERS.md` — fabryki providerów, multi-instance, rejestr i normalizacja SDK.
- `SPEC-KONFIGURACJA.md` — konfiguracja plug&play (`gateway.config.yaml` + env), w tym `clients` i limity.
- `SPEC-HEALTH.md` — liveness/readiness.
- `SPEC-MODELS.md` — natywny katalog `GET /models`.
- `SPEC-FASADY.md` — kontrakty HTTP OpenAI / Anthropic (`src/integrations/`), w tym `X-Gateway-Cache` na JSON i streamie.
- `SPEC-CLI.md` — CLI `gateway <namespace>:<action>`.
- `SPEC-METRYKI.md` — `GET /metrics` (Prometheus).

Adaptery runtime OpenAI: `SPEC-PROVIDERS.md` oraz `docs/pl/provider_openai_runtime.md` / `docs/provider-openai-runtime.md`.
Konfiguracja: `docs/pl/konfiguracja.md` / `docs/configuration.md`.
Conversation tracking: `docs/pl/conversation_tracking.md` / `docs/conversation-tracking.md`.
Integracje fasad: `docs/pl/integracje.md` / `docs/integrations.md`.
CLI: `docs/pl/CLI.md` / `docs/command_line_interface.md`.
