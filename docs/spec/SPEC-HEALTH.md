# SPEC — Health (liveness/readiness)

## Cel / problem

Zapewnić endpoint zdrowia do lokalnego uruchamiania i orchestracji w infrastrukturze użytkownika.

## Użytkownicy i scenariusze

### Scenariusz A — local dev

Użytkownik uruchamia gateway i sprawdza, czy działa: `GET /health`.

### Scenariusz B — orchestrator

Orchestrator odpyta health endpointy, aby zdecydować, czy instancja jest gotowa obsługiwać ruch.

## Wymagania funkcjonalne

F-1. `GET /health` zwraca `200` i lekki JSON `{ "status": "ok" }`.

F-2. Gateway musi być w stanie jednoznacznie określić “gotowość” do obsługi żądań LLM:

- poprawna konfiguracja env (m.in. **minimum jeden** niepusty klucz API spośród `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` — walidacja przy starcie w `src/config/env.validation.ts`),
- poprawna konfiguracja plików modeli/polityk.

*(Opcjonalnie w przyszłości: test połączenia do providerów.)*

## Wymagania niefunkcjonalne

NFR-1. Health endpoint nie może ujawniać sekretów ani pełnej konfiguracji.

NFR-2. Health endpoint ma działać szybko (p95 < 50ms lokalnie).

## Kryteria akceptacji

- [ ] `GET /health` zawsze działa, gdy proces działa.
- [ ] Readiness (jeśli dodana) odróżnia konfigurację poprawną od błędnej.

## Poza zakresem (MVP)

- Sprawdzanie dostępności providerów przy każdym health (może generować koszty i opóźnienia).

