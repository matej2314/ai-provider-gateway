# Graph Report - .  (2026-08-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2803 nodes · 13406 edges · 105 communities (100 shown, 5 thin omitted)
- Extraction: 65% EXTRACTED · 35% INFERRED · 0% AMBIGUOUS · INFERRED: 4654 edges (avg confidence: 0.98)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e3e2cdb8`
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
- PrometheusAppMetricsAdapter
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
- anthropic-tools.mapper.ts
- createMockConfigService.ts
- Anthropic Messages API integration (Claude Code)
- architecture.md
- Configuration — AI Provider Gateway
- Integration facades (IDE) — AI Provider Gateway
- Anti-patterns / what to watch for — AI Provider Gateway
- Conceptual documentation — AI Provider Gateway
- Endpoint list — AI Provider Gateway
- API architecture — AI Provider Gateway
- Conversation tracking (`conversationId`)
- OpenAI contract facade (Cursor IDE)
- provider-openai-runtime.md
- Architecture — AI Provider Gateway
- Dictionary — AI Provider Gateway
- Testing — AI Provider Gateway
- wait-for-redis.ts
- Data flow — AI Provider Gateway
- OpenAI adapter (provider runtime)
- Directory and file architecture
- Documentation — AI Provider Gateway
- ollama-chat.md
- openai-chat-gpt.md

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 95 edges
2. `asProviderInstanceId()` - 89 edges
3. `ModelAlias` - 80 edges
4. `ProviderInstanceId` - 77 edges
5. `ChatRequestDto` - 66 edges
6. `GatewayKey` - 63 edges
7. `asEnvRef()` - 63 edges
8. `ApiErrorCode` - 62 edges
9. `asGatewayKey()` - 56 edges
10. `GatewayConfig` - 56 edges

## Surprising Connections (you probably didn't know these)
- `AppModule` --indirect_call--> `createIntegrationApp()`  [INFERRED]
  src/app.module.ts → test/integration/helpers/create-integration-app.ts
- `AppModule` --indirect_call--> `createOpenAiIntegrationApp()`  [INFERRED]
  src/app.module.ts → test/integration/helpers/create-openai-integration-app.ts
- `alias()` --indirect_call--> `createE2eFallbackProviderRegistry()`  [INFERRED]
  src/chat/resilience/resilient-executor.spec.ts → test/e2e/helpers/e2e-provider-registry.ts
- `alias()` --indirect_call--> `createE2eProviderRegistry()`  [INFERRED]
  src/chat/resilience/resilient-executor.spec.ts → test/e2e/helpers/e2e-provider-registry.ts
- `LoggingService` --indirect_call--> `createE2eAppWithCache()`  [INFERRED]
  src/logging/logging.service.ts → test/e2e/gateway-chat-cache.e2e-spec.ts

## Import Cycles
- None detected.

## Communities (105 total, 5 thin omitted)

### Community 0 - "create-integration-app.ts"
Cohesion: 0.22
Nodes (16): ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions, IntegrationAppContext, withIntegrationApp() (+8 more)

### Community 1 - "cli.module.ts"
Cohesion: 0.06
Nodes (36): ClientAddCommand, Command, ClientEditCommand, Command, ClientListCommand, Command, ClientRemoveCommand, Command (+28 more)

### Community 2 - "GatewayConfig"
Cohesion: 0.13
Nodes (20): convertRateLimit(), ClientManagerService, Injectable, normalizeGatewayConfigForWrite(), KeyGeneratorService, Injectable, ClientBasicAnswers, ClientPromptResult (+12 more)

### Community 3 - "api-error.code.ts"
Cohesion: 0.13
Nodes (30): ApiErrorCode, TEST_INPUT_TOKENS_SMALL, TEST_MAX_CONCURRENT_STREAMS, TEST_MODEL_ID, TEST_OUTPUT_TOKENS, TEST_PROVIDER_INSTANCE_BRANDED, TEST_RATE_LIMIT_BURST, initGuard() (+22 more)

### Community 4 - "brand-types.md"
Cohesion: 0.18
Nodes (28): Nominal Type Safety, getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT, createConversationId(), createRequestId(), isAttemptNumber() (+20 more)

### Community 5 - "ClientId"
Cohesion: 0.12
Nodes (27): DEFAULT_MODELS, CliAiProvider, CliRateLimit, GatewayClient, ModelPromptResult, ServerConfigPromptResult, WizardRunResult, ClientCli (+19 more)

### Community 6 - "health.service.ts"
Cohesion: 0.09
Nodes (21): HealthCheckItemDto, ApiProperty, HealthReadinessChecksDto, HealthReadinessResponseDto, ApiProperty, HealthRedisCheckItemDto, ApiProperty, ApiPropertyOptional (+13 more)

### Community 7 - "provider-manager.service.ts"
Cohesion: 0.15
Nodes (17): EnvPatchService, Injectable, ProviderPromptResult, ProviderPromptService, Injectable, ProviderManagerService, Injectable, validateProviderApiKey() (+9 more)

### Community 8 - "responses.adapter.ts"
Cohesion: 0.11
Nodes (29): asToolCallId(), buildResponsesCreateParams(), mapGatewayMetadataToOpenAi(), mapAssistantTurnToResponsesInput(), mapTurnsToResponsesInput(), CALL_1, extractResponsesToolCalls(), mapResponsesStopReason() (+21 more)

### Community 9 - "openai-stream.mapper.ts"
Cohesion: 0.19
Nodes (19): SseDoneEvent, OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty (+11 more)

### Community 10 - "asProviderInstanceId"
Cohesion: 0.09
Nodes (31): IsPrimitiveMetadataRecord, ResponseCacheService, Injectable, parseCachedChatResponse(), CachedChatResponse, ChatRequestDto, ApiProperty, ApiPropertyOptional (+23 more)

### Community 11 - ".error"
Cohesion: 0.15
Nodes (6): ProviderListCommand, Command, ProviderTestCommand, Command, ProviderTestService, Injectable

### Community 12 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.08
Nodes (30): asCostUsd(), CostUsd, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext() (+22 more)

### Community 13 - "anthropic-tools.mapper.ts"
Cohesion: 0.13
Nodes (19): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+11 more)

### Community 14 - "ai-provider.interface.ts"
Cohesion: 0.19
Nodes (20): CachedChatResponseWithConversation, toChatResponseDto(), mapStopReasonToFinishReason(), StreamOnceResult, ProviderResponse, GatewayFinishReason, toGatewayToolCallDto(), InputTokens (+12 more)

### Community 15 - "provider-input.ts"
Cohesion: 0.12
Nodes (23): ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength (+15 more)

### Community 16 - "ModelAlias"
Cohesion: 0.09
Nodes (20): ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, SseMetaPayload, StreamOnceParams, SseEvent (+12 more)

### Community 17 - "test-constants.ts"
Cohesion: 0.15
Nodes (17): MockConfigServiceOptions, createMockContext(), TEST_CACHE_KEY, TEST_CACHE_TTL_CUSTOM, TEST_CACHE_TTL_SECONDS, TEST_CACHED_CONVERSATION_ID, TEST_CACHED_REQUEST_ID, TEST_CACHED_RESPONSE_ID (+9 more)

### Community 18 - "asClientId"
Cohesion: 0.11
Nodes (20): ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, Body, Post, Req (+12 more)

### Community 19 - "swagger.setup.ts"
Cohesion: 0.06
Nodes (44): ChatOutputTextDto, ApiProperty, ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString (+36 more)

### Community 20 - "provider-error.mapper.ts"
Cohesion: 0.21
Nodes (17): ApiErrorPayload, isApiErrorPayload(), MappedProviderError, isAuthError(), isClientError(), isInvalidRequestStatus(), isProviderRateLimitError(), isRateLimitStatus() (+9 more)

### Community 21 - "GatewayKey"
Cohesion: 0.08
Nodes (22): Smart Rate Limiting, StreamCleanupInterceptor, Injectable, createMockSmartRateLimiter(), resolveClientIdFromKey(), GatewayKey, ResolvedGatewayClient, SmartRateLimitGuard (+14 more)

### Community 22 - "integrations.md"
Cohesion: 0.19
Nodes (89): Conversation Tracking, description, description, description, description, description, description, description (+81 more)

### Community 23 - "config-generator.service.ts"
Cohesion: 0.11
Nodes (9): ModelAddCommand, Command, ConfigGeneratorService, Injectable, ConfigPersistenceService, Injectable, FileManagerService, Injectable (+1 more)

### Community 24 - "KeyGenerateCommand"
Cohesion: 0.40
Nodes (3): KeyGenerateCommand, Command, Option

### Community 25 - "openai-params-provider.mapper.ts"
Cohesion: 0.15
Nodes (19): asJsonSchemaName(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions(), mapResponseFormatToChatCompletion(), mapResponseFormatToResponses(), mapStopSequences(), OpenAiSharedChatCompletionParams (+11 more)

### Community 26 - "app-configuration.types.ts"
Cohesion: 0.07
Nodes (26): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+18 more)

### Community 27 - "model-manager.service.ts"
Cohesion: 0.16
Nodes (20): DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, defaultModelPolicy(), ModelEditField, ModelManagerService, Injectable (+12 more)

### Community 28 - "provider-registry.service.ts"
Cohesion: 0.08
Nodes (31): Provider Abstraction Layer, mockExecutorChatSuccess(), mockStreamExecutorSuccess(), CompleteOnceResult, createMockStreamResult(), textStream(), ChatResponseBuilderService, Injectable (+23 more)

### Community 29 - "provider-instances.bootstrap.ts"
Cohesion: 0.11
Nodes (28): createMockLoggingService(), assertEnabledProviderApiKeysPresent(), collectMissingEnabledProviderApiKeyErrors(), formatMissingProviderApiKeyError(), isApiKeyRequiredForProviderType(), assertOpenAiProviderType(), isOpenAiProviderType(), adaptApiKeyProviderFactory() (+20 more)

### Community 30 - "branded.types.ts"
Cohesion: 0.19
Nodes (19): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), AttemptResult, ResilientExecutionOptions, ResilientExecutionResult, RetryPolicy (+11 more)

### Community 31 - "anthropic-messages.controller.ts"
Cohesion: 0.15
Nodes (15): ApiAnthropicErrorResponses(), ApiRequestIdHeader(), AnthropicAuth(), AnthropicErrorBodyDto, AnthropicErrorResponseDto, ApiProperty, AnthropicModelDto, AnthropicModelsListResponseDto (+7 more)

### Community 32 - "Deployment — AI Provider Gateway"
Cohesion: 0.05
Nodes (43): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network, 5. Deploy, 6. Verification, Adding a gateway client, Adding a model alias (+35 more)

### Community 33 - "getAppConfig"
Cohesion: 0.41
Nodes (5): getAppConfig(), enrichRequestWithClientId(), readAnthropicApiKey(), readAuthorizationHeader(), readBearerToken()

### Community 34 - "asEnvRef"
Cohesion: 0.13
Nodes (25): createEmptyTestGatewayConfig(), createTestGatewayConfig(), CreateTestGatewayConfigOptions, defaultGatewayConfig(), GatewayModelOverrides, mergeModels(), mergeProviders(), TEST_MAX_ATTEMPTS (+17 more)

### Community 35 - "AppMetricsService"
Cohesion: 0.10
Nodes (8): HttpMetricsMiddleware, Injectable, ActiveStreamsTracker, OTHER_CLIENT, TEST_CLIENT, Injectable, AppMetricsService, Injectable

### Community 36 - "app-metrics.service.ts"
Cohesion: 0.10
Nodes (16): NoopAppMetricsAdapter, Injectable, healthStatusToGaugeValue(), resolveAppMetricsBackend(), TEST_CLIENT, APP_METRICS_BACKEND, AppRequestLabels, AppRequestMethod (+8 more)

### Community 37 - "PrometheusAppMetricsAdapter"
Cohesion: 0.12
Nodes (5): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppProviderStreamScope, AppTokenUsage

### Community 38 - "testing.md"
Cohesion: 0.06
Nodes (51): Security Testing Layer, Test Pyramid Strategy, assertNoFallbackCycle(), alias1, myModel, emptyStream(), failingStream(), expectEnvRef() (+43 more)

### Community 39 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.08
Nodes (28): OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+20 more)

### Community 40 - ".createMessage"
Cohesion: 0.11
Nodes (16): ApiHeader, AnthropicMessagesController, AnthropicAuth, ApiAnthropicErrorResponses, ApiBody, ApiOperation, ApiProduces, ApiRequestIdHeader (+8 more)

### Community 41 - "create-e2e-app.ts"
Cohesion: 0.17
Nodes (23): AppModule, Module, RedisConnectionService, Injectable, createMockConfigService(), ProviderInstancesBootstrap, Injectable, setupApp() (+15 more)

### Community 42 - ".streamChat"
Cohesion: 0.13
Nodes (14): ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body, Post (+6 more)

### Community 44 - "create-openai-integration-app.ts"
Cohesion: 0.18
Nodes (17): buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext, INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED, INTEGRATION_OPENAI_MODEL_ID_BRANDED, INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED (+9 more)

### Community 45 - "logging.service.ts"
Cohesion: 0.19
Nodes (6): LoggerBackend, mockErrorReporting, mockLoggerBackend, ERROR_REPORTING_BACKEND, LOGGER_BACKEND, LOGGER_OPTIONS

### Community 46 - "LoggingService"
Cohesion: 0.18
Nodes (4): Inject, LogContext, LoggingService, Injectable

### Community 47 - "GatewayModelsCatalogService"
Cohesion: 0.09
Nodes (26): ApiGatewayModelsErrorResponses, ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional, ModelsController, ApiNotFoundResponse (+18 more)

### Community 48 - "chat.service.ts"
Cohesion: 0.20
Nodes (9): Ingress Validation Profiles, composeSystemPrompt(), getResolvedSystemPrompts(), CHAT_MESSAGE_LIMITS, INGRESS_LIMITS, ChatIngressProfile, validateChatIngress(), IsPrimitiveMetadataRecord() (+1 more)

### Community 49 - "app.module.ts"
Cohesion: 0.15
Nodes (16): Facade Anti-Corruption Layer, ChatModule, Module, AnthropicModule, Module, IntegrationsModule, Module, OpenAiModule (+8 more)

### Community 50 - ".getOne"
Cohesion: 0.17
Nodes (13): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+5 more)

### Community 51 - "openai-models.controller.ts"
Cohesion: 0.11
Nodes (23): ApiOpenAiErrorResponses(), OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader (+15 more)

### Community 52 - "Gateway CLI — documentation"
Cohesion: 0.06
Nodes (34): Boilerplate configuration and commands, CLI layer — summary, CLI scope, Commands — clients, Commands — configuration, Commands — keys, Commands — models, Commands — providers (+26 more)

### Community 53 - "RequestIdMiddleware"
Cohesion: 0.14
Nodes (12): Observability Stack, RequestIdMiddleware, Injectable, ObservabilityModule, Global, Module, Co jest prawdziwe vs mock, Pliki konfiguracyjne (+4 more)

### Community 54 - "PrometheusService"
Cohesion: 0.20
Nodes (3): PrometheusService, Injectable, PrometheusMetrics

### Community 55 - "anthropic-response.mapper.ts"
Cohesion: 0.20
Nodes (13): fromGatewayToolCallDto(), AnthropicContentBlock, AnthropicContentBlockDto, AnthropicMessagesResponseDto, AnthropicMessagesUsageDto, AnthropicTextContentBlockDto, AnthropicThinkingContentBlockDto, AnthropicToolUseContentBlockDto (+5 more)

### Community 56 - "AnthropicMessagesRequestDto"
Cohesion: 0.13
Nodes (19): AnthropicMessagesRequestDto, AnthropicThinkingDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 57 - "API documentation — AI Provider Gateway"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation — AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 58 - "deployment.md"
Cohesion: 0.35
Nodes (15): Conceptual overview → Conceptual documentation, content, content, content, content, content, content, content (+7 more)

### Community 59 - "ConsoleLoggerAdapter"
Cohesion: 0.33
Nodes (3): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable

### Community 60 - "ErrorReportingBackend"
Cohesion: 0.18
Nodes (4): NoopErrorReportingAdapter, Injectable, ErrorReportingBackend, Inject

### Community 61 - "project.structure.md"
Cohesion: 0.06
Nodes (34): ChatWarningSchema, ResponseFormatDto, ApiProperty, ApiPropertyOptional, IsIn, IsObject, IsOptional, toSseMetaPayloadDto() (+26 more)

### Community 62 - "openai-request.mapper.ts"
Cohesion: 0.31
Nodes (7): TEST_TOOL_CALL_ID, mapOpenAiMessagesToGateway(), mapOpenAiToolCalls(), mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice(), mapOpenAiToolsToGateway(), OpenAiFunctionTool

### Community 63 - "logging.module.ts"
Cohesion: 0.27
Nodes (9): LEVEL_RANK, parseLogLevel(), LoggerOptions, LogLevel, isSentryEnabled(), LoggingModule, resolveErrorReportingBackend(), Global (+1 more)

### Community 64 - "ChatParamsDto"
Cohesion: 0.17
Nodes (12): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+4 more)

### Community 65 - "GlobalExceptionFilter"
Cohesion: 0.24
Nodes (6): GlobalExceptionFilter, isPayloadTooLargeError(), PayloadTooLargeError, RequestWithId, Catch, Injectable

### Community 66 - "EnvironmentVariables"
Cohesion: 0.15
Nodes (13): Provider Secrets Validation, EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional (+5 more)

### Community 67 - "health.service.spec.ts"
Cohesion: 0.12
Nodes (12): Header, healthyReadinessConfig, initService(), MetricsController, ApiOperation, ApiResponse, ApiTags, Controller (+4 more)

### Community 68 - "OpenAiBearerAuthGuard"
Cohesion: 0.22
Nodes (8): Error Contract, AnthropicExceptionFilter, Catch, OpenAiAuth(), OpenAiExceptionFilter, Catch, OpenAiBearerAuthGuard, Injectable

### Community 69 - ".completions"
Cohesion: 0.18
Nodes (10): ApiBody, ApiOpenAiErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body, Post (+2 more)

### Community 70 - "anthropic-stream.mapper.ts"
Cohesion: 0.40
Nodes (8): asMessageId(), MessageId, AnthropicStreamState, createAnthropicStreamState(), emitThinkingBlock(), eventLine(), mapSseEventToAnthropic(), nextToolBlockIndex()

### Community 72 - "chat-provider-call.service.ts"
Cohesion: 0.25
Nodes (11): buildAppProviderMetricsContext(), buildLlmMetricsContext(), mapProviderResponseToAiObservation(), mapProviderResponseToUsage(), clamp(), isOverrideKey(), resolveProviderCallOptions(), OVERRIDE_KEYS (+3 more)

### Community 73 - "main.ts"
Cohesion: 0.29
Nodes (6): isSentryErrorReportingEnabled(), isSentryMetricsEnabled(), bootstrap(), PORT, isSwaggerEnabled(), setupSwagger()

### Community 74 - "wizard-state.schema.ts"
Cohesion: 0.08
Nodes (32): Configuration Wizard, ConfigInitCommand, Command, WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, CliAiModelSchema, CliAiProviderSchema (+24 more)

### Community 75 - "anthropic-thinking.mapper.ts"
Cohesion: 0.43
Nodes (6): ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic(), resolveAnthropicOutputConfig()

### Community 76 - "generation-warnings.ts"
Cohesion: 0.52
Nodes (5): buildGenerationWarnings(), PARAM_IGNORED, asWarningCode(), openAiNumericThinkingBudgetIgnored(), openAiNumericThinkingBudgetWithoutEnable()

### Community 78 - "Brand types — developer guide"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 80 - "anthropic-tools.mapper.ts"
Cohesion: 0.11
Nodes (32): asPromptCacheCreationTokens(), asPromptCacheHitTokens(), extractAnthropicThinkingContent(), mapAssistantTurn(), mapToolChoiceToAnthropic(), mapToolsToAnthropic(), mapTurnsToAnthropicMessages(), parseAnthropicResponseWithTools() (+24 more)

### Community 125 - "createMockConfigService.ts"
Cohesion: 0.10
Nodes (38): buildDefaultConfigSnapshot(), ConfigFlat, ConfigRoot, createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), getByPath(), Nullable, resolveGateway() (+30 more)

### Community 128 - "Anthropic Messages API integration (Claude Code)"
Cohesion: 0.11
Nodes (20): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+12 more)

### Community 129 - "architecture.md"
Cohesion: 0.07
Nodes (92): Cache Hit Path, CLI Isolation from HTTP Runtime, Gateway Key Authentication, Generation Parameter Merge, Multi-Instance Provider Model, Plug and Play Startup, Resilient Execution Pattern, System Prompt Composition (+84 more)

### Community 131 - "Configuration — AI Provider Gateway"
Cohesion: 0.11
Nodes (19): 0) First run (configuration wizard), 1) Secrets and env (`.env`), 2) `gateway.config.yaml` file (models / instances / policies), 3) Validation and fail-fast, 4) Overriding parameters per request, 5) Environment profiles (optional), 6) System prompt files (`src/config/system-prompt/`), CLI vs configuration loading (+11 more)

### Community 133 - "Integration facades (IDE) — AI Provider Gateway"
Cohesion: 0.11
Nodes (18): Architecture view, Authorization — two levels, Client keys (frontend / IDE → gateway), Errors and filters, Facade ≠ provider runtime, Facade scope, File structure, Ingress validation limits (`validateChatIngress`) (+10 more)

### Community 134 - "Anti-patterns / what to watch for — AI Provider Gateway"
Cohesion: 0.12
Nodes (16): 10) Starting without a required API key, 11) Confusing rate-limit codes (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`), 12) Response cache without awareness of “freshness”, 13) Confusing three API contracts (native vs IDE facades), 14) CLI dependent on `ConfigModule` (configuration deadlock), 15) Starting the server without a proper config file, 1) “Open proxy” through excessive configurability, 2) Secrets in logs (+8 more)

