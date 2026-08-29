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

## Semantic cache (Redis Stack, wektory)

Osobny stack — **nie** używa alpine z kroku powyżej:

1. `npm run test:integration:semantic` — podnosi Redis Stack na hoście **6381**, uruchamia `gateway-semantic-cache.integration-spec.ts`, potem zdejmuje kontener
2. Embedding = stały wektor (fake); **bez** żywej Ollamy / kluczy API
3. Spec pomija się przy `npm run test:integration` (wymaga `SEMANTIC_CACHE_ENABLED=true` + `REDIS_PORT=6381`)

Compose: `test/integration/docker-compose.redis-stack.yml`.

## Co jest prawdziwe vs mock

| Prawdziwe                                      | Mock                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Redis, fabryki providerów, registry, bootstrap | Graf gateway (`configuration.ts`), `ConfigService`, `LoggingService` |

Stream cache exact (cross-endpoint stream ↔ JSON, tooling, cooldown, fasada Anthropic): `gateway-stream-cache.integration-spec.ts` — wymaga Redis + klucza API jak pozostałe suite chat cache.

## Pliki konfiguracyjne

- Env: `.env.test` (gitignore)
- Graf gateway: `setup/integration-mock-configuration.ts` + wzorzec YAML w `fixtures/integration.gateway.config.yaml`
