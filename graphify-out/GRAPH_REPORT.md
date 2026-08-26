# Graph Report - ai-provider-gateway  (2026-08-26)

## Corpus Check
- 522 files · ~206,368 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3100 nodes · 10072 edges · 160 communities (127 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6ab084d2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- create-integration-app.ts
- cli.module.ts
- GatewayConfig
- api-error.code.ts
- brand-types.md
- ClientId
- health.service.ts
- provider-manager.service.ts
- responses.adapter.ts
- openai-stream.mapper.ts
- asProviderInstanceId
- .error
- sentry-ai-metrics.adapter.ts
- anthropic-tools.mapper.ts
- ai-provider.interface.ts
- provider-input.ts
- ModelAlias
- test-constants.ts
- asClientId
- swagger.setup.ts
- provider-error.mapper.ts
- GatewayKey
- integrations.md
- config-generator.service.ts
- KeyGenerateCommand
- openai-params-provider.mapper.ts
- app-configuration.types.ts
- model-manager.service.ts
- provider-registry.service.ts
- provider-instances.bootstrap.ts
- branded.types.ts
- anthropic-messages.controller.ts
- Deployment — AI Provider Gateway
- getAppConfig
- asEnvRef
- AppMetricsService
- app-metrics.service.ts
- create-openai-integration-app.ts
- testing.md
- OpenAiChatCompletionRequestDto
- .createMessage
- create-e2e-app.ts
- .streamChat
- AppMetricsBackend
- create-openai-integration-app.ts
- logging.service.ts
- LoggingService
- GatewayModelsCatalogService
- chat.service.ts
- app.module.ts
- .getOne
- openai-models.controller.ts
- Gateway CLI — documentation
- RequestIdMiddleware
- PrometheusService
- anthropic-response.mapper.ts
- AnthropicMessagesRequestDto
- API documentation — AI Provider Gateway
- deployment.md
- ConsoleLoggerAdapter
- ErrorReportingBackend
- project.structure.md
- openai-request.mapper.ts
- logging.module.ts
- ChatParamsDto
- GlobalExceptionFilter
- EnvironmentVariables
- health.service.spec.ts
- OpenAiBearerAuthGuard
- .completions
- anthropic-stream.mapper.ts
- PinoLoggerAdapter
- chat-provider-call.service.ts
- main.ts
- wizard-state.schema.ts
- anthropic-thinking.mapper.ts
- generation-warnings.ts
- SentryErrorReportingAdapter
- Brand types — developer guide
- WizardOrchestratorService
- anthropic-tools.mapper.ts
- README.md
- post
- ProviderListCommand
- asRateLimitBurst
- chat-cache-guard.service.spec.ts
- ConfigInitCommand
- anthropic-tools.mapper.ts
- ChatResponseDto
- ProviderAddCommand
- openai-chat-completion-response.dto.ts
- OpenAiChatMessageDto
- ClientAddCommand
- ClientEditCommand
- ClientRemoveCommand
- ModelAddCommand
- ModelEditCommand
- ModelRemoveCommand
- ProviderEditCommand
- ProviderRemoveCommand
- config-validator.ts
- logging.service.spec.ts
- semantic-cache.tokens.ts
- instrument.ts
- openai-exception.filter.ts
- NoopErrorReportingAdapter
- MASTER_SYSTEM_PROMPT.md
- chat-default.md
- gemini-flash.md
- google-gemini.md
- Cache Hit Path
- CLI Isolation from HTTP Runtime
- Configuration Wizard
- Conversation Tracking
- Error Contract
- Facade Anti-Corruption Layer
- Gateway Key Authentication
- Generation Parameter Merge
- Multi-Instance Provider Model
- Nominal Type Safety
- Observability Stack
- Plug and Play Startup
- createMockConfigService.ts
- Provider Abstraction Layer
- Provider Secrets Validation
- Anthropic Messages API integration (Claude Code)
- isRetryableHttpError
- Request Lifecycle
- Configuration — AI Provider Gateway
- Resilient Execution Pattern
- Integration facades (IDE) — AI Provider Gateway
- Anti-patterns / what to watch for — AI Provider Gateway
- Conceptual documentation — AI Provider Gateway
- Endpoint list — AI Provider Gateway
- Security Testing Layer
- Smart Rate Limiting
- API architecture — AI Provider Gateway
- Conversation tracking (`conversationId`)
- SSE Streaming Protocol
- OpenAI contract facade (Cursor IDE)
- System Prompt Composition
- LoggingModule
- Test Pyramid Strategy
- Three Contracts One Engine
- Architecture — AI Provider Gateway
- Dictionary — AI Provider Gateway
- Testing — AI Provider Gateway
- wait-for-redis.ts
- alias
- Data flow — AI Provider Gateway
- OpenAI adapter (provider runtime)
- Directory and file architecture
- Documentation — AI Provider Gateway
- ollama-chat.md
- openai-chat-gpt.md

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 102 edges
2. `asProviderInstanceId()` - 100 edges
3. `ModelAlias` - 87 edges
4. `ProviderInstanceId` - 81 edges
5. `GatewayConfig` - 73 edges
6. `asEnvRef()` - 65 edges
7. `ChatRequestDto` - 64 edges
8. `GatewayKey` - 62 edges
9. `ApiErrorCode` - 61 edges
10. `asModelAlias()` - 60 edges

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

## Communities (160 total, 33 thin omitted)

### Community 0 - "create-integration-app.ts"
Cohesion: 0.16
Nodes (24): ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), buildIntegrationConfigOptions(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions, IntegrationAppContext (+16 more)

### Community 1 - "cli.module.ts"
Cohesion: 0.10
Nodes (43): AgentReport, AgentReportStatus, exitCodeForReport(), PendingSecretsItem, loadAnswers(), collectPendingSecrets(), assertAgentHasAnswers(), CliMode (+35 more)

### Community 2 - "GatewayConfig"
Cohesion: 0.09
Nodes (10): NoopAppMetricsAdapter, Injectable, AppProviderStreamScope, AppRequestLabels, AppRequestMethod, AppRequestStatus, HealthMetricsSnapshot, HttpRequestLabels (+2 more)

### Community 3 - "api-error.code.ts"
Cohesion: 0.10
Nodes (22): ChatOutputTextDto, ApiProperty, ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString (+14 more)

### Community 4 - "brand-types.md"
Cohesion: 0.09
Nodes (22): IsPrimitiveMetadataRecord, Matches, ResponseCacheService, Injectable, lastUserMessageText(), ChatRequestDto, ApiProperty, ApiPropertyOptional (+14 more)

### Community 5 - "ClientId"
Cohesion: 0.19
Nodes (16): buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext, INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED, INTEGRATION_OPENAI_MODEL_ID_BRANDED, INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED (+8 more)

### Community 6 - "health.service.ts"
Cohesion: 0.14
Nodes (8): CHAT_STREAM_API_DESCRIPTION, SseSerializer, StreamCleanupInterceptor, Injectable, readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey(), requireClientGatewayKey()

### Community 7 - "provider-manager.service.ts"
Cohesion: 0.15
Nodes (9): ClientId, Express, Request, ActiveStreamsTracker, OTHER_CLIENT, TEST_CLIENT, Injectable, AppMetricsService (+1 more)

### Community 8 - "responses.adapter.ts"
Cohesion: 0.18
Nodes (16): asToolCallId(), buildResponsesCreateParams(), mapGatewayMetadataToOpenAi(), mapAssistantTurnToResponsesInput(), mapTurnsToResponsesInput(), CALL_1, extractResponsesToolCalls(), mapResponsesStopReason() (+8 more)

### Community 9 - "openai-stream.mapper.ts"
Cohesion: 0.16
Nodes (21): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional (+13 more)

### Community 10 - "asProviderInstanceId"
Cohesion: 0.11
Nodes (15): KeyGenerateCommand, Command, Option, KeyGeneratorService, Injectable, ClientPromptService, Injectable, KeyPromptService (+7 more)

### Community 11 - ".error"
Cohesion: 0.20
Nodes (7): emitAgentReport(), exitWithAgentReport(), resolveCliMode(), toSafeClientList(), toSafeProviderList(), Injectable, WizardStateManager

### Community 12 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.10
Nodes (26): CostUsd, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext(), buildGenAiChatSpanAttributes() (+18 more)

### Community 13 - "anthropic-tools.mapper.ts"
Cohesion: 0.13
Nodes (12): Header, TEST_CLIENT, APP_METRICS_BACKEND, MetricsController, ApiOperation, ApiResponse, ApiTags, Controller (+4 more)

### Community 14 - "ai-provider.interface.ts"
Cohesion: 0.20
Nodes (19): CachedChatResponseWithConversation, mapStopReasonToFinishReason(), StreamOnceResult, ProviderResponse, GatewayFinishReason, InputTokens, JsonSchemaName, OutputTokens (+11 more)

### Community 15 - "provider-input.ts"
Cohesion: 0.13
Nodes (10): CliGatewayValidatorService, Injectable, ConfigGeneratorService, Injectable, FileManagerService, Injectable, WizardRunResult, EnvTemplateInput (+2 more)

### Community 16 - "ModelAlias"
Cohesion: 0.07
Nodes (40): isCachedChatAllowedForModelAlias(), collectInactiveProviderWarnings(), formatZodIssues(), expectEnvRef(), validateGatewayConfig(), ValidationOptions, ValidationResult, buildEffectiveGatewayConfig() (+32 more)

### Community 17 - "test-constants.ts"
Cohesion: 0.07
Nodes (27): RedisConnectionService, Injectable, CacheRegistryService, Injectable, Inject, Inject, isRedisRequiredFromConfig(), cacheEnabledGatewayConfig (+19 more)

### Community 18 - "asClientId"
Cohesion: 0.10
Nodes (22): ChatController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, ApiSecurity, ApiTags (+14 more)

### Community 19 - "swagger.setup.ts"
Cohesion: 0.11
Nodes (25): IsNotEmpty, ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsString, MaxLength (+17 more)

### Community 20 - "provider-error.mapper.ts"
Cohesion: 0.19
Nodes (19): ApiErrorPayload, MappedProviderError, isAuthError(), isClientError(), isInvalidRequestStatus(), isProviderRateLimitError(), isRateLimitStatus(), isServerError() (+11 more)

### Community 21 - "GatewayKey"
Cohesion: 0.09
Nodes (38): ContentBlockParam, mapAssistantTurn(), mapToolChoiceToAnthropic(), mapToolsToAnthropic(), mapTurnsToAnthropicMessages(), Message, MessageParam, parseToolCallArguments() (+30 more)

### Community 22 - "integrations.md"
Cohesion: 0.19
Nodes (27): get, get, get, get, get, get, get, get (+19 more)

### Community 23 - "config-generator.service.ts"
Cohesion: 0.08
Nodes (23): ClientManagerService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, defaultModelPolicy(), ModelEditField, ModelManagerService (+15 more)

### Community 24 - "KeyGenerateCommand"
Cohesion: 0.24
Nodes (10): assertSafeFuzzResponse(), expectNoServerError(), DEFAULT_LITERAL_SECRETS, expectNoSecretsDisclosed(), expectNoSecretsInHeaders(), FORBIDDEN_PATTERNS, scanHeadersForSecrets(), scanResponseForSecrets() (+2 more)

### Community 25 - "openai-params-provider.mapper.ts"
Cohesion: 0.12
Nodes (25): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asJsonSchemaName(), asWarningCode(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions() (+17 more)

### Community 26 - "app-configuration.types.ts"
Cohesion: 0.07
Nodes (29): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+21 more)

### Community 27 - "model-manager.service.ts"
Cohesion: 0.20
Nodes (4): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppTokenUsage

### Community 28 - "provider-registry.service.ts"
Cohesion: 0.09
Nodes (34): toCachedChatResponse(), SemanticStoreEmbedState, mockExecutorChatSuccess(), mockStreamExecutorSuccess(), ChatResponseData, SseMetaPayload, isToolingRequest(), ChatCacheGuardService (+26 more)

### Community 29 - "provider-instances.bootstrap.ts"
Cohesion: 0.09
Nodes (28): ProviderTestService, Injectable, asProviderApiKey(), ProviderApiKey, ProviderInstanceRuntime, adaptApiKeyProviderFactory(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore() (+20 more)

### Community 30 - "branded.types.ts"
Cohesion: 0.06
Nodes (60): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), assertNoFallbackCycle(), alias1, fallback, myModel (+52 more)

### Community 31 - "anthropic-messages.controller.ts"
Cohesion: 0.19
Nodes (12): ApiAnthropicErrorResponses(), AnthropicAuth(), AnthropicErrorBodyDto, AnthropicErrorResponseDto, ApiProperty, AnthropicModelDto, AnthropicModelsListResponseDto, ApiProperty (+4 more)

### Community 32 - "Deployment — AI Provider Gateway"
Cohesion: 0.04
Nodes (45): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network (`ai-gateway-network`), 5. Deploy (local Compose), 6. Verification, Adding a gateway client, Adding a model alias (+37 more)

### Community 33 - "getAppConfig"
Cohesion: 0.16
Nodes (6): ClientAddCommand, Command, Option, ClientEditCommand, Command, Option

### Community 34 - "asEnvRef"
Cohesion: 0.15
Nodes (13): ChatModule, Module, AnthropicModule, Module, OpenAiAuth(), OpenAiExceptionFilter, Catch, OpenAiBearerAuthGuard (+5 more)

### Community 35 - "AppMetricsService"
Cohesion: 0.15
Nodes (11): HealthLivenessResponseDto, ApiProperty, HealthController, ApiOkResponse, ApiOperation, ApiRequestIdHeader, ApiTags, Controller (+3 more)

### Community 36 - "app-metrics.service.ts"
Cohesion: 0.20
Nodes (11): createMockStreamResult(), textStream(), createMockAIProvider(), createMockDefaultResolvedConfig(), TEST_CONVERSATION_ID, TEST_INPUT_TOKENS, TEST_MODEL_ALIAS_BRANDED, TEST_PROMPT_CACHE_CREATION_TOKENS (+3 more)

### Community 38 - "testing.md"
Cohesion: 0.13
Nodes (29): AppModule, Module, createMockConfigService(), bootstrap(), ProviderInstancesBootstrap, Injectable, PORT, setupApp() (+21 more)

### Community 39 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.12
Nodes (19): OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 40 - ".createMessage"
Cohesion: 0.16
Nodes (15): ChatToolingDto, GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsArray, IsOptional, IsString, Type (+7 more)

### Community 41 - "create-e2e-app.ts"
Cohesion: 0.13
Nodes (21): asCostUsd(), asInputTokens(), asOutputTokens(), asSystemFingerprint(), ThinkingBudgetTokens, WarningCode, ProviderToolCall, ChatCompletionsAdapterOptions (+13 more)

### Community 42 - ".streamChat"
Cohesion: 0.40
Nodes (4): ProviderToolResultTurn, ChatCompletionMessageParam, mapAssistantTurn(), mapTurnsToOpenAiMessages()

### Community 43 - "AppMetricsBackend"
Cohesion: 0.20
Nodes (16): content, content, content, content, content, content, description, content (+8 more)

### Community 44 - "create-openai-integration-app.ts"
Cohesion: 0.12
Nodes (28): WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema, convertModel(), convertProvider() (+20 more)

### Community 45 - "logging.service.ts"
Cohesion: 0.06
Nodes (24): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, NoopErrorReportingAdapter, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable (+16 more)

### Community 46 - "LoggingService"
Cohesion: 0.06
Nodes (32): CachedChatResponseSchema, ChatWarningSchema, parseCachedChatResponse(), OllamaEmbeddingAdapter, Injectable, RedisVectorStoreAdapter, Injectable, EmbeddingBackend (+24 more)

### Community 47 - "GatewayModelsCatalogService"
Cohesion: 0.17
Nodes (13): ApiGatewayModelsErrorResponses, ModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 49 - "app.module.ts"
Cohesion: 0.21
Nodes (7): DEFAULT_HTTP_STATUS_TO_CODE, GlobalExceptionFilter, isPayloadTooLargeError(), PayloadTooLargeError, RequestWithId, Catch, Injectable

### Community 50 - ".getOne"
Cohesion: 0.23
Nodes (4): HealthReadinessResponseDto, ApiProperty, HealthService, Injectable

### Community 51 - "openai-models.controller.ts"
Cohesion: 0.12
Nodes (18): ApiOpenAiErrorResponses(), OpenAiErrorBodyDto, OpenAiErrorResponseDto, ApiProperty, ApiPropertyOptional, OpenAiModelDto, OpenAiModelsListResponseDto, ApiProperty (+10 more)

### Community 52 - "Gateway CLI — documentation"
Cohesion: 0.05
Nodes (43): Agent examples, Agent mode (`config:init --agent`), `AgentReport` (stdout with `--json`), Answers contract, Boilerplate configuration and commands, CLI layer — summary, CLI scope, Commands — clients (+35 more)

### Community 53 - "RequestIdMiddleware"
Cohesion: 0.29
Nodes (6): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 54 - "PrometheusService"
Cohesion: 0.14
Nodes (5): ProviderTestOptions, AddModelInput, ModelAlias, ProviderInstanceId, TokenDirection

### Community 55 - "anthropic-response.mapper.ts"
Cohesion: 0.10
Nodes (32): SseDeltaEvent, SseDoneEvent, SseFinishReason, SseMetaEvent, fromGatewayToolCallDto(), asMessageId(), asPromptCacheCreationTokens(), asPromptCacheHitTokens() (+24 more)

### Community 56 - "AnthropicMessagesRequestDto"
Cohesion: 0.07
Nodes (33): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+25 more)

