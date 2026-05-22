# SPEC — Health (liveness/readiness)

## Cel / problem

Zapewnić endpoint zdrowia do lokalnego uruchamiania i orchestracji w infrastrukturze użytkownika.

## Użytkownicy i scenariusze

### Scenariusz A — local dev

Użytkownik uruchamia gateway i sprawdza, czy działa: `GET /health`.

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

F-1b. `GET /api/v1/health/ready` zwraca readiness (`status`: `ready` | `not_ready`, `checks.config`, `checks.redis`, `version`, `uptime`) — implementacja w `HealthService.getReadiness`. **HTTP zawsze 200**; probe ocenia pole `status` w body. Szczegóły `checks.config`: `docs/dokumentacja_api.md`.

F-2. Gateway musi być w stanie jednoznacznie określić “gotowość” do obsługi żądań LLM:

- poprawna konfiguracja env (w **production**: **minimum jeden** niepusty klucz API spośród `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` — `src/config/env.validation.ts`),
- poprawna konfiguracja plików modeli/polityk (obecnie: wczytanie i walidacja `gateway.config.yaml` przy starcie w `src/config/configuration.ts`).

*(Opcjonalnie w przyszłości: test połączenia do providerów.)*

## Wymagania niefunkcjonalne

NFR-1. Health endpoint nie może ujawniać sekretów ani pełnej konfiguracji.

NFR-2. Health endpoint ma działać szybko (p95 < 50ms lokalnie).

## Kryteria akceptacji

- [x] `GET /api/v1/health` działa, gdy proces działa.
- [x] Liveness zwraca `status: healthy` (bez sekretów).
- [x] Readiness (`GET /api/v1/health/ready`) raportuje config i Redis.

## Poza zakresem (względem rdzenia MVP)

- Sprawdzanie dostępności providerów przy każdym health (może generować koszty i opóźnienia).

