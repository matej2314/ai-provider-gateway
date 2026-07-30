# Directory and file architecture

This document describes the **directory and file structure** of the _AI Provider Gateway_ project (state synchronized with the repository).

Rules:

- The structure is **modular** (NestJS); LLM providers layer (factories + registry) — `src/providers/`; official contract HTTP facades — `src/integrations/`.
- Items marked _(plan)_ do not exist in the code or are outside the MVP core.
- **Omitted from the tree:** `node_modules/`, `dist/`, `.git/`, local `.env` (do not commit).
- **`*.spec.ts`** files — unit tests next to modules; listed collectively where they occur.
- **`*.md`** files in the repo root outside `README.md`, `SECURITY.md`, and `LICENSE` — working notes/plans (outside the product contract).
- **Upstream without external contributions:** the repository is MIT and may be cloned/forked, but **PRs from third parties to upstream are not accepted** — develop your own copy via fork; details: [`README.md`](../README.md), [`conceptual-documentation.md`](conceptual-documentation.md).

---

## 1) Repository tree

```
ai-provider-gateway/
├── openapi.json                    # OpenAPI 3.1 (HTTP contract; generated: npm run openapi:export)
├── gateway.config.example.yaml     # PLACEHOLDER YAML for setup (copy → gateway.config.yaml)
├── gateway.config.yaml             # working configuration (local; generated/updated by gateway config:init)
├── package.json
├── package-lock.json
├── README.md
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.mjs
├── .prettierrc
├── .env.example                    # env template paired with gateway.config.example.yaml
├── .env                            # local — do not commit
├── .gateway-wizard-state.json      # local — unfinished config:init state (resume)
├── backup/                         # local — YAML/.env backups from CLI (backup/* in .gitignore)
├── .gitignore
├── mcp.json                        # MCP config for IDE (Cursor) — not loaded by gateway at startup
│
├── deployment/                     # Docker, monitoring, VPS scripts
│   ├── docker/
│   │   ├── Dockerfile              # Multi-stage build (production)
│   │   ├── docker-compose.yml      # MVP: gateway only
│   │   └── docker-compose.*.yml    # redis, monitoring, ollama, dev
│   ├── monitoring/                 # Prometheus, Grafana, alerts
│   ├── scripts/                    # deploy-production.sh, deploy-staging.sh, rollback.sh (Actions)
│   └── templates/                  # optional CI/mirror PLACEHOLDER copies (prefer root examples)
│
├── bin/                            # CLI entry point (separate from HTTP app)
│   ├── gateway-cli-wrapper.js      # npm bin — compiled dist/ or fallback ts-node (no build)
│   └── gateway-cli.ts              # CommandFactory.run(CliModule)
│
├── scripts/
│   ├── validate-config.ts          # npm run config:validate — offline gateway.config.yaml validation (validateGatewayConfig)
│   ├── generate-key.sh             # empty wrapper — use `gateway key:generate`
│   └── generate-key.ps1            # empty wrapper — use `gateway key:generate`
│
├── test/
│   ├── jest-e2e.json
│   ├── jest-cli.json                 # npm run test:cli — src/cli/**/*.spec.ts
│   ├── jest-security.json            # npm run test:security — test/security/**/*.security-spec.ts
│   ├── jest-integration.json         # npm run test:integration — live SDK + Redis
│   ├── fixtures/cli/                 # expected wizard outputs (tests)
│   ├── e2e/
│   │   ├── gateway-chat.e2e-spec.ts
│   │   ├── gateway-chat-stream-scenarios.e2e-spec.ts
│   │   ├── gateway-chat-cache.e2e-spec.ts
│   │   ├── native-models.e2e-spec.ts
│   │   ├── facade-models.e2e-spec.ts
│   │   ├── openai-facade.e2e-spec.ts
│   │   ├── openai-facade-extended.e2e-spec.ts
│   │   ├── gateway-chat-openai.e2e-spec.ts
│   │   ├── anthropic-facade.e2e-spec.ts
│   │   ├── anthropic-facade-extended.e2e-spec.ts
│   │   ├── helpers/
│   │   │   └── create-e2e-app.ts   # applyHelmet, infra mocks
│   │   └── setup/
│   ├── security/                     # npm run test:security — HTTP hardening
│   │   ├── auth-bypass.security-spec.ts
│   │   ├── helmet-headers.security-spec.ts
│   │   ├── information-disclosure.security-spec.ts
│   │   ├── rate-limit-bypass.security-spec.ts
│   │   ├── fuzzing-inputs.security-spec.ts
│   │   └── helpers/
│   │       ├── create-security-app.ts
│   │       └── scan-response-for-secrets.ts
│   └── integration/                  # live SDK + Redis (Docker); README.md — 15 *.integration-spec.ts files
│       ├── docker-compose.redis.yml
│       ├── fixtures/
│       ├── helpers/
│       │   ├── create-integration-app.ts
│       │   ├── create-openai-integration-app.ts
│       │   ├── create-openai-compatible-integration-app.ts
│       │   ├── require-integration-env.ts
│       │   ├── integration-constants.ts
│       │   └── ... (other helpers)
│       ├── gateway-chat-live.integration-spec.ts
│       ├── gateway-chat-stream-live.integration-spec.ts
│       ├── gateway-chat-alias.integration-spec.ts
│       ├── gateway-chat-cache-redis.integration-spec.ts
│       ├── gateway-chat-cache-tooling.integration-spec.ts
│       ├── gateway-chat-openai-live.integration-spec.ts
│       ├── gateway-chat-openai-stream-live.integration-spec.ts
│       ├── gateway-openai-compatible.integration-spec.ts
│       ├── openai-provider-harness-smoke.integration-spec.ts
│       ├── openai-facade-live.integration-spec.ts
│       ├── openai-facade-stream-live.integration-spec.ts
│       ├── openai-facade-openai-provider-live.integration-spec.ts
│       ├── anthropic-facade-live.integration-spec.ts
│       ├── anthropic-facade-stream-live.integration-spec.ts
│       ├── harness-smoke.integration-spec.ts
│       └── setup/
│
├── src/
│   ├── main.ts                     # NestJS bootstrap, helmet, Swagger, graceful shutdown
│   ├── setup.app.ts                # global prefix api/v1, ValidationPipe, json 1mb, disable x-powered-by, shutdown hooks
│   ├── instrument.ts               # Sentry init (import before app)
│   ├── app.module.ts
│   │
│   ├── swagger/
│   │   ├── swagger.constants.ts    # OPENAPI_VERSION, SWAGGER_UI_PATH, OPENAPI_OUTPUT_FILENAME
│   │   ├── swagger.setup.ts        # createOpenApiDocument, setupSwagger (UI + jsonDocumentUrl)
│   │   └── export-openapi.ts       # npm run openapi:export → openapi.json
│   │
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts              # POST /chat
│   │   ├── chat.controller.spec.ts
│   │   ├── chat-stream.controller.ts       # POST /chat/stream (SSE)
│   │   ├── chat-stream.controller.spec.ts
│   │   ├── chat.service.ts                 # orchestration: cache, limits, ResilientExecutor
│   │   ├── chat.service.spec.ts
│   │   ├── services/
│   │   │   ├── chat-provider-call.service.ts   # complete/stream, LLM metrics, SSE meta/delta
│   │   │   ├── chat-provider-call.service.spec.ts
│   │   │   ├── chat-error-handler.service.ts
│   │   │   ├── chat-error-handler.service.spec.ts
│   │   │   ├── chat-validation.service.ts
│   │   │   ├── chat-validation.service.spec.ts
│   │   │   ├── chat-response-builder.service.ts
│   │   │   ├── chat-response-builder.service.spec.ts
│   │   │   ├── chat-cache-guard.service.ts
│   │   │   └── chat-cache-guard.service.spec.ts
│   │   ├── dto/
│   │   │   ├── chat-request.dto.ts
│   │   │   ├── chat-params.dto.ts
│   │   │   ├── response-format.dto.ts
│   │   │   ├── chat-message.dto.ts
│   │   │   ├── chat-tooling.dto.ts
│   │   │   ├── chat-response.dto.ts
│   │   │   ├── chat-warning.dto.ts
│   │   │   ├── chat-output-text.dto.ts
│   │   │   ├── chat-usage.dto.ts
│   │   │   ├── sse-meta-payload.dto.ts
│   │   │   ├── sse-delta-payload.dto.ts
│   │   │   ├── sse-done-payload.dto.ts
│   │   │   └── sse-stream-description.ts
│   │   ├── types/
│   │   │   ├── chat-message.types.ts          # role user | assistant | tool
│   │   │   ├── gateway-finish-reason.type.ts  # stop | tool_calls | length | content_filter
│   │   │   └── chat.types.ts
│   │   ├── validation/
│   │   │   ├── chat-ingress.types.ts          # ChatIngressProfile
│   │   │   ├── chat-ingress.constants.ts      # INGRESS_LIMITS per profile
│   │   │   ├── chat-ingress.validator.ts      # validateChatIngress()
│   │   │   └── chat-ingress.validator.spec.ts
│   │   ├── helpers/
│   │   │   ├── cache-policy.ts
│   │   │   ├── conversation-id.ts
│   │   │   ├── generation-warnings.ts
│   │   │   ├── metrics.ts
│   │   │   ├── provider-input.ts
│   │   │   ├── provider-input.spec.ts
│   │   │   ├── resolve-provider-call-options.ts
│   │   │   ├── resolve-provider-call-options.spec.ts
│   │   │   ├── retry-policy.ts                # buildRetryPolicyFromResolved
│   │   │   ├── retry-policy.spec.ts
│   │   │   ├── tooling-request.ts
│   │   │   ├── map-provider-finish-reason.ts
│   │   │   ├── map-provider-finish-reason.spec.ts
│   │   │   └── system-prompt.ts
│   │   ├── resilience/                       # retry / timeout / fallback (ChatModule)
│   │   │   ├── resilient-executor.ts
│   │   │   ├── resilient-executor.spec.ts
│   │   │   ├── fallback-chain.ts              # assertNoFallbackCycle (one hop)
│   │   │   ├── fallback-chain.spec.ts
│   │   │   ├── is-retryable-http-error.ts
│   │   │   ├── is-retryable-http-error.spec.ts
│   │   │   └── resilience.types.ts            # RetryPolicy, ResilientExecution*
│   │   └── sse/
│   │       ├── sse-event.type.ts
│   │       └── sse.serializer.ts
│   │
│   ├── models/                               # alias catalog (native GET /models + export for facades)
│   │   ├── models.module.ts
│   │   ├── controllers/
│   │   │   ├── models.controller.ts
│   │   │   └── models.controller.spec.ts
│   │   ├── services/
│   │   │   ├── gateway-models-catalog.service.ts
│   │   │   └── gateway-models-catalog.service.spec.ts
│   │   └── dto/
│   │       ├── gateway-model.dto.ts
│   │       └── models-list-response.dto.ts
│   │
│   ├── providers/
│   │   ├── providers.module.ts             # ProviderRegistryModule + instance bootstrap
│   │   ├── provider-registry.module.ts
│   │   ├── provider-registry.service.ts    # registry by providerInstance (instanceId)
│   │   ├── provider-instances.bootstrap.ts # onApplicationBootstrap: factories + registerInstance
│   │   ├── provider-registry.service.spec.ts
│   │   ├── factories/
│   │   │   ├── adapt-api-key-provider-factory.ts
│   │   │   ├── adapt-api-key-provider-factory.spec.ts
│   │   │   ├── create-anthropic-provider.ts
│   │   │   ├── create-anthropic-provider.spec.ts
│   │   │   ├── create-google-provider.ts
│   │   │   ├── create-google-provider.spec.ts
│   │   │   ├── create-openai-provider.ts
│   │   │   ├── create-openai-provider.spec.ts
│   │   │   ├── create-openai-provider.core.ts
│   │   │   ├── create-openai-provider.core.spec.ts
│   │   │   ├── create-openai-compatible-provider-instance.ts
│   │   │   ├── create-openai-compatible-provider-instance.spec.ts
│   │   │   └── provider-factory.types.ts
│   │   ├── anthropic/
│   │   │   ├── anthropic-tools.mapper.ts
│   │   │   ├── anthropic-thinking.mapper.ts
│   │   │   └── *.spec.ts              # unit: tools, thinking
│   │   ├── google/
│   │   │   ├── google-tools.mapper.ts
│   │   │   └── google-tools.mapper.spec.ts
│   │   ├── openai/
│   │   │   ├── adapters/
│   │   │   │   ├── chat-completions.adapter.ts
│   │   │   │   ├── chat-completions.adapter.spec.ts
│   │   │   │   ├── responses.adapter.ts
│   │   │   │   └── responses.adapter.spec.ts
│   │   │   ├── mappers/
│   │   │   │   ├── openai-params-provider.mapper.ts
│   │   │   │   ├── openai-messages-provider.mapper.ts
│   │   │   │   ├── openai-stream-provider.mapper.ts
│   │   │   │   ├── openai-responses-provider.mapper.ts
│   │   │   │   ├── openai-responses-input-provider.mapper.ts
│   │   │   │   ├── openai-responses-stream-provider.mapper.ts
│   │   │   │   ├── openai-responses-thinking-provider.mapper.ts
│   │   │   │   ├── openai-thinking-provider.mapper.ts
│   │   │   │   ├── openai-tools-provider.mapper.ts
│   │   │   │   ├── openai-map-gateway-metadata.ts
│   │   │   │   ├── openai-error.mapper.ts
│   │   │   │   └── *.spec.ts (next to mappers)
│   │   │   ├── openai-api-surface.models.ts
│   │   │   ├── openai-api-surface.models.spec.ts
│   │   │   └── openai-provider.types.ts
│   │   ├── types/
│   │   │   └── tooling-types.ts
│   │   └── interfaces/
│   │       └── ai-provider.interface.ts
│   │
│   ├── integrations/                       # OpenAI / Anthropic API facades → ChatService
│   │   ├── integrations.module.ts
│   │   ├── integrations.constants.ts       # OPENAI_INTEGRATION_PATH, ANTHROPIC_INTEGRATION_PATH
│   │   ├── openai/
│   │   │   ├── openai.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── openai-chat-completions.controller.ts
│   │   │   │   ├── openai-chat-completions.controller.spec.ts
│   │   │   │   ├── openai-models.controller.ts
│   │   │   │   └── openai-models.controller.spec.ts
│   │   │   ├── mappers/
│   │   │   │   ├── openai-request.mapper.ts
│   │   │   │   ├── openai-request.mapper.spec.ts
│   │   │   │   ├── openai-response.mapper.ts
│   │   │   │   ├── openai-response.mapper.spec.ts
│   │   │   │   ├── openai-stream.mapper.ts
│   │   │   │   ├── openai-stream.mapper.spec.ts
│   │   │   │   ├── openai-tools.mapper.ts
│   │   │   │   ├── openai-tools.mapper.spec.ts
│   │   │   │   ├── openai-messages.mapper.ts
│   │   │   │   ├── openai-messages.mapper.spec.ts
│   │   │   │   ├── openai-models.mapper.ts
│   │   │   │   └── openai-models.mapper.spec.ts
│   │   │   ├── helpers/
│   │   │   │   ├── normalize-openai-content.ts
│   │   │   │   ├── normalize-openai-content.spec.ts
│   │   │   │   └── openai-stream-api-description.ts
│   │   │   ├── guards/
│   │   │   │   ├── openai-bearer-auth.guard.ts
│   │   │   │   └── openai-bearer-auth.guard.spec.ts
│   │   │   ├── filters/
│   │   │   │   ├── openai-exception.filter.ts
│   │   │   │   └── openai-exception.filter.spec.ts
│   │   │   ├── decorators/
│   │   │   │   └── openai-auth.decorator.ts
│   │   │   └── dtos/
│   │   │       ├── openai-chat-message.dto.ts
│   │   │       ├── openai-chat-completion-request.dto.ts
│   │   │       ├── openai-chat-completion-response.dto.ts
│   │   │       ├── openai-models-list-response.dto.ts
│   │   │       └── openai-error-response.dto.ts
│   │   └── anthropic/
│   │       ├── anthropic.module.ts
│   │       ├── controllers/
│   │       │   ├── anthropic-messages.controller.ts
│   │       │   ├── anthropic-messages.controller.spec.ts
│   │       │   ├── anthropic-models.controller.ts
│   │       │   └── anthropic-models.controller.spec.ts
│   │       ├── mappers/
│   │       │   ├── anthropic-request.mapper.ts
│   │       │   ├── anthropic-request.mapper.spec.ts
│   │       │   ├── anthropic-response.mapper.ts
│   │       │   ├── anthropic-response.mapper.spec.ts
│   │       │   ├── anthropic-stream.mapper.ts
│   │       │   ├── anthropic-stream.mapper.spec.ts
│   │       │   ├── anthropic-usage.mapper.ts          # shared usage mapping JSON ↔ stream
│   │       │   ├── anthropic-usage.mapper.spec.ts
│   │       │   ├── anthropic-stop-reason.mapper.ts   # GatewayFinishReason → stop_reason
│   │       │   ├── anthropic-stop-reason.spec.ts
│   │       │   ├── anthropic-tools.mapper.ts
│   │       │   ├── anthropic-tools.mapper.spec.ts
│   │       │   ├── anthropic-models.mapper.ts
│   │       │   └── anthropic-models.mapper.spec.ts
│   │       ├── helpers/
│   │       │   └── anthropic-stream-api-description.ts
│   │       ├── guards/
│   │       │   ├── anthropic-api-key.guard.ts
│   │       │   └── anthropic-api-key.guard.spec.ts
│   │       ├── filters/
│   │       │   ├── anthropic-exception.filter.ts
│   │       │   └── anthropic-exception.filter.spec.ts
│   │       ├── decorators/
│   │       │   └── anthropic-auth.decorator.ts
│   │       └── dtos/
│   │           ├── anthropic-content-block.dto.ts
│   │           ├── anthropic-message.dto.ts
│   │           ├── anthropic-messages-request.dto.ts
│   │           ├── anthropic-messages-response.dto.ts
│   │           ├── anthropic-models-list-response.dto.ts
│   │           └── anthropic-error-response.dto.ts
│   │
│   ├── cli/                                # developer CLI (separate entry point — see bin/)
│   │   ├── cli.module.ts                   # CLI root module — without ConfigModule
│   │   ├── gateway.command.ts              # root command (welcome + command list)
│   │   ├── commands/
│   │   │   ├── config/
│   │   │   │   ├── config-init.command.ts      # gateway config:init — wizard
│   │   │   │   ├── config-validate.command.ts  # gateway config:validate
│   │   │   │   └── config-show.command.ts      # gateway config:show
│   │   │   ├── provider/
│   │   │   │   ├── provider-add.command.ts
│   │   │   │   ├── provider-remove.command.ts
│   │   │   │   ├── provider-edit.command.ts
│   │   │   │   ├── provider-list.command.ts
│   │   │   │   └── provider-test.command.ts
│   │   │   ├── model/
│   │   │   │   ├── model-add.command.ts
│   │   │   │   ├── model-list.command.ts
│   │   │   │   ├── model-remove.command.ts
│   │   │   │   └── model-edit.command.ts
│   │   │   ├── client/
│   │   │   │   ├── client-add.command.ts
│   │   │   │   ├── client-list.command.ts
│   │   │   │   ├── client-edit.command.ts
│   │   │   │   └── client-remove.command.ts
│   │   │   └── key/
│   │   │       └── key-generate.command.ts
│   │   ├── constants/
│   │   │   ├── default-models.ts
│   │   │   ├── model-allow-overrides.ts
│   │   │   └── wizard-steps.ts
│   │   ├── schemas/
│   │   │   └── wizard-state.schema.ts
│   │   ├── services/
│   │   │   ├── cli-config-loader.service.ts
│   │   │   ├── cli-gateway-validator.service.ts   # validateGatewayConfig + validateEnvironment (facade)
│   │   │   ├── cli.services.types.ts
│   │   │   ├── config-generator.service.ts
│   │   │   ├── config-persistence.service.ts
│   │   │   ├── env-patch.service.ts
│   │   │   ├── file-manager.service.ts
│   │   │   ├── key-generator.service.ts
│   │   │   ├── provider-manager.service.ts
│   │   │   ├── model-manager.service.ts
│   │   │   ├── client-manager.service.ts
│   │   │   ├── provider-test.service.ts
│   │   │   ├── wizard-orchestrator.service.ts
│   │   │   ├── wizard-state-manager.service.ts
│   │   │   └── prompts/
│   │   ├── templates/
│   │   │   ├── gateway-config.template.ts
│   │   │   ├── env.template.ts
│   │   │   ├── master-prompt.template.ts
│   │   │   └── model-prompt.template.ts
│   │   └── utils/
│   │       ├── api-key-validation.util.ts
│   │       ├── cli-logger.util.ts
│   │       ├── client-rate-limit.util.ts
│   │       ├── default-model-policy.util.ts
│   │       ├── effective-config-preview.util.ts
│   │       ├── provider-id.util.ts
│   │       └── validation-formatter.util.ts
│   │
│   ├── config/
│   │   ├── configuration.ts                # load YAML, buildEffectiveGatewayConfig, buildAppConfiguration
│   │   ├── app-configuration.types.ts      # AppConfiguration, CacheRuntimeConfig, RateLimitRuntimeConfig, …
│   │   ├── typed-config.ts                 # getAppConfig, getAppConfigOrThrow
│   │   ├── configuration.types.ts
│   │   ├── configuration.helpers.ts
│   │   ├── gateway-config.schema.ts        # GatewayConfigSchema (Zod), EXPECTED_SCHEMA_VERSION
│   │   ├── configuration-validation.service.ts  # facade: validateEnvironment, master key, provider secrets
│   │   ├── config-validator.ts             # validateGatewayConfig (offline YAML + runtime)
│   │   ├── provider-api-key.validation.ts  # apiKeyRef rules (used by facade + CLI helpers)
│   │   ├── provider-base-url.validation.ts # baseUrlRef rules + resolveBaseUrlFromEnv
│   │   ├── env.validation.ts               # EnvironmentVariables (class-validator); called by facade
│   │   ├── provider-types.ts
│   │   └── system-prompt/
│   │       ├── MASTER_SYSTEM_PROMPT.md     # required at startup
│   │       ├── MAIN_SYSTEM_PROMPT.md       # optional
│   │       └── models/
│   │           └── chat-default.md         # per-alias example (more per YAML)
│   │
│   ├── guards/
│   │   ├── gateway-key.guard.ts
│   │   └── smart-rate-limit-guard.ts
│   │
│   ├── rate-limit/
│   │   ├── rate-limit.module.ts
│   │   └── smart-rate-limiter.service.ts
│   │
│   ├── logging/
│   │   ├── logging.module.ts
│   │   ├── logging.service.ts
│   │   ├── logging.service.spec.ts
│   │   ├── logging.tokens.ts
│   │   ├── interfaces/
│   │   │   └── logger.interface.ts
│   │   └── adapters/
│   │       ├── pino-logger.adapter.ts
│   │       ├── console-logger.adapter.ts
│   │       ├── sentry-error-reporting.adapter.ts
│   │       └── noop-error-reporting.adapter.ts
│   │
│   ├── observability/
│   │   ├── observability.module.ts
│   │   ├── ai-metrics/                    # Sentry LLM spans (AiMetricsService)
│   │   │   ├── ai-metrics.module.ts
│   │   │   ├── ai-metrics.service.ts
│   │   │   └── adapters/                  # sentry-ai-metrics, noop-ai-metrics
│   │   └── app-metrics/                   # Prometheus RED + health gauges
│   │       ├── app-metrics.module.ts
│   │       ├── app-metrics.service.ts
│   │       ├── metrics.controller.ts      # GET /metrics
│   │       ├── pre-metrics-scrape.registry.ts
│   │       ├── prometheus.service.ts
│   │       ├── active-streams.tracker.ts
│   │       └── adapters/                  # prometheus-app-metrics, noop-app-metrics
│   │
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   ├── health.controller.spec.ts
│   │   ├── health.service.ts              # evaluateReadiness, publishMetrics, scrape hook
│   │   ├── health.service.spec.ts
│   │   └── dto/
│   │       ├── health-liveness-response.dto.ts
│   │       ├── health-readiness-response.dto.ts
│   │       ├── health-check-item.dto.ts
│   │       └── health-redis-check-item.dto.ts
│   │
│   ├── cache/
│   │   ├── cache.module.ts                 # CacheModule.register({ includeRedisStack: isRedisRequiredFromEnv() })
│   │   ├── should-include-redis-stack.ts   # isRedisRequired — redis cache and/or smart rate limit
│   │   ├── cache.tokens.ts
│   │   ├── cache-registry.service.ts
│   │   ├── response-cache.service.ts
│   │   ├── response-cache.service.spec.ts
│   │   ├── schemas/
│   │   │   └── cached-chat-response.schema.ts  # CachedChatResponseSchema (Zod), parseCachedChatResponse
│   │   ├── types/
│   │   │   └── cached-chat-response.type.ts
│   │   ├── interfaces/
│   │   │   └── cache-backend-interface.ts
│   │   └── adapters/
│   │       ├── noop-cache/
│   │       │   ├── noop-cache.module.ts
│   │       │   └── noop-cache.adapter.ts
│   │       └── redis-cache/
│   │           ├── redis-cache.module.ts
│   │           ├── redis-cache.adapter.ts
│   │           └── redis-connection.service.ts
│   │
│   └── common/
│       ├── readGatewayKeyHeader.ts
│       ├── readClientGatewayKey.ts         # req.gatewayKey (facades) or X-Gateway-Key (native chat)
│       ├── retry-policy-defaults.ts        # RETRY_POLICY_DEFAULTS (maxAttempts / onStatus / timeoutMs / backoff)
│       ├── decorators/
│       │   ├── gateway-key-and-smart-rate-limit.decorator.ts
│       │   ├── api-gateway-error-responses.decorator.ts
│       │   ├── api-openai-error-response.decorator.ts
│       │   ├── api-anthropic-error-response.decorator.ts
│       │   └── api-request-id-header.decorator.ts
│       ├── dtos/
│       │   ├── error-envelope.dto.ts
│       │   ├── gateway-tool-call.dto.ts
│       │   └── gateway-tool-definition.dto.ts
│       ├── errors/
│       │   ├── api-error.code.ts
│       │   ├── api-error.dto.ts
│       │   ├── provider-error.mapper.ts
│       │   └── provider-error.mapper.helpers.ts
│       ├── exceptions/
│       │   └── unsupported-provider.exception.ts
│       ├── filters/
│       │   └── http-exception.filter.ts    # GlobalExceptionFilter (+ entity.too.large → 413)
│       ├── interceptors/
│       │   └── stream-cleanup.interceptor.ts
│       ├── middleware/
│       │   └── request-id.middleware.ts
│       ├── types/
│       │   ├── branded.types.ts            # Brand<K,T>, type aliases, as* helpers
│       │   ├── branded.guards.ts           # create*, is*, regex patterns
│       │   ├── branded.spec.ts             # utilities tests (100% coverage target)
│       │   ├── index.ts                    # barrel export
│       │   └── express.d.ts                # Request.requestId, Request.gatewayKey
│       └── validators/
│           ├── is-string-or-array-of-strings.validator.ts  # ChatParamsDto, OpenAI DTO (stop field)
│           └── is-thinking-budget.validator.ts             # ChatParamsDto.thinkingBudget
│
└── docs/
    ├── pl/                                 # PL documentation
    │   ├── README.md
    │   ├── dokumentacja_koncepcyjna.md
    │   ├── opis_koncepcyjny.md             # alias → dokumentacja_koncepcyjna.md
    │   ├── architektura.md
    │   ├── architektura_api.md
    │   ├── architektura_katalogi_pliki.md
    │   ├── lista_endpointów.md
    │   ├── dokumentacja_api.md
    │   ├── conversation_tracking.md
    │   ├── data_flow.md
    │   ├── konfiguracja.md
    │   ├── dictionary.md
    │   ├── brand_types.md                  # TS brand types — developer guide
    │   ├── anty_patterny.md
    │   ├── integracje.md                   # OpenAI / Anthropic official contract facades
    │   ├── integracja_openai_kontrakt.md   # OpenAI official contract facade
    │   ├── provider_openai_runtime.md      # OpenAI runtime adapter
    │   ├── integracja_anthropic_messages.md # Anthropic official contract facade
    │   ├── CLI.md                          # Gateway CLI (wizard, run)
    │   ├── deployment.md
    │   ├── testy.md                        # unit and E2E tests
    │   └── spec/                           # SDD (to be removed / migrated)
    │       ├── SPEC-README.md
    │       ├── SPEC-PLATFORMA-I-KONTRAKTY.md
    │       ├── SPEC-CHAT.md
    │       ├── SPEC-CHAT-STREAMING.md
    │       ├── SPEC-PROVIDERS.md
    │       ├── SPEC-KONFIGURACJA.md
    │       └── SPEC-HEALTH.md
    ├── README.md                           # EN documentation index (this tree)
    ├── conceptual-documentation.md
    ├── conceptual-overview.md
    ├── architecture.md
    ├── api-architecture.md
    ├── project.structure.md                # this file
    └── …                                   # other EN docs (see docs/README.md)
```

