# Architektura katalogów i plików

Ten dokument opisuje **strukturę katalogów i plików** projektu *AI Provider Gateway* (stan zsynchronizowany z repozytorium).

Zasady:

- Struktura jest **modułowa** (NestJS); warstwa providerów LLM (fabryki + rejestr) — `src/providers/`; fasady HTTP dla IDE — `src/integrations/`.
- Elementy oznaczone *(plan)* nie istnieją w kodzie lub są poza rdzeniem MVP.
- **Pominięte w drzewie:** `node_modules/`, `dist/`, `.git/`, lokalne `.env` (nie commitować).
- Pliki **`*.spec.ts`** — testy jednostkowe obok modułów; wypisane zbiorczo tam, gdzie występują.
- Pliki **`*.md`** w katalogu głównym poza `README.md`, `SECURITY.md` i `LICENSE` — notatki/plany robocze (poza kontraktem produktu).
- **Upstream bez zewnętrznych kontrybucji:** repozytorium jest MIT i można je klonować/forkować, ale **PR-y od osób trzecich do upstream nie są przyjmowane** — rozwój własnej kopii przez fork; szczegóły: [`../README.md`](../README.md), [`dokumentacja_koncepcyjna.md`](dokumentacja_koncepcyjna.md).

---

## 1) Drzewo repozytorium

