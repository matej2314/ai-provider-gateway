# Anti-patterns / what to watch for — AI Provider Gateway

This file collects common pitfalls in “LLM gateway” projects.

## 1) “Open proxy” through excessive configurability

**Don’t:**

- configurable provider endpoint URLs,
- arbitrary headers and bodies from config,
- a “generic HTTP request builder” under the guise of LLM integration.

**Why:** SSRF, exfiltration, loss of cost and security control.

## 2) Secrets in logs

**Don’t:**

- log full requests to providers (headers, bearer tokens),
- dump config/env in exception handlers,
- return raw SDK exceptions to the client.

**Do:**

- redact sensitive fields,
- requestId + structured logs,
- minimal messages externally, details only in logs.

## 3) Fake `modelId` validation

**Don’t:** accept a vendor `modelId` from the request and “validate” it with a regex.

**Do:** allowlist via configuration and/or aliases (`modelAlias`), fail-fast validation at startup.

## 4) No bounds for parameters (`temperature`, `max_tokens`, …)

**Don’t:** “pass everything through, the provider will reject it”.

**Do:**

- field allowlist,
- bounds (min/max),
- default values per alias,
- parameter mapping per provider (different names and semantics).

## 5) Mixing provider contracts in the gateway API

**Don’t:**

- expose 1:1 objects from the OpenAI/Anthropic SDK in the gateway response,
- leak “stop reasons” or structures that cannot be unified.

**Do:**

- your own gateway contract (stable),
- optional debug `raw` field only in dev mode (and without secrets).

**Exception (intentional):** separate `/api/v1/openai` and `/api/v1/anthropic` prefixes with vendor format — see §13 (Integration facades). Does not apply to native `/api/v1/chat`.

Rationale: official contract facades require compatibility with the OpenAI API and Anthropic Messages API; separate paths are **intentional** and do not violate this anti-pattern’s rules (which apply only to the native gateway contract).

## 6) Streaming “as it comes”

**Don’t:**

- assume every provider streams identically,
- mix several SSE formats depending on the provider.

**Do:**

- one gateway event format (`meta`, `delta`, `done`),
- streaming contract tests,
- clear behavior on error mid-stream.

## 7) Retry without policy and without limits

**Don’t:** infinite retries or retries on logical errors (400/401).

**Do:**

- retry only on 429/5xx (`onStatus` / `RETRY_POLICY_DEFAULTS`),
- maximum number of attempts (`maxAttempts`, Zod cap = 5),
- backoff (`initialDelayMs` / `maxDelayMs`) and time budget (`timeoutMs`) in `ResilientExecutor` (`src/chat/resilience/`),
- cancel in-flight work via `AbortSignal` on `timeoutMs` (SDK: Anthropic/OpenAI `signal`, Google `abortSignal`) — not just `Promise.race` without abort,
- keep resilience logic in the chat module (not in controllers or facades).

## 8) “Framework first” in domain logic

**Don’t:** put model/parameter selection logic in controllers.

**Do:**

- thin controllers,
- use-cases in services,
- provider factories (`src/providers/factories/`) as the only place that talks to LLM SDKs.

## 9) No contract tests

**Don’t:** tests that only check “whether the service starts”.

**Do:**

- parameter mapping tests,
- `modelAlias` selection tests,
- error normalization tests,
- SSE format tests (at least unit tests on events).

## 10) Starting without a required API key

**Don’t:** start the gateway when env is missing secrets for any **enabled** provider instance in YAML (`assertEnabledProviderSecretsPresent` in `configuration-validation.service.ts` — API key / base URL).

**Do:** fail-fast at startup; locally ensure `.env` contains values for all `apiKeyRef` of enabled providers (details: `configuration.md`).

## 11) Confusing rate-limit codes (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`)

**Don’t:** treat every HTTP **429** as a provider limit.

**Do:**

