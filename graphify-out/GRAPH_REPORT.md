# Graph Report - ai-provider-gateway  (2026-07-29)

## Corpus Check
- 555 files · ~257,709 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3644 nodes · 10337 edges · 163 communities (150 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `12b20457`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- asProviderInstanceId
- index.ts
- chat.service.ts
- ai-provider.interface.ts
- Community 7
- Community 8
- Community 9
- gateway-models-catalog.service.ts
- responses.adapter.ts
- cache.module.ts
- sentry-ai-metrics.adapter.ts
- configuration.ts
- provider-registry.service.ts
- chat-provider-call.service.ts
- Deployment Guide — AI Provider Gateway
- ModelAlias
- Community 19
- branded.types.ts
- configuration.types.ts
- config-generator.service.ts
- provider-instances.bootstrap.ts
- health.service.ts
- SmartRateLimiterService
- model-manager.service.ts
- anthropic-messages.controller.ts
- create-security-app.ts
- openai-params-provider.mapper.ts
- Community 30
- CLI.md
- Dokumentacja API — AI Provider Gateway
- dependencies
- devDependencies
- test-constants.ts
- chat-response.dto.ts
- swagger.setup.ts
- asGatewayKey
- compilerOptions
- PrometheusAppMetricsAdapter
- GatewayKey
- chat-stream.controller.ts
- AI Provider Gateway (NestJS)
- Brand types — przewodnik dla developerów
- ClientId
- getAppConfig
- api-error.code.ts
- Integracja Anthropic Messages API (Claude Code)
- AppMetricsService
- e2e-provider-registry.ts
- Community 51
- Community 52
- Community 53
- OpenAiChatCompletionRequestDto
- .createMessage
- README.md
- Fasady integracji (IDE) — AI Provider Gateway
- ProviderCallOptions
- .streamChat
- e2e-constants.ts
- Anty‑patterny / na co uważać — AI Provider Gateway
- Dokumentacja koncepcyjna — AI Provider Gateway
- Lista endpointów — AI Provider Gateway
- ChatToolingDto
- .completions
- app-metrics.service.ts
- .getOne
- deploy-production.sh
- Architektura API — AI Provider Gateway
- Śledzenie rozmów (`conversationId`)
- app.module.ts
- .chat
- anthropic-stream.mapper.ts
- provider-error.mapper.ts
- .getOne
- app-metrics-backend.interface.ts
- Community 78
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 89
- Community 91
- EnvironmentVariables
- MetricsController
- Security Policy
- env.validation.ts
- should-include-redis-stack.ts
- Community 101
- rate-limit-bypass.security-spec.ts
- SPEC — Health (liveness/readiness)
- health-readiness-response.dto.ts
- Przepływ danych (data flow) — AI Provider Gateway
- README.md
- Anti-patterns / what to watch for — AI Provider Gateway
- resolve-provider-call-options.ts
- Conceptual documentation — AI Provider Gateway
- create-e2e-app.ts
- provider-base-url.validation.ts
- rollback.sh
- nest-cli.json
- Endpoint list — AI Provider Gateway
- Testy integracyjne (live SDK + Redis)
- provider-registry.service.spec.ts
- Flow sesji (obowiązkowy)
- gateway-cli-wrapper.js
- deploy-staging.sh
- Conversation tracking (`conversationId`)
- OpenAI contract facade (Cursor IDE)
- tsconfig.build.json
- entrypoint.sh
- MASTER_SYSTEM_PROMPT.md
- chat-default.md
- ollama-chat.md
- openai-chat-gpt.md
- configuration.ts
- Architecture — AI Provider Gateway
- Dictionary — AI Provider Gateway
- Testing — AI Provider Gateway
- anthropic-response.mapper.ts
- Data flow — AI Provider Gateway
- OpenAI adapter (provider runtime)
- PrometheusService
- fallback-chain.spec.ts
- Directory and file architecture
- Documentation — AI Provider Gateway
- AnthropicMessagesController
- AI Provider Gateway
- configuration-validation.service.ts
- 5. Pliki nowe — pełna treść
- instrument.ts
- models.controller.ts
- anthropic-tools.mapper.ts
- Gateway Config (CRUD, jedna mutacja)
- Agent protocol (CRUD)
- ModelEditCommand
- 12. Weryfikacja planu vs aktualne `src/cli/`
- 7. Fixtures i przykłady
- CLAUDE.md
- ProviderEditCommand
- ProviderRemoveCommand
- KeyGenerateCommand
- Flow: `client:add`
- Flow: `client:edit`
- Flow: `client:remove`
- ConfigValidateCommand
- Flow: `model:edit`
- Flow: `model:remove`
- Flow: `provider:add`
- Flow: `provider:edit`
- Flow: `provider:remove`
- gemini-flash.md

## God Nodes (most connected - your core abstractions)
1. `asProviderInstanceId()` - 98 edges
2. `LoggingService` - 93 edges
3. `ProviderInstanceId` - 81 edges
4. `ModelAlias` - 80 edges
5. `GatewayConfig` - 73 edges
6. `asEnvRef()` - 64 edges
7. `ApiErrorCode` - 61 edges
8. `GatewayKey` - 60 edges
9. `scripts` - 59 edges
10. `ChatRequestDto` - 57 edges

## Surprising Connections (you probably didn't know these)
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts
- `createOpenAiIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-openai-integration-app.ts → src/app.module.ts
- `createE2eAppWithCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eApp()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eFallbackProviderRegistry()` --indirect_call--> `alias()`  [INFERRED]
  test/e2e/helpers/e2e-provider-registry.ts → src/chat/resilience/resilient-executor.spec.ts

## Import Cycles
- 4-file cycle: `src/cache/should-include-redis-stack.ts -> src/config/typed-config.ts -> src/config/app-configuration.types.ts -> src/config/configuration.ts -> src/cache/should-include-redis-stack.ts`

## Communities (163 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (28): ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), buildIntegrationConfigOptions(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions, IntegrationAppContext (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (3): ModelRemoveCommand, Command, Option

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (16): buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext, INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED, INTEGRATION_OPENAI_MODEL_ID_BRANDED, INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED (+8 more)

### Community 3 - "asProviderInstanceId"
Cohesion: 0.06
Nodes (61): assertInteractiveAllowed(), WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, InitAnswers, CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema (+53 more)

### Community 4 - "index.ts"
Cohesion: 0.17
Nodes (8): CHAT_STREAM_API_DESCRIPTION, SseSerializer, StreamCleanupInterceptor, Injectable, readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey(), requireClientGatewayKey()

### Community 5 - "chat.service.ts"
Cohesion: 0.10
Nodes (14): toSafeClientList(), toSafeProviderList(), ProviderTestCommand, Command, Option, ProviderManagerService, Injectable, AddModelInput (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (14): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (58): scripts, build, build:cli, cli, config:validate, deploy:mvp, deploy:production, deploy:staging (+50 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (58): AgentReport, AgentReportStatus, emitAgentReport(), exitCodeForReport(), exitWithAgentReport(), PendingSecretsItem, loadAnswers(), collectPendingSecrets() (+50 more)

### Community 10 - "gateway-models-catalog.service.ts"
Cohesion: 0.28
Nodes (13): applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext(), buildGenAiChatSpanAttributes(), clearLlmScopeContext(), clearRequestMetadataContext(), SentryAiMetricsAdapter (+5 more)

### Community 11 - "responses.adapter.ts"
Cohesion: 0.10
Nodes (12): ConfigInitCommand, Command, Option, ConfigValidateCommand, Command, Option, CliGatewayValidatorService, Injectable (+4 more)

### Community 12 - "cache.module.ts"
Cohesion: 0.06
Nodes (36): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+28 more)

### Community 13 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.21
Nodes (9): asCostUsd(), CostUsd, NoopAiMetricsAdapter, Injectable, AI_METRICS_BACKEND, AiMetricsBackend, LlmCallMessage, LlmCallObservation (+1 more)

### Community 14 - "configuration.ts"
Cohesion: 0.20
Nodes (5): AiMetricsService, Inject, Injectable, LlmCallContext, LlmStreamSpanController

### Community 15 - "provider-registry.service.ts"
Cohesion: 0.07
Nodes (35): IsPrimitiveMetadataRecord, Matches, ResponseCacheService, Injectable, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader (+27 more)

### Community 16 - "chat-provider-call.service.ts"
Cohesion: 0.18
Nodes (11): IsNotEmpty, ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsString, MaxLength (+3 more)

### Community 17 - "Deployment Guide — AI Provider Gateway"
Cohesion: 0.04
Nodes (45): 1. Sklonuj repozytorium, 2. Konfiguracja, 3. Walidacja (zalecane przed deployem), 4. Sieć Docker (`ai-gateway-network`), 5. Deploy (lokalny Compose), 6. Weryfikacja, Auto-rollback, Checklist produkcyjny (+37 more)

### Community 18 - "ModelAlias"
Cohesion: 0.05
Nodes (49): ChatOutputTextDto, ApiProperty, ChatToolingDto, GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsArray, IsOptional (+41 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (24): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, NoopErrorReportingAdapter, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable (+16 more)

### Community 20 - "branded.types.ts"
Cohesion: 0.05
Nodes (43): `AgentReport` (stdout przy `--json`), Bez buildu projektu, Flagi wspólne (mutacje), Gateway CLI — dokumentacja, `gateway client:add`, `gateway client:edit <clientId>`, `gateway client:list`, `gateway client:remove <clientId>` (+35 more)

### Community 21 - "configuration.types.ts"
Cohesion: 0.11
Nodes (31): asOutputTokens(), ToolCallId, buildGenerationConfig(), createGoogleProvider(), mapStopSequences(), mapThinkingBudgetToGeminiLevel(), extractFromLegacyFields(), extractFromThoughtParts() (+23 more)

### Community 22 - "config-generator.service.ts"
Cohesion: 0.14
Nodes (10): ConfigGeneratorService, Injectable, FileManagerService, Injectable, WizardRunResult, EnvTemplateInput, generateEnvTemplate(), isEnvInputRedisRequired() (+2 more)

### Community 23 - "provider-instances.bootstrap.ts"
Cohesion: 0.13
Nodes (19): createMockLoggingService(), adaptApiKeyProviderFactory(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider(), ApiKeyProviderFactoryFn, ProviderFactoryFn, createChatCompletionsAdapter() (+11 more)

### Community 24 - "health.service.ts"
Cohesion: 0.09
Nodes (23): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthLivenessResponseDto, ApiProperty, HealthReadinessChecksDto, HealthReadinessResponseDto, ApiProperty (+15 more)

### Community 26 - "model-manager.service.ts"
Cohesion: 0.13
Nodes (14): ChatErrorHandlerService, Injectable, isProviderRateLimitError(), resolveClientIdFromKey(), GatewayKey, ResolvedGatewayClient, getAppConfig(), getAppConfigOrThrow() (+6 more)

### Community 27 - "anthropic-messages.controller.ts"
Cohesion: 0.13
Nodes (17): ApiAnthropicErrorResponses(), ApiRequestIdHeader(), AnthropicAuth(), AnthropicErrorBodyDto, AnthropicErrorResponseDto, ApiProperty, AnthropicModelDto, AnthropicModelsListResponseDto (+9 more)

### Community 28 - "create-security-app.ts"
Cohesion: 0.24
Nodes (10): assertSafeFuzzResponse(), expectNoServerError(), DEFAULT_LITERAL_SECRETS, expectNoSecretsDisclosed(), expectNoSecretsInHeaders(), FORBIDDEN_PATTERNS, scanHeadersForSecrets(), scanResponseForSecrets() (+2 more)

### Community 29 - "openai-params-provider.mapper.ts"
Cohesion: 0.12
Nodes (25): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asJsonSchemaName(), asWarningCode(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions() (+17 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (23): buildAppProviderMetricsContext(), buildLlmMetricsContext(), mapProviderResponseToAiObservation(), mapProviderResponseToUsage(), toMetricsMessages(), buildProviderInputForAlias(), resolvedPrompts, toProviderTurns() (+15 more)

### Community 31 - "CLI.md"
Cohesion: 0.07
Nodes (38): CachedChatResponseSchema, ChatWarningSchema, parseCachedChatResponse(), mockExecutorChatSuccess(), mockStreamExecutorSuccess(), CompleteOnceResult, createMockStreamResult(), textStream() (+30 more)

### Community 33 - "dependencies"
Cohesion: 0.07
Nodes (28): dependencies, @anthropic-ai/sdk, boxen, chalk, class-transformer, class-validator, @google/genai, helmet (+20 more)

### Community 34 - "devDependencies"
Cohesion: 0.07
Nodes (28): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, fast-check, globals (+20 more)

### Community 35 - "test-constants.ts"
Cohesion: 0.13
Nodes (11): Header, APP_METRICS_BACKEND, MetricsController, ApiOperation, ApiResponse, ApiTags, Controller, Get (+3 more)

### Community 36 - "chat-response.dto.ts"
Cohesion: 0.10
Nodes (39): CachedChatResponse, CachedChatResponseWithConversation, ChatResponseData, toChatResponseDto(), ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional (+31 more)

### Community 37 - "swagger.setup.ts"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 38 - "asGatewayKey"
Cohesion: 0.10
Nodes (30): asToolCallId(), ChatCompletionsAdapterOptions, buildResponsesCreateParams(), mapGatewayMetadataToOpenAi(), mapAssistantTurnToResponsesInput(), mapTurnsToResponsesInput(), CALL_1, extractResponsesToolCalls() (+22 more)

### Community 39 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+18 more)

### Community 40 - "PrometheusAppMetricsAdapter"
Cohesion: 0.09
Nodes (24): ApiGatewayModelsErrorResponses, ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional, ModelsController, ApiNotFoundResponse (+16 more)

### Community 41 - "GatewayKey"
Cohesion: 0.33
Nodes (3): ClientEditCommand, Command, Option

### Community 42 - "chat-stream.controller.ts"
Cohesion: 0.07
Nodes (29): Dokumentacja API — AI Provider Gateway, Extended Thinking Mode, Fasady oficjalnych kontraktów, Format błędów, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models` — katalog aliasów (+21 more)

### Community 43 - "AI Provider Gateway (NestJS)"
Cohesion: 0.25
Nodes (7): AppMetricsModule, Global, Module, RATE_LIMIT_MODULE_OPTIONS, RateLimitModule, RateLimitModuleOptions, Module

### Community 44 - "Brand types — przewodnik dla developerów"
Cohesion: 0.06
Nodes (51): getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT, buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs() (+43 more)

### Community 45 - "ClientId"
Cohesion: 0.09
Nodes (28): asPromptCacheCreationTokens(), asPromptCacheHitTokens(), ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic() (+20 more)

### Community 46 - "getAppConfig"
Cohesion: 0.04
Nodes (45): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network (`ai-gateway-network`), 5. Deploy (local Compose), 6. Verification, Adding a gateway client, Adding a model alias (+37 more)

### Community 47 - "api-error.code.ts"
Cohesion: 0.05
Nodes (43): Agent examples, Agent mode (`config:init --agent`), `AgentReport` (stdout with `--json`), Answers contract, Boilerplate configuration and commands, CLI layer — summary, CLI scope, Commands — clients (+35 more)

### Community 48 - "Integracja Anthropic Messages API (Claude Code)"
Cohesion: 0.09
Nodes (22): Anty-wzorce, Best practices, `brand()` i `unbrand()`, `Brand<K, T>`, Brand types — przewodnik dla developerów, Configuration & policy, `ConversationId`, Identifiers & tracking (+14 more)

### Community 49 - "AppMetricsService"
Cohesion: 0.12
Nodes (15): API architecture — AI Provider Gateway, API style, Auth, Extensions, Generation parameters (`params` in body), HTTP errors, Idempotency, retry, and fallback, Model identification (aliases) (+7 more)

### Community 50 - "e2e-provider-registry.ts"
Cohesion: 0.10
Nodes (21): Autoryzacja, Błędy, Endpointy, Integracja Anthropic Messages API (Claude Code), Konfiguracja (Claude Code i inne klienty), Mapowanie na gateway, Mapowanie treści wiadomości, Natywne API (bez zmian) (+13 more)

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (19): 0) Pierwsze uruchomienie (wizard konfiguracji), 1) Sekrety i env (`.env`), 2) Plik `gateway.config.yaml` (modele / instancje / polityki), 3) Walidacja i fail-fast, 4) Nadpisywanie parametrów per request, 5) Profile środowiskowe (opcjonalnie), 6) Pliki system promptu (`src/config/system-prompt/`), Cache odpowiedzi i Redis (opcjonalnie) (+11 more)

