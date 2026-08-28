# Graph Report - ai-provider-gateway  (2026-08-28)

## Corpus Check
- 534 files · ~218,259 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3171 nodes · 10454 edges · 158 communities (122 shown, 36 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 125 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e614832c`
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
- .createMessage
- generation-warnings.ts
- SentryErrorReportingAdapter
- Brand types — developer guide
- .completions
- anthropic-tools.mapper.ts
- README.md
- post
- rate-limit-bypass.security-spec.ts
- ConsoleLoggerAdapter
- chat-cache-guard.service.spec.ts
- ChatWarningDto
- anthropic-tools.mapper.ts
- ClientListCommand
- ProviderAddCommand
- openai-chat-completion-response.dto.ts
- OpenAiChatMessageDto
- ConfigSecretsStatusCommand
- ClientEditCommand
- ClientRemoveCommand
- fallback-chain.spec.ts
- ConfigShowCommand
- ModelRemoveCommand
- ProviderEditCommand
- .getLiveness
- logging.service.spec.ts
- ProviderListCommand
- RequestIdMiddleware
- instrument.ts
- openai-exception.filter.ts
- cli-config-loader.service.spec.ts
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
- Provider Abstraction Layer
- Provider Secrets Validation
- Anthropic Messages API integration (Claude Code)
- LoggingModule
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
- Test Pyramid Strategy
- Three Contracts One Engine
- Architecture — AI Provider Gateway
- Dictionary — AI Provider Gateway
- Testing — AI Provider Gateway
- Data flow — AI Provider Gateway
- OpenAI adapter (provider runtime)
- in-process-singleflight.ts
- Directory and file architecture
- Documentation — AI Provider Gateway
- ollama-chat.md
- openai-chat-gpt.md

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 111 edges
2. `asProviderInstanceId()` - 101 edges
3. `ModelAlias` - 88 edges
4. `ProviderInstanceId` - 81 edges
5. `GatewayConfig` - 73 edges
6. `asEnvRef()` - 65 edges
7. `ChatRequestDto` - 64 edges
8. `asModelAlias()` - 63 edges
9. `GatewayKey` - 62 edges
10. `ApiErrorCode` - 61 edges

## Surprising Connections (you probably didn't know these)
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts
- `createE2eAppWithCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eAppWithSemanticCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-semantic-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eApp()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eAppWithSemanticCache()` --indirect_call--> `OllamaEmbeddingAdapter`  [INFERRED]
  test/e2e/gateway-chat-semantic-cache.e2e-spec.ts → src/cache/semantic/adapters/ollama-embedding.adapter.ts

## Import Cycles
- 4-file cycle: `src/cache/should-include-redis-stack.ts -> src/config/typed-config.ts -> src/config/app-configuration.types.ts -> src/config/configuration.ts -> src/cache/should-include-redis-stack.ts`

## Communities (158 total, 36 thin omitted)

### Community 0 - "create-integration-app.ts"
Cohesion: 0.06
Nodes (26): ClientManagerService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, EnvPatchService, Injectable, defaultModelPolicy() (+18 more)

### Community 1 - "cli.module.ts"
Cohesion: 0.06
Nodes (57): AgentReport, AgentReportStatus, exitCodeForReport(), PendingSecretsItem, loadAnswers(), collectPendingSecrets(), assertAgentHasAnswers(), CliMode (+49 more)

### Community 2 - "GatewayConfig"
Cohesion: 0.09
Nodes (23): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+15 more)

### Community 3 - "api-error.code.ts"
Cohesion: 0.14
Nodes (9): healthStatusToGaugeValue(), AppRequestMethod, AppRequestStatus, HealthComponent, HealthMetricsSnapshot, HealthStatus, HttpRequestLabels, RateLimitReason (+1 more)

### Community 4 - "brand-types.md"
Cohesion: 0.06
Nodes (44): IsPrimitiveMetadataRecord, Matches, toCachedChatResponse(), SemanticStoreEmbedState, ChatRequestDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize (+36 more)

### Community 5 - "ClientId"
Cohesion: 0.08
Nodes (45): DEFAULT_MODELS, WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, InitAnswers, CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema (+37 more)

### Community 6 - "health.service.ts"
Cohesion: 0.09
Nodes (29): computeSystemSignature(), hashCallParams(), serializeCallParamsForCache(), isSingleTurnUserRequest(), lastUserMessageText(), EMBED_NOT_ATTEMPTED, SemanticCacheService, SemanticLookupResult (+21 more)

### Community 7 - "provider-manager.service.ts"
Cohesion: 0.11
Nodes (39): AppModule, Module, createMockConfigService(), bootstrap(), ProviderInstancesBootstrap, Injectable, ProviderRegistryModule, Global (+31 more)

### Community 8 - "responses.adapter.ts"
Cohesion: 0.15
Nodes (12): emitAgentReport(), exitWithAgentReport(), resolveCliMode(), toSafeClientList(), toSafeConfigSnapshot(), toSafeModelList(), toSafeProviderList(), ProviderTestCommand (+4 more)

### Community 9 - "openai-stream.mapper.ts"
Cohesion: 0.10
Nodes (17): CliGatewayValidatorService, Injectable, WizardState, ConfigGeneratorService, Injectable, FileManagerService, Injectable, Injectable (+9 more)

### Community 10 - "asProviderInstanceId"
Cohesion: 0.18
Nodes (5): KeyGenerateCommand, Command, Option, KeyGeneratorService, Injectable

### Community 11 - ".error"
Cohesion: 0.40
Nodes (3): ConfigSecretsStatusCommand, Command, Option

### Community 12 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.09
Nodes (26): NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext(), buildGenAiChatSpanAttributes(), clearLlmScopeContext() (+18 more)

### Community 13 - "anthropic-tools.mapper.ts"
Cohesion: 0.13
Nodes (12): Header, TEST_CLIENT, APP_METRICS_BACKEND, MetricsController, ApiOperation, ApiResponse, ApiTags, Controller (+4 more)

### Community 14 - "ai-provider.interface.ts"
Cohesion: 0.09
Nodes (43): CachedChatResponse, ChatCacheSource, ChatOutputTextDto, ApiProperty, ChatResponseData, ChatResponseDto, ChatUsageDetailsDto, toChatResponseDto() (+35 more)

### Community 15 - "provider-input.ts"
Cohesion: 0.17
Nodes (6): ConfigInitCommand, Command, Option, ConfigValidateCommand, Command, Option

### Community 16 - "ModelAlias"
Cohesion: 0.20
Nodes (13): CliValidateOptions, collectInactiveProviderWarnings(), formatZodIssues(), validateGatewayConfig(), ValidationOptions, ValidationResult, buildEffectiveGatewayConfig(), assertEnabledProviderSecretsPresent() (+5 more)

### Community 17 - "test-constants.ts"
Cohesion: 0.11
Nodes (17): ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, Body, Post, Req (+9 more)

### Community 18 - "asClientId"
Cohesion: 0.13
Nodes (11): ApiErrorCode, DEFAULT_HTTP_STATUS_TO_CODE, ApiErrorPayload, UnsupportedProviderException, PayloadTooLargeError, RequestWithId, MockConfigServiceOptions, TEST_GATEWAY_KEY_BRANDED (+3 more)

### Community 19 - "swagger.setup.ts"
Cohesion: 0.08
Nodes (33): IsNotEmpty, ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsString, MaxLength (+25 more)

### Community 20 - "provider-error.mapper.ts"
Cohesion: 0.26
Nodes (15): MappedProviderError, isAuthError(), isClientError(), isInvalidRequestStatus(), isRateLimitStatus(), isServerError(), isTimeoutStatus(), nameLooksLikeTimeout() (+7 more)

### Community 21 - "GatewayKey"
Cohesion: 0.08
Nodes (40): toHttpException(), JsonSchemaName, PromptCacheCreationTokens, PromptCacheHitTokens, ThinkingBudgetTokens, ToolCallId, WarningCode, AnthropicTool (+32 more)

### Community 22 - "integrations.md"
Cohesion: 0.19
Nodes (27): get, get, get, get, get, get, get, get (+19 more)

### Community 23 - "config-generator.service.ts"
Cohesion: 0.12
Nodes (35): assertInteractiveAllowed(), convertRateLimit(), CliAiProvider, CliRateLimit, GatewayClient, ClientBasicAnswers, ClientPromptResult, ClientPromptService (+27 more)

### Community 24 - "KeyGenerateCommand"
Cohesion: 0.09
Nodes (28): CreateE2eAppOptions, E2eAppContext, assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField() (+20 more)

### Community 25 - "openai-params-provider.mapper.ts"
Cohesion: 0.12
Nodes (25): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asJsonSchemaName(), asWarningCode(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions() (+17 more)

### Community 26 - "app-configuration.types.ts"
Cohesion: 0.07
Nodes (27): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+19 more)

### Community 27 - "model-manager.service.ts"
Cohesion: 0.11
Nodes (6): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppProviderStreamScope, AppRequestLabels, AppTokenUsage

### Community 28 - "provider-registry.service.ts"
Cohesion: 0.09
Nodes (30): ChatWarningSchema, FinishReasonSchema, asPromptCacheCreationTokens(), asPromptCacheHitTokens(), ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel() (+22 more)

### Community 29 - "provider-instances.bootstrap.ts"
Cohesion: 0.43
Nodes (6): assertEnabledProviderBaseUrlPresent(), collectMissingBaseUrlErrors(), formatMissingBaseUrlError(), MissingProviderBaseUrl, RawGatewayConfig, resolveBaseUrlFromEnv()

### Community 30 - "branded.types.ts"
Cohesion: 0.25
Nodes (20): createRequestId(), isAttemptNumber(), isBaseUrl(), isCacheTtlSeconds(), isConversationId(), isFiniteNumber(), isMaxAttempts(), isMaxConcurrentStreams() (+12 more)

### Community 31 - "anthropic-messages.controller.ts"
Cohesion: 0.13
Nodes (26): createMockStreamResult(), textStream(), createMockContext(), TEST_CACHE_KEY, TEST_CACHED_CONVERSATION_ID, TEST_CACHED_REQUEST_ID, TEST_CACHED_RESPONSE_ID, TEST_CONVERSATION_ID (+18 more)

### Community 32 - "Deployment — AI Provider Gateway"
Cohesion: 0.04
Nodes (46): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network (`ai-gateway-network`), 5. Deploy (local Compose), 6. Verification, Adding a gateway client, Adding a model alias (+38 more)

### Community 33 - "getAppConfig"
Cohesion: 0.05
Nodes (44): ChatModule, Module, ApiAnthropicErrorResponses(), SmartRateLimitGuard, Injectable, AnthropicModule, Module, AnthropicModelsController (+36 more)

### Community 34 - "asEnvRef"
Cohesion: 0.06
Nodes (41): ApiGatewayModelsErrorResponses, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, Get (+33 more)

### Community 35 - "AppMetricsService"
Cohesion: 0.21
Nodes (3): HealthReadinessResponseDto, HealthService, Injectable

### Community 36 - "app-metrics.service.ts"
Cohesion: 0.20
Nodes (13): mockExecutorChatSuccess(), mockStreamExecutorSuccess(), createMockAIProvider(), createMockProviderRegistryService(), createMockDefaultResolvedConfig(), asAttemptNumber(), asModelAlias(), AIProvider (+5 more)

### Community 37 - "create-openai-integration-app.ts"
Cohesion: 0.10
Nodes (8): ProviderTestOptions, ModelAlias, ProviderInstanceId, NoopAppMetricsAdapter, Injectable, AppMetricsService, Injectable, TokenDirection

### Community 38 - "testing.md"
Cohesion: 0.08
Nodes (31): buildDefaultConfigSnapshot(), ConfigFlat, ConfigRoot, createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), getByPath(), Nullable, resolveGateway() (+23 more)

### Community 39 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.06
Nodes (36): IsStringOrArrayOfStrings(), OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray (+28 more)

### Community 40 - ".createMessage"
Cohesion: 0.11
Nodes (32): mapProviderResponseToAiObservation(), asInputTokens(), asOutputTokens(), asSystemFingerprint(), asToolCallId(), parseGeminiResponseWithTools(), ChatCompletionsAdapterOptions, buildResponsesCreateParams() (+24 more)

### Community 41 - "create-e2e-app.ts"
Cohesion: 0.15
Nodes (12): RedisConnectionService, Injectable, CacheRegistryService, Injectable, initAdapter(), createMockLoggingService(), HealthCheckResult, HealthRedisCheckResult (+4 more)

### Community 42 - ".streamChat"
Cohesion: 0.05
Nodes (68): TEST_RETRY_ON_STATUS, asGatewayKey(), asPort(), asProviderApiKey(), ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), gatewayConfig (+60 more)

### Community 43 - "AppMetricsBackend"
Cohesion: 0.29
Nodes (9): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthReadinessChecksDto, ApiProperty, ApiPropertyOptional, HealthRedisCheckItemDto, ApiProperty (+1 more)

### Community 45 - "logging.service.ts"
Cohesion: 0.20
Nodes (3): PinoLoggerAdapter, Injectable, LogContext

### Community 46 - "LoggingService"
Cohesion: 0.08
Nodes (21): ResponseCacheService, Inject, Injectable, OllamaEmbeddingAdapter, createAdapter(), Injectable, EmbeddingBackend, Inject (+13 more)

### Community 47 - "GatewayModelsCatalogService"
Cohesion: 0.27
Nodes (12): fromGatewayToolCallDto(), mapChatResponseToOpenAi(), mapFinishReasontoOpenAI(), mapGatewayToolCallsToOpenAi(), mapSystemFingerprintToOpenAi(), toOpenAiCompletionId(), baseChunkFields(), buildToolCallsDelta() (+4 more)

### Community 49 - "app.module.ts"
Cohesion: 0.13
Nodes (12): HealthModule, Module, AppMetricsModule, Global, Module, ObservabilityModule, Global, Module (+4 more)

### Community 50 - ".getOne"
Cohesion: 0.35
Nodes (11): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), AttemptResult, ResilientExecutionResult, RetryPolicy, RETRY_POLICY_DEFAULTS (+3 more)

### Community 51 - "openai-models.controller.ts"
Cohesion: 0.19
Nodes (6): isRetryableHttpError(), ResilientExecutionOptions, ResilientExecutor, rejectWith(), Injectable, createMockResilientExecutor()

### Community 52 - "Gateway CLI — documentation"
Cohesion: 0.05
Nodes (43): Agent examples, Agent mode (`config:init --agent`), `AgentReport` (stdout with `--json`), Answers contract, Boilerplate configuration and commands, CLI layer — summary, CLI scope, Commands — clients (+35 more)

### Community 53 - "RequestIdMiddleware"
Cohesion: 0.25
Nodes (7): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Semantic cache (Redis Stack, wektory), Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 54 - "PrometheusService"
Cohesion: 0.06
Nodes (38): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+30 more)

### Community 55 - "anthropic-response.mapper.ts"
Cohesion: 0.13
Nodes (24): SseDoneEvent, asMessageId(), MessageId, AnthropicContentBlock, AnthropicContentBlockDto, AnthropicMessagesResponseDto, AnthropicMessagesUsageDto, AnthropicTextContentBlockDto (+16 more)

### Community 56 - "AnthropicMessagesRequestDto"
Cohesion: 0.08
Nodes (20): isProviderRateLimitError(), StreamCleanupInterceptor, Injectable, createMockSmartRateLimiter(), readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey(), requireClientGatewayKey() (+12 more)

### Community 57 - "API documentation — AI Provider Gateway"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation â AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 58 - "deployment.md"
Cohesion: 0.09
Nodes (38): content, description, content, description, content, description, content, description (+30 more)

### Community 59 - "ConsoleLoggerAdapter"
Cohesion: 0.31
Nodes (6): resolveClientIdFromKey(), getAppConfig(), enrichRequestWithClientId(), readAnthropicApiKey(), readAuthorizationHeader(), readBearerToken()

### Community 60 - "ErrorReportingBackend"
Cohesion: 0.38
Nodes (6): LEVEL_RANK, parseLogLevel(), LoggerOptions, LogLevel, isSentryEnabled(), resolveErrorReportingBackend()

### Community 61 - "project.structure.md"
Cohesion: 0.33
Nodes (3): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable

### Community 62 - "openai-request.mapper.ts"
Cohesion: 0.16
Nodes (15): ChatToolingDto, GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsArray, IsOptional, IsString, Type (+7 more)

### Community 63 - "logging.module.ts"
Cohesion: 0.20
Nodes (3): PrometheusService, Injectable, PrometheusMetrics

### Community 64 - "ChatParamsDto"
Cohesion: 0.25
Nodes (14): alias(), TEST_INPUT_TOKENS_SMALL, buildResolvedConfig(), capabilities(), createDefaultCompleteResponse(), createDefaultParams(), createE2eFallbackProviderRegistry(), createE2eOpenAiProviderRegistry() (+6 more)

### Community 65 - "GlobalExceptionFilter"
Cohesion: 0.18
Nodes (10): ApiBody, ApiOpenAiErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body, Post (+2 more)

### Community 66 - "EnvironmentVariables"
Cohesion: 0.28
Nodes (5): HealthLivenessResponseDto, ApiProperty, HealthController, ApiTags, Controller

### Community 67 - "health.service.spec.ts"
Cohesion: 0.22
Nodes (3): SentryErrorReportingAdapter, Injectable, ErrorReportingBackend

### Community 68 - "OpenAiBearerAuthGuard"
Cohesion: 0.33
Nodes (11): getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromConfig(), isRedisRequiredFromEnv(), isSemanticCacheEnabledFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement() (+3 more)

### Community 69 - ".completions"
Cohesion: 0.17
Nodes (11): ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body, Post (+3 more)

### Community 70 - "anthropic-stream.mapper.ts"
Cohesion: 0.22
Nodes (3): HttpMetricsMiddleware, Injectable, HttpMethod

### Community 71 - "PinoLoggerAdapter"
Cohesion: 0.23
Nodes (8): TEST_MAX_CONCURRENT_STREAMS, TEST_RATE_LIMIT_BURST, createE2eBurstRateLimiter(), createE2eSaturatedConcurrentStreamLimiter(), chatBody, createPerKeyBurstRateLimiter(), rateLimitEnabledConfig, SECOND_GATEWAY_KEY

### Community 72 - "chat-provider-call.service.ts"
Cohesion: 0.14
Nodes (20): ProviderInstanceRuntime, adaptApiKeyProviderFactory(), createAnthropicProvider(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider(), ApiKeyProviderFactoryFn, ProviderFactoryFn (+12 more)

### Community 73 - "main.ts"
Cohesion: 0.24
Nodes (13): TEST_MAX_ATTEMPTS, TEST_TIMEOUT_MS, closeE2eApp(), withE2eApp(), createAnthropicRequestBody(), E2E_ANTHROPIC_USER_MESSAGE, E2E_GATEWAY_KEY, E2E_INVALID_GATEWAY_KEY (+5 more)

### Community 74 - "wizard-state.schema.ts"
Cohesion: 0.09
Nodes (27): ChatController, ApiSecurity, ApiTags, Controller, GatewayKeyAndSmartRateLimit, ChatService, Injectable, ChatStreamController (+19 more)

### Community 75 - ".createMessage"
Cohesion: 0.10
Nodes (16): ApiHeader, AnthropicMessagesController, AnthropicAuth, ApiAnthropicErrorResponses, ApiBody, ApiOperation, ApiProduces, ApiRequestIdHeader (+8 more)

### Community 76 - "generation-warnings.ts"
Cohesion: 0.12
Nodes (16): components, securitySchemes, description, in, name, type, info, contact (+8 more)

### Community 77 - "SentryErrorReportingAdapter"
Cohesion: 0.15
Nodes (14): composeSystemPrompt(), getResolvedSystemPrompts(), MaxConcurrentStreams, Port, RateLimitBurst, RateLimitRps, AppConfiguration, CacheRuntimeConfig (+6 more)

### Community 78 - "Brand types — developer guide"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 79 - ".completions"
Cohesion: 0.14
Nodes (19): buildAppConfiguration(), BuildEffectiveGatewayConfigOptions, buildGatewayKeyRuntime(), readRequiredPrompt(), stripHtmlComments(), tryReadOptionalPrompts(), loadGatewayConfigFromFile(), EnvRefSchema (+11 more)

### Community 80 - "anthropic-tools.mapper.ts"
Cohesion: 0.11
Nodes (14): CACHE_BACKEND_VALUES, EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString (+6 more)

### Community 82 - "post"
Cohesion: 0.30
Nodes (15): post, post, post, post, /api/v1/chat/stream, /api/v1/openai/chat/completions, description, operationId (+7 more)

### Community 83 - "rate-limit-bypass.security-spec.ts"
Cohesion: 0.39
Nodes (8): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional

### Community 85 - "chat-cache-guard.service.spec.ts"
Cohesion: 0.39
Nodes (3): ClientAddCommand, Command, Option

### Community 89 - "ChatWarningDto"
Cohesion: 0.18
Nodes (12): SseDeltaPayloadDto, ApiProperty, SseMetaPayloadDto, ApiProperty, ApiPropertyOptional, exportOpenApi(), buildSwaggerConfig(), createOpenApiDocument() (+4 more)

### Community 90 - "anthropic-tools.mapper.ts"
Cohesion: 0.07
Nodes (22): CachedChatResponseSchema, parseCachedChatResponse(), RedisVectorStoreAdapter, Injectable, EmbeddingCircuitBreaker, escapeRedisSearchTag(), isRedisSearchTagSafeId(), normalizeEmbeddingModelForIndex() (+14 more)

### Community 91 - "ClientListCommand"
Cohesion: 0.39
Nodes (3): ClientEditCommand, Command, Option

### Community 92 - "ProviderAddCommand"
Cohesion: 0.36
Nodes (3): ProviderAddCommand, Command, Option

### Community 93 - "openai-chat-completion-response.dto.ts"
Cohesion: 0.16
Nodes (16): retryPolicy(), DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, buildDefaultModelCapabilities(), buildDefaultModelPolicy(), getMaxOutputTokensBound() (+8 more)

### Community 94 - "OpenAiChatMessageDto"
Cohesion: 0.39
Nodes (3): ClientRemoveCommand, Command, Option

### Community 95 - "ConfigSecretsStatusCommand"
Cohesion: 0.39
Nodes (3): ModelAddCommand, Command, Option

### Community 96 - "ClientEditCommand"
Cohesion: 0.32
Nodes (4): GlobalExceptionFilter, isPayloadTooLargeError(), Catch, Injectable

### Community 97 - "ClientRemoveCommand"
Cohesion: 0.52
Nodes (5): getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT, createConversationId()

### Community 98 - "fallback-chain.spec.ts"
Cohesion: 0.33
Nodes (5): assertNoFallbackCycle(), alias1, fallback, myModel, primary

### Community 99 - "ConfigShowCommand"
Cohesion: 0.43
Nodes (5): ApiOpenAiErrorResponses(), OpenAiErrorBodyDto, OpenAiErrorResponseDto, ApiProperty, ApiPropertyOptional

### Community 100 - "ModelRemoveCommand"
Cohesion: 0.39
Nodes (3): ModelRemoveCommand, Command, Option

### Community 101 - "ProviderEditCommand"
Cohesion: 0.39
Nodes (3): ProviderEditCommand, Command, Option

### Community 102 - ".getLiveness"
Cohesion: 0.43
Nodes (4): ApiOkResponse, ApiOperation, ApiRequestIdHeader, Get

### Community 103 - "logging.service.spec.ts"
Cohesion: 0.38
Nodes (5): mockErrorReporting, mockLoggerBackend, ERROR_REPORTING_BACKEND, LOGGER_BACKEND, LOGGER_OPTIONS

### Community 106 - "instrument.ts"
Cohesion: 0.39
Nodes (3): ModelEditCommand, Command, Option

### Community 107 - "openai-exception.filter.ts"
Cohesion: 0.39
Nodes (3): ProviderRemoveCommand, Command, Option

### Community 128 - "Anthropic Messages API integration (Claude Code)"
Cohesion: 0.10
Nodes (21): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+13 more)

### Community 129 - "LoggingModule"
Cohesion: 0.67
Nodes (3): LoggingModule, Global, Module

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

### Community 148 - "Architecture — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): Architecture — AI Provider Gateway, CLI — isolation from HTTP runtime, Configuration and secrets, Document purpose, Layers within modules (NestJS convention), Logical view, Modules (bounded areas — functional core), Observability (+5 more)

### Community 149 - "Dictionary — AI Provider Gateway"
Cohesion: 0.14
Nodes (14): Brand types (TypeScript), Canonical terms, Core concepts, Dictionary — AI Provider Gateway, Error codes (stable), Facade vs provider runtime, Field dictionary, Generation parameters (C0–C7 extensions) (+6 more)

### Community 150 - "Testing — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): CI / locally, Coverage areas, E2E infrastructure, E2E tests (`test/e2e/`), HTTP codes in E2E (201 vs 200), Integration tests (`test/integration/`), Overview, Security tests (`test/security/`) (+5 more)

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
- **550 isolated node(s):** `$schema`, `openapi`, `description`, `required`, `schema` (+545 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LoggingService` connect `LoggingService` to `brand-types.md`, `health.service.ts`, `provider-manager.service.ts`, `asClientId`, `GatewayKey`, `app-configuration.types.ts`, `provider-registry.service.ts`, `AppMetricsService`, `app-metrics.service.ts`, `testing.md`, `.createMessage`, `create-e2e-app.ts`, `.streamChat`, `logging.service.ts`, `.getOne`, `openai-models.controller.ts`, `AnthropicMessagesRequestDto`, `ErrorReportingBackend`, `chat-provider-call.service.ts`, `ConsoleLoggerAdapter`, `ChatWarningDto`, `anthropic-tools.mapper.ts`, `ClientEditCommand`, `logging.service.spec.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `ChatRequestDto` connect `brand-types.md` to `ClientRemoveCommand`, `GatewayConfig`, `app-metrics.service.ts`, `.completions`, `health.service.ts`, `OpenAiChatCompletionRequestDto`, `wizard-state.schema.ts`, `LoggingService`, `ai-provider.interface.ts`, `test-constants.ts`, `swagger.setup.ts`, `PrometheusService`, `ChatWarningDto`, `app-configuration.types.ts`, `openai-request.mapper.ts`, `anthropic-messages.controller.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `asProviderInstanceId()` connect `ClientId` to `create-integration-app.ts`, `cli.module.ts`, `brand-types.md`, `provider-manager.service.ts`, `responses.adapter.ts`, `ai-provider.interface.ts`, `asClientId`, `swagger.setup.ts`, `GatewayKey`, `config-generator.service.ts`, `app-configuration.types.ts`, `provider-registry.service.ts`, `provider-instances.bootstrap.ts`, `branded.types.ts`, `anthropic-messages.controller.ts`, `getAppConfig`, `asEnvRef`, `app-metrics.service.ts`, `testing.md`, `create-e2e-app.ts`, `.streamChat`, `LoggingService`, `AnthropicMessagesRequestDto`, `ChatParamsDto`, `chat-provider-call.service.ts`, `main.ts`, `.createMessage`, `.completions`, `openai-chat-completion-response.dto.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `LoggingService` (e.g. with `initService()` and `createAdapter()`) actually correct?**
  _`LoggingService` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `openapi`, `description` to the rest of the system?**
  _552 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `create-integration-app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056862745098039215 - nodes in this community are weakly interconnected._
- **Should `cli.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06095903708017861 - nodes in this community are weakly interconnected._