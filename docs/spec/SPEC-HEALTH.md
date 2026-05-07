# SPEC — Health (liveness/readiness)

## Cel / problem

Zapewnić endpoint zdrowia do lokalnego uruchamiania i orchestracji w infrastrukturze użytkownika.

## Użytkownicy i scenariusze

### Scenariusz A — local dev

Użytkownik uruchamia gateway i sprawdza, czy działa: `GET /health`.

### Scenariusz B — orchestrator

Orchestrator odpyta health endpointy, aby zdecydować, czy instancja jest gotowa obsługiwać ruch.

## Wymagania funkcjonalne

F-1. `GET /api/v1/health` zwraca `200` i lekki JSON:

```json
{
  "status": "ok",
  "message": "Gateway is running",
  "timestamp": "2026-05-07T13:54:00.000Z"
}
```

Uwagi:
- `timestamp` jest w formacie ISO 8601 (UTC) i ma charakter informacyjny (liveness).
- Endpoint nie wymaga `X-Gateway-Key` (ma działać dla orchestratorów i liveness probes).

F-2. Gateway musi być w stanie jednoznacznie określić “gotowość” do obsługi żądań LLM:

- poprawna konfiguracja env (w **production**: **minimum jeden** niepusty klucz API spośród `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` — `src/config/env.validation.ts`),
- poprawna konfiguracja plików modeli/polityk (obecnie: wczytanie i walidacja `gateway.config.yaml` przy starcie w `src/config/configuration.ts`).

*(Opcjonalnie w przyszłości: test połączenia do providerów.)*

## Wymagania niefunkcjonalne

NFR-1. Health endpoint nie może ujawniać sekretów ani pełnej konfiguracji.

NFR-2. Health endpoint ma działać szybko (p95 < 50ms lokalnie).

## Kryteria akceptacji

- [ ] `GET /api/v1/health` zawsze działa, gdy proces działa.
- [ ] Odpowiedź ma pola `status`, `message`, `timestamp` (bez ujawniania sekretów).
- [ ] Readiness (jeśli dodana) odróżnia konfigurację poprawną od błędnej.

## Poza zakresem (MVP)

- Sprawdzanie dostępności providerów przy każdym health (może generować koszty i opóźnienia).