### Community 57 - "API documentation — AI Provider Gateway"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation â AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 58 - "deployment.md"
Cohesion: 0.13
Nodes (22): description, description, description, description, description, description, description, description (+14 more)

### Community 59 - "ConsoleLoggerAdapter"
Cohesion: 0.29
Nodes (8): resolveClientIdFromKey(), getAppConfig(), enrichRequestWithClientId(), AnthropicApiKeyGuard, readAnthropicApiKey(), Injectable, readAuthorizationHeader(), readBearerToken()

### Community 60 - "ErrorReportingBackend"
Cohesion: 0.10
Nodes (18): createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), asPort(), AppConfiguration, CacheRuntimeConfig, RateLimitRuntimeConfig, RedisRuntimeConfig, SemanticCacheRuntimeConfig (+10 more)

### Community 61 - "project.structure.md"
Cohesion: 0.33
Nodes (8): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthReadinessChecksDto, ApiPropertyOptional, HealthRedisCheckItemDto, ApiProperty, ApiPropertyOptional

### Community 62 - "openai-request.mapper.ts"
Cohesion: 0.18
Nodes (11): validateEnvironment(), IntegrationsModule, Module, LoggingModule, Global, Module, ProviderRegistryModule, Global (+3 more)

### Community 63 - "logging.module.ts"
Cohesion: 0.15
Nodes (6): healthStatusToGaugeValue(), HealthComponent, HealthStatus, PrometheusService, Injectable, PrometheusMetrics

