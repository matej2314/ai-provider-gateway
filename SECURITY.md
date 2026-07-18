# Security Policy

## English

### API keys — best practices

#### Gateway keys (clients → gateway)

- **Never** commit keys in a PR (`.env`, `gateway.config.yaml`).
- Keys are kept only in environment variables referenced from `gateway.config.yaml`:
  - `masterKeyRef` — administrative key (defaults to `MASTER_KEY` after `gateway init`).
  - `clients[].gatewayKeyRef` — per-client keys (CLI convention: `GATEWAY_KEY_<CLIENT_ID>`).
- The allowlist is built at startup from `masterKeyRef` and all non-empty client `gatewayKeyRef` values (`buildGatewayKeyRuntime` in `src/config/configuration.ts`).
- Rotation: remove the old key from `.env` (or from the client allowlist in YAML), then restart the gateway.

#### Provider keys (gateway → LLM)

- Provider keys (`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, etc.) belong in `.env` — **never** in YAML.
- Per-instance keys: `apiKeyRef` in `gateway.providers[].apiKeyRef` points to an env variable.
- The gateway starts only when every **enabled** provider has a non-empty key in the env.
- In production: use a secret manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).

#### The gateway is NOT an open proxy

The gateway does **not** forward arbitrary requests to arbitrary URLs — only calls to registered providers (`anthropic`, `google`, `openai`, `openai-compatible`) via SDKs with keys from `.env` (for `openai` / `openai-compatible`, `baseUrlRef` in YAML is required).  
A client **cannot** supply their own provider key through the API.

### Client authentication

All chat paths require a key from the gateway allowlist. Different compatibility facades use different headers, but validation is the same:

| API surface | Header / format | Guard |
| ----------- | --------------- | ----- |
| Native (`/api/v1/chat`, `/api/v1/chat/stream`) | `X-Gateway-Key` | `GatewayKeyGuard` |
| OpenAI-compatible (`/openai/*`) | `Authorization: Bearer <key>` | `OpenAiBearerAuthGuard` |
| Anthropic-compatible (`/anthropic/*`) | `x-api-key` or `Authorization: Bearer <key>` | `AnthropicApiKeyGuard` |

Health endpoints (`/api/v1/health`, `/api/v1/health/ready`) do **not** require a key — they are intended only for operational probes.

#### HTTP facades and vendor keys (semantically important)

- The value in **`Authorization: Bearer`** on `/api/v1/openai/*` is a **gateway client key** from the allowlist (`GATEWAY_KEY_*`), **not** an OpenAI.com API key.
- The value in **`x-api-key`** (or Bearer) on `/api/v1/anthropic/*` is the **same gateway client key**, **not** an Anthropic API key from the vendor console.
- The gateway **never** accepts a provider key in the request body or client request headers — upstream keys live only in `.env` (`apiKeyRef` per `providerInstance` in YAML).

#### Facades and routing to the LLM

The presence of `/openai/*` or `/anthropic/*` routes does **not** guarantee that the LLM call goes to api.openai.com or the Anthropic API. Request routing is determined solely by **`modelAlias`** (the `model` field in the facade) and `gateway.config.yaml` configuration (`models[].providerInstance`, `modelId`). Details: [`docs/integrations.md`](docs/integrations.md), [`docs/dictionary.md`](docs/dictionary.md).

### Reporting a vulnerability

If you find a security issue:

1. Do **not** open a public issue.
2. Email: **mateo2314@gmail.com**
3. Alternatively: GitHub Security Advisories (if the repo is public).

We will respond within 48 hours.

### Scope

The gateway handles:

- Client authorization (key allowlist from `masterKeyRef` + `clients[].gatewayKeyRef`).
- Isolation of provider keys (we never expose them to the client).
- Per-client rate limiting (`SmartRateLimitGuard` + Redis, when `RATE_LIMIT_SMART_ENABLED=true`):
  - per-client limits from `gateway.config.yaml` (`clients[].rateLimit`) or defaults from env (`RATE_LIMIT_RPS_PER_KEY`, `RATE_LIMIT_BURST_PER_KEY`, `RATE_LIMIT_STREAMS_CONCURRENT`);
  - a separate concurrent SSE streams limit;
  - when Redis is unavailable — the limiter allows requests through (fail-open; the operator should monitor Redis).
- Timeout and retry for upstream calls (`ResilientExecutor`, defaults: 30s timeout, up to 3 attempts on 429/5xx statuses).
- Redaction of sensitive headers in logs (`authorization`, `x-gateway-key`, `*.apiKey`, `*.gatewayKey`).
- HTTP hardening headers (Helmet in `src/main.ts`, `x-powered-by` disabled, JSON body limit 1 MB).
- Automated security tests (`npm run test:security`, `test/security/`) — auth bypass, Helmet, information disclosure, rate limit, fuzzing; details: [`docs/testing.md`](docs/testing.md).

The gateway does **not** handle (out of scope):

- Audit of logs for PII (operator responsibility).
- Encryption at rest for Redis cache (external configuration).
- Network-level security (firewall, VPN, TLS termination — infrastructure).
- Disabling Swagger UI in production (controlled via `SWAGGER_ENABLED` — operator responsibility).

---

## Polski

### Klucze API — best practices

#### Gateway keys (klienci → gateway)

- **Nigdy** nie commituj kluczy w PR (`.env`, `gateway.config.yaml`).
- Klucze trzymamy wyłącznie w zmiennych środowiskowych wskazanych w `gateway.config.yaml`:
  - `masterKeyRef` — klucz administracyjny (domyślnie `MASTER_KEY` po `gateway init`).
  - `clients[].gatewayKeyRef` — klucze per klient (konwencja CLI: `GATEWAY_KEY_<CLIENT_ID>`).
- Allowlista budowana jest przy starcie z `masterKeyRef` oraz wszystkich niepustych `gatewayKeyRef` klientów (`buildGatewayKeyRuntime` w `src/config/configuration.ts`).
- Rotacja: usuń stary klucz z `.env` (lub z allowlisty klientów w YAML), zrestartuj gateway.

#### Provider keys (gateway → LLM)

- Klucze providerów (`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` itd.) w `.env` — **nigdy** w YAML.
- Per-instance keys: `apiKeyRef` w `gateway.providers[].apiKeyRef` wskazuje zmienną env.
- Gateway startuje tylko gdy każdy **włączony** provider ma niepusty klucz w env.
- W production: używaj secret manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).

#### Gateway NIE JEST open proxy

Gateway **nie** przekazuje dowolnych requestów do dowolnych URL — wyłącznie wywołania zarejestrowanych providerów (`anthropic`, `google`, `openai`, `openai-compatible`) przez SDK z kluczami z `.env` (dla `openai` / `openai-compatible` wymagany `baseUrlRef` w YAML).  
Klient **nie** może podać własnego klucza providera przez API.

### Uwierzytelnianie klientów

Wszystkie ścieżki chat wymagają klucza z allowlisty gateway. Różne fasady kompatybilności używają różnych nagłówków, ale walidacja jest ta sama:

| Powierzchnia API | Nagłówek / format | Guard |
| ---------------- | ----------------- | ----- |
| Native (`/api/v1/chat`, `/api/v1/chat/stream`) | `X-Gateway-Key` | `GatewayKeyGuard` |
| OpenAI-compatible (`/openai/*`) | `Authorization: Bearer <key>` | `OpenAiBearerAuthGuard` |
| Anthropic-compatible (`/anthropic/*`) | `x-api-key` lub `Authorization: Bearer <key>` | `AnthropicApiKeyGuard` |

Endpointy health (`/api/v1/health`, `/api/v1/health/ready`) **nie** wymagają klucza — przeznaczone wyłącznie do probe'ów operacyjnych.

#### Fasady HTTP a klucze vendorów (ważne semantycznie)

- Wartość w **`Authorization: Bearer`** na `/api/v1/openai/*` to **klucz klienta gateway** z allowlisty (`GATEWAY_KEY_*`), **nie** klucz API OpenAI.com.
- Wartość w **`x-api-key`** (lub Bearer) na `/api/v1/anthropic/*` to **ten sam klucz klienta gateway**, **nie** klucz API Anthropic z konsole vendora.
- Gateway **nigdy** nie przyjmuje klucza providera w body ani nagłówkach żądania klienta — klucze upstream są wyłącznie w `.env` (`apiKeyRef` per `providerInstance` w YAML).

#### Fasady a routing do LLM

Obecność tras `/openai/*` lub `/anthropic/*` **nie gwarantuje**, że wywołanie LLM trafi do api.openai.com ani do API Anthropic. Kierunek zapytania wynika wyłącznie z **`modelAlias`** (pole `model` w fasadzie) i konfiguracji `gateway.config.yaml` (`models[].providerInstance`, `modelId`). Szczegóły: [`docs/pl/integracje.md`](docs/pl/integracje.md), [`docs/pl/dictionary.md`](docs/pl/dictionary.md).

### Zgłaszanie podatności

Jeśli znalazłeś problem bezpieczeństwa:

1. **Nie** otwieraj publicznego issue.
2. Wyślij email na: **mateo2314@gmail.com**
3. Alternatywnie: GitHub Security Advisories (jeśli repo publiczne).

Odpowiemy w ciągu 48h.

### Scope

Gateway obsługuje:

- Autoryzację klientów (allowlista kluczy z `masterKeyRef` + `clients[].gatewayKeyRef`).
- Izolację kluczy providerów (nigdy nie wystawiamy ich klientowi).
- Rate limiting per-client (`SmartRateLimitGuard` + Redis, gdy `RATE_LIMIT_SMART_ENABLED=true`):
  - limity per klient z `gateway.config.yaml` (`clients[].rateLimit`) lub domyślne z env (`RATE_LIMIT_RPS_PER_KEY`, `RATE_LIMIT_BURST_PER_KEY`, `RATE_LIMIT_STREAMS_CONCURRENT`);
  - osobny limit równoległych streamów SSE;
  - gdy Redis jest niedostępny — limiter przepuszcza requesty (fail-open; operator powinien monitorować Redis).
- Timeout i retry dla wywołań upstream (`ResilientExecutor`, domyślnie: 30s timeout, do 3 prób na statusy 429/5xx).
- Redakcję wrażliwych nagłówków w logach (`authorization`, `x-gateway-key`, `*.apiKey`, `*.gatewayKey`).
- Nagłówki HTTP hardening (Helmet w `src/main.ts`, wyłączone `x-powered-by`, limit body JSON 1 MB).
- Automatyczne testy security (`npm run test:security`, `test/security/`) — auth bypass, Helmet, information disclosure, rate limit, fuzzing; szczegóły: [`docs/pl/testy.md`](docs/pl/testy.md).

Gateway **nie** obsługuje (out of scope):

- Audyt logów pod kątem PII (odpowiedzialność operatora).
- Encryption at rest dla cache Redis (konfiguracja zewnętrzna).
- Network-level security (firewall, VPN, TLS termination — infrastruktura).
- Wyłączenie Swagger UI w production (kontrola przez `SWAGGER_ENABLED` — odpowiedzialność operatora).