- **`RATE_LIMITED`** — gateway smart rate limit (`SmartRateLimitGuard`: RPS/burst/streams) and cooldown after upstream 429 (`prepareRequestForExecution` → `checkCooldown`; `ChatErrorHandlerService` → `setCooldown` — JSON chat and stream).
- **`PROVIDER_RATE_LIMITED`** — solely SDK error mapping (`provider-error.mapper.ts`).

Details: `dictionary.md`, `api-documentation.md`.

## 12) Response cache without awareness of “freshness”

**Don’t:** assume every response from **`POST /api/v1/chat`** is “live” from the provider — with cache enabled, a return with **`cached: true`** is possible.

**Don’t:** expect that **`requestId`** in a cached response always matches the current request — the implementation returns the identifier stored with the first response.

**Do:** consciously enable cache only where response repeatability is acceptable; monitor TTL and invalidation (changing the system prompt changes the cache key in the current implementation). Read `configuration.md` (env `CACHE_*`, `REDIS_*`); Redis reads are validated with a Zod schema (`CachedChatResponseSchema` — corrupt entry removed); streaming is a cache-free path (`pl/spec/SPEC-CHAT-STREAMING.md`).

## 13) Confusing three API contracts (native vs official contract facades)

**Don’t:**

- expose a **single** `GET /api/v1/models` route in **vendor format** for all clients (OpenAI and Anthropic have different list shapes) — native `/models` has its **own** gateway contract; facades have separate prefixes,
- pass the client key (Bearer / `x-api-key`) to the provider layer instead of keys from `.env` (per `apiKeyRef`),
- **assume that the `/openai` or `/anthropic` facade means a backend of that same vendor** — it is only the HTTP shape; the LLM is chosen via `modelAlias` → `providerInstance` in YAML,
- **treat Bearer on `/openai` as an OpenAI.com key** or `x-api-key` on `/anthropic` as a key from the Anthropic console — these are gateway client keys,
- duplicate cache/retry/fallback logic in facade controllers instead of delegating to `ChatService`,
- expect `ErrorEnvelope` from OpenAI/Anthropic facades — they have their own error filters.

**Do:**

- separate `/api/v1/openai` and `/api/v1/anthropic` prefixes + native `/api/v1/chat` and **`GET /api/v1/models`** (gateway contract),
- shared catalog `GatewayModelsCatalogService` + outbound mappers per facade (do not duplicate YAML read logic),
- `readClientGatewayKey` + the same allowlist for all surfaces,
- map `model` (vendor) → `modelAlias` (YAML) in the mapper layer,
- distinguish **integration facade** (`src/integrations/`) vs **provider runtime** (`src/providers/`) — see `dictionary.md` (section “Facade vs provider runtime”).

Details: `integrations.md`, `openai-contract-integration.md`, `anthropic-messages-integration.md`.

## 14) CLI dependent on `ConfigModule` (configuration deadlock)

**Don’t:**

- import `ConfigModule.forRoot()` in `CliModule` — runtime already requires an existing, valid `gateway.config.yaml` and `.env`, which the CLI is supposed to **create**,
- require `npm run build` before first CLI use,
- import `buildEffectiveGatewayConfig()` / `configuration.ts` in the CLI layer at startup (requires env).

**Do:**

- a separate entry point (`bin/gateway-cli-wrapper.js` → `CliModule`),
- `CliConfigLoaderService` with YAML parsing + `GatewayConfigSchema` without resolving env,
- reuse **only** types/schemas/validators from `src/config/` (direction: config → cli, not the reverse),
- wrapper with `ts-node` fallback when `dist/` is missing.

Details: `command_line_interface.md`, `architecture.md`, `project.structure.md` (section 2a).

## 15) Starting the server without a proper config file

**Don’t:** expect `npm run start:dev` to work right after cloning without a filled `.env` (provider keys + `MASTER_KEY`) and a valid `gateway.config.yaml`.

**Do:** run `gateway config:init` or manually fill YAML + `.env` (`configuration.md`); verify with `gateway config:validate` (full) or `npm run config:validate` (YAML + runtime rules).