### Community 64 - "ChatParamsDto"
Cohesion: 0.17
Nodes (12): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+4 more)

### Community 65 - "GlobalExceptionFilter"
Cohesion: 0.07
Nodes (51): TEST_INPUT_TOKENS_SMALL, TEST_MAX_CONCURRENT_STREAMS, TEST_MODEL_ID, TEST_OUTPUT_TOKENS, TEST_RATE_LIMIT_BURST, OpenAiApiSurface, openAiCompatibleApiSurface, closeE2eApp() (+43 more)

### Community 66 - "EnvironmentVariables"
Cohesion: 0.22
Nodes (4): CACHE_BACKEND_TYPE, CACHE_BACKEND_VALUES, validate(), ValidatedEnvironment

### Community 67 - "health.service.spec.ts"
Cohesion: 0.18
Nodes (12): ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, SseDonePayloadDto, SseDoneUsageDto, ApiPropertyOptional (+4 more)

### Community 68 - "OpenAiBearerAuthGuard"
Cohesion: 0.25
Nodes (7): AppMetricsModule, Global, Module, RATE_LIMIT_MODULE_OPTIONS, RateLimitModule, RateLimitModuleOptions, Module

### Community 69 - ".completions"
Cohesion: 0.18
Nodes (12): ChatService, Injectable, createStreamRequest(), GatewayKeyAndSmartRateLimit(), createMockExpressRequest(), createMockExpressResponse(), asRequestId(), GatewayKeyGuard (+4 more)