```
ai-provider-gateway/
├── openapi.json                    # OpenAPI 3.1 (kontrakt HTTP; generowany: npm run openapi:export)
├── gateway.config.yaml             # konfiguracja robocza (przykład w repo; generowana/aktualizowana przez gateway config:init)
├── package.json
├── package-lock.json
├── README.md
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.mjs
├── .prettierrc
├── .env.example
├── .env                            # lokalnie — nie commitować
├── .gateway-wizard-state.json      # lokalnie — stan niedokończonego config:init (resume)
├── backup/                         # lokalnie — backupi YAML/.env z CLI (backup/* w .gitignore)
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── mcp.json                        # konfiguracja MCP dla IDE (Cursor) — nie wczytywany przez gateway przy starcie
│
├── bin/                            # entry point CLI (osobny od HTTP app)
│   ├── gateway-cli-wrapper.js      # npm bin — compiled dist/ lub fallback ts-node (bez build)
│   └── gateway-cli.ts              # CommandFactory.run(CliModule)
│
├── scripts/
│   ├── validate-config.ts          # npm run config:validate — walidacja gateway.config.yaml + env offline
│   ├── generate-key.sh             # pusty wrapper — użyj `gateway key:generate`
│   └── generate-key.ps1            # pusty wrapper — użyj `gateway key:generate`
│
├── test/                           # testy E2E HTTP (Jest; szczegóły: docs/testy.md)
│   ├── jest-e2e.json
│   └── e2e/
│       ├── gateway-chat.e2e-spec.ts
│       ├── gateway-chat-stream-scenarios.e2e-spec.ts
│       ├── gateway-chat-cache.e2e-spec.ts
│       ├── openai-facade.e2e-spec.ts
│       ├── openai-facade-extended.e2e-spec.ts
│       ├── anthropic-facade.e2e-spec.ts
│       ├── anthropic-facade-extended.e2e-spec.ts
│       ├── helpers/
│       │   ├── create-e2e-app.ts
│       │   ├── e2e-constants.ts
│       │   ├── e2e-infra-mocks.ts
│       │   ├── e2e-provider-registry.ts
│       │   └── e2e-rate-limiter.ts
│       └── setup/
│           ├── jest-e2e.setup.ts
│           └── mock-configuration.ts
│
├── src/
│   ├── main.ts                     # bootstrap NestJS, Swagger, graceful shutdown
│   ├── setup.app.ts                # global prefix api/v1, ValidationPipe, json 1mb, shutdown hooks
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
│   │   │   ├── retry-policy.ts
│   │   │   ├── tooling-request.ts
│   │   │   ├── map-provider-finish-reason.ts
│   │   │   ├── map-provider-finish-reason.spec.ts
│   │   │   └── system-prompt.ts
│   │   └── sse/
│   │       ├── sse-event.type.ts
│   │       └── sse.serializer.ts
│   │
│   ├── providers/
│   │   ├── providers.module.ts             # ProviderRegistryModule + bootstrap instancji
│   │   ├── provider-registry.module.ts
│   │   ├── provider-registry.service.ts    # rejestr po providerInstance (instanceId)
│   │   ├── provider-instances.bootstrap.ts # onApplicationBootstrap: fabryki + registerInstance
│   │   ├── provider-registry.service.spec.ts
│   │   ├── factories/
│   │   │   ├── create-anthropic-provider.ts
│   │   │   ├── create-anthropic-provider.spec.ts
│   │   │   ├── create-google-provider.ts
│   │   │   └── create-google-provider.spec.ts
│   │   ├── anthropic/
│   │   │   ├── anthropic-tools.mapper.ts
│   │   │   ├── anthropic-thinking.mapper.ts
│   │   │   └── *.spec.ts              # jednostkowe: tools, thinking
│   │   ├── google/
│   │   │   ├── google-tools.mapper.ts
│   │   │   └── google-tools.mapper.spec.ts
│   │   ├── types/
│   │   │   └── tooling-types.ts
│   │   └── interfaces/
│   │       └── ai-provider.interface.ts
│   │
│   ├── integrations/                       # fasady OpenAI / Anthropic API → ChatService (wdrożone)
│   │   ├── integrations.module.ts
│   │   ├── integrations.constants.ts       # OPENAI_INTEGRATION_PATH, ANTHROPIC_INTEGRATION_PATH
│   │   ├── openai/
│   │   │   ├── openai.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── openai-chat-completions.controller.ts
│   │   │   │   ├── openai-chat-completions.controller.spec.ts
│   │   │   │   ├── openai-models.controller.ts
│   │   │   │   └── openai-models.controller.spec.ts
│   │   │   ├── services/
│   │   │   │   ├── openai-models-catalog.service.ts
│   │   │   │   └── openai-models-catalog.service.spec.ts
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
│   │   │   │   └── openai-messages.mapper.spec.ts
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
│   │       ├── services/
│   │       │   ├── anthropic-models-catalog.service.ts
│   │       │   └── anthropic-models-catalog.service.spec.ts
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
│   │       │   └── anthropic-tools.mapper.spec.ts
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
│   │   │   └── default-models.ts           # domyślne modelId per provider (wizard)
│   │   ├── services/
│   │   │   ├── cli-config-loader.service.ts
│   │   │   ├── cli.services.types.ts
│   │   │   ├── config-generator.service.ts # generowanie YAML, .env, promptów (wizard)
│   │   │   ├── config-persistence.service.ts # backup + zapis YAML po mutacjach
│   │   │   ├── env-patch.service.ts        # setVar / removeVar w .env
│   │   │   ├── file-manager.service.ts     # backup do backup/, read/write YAML i .env
│   │   │   ├── key-generator.service.ts
│   │   │   ├── provider-manager.service.ts # add / remove / edit providerInstance
│   │   │   ├── model-manager.service.ts      # add / remove / edit aliasów
│   │   │   ├── client-manager.service.ts     # add / remove / edit klientów
│   │   │   ├── provider-test.service.ts      # lekkie testy SDK Anthropic / Google
│   │   │   ├── wizard-orchestrator.service.ts
│   │   │   ├── wizard-state-manager.service.ts  # .gateway-wizard-state.json
│   │   │   └── prompts/                    # prompty wizarda config:init
│   │   │       ├── key-prompt.service.ts
│   │   │       ├── provider-prompt.service.ts
│   │   │       ├── model-prompt.service.ts
│   │   │       ├── client-prompt.service.ts
│   │   │       └── server-prompt.service.ts
│   │   ├── templates/
│   │   │   ├── gateway-config.template.ts
│   │   │   ├── env.template.ts
│   │   │   ├── master-prompt.template.ts
│   │   │   └── model-prompt.template.ts
│   │   └── utils/
│   │       ├── cli-logger.util.ts          # kolorowy output (chalk, ora)
│   │       └── validation-formatter.util.ts
│   │
│   ├── config/
│   │   ├── configuration.ts                # load YAML, buildEffectiveGatewayConfig, buildAppConfiguration
│   │   ├── app-configuration.types.ts      # AppConfiguration, CacheRuntimeConfig, RateLimitRuntimeConfig, …
│   │   ├── typed-config.ts                 # getAppConfig, getAppConfigOrThrow
│   │   ├── configuration.types.ts
│   │   ├── configuration.helpers.ts
│   │   ├── gateway-config.schema.ts        # GatewayConfigSchema (Zod), EXPECTED_SCHEMA_VERSION
│   │   ├── config-validator.ts             # validateGatewayConfig() — CLI + npm run config:validate
│   │   ├── env.validation.ts
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
│   ├── metrics/
│   │   ├── metrics.module.ts
│   │   ├── metrics.service.ts
│   │   ├── metrics.service.spec.ts
│   │   ├── metrics.tokens.ts
│   │   ├── interfaces/
│   │   │   └── metrics-backend.interface.ts
│   │   └── adapters/
│   │       ├── sentry-metrics.adapter.ts
│   │       └── noop-metrics.adapter.ts
│   │
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   ├── health.controller.spec.ts
│   │   ├── health.service.ts
│   │   ├── health.service.spec.ts
│   │   └── dto/
│   │       ├── health-liveness-response.dto.ts
│   │       ├── health-readiness-response.dto.ts
│   │       ├── health-check-item.dto.ts
│   │       └── health-redis-check-item.dto.ts
│   │
│   ├── cache/
│   │   ├── cache.module.ts                 # CacheModule.register({ includeRedisStack: isRedisRequiredFromEnv() })
│   │   ├── should-include-redis-stack.ts   # isRedisRequired — cache redis i/lub smart rate limit
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
│       ├── readClientGatewayKey.ts         # req.gatewayKey (fasady) lub X-Gateway-Key (natywny czat)
│       ├── retry-policy-defaults.ts        # domyślne onStatus / maxAttempts / timeoutMs
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
│       │   └── http-exception.filter.ts    # GlobalExceptionFilter
│       ├── interceptors/
│       │   └── stream-cleanup.interceptor.ts
│       ├── middleware/
│       │   └── request-id.middleware.ts
│       ├── resilience/
│       │   ├── resilient-executor.ts
│       │   ├── fallback-chain.ts
│       │   ├── is-retryable-http-error.ts
│       │   └── resilience.types.ts
│       ├── types/
│       │   └── express.d.ts                # Request.requestId, Request.gatewayKey (fasady)
│       └── validators/
│           ├── is-string-or-array-of-strings.validator.ts  # ChatParamsDto, OpenAI DTO (pole stop)
│           └── is-thinking-budget.validator.ts             # ChatParamsDto.thinkingBudget
│
└── docs/
    ├── README.md
    ├── dokumentacja_koncepcyjna.md
    ├── architektura.md
    ├── architektura_api.md
    ├── architektura-katalogi-pliki.md      # ten plik
    ├── lista_endpointów.md
    ├── dokumentacja_api.md
    ├── conversation-tracking.md
    ├── data_flow.md
    ├── konfiguracja.md
    ├── dictionary.md
    ├── anty-patterny.md
    ├── integracje.md                       # fasady OpenAI / Anthropic (IDE)
    ├── integracja-openai-kontrakt.md       # fasada OpenAI (Cursor)
    ├── provider-openai-runtime.md          # adapter runtime OpenAI (plan)
    ├── integracja-anthropic-messages.md  # fasada Anthropic (Claude Code)
    ├── opis_koncepcyjny.md                 # alias → dokumentacja_koncepcyjna.md
    ├── CLI.md                              # dokumentacja Gateway CLI (wizard, uruchomienie)
    ├── testy.md                            # testy jednostkowe i E2E
    └── spec/
        ├── SPEC-README.md
        ├── SPEC-PLATFORMA-I-KONTRAKTY.md
        ├── SPEC-CHAT.md
        ├── SPEC-CHAT-STREAMING.md
        ├── SPEC-PROVIDERS.md
        ├── SPEC-KONFIGURACJA.md
        └── SPEC-HEALTH.md
```

