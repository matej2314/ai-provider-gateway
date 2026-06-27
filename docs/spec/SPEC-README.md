## Specyfikacje (Spec‑Driven Development)

Ten katalog zawiera **specyfikacje obszarów** systemu (1 plik = 1 obszar). Pliki są pisane w duchu **Spec‑Driven Development**: skupiają się na **WHAT/WHY** (co system ma robić i po co), a nie na implementacji.

**Kontrakt HTTP w repozytorium:** `openapi.json` (OpenAPI 3.1, v0.13.0, generowany: `npm run openapi:export`) — czat natywny, health (`checks.redis`), fasady OpenAI/Anthropic.
**Stan kodu vs te dokumenty:** zestawienie w `docs/dokumentacja_api.md`. **Rdzeń MVP (Fazy 1–2, 4):** zamknięty w kodzie. **Faza 3 / 5 / 6 (wybrane):** konfiguracja YAML, envelope błędów, `params`, tooling, **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`**, gateway key, **`x-request-id`** (body + nagłówek odpowiedzi), observability (Pino, Sentry, readiness, graceful shutdown), **OpenAPI/Swagger** (`src/swagger/`, dekoratory na fasadach IDE) — **wdrożone**. **Walidacja offline configu:** `npm run config:validate` — **wdrożone** (`konfiguracja.md`). **System prompt**, **cache odpowiedzi**, **conversation tracking** — wdrożone (`konfiguracja.md`, `conversation-tracking.md`). **Fasady integracji IDE** (OpenAI / Anthropic) — wdrożone w MVP (`docs/integracje.md`, `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`).

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
- `SPEC-PROVIDERS.md` — fabryki providerów, multi-instance, rejestr i normalizacja SDK.
- `SPEC-KONFIGURACJA.md` — konfiguracja plug&play (`gateway.config.yaml` + env), m.in. klucze providerów **per `apiKeyRef`** oraz spójność `providers` ↔ `models` (F-3b, F-3c).
- `SPEC-HEALTH.md` — liveness/readiness.