### Community 70 - "anthropic-stream.mapper.ts"
Cohesion: 0.17
Nodes (13): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+5 more)

### Community 71 - "PinoLoggerAdapter"
Cohesion: 0.11
Nodes (16): ChatStreamController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+8 more)

### Community 72 - "chat-provider-call.service.ts"
Cohesion: 0.32
Nodes (7): InitAnswers, Injectable, WizardOrchestratorService, defaultProviderInstanceId(), deriveApiKeyRef(), deriveBaseUrlRef(), asEnvRef()

### Community 73 - "main.ts"
Cohesion: 0.07
Nodes (44): ConfigFlat, ConfigRoot, getByPath(), Nullable, resolveGateway(), TestCacheConfigOptions, TestGatewayKeyRuntimeOptions, TestRateLimitConfigOptions (+36 more)

### Community 74 - "wizard-state.schema.ts"
Cohesion: 0.05
Nodes (33): ApiHeader, AnthropicMessagesController, AnthropicAuth, ApiAnthropicErrorResponses, ApiBody, ApiOperation, ApiProduces, ApiRequestIdHeader (+25 more)

### Community 75 - "anthropic-thinking.mapper.ts"
Cohesion: 0.22
Nodes (9): toHttpException(), ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic(), resolveAnthropicOutputConfig() (+1 more)