### Notatki robocze (katalog główny, opcjonalnie)

Poza dokumentacją produktową w `docs/` mogą występować lokalne plany/notatki, np. `PLAN_IMPLEMENTACJI.md`, `*_refactor.md` — nie są częścią kontraktu API ani wdrożenia gatewaya.

---

## 2) Opis katalogów (odpowiedzialności)

| Katalog | Odpowiedzialność |
|---------|------------------|
| **`src/chat/`** | HTTP czat + SSE. **`ChatService`**: wspólne `prepareRequestForExecution` (ingress, cooldown check), orkiestracja (`executeChat` z cache / `executeStream` bez cache), `ResilientExecutor`. Serwisy pomocnicze: **`ChatProviderCallService`**, **`ChatValidationService`**, **`ChatResponseBuilderService`**, **`ChatCacheGuardService`**, **`ChatErrorHandlerService`**. |
| **`src/providers/`** | Port `AIProvider`, fabryki SDK (`factories/`), bootstrap instancji (`ProviderInstancesBootstrap`), rejestr (`ProviderRegistryService`). Mapery: `anthropic-tools.mapper.ts`, `anthropic-thinking.mapper.ts`, `google-tools.mapper.ts`. Jedyna warstwa z bezpośrednim użyciem SDK vendorów. Wiele wpisów YAML z tym samym `type` → wiele wywołań fabryki z różnymi kluczami API. |
| **`src/integrations/`** | Fasady HTTP (OpenAI API, Anthropic Messages API) — mapowanie kontraktu vendora ↔ `ChatRequestDto` / `ChatService`. Bez wywołań SDK; błędy w formacie vendora (lokalne filtry). Fasada Anthropic: reverse map `finishReason` przez `anthropic-stop-reason.mapper.ts`; usage JSON/stream — `anthropic-usage.mapper.ts`. Szczegóły: `integracje.md`. |
| **`src/config/`** | Wczytanie `gateway.config.yaml`, schemat Zod (`gateway-config.schema.ts`), `buildEffectiveGatewayConfig`, `buildAppConfiguration` → **`AppConfiguration`**, `getAppConfig` / `getAppConfigOrThrow` (`typed-config.ts`), `validateGatewayConfig()` (`config-validator.ts`), `gatewayKey`, `resolvedSystemPrompts`, obiekty `cache`/`redis` z env. Pliki promptu w `system-prompt/`. |
| **`src/common/resilience/`** | `ResilientExecutor` — retry, timeout, fallback; używany przez `ChatService`. Polityka per alias: `src/chat/helpers/retry-policy.ts` + `retry-policy-defaults.ts`. |
| **`src/common/`** | Filtr błędów, middleware `requestId`, interceptor streamu, mapowanie błędów SDK, dekoratory guardów i OpenAPI (`ApiGatewayChatErrorResponses`, `ApiOpenAiErrorResponses`, `ApiAnthropicErrorResponses`, `ApiRequestIdHeader`), typy Express, walidatory (`validators/` — np. `stop` jako string \| string[]). |
| **`src/cache/`** | Cache odpowiedzi tylko dla **`POST /api/v1/chat`** (`noop` / `redis`). Odczyt walidowany **`CachedChatResponseSchema`**. **`RedisConnectionService`** — współdzielona infrastruktura Redis (cache + rate limit); predykat `isRedisRequired()` w `should-include-redis-stack.ts`. |
| **`src/guards/`**, **`src/rate-limit/`** | `GatewayKeyGuard`, `SmartRateLimitGuard` (może być użyty samodzielnie — wtedy sam weryfikuje `X-Gateway-Key`); `SmartRateLimiterService` + Redis przez wspólny `RedisConnectionService` (ładowany gdy `isRedisRequiredFromEnv()`). |
| **`src/logging/`**, **`src/metrics/`** | Pino / Sentry (opcjonalnie), spany LLM, `conversationId` → Sentry — patrz `conversation-tracking.md`. |
| **`src/health/`** | Liveness i readiness (`checks.config`, `checks.redis`, `checks.cache`); DTO z dekoratorami `@Api*` dla OpenAPI. |
| **`src/swagger/`** | Generowanie jednego dokumentu OpenAPI 3.1 z kodu (`@nestjs/swagger`) — czat natywny, health, fasady OpenAI/Anthropic; `extraModels` + trzy `securitySchemes` w `swagger.setup.ts`. UI: `/api/v1/api-docs`, JSON: `/api/v1/swagger.json`; eksport → `openapi.json`. |
| **`bin/`** | Entry point CLI: wrapper JS (`gateway-cli-wrapper.js`) uruchamia skompilowany `dist/bin/gateway-cli.js` lub — gdy brak build — TypeScript przez `ts-node` (`gateway-cli.ts` → `CliModule`). Dostęp: `npm run cli`, `npx gateway`, bin **`gateway`** z `package.json` (po `npm link` lub instalacji globalnej). |
| **`src/cli/`** | Warstwa CLI: **nie importuje** `ConfigModule`. NestJS tylko dla DI. Wizard (`config:init`), walidacja/wyświetlanie configu, CRUD providerów (multi-instance), modeli, klientów, testy SDK, generowanie kluczy. Szczegóły: `CLI.md`, `architektura.md`. |
| **`scripts/`** | Walidacja konfiguracji offline (`npm run config:validate` → `validateGatewayConfig()`); generowanie kluczy — **`gateway key:generate`**. |
| **`test/`** | Testy E2E HTTP (Jest): natywny czat, fasady OpenAI/Anthropic; bootstrap `createE2eApp()` z mockami `ConfigService`, `ProviderRegistryService`, Redis. Skrypty: `npm run test:e2e`, `npm run test:all`. Szczegóły: **`testy.md`**. |
| **`docs/`** | Dokumentacja i specyfikacje SDD (`spec/`). |

