---
wersja: 3
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-26
---

# SPEC — Health (liveness/readiness)

## Cel / problem

Zapewnić endpoint zdrowia do lokalnego uruchamiania i orchestracji w infrastrukturze użytkownika.

## Użytkownicy i scenariusze

### Scenariusz A — local dev

Użytkownik uruchamia gateway i sprawdza, czy działa: `GET /api/v1/health` (globalny prefiks `API_GLOBAL_PREFIX` w `src/setup.app.ts`).

### Scenariusz B — orchestrator

Orchestrator odpyta health endpointy, aby zdecydować, czy instancja jest gotowa obsługiwać ruch. Probe ocenia pole `status` w body readiness, nie kod HTTP.

## Wymagania funkcjonalne

F-1. `GET /api/v1/health` zwraca `200` i lekki JSON (liveness):

```json
{
  "status": "healthy",
  "timestamp": "2026-05-19T12:00:00.000Z"
}
```

Uwagi:

- `timestamp` to ISO 8601 UTC (`new Date().toISOString()` w `HealthService.getLiveness` / `evaluateReadiness`).
- Endpoint nie wymaga `X-Gateway-Key` i **nie** podlega smart rate limitowi (`SPEC-PLATFORMA-I-KONTRAKTY.md` F-13 / F-16).

F-1b. `GET /api/v1/health/ready` zwraca readiness: `status` (`ready` | `not_ready`), `timestamp`, `version`, `uptime`, `checks.config`, `checks.cache`, oraz **warunkowo** `checks.redis`. Implementacja: `HealthService.evaluateReadiness` / `getReadiness`. **HTTP zawsze 200**. Bez `X-Gateway-Key` i bez smart rate limitu (jak liveness).

- **`checks.config`**: zawsze obecny.
- **`checks.cache`**: zawsze obecny — stan feature cache odpowiedzi (noop / inny backend / zależność od Redis gdy backend to redis).
- **`checks.redis`**: pole **obecne tylko gdy Redis jest wymagany** (`isRedisRequiredFromConfig` — m.in. cache z backendem redis i/lub smart rate limit). Gdy Redis **nie** jest wymagany, pole jest **pomijane** (brak `ping()`). Gdy obecne: `RedisConnectionService.ping()`, `required: true`, `consumers` (co najmniej `cache` i/lub `rate-limit`). Status `degraded` **nie** blokuje `ready` (fail-open).

Zmiana względem: wcześniejsze F-1b wymieniało `checks.redis` tak, jakby zawsze było w body. Powód: `health.service.ts` dodaje redis tylko przez spread, gdy `redisCheck` jest zdefiniowane; test `should omit redis check when not required`.

Uwaga vs docs: `docs/pl/dokumentacja_api.md` / `docs/api-documentation.md` opisują kształt `required: false` + komunikat „Redis not required”. Kod takiego obiektu **nie zwraca**. Korekta dokumentacji — osobna decyzja.

F-2. Gateway musi być w stanie jednoznacznie określić „gotowość” konfiguracyjną:

- sekrety włączonych instancji wg `SPEC-KONFIGURACJA.md` (F-1a),
- poprawne wczytanie i walidacja `gateway.config.yaml` przy starcie; offline: `npm run config:validate`.

*(Opcjonalnie w przyszłości: test połączenia do providerów.)*

## Wymagania niefunkcjonalne

NFR-1. Health endpoint nie może ujawniać sekretów ani pełnej konfiguracji.

NFR-2. Health endpoint ma działać szybko (p95 < 50ms lokalnie).

## Kryteria akceptacji

- [x] `GET /api/v1/health` działa, gdy proces działa.
- [x] Liveness zwraca `status: healthy` (bez sekretów).
- [x] Readiness (`GET /api/v1/health/ready`) zawsze HTTP 200; raportuje `checks.config` i `checks.cache`; `checks.redis` tylko gdy Redis jest wymagany.
- [x] Health nie wymaga klucza i nie jest ograniczany smart rate limitem.

## Poza zakresem (względem rdzenia MVP)

- Sprawdzanie dostępności providerów przy każdym health (koszty i opóźnienia).
- `GET /metrics` (Prometheus, poza `/api/v1`) — `SPEC-METRYKI.md`.
- Dodatkowe, feature-flagowane checki readiness poza `config` / `cache` / `redis`.
