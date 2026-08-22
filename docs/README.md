# Documentation — AI Provider Gateway

Documentation for the **AI Provider Gateway** project (NestJS): concept, architecture, API contracts, configuration, deployment, and tooling.

> **Languages:** native English documentation lives in `docs/` (this directory). The Polish version is in [`docs/pl/`](pl/).

## Distribution and contributions

The project is licensed under **MIT** — you may clone, fork, modify, and deploy the gateway in your own infrastructure.

**Upstream does not accept external contributions** — pull requests from third parties are not merged. Keep your own changes in a fork. Cloning for recruitment purposes (portfolio, code review) is welcome.

Details: [`conceptual-documentation.md`](conceptual-documentation.md) (“Repository model” section), [`README.md`](../README.md) (“Distribution” section).

## How to read this documentation

1. **First run** — copy `gateway.config.example.yaml` → `gateway.config.yaml` and `.env.example` → `.env`, then fill in secrets / replace placeholders, or run `gateway config:init` ([`configuration.md`](configuration.md), [`command_line_interface.md`](command_line_interface.md)); Docker: [`deployment.md`](deployment.md).
2. **Concept** — [`conceptual-documentation.md`](conceptual-documentation.md) (WHAT / WHY, product scope).
3. **Architecture** — [`architecture.md`](architecture.md) (modules and boundaries), [`api-architecture.md`](api-architecture.md) (HTTP conventions), [`project.structure.md`](project.structure.md) (repo tree).
4. **API** — contract: [`openapi.json`](../openapi.json) (generated: `npm run openapi:export`); Swagger UI: `/api/v1/api-docs`; human-readable description: [`endpoints.md`](endpoints.md), [`api-documentation.md`](api-documentation.md).
5. **Configuration and flows** — [`configuration.md`](configuration.md), [`data-flow.md`](data-flow.md), [`conversation-tracking.md`](conversation-tracking.md).
6. **Official contract facades** — facade ≠ runtime adapter ([`dictionary.md`](dictionary.md)); [`integrations.md`](integrations.md), [`openai-contract-integration.md`](openai-contract-integration.md), [`anthropic-messages-integration.md`](anthropic-messages-integration.md), [`provider-openai-runtime.md`](provider-openai-runtime.md).
7. **Operations** — [`command_line_interface.md`](command_line_interface.md), [`deployment.md`](deployment.md), [`testing.md`](testing.md), [`anti-patterns.md`](anti-patterns.md).

## File index

| File | Description |
|------|------|
| [`conceptual-documentation.md`](conceptual-documentation.md) | Product purpose, audience, scope, assumptions |
| [`conceptual-overview.md`](conceptual-overview.md) | Alias → `conceptual-documentation.md` |
| [`architecture.md`](architecture.md) | Modules, layers, observability, security |
| [`api-architecture.md`](api-architecture.md) | API style, error envelope, streaming, auth |
| [`project.structure.md`](project.structure.md) | Directory tree and responsibilities |
| [`endpoints.md`](endpoints.md) | Quick endpoint list |
| [`api-documentation.md`](api-documentation.md) | Detailed HTTP contract and examples |
| [`conversation-tracking.md`](conversation-tracking.md) | `conversationId` and Sentry Conversations |
| [`configuration.md`](configuration.md) | Env, YAML, cache, rate limit, validation |
| [`data-flow.md`](data-flow.md) | Data flows (Mermaid) |
| [`dictionary.md`](dictionary.md) | Glossary, error codes, parameter matrix |
| [`brand-types.md`](brand-types.md) | TypeScript brand types |
| [`anti-patterns.md`](anti-patterns.md) | Pitfalls and practices to avoid |
| [`integrations.md`](integrations.md) | OpenAI / Anthropic facade architecture |
| [`openai-contract-integration.md`](openai-contract-integration.md) | OpenAI official contract facade |
| [`anthropic-messages-integration.md`](anthropic-messages-integration.md) | Anthropic official contract facade |
| [`provider-openai-runtime.md`](provider-openai-runtime.md) | OpenAI / openai-compatible runtime adapter |
| [`command_line_interface.md`](command_line_interface.md) | Gateway CLI (`gateway <namespace>:<action>`) |
| [`deployment.md`](deployment.md) | Docker Compose and VPS deploy (GitHub Actions) |
| [`testing.md`](testing.md) | Test layers and npm scripts (SoT for counters) |
| [`openapi.json`](../openapi.json) | OpenAPI 3.1 (v0.14.0) — REST contract |
| [`SECURITY.md`](../SECURITY.md) | Security policy |

## Selected topics

| Topic | Where |
|-------|--------|
| Facade vs provider runtime | [`dictionary.md`](dictionary.md), [`integrations.md`](integrations.md) |
| System prompt (server files) | [`configuration.md`](configuration.md), [`architecture.md`](architecture.md) |
| Tool calling / `finishReason` | [`api-documentation.md`](api-documentation.md), [`dictionary.md`](dictionary.md) |
| Cache and smart rate limit | [`configuration.md`](configuration.md) |
| Retry, timeout, fallback | [`configuration.md`](configuration.md), [`api-documentation.md`](api-documentation.md) |
| Observability (Pino, Sentry, Prometheus) | [`architecture.md`](architecture.md), [`deployment.md`](deployment.md) |
| Tests (92 / 1248 unit runtime) | [`testing.md`](testing.md) |

## Specifications (SDD)

The [`pl/spec/`](pl/spec/) directory contains `SPEC-*.md` files (requirements and acceptance criteria). It is slated for removal or migration — when working on the API contract prefer `src/`, [`openapi.json`](../openapi.json), and the documents above.
