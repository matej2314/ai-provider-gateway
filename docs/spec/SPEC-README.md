## Specyfikacje (Spec‑Driven Development)

Ten katalog zawiera **specyfikacje obszarów** systemu (1 plik = 1 obszar). Pliki są pisane w duchu **Spec‑Driven Development**: skupiają się na **WHAT/WHY** (co system ma robić i po co), a nie na implementacji.

**Kontrakt HTTP w repozytorium:** `openapi.json` (OpenAPI 3.1).  
**Stan kodu vs te dokumenty:** zestawienie w `docs/dokumentacja_api.md`, harmonogram w `PLAN_IMPLEMENTACJI.md` (**Faza 4 SSE:** zamknięta w planie; **Faza 5:** `params` w body + `config:validate` + limity DTO/body + rozszerzenie mappingu kodów — envelope `ErrorEnvelope`, propagacja `x-request-id` oraz **gateway key (`X-Gateway-Key`)** na czacie są **wdrożone**; **Faza 6:** observability w toku), kontrakt promptów serwerowych — ✅ wg `SYSTEM_PROMPTS_REFACTOR-READY.md`, opcjonalny cache/Redis — `REDIS_IMPLEMENTATION_PLAN.md`.

### Jak czytać te pliki

- **Cel / problem**: po co istnieje obszar i jaką wartość daje.
- **Użytkownicy i scenariusze**: typowe przepływy użycia.
- **Wymagania funkcjonalne**: testowalne, ponumerowane wymagania.
- **Wymagania niefunkcjonalne**: bezpieczeństwo, prywatność, spójność kontraktów, limity.
- **Kryteria akceptacji**: obserwowalne warunki spełnienia (checklista / Given‑When‑Then).
- **Poza zakresem**: czego obszar nie obejmuje w **rdzeniu MVP** (Fazy 1–2, 4 — por. nagłówek `PLAN_IMPLEMENTACJI.md`).

### Obszary

- `SPEC-PLATFORMA-I-KONTRAKTY.md` — wspólne kontrakty: requestId, błędy, logi, podstawy konfiguracji.
- `SPEC-CHAT.md` — endpoint standardowego czatu (`POST /chat`).
- `SPEC-CHAT-STREAMING.md` — streaming SSE (`POST /chat/stream`).
- `SPEC-PROVIDERS.md` — adaptery providerów (Anthropic/Google Gemini) i normalizacja.
- `SPEC-KONFIGURACJA.md` — konfiguracja plug&play (`gateway.config.yaml` + env), m.in. wymóg **minimum jednego** klucza API w **production** wg `env.validation.ts`.
- `SPEC-HEALTH.md` — liveness/readiness.

