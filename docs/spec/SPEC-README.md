## Specyfikacje (Spec‑Driven Development)

Ten katalog zawiera **specyfikacje obszarów** systemu (1 plik = 1 obszar). Pliki są pisane w duchu **Spec‑Driven Development**: skupiają się na **WHAT/WHY** (co system ma robić i po co), a nie na implementacji.

**Kontrakt HTTP w repozytorium:** `openapi.json` (OpenAPI 3.1).  
**Stan kodu vs te dokumenty:** zestawienie w `docs/dokumentacja_api.md`. **Faza 4 SSE:** zamknięta w kodzie. **Faza 5:** m.in. `params` w body + `config:validate` + ewentualne dalsze usprawnienia; envelope `ErrorEnvelope`, propagacja `x-request-id`, **gateway key (`X-Gateway-Key`)**, limity DTO (`messages` 1–50, `content` max 3000) oraz kody **`MODEL_ALIAS_NOT_FOUND`** / **`STREAMING_NOT_SUPPORTED`** w payloadach — **wdrożone**; **Faza 6:** observability w toku — `dokumentacja_koncepcyjna.md`. **System prompt** składany po stronie serwera — wdrożony (`konfiguracja.md`, `architektura.md`). **Cache odpowiedzi** dla `POST /api/v1/chat` — wdrożony (`src/cache/`, `konfiguracja.md`); dalszy rozwój Redis: `dokumentacja_koncepcyjna.md`. **Conversation tracking** (`conversationId`, Sentry: pojedyncza wiadomość vs konwersacja od ID w request) — wdrożony (`conversation-tracking.md`, `SPEC-CHAT.md` F-9).

### Jak czytać te pliki

- **Cel / problem**: po co istnieje obszar i jaką wartość daje.
- **Użytkownicy i scenariusze**: typowe przepływy użycia.
- **Wymagania funkcjonalne**: testowalne, ponumerowane wymagania.
- **Wymagania niefunkcjonalne**: bezpieczeństwo, prywatność, spójność kontraktów, limity.
- **Kryteria akceptacji**: obserwowalne warunki spełnienia (checklista / Given‑When‑Then).
- **Poza zakresem**: czego obszar nie obejmuje w **rdzeniu MVP** (Fazy 1–2, 4 — por. `dokumentacja_koncepcyjna.md`).

### Obszary

- `SPEC-PLATFORMA-I-KONTRAKTY.md` — wspólne kontrakty: requestId, błędy, logi, podstawy konfiguracji.
- `SPEC-CHAT.md` — endpoint standardowego czatu (`POST /chat`).
- `SPEC-CHAT-STREAMING.md` — streaming SSE (`POST /chat/stream`).
- `SPEC-PROVIDERS.md` — adaptery providerów (Anthropic/Google Gemini) i normalizacja.
- `SPEC-KONFIGURACJA.md` — konfiguracja plug&play (`gateway.config.yaml` + env), m.in. wymóg **minimum jednego** klucza API w **production** wg `env.validation.ts`.
- `SPEC-HEALTH.md` — liveness/readiness.