### Community 52 - "Community 52"
Cohesion: 0.39
Nodes (3): ClientAddCommand, Command, Option

### Community 53 - "Community 53"
Cohesion: 0.29
Nodes (6): AiMetricsModule, Global, Module, ObservabilityModule, Global, Module

### Community 54 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.09
Nodes (28): IsStringOrArrayOfStrings(), OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray (+20 more)

### Community 55 - ".createMessage"
Cohesion: 0.09
Nodes (23): ChatController, ApiSecurity, ApiTags, Controller, GatewayKeyAndSmartRateLimit, ChatModule, Module, GatewayKeyAndSmartRateLimit() (+15 more)

### Community 57 - "Fasady integracji (IDE) — AI Provider Gateway"
Cohesion: 0.11
Nodes (18): Autoryzacja — dwa poziomy, Błędy i filtry, Fasada ≠ provider runtime, Fasady oficjalnych kontraktów — AI Provider Gateway, Filozofia, Klucze klientów (frontend / IDE → gateway), Klucze providerów (gateway → LLM), Limity walidacji ingress (`validateChatIngress`) (+10 more)

### Community 58 - "ProviderCallOptions"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation — AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 59 - ".streamChat"
Cohesion: 0.10
Nodes (25): ApiOpenAiErrorResponses(), OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader (+17 more)