### Community 76 - "generation-warnings.ts"
Cohesion: 0.12
Nodes (16): components, securitySchemes, description, in, name, type, info, contact (+8 more)

### Community 77 - "SentryErrorReportingAdapter"
Cohesion: 0.38
Nodes (9): getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement(), shouldConnectRedis(), shouldIncludeRedisStack() (+1 more)

### Community 78 - "Brand types — developer guide"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 79 - "WizardOrchestratorService"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 80 - "anthropic-tools.mapper.ts"
Cohesion: 0.20
Nodes (10): EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min (+2 more)

### Community 82 - "post"
Cohesion: 0.30
Nodes (15): post, post, post, post, /api/v1/chat/stream, /api/v1/openai/chat/completions, description, operationId (+7 more)

### Community 84 - "asRateLimitBurst"
Cohesion: 0.17
Nodes (13): OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 85 - "chat-cache-guard.service.spec.ts"
Cohesion: 0.29
Nodes (6): AiMetricsModule, Global, Module, ObservabilityModule, Global, Module

### Community 89 - "ConfigInitCommand"
Cohesion: 0.31
Nodes (3): ConfigInitCommand, Command, Option

### Community 90 - "anthropic-tools.mapper.ts"
Cohesion: 0.47
Nodes (6): mapAnthropicRequestToGateway(), AnthropicTool, mapAnthropicContentBlockToGateway(), mapAnthropicToolChoice(), mapAnthropicToolsToGateway(), TEST_TOOL

