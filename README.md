# AI Provider Gateway

NestJS HTTP gateway for LLMs. One stable API in front of Anthropic, Google Gemini, OpenAI, and OpenAI-compatible backends (e.g. Ollama). Clients talk to the gateway; provider SDKs stay behind adapters.

**Stack:** NestJS · TypeScript · YAML + env config · Redis (optional) · Docker · Prometheus / Grafana · Sentry

---

## Why this exists

Integrating several LLM vendors usually means different SDKs, auth shapes, error formats, and streaming semantics. This gateway:

- exposes a **unified chat contract** (`/api/v1/chat`, SSE stream, models catalog, health),
- routes by **model aliases** from `gateway.config.yaml` (not by which HTTP facade you call),
- adds **retry / timeout / optional fallback**, rate limits, response cache, and observability,
- offers **official contract facades** (OpenAI API and Anthropic Messages) so IDEs and other clients that expect those HTTP shapes can point at your instance.

Built as a production-shaped NestJS service and a portfolio-ready architecture exercise. Clone, configure with your own keys, run locally or on your infra.

---

## What you get

| Area | Capability |
|------|------------|
| Native API | `POST /api/v1/chat`, `POST /api/v1/chat/stream` (SSE), `GET /api/v1/models` |
| Official contracts facades | OpenAI API contract (`/api/v1/openai/*`) and Anthropic Messages contract (`/api/v1/anthropic/*`) — for IDEs (Cursor, Claude Code) and any other client that expects those HTTP shapes |
| Runtime providers | Anthropic, Google Gemini, OpenAI (Responses API), OpenAI-compatible (Chat Completions) |
| Resilience | Retry with backoff, per-model timeout (`AbortSignal`), optional alias fallback |
| Ops | Helmet, Pino, Sentry AI metrics, Prometheus `GET /metrics`, readiness probes, Docker Compose, VPS deploy via GitHub Actions |
| Tooling | Interactive CLI (`gateway config:init`, provider/model/client CRUD, `provider:test`) |

Contract source of truth: [`openapi.json`](openapi.json). Swagger UI (when enabled): `http://localhost:3000/api/v1/api-docs`.

---

## Architecture at a glance

```
Client / IDE
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  HTTP surfaces                                          │
│  Native /api/v1/chat*   OpenAI facade   Anthropic facade│
│                         (Cursor)         (Claude Code)  │
└────────────────────────────┬────────────────────────────┘
                             ▼
                      ChatService + resilience
                             ▼
                   Provider registry (by instance)
                             ▼
         Anthropic · Gemini · OpenAI · OpenAI-compatible
```

**Facade ≠ provider.** An HTTP facade only matches a client contract. Which LLM runs is decided solely by `model` / `modelAlias` → `models[]` → `providerInstance` in YAML. You can call the OpenAI facade while the alias points at Gemini.

Auth for clients uses the gateway allowlist (`X-Gateway-Key` / Bearer / `x-api-key` depending on surface) — not vendor OpenAI/Anthropic keys. Vendor keys live in `.env` under names referenced by `apiKeyRef` in YAML.

Deep dive: [`docs/integrations.md`](docs/integrations.md), [`docs/dictionary.md`](docs/dictionary.md), [`docs/architecture.md`](docs/architecture.md).

---

## Quick start

**Requirements:** Node.js 20+, npm.

```bash
git clone <your-fork-or-clone-url>
cd ai-provider-gateway
npm install
```

### Configure

**Option A — CLI wizard (recommended locally):**

```bash
npm run cli config:init
```

Generates/updates `gateway.config.yaml`, `.env`, and system-prompt templates.

**Option B — templates (Docker / manual):**

```bash
cp deployment/templates/gateway.config.example.yaml gateway.config.yaml
cp deployment/templates/.env.example .env
# Fill provider keys, MASTER_KEY, and GATEWAY_KEY_* so names match *KeyRef in YAML
```

Validate, then run:

```bash
npm run cli config:validate
npm run start:dev
```

Default: `http://localhost:3000`, API prefix `/api/v1`.

Details: [`docs/configuration.md`](docs/configuration.md), [`docs/command_line_interface.md`](docs/command_line_interface.md).

### First request

Replace `YOUR_GATEWAY_KEY` with a client key from your `.env` / YAML.

```bash
curl -s http://localhost:3000/api/v1/health

curl -s -X POST "http://localhost:3000/api/v1/chat" \
  -H "content-type: application/json" \
  -H "X-Gateway-Key: YOUR_GATEWAY_KEY" \
  -d '{"modelAlias":"chat-default","messages":[{"role":"user","content":"Say hello in one sentence."}]}'
```

More examples (stream, models, thinking, tooling): [`docs/api-documentation.md`](docs/api-documentation.md), [`docs/endpoints.md`](docs/endpoints.md).

### Docker (optional)

```bash
docker network create ai-gateway-network   # once
npm run docker:build && npm run docker:up  # gateway only
# npm run docker:up:full                   # + Redis + Prometheus + Grafana
```

Full guide: [`docs/deployment.md`](docs/deployment.md).

---

## Connect a client (IDE or other)