---

## 2) Directory descriptions (responsibilities)

| Directory                                  | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/chat/`**                          | HTTP chat + SSE. **`ChatService`**: shared `prepareRequestForExecution` (ingress, cooldown check), orchestration (`executeChat` with cache / `executeStream` without cache), **`ResilientExecutor`** (`resilience/`). Helper services: **`ChatProviderCallService`**, **`ChatValidationService`**, **`ChatResponseBuilderService`**, **`ChatCacheGuardService`**, **`ChatErrorHandlerService`**. Retry policy: `helpers/retry-policy.ts` + `src/common/retry-policy-defaults.ts`.                                                                                                                                                                                                                                                |
| **`src/providers/`**                     | Port `AIProvider`, SDK factories (`factories/`), instance bootstrap (`ProviderInstancesBootstrap`), registry (`ProviderRegistryService`). Types: `anthropic`, `google`, `openai`, `openai-compatible`. Mappers: `anthropic-tools.mapper.ts`, `anthropic-thinking.mapper.ts`, `google-tools.mapper.ts`, `openai/` (Chat Completions + Responses adapters; routing in `create-openai-provider.core.ts`: `openai` → Responses, `openai-compatible` → Chat Completions). Sole layer with direct vendor SDK use. Multiple YAML entries with the same `type` → multiple factory calls with different API keys / `baseUrlRef`. |
| **`src/integrations/`**                  | HTTP facades (OpenAI API, Anthropic Messages API) — vendor contract ↔ `ChatRequestDto` / `ChatService` mapping. No SDK calls; errors in vendor format (local filters). Anthropic facade: reverse map `finishReason` via `anthropic-stop-reason.mapper.ts`; usage JSON/stream — `anthropic-usage.mapper.ts`. Details: `integrations.md`.                                                                                                                                                                                                                                                                       |
| **`src/config/`**                        | Load `gateway.config.yaml`, Zod schema (`gateway-config.schema.ts`), `buildEffectiveGatewayConfig`, `buildAppConfiguration` → **`AppConfiguration`**, `getAppConfig` / `getAppConfigOrThrow` (`typed-config.ts`). **Validation facade:** `ConfigurationValidationService` (`configuration-validation.service.ts`) — `validateEnvironment`, master key, provider secrets (delegation to `env.validation` / `provider-*-validation`). Offline: `validateGatewayConfig()` (`config-validator.ts`). Prompt files in `system-prompt/`. |
| **`src/chat/resilience/`**               | `ResilientExecutor` — retry, timeout (`AbortSignal` per attempt + deadline → `PROVIDER_TIMEOUT`), one-hop fallback; `fallback-chain.ts`, `is-retryable-http-error.ts`, `resilience.types.ts` (`runOnce(alias, attempt, signal)`). Provider in `ChatModule`; used only by `ChatService`.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **`src/common/`**                        | Error filter, `requestId` middleware, stream interceptor, SDK error mapping, guard and OpenAPI decorators (`ApiGatewayChatErrorResponses`, `ApiOpenAiErrorResponses`, `ApiAnthropicErrorResponses`, `ApiRequestIdHeader`), **`RETRY_POLICY_DEFAULTS`**, **brand types** (`types/branded.*`), Express types (`express.d.ts`), test mocks (`mocks/` — among others `createMockResilientExecutor`), validators (`validators/` — e.g. `stop` as string \| string[]). |
| **`src/cache/`**                         | Response cache only for **`POST /api/v1/chat`** (`noop` / `redis`). Reads validated with **`CachedChatResponseSchema`**. **`RedisConnectionService`** — shared Redis infrastructure (cache + rate limit); predicate `isRedisRequired()` in `should-include-redis-stack.ts`.                                                                                                                                                                                                                                                                                                                                        |
| **`src/guards/`**, **`src/rate-limit/`** | `GatewayKeyGuard`, `SmartRateLimitGuard` (may be used standalone — then it verifies `X-Gateway-Key` itself); `SmartRateLimiterService` + Redis via shared `RedisConnectionService` (loaded when `isRedisRequiredFromEnv()`).                                                                                                                                                                                                                                                                                                                                                                                      |
| **`src/logging/`**                       | Pino structured logging; optional Sentry error reporting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`src/observability/`**                 | **`AiMetricsModule`** (Sentry LLM) + **`AppMetricsModule`** (Prometheus, `GET /metrics`, health gauges, `PreMetricsScrapeRegistry`). See `conversation-tracking.md`, `deployment.md`.                                                                                                                                                                                                                                                                                                                                                                 |
| **`src/health/`**                        | Liveness and readiness; sync health metrics to Prometheus; scrape hook registration in `onModuleInit`. DTOs with `@Api*` decorators for OpenAPI.                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`src/swagger/`**                       | Generate one OpenAPI 3.1 document from code (`@nestjs/swagger`) — native chat, **models**, health, OpenAI/Anthropic facades; `extraModels` + three `securitySchemes` in `swagger.setup.ts`. UI: `/api/v1/api-docs`, JSON: `/api/v1/swagger.json`; export → `openapi.json`.                                                                                                                                                                                                                                                                                                                                                      |
| **`bin/`**                               | CLI entry point: JS wrapper (`gateway-cli-wrapper.js`) runs compiled `dist/bin/gateway-cli.js` or — when build is missing — TypeScript via `ts-node` (`gateway-cli.ts` → `CliModule`). Access: `npm run cli`, `npx gateway`, bin **`gateway`** from `package.json` (after `npm link` or global install).                                                                                                                                                                                                                                                                                                          |
| **`src/cli/`**                           | CLI layer: **does not import** `ConfigModule`. NestJS only for DI. Wizard (`config:init`), config validate/show, CRUD for providers (multi-instance), models, clients, SDK tests, key generation. Details: `command_line_interface.md`, `architecture.md`.                                                                                                                                                                                                                                                                                                                                                                  |
| **`scripts/`**                           | Offline configuration validation (`npm run config:validate` → `validateGatewayConfig()`); key generation — **`gateway key:generate`**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **`test/`**                              | Tests: HTTP E2E (`test/e2e/`, mocks), **security** (`test/security/`), CLI unit (`test/jest-cli.json`), live integration (`test/integration/`). Scripts: `npm run test:e2e`, `npm run test:security`, `npm run test:cli`, `npm run test:integration`, `npm run test:all` (runtime + E2E), `npm run deploy:production`. Details: **`testing.md`**.                                                                                                                                                                                                                                                                                                                                                      |
| **`docs/`**                              | EN documentation in `docs/` (this directory) and PL in `docs/pl/`; SDD in `docs/pl/spec/` (to be removed / migrated).                                                                                                                                                                                                                                                                                                                                                                                                                                              |

---

## 2a) CLI — runtime isolation

The CLI is a **separate layer** with its own entry point, independent of the HTTP bootstrap (`src/main.ts` → `AppModule`):

| Rule                  | Description                                                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No `ConfigModule`**  | `CliModule` does not import `ConfigModule.forRoot()` — avoids deadlock (CLI creates config that the runtime requires at startup).                                                                                                           |
| **No build required**    | Wrapper in `bin/` runs TypeScript via `ts-node` when `dist/` is missing — CLI available after `npm install`.                                                                                                                                 |
| **Dependency direction** | Allowed: `src/config/*` → `src/cli/*` (types, Zod schemas, validators). Forbidden the other way — CLI does not modify runtime logic.                                                                                                      |
| **Config loading**   | `CliConfigLoaderService.loadRawConfig()` — YAML parsing + `GatewayConfigSchema`; **without** resolving env. Full runtime validation — at end of `config:init` wizard; in **`gateway config:validate`** (YAML + `validateEnvironment()` from facade); **`npm run config:validate`** — YAML + runtime rules without full `validateEnvironment()`. |
| **Command convention**    | `gateway <namespace>:<action>`; root command shows welcome and full command list.                                                                                                                                                     |
| **Wizard state**        | `.gateway-wizard-state.json` — resume / rollback after interruption (`WizardStateManager`).                                                                                                                                                   |
| **Mutation backup**      | `FileManagerService.backupFile()` → `backup/<file-name>.backup-<timestamp>` (directory in `.gitignore`).                                                                                                                                  |

Run:

```bash
npm run cli                    # root (welcome)
npm run cli config:init        # configuration wizard
npm run cli config:validate    # YAML + env validation
npm run cli provider:test      # provider SDK test
npx gateway config:init        # alternative (local bin)
npm link && gateway config:init   # optionally — test as after global install
```

`tsconfig.build.json` includes `bin/**/*` — build produces `dist/bin/gateway-cli.js` (faster CLI start).

Full command documentation: **`command_line_interface.md`**.

---

## 3) Feature scope vs documentation

**Test coverage:** suite and case counts — **[`testing.md`](testing.md)** (single source of truth).

**Features in the product** (compare with [`openapi.json`](../openapi.json) and `src/`):

- **Configuration:** root **`gateway.config.example.yaml`** is PLACEHOLDER boilerplate (`placeholder-provider` / `PLACEHOLDER` refs; CLI `isBoilerplateConfig()`); copy to `gateway.config.yaml` and pair with root **`.env.example`**, or run **`gateway config:init`** for a full operational configuration. Provider runtime: factories per type + bootstrap per **`providerInstance`** (Anthropic, Google, OpenAI, openai-compatible) + tool/thinking mappers.
- Standard chat + SSE, `params`, retry/timeout (`AbortSignal`)/fallback/`effectiveModelAlias` (`ResilientExecutor`).
- Error envelope (`GlobalExceptionFilter`), codes **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`** (`api-error.code.ts`).
- `RequestIdMiddleware` — body + response header **`x-request-id`**.
- Gateway key + smart rate limit (`@GatewayKeyAndSmartRateLimit()`).
- System prompt from files, cache (`noop`/`redis`, read validation `CachedChatResponseSchema`), typed config (`AppConfiguration`, `typed-config.ts`), logging + observability (`src/observability/` — Sentry AI metrics, Prometheus app metrics, health gauges on `/metrics`), readiness (`checks.config`, `checks.redis`, `checks.cache`), Prometheus alerts (`deployment/monitoring/alerts.yml`), graceful shutdown.
- `GatewayFinishReason` (`stop` | `tool_calls` | `length` | `content_filter`) in native API; reverse map on Anthropic facade (`anthropic-stop-reason.mapper.ts`).
- OpenAPI/Swagger: `@nestjs/swagger` decorators on native and official contract facade controllers; vendor error schemas (`OpenAiErrorResponseDto`, `AnthropicErrorResponseDto`); `src/swagger/`, export `npm run openapi:export` → [`openapi.json`](../openapi.json).
- **Official contract facades:** `src/integrations/` — OpenAI and Anthropic HTTP contracts (`IntegrationsModule` in `AppModule`), `Request.gatewayKey`, exports from `ChatModule` and `ModelsModule`; routes `/api/v1/openai/…`, `/api/v1/anthropic/…` and native `/api/v1/models` (`integrations.md`, `openai-contract-integration.md`, `anthropic-messages-integration.md`). **Do not confuse** with SDK adapters in `src/providers/` — OpenAI adapter: `provider-openai-runtime.md`.
- **Brand types:** `src/common/types/` — nominal TS types at runtime (keys, identifiers, metrics, policy, `WarningCode`); HTTP DTOs remain primitive — `brand-types.md`.
- **CLI:** `bin/gateway-cli-wrapper.js`, `src/cli/` — **`config:init`** wizard, commands `config:*`, `provider:*`, `model:*`, `client:*`, `key:generate` (interactive mode). Documentation: **`command_line_interface.md`**, section 2a above, `architecture.md`.

**Outside current scope / further development:** non-interactive CLI mode; E2E health; full extended thinking E2E with **live** OpenAI (unit coverage of `responses.adapter.ts`, mock E2E in `gateway-chat-openai.e2e-spec.ts`, Anthropic facade extended). Integration tests require Docker + `.env.test`.

Related: [`openapi.json`](../openapi.json), `configuration.md`, `conceptual-documentation.md`.