### Community 91 - "ChatResponseDto"
Cohesion: 0.22
Nodes (3): HttpMetricsMiddleware, Injectable, HttpMethod

### Community 92 - "ProviderAddCommand"
Cohesion: 0.31
Nodes (3): ProviderAddCommand, Command, Option

### Community 93 - "openai-chat-completion-response.dto.ts"
Cohesion: 0.12
Nodes (27): assertInteractiveAllowed(), DEFAULT_MODELS, CliAiProvider, ModelPromptResult, ModelPromptService, Injectable, ProviderPromptResult, ProviderPromptService (+19 more)

### Community 94 - "OpenAiChatMessageDto"
Cohesion: 0.22
Nodes (9): OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString, MaxLength (+1 more)

### Community 95 - "ClientAddCommand"
Cohesion: 0.33
Nodes (6): ResponseFormatDto, ApiProperty, ApiPropertyOptional, IsIn, IsObject, IsOptional

### Community 96 - "ClientEditCommand"
Cohesion: 0.14
Nodes (14): ApiErrorCode, UnsupportedProviderException, MockConfigServiceOptions, createMockContext(), TEST_GATEWAY_KEY_BRANDED, initGuard(), initGuard(), initGuard() (+6 more)

### Community 97 - "ClientRemoveCommand"
Cohesion: 0.33
Nodes (3): ClientRemoveCommand, Command, Option

### Community 98 - "ModelAddCommand"
Cohesion: 0.39
Nodes (3): ModelAddCommand, Command, Option

### Community 99 - "ModelEditCommand"
Cohesion: 0.15
Nodes (9): ConfigSecretsStatusCommand, Command, Option, ProviderTestCommand, Command, Option, EnvPatchService, Injectable (+1 more)

### Community 100 - "ModelRemoveCommand"
Cohesion: 0.33
Nodes (3): ModelRemoveCommand, Command, Option

### Community 101 - "ProviderEditCommand"
Cohesion: 0.33
Nodes (3): ProviderEditCommand, Command, Option

### Community 102 - "ProviderRemoveCommand"
Cohesion: 0.40
Nodes (3): ConfigValidateCommand, Command, Option

### Community 103 - "config-validator.ts"
Cohesion: 0.53
Nodes (3): isTextContentItem(), normalizeOpenAiContent(), TextContentItem