### Community 60 - "e2e-constants.ts"
Cohesion: 0.08
Nodes (50): TEST_INPUT_TOKENS_SMALL, TEST_MAX_CONCURRENT_STREAMS, TEST_OUTPUT_TOKENS_SMALL, TEST_RATE_LIMIT_BURST, closeE2eApp(), CreateE2eAppOptions, E2eAppContext, withE2eApp() (+42 more)

### Community 61 - "Anty‑patterny / na co uważać — AI Provider Gateway"
Cohesion: 0.12
Nodes (16): 10) Uruchomienie bez wymaganego klucza API, 11) Mylenie kodów limitów (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`), 12) Cache odpowiedzi bez świadomości “świeżości”, 13) Mylenie trzech kontraktów API (natywny vs fasady oficjalnych kontraktów), 14) CLI zależne od `ConfigModule` (deadlock konfiguracji), 15) Start serwera bez właściwego pliku konfiguracyjnego, 1) “Open proxy” przez nadmierną konfigurowalność, 2) Sekrety w logach (+8 more)

### Community 62 - "Dokumentacja koncepcyjna — AI Provider Gateway"
Cohesion: 0.12
Nodes (16): 1) Gateway, nie “open proxy”, 2) Modele jako aliasy (preferowane), 3) Dwa tryby wykonania: standard i streaming, 4) Walidacja na brzegu, 5) Testowalność, Cel produktu, Dla kogo jest system, Dokumentacja koncepcyjna — AI Provider Gateway (+8 more)

### Community 63 - "Lista endpointów — AI Provider Gateway"
Cohesion: 0.12
Nodes (17): Anthropic Messages API *(Claude Code — x-api-key)*, Chat *(wymaga `X-Gateway-Key`)*, Fasady oficjalnych kontraktów (`src/integrations/`), `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models/:modelAlias`, `GET /metrics` (+9 more)

### Community 66 - "app-metrics.service.ts"
Cohesion: 0.67
Nodes (3): bootstrap(), CliModule, Module

### Community 68 - "deploy-production.sh"
Cohesion: 0.28
Nodes (13): cmd_all(), cmd_health(), cmd_secrets(), cmd_sync(), cmd_up(), cmd_usage(), compose(), main() (+5 more)

### Community 69 - "Architektura API — AI Provider Gateway"
Cohesion: 0.12
Nodes (15): Architektura API — AI Provider Gateway, Auth, Błędy HTTP, Idempotencja, retry i fallback, Identyfikacja modeli (aliasy), Konwencje odpowiedzi sukcesu (standard), Natywny kontrakt (rdzeń), Opcjonalne śledzenie rozmowy (`conversationId`) (+7 more)

### Community 70 - "Śledzenie rozmów (`conversationId`)"
Cohesion: 0.12
Nodes (15): Cache a metryki, Cel, Dwa tryby logowania w Sentry, FAQ, Konfiguracja Sentry, Kontrakt API, Logowanie konwersacji od drugiej wiadomości (zalecany przepływ), Obowiązek klienta przy starcie od tury 2 (+7 more)

### Community 72 - "app.module.ts"
Cohesion: 0.04
Nodes (41): ChatService, Injectable, ChatStreamController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader (+33 more)

### Community 73 - ".chat"
Cohesion: 0.21
Nodes (6): ClientId, ActiveStreamsTracker, OTHER_CLIENT, TEST_CLIENT, Injectable, RateLimitReason

### Community 74 - "anthropic-stream.mapper.ts"
Cohesion: 0.11
Nodes (26): retryPolicy(), DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, ConfigPersistenceService, Injectable, defaultModelPolicy() (+18 more)

### Community 75 - "provider-error.mapper.ts"
Cohesion: 0.18
Nodes (18): ApiErrorPayload, MappedProviderError, isAuthError(), isClientError(), isInvalidRequestStatus(), isRateLimitStatus(), isServerError(), isTimeoutStatus() (+10 more)

### Community 76 - ".getOne"
Cohesion: 0.42
Nodes (6): mapAnthropicRequestToGateway(), AnthropicTool, mapAnthropicContentBlockToGateway(), mapAnthropicToolChoice(), mapAnthropicToolsToGateway(), TEST_TOOL

### Community 77 - "app-metrics-backend.interface.ts"
Cohesion: 0.13
Nodes (15): Autoryzacja, Błędy, Endpointy, Fasada oficjalnego kontraktu OpenAI, Konfiguracja w Cursor, Natywne API (bez zmian), Odpowiedź (`chat.completion`), Ograniczenia (+7 more)

### Community 78 - "Community 78"
Cohesion: 0.17
Nodes (12): HealthModule, Module, IntegrationsModule, Module, LoggingModule, Global, Module, ProviderRegistryModule (+4 more)

### Community 80 - "Community 80"
Cohesion: 0.15
Nodes (13): Architektura — AI Provider Gateway, Bezpieczeństwo (przegląd), Cel dokumentu, CLI — izolacja od runtime HTTP, Konfiguracja i sekrety, Moduły (bounded areas — rdzeń funkcjonalny), Observability, Struktura repo (+5 more)

### Community 81 - "Community 81"
Cohesion: 0.14
Nodes (14): Brand types (TypeScript), Fasada vs provider runtime, Kody błędów (stabilne), Kody HTTP (mapowanie), Kody ostrzeżeń (warnings), Macierz odpowiedzialności (Anthropic), Macierz odpowiedzialności (OpenAI), Mapowanie parametrów na providerów (+6 more)

### Community 82 - "Community 82"
Cohesion: 0.11
Nodes (16): 1. Source Code (`@src`), 2. Knowledge Graph (`@graphify-out`), 3. API Specification (`@openapi.json`), 4. Documentation (`@docs/`), Agent Instructions, Context Priority Hierarchy, Example 1: Implementing a new feature, Example 2: Debugging an issue (+8 more)

### Community 83 - "Community 83"
Cohesion: 0.15
Nodes (13): CI / lokalnie, Czego testy E2E nie obejmują, Infrastruktura E2E, Kody HTTP w E2E (201 vs 200), Obszary pokrycia, Pliki spec, Przegląd, Testy — AI Provider Gateway (+5 more)

### Community 84 - "Community 84"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 85 - "Community 85"
Cohesion: 0.32
Nodes (4): GlobalExceptionFilter, isPayloadTooLargeError(), Catch, Injectable

### Community 86 - "Community 86"
Cohesion: 0.15
Nodes (12): author, bin, gateway, description, license, name, private, typeCoverage (+4 more)

### Community 87 - "Community 87"
Cohesion: 0.12
Nodes (5): HttpMetricsMiddleware, Injectable, AppMetricsService, Injectable, HttpMethod

### Community 89 - "Community 89"
Cohesion: 0.10
Nodes (21): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+13 more)

### Community 91 - "Community 91"
Cohesion: 0.17
Nodes (12): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, moduleNameMapper, rootDir, testEnvironment, testPathIgnorePatterns (+4 more)

### Community 95 - "EnvironmentVariables"
Cohesion: 0.39
Nodes (3): ModelAddCommand, Command, Option

### Community 97 - "MetricsController"
Cohesion: 0.17
Nodes (13): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+5 more)

### Community 98 - "Security Policy"
Cohesion: 0.10
Nodes (21): API keys — best practices, Client authentication, English, Facades and routing to the LLM, Fasady a routing do LLM, Fasady HTTP a klucze vendorów (ważne semantycznie), Gateway keys (clients → gateway), Gateway keys (klienci → gateway) (+13 more)

### Community 99 - "env.validation.ts"
Cohesion: 0.22
Nodes (8): 0. Wspólny szkielet: walidacja, wybór modelu, 1. Standard `POST /api/v1/chat` — sukces (201), 2. Standard `POST /api/v1/chat` — błąd, 3. Streaming `POST /api/v1/chat/stream` — sukces (SSE), 4. Fasada OpenAI — `POST /api/v1/openai/chat/completions`, 5. Fasada Anthropic — `POST /api/v1/anthropic/messages`, Legenda uczestników, Przepływ danych (data flow) — AI Provider Gateway

### Community 100 - "should-include-redis-stack.ts"
Cohesion: 0.11
Nodes (24): isCachedChatAllowedForModelAlias(), normalizeGatewayConfigForWrite(), AppConfiguration, CacheRuntimeConfig, RateLimitRuntimeConfig, RedisRuntimeConfig, buildEffectiveGatewayConfig(), BuildEffectiveGatewayConfigOptions (+16 more)

### Community 101 - "Community 101"
Cohesion: 0.22
Nodes (9): Adapter OpenAI (provider runtime), Chat Completions, Kiedy adapter jest używany, Konfiguracja, Mapowanie SDK, Powiązane dokumenty, Responses API, Rola adaptera (+1 more)

### Community 102 - "rate-limit-bypass.security-spec.ts"
Cohesion: 0.28
Nodes (5): 1) Drzewo repozytorium, 2) Opis katalogów (odpowiedzialności), 2a) CLI — izolacja runtime, 3) Zakres funkcji vs dokumentacja, Architektura katalogów i plików

### Community 103 - "SPEC — Health (liveness/readiness)"
Cohesion: 0.33
Nodes (6): Dokumentacja — AI Provider Gateway, Dystrybucja i kontrybucje, Jak czytać tę dokumentację, Specyfikacje (SDD), Spis plików, Wybrane tematy

### Community 105 - "health-readiness-response.dto.ts"
Cohesion: 0.11
Nodes (19): 0) First run (configuration wizard), 1) Secrets and env (`.env`), 2) `gateway.config.yaml` file (models / instances / policies), 3) Validation and fail-fast, 4) Overriding parameters per request, 5) Environment profiles (optional), 6) System prompt files (`src/config/system-prompt/`), CLI vs configuration loading (+11 more)

### Community 106 - "Przepływ danych (data flow) — AI Provider Gateway"
Cohesion: 0.11
Nodes (18): Architecture view, Authorization — two levels, Client keys (frontend / IDE → gateway), Errors and filters, Facade limitations, Facade ≠ provider runtime, Facade scope, File structure (+10 more)

### Community 107 - "README.md"
Cohesion: 0.13
Nodes (19): AnthropicMessagesRequestDto, AnthropicThinkingDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 108 - "Anti-patterns / what to watch for — AI Provider Gateway"
Cohesion: 0.12
Nodes (16): 10) Starting without a required API key, 11) Confusing rate-limit codes (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`), 12) Response cache without awareness of “freshness”, 13) Confusing three API contracts (native vs official contract facades), 14) CLI dependent on `ConfigModule` (configuration deadlock), 15) Starting the server without a proper config file, 1) “Open proxy” through excessive configurability, 2) Secrets in logs (+8 more)