---

## 2a) CLI — izolacja runtime

CLI to **osobna warstwa** z własnym entry pointem, niezależna od bootstrapu HTTP (`src/main.ts` → `AppModule`):

| Zasada | Opis |
|--------|------|
| **Bez `ConfigModule`** | `CliModule` nie importuje `ConfigModule.forRoot()` — unika deadlocku (CLI tworzy config, którego runtime wymaga przy starcie). |
| **Bez wymogu build** | Wrapper w `bin/` uruchamia TypeScript przez `ts-node`, gdy brak `dist/` — CLI dostępne po `npm install`. |
| **Kierunek zależności** | Dozwolone: `src/config/*` → `src/cli/*` (typy, schematy Zod, walidatory). Zabronione odwrotnie — CLI nie modyfikuje logiki runtime. |
| **Ładowanie configu** | `CliConfigLoaderService.loadRawConfig()` — parsowanie YAML + `GatewayConfigSchema`; **bez** rozwiązywania env. Pełna walidacja runtime — w `config:init` na końcu wizarda, w `gateway config:validate` oraz w `npm run config:validate`. |
| **Konwencja komend** | `gateway <namespace>:<action>`; root command wyświetla welcome i pełną listę komend. |
| **Stan wizarda** | `.gateway-wizard-state.json` — resume / rollback po przerwaniu (`WizardStateManager`). |
| **Backup mutacji** | `FileManagerService.backupFile()` → `backup/<nazwa-pliku>.backup-<timestamp>` (katalog w `.gitignore`). |

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

