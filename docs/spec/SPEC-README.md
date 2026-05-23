## Specyfikacje (Spec‑Driven Development)

Ten katalog zawiera **specyfikacje obszarów** systemu (1 plik = 1 obszar). Pliki są pisane w duchu **Spec‑Driven Development**: skupiają się na **WHAT/WHY** (co system ma robić i po co), a nie na implementacji.

**Kontrakt HTTP w repozytorium:** `openapi.json` (OpenAPI 3.1, generowany: `npm run openapi:export`).  
**Stan kodu vs te dokumenty:** zestawienie w `docs/dokumentacja_api.md`. **Rdzeń MVP (Fazy 1–2, 4):** zamknięty w kodzie. **Faza 3 / 5 / 6 (wybrane):** konfiguracja YAML, envelope błędów, `params`, **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`**, gateway key, **`x-request-id`** (body + nagłówek odpowiedzi), observability (Pino, Sentry, readiness, graceful shutdown), **OpenAPI/Swagger** (`src/swagger/`) — **wdrożone**. **Pozostałość v1:** `npm run config:validate` (placeholder), CORS (`CORS_ORIGINS` bez implementacji). **System prompt**, **cache odpowiedzi**, **conversation tracking** — wdrożone (`konfiguracja.md`, `conversation-tracking.md`).

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
- `SPEC-KONFIGURACJA.md` — konfiguracja plug&play (`gateway.config.yaml` + env), m.in. wymóg **minimum jednego** klucza API w **production** wg `env.validation.ts` oraz spójność `providers` ↔ `models` (F-3b, F-3c).
- `SPEC-HEALTH.md` — liveness/readiness.

