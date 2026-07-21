# Testy integracyjne (live SDK + Redis)

Osobny runner: `npm run test:integration` — nie uruchamiaj przez `npm test` ani `npm run test:e2e`.

## Wymagania

- Docker (kontener Redis testowy)
- Plik `.env.test` (skopiuj z `.env.test.example` i uzupełnij klucze API)

## Setup lokalny

1. `cp .env.test.example .env.test` — uzupełnij `INTEGRATION_ANTHROPIC_API_KEY` i/lub `INTEGRATION_GOOGLE_API_KEY`, `INTEGRATION_GATEWAY_KEY`, `MASTER_KEY`; opcjonalnie `INTEGRATION_OPENAI_API_KEY`, `INTEGRATION_OPENAI_BASE_URL`, `INTEGRATION_OLLAMA_BASE_URL`
2. `npm run test:integration:redis:up` — Redis na hoście **6380**, DB **15**
3. `npm run test:integration`
4. (Opcjonalnie) `npm run test:integration:redis:down`

## Wymagania runtime

`npm run test:integration` zawsze uruchamia suite. Potrzebne:

- `.env.test` z kluczami API (`INTEGRATION_ANTHROPIC_API_KEY` lub `INTEGRATION_GOOGLE_API_KEY`)
- Redis (`npm run test:integration:redis:up`)

Testy OpenAI provider (`*openai*integration-spec.ts`) wymagają dodatkowo `INTEGRATION_OPENAI_API_KEY` i `INTEGRATION_OPENAI_BASE_URL`. Bez tych zmiennych suite OpenAI jest **pomijana** (`describe.skip`), nie powoduje failu.

Brak Redis → `globalSetup` rzuca błąd (exit ≠ 0). Brak klucza API → testy live padną przy wywołaniu providera.

## Co jest prawdziwe vs mock

| Prawdziwe                                      | Mock                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Redis, fabryki providerów, registry, bootstrap | Graf gateway (`configuration.ts`), `ConfigService`, `LoggingService` |

## Pliki konfiguracyjne

- Env: `.env.test` (gitignore)
- Graf gateway: `setup/integration-mock-configuration.ts` + wzorzec YAML w `fixtures/integration.gateway.config.yaml`