### Community 135 - "Conceptual documentation — AI Provider Gateway"
Cohesion: 0.12
Nodes (17): 1) Gateway, not an “open proxy”, 2) Models as aliases (preferred), 3) Two execution modes: standard and streaming, 4) Edge validation, 5) Testability, Conceptual documentation — AI Provider Gateway, Functional scope (summary), Further development (optional) (+9 more)

### Community 136 - "Endpoint list — AI Provider Gateway"
Cohesion: 0.12
Nodes (17): Anthropic Messages API *(Claude Code — x-api-key)*, Chat *(requires `X-Gateway-Key`)*, Endpoint list — AI Provider Gateway, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models/:modelAlias`, `GET /metrics` (+9 more)

### Community 139 - "API architecture — AI Provider Gateway"
Cohesion: 0.13
Nodes (15): API architecture — AI Provider Gateway, API style, Auth, Extensions, Generation parameters (`params` in body), HTTP errors, Idempotency, retry, and fallback, Model identification (aliases) (+7 more)

### Community 140 - "Conversation tracking (`conversationId`)"
Cohesion: 0.13
Nodes (15): API contract, Cache and metrics, Client example (turn 1 → turn 2), Client obligation when starting from turn 2, Conversation tracking (`conversationId`), Difference: field in response vs field in request (metrics), FAQ, Logging conversations from the second message (recommended flow) (+7 more)

### Community 142 - "OpenAI contract facade (Cursor IDE)"
Cohesion: 0.13
Nodes (15): Authorization, Configuration in Cursor, Endpoints, Errors, Example (non-stream), Example (stream), Limitations, Model selection (+7 more)

### Community 144 - "provider-openai-runtime.md"
Cohesion: 0.09
Nodes (22): Request Lifecycle, SSE Streaming Protocol, Three Contracts One Engine, schema, ChatController, ApiSecurity, ApiTags, Controller (+14 more)

### Community 148 - "Architecture — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): Architecture — AI Provider Gateway, CLI — isolation from HTTP runtime, Configuration and secrets, Document purpose, Layers within modules (NestJS convention), Logical view, Modules (bounded areas — functional core), Observability (+5 more)

### Community 149 - "Dictionary — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): Brand types (TypeScript), Canonical terms, Core concepts, Dictionary — AI Provider Gateway, Error codes (stable), Facade vs provider runtime, Field dictionary, Generation parameters (C0–C7 extensions) (+5 more)

### Community 150 - "Testing — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): CI / locally, Coverage areas, E2E infrastructure, E2E tests (`test/e2e/`), HTTP codes in E2E (201 vs 200), Integration tests (`test/integration/`), Overview, Security tests (`test/security/`) (+5 more)

### Community 151 - "wait-for-redis.ts"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 154 - "Data flow — AI Provider Gateway"
Cohesion: 0.25
Nodes (8): 0. Shared skeleton: validation, model selection, 1. Standard `POST /api/v1/chat` — success (201), 2. Standard `POST /api/v1/chat` — error, 3. Streaming `POST /api/v1/chat/stream` — success (SSE), 4. OpenAI facade — `POST /api/v1/openai/chat/completions`, 5. Anthropic facade — `POST /api/v1/anthropic/messages`, Data flow — AI Provider Gateway, Participant legend

### Community 155 - "OpenAI adapter (provider runtime)"
Cohesion: 0.22
Nodes (9): Adapter components, Adapter role, Chat Completions, Configuration, OpenAI adapter (provider runtime), Related documents, Responses API, SDK mapping (+1 more)

### Community 160 - "Directory and file architecture"
Cohesion: 0.33
Nodes (6): 1) Repository tree, 2) Directory descriptions (responsibilities), 2a) CLI — runtime isolation, 3) Feature scope vs documentation, Directory and file architecture, Working notes (repo root, optional)

### Community 161 - "Documentation — AI Provider Gateway"
Cohesion: 0.33
Nodes (6): Distribution and contributions, Documentation — AI Provider Gateway, File index, How to read this documentation, Selected topics, Specifications (SDD)

## Knowledge Gaps
- **320 isolated node(s):** `mockedUuidV4`, `VALID_CONV_ID_ALT`, `PARAM_IGNORED`, `THINKING_CAPABLE_MODEL_PATTERNS`, `FIXTURES_DIR` (+315 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Deployment — AI Provider Gateway` connect `Deployment — AI Provider Gateway` to `deployment.md`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `API documentation — AI Provider Gateway` connect `API documentation — AI Provider Gateway` to `integrations.md`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Conversation tracking (`conversationId`)` connect `Conversation tracking (`conversationId`)` to `integrations.md`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `LoggingService` (e.g. with `project.structure.md` and `testing.md`) actually correct?**
  _`LoggingService` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `asProviderInstanceId()` (e.g. with `brand-types.md` and `project.structure.md`) actually correct?**
  _`asProviderInstanceId()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `ModelAlias` (e.g. with `Nominal Type Safety` and `architecture.md`) actually correct?**
  _`ModelAlias` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `ProviderInstanceId` (e.g. with `brand-types.md` and `project.structure.md`) actually correct?**
  _`ProviderInstanceId` has 2 INFERRED edges - model-reasoned connections that need verification._