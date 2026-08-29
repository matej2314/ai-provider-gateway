# Graph Report - ai-provider-gateway  (2026-08-29)

## Corpus Check
- 554 files · ~228,619 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3231 nodes · 10852 edges · 153 communities (120 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 130 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `88c022d2`
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
- e2e-provider-registry.ts
- README.md
- post
- health.controller.ts
- ConsoleLoggerAdapter
- chat-cache-guard.service.spec.ts
- ChatWarningDto
- anthropic-tools.mapper.ts
- ClientListCommand
- ProviderAddCommand
- openai-chat-completion-response.dto.ts
- OpenAiChatMessageDto
- ConfigSecretsStatusCommand
- logging.service.ts
- ClientRemoveCommand
- RequestIdMiddleware
- ConfigShowCommand
- ModelRemoveCommand
- ProviderEditCommand
- .getLiveness
- logging.service.spec.ts
- .getMetrics
- ActiveStreamsTracker
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
- OpenAiChatCompletionsController
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
- Directory and file architecture
- Documentation — AI Provider Gateway
- ollama-chat.md
- openai-chat-gpt.md

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 119 edges
2. `asProviderInstanceId()` - 105 edges
3. `ModelAlias` - 93 edges
4. `ProviderInstanceId` - 83 edges
5. `GatewayConfig` - 73 edges
6. `asModelAlias()` - 69 edges
7. `GatewayKey` - 66 edges
8. `asEnvRef()` - 65 edges
9. `ApiErrorCode` - 63 edges
10. `AppMetricsService` - 60 edges

## Surprising Connections (you probably didn't know these)
- `createE2eAppWithCache()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/app.module.ts
- `createE2eAppWithSemanticCache()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/gateway-chat-semantic-cache.e2e-spec.ts → src/app.module.ts
- `createE2eAppWithStreamCache()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/gateway-stream-cache.e2e-spec.ts → src/app.module.ts
- `createE2eApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/app.module.ts
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts

## Import Cycles
- 4-file cycle: `src/cache/should-include-redis-stack.ts -> src/config/typed-config.ts -> src/config/app-configuration.types.ts -> src/config/configuration.ts -> src/cache/should-include-redis-stack.ts`

## Communities (153 total, 33 thin omitted)

### Community 0 - "create-integration-app.ts"
Cohesion: 0.11
Nodes (32): collectPendingSecrets(), DEFAULT_MODELS, CliAiProvider, EnvPatchValue, ModelPromptResult, ModelPromptService, Injectable, ProviderPromptResult (+24 more)

### Community 1 - "cli.module.ts"
Cohesion: 0.07
Nodes (50): AgentReport, AgentReportStatus, emitAgentReport(), exitCodeForReport(), PendingSecretsItem, loadAnswers(), assertAgentHasAnswers(), CliMode (+42 more)

### Community 2 - "GatewayConfig"
Cohesion: 0.09
Nodes (24): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+16 more)

### Community 3 - "api-error.code.ts"
Cohesion: 0.14
Nodes (9): AppRequestMethod, AppRequestStatus, HealthComponent, HealthMetricsSnapshot, HealthStatus, HttpRequestLabels, RateLimitReason, SemanticCacheLookupResult (+1 more)

### Community 4 - "brand-types.md"
Cohesion: 0.15
Nodes (5): ClientCli, createMockSmartRateLimiter(), GatewayKey, SmartRateLimiterService, Injectable

### Community 5 - "ClientId"
Cohesion: 0.14
Nodes (26): escapeRedisSearchTag(), isRedisSearchTagSafeId(), CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema, convertClient(), convertModel(), convertProvider() (+18 more)

### Community 6 - "health.service.ts"
Cohesion: 0.07
Nodes (43): ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic(), resolveAnthropicOutputConfig(), ContentBlockParam (+35 more)

### Community 7 - "provider-manager.service.ts"
Cohesion: 0.08
Nodes (35): createService(), MockRedis, mockRedisInstances, OllamaEmbeddingAdapter, createAdapter(), Injectable, initAdapter(), EmbeddingBackend (+27 more)

### Community 8 - "responses.adapter.ts"
Cohesion: 0.18
Nodes (7): exitWithAgentReport(), resolveCliMode(), ProviderTestCommand, Command, Option, Injectable, WizardStateManager

