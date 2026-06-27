# SPEC — Health (liveness/readiness)

## Cel / problem

Zapewnić endpoint zdrowia do lokalnego uruchamiania i orchestracji w infrastrukturze użytkownika.

## Użytkownicy i scenariusze

### Scenariusz A — local dev

Użytkownik uruchamia gateway i sprawdza, czy działa: `GET /api/v1/health` (globalny prefiks `API_GLOBAL_PREFIX` w `src/setup.app.ts`).

### Scenariusz B — orchestrator

Orchestrator odpyta health endpointy, aby zdecydować, czy instancja jest gotowa obsługiwać ruch.

## Wymagania funkcjonalne

F-1. `GET /api/v1/health` zwraca `200` i lekki JSON (liveness):

```json
{
  "status": "healthy",
  "timestamp": "2026-05-19T12:00:00.000Z"
}
```

Uwagi:
- `timestamp` to ISO 8601 UTC (`new Date().toISOString()` w `HealthService.getLiveness` / `getReadiness`).
- Endpoint nie wymaga `X-Gateway-Key`.

F-1b. `GET /api/v1/health/ready` zwraca readiness (`status`: `ready` | `not_ready`, `checks.config`, `checks.redis`, `checks.cache`, `version`, `uptime`) — implementacja w `HealthService.getReadiness`. **HTTP zawsze 200**; probe ocenia pole `status` w body. **`checks.redis`**: współdzielona infrastruktura Redis (`RedisConnectionService.ping()` tylko gdy `required: true`; pola `required`, `consumers`: `cache`, `rate-limit`). **`checks.cache`**: stan feature cache odpowiedzi; przy backendzie `redis` dostępność wynika z `checks.redis`. Szczegóły: `docs/dokumentacja_api.md`.

F-2. Gateway musi być w stanie jednoznacznie określić “gotowość” do obsługi żądań LLM:

- poprawna konfiguracja env (klucze providerów **per `apiKeyRef`** włączonych instancji — `provider-api-key.validation.ts`),
- poprawna konfiguracja plików modeli/polityk (wczytanie i walidacja `gateway.config.yaml` przy starcie: `gateway-config.schema.ts`, `configuration.ts`; offline: `npm run config:validate`).

*(Opcjonalnie w przyszłości: test połączenia do providerów.)*

## Wymagania niefunkcjonalne

NFR-1. Health endpoint nie może ujawniać sekretów ani pełnej konfiguracji.

NFR-2. Health endpoint ma działać szybko (p95 < 50ms lokalnie).

## Kryteria akceptacji

- [x] `GET /api/v1/health` działa, gdy proces działa.
- [x] Liveness zwraca `status: healthy` (bez sekretów).
- [x] Readiness (`GET /api/v1/health/ready`) raportuje `checks.config`, `checks.redis` i `checks.cache`.

## Poza zakresem (względem rdzenia MVP)

- Sprawdzanie dostępności providerów przy każdym health (może generować koszty i opóźnienia).

