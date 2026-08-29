# Architektura katalogów i plików

Ten dokument opisuje **strukturę katalogów i plików** projektu _AI Provider Gateway_ (stan zsynchronizowany z repozytorium).

Zasady:

- Struktura jest **modułowa** (NestJS); warstwa providerów LLM (fabryki + rejestr) — `src/providers/`; fasady HTTP oficjalnych kontraktów — `src/integrations/`.
- Elementy oznaczone _(plan)_ nie istnieją w kodzie lub są poza rdzeniem MVP.
- **Pominięte w drzewie:** `node_modules/`, `dist/`, `.git/`, lokalne `.env` (nie commitować).
- Pliki **`*.spec.ts`** — testy jednostkowe obok modułów; wypisane zbiorczo tam, gdzie występują.
- Pliki **`*.md`** w katalogu głównym poza `README.md`, `SECURITY.md` i `LICENSE` — notatki/plany robocze (poza kontraktem produktu).
- **Upstream bez zewnętrznych kontrybucji:** repozytorium jest MIT i można je klonować/forkować, ale **PR-y od osób trzecich do upstream nie są przyjmowane** — rozwój własnej kopii przez fork; szczegóły: [`README.md`](../../README.md), [`dokumentacja_koncepcyjna.md`](dokumentacja_koncepcyjna.md).

---

## 1) Drzewo repozytorium