### Community 109 - "resolve-provider-call-options.ts"
Cohesion: 0.17
Nodes (11): ApiHeader, ApiAnthropicErrorResponses, ApiBody, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body (+3 more)

### Community 110 - "Conceptual documentation — AI Provider Gateway"
Cohesion: 0.12
Nodes (16): 1) Gateway, not an “open proxy”, 2) Models as aliases (preferred), 3) Two execution modes: standard and streaming, 4) Edge validation, 5) Testability, Conceptual documentation — AI Provider Gateway, Functional scope (summary), HTTP surface vs LLM engine (+8 more)

### Community 111 - "create-e2e-app.ts"
Cohesion: 0.09
Nodes (15): ProviderTestOptions, ModelAlias, ProviderInstanceId, NoopAppMetricsAdapter, Injectable, healthStatusToGaugeValue(), AppProviderCallContext, AppProviderStreamScope (+7 more)

### Community 112 - "provider-base-url.validation.ts"
Cohesion: 0.33
Nodes (6): Distribution and contributions, Documentation — AI Provider Gateway, File index, How to read this documentation, Selected topics, Specifications (SDD)

### Community 113 - "rollback.sh"
Cohesion: 0.52
Nodes (6): append_summary(), DEPLOY_MODE, fail_rollback(), rollback.sh script, SKIP_VAULT_FETCH, write_output()