| Client | Base URL | Auth |
|--------|----------|------|
| OpenAI API contract (e.g. Cursor) | `http://localhost:3000/api/v1/openai` | `Authorization: Bearer <gateway_client_key>` |
| Anthropic Messages contract (e.g. Claude Code) | `http://localhost:3000/api/v1/anthropic` | `x-api-key` or Bearer `<gateway_client_key>` |

Use **model aliases** from your YAML (e.g. `chat-default`), not raw vendor model IDs, unless you configured them that way.

Guides: [`docs/openai-contract-integration.md`](docs/openai-contract-integration.md), [`docs/anthropic-messages-integration.md`](docs/anthropic-messages-integration.md).

---

## Project structure

Top-level layout:

```
ai-provider-gateway/
├── src/                  # NestJS application + Gateway CLI
├── test/                 # E2E, security, integration Jest suites
├── deployment/           # Docker, monitoring, env/YAML templates, VPS scripts
├── docs/                 # English documentation (Polish: docs/pl/)
├── bin/                  # `gateway` CLI entry (separate from HTTP server)
├── scripts/              # Offline helpers (e.g. config validate)
├── openapi.json          # OpenAPI 3.1 HTTP contract
├── gateway.config.yaml   # Working config (aliases, providers, clients)
└── package.json
```

### `src/` — where to look

| Path | Responsibility |
|------|----------------|
| `src/main.ts`, `setup.app.ts` | Bootstrap, global prefix `/api/v1`, Helmet, body limit |
| `src/chat/` | Native chat + SSE, orchestration, resilience (`ResilientExecutor`) |
| `src/models/` | Shared model-alias catalog for native API and facades |
| `src/providers/` | Runtime LLM adapters / SDK factories (Anthropic, Google, OpenAI, compatible) |
| `src/integrations/` | HTTP facades for Cursor / Claude Code (not the same as runtime adapters) |
| `src/config/` | YAML/env loading, schema validation, system prompts |
| `src/cache/`, `src/rate-limit/` | Optional Redis response cache and smart rate limiting |
| `src/observability/` | Sentry LLM metrics + Prometheus app metrics |
| `src/common/` | Filters, middleware, brand types, shared errors |
| `src/cli/` | Interactive CLI (`config:init`, provider/model/client commands) |
| `src/health/`, `src/swagger/` | Health/readiness and OpenAPI export / UI |

### Tests and deploy layout

| Path | Responsibility |
|------|----------------|
| `test/e2e/` | HTTP contract tests with mocked providers |
| `test/security/` | Auth bypass, Helmet, disclosure, fuzzing |
| `test/integration/` | Live SDK + Redis (Docker) |
| `deployment/docker/` | Compose stacks (MVP, Redis, monitoring, Ollama, dev) |
| `deployment/templates/` | Example `gateway.config.yaml` and `.env` |
| `.github/workflows/` | CI and VPS deploy |

**Full tree and file-level notes:** [`docs/project.structure.md`](docs/project.structure.md).

---

## Documentation

Start here: [`docs/README.md`](docs/README.md) (reading order + full index).

| If you need… | Read |
|--------------|------|
| Product purpose / scope | [`docs/conceptual-documentation.md`](docs/conceptual-documentation.md) |
| Modules and boundaries | [`docs/architecture.md`](docs/architecture.md) |
| Repo tree | [`docs/project.structure.md`](docs/project.structure.md) |
| HTTP examples | [`docs/api-documentation.md`](docs/api-documentation.md), [`docs/endpoints.md`](docs/endpoints.md) |
| Env + YAML | [`docs/configuration.md`](docs/configuration.md) |
| Error codes / glossary | [`docs/dictionary.md`](docs/dictionary.md) |
| CLI reference | [`docs/command_line_interface.md`](docs/command_line_interface.md) |
| Docker / VPS | [`docs/deployment.md`](docs/deployment.md) |
| Test layers | [`docs/testing.md`](docs/testing.md) |
| Security policy | [`SECURITY.md`](SECURITY.md) |

Polish translations: [`docs/pl/`](docs/pl/).

---

## Common scripts

```bash
npm run start:dev          # HTTP server (watch)
npm run build && npm run start:prod

npm run cli                # Gateway CLI welcome
npm run cli config:init
npm run cli config:validate
npm run cli provider:test

npm test                   # Unit (src/, excluding CLI)
npm run test:cli
npm run test:e2e
npm run test:security
npm run test:integration   # live; needs Docker Redis + .env.test
npm run test:all           # unit + e2e

npm run openapi:export
npm run docker:up / docker:up:full / docker:down
```

Counters and suite details: [`docs/testing.md`](docs/testing.md). Make targets: [`Makefile`](Makefile).

---

## Distribution

Licensed under **MIT**. You may clone, fork, modify, and deploy your own instances.

**Upstream does not accept third-party pull requests.** Changes to the author’s `main` are maintainer-only. Fork the repo to build on it. Cloning for recruitment review or portfolio is welcome.

`"private": true` in `package.json` means this package is **not** published to npm — run from source or your own images.

Further notes: [`docs/conceptual-documentation.md`](docs/conceptual-documentation.md) (“Repository model”).