```
ai-provider-gateway/
├── openapi.json                    # OpenAPI 3.1 (kontrakt HTTP; generowany: npm run openapi:export)
├── gateway.config.example.yaml     # PLACEHOLDER YAML do setupu (kopiuj → gateway.config.yaml)
├── gateway.config.yaml             # konfiguracja robocza (lokalna; generowana/aktualizowana przez gateway config:init)
├── package.json
├── package-lock.json
├── README.md
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.mjs
├── .prettierrc
├── .env.example                    # szablon env sparowany z gateway.config.example.yaml
├── .env                            # lokalnie — nie commitować
├── .gateway-wizard-state.json      # lokalnie — stan niedokończonego config:init (resume)
├── backup/                         # lokalnie — backupi YAML/.env z CLI (backup/* w .gitignore)
├── .gitignore
├── mcp.json                        # konfiguracja MCP dla IDE (Cursor) — nie wczytywany przez gateway przy starcie
│
├── deployment/                     # Docker, monitoring, skrypty VPS
│   ├── docker/
│   │   ├── Dockerfile              # Multi-stage build (production)
│   │   ├── docker-compose.yml      # serwis gateway (baza stacku = ten plik + redis + ollama-embedding)
│   │   └── docker-compose.*.yml    # redis (Redis Stack :6380), monitoring, ollama (czat LLM), ollama-embedding (qwen3-embedding:0.6b :11435), dev
│   ├── monitoring/                 # Prometheus, Grafana, alerty
│   ├── scripts/                    # deploy-production.sh, deploy-staging.sh, rollback.sh (Actions)
│   └── templates/                  # opcjonalne kopie CI/mirror PLACEHOLDER (preferuj przykłady w root)
│
├── bin/                            # entry point CLI (osobny od HTTP app)
│   ├── gateway-cli-wrapper.js      # npm bin — compiled dist/ lub fallback ts-node (bez build)
│   └── gateway-cli.ts              # CommandFactory.run(CliModule)
│
├── scripts/
│   ├── validate-config.ts          # npm run config:validate — walidacja gateway.config.yaml offline (validateGatewayConfig)
│   ├── generate-key.sh             # pusty wrapper — użyj `gateway key:generate`
│   └── generate-key.ps1            # pusty wrapper — użyj `gateway key:generate`
│
├── test/
│   ├── jest-e2e.json
│   ├── jest-cli.json                 # npm run test:cli — src/cli/**/*.spec.ts
│   ├── jest-security.json            # npm run test:security — test/security/**/*.security-spec.ts
│   ├── jest-integration.json         # npm run test:integration — live SDK + Redis
│   ├── fixtures/cli/                 # oczekiwane wyjścia wizarda (testy)
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
│   │   │   └── create-e2e-app.ts   # applyHelmet, mocki infra
│   │   └── setup/
│   ├── security/                     # npm run test:security — hardening HTTP
│   │   ├── auth-bypass.security-spec.ts
│   │   ├── helmet-headers.security-spec.ts
│   │   ├── information-disclosure.security-spec.ts
│   │   ├── rate-limit-bypass.security-spec.ts
│   │   ├── fuzzing-inputs.security-spec.ts
│   │   └── helpers/
│   │       ├── create-security-app.ts
│   │       └── scan-response-for-secrets.ts
│   └── integration/                  # live SDK + Redis (Docker); README.md — 15 plików *.integration-spec.ts
│       ├── docker-compose.redis.yml
│       ├── fixtures/
│       ├── helpers/
│       │   ├── create-integration-app.ts
│       │   ├── create-openai-integration-app.ts
│       │   ├── create-openai-compatible-integration-app.ts
│       │   ├── require-integration-env.ts
│       │   ├── integration-constants.ts
│       │   └── ... (inne helpery)
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
│   ├── main.ts                     # bootstrap NestJS, helmet, Swagger, graceful shutdown
│   ├── setup.app.ts                # global prefix api/v1, ValidationPipe, json 1mb, disable x-powered-by, shutdown hooks
│   ├── instrument.ts               # inicjalizacja Sentry (import przed app)
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
│   │   ├── chat.service.ts                 # orkiestracja: cache, limity, ResilientExecutor
│   │   ├── chat.service.spec.ts
│   │   ├── services/
│   │   │   ├── chat-provider-call.service.ts   # complete/stream, metryki LLM, SSE meta/delta
│   │   │   ├── chat-provider-call.service.spec.ts
│   │   │   ├── chat-error-handler.service.ts
│   │   │   ├── chat-error-handler.service.spec.ts
│   │   │   ├── chat-validation.service.ts
│   │   │   ├── chat-validation.service.spec.ts
│   │   │   ├── chat-response-builder.service.ts
│   │   │   ├── chat-response-builder.service.spec.ts
│   │   │   ├── chat-cache-pipeline.service.ts
│   │   │   └── chat-cache-pipeline.service.spec.ts
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
│   │   │   ├── fallback-chain.ts              # assertNoFallbackCycle (jeden hop)
│   │   │   ├── fallback-chain.spec.ts
│   │   │   ├── is-retryable-http-error.ts
│   │   │   ├── is-retryable-http-error.spec.ts
│   │   │   └── resilience.types.ts            # RetryPolicy, ResilientExecution*
│   │   └── sse/
│   │       ├── sse-event.type.ts
│   │       └── sse.serializer.ts
│   │
│   ├── models/                               # katalog aliasów (natywny GET /models + export dla fasad)
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
│   │   ├── providers.module.ts             # ProviderRegistryModule + bootstrap instancji
│   │   ├── provider-registry.module.ts
│   │   ├── provider-registry.service.ts    # rejestr po providerInstance (instanceId)
│   │   ├── provider-instances.bootstrap.ts # onApplicationBootstrap: fabryki + registerInstance
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
│   │   │   └── *.spec.ts              # jednostkowe: tools, thinking
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
│   │   │   │   └── *.spec.ts (obok mapperów)
│   │   │   ├── openai-api-surface.models.ts
│   │   │   ├── openai-api-surface.models.spec.ts
│   │   │   └── openai-provider.types.ts
│   │   ├── types/
│   │   │   └── tooling-types.ts
│   │   └── interfaces/
│   │       └── ai-provider.interface.ts
│   │
│   ├── integrations/                       # fasady OpenAI / Anthropic API → ChatService
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
│   │       │   ├── anthropic-usage.mapper.ts          # wspólne mapowanie usage JSON ↔ stream
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
│   ├── cli/                                # CLI developerskie (osobny entry point — patrz bin/)
│   │   ├── cli.module.ts                   # root module CLI — bez ConfigModule
│   │   ├── gateway.command.ts              # root command (welcome + lista komend)
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
│   │   │   ├── cli-gateway-validator.service.ts   # validateGatewayConfig + validateEnvironment (fasada)
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
│   │   ├── configuration-validation.service.ts  # fasada: validateEnvironment, master key, sekrety providerów
│   │   ├── config-validator.ts             # validateGatewayConfig (offline YAML + runtime)
│   │   ├── provider-api-key.validation.ts  # reguły apiKeyRef (używane przez fasadę + CLI helpers)
│   │   ├── provider-base-url.validation.ts # reguły baseUrlRef + resolveBaseUrlFromEnv
│   │   ├── env.validation.ts               # EnvironmentVariables (class-validator); wołane przez fasadę
│   │   ├── provider-types.ts
│   │   └── system-prompt/
│   │       ├── MASTER_SYSTEM_PROMPT.md     # wymagany przy starcie
│   │       ├── MAIN_SYSTEM_PROMPT.md       # opcjonalny
│   │       └── models/
│   │           └── chat-default.md         # przykład per alias (więcej wg YAML)
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
│   │   ├── should-include-redis-stack.ts   # isRedisRequired — exact redis i/lub smart rate limit i/lub semantic-cache
│   │   ├── cache.tokens.ts
│   │   ├── cache-registry.service.ts
│   │   ├── response-cache.service.ts
│   │   ├── response-cache.service.spec.ts
│   │   ├── schemas/
│   │   │   └── cached-chat-response.schema.ts  # CachedChatResponseSchema (Zod), parseCachedChatResponse
│   │   ├── types/
│   │   │   └── cached-chat-response.type.ts
│   │   ├── interfaces/
│   │   │   └── cache-backend-interface.ts  # tylko KV — nie dodawaj Search tutaj
│   │   ├── semantic/                       # porty EmbeddingBackend + VectorStore (nie CacheBackend)
│   │   │   ├── embedding-backend.interface.ts
│   │   │   ├── vector-store.interface.ts
│   │   │   ├── semantic-cache.service.ts   # HASH last-user, potem embed + KNN, próg, reuse wektora przy SET
│   │   │   └── adapters/                   # Ollama POST /api/embed; Redis Search FT.CREATE / KNN
│   │   └── adapters/
│   │       ├── noop-cache/
│   │       │   ├── noop-cache.module.ts
│   │       │   └── noop-cache.adapter.ts
│   │       └── redis-cache/
│   │           ├── redis-cache.module.ts
│   │           ├── redis-cache.adapter.ts
│   │           └── redis-connection.service.ts  # współdzielony: exact KV + rate limit + semantic Search
│   │
│   └── common/
│       ├── readGatewayKeyHeader.ts
│       ├── readClientGatewayKey.ts         # req.gatewayKey (fasady) lub X-Gateway-Key (natywny czat)
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
│       │   ├── branded.types.ts            # Brand<K,T>, aliasy typów, helpery as*
│       │   ├── branded.guards.ts           # create*, is*, wzorce regex
│       │   ├── branded.spec.ts             # testy utilities (100% coverage target)
│       │   ├── index.ts                    # barrel export
│       │   └── express.d.ts                # Request.requestId, Request.gatewayKey
│       └── validators/
│           ├── is-string-or-array-of-strings.validator.ts  # ChatParamsDto, OpenAI DTO (pole stop)
│           └── is-thinking-budget.validator.ts             # ChatParamsDto.thinkingBudget
│
└── docs/
    ├── pl/                                 # dokumentacja PL (ten katalog)
    │   ├── README.md
    │   ├── dokumentacja_koncepcyjna.md
    │   ├── opis_koncepcyjny.md             # alias → dokumentacja_koncepcyjna.md
    │   ├── architektura.md
    │   ├── architektura_api.md
    │   ├── architektura_katalogi_pliki.md  # ten plik
    │   ├── lista_endpointów.md
    │   ├── dokumentacja_api.md
    │   ├── conversation_tracking.md
    │   ├── data_flow.md
    │   ├── konfiguracja.md
    │   ├── dictionary.md
    │   ├── brand_types.md                  # brand types TS — przewodnik developerów
    │   ├── anty_patterny.md
    │   ├── integracje.md                   # fasady oficjalnych kontraktów OpenAI / Anthropic
    │   ├── integracja_openai_kontrakt.md   # fasada OpenAI (Cursor)
    │   ├── provider_openai_runtime.md      # adapter runtime OpenAI
    │   ├── integracja_anthropic_messages.md # fasada oficjalnego kontraktu Anthropic
    │   ├── CLI.md                          # Gateway CLI (wizard, uruchomienie)
    │   ├── deployment.md
    │   ├── testy.md                        # testy jednostkowe i E2E
    │   └── spec/                           # SDD (do usunięcia / migracji)
    │       ├── SPEC-README.md
    │       ├── SPEC-PLATFORMA-I-KONTRAKTY.md
    │       ├── SPEC-CHAT.md
    │       ├── SPEC-CHAT-STREAMING.md
    │       ├── SPEC-PROVIDERS.md
    │       ├── SPEC-KONFIGURACJA.md
    │       └── SPEC-HEALTH.md
    └── (docelowo EN w docs/ bezpośrednio — poza pl/)
```

