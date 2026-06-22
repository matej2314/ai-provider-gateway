# Security Policy

## Supported Versions

> **Uwaga:** Nie obiecujemy wsparcia dla konkretnych zakresów semver (np. `0.12.x`), dopóki nie ma ustalonej polityki release'ów i tagów Git. Po wdrożeniu polityki release'ów (tagi, deploy) — uzupełnimy tabelę wspieranych wersji.

| Wersja / gałąź | Supported          |
| -------------- | ------------------ |
| `main` (HEAD)  | :white_check_mark: |
| Starsze commity / brak tagu | :x: (brak formalnych release'ów) |

## Klucze API — best practices

### Gateway keys (klienci → gateway)

- **Nigdy** nie commituj kluczy w PR (`.env`, `gateway.config.yaml`).
- Klucze trzymamy wyłącznie w zmiennych środowiskowych wskazanych w `gateway.config.yaml`:
  - `masterKeyRef` — klucz administracyjny (domyślnie `MASTER_KEY` po `gateway init`).
  - `clients[].gatewayKeyRef` — klucze per klient (konwencja CLI: `GATEWAY_KEY_<CLIENT_ID>`).
- Allowlista budowana jest przy starcie z `masterKeyRef` oraz wszystkich niepustych `gatewayKeyRef` klientów (`buildGatewayKeyRuntime` w `src/config/configuration.ts`).
- Rotacja: usuń stary klucz z `.env` (lub z allowlisty klientów w YAML), zrestartuj gateway.

### Provider keys (gateway → LLM)

- Klucze providerów (`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` itd.) w `.env` — **nigdy** w YAML.
- Per-instance keys: `apiKeyRef` w `gateway.providers[].apiKeyRef` wskazuje zmienną env.
- Gateway startuje tylko gdy każdy **włączony** provider ma niepusty klucz w env.
- W production: używaj secret manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).

### Gateway NIE JEST open proxy

Gateway **nie** przekazuje dowolnych requestów do dowolnych URL — wyłącznie wywołania zarejestrowanych providerów (obecnie: `anthropic`, `google`) przez SDK z kluczami z `.env`.  
Klient **nie** może podać własnego klucza providera przez API.

## Uwierzytelnianie klientów

Wszystkie ścieżki chat wymagają klucza z allowlisty gateway. Różne fasady kompatybilności używają różnych nagłówków, ale walidacja jest ta sama:

| Powierzchnia API | Nagłówek / format | Guard |
| ---------------- | ----------------- | ----- |
| Native (`/api/v1/chat`, `/api/v1/chat/stream`) | `X-Gateway-Key` | `GatewayKeyGuard` |
| OpenAI-compatible (`/openai/*`) | `Authorization: Bearer <key>` | `OpenAiBearerAuthGuard` |
| Anthropic-compatible (`/anthropic/*`) | `x-api-key` lub `Authorization: Bearer <key>` | `AnthropicApiKeyGuard` |

Endpointy health (`/api/v1/health`, `/api/v1/health/ready`) **nie** wymagają klucza — przeznaczone wyłącznie do probe'ów operacyjnych.

### Fasady HTTP a klucze vendorów (ważne semantycznie)

- Wartość w **`Authorization: Bearer`** na `/api/v1/openai/*` to **klucz klienta gateway** z allowlisty (`GATEWAY_KEY_*`), **nie** klucz API OpenAI.com.
- Wartość w **`x-api-key`** (lub Bearer) na `/api/v1/anthropic/*` to **ten sam klucz klienta gateway**, **nie** klucz API Anthropic z konsole vendora.
- Gateway **nigdy** nie przyjmuje klucza providera w body ani nagłówkach żądania klienta — klucze upstream są wyłącznie w `.env` (`apiKeyRef` per `providerInstance` w YAML).

### Fasady a routing do LLM

Obecność tras `/openai/*` lub `/anthropic/*` **nie gwarantuje**, że wywołanie LLM trafi do api.openai.com ani do API Anthropic. Kierunek zapytania wynika wyłącznie z **`modelAlias`** (pole `model` w fasadzie) i konfiguracji `gateway.config.yaml` (`models[].providerInstance`, `modelId`). Szczegóły: [`docs/integracje.md`](docs/integracje.md), [`docs/dictionary.md`](docs/dictionary.md).

## Zgłaszanie podatności

Jeśli znalazłeś problem bezpieczeństwa:

1. **Nie** otwieraj publicznego issue.
2. Wyślij email na: **mateo2314@gmail.com**
3. Alternatywnie: GitHub Security Advisories (jeśli repo publiczne).

Odpowiemy w ciągu 48h.

## Scope

Gateway obsługuje:

- Autoryzację klientów (allowlista kluczy z `masterKeyRef` + `clients[].gatewayKeyRef`).
- Izolację kluczy providerów (nigdy nie wystawiamy ich klientowi).
- Rate limiting per-client (`SmartRateLimitGuard` + Redis, gdy `RATE_LIMIT_SMART_ENABLED=true`):
  - limity per klient z `gateway.config.yaml` (`clients[].rateLimit`) lub domyślne z env (`RATE_LIMIT_RPS_PER_KEY`, `RATE_LIMIT_BURST_PER_KEY`, `RATE_LIMIT_STREAMS_CONCURRENT`);
  - osobny limit równoległych streamów SSE;
  - gdy Redis jest niedostępny — limiter przepuszcza requesty (fail-open; operator powinien monitorować Redis).
- Timeout i retry dla wywołań upstream (`ResilientExecutor`, domyślnie: 30s timeout, do 3 prób na statusy 429/5xx).
- Redakcję wrażliwych nagłówków w logach (`authorization`, `x-gateway-key`, `*.apiKey`, `*.gatewayKey`).

Gateway **nie** obsługuje (out of scope):

- Audyt logów pod kątem PII (odpowiedzialność operatora).
- Encryption at rest dla cache Redis (konfiguracja zewnętrzna).
- Network-level security (firewall, VPN, TLS termination — infrastruktura).
- Wyłączenie Swagger UI w production (kontrola przez `SWAGGER_ENABLED` — odpowiedzialność operatora).