### Community 114 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 115 - "Endpoint list — AI Provider Gateway"
Cohesion: 0.12
Nodes (17): Anthropic Messages API *(Claude Code — x-api-key)*, Chat *(requires `X-Gateway-Key`)*, Endpoint list — AI Provider Gateway, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models/:modelAlias`, `GET /metrics` (+9 more)

### Community 116 - "Testy integracyjne (live SDK + Redis)"
Cohesion: 0.29
Nodes (6): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 117 - "provider-registry.service.spec.ts"
Cohesion: 0.06
Nodes (54): ConfigFlat, ConfigRoot, createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), getByPath(), MockConfigServiceOptions, Nullable, resolveGateway() (+46 more)

### Community 118 - "Flow sesji (obowiązkowy)"
Cohesion: 0.12
Nodes (16): 0. Start, 1. Wywiad (kroki 1–5 wizarda, bez sekretów), 2. Plik answers, 3. Uruchomienie `config:init`, 4. Human in the tool (sekrety w `.env`), 5. Walidacja, 6. Smoke test `start:dev` (tylko weryfikacja — potem stop), Czego nie robić (+8 more)

### Community 120 - "gateway-cli-wrapper.js"
Cohesion: 0.40
Nodes (4): distEntry, fs, path, tsEntry

### Community 121 - "deploy-staging.sh"
Cohesion: 0.40
Nodes (4): DEPLOY_DIR, DEPLOY_MODE, deploy-staging.sh script, VAULT_ENV

### Community 122 - "Conversation tracking (`conversationId`)"
Cohesion: 0.12
Nodes (15): API contract, Cache and metrics, Client example (turn 1 → turn 2), Client obligation when starting from turn 2, Conversation tracking (`conversationId`), Difference: field in response vs field in request (metrics), FAQ, Logging conversations from the second message (recommended flow) (+7 more)

### Community 125 - "OpenAI contract facade (Cursor IDE)"
Cohesion: 0.13
Nodes (15): Authorization, Configuration in Cursor, Endpoints, Errors, Example (non-stream), Example (stream), Limitations, Model selection (+7 more)

### Community 126 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, include

### Community 139 - "configuration.ts"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, types, exclude, extends, include

### Community 140 - "Architecture — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): Architecture — AI Provider Gateway, CLI — isolation from HTTP runtime, Configuration and secrets, Document purpose, Layers within modules (NestJS convention), Logical view, Modules (bounded areas — functional core), Observability (+5 more)

### Community 141 - "Dictionary — AI Provider Gateway"
Cohesion: 0.14
Nodes (14): Brand types (TypeScript), Canonical terms, Core concepts, Dictionary — AI Provider Gateway, Error codes (stable), Facade vs provider runtime, Field dictionary, Generation parameters (C0–C7 extensions) (+6 more)

### Community 142 - "Testing — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): CI / locally, Coverage areas, E2E infrastructure, E2E tests (`test/e2e/`), HTTP codes in E2E (201 vs 200), Integration tests (`test/integration/`), Overview, Security tests (`test/security/`) (+5 more)

### Community 144 - "anthropic-response.mapper.ts"
Cohesion: 0.08
Nodes (39): ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, SseDeltaEvent, SseDoneEvent (+31 more)

### Community 146 - "Data flow — AI Provider Gateway"
Cohesion: 0.22
Nodes (8): 0. Shared skeleton: validation, model selection, 1. Standard `POST /api/v1/chat` — success (201), 2. Standard `POST /api/v1/chat` — error, 3. Streaming `POST /api/v1/chat/stream` — success (SSE), 4. OpenAI facade — `POST /api/v1/openai/chat/completions`, 5. Anthropic facade — `POST /api/v1/anthropic/messages`, Data flow — AI Provider Gateway, Participant legend

### Community 147 - "OpenAI adapter (provider runtime)"
Cohesion: 0.22
Nodes (9): Adapter components, Adapter role, Chat Completions, Configuration, OpenAI adapter (provider runtime), Related documents, Responses API, SDK mapping (+1 more)

### Community 149 - "PrometheusService"
Cohesion: 0.20
Nodes (3): PrometheusService, Injectable, PrometheusMetrics

### Community 150 - "fallback-chain.spec.ts"
Cohesion: 0.31
Nodes (3): ProviderAddCommand, Command, Option

### Community 151 - "Directory and file architecture"
Cohesion: 0.40
Nodes (5): 1) Repository tree, 2) Directory descriptions (responsibilities), 2a) CLI — runtime isolation, 3) Feature scope vs documentation, Directory and file architecture

### Community 152 - "Documentation — AI Provider Gateway"
Cohesion: 0.35
Nodes (10): getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromConfig(), isRedisRequiredFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement(), shouldConnectRedis() (+2 more)

### Community 153 - "AnthropicMessagesController"
Cohesion: 0.18
Nodes (13): createStreamRequest(), ApiErrorCode, DEFAULT_HTTP_STATUS_TO_CODE, PayloadTooLargeError, RequestWithId, createMockContext(), createMockSmartRateLimiter(), createMockExpressRequest() (+5 more)

### Community 154 - "AI Provider Gateway"
Cohesion: 0.13
Nodes (15): AI Provider Gateway, Architecture at a glance, Common scripts, Configure, Connect a client (IDE or other), Distribution, Docker (optional), Documentation (+7 more)

### Community 155 - "configuration-validation.service.ts"
Cohesion: 0.14
Nodes (15): result, CliValidateOptions, collectInactiveProviderWarnings(), formatZodIssues(), expectEnvRef(), validateGatewayConfig(), ValidationOptions, ValidationResult (+7 more)

### Community 157 - "5. Pliki nowe — pełna treść"
Cohesion: 0.09
Nodes (25): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+17 more)

### Community 159 - "instrument.ts"
Cohesion: 0.12
Nodes (13): CACHE_BACKEND_VALUES, EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString (+5 more)

### Community 161 - "models.controller.ts"
Cohesion: 0.10
Nodes (36): DEFAULT_MODELS, convertProvider(), CliAiProvider, ProviderPromptResult, ProviderPromptService, Injectable, ProviderTestService, Injectable (+28 more)

### Community 162 - "anthropic-tools.mapper.ts"
Cohesion: 0.33
Nodes (3): ClientRemoveCommand, Command, Option

### Community 165 - "Gateway Config (CRUD, jedna mutacja)"
Cohesion: 0.18
Nodes (11): 0. Start + routing, 1. Preflight, 2. Wywiad → answers → CLI, 3. Domknięcie, 4. Sprzątanie, Czego nie robić, Flow sesji (obowiązkowy), Gateway Config (CRUD, jedna mutacja) (+3 more)

### Community 166 - "Agent protocol (CRUD)"
Cohesion: 0.22
Nodes (9): Agent protocol (CRUD), Discovery (opcjonalne, nie jest celem skilla), Exit codes `AgentReport`, Obsługa błędów (skrót), Pliki answers — zakazane pola (przykłady), Preflight (przed każdą mutacją), Sekrety (human in the tool), Walidacja (zawsze na koniec udanej mutacji) (+1 more)

### Community 168 - "ModelEditCommand"
Cohesion: 0.33
Nodes (3): ModelEditCommand, Command, Option

### Community 169 - "12. Weryfikacja planu vs aktualne `src/cli/`"
Cohesion: 0.43
Nodes (6): assertEnabledProviderBaseUrlPresent(), collectMissingBaseUrlErrors(), formatMissingBaseUrlError(), MissingProviderBaseUrl, RawGatewayConfig, resolveBaseUrlFromEnv()

### Community 170 - "7. Fixtures i przykłady"
Cohesion: 0.16
Nodes (12): OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString, MaxLength (+4 more)

### Community 174 - "CLAUDE.md"
Cohesion: 0.13
Nodes (28): test, AppModule, Module, createMockConfigService(), initGuard(), initGuard(), initGuard(), ProviderInstancesBootstrap (+20 more)

### Community 175 - "ProviderEditCommand"
Cohesion: 0.33
Nodes (3): ProviderEditCommand, Command, Option

### Community 176 - "ProviderRemoveCommand"
Cohesion: 0.33
Nodes (3): ProviderRemoveCommand, Command, Option

### Community 177 - "KeyGenerateCommand"
Cohesion: 0.13
Nodes (11): ConfigSecretsStatusCommand, Command, Option, KeyGenerateCommand, Command, Option, EnvPatchService, Injectable (+3 more)

### Community 179 - "Flow: `client:add`"
Cohesion: 0.29
Nodes (7): CLI, Domknięcie, Flow: `client:add`, Przykład answers, Sprzątanie, Wywiad, Zachowanie CLI

### Community 181 - "Flow: `client:edit`"
Cohesion: 0.29
Nodes (7): CLI, Domknięcie, Flow: `client:edit`, Przykład answers, Sprzątanie, Wywiad, Zachowanie CLI

### Community 182 - "Flow: `client:remove`"
Cohesion: 0.29
Nodes (7): CLI, Domknięcie, Flow: `client:remove`, Przykład answers, Sprzątanie, Wywiad, Zachowanie CLI

### Community 183 - "ConfigValidateCommand"
Cohesion: 0.29
Nodes (7): CLI, Domknięcie, Flow: `model:add`, Przykład answers, Sprzątanie, Wywiad, Zachowanie CLI

### Community 185 - "Flow: `model:edit`"
Cohesion: 0.29
Nodes (7): CLI, Domknięcie, Flow: `model:edit`, Przykład answers, Sprzątanie, Wywiad, Zachowanie CLI

### Community 186 - "Flow: `model:remove`"
Cohesion: 0.29
Nodes (7): CLI, Domknięcie, Flow: `model:remove`, Przykład answers, Sprzątanie, Wywiad, Zachowanie CLI

### Community 187 - "Flow: `provider:add`"
Cohesion: 0.29
Nodes (7): CLI, Domknięcie, Flow: `provider:add`, Przykład answers, Sprzątanie, Wywiad, Zachowanie CLI

### Community 188 - "Flow: `provider:edit`"
Cohesion: 0.29
Nodes (7): CLI, Domknięcie, Flow: `provider:edit`, Przykład answers, Sprzątanie, Wywiad, Zachowanie CLI

### Community 189 - "Flow: `provider:remove`"
Cohesion: 0.29
Nodes (7): CLI, Domknięcie, Flow: `provider:remove`, Przykład answers, Sprzątanie, Wywiad, Zachowanie CLI

## Knowledge Gaps
- **1083 isolated node(s):** `path`, `fs`, `distEntry`, `tsEntry`, `entrypoint.sh script` (+1078 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `Community 8` to `CLAUDE.md`, `Community 86`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `test` connect `CLAUDE.md` to `Community 0`, `Community 2`, `asProviderInstanceId`, `Community 8`, `cache.module.ts`, `provider-registry.service.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `LoggingService` connect `cache.module.ts` to `Community 0`, `Community 2`, `asProviderInstanceId`, `provider-registry.service.ts`, `ModelAlias`, `Community 19`, `configuration.types.ts`, `provider-instances.bootstrap.ts`, `health.service.ts`, `AnthropicMessagesController`, `model-manager.service.ts`, `CLI.md`, `models.controller.ts`, `chat-response.dto.ts`, `asGatewayKey`, `Brand types — przewodnik dla developerów`, `ClientId`, `CLAUDE.md`, `e2e-constants.ts`, `Community 85`, `provider-registry.service.spec.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `LoggingService` (e.g. with `initService()` and `initService()`) actually correct?**
  _`LoggingService` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `path`, `fs`, `distEntry` to the rest of the system?**
  _1085 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._
- **Should `asProviderInstanceId` be split into smaller, more focused modules?**
  _Cohesion score 0.06337719298245614 - nodes in this community are weakly interconnected._