### Community 104 - "logging.service.spec.ts"
Cohesion: 0.14
Nodes (14): getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT, buildAppProviderMetricsContext(), buildLlmMetricsContext(), mapProviderResponseToAiObservation(), mapProviderResponseToUsage() (+6 more)

### Community 105 - "semantic-cache.tokens.ts"
Cohesion: 0.16
Nodes (24): convertClient(), convertRateLimit(), GatewayClient, ClientBasicAnswers, ClientPromptResult, RateLimitAnswers, generateGatewayConfigTemplate(), AddClientInput (+16 more)

### Community 106 - "instrument.ts"
Cohesion: 0.33
Nodes (3): ModelEditCommand, Command, Option

### Community 107 - "openai-exception.filter.ts"
Cohesion: 0.33
Nodes (3): ProviderRemoveCommand, Command, Option

### Community 108 - "NoopErrorReportingAdapter"
Cohesion: 0.40
Nodes (3): ClientListCommand, Command, Option

### Community 125 - "createMockConfigService.ts"
Cohesion: 0.40
Nodes (3): ConfigShowCommand, Command, Option

### Community 128 - "Anthropic Messages API integration (Claude Code)"
Cohesion: 0.10
Nodes (21): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+13 more)

### Community 129 - "isRetryableHttpError"
Cohesion: 0.40
Nodes (3): ModelListCommand, Command, Option

### Community 131 - "Configuration — AI Provider Gateway"
Cohesion: 0.10
Nodes (20): 0) First run (configuration wizard), 1) Secrets and env (`.env`), 2) `gateway.config.yaml` file (models / instances / policies), 3) Validation and fail-fast, 4) Overriding parameters per request, 5) Environment profiles (optional), 6) System prompt files (`src/config/system-prompt/`), CLI vs configuration loading (+12 more)

### Community 133 - "Integration facades (IDE) — AI Provider Gateway"
Cohesion: 0.11
Nodes (18): Architecture view, Authorization — two levels, Client keys (frontend / IDE → gateway), Errors and filters, Facade limitations, Facade ≠ provider runtime, Facade scope, File structure (+10 more)

### Community 134 - "Anti-patterns / what to watch for — AI Provider Gateway"
Cohesion: 0.10
Nodes (20): 10) Starting without a required API key, 11) Confusing rate-limit codes (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`), 12) Response cache without awareness of “freshness”, 13) Confusing three API contracts (native vs official contract facades), 14) CLI dependent on `ConfigModule` (configuration deadlock), 15) Starting the server without a proper config file, 16) Extending `CacheBackend` with vector search, 17) Overriding `command:` on Redis Stack Compose (+12 more)

### Community 135 - "Conceptual documentation — AI Provider Gateway"
Cohesion: 0.12
Nodes (16): 1) Gateway, not an “open proxy”, 2) Models as aliases (preferred), 3) Two execution modes: standard and streaming, 4) Edge validation, 5) Testability, Conceptual documentation — AI Provider Gateway, Functional scope (summary), HTTP surface vs LLM engine (+8 more)

### Community 136 - "Endpoint list — AI Provider Gateway"
Cohesion: 0.12
Nodes (17): Anthropic Messages API *(Claude Code — x-api-key)*, Chat *(requires `X-Gateway-Key`)*, Endpoint list — AI Provider Gateway, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models/:modelAlias`, `GET /metrics` (+9 more)

### Community 139 - "API architecture — AI Provider Gateway"
Cohesion: 0.12
Nodes (16): API architecture — AI Provider Gateway, API style, Auth, Extensions, Generation parameters (`params` in body), HTTP errors, Idempotency, retry, and fallback, Model identification (aliases) (+8 more)

### Community 140 - "Conversation tracking (`conversationId`)"
Cohesion: 0.12
Nodes (15): API contract, Cache and metrics, Client example (turn 1 → turn 2), Client obligation when starting from turn 2, Conversation tracking (`conversationId`), Difference: field in response vs field in request (metrics), FAQ, Logging conversations from the second message (recommended flow) (+7 more)

### Community 142 - "OpenAI contract facade (Cursor IDE)"
Cohesion: 0.13
Nodes (15): Authorization, Configuration in Cursor, Endpoints, Errors, Example (non-stream), Example (stream), Limitations, Model selection (+7 more)

### Community 144 - "LoggingModule"
Cohesion: 0.40
Nodes (3): ProviderListCommand, Command, Option

### Community 148 - "Architecture — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): Architecture — AI Provider Gateway, CLI — isolation from HTTP runtime, Configuration and secrets, Document purpose, Layers within modules (NestJS convention), Logical view, Modules (bounded areas — functional core), Observability (+5 more)

### Community 149 - "Dictionary — AI Provider Gateway"
Cohesion: 0.14
Nodes (14): Brand types (TypeScript), Canonical terms, Core concepts, Dictionary — AI Provider Gateway, Error codes (stable), Facade vs provider runtime, Field dictionary, Generation parameters (C0–C7 extensions) (+6 more)

### Community 150 - "Testing — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): CI / locally, Coverage areas, E2E infrastructure, E2E tests (`test/e2e/`), HTTP codes in E2E (201 vs 200), Integration tests (`test/integration/`), Overview, Security tests (`test/security/`) (+5 more)

### Community 152 - "alias"
Cohesion: 0.67
Nodes (3): alias(), toSafeConfigSnapshot(), toSafeModelList()

### Community 154 - "Data flow — AI Provider Gateway"
Cohesion: 0.22
Nodes (8): 0. Shared skeleton: validation, model selection, 1. Standard `POST /api/v1/chat` — success (201), 2. Standard `POST /api/v1/chat` — error, 3. Streaming `POST /api/v1/chat/stream` — success (SSE), 4. OpenAI facade — `POST /api/v1/openai/chat/completions`, 5. Anthropic facade — `POST /api/v1/anthropic/messages`, Data flow — AI Provider Gateway, Participant legend

### Community 155 - "OpenAI adapter (provider runtime)"
Cohesion: 0.22
Nodes (9): Adapter components, Adapter role, Chat Completions, Configuration, OpenAI adapter (provider runtime), Related documents, Responses API, SDK mapping (+1 more)

### Community 160 - "Directory and file architecture"
Cohesion: 0.40
Nodes (5): 1) Repository tree, 2) Directory descriptions (responsibilities), 2a) CLI — runtime isolation, 3) Feature scope vs documentation, Directory and file architecture