### Community 9 - "openai-stream.mapper.ts"
Cohesion: 0.14
Nodes (10): ConfigGeneratorService, Injectable, FileManagerService, Injectable, WizardRunResult, EnvTemplateInput, generateEnvTemplate(), isEnvInputRedisRequired() (+2 more)

### Community 10 - "asProviderInstanceId"
Cohesion: 0.15
Nodes (7): KeyGenerateCommand, Command, Option, KeyGeneratorService, Injectable, KeyPromptService, Injectable

### Community 11 - ".error"
Cohesion: 0.08
Nodes (37): IsPrimitiveMetadataRecord, Matches, SemanticStoreEmbedState, mockExecutorChatSuccess(), mockStreamExecutorSuccess(), ChatRequestDto, ApiProperty, ApiPropertyOptional (+29 more)

### Community 12 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.09
Nodes (31): asCostUsd(), CostUsd, ToolCallId, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan() (+23 more)

### Community 13 - "anthropic-tools.mapper.ts"
Cohesion: 0.13
Nodes (12): Header, TEST_CLIENT, APP_METRICS_BACKEND, MetricsController, ApiOperation, ApiResponse, ApiTags, Controller (+4 more)

### Community 14 - "ai-provider.interface.ts"
Cohesion: 0.11
Nodes (36): CachedChatResponse, CachedChatWarning, CachedFinishReason, ChatCacheSource, ChatResponseData, SseMetaPayload, SseMetaPayloadDto, ApiProperty (+28 more)

### Community 15 - "provider-input.ts"
Cohesion: 0.15
Nodes (12): ChatService, Injectable, getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT, CHAT_MESSAGE_LIMITS, INGRESS_LIMITS (+4 more)

### Community 16 - "ModelAlias"
Cohesion: 0.08
Nodes (39): CliValidateOptions, AppConfiguration, RedisRuntimeConfig, SemanticCacheRuntimeConfig, collectInactiveProviderWarnings(), formatZodIssues(), validateGatewayConfig(), ValidationOptions (+31 more)

### Community 17 - "test-constants.ts"
Cohesion: 0.17
Nodes (13): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+5 more)

### Community 18 - "asClientId"
Cohesion: 0.10
Nodes (11): RedisConnectionService, Injectable, Inject, Inject, isRedisRequiredFromConfig(), Inject, Optional, LoggingService (+3 more)

### Community 19 - "swagger.setup.ts"
Cohesion: 0.08
Nodes (24): assertInteractiveAllowed(), ClientManagerService, Injectable, ConfigPersistenceService, Injectable, defaultModelPolicy(), ModelEditField, ModelManagerService (+16 more)

### Community 20 - "provider-error.mapper.ts"
Cohesion: 0.27
Nodes (16): MappedProviderError, isAuthError(), isClientError(), isProviderRateLimitError(), isRateLimitStatus(), isServerError(), isTimeoutStatus(), nameLooksLikeTimeout() (+8 more)

### Community 21 - "GatewayKey"
Cohesion: 0.14
Nodes (11): ConfigSecretsStatusCommand, Command, Option, EnvPatchService, Injectable, ProviderTestService, Injectable, EnvRef (+3 more)

### Community 22 - "integrations.md"
Cohesion: 0.19
Nodes (27): get, get, get, get, get, get, get, get (+19 more)

### Community 23 - "config-generator.service.ts"
Cohesion: 0.13
Nodes (18): WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, InitAnswers, WizardState, ClientPromptService, Injectable, BasicServerAnswers (+10 more)

### Community 24 - "KeyGenerateCommand"
Cohesion: 0.15
Nodes (29): CliRateLimit, RequestIdMiddleware, Injectable, createRequestId(), isAttemptNumber(), isBaseUrl(), isCacheTtlSeconds(), isConversationId() (+21 more)

### Community 25 - "openai-params-provider.mapper.ts"
Cohesion: 0.12
Nodes (24): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asWarningCode(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions(), mapResponseFormatToChatCompletion() (+16 more)

### Community 26 - "app-configuration.types.ts"
Cohesion: 0.08
Nodes (25): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+17 more)

### Community 27 - "model-manager.service.ts"
Cohesion: 0.10
Nodes (7): healthStatusToGaugeValue(), PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppProviderStreamScope, AppRequestLabels, AppTokenUsage