---

## 2) Opis katalogów (odpowiedzialności)

| Katalog                                  | Odpowiedzialność                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/chat/`**                          | HTTP czat + SSE. **`ChatService`**: wspólne `prepareRequestForExecution` (ingress, cooldown check), orkiestracja (`executeChat` z cache / `resolveStreamCache` + `executeStreamMiss` / `replayStreamCacheHit`), **`StreamCacheReplayService`**, **`ResilientExecutor`** (`resilience/`). Serwisy pomocnicze: **`ChatProviderCallService`**, **`ChatValidationService`**, **`ChatResponseBuilderService`**, **`ChatCachePipelineService`**, **`ChatErrorHandlerService`**. Polityka retry: `helpers/retry-policy.ts` + `src/common/retry-policy-defaults.ts`.                                                                                                                                                                                                                                                |
| **`src/providers/`**                     | Port `AIProvider`, fabryki SDK (`factories/`), bootstrap instancji (`ProviderInstancesBootstrap`), rejestr (`ProviderRegistryService`). Typy: `anthropic`, `google`, `openai`, `openai-compatible`. Mapery: `anthropic-tools.mapper.ts`, `anthropic-thinking.mapper.ts`, `google-tools.mapper.ts`, `openai/` (adapters Chat Completions + Responses; routing w `create-openai-provider.core.ts`: `openai` → Responses, `openai-compatible` → Chat Completions). Jedyna warstwa z bezpośrednim użyciem SDK vendorów. Wiele wpisów YAML z tym samym `type` → wiele wywołań fabryki z różnymi kluczami API / `baseUrlRef`. |
| **`src/integrations/`**                  | Fasady HTTP (OpenAI API, Anthropic Messages API) — mapowanie kontraktu vendora ↔ `ChatRequestDto` / `ChatService`. Bez wywołań SDK; błędy w formacie vendora (lokalne filtry). Fasada Anthropic: reverse map `finishReason` przez `anthropic-stop-reason.mapper.ts`; usage JSON/stream — `anthropic-usage.mapper.ts`. Szczegóły: `integracje.md`.                                                                                                                                                                                                                                                                       |
| **`src/config/`**                        | Wczytanie `gateway.config.yaml`, schemat Zod (`gateway-config.schema.ts`), `buildEffectiveGatewayConfig`, `buildAppConfiguration` → **`AppConfiguration`**, `getAppConfig` / `getAppConfigOrThrow` (`typed-config.ts`). **Fasada walidacji:** `ConfigurationValidationService` (`configuration-validation.service.ts`) — `validateEnvironment`, master key, sekrety providerów (delegacja do `env.validation` / `provider-*-validation`). Offline: `validateGatewayConfig()` (`config-validator.ts`). Pliki promptu w `system-prompt/`. |
| **`src/chat/resilience/`**               | `ResilientExecutor` — retry, timeout (`AbortSignal` per próba + deadline → `PROVIDER_TIMEOUT`), fallback jednego hopu; `fallback-chain.ts`, `is-retryable-http-error.ts`, `resilience.types.ts` (`runOnce(alias, attempt, signal)`). Provider w `ChatModule`; używany wyłącznie przez `ChatService`.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **`src/common/`**                        | Filtr błędów, middleware `requestId`, interceptor streamu, mapowanie błędów SDK, dekoratory guardów i OpenAPI (`ApiGatewayChatErrorResponses`, `ApiOpenAiErrorResponses`, `ApiAnthropicErrorResponses`, `ApiRequestIdHeader`), **`RETRY_POLICY_DEFAULTS`**, **brand types** (`types/branded.*`), typy Express (`express.d.ts`), mocki testowe (`mocks/` — m.in. `createMockResilientExecutor`), walidatory (`validators/` — np. `stop` jako string \| string[]). |
| **`src/cache/`**                         | Cache odpowiedzi dla **`POST /api/v1/chat`** — dwie warstwy: (1) **exact** (`noop` / `redis` KV, `ResponseCacheService`, odczyt walidowany `CachedChatResponseSchema`); (2) **semantyczny** (`src/cache/semantic/` — porty `EmbeddingBackend` + `VectorStore`, adaptery Ollama + Redis Search KNN, `SemanticCacheService`). **`RedisConnectionService`** — współdzielona infrastruktura Redis (cache exact + rate limit + semantic Search); predykat `isRedisRequired()` w `should-include-redis-stack.ts`. Kolejność lookup: exact → semantic → provider. Zapis tylko `finishReason=stop` + niepusty tekst bez `toolCalls`. `requestId` nie w magazynie; hit stempluje bieżące żądanie. Co najwyżej jeden `embed` na żądanie JSON (reuse wektora / brak retry / pierwszy embed gdy lookup go pominął). |
| **`src/guards/`**, **`src/rate-limit/`** | `GatewayKeyGuard`, `SmartRateLimitGuard` (może być użyty samodzielnie — wtedy sam weryfikuje `X-Gateway-Key`); `SmartRateLimiterService` + Redis przez wspólny `RedisConnectionService` (ładowany gdy `isRedisRequiredFromEnv()`).                                                                                                                                                                                                                                                                                                                                                                                      |
| **`src/logging/`**                       | Pino structured logging; opcjonalnie Sentry error reporting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`src/observability/`**                 | **`AiMetricsModule`** (Sentry LLM) + **`AppMetricsModule`** (Prometheus, `GET /metrics`, health gauges, `PreMetricsScrapeRegistry`). Patrz `conversation_tracking.md`, `deployment.md`.                                                                                                                                                                                                                                                                                                                                                                 |
| **`src/health/`**                        | Liveness i readiness; sync metryk health do Prometheus; rejestracja hooka scrape w `onModuleInit`. DTO z dekoratorami `@Api*` dla OpenAPI.                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`src/swagger/`**                       | Generowanie jednego dokumentu OpenAPI 3.1 z kodu (`@nestjs/swagger`) — czat natywny, **models**, health, fasady OpenAI/Anthropic; `extraModels` + trzy `securitySchemes` w `swagger.setup.ts`. UI: `/api/v1/api-docs`, JSON: `/api/v1/swagger.json`; eksport → `openapi.json`.                                                                                                                                                                                                                                                                                                                                                      |
| **`bin/`**                               | Entry point CLI: wrapper JS (`gateway-cli-wrapper.js`) uruchamia skompilowany `dist/bin/gateway-cli.js` lub — gdy brak build — TypeScript przez `ts-node` (`gateway-cli.ts` → `CliModule`). Dostęp: `npm run cli`, `npx gateway`, bin **`gateway`** z `package.json` (po `npm link` lub instalacji globalnej).                                                                                                                                                                                                                                                                                                          |
| **`src/cli/`**                           | Warstwa CLI: **nie importuje** `ConfigModule`. NestJS tylko dla DI. Wizard (`config:init`), walidacja/wyświetlanie configu, CRUD providerów (multi-instance), modeli, klientów, testy SDK, generowanie kluczy. Szczegóły: `CLI.md`, `architektura.md`.                                                                                                                                                                                                                                                                                                                                                                  |
| **`scripts/`**                           | Walidacja konfiguracji offline (`npm run config:validate` → `validateGatewayConfig()`); generowanie kluczy — **`gateway key:generate`**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **`test/`**                              | Testy: E2E HTTP (`test/e2e/`, mocki), **security** (`test/security/`), jednostkowe CLI (`test/jest-cli.json`), integracyjne live (`test/integration/`). Skrypty: `npm run test:e2e`, `npm run test:security`, `npm run test:cli`, `npm run test:integration`, `npm run test:all` (runtime + E2E), `npm run deploy:production`. Szczegóły: **`testy.md`**.                                                                                                                                                                                                                                                                                                                                                      |
| **`docs/`**                              | Dokumentacja anglojęzyczna bezpośrednio w `docs/` oraz dokumentacja PL w `docs/pl/` (ten katalog).                                                                                                                                                                                                                                                                                                                                                                                                                                              |

---

## 2a) CLI — izolacja runtime

CLI to **osobna warstwa** z własnym entry pointem, niezależna od bootstrapu HTTP (`src/main.ts` → `AppModule`):

| Zasada                  | Opis                                                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bez `ConfigModule`**  | `CliModule` nie importuje `ConfigModule.forRoot()` — unika deadlocku (CLI tworzy config, którego runtime wymaga przy starcie).                                                                                                           |
| **Bez wymogu build**    | Wrapper w `bin/` uruchamia TypeScript przez `ts-node`, gdy brak `dist/` — CLI dostępne po `npm install`.                                                                                                                                 |
| **Kierunek zależności** | Dozwolone: `src/config/*` → `src/cli/*` (typy, schematy Zod, walidatory). Zabronione odwrotnie — CLI nie modyfikuje logiki runtime.                                                                                                      |
| **Ładowanie configu**   | `CliConfigLoaderService.loadRawConfig()` — parsowanie YAML + `GatewayConfigSchema`; **bez** rozwiązywania env. Pełna walidacja runtime — w `config:init` na końcu wizarda; w **`gateway config:validate`** (YAML + `validateEnvironment()` z fasady); **`npm run config:validate`** — YAML + reguły runtime bez pełnego `validateEnvironment()`. |
| **Konwencja komend**    | `gateway <namespace>:<action>`; root command wyświetla welcome i pełną listę komend.                                                                                                                                                     |
| **Stan wizarda**        | `.gateway-wizard-state.json` — resume / rollback po przerwaniu (`WizardStateManager`).                                                                                                                                                   |
| **Backup mutacji**      | `FileManagerService.backupFile()` → `backup/<nazwa-pliku>.backup-<timestamp>` (katalog w `.gitignore`).                                                                                                                                  |

Uruchomienie:

```bash
npm run cli                    # root (welcome)
npm run cli config:init        # wizard konfiguracji
npm run cli config:validate    # walidacja YAML + env
npm run cli provider:test      # test SDK providerów
npx gateway config:init        # alternatywa (lokalny bin)
npm link && gateway config:init   # opcjonalnie — test jak po instalacji globalnej
```

`tsconfig.build.json` uwzględnia `bin/**/*` — build produkuje `dist/bin/gateway-cli.js` (szybszy start CLI).

Pełna dokumentacja komend: **`CLI.md`**.

---

## 3) Zakres funkcji vs dokumentacja

**Pokrycie testami:** liczby zestawów i przypadków — **[`testy.md`](testy.md)** (single source of truth).

**Funkcje w produkcie** (porównuj z [`openapi.json`](../../openapi.json) i `src/`):

- **Konfiguracja:** rootowy **`gateway.config.example.yaml`** to PLACEHOLDER boilerplate (`placeholder-provider` / refy `PLACEHOLDER`; CLI `isBoilerplateConfig()`); kopiuj do `gateway.config.yaml` i sparuj z rootowym **`.env.example`**, albo uruchom **`gateway config:init`** dla pełnej konfiguracji operacyjnej. Runtime providerów: fabryki per typ + bootstrap per **`providerInstance`** (Anthropic, Google, OpenAI, openai-compatible) + tool/thinking mappers.
- Czat standard + SSE, `params`, retry/timeout (`AbortSignal`)/fallback/`effectiveModelAlias` (`ResilientExecutor`).
- Error envelope (`GlobalExceptionFilter`), kody **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`** (`api-error.code.ts`).
- `RequestIdMiddleware` — body + nagłówek odpowiedzi **`x-request-id`**.
- Gateway key + smart rate limit (`@GatewayKeyAndSmartRateLimit()`).
- System prompt z plików, cache — exact (`noop`/`redis` KV, `clientId` w hashu, walidacja odczytu `CachedChatResponseSchema`) i semantyczny (`src/cache/semantic/`, Redis Search + `qwen3-embedding:0.6b`), typed config (`AppConfiguration`, `typed-config.ts`), logging + observability (`src/observability/` — Sentry AI metrics, Prometheus app metrics, health gauges na `/metrics`), readiness (`checks.config`, `checks.redis`, `checks.cache`, opcjonalnie `checks.embeddings`), alerty Prometheus (`deployment/monitoring/alerts.yml`), graceful shutdown.
- `GatewayFinishReason` (`stop` | `tool_calls` | `length` | `content_filter`) w natywnym API; reverse map na fasadzie Anthropic (`anthropic-stop-reason.mapper.ts`).
- OpenAPI/Swagger: dekoratory `@nestjs/swagger` na kontrolerach natywnych i fasad oficjalnych kontraktów; schematy błędów vendora (`OpenAiErrorResponseDto`, `AnthropicErrorResponseDto`); `src/swagger/`, eksport `npm run openapi:export` → [`openapi.json`](../../openapi.json).
- **Fasady oficjalnych kontraktów:** `src/integrations/` — kontrakty HTTP OpenAI i Anthropic (`IntegrationsModule` w `AppModule`), `Request.gatewayKey`, eksporty z `ChatModule` i `ModelsModule`; trasy `/api/v1/openai/…`, `/api/v1/anthropic/…` oraz natywny `/api/v1/models` (`integracje.md`, `integracja_openai_kontrakt.md`, `integracja_anthropic_messages.md`). **Nie mylić** z adapterami SDK w `src/providers/` — adapter OpenAI: `provider_openai_runtime.md`.
- **Brand types:** `src/common/types/` — nominalne typy TS w runtime (klucze, identyfikatory, metryki, policy, `WarningCode`); DTO HTTP pozostają prymitywne — `brand_types.md`.
- **CLI:** `bin/gateway-cli-wrapper.js`, `src/cli/` — wizard **`config:init`**, komendy `config:*`, `provider:*`, `model:*`, `client:*`, `key:generate` (interaktywny tryb). Dokumentacja: **`CLI.md`**, sekcja 2a powyżej, `architektura.md`.

**Poza bieżącym zakresem / dalszy rozwój:** tryb non-interactive CLI; E2E health; pełny extended thinking E2E z **live** OpenAI (pokrycie jednostkowe adaptera `responses.adapter.ts`, mock E2E w `gateway-chat-openai.e2e-spec.ts`, fasada Anthropic extended). Integracyjne wymagają Docker + `.env.test`.

Powiązane: [`openapi.json`](../../openapi.json), `konfiguracja.md`, `dokumentacja_koncepcyjna.md`.