## 3) Stan wdrożenia vs dokumentacja

**Pokrycie testami:** liczby zestawów i przypadków — **[`testy.md`](testy.md)** (single source of truth).

**Wdrożone w kodzie** (porównuj z `openapi.json` i `src/`):

- **Konfiguracja:** przykładowy `gateway.config.yaml` w repo; pełna konfiguracja operacyjna przez wizard **`gateway config:init`**. Runtime providerów: fabryki per typ + bootstrap per **`providerInstance`** (Anthropic, Google) + tool mappers.
- Czat standard + SSE, `params`, retry/fallback/`effectiveModelAlias` (`ResilientExecutor`).
- Error envelope (`GlobalExceptionFilter`), kody **`RATE_LIMITED`** / **`PROVIDER_RATE_LIMITED`** (`api-error.code.ts`).
- `RequestIdMiddleware` — body + nagłówek odpowiedzi **`x-request-id`**.
- Gateway key + smart rate limit (`@GatewayKeyAndSmartRateLimit()`).
- System prompt z plików, cache (`noop`/`redis`, walidacja odczytu `CachedChatResponseSchema`), typed config (`AppConfiguration`, `typed-config.ts`), logging/metrics (Pino, Sentry), readiness (`checks.config`, `checks.redis`, `checks.cache`), graceful shutdown.
- `GatewayFinishReason` (`stop` | `tool_calls` | `length` | `content_filter`) w natywnym API; reverse map na fasadzie Anthropic (`anthropic-stop-reason.mapper.ts`).
- OpenAPI/Swagger: dekoratory `@nestjs/swagger` na kontrolerach natywnych i fasad IDE; schematy błędów vendora (`OpenAiErrorResponseDto`, `AnthropicErrorResponseDto`); `src/swagger/`, eksport `npm run openapi:export` → `openapi.json`.
- **Fasady IDE:** `src/integrations/` — kontrakty HTTP OpenAI i Anthropic (`IntegrationsModule` w `AppModule`), `Request.gatewayKey`, eksporty z `ChatModule`; trasy `/api/v1/openai/…` i `/api/v1/anthropic/…` (`integracje.md`, `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`). **Nie mylić** z adapterami SDK w `src/providers/` — plan OpenAI: `provider-openai-runtime.md`.
- **CLI:** `bin/gateway-cli-wrapper.js`, `src/cli/` — wizard **`config:init`**, komendy `config:*`, `provider:*`, `model:*`, `client:*`, `key:generate` (interaktywny tryb v1). Dokumentacja: **`CLI.md`**, sekcja 2a powyżej, `architektura.md`.

**Pozostałość v1:** tryb non-interactive CLI; testy E2E health/CLI; E2E z **realnym** Redis (obecnie mock connection); natywny extended thinking w E2E (pokrycie jednostkowe + fasada Anthropic extended).

Powiązane: `openapi.json`, `docs/konfiguracja.md`, `docs/dokumentacja_koncepcyjna.md`.