### Community 28 - "provider-registry.service.ts"
Cohesion: 0.16
Nodes (12): assertNoFallbackCycle(), alias1, fallback, myModel, primary, ApiErrorCode, ApiErrorPayload, UnsupportedProviderException (+4 more)

### Community 29 - "provider-instances.bootstrap.ts"
Cohesion: 0.10
Nodes (32): CachedChatResponseSchema, ChatWarningSchema, FinishReasonSchema, SseDoneEvent, fromGatewayToolCallDto(), asMessageId(), asPromptCacheCreationTokens(), asPromptCacheHitTokens() (+24 more)

### Community 30 - "branded.types.ts"
Cohesion: 0.09
Nodes (33): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), isRetryableHttpError(), AttemptResult, ResilientExecutionOptions, ResilientExecutionResult (+25 more)

### Community 31 - "anthropic-messages.controller.ts"
Cohesion: 0.10
Nodes (33): OTHER_CLIENT_ID, TEST_CLIENT_ID, validReplyJson, TEST_CLIENT_ID, cacheEnabledGatewayConfig, FIXED_VECTOR, TEST_CLIENT_ID, UNKNOWN_CLIENT_ID (+25 more)

### Community 32 - "Deployment — AI Provider Gateway"
Cohesion: 0.04
Nodes (46): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network (`ai-gateway-network`), 5. Deploy (local Compose), 6. Verification, Adding a gateway client, Adding a model alias (+38 more)

### Community 33 - "getAppConfig"
Cohesion: 0.21
Nodes (7): DEFAULT_HTTP_STATUS_TO_CODE, GlobalExceptionFilter, isPayloadTooLargeError(), PayloadTooLargeError, RequestWithId, Catch, Injectable

### Community 34 - "asEnvRef"
Cohesion: 0.23
Nodes (15): TEST_INPUT_TOKENS_SMALL, TEST_MODEL_ID, buildResolvedConfig(), capabilities(), createDefaultCompleteResponse(), createDefaultParams(), createE2eFallbackProviderRegistry(), createE2eOpenAiProviderRegistry() (+7 more)

### Community 35 - "AppMetricsService"
Cohesion: 0.09
Nodes (21): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthLivenessResponseDto, ApiProperty, HealthReadinessChecksDto, HealthReadinessResponseDto, ApiProperty (+13 more)

### Community 36 - "app-metrics.service.ts"
Cohesion: 0.17
Nodes (8): CHAT_STREAM_API_DESCRIPTION, SseSerializer, StreamCleanupInterceptor, Injectable, readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey(), requireClientGatewayKey()

### Community 37 - "create-openai-integration-app.ts"
Cohesion: 0.08
Nodes (7): ProviderTestOptions, CliAiModel, ModelAlias, ProviderInstanceId, NoopAppMetricsAdapter, Injectable, AppMetricsBackend

### Community 38 - "testing.md"
Cohesion: 0.09
Nodes (31): buildDefaultConfigSnapshot(), ConfigFlat, ConfigRoot, createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), Nullable, resolveGateway(), TestCacheConfigOptions (+23 more)

### Community 39 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.33
Nodes (7): mapAnthropicRequestToGateway(), AnthropicTool, mapAnthropicContentBlockToGateway(), mapAnthropicToolChoice(), mapAnthropicToolsToGateway(), TEST_TOOL, GatewayToolDefinition

### Community 40 - ".createMessage"
Cohesion: 0.09
Nodes (35): mapProviderResponseToAiObservation(), toCachedChatResponse(), asInputTokens(), asOutputTokens(), asToolCallId(), parseGeminiResponseWithTools(), ChatCompletionsAdapterOptions, buildResponsesCreateParams() (+27 more)

### Community 41 - "create-e2e-app.ts"
Cohesion: 0.06
Nodes (40): ChatOutputTextDto, ApiProperty, ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString (+32 more)

### Community 42 - ".streamChat"
Cohesion: 0.15
Nodes (12): FIXTURES_DIR, deriveApiKeyRef(), createEmptyTestGatewayConfig(), createTestGatewayConfig(), defaultGatewayConfig(), GatewayModelOverrides, mergeModels(), mergeProviders() (+4 more)