### Community 161 - "Documentation — AI Provider Gateway"
Cohesion: 0.33
Nodes (6): Distribution and contributions, Documentation — AI Provider Gateway, File index, How to read this documentation, Selected topics, Specifications (SDD)

## Knowledge Gaps
- **539 isolated node(s):** `$schema`, `openapi`, `description`, `required`, `schema` (+534 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LoggingService` connect `test-constants.ts` to `create-integration-app.ts`, `api-error.code.ts`, `brand-types.md`, `ClientId`, `responses.adapter.ts`, `provider-error.mapper.ts`, `GatewayKey`, `app-configuration.types.ts`, `provider-registry.service.ts`, `provider-instances.bootstrap.ts`, `branded.types.ts`, `app-metrics.service.ts`, `testing.md`, `create-e2e-app.ts`, `logging.service.ts`, `LoggingService`, `app.module.ts`, `.getOne`, `main.ts`, `wizard-state.schema.ts`, `anthropic-thinking.mapper.ts`, `semantic-cache.tokens.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `GatewayConfig` connect `config-generator.service.ts` to `cli.module.ts`, `testing.md`, `semantic-cache.tokens.ts`, `main.ts`, `.error`, `provider-registry.service.ts`, `ModelAlias`, `provider-instances.bootstrap.ts`, `openai-models.controller.ts`, `ErrorReportingBackend`, `openai-chat-completion-response.dto.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `ChatRequestDto` connect `brand-types.md` to `ChatParamsDto`, `ClientEditCommand`, `api-error.code.ts`, `app-metrics.service.ts`, `anthropic-tools.mapper.ts`, `health.service.ts`, `provider-manager.service.ts`, `PinoLoggerAdapter`, `.createMessage`, `logging.service.spec.ts`, `LoggingService`, `test-constants.ts`, `asClientId`, `swagger.setup.ts`, `app-configuration.types.ts`, `provider-registry.service.ts`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `LoggingService` (e.g. with `initService()` and `initService()`) actually correct?**
  _`LoggingService` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `openapi`, `description` to the rest of the system?**
  _541 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cli.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09637730690362269 - nodes in this community are weakly interconnected._
- **Should `GatewayConfig` be split into smaller, more focused modules?**
  _Cohesion score 0.09032258064516129 - nodes in this community are weakly interconnected._