### Community 43 - "AppMetricsBackend"
Cohesion: 0.12
Nodes (19): OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 44 - "create-openai-integration-app.ts"
Cohesion: 0.15
Nodes (23): ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), joinedDeltaText(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions, IntegrationAppContext (+15 more)

### Community 45 - "logging.service.ts"
Cohesion: 0.38
Nodes (6): GatewayModelCapabilitiesDto, GatewayModelDto, ApiProperty, ApiPropertyOptional, ModelsListResponseDto, ApiProperty

### Community 46 - "LoggingService"
Cohesion: 0.06
Nodes (40): computeSystemSignature(), hashCallParams(), serializeCallParamsForCache(), ResponseCacheService, Injectable, isSingleTurnUserRequest(), lastUserMessageText(), EMBED_NOT_ATTEMPTED (+32 more)

### Community 47 - "GatewayModelsCatalogService"
Cohesion: 0.16
Nodes (12): OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString, MaxLength (+4 more)

### Community 49 - "app.module.ts"
Cohesion: 0.35
Nodes (11): closeE2eApp(), createDefaultE2eConfigOptions(), createE2eApp(), withE2eApp(), createAnthropicRequestBody(), E2E_ANTHROPIC_USER_MESSAGE, E2E_GATEWAY_KEY, E2E_INVALID_GATEWAY_KEY (+3 more)

### Community 50 - ".getOne"
Cohesion: 0.08
Nodes (29): ChatModule, Module, GatewayKeyAndSmartRateLimit(), resolveClientIdFromKey(), ResolvedGatewayClient, getAppConfig(), GatewayKeyGuard, Injectable (+21 more)

### Community 51 - "openai-models.controller.ts"
Cohesion: 0.21
Nodes (9): CreateE2eAppOptions, E2eAppContext, nativeChatBody, closeSecurityApp(), createSecurityApp(), CreateSecurityAppOptions, SecurityAppContext, toE2eOptions() (+1 more)

### Community 52 - "Gateway CLI — documentation"
Cohesion: 0.05
Nodes (43): Agent examples, Agent mode (`config:init --agent`), `AgentReport` (stdout with `--json`), Answers contract, Boilerplate configuration and commands, CLI layer — summary, CLI scope, Commands — clients (+35 more)

### Community 53 - "RequestIdMiddleware"
Cohesion: 0.25
Nodes (7): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Semantic cache (Redis Stack, wektory), Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 54 - "PrometheusService"
Cohesion: 0.07
Nodes (33): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+25 more)

### Community 55 - "anthropic-response.mapper.ts"
Cohesion: 0.19
Nodes (19): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional (+11 more)

### Community 56 - "AnthropicMessagesRequestDto"
Cohesion: 0.21
Nodes (9): TEST_MAX_CONCURRENT_STREAMS, TEST_RATE_LIMIT_BURST, createE2eBurstRateLimiter(), createE2eCooldownDeniedLimiter(), createE2eSaturatedConcurrentStreamLimiter(), chatBody, createPerKeyBurstRateLimiter(), rateLimitEnabledConfig (+1 more)

### Community 57 - "API documentation — AI Provider Gateway"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation â AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 58 - "deployment.md"
Cohesion: 0.10
Nodes (35): content, description, content, description, content, description, content, description (+27 more)

### Community 59 - "ConsoleLoggerAdapter"
Cohesion: 0.35
Nodes (5): IsStringOrArrayOfStrings(), mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice(), mapOpenAiToolsToGateway(), OpenAiFunctionTool

### Community 60 - "ErrorReportingBackend"
Cohesion: 0.06
Nodes (27): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, NoopErrorReportingAdapter, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable (+19 more)

### Community 61 - "project.structure.md"
Cohesion: 0.12
Nodes (25): GatewayProviderInstanceConfig, adaptApiKeyProviderFactory(), createAnthropicProvider(), buildGenerationConfig(), createGoogleProvider(), mapStopSequences(), mapThinkingBudgetToGeminiLevel(), createOpenAiCompatibleProviderInstance() (+17 more)

### Community 62 - "openai-request.mapper.ts"
Cohesion: 0.17
Nodes (13): OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 63 - "logging.module.ts"
Cohesion: 0.20
Nodes (3): PrometheusService, Injectable, PrometheusMetrics

### Community 64 - "ChatParamsDto"
Cohesion: 0.31
Nodes (3): isInvalidRequestStatus(), AnthropicExceptionFilter, Catch

### Community 65 - "GlobalExceptionFilter"
Cohesion: 0.14
Nodes (8): ConfigInitCommand, Command, Option, ConfigValidateCommand, Command, Option, CliGatewayValidatorService, Injectable

### Community 66 - "EnvironmentVariables"
Cohesion: 0.14
Nodes (19): assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField(), NON_FUZZABLE_OBJECT_KEYS, VALID_USER_MESSAGE (+11 more)

### Community 67 - "health.service.spec.ts"
Cohesion: 0.10
Nodes (29): IsNotEmpty, ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsString, MaxLength (+21 more)

### Community 68 - "OpenAiBearerAuthGuard"
Cohesion: 0.09
Nodes (25): CACHE_BACKEND_TYPE, getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromEnv(), isSemanticCacheEnabledFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement() (+17 more)

### Community 69 - ".completions"
Cohesion: 0.39
Nodes (5): ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional

### Community 70 - "anthropic-stream.mapper.ts"
Cohesion: 0.09
Nodes (8): HttpMetricsMiddleware, Injectable, OTHER_CLIENT, TEST_CLIENT, AppMetricsService, Inject, Injectable, HttpMethod

### Community 71 - "PinoLoggerAdapter"
Cohesion: 0.07
Nodes (32): ApiHeader, ChatController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, ApiSecurity (+24 more)

### Community 72 - "chat-provider-call.service.ts"
Cohesion: 0.11
Nodes (27): MockConfigServiceOptions, CreateTestGatewayConfigOptions, TEST_MAX_ATTEMPTS, TEST_RETRY_ON_STATUS, TEST_TIMEOUT_MS, buildResolveGateway(), DEFAULT_RESOLVE_MODEL, DEFAULT_RESOLVE_PROVIDERS (+19 more)

### Community 73 - "main.ts"
Cohesion: 0.12
Nodes (18): ApiAnthropicErrorResponses(), ApiOpenAiErrorResponses(), ApiRequestIdHeader(), AnthropicMessagesController, AnthropicAuth, ApiSecurity, ApiTags, Controller (+10 more)

### Community 74 - "wizard-state.schema.ts"
Cohesion: 0.33
Nodes (6): content, description, headers, headers, X-Gateway-Cache, 200

### Community 75 - ".createMessage"
Cohesion: 0.06
Nodes (39): AppModule, Module, HealthModule, Module, bootstrap(), AppMetricsModule, Global, Module (+31 more)

### Community 76 - "generation-warnings.ts"
Cohesion: 0.22
Nodes (8): info, contact, description, title, version, openapi, $schema, tags

### Community 77 - "SentryErrorReportingAdapter"
Cohesion: 0.46
Nodes (5): OpenAiModelDto, OpenAiModelsListResponseDto, ApiProperty, mapGatewayModelsListToOpenAi(), mapGatewayModelToOpenAi()

### Community 78 - "Brand types — developer guide"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 82 - "post"
Cohesion: 0.30
Nodes (15): post, post, post, post, /api/v1/chat/stream, /api/v1/openai/chat/completions, description, operationId (+7 more)

### Community 83 - "health.controller.ts"
Cohesion: 0.39
Nodes (3): ProviderRemoveCommand, Command, Option

### Community 84 - "ConsoleLoggerAdapter"
Cohesion: 0.17
Nodes (13): ApiGatewayModelsErrorResponses, ModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 85 - "chat-cache-guard.service.spec.ts"
Cohesion: 0.39
Nodes (3): ClientAddCommand, Command, Option

### Community 89 - "ChatWarningDto"
Cohesion: 0.40
Nodes (3): ClientListCommand, Command, Option

### Community 90 - "anthropic-tools.mapper.ts"
Cohesion: 0.07
Nodes (27): isUnservableCachedReply(), parseCachedChatResponse(), RedisVectorStoreAdapter, Injectable, EmbeddingCircuitBreaker, normalizeEmbeddingModelForIndex(), semanticIndexName(), SemanticIndexNameOptions (+19 more)

### Community 91 - "ClientListCommand"
Cohesion: 0.39
Nodes (3): ClientEditCommand, Command, Option

### Community 92 - "ProviderAddCommand"
Cohesion: 0.36
Nodes (3): ProviderAddCommand, Command, Option

### Community 93 - "openai-chat-completion-response.dto.ts"
Cohesion: 0.40
Nodes (3): ConfigShowCommand, Command, Option

### Community 94 - "OpenAiChatMessageDto"
Cohesion: 0.39
Nodes (3): ClientRemoveCommand, Command, Option

### Community 95 - "ConfigSecretsStatusCommand"
Cohesion: 0.39
Nodes (3): ModelAddCommand, Command, Option

### Community 96 - "logging.service.ts"
Cohesion: 0.40
Nodes (3): ModelListCommand, Command, Option

### Community 97 - "ClientRemoveCommand"
Cohesion: 0.42
Nodes (6): AnthropicModelDto, AnthropicModelsListResponseDto, ApiProperty, mapGatewayModelsListToAnthropic(), mapGatewayModelToAnthropic(), toDisplayName()

### Community 98 - "RequestIdMiddleware"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 99 - "ConfigShowCommand"
Cohesion: 0.40
Nodes (3): ProviderListCommand, Command, Option

### Community 100 - "ModelRemoveCommand"
Cohesion: 0.39
Nodes (3): ModelEditCommand, Command, Option

### Community 101 - "ProviderEditCommand"
Cohesion: 0.39
Nodes (3): ProviderEditCommand, Command, Option

### Community 102 - ".getLiveness"
Cohesion: 0.11
Nodes (16): ChatStreamController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+8 more)

### Community 104 - ".getMetrics"
Cohesion: 0.39
Nodes (3): ModelRemoveCommand, Command, Option

### Community 108 - "ActiveStreamsTracker"
Cohesion: 0.09
Nodes (32): createInProcessSingleflight(), composeSystemPrompt(), getResolvedSystemPrompts(), ChatErrorHandlerService, Injectable, ChatProviderCallService, StreamOnceParams, Injectable (+24 more)

### Community 128 - "Anthropic Messages API integration (Claude Code)"
Cohesion: 0.10
Nodes (21): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+13 more)

### Community 129 - "OpenAiChatCompletionsController"
Cohesion: 0.12
Nodes (15): OpenAiChatCompletionsController, ApiBody, ApiOpenAiErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+7 more)

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
- **554 isolated node(s):** `$schema`, `openapi`, `description`, `required`, `schema` (+549 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LoggingService` connect `asClientId` to `brand-types.md`, `ClientId`, `health.service.ts`, `provider-manager.service.ts`, `.error`, `ai-provider.interface.ts`, `provider-error.mapper.ts`, `app-configuration.types.ts`, `branded.types.ts`, `anthropic-messages.controller.ts`, `getAppConfig`, `AppMetricsService`, `.createMessage`, `create-e2e-app.ts`, `create-openai-integration-app.ts`, `LoggingService`, `app.module.ts`, `ErrorReportingBackend`, `project.structure.md`, `chat-provider-call.service.ts`, `.createMessage`, `anthropic-tools.mapper.ts`, `ActiveStreamsTracker`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `asProviderInstanceId()` connect `create-integration-app.ts` to `cli.module.ts`, `ClientId`, `provider-manager.service.ts`, `responses.adapter.ts`, `.error`, `ai-provider.interface.ts`, `ModelAlias`, `swagger.setup.ts`, `provider-error.mapper.ts`, `config-generator.service.ts`, `KeyGenerateCommand`, `provider-instances.bootstrap.ts`, `branded.types.ts`, `anthropic-messages.controller.ts`, `asEnvRef`, `testing.md`, `.createMessage`, `.streamChat`, `create-openai-integration-app.ts`, `logging.service.ts`, `app.module.ts`, `project.structure.md`, `health.service.spec.ts`, `PinoLoggerAdapter`, `chat-provider-call.service.ts`, `.createMessage`, `.completions`, `ActiveStreamsTracker`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `ChatRequestDto` connect `.error` to `GatewayConfig`, `health.service.spec.ts`, `app-metrics.service.ts`, `.getLiveness`, `PinoLoggerAdapter`, `OpenAiChatCompletionRequestDto`, `create-e2e-app.ts`, `ActiveStreamsTracker`, `ai-provider.interface.ts`, `provider-input.ts`, `ConsoleLoggerAdapter`, `anthropic-messages.controller.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `LoggingService` (e.g. with `createService()` and `initService()`) actually correct?**
  _`LoggingService` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `openapi`, `description` to the rest of the system?**
  _556 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `create-integration-app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10909090909090909 - nodes in this community are weakly interconnected._
- **Should `cli.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07484629778134189 - nodes in this community are weakly interconnected._