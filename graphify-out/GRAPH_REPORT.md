# Graph Report - ai-provider-gateway  (2026-08-26)

## Corpus Check
- 519 files · ~204,891 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3085 nodes · 9982 edges · 158 communities (126 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d20e84f`
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
- Data flow — AI Provider Gateway
- OpenAI adapter (provider runtime)
- Directory and file architecture
- Documentation — AI Provider Gateway
- ollama-chat.md
- openai-chat-gpt.md

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 101 edges
2. `asProviderInstanceId()` - 98 edges
3. `ModelAlias` - 87 edges
4. `ProviderInstanceId` - 81 edges
5. `GatewayConfig` - 73 edges
6. `asEnvRef()` - 64 edges
7. `ChatRequestDto` - 63 edges
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

## Communities (158 total, 32 thin omitted)

### Community 0 - "create-integration-app.ts"
Cohesion: 0.06
Nodes (70): asGatewayKey(), asPort(), GatewayConfigSchema, expectGatewayUsage(), gatewayConfig, loadRealGatewayConfig(), openAiCompatibleProviders, NOTE: We can't use loadGatewayConfigFromFile() because it's globally mocked (+62 more)

### Community 1 - "cli.module.ts"
Cohesion: 0.06
Nodes (59): AgentReport, AgentReportStatus, emitAgentReport(), exitCodeForReport(), loadAnswers(), assertAgentHasAnswers(), CliMode, CliModeFlags (+51 more)

### Community 2 - "GatewayConfig"
Cohesion: 0.14
Nodes (11): healthStatusToGaugeValue(), TEST_CLIENT, APP_METRICS_BACKEND, AppRequestLabels, AppRequestStatus, HealthComponent, HealthMetricsSnapshot, HealthStatus (+3 more)

### Community 3 - "api-error.code.ts"
Cohesion: 0.09
Nodes (27): ChatOutputTextDto, ApiProperty, ChatToolingDto, GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsArray, IsOptional (+19 more)

### Community 4 - "brand-types.md"
Cohesion: 0.11
Nodes (12): CachedChatResponseSchema, ChatWarningSchema, parseCachedChatResponse(), RedisVectorStoreAdapter, Injectable, semanticIndexName(), VectorSearchHit, VectorStore (+4 more)

### Community 5 - "ClientId"
Cohesion: 0.14
Nodes (17): DEFAULT_MODELS, convertModel(), defaultModelPolicy(), ModelEditField, ModelManagerService, Injectable, ModelPromptResult, ModelPromptService (+9 more)

### Community 6 - "health.service.ts"
Cohesion: 0.17
Nodes (11): cacheEnabledGatewayConfig, FIXED_VECTOR, initService(), TEST_CLIENT_ID, UNKNOWN_CLIENT_ID, StreamCleanupInterceptor, Injectable, createMockResponseCacheService() (+3 more)

### Community 7 - "provider-manager.service.ts"
Cohesion: 0.20
Nodes (21): RequestIdMiddleware, Injectable, createRequestId(), isAttemptNumber(), isBaseUrl(), isCacheTtlSeconds(), isConversationId(), isFiniteNumber() (+13 more)

### Community 8 - "responses.adapter.ts"
Cohesion: 0.18
Nodes (16): asToolCallId(), buildResponsesCreateParams(), mapGatewayMetadataToOpenAi(), mapAssistantTurnToResponsesInput(), mapTurnsToResponsesInput(), CALL_1, extractResponsesToolCalls(), mapResponsesStopReason() (+8 more)

### Community 9 - "openai-stream.mapper.ts"
Cohesion: 0.25
Nodes (13): OPENAI_STREAM_API_DESCRIPTION, mapChatResponseToOpenAi(), mapFinishReasontoOpenAI(), mapGatewayToolCallsToOpenAi(), mapSystemFingerprintToOpenAi(), toOpenAiCompletionId(), baseChunkFields(), buildToolCallsDelta() (+5 more)

### Community 10 - "asProviderInstanceId"
Cohesion: 0.19
Nodes (6): KeyGenerateCommand, Command, Option, ClientId, Express, Request

### Community 11 - ".error"
Cohesion: 0.20
Nodes (5): exitWithAgentReport(), resolveCliMode(), WizardState, Injectable, WizardStateManager

### Community 12 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.09
Nodes (29): asCostUsd(), CostUsd, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext() (+21 more)

### Community 13 - "anthropic-tools.mapper.ts"
Cohesion: 0.08
Nodes (22): Header, initService(), createMockConfigService(), initService(), ActiveStreamsTracker, OTHER_CLIENT, TEST_CLIENT, Injectable (+14 more)

### Community 14 - "ai-provider.interface.ts"
Cohesion: 0.09
Nodes (42): CachedChatResponseWithConversation, ChatResponseData, toChatResponseDto(), toChatResponseDtoFromCache(), ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional (+34 more)

### Community 15 - "provider-input.ts"
Cohesion: 0.08
Nodes (11): ConfigGeneratorService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, FileManagerService, Injectable, generateEnvTemplate() (+3 more)

### Community 16 - "ModelAlias"
Cohesion: 0.27
Nodes (10): buildAppConfiguration(), BuildEffectiveGatewayConfigOptions, buildGatewayKeyRuntime(), readRequiredPrompt(), stripHtmlComments(), tryReadOptionalPrompts(), loadGatewayConfigFromFile(), GatewayParamsBoundConfig (+2 more)

### Community 17 - "test-constants.ts"
Cohesion: 0.10
Nodes (14): Inject, SemanticCacheService, Inject, Injectable, Optional, Inject, Optional, LoggingService (+6 more)

### Community 18 - "asClientId"
Cohesion: 0.13
Nodes (13): ChatController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, ApiSecurity, ApiTags (+5 more)

### Community 19 - "swagger.setup.ts"
Cohesion: 0.09
Nodes (33): IsNotEmpty, ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsString, MaxLength (+25 more)

### Community 20 - "provider-error.mapper.ts"
Cohesion: 0.16
Nodes (21): ApiErrorCode, ApiErrorPayload, MappedProviderError, isAuthError(), isClientError(), isInvalidRequestStatus(), isProviderRateLimitError(), isRateLimitStatus() (+13 more)

### Community 21 - "GatewayKey"
Cohesion: 0.12
Nodes (23): mapProviderResponseToAiObservation(), TEST_INPUT_TOKENS, asInputTokens(), asOutputTokens(), buildGenerationConfig(), createGoogleProvider(), mapStopSequences(), mapThinkingBudgetToGeminiLevel() (+15 more)

### Community 22 - "integrations.md"
Cohesion: 0.19
Nodes (27): get, get, get, get, get, get, get, get (+19 more)

### Community 23 - "config-generator.service.ts"
Cohesion: 0.13
Nodes (9): PendingSecretsItem, EnvPatchService, Injectable, ProviderManagerService, Injectable, ApplyMutationResult, EditProviderInput, RemoveProviderInput (+1 more)

### Community 24 - "KeyGenerateCommand"
Cohesion: 0.17
Nodes (16): assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField(), NON_FUZZABLE_OBJECT_KEYS, VALID_USER_MESSAGE (+8 more)

### Community 25 - "openai-params-provider.mapper.ts"
Cohesion: 0.24
Nodes (13): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asWarningCode(), isOpenAiEffortLevel(), isOpenAiReasoningRequested(), mapThinkingBudgetToEffort(), mapThinkingToChatCompletion() (+5 more)

### Community 26 - "app-configuration.types.ts"
Cohesion: 0.09
Nodes (19): NoOpCacheBackend, Injectable, NoopCacheModule, Module, CacheModuleOptions, CACHE_BACKEND, CacheBackend, ResponseCacheService (+11 more)

### Community 27 - "model-manager.service.ts"
Cohesion: 0.18
Nodes (4): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppTokenUsage

### Community 28 - "provider-registry.service.ts"
Cohesion: 0.07
Nodes (32): IsPrimitiveMetadataRecord, Matches, toCachedChatResponse(), lastUserMessageText(), SemanticStoreEmbedState, ChatService, Injectable, ChatRequestDto (+24 more)

### Community 29 - "provider-instances.bootstrap.ts"
Cohesion: 0.13
Nodes (22): initService(), createMockLoggingService(), CreateNoOpCacheBackend(), GatewayProviderInstanceConfig, assertOpenAiProviderType(), createAnthropicProvider(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore() (+14 more)

### Community 30 - "branded.types.ts"
Cohesion: 0.10
Nodes (30): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), assertNoFallbackCycle(), alias1, fallback, myModel (+22 more)

### Community 31 - "anthropic-messages.controller.ts"
Cohesion: 0.23
Nodes (9): ApiAnthropicErrorResponses(), ApiRequestIdHeader(), AnthropicErrorBodyDto, AnthropicErrorResponseDto, ApiProperty, AnthropicModelDto, AnthropicModelsListResponseDto, ApiProperty (+1 more)

### Community 32 - "Deployment — AI Provider Gateway"
Cohesion: 0.04
Nodes (45): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network (`ai-gateway-network`), 5. Deploy (local Compose), 6. Verification, Adding a gateway client, Adding a model alias (+37 more)

### Community 33 - "getAppConfig"
Cohesion: 0.39
Nodes (3): ClientEditCommand, Command, Option

### Community 34 - "asEnvRef"
Cohesion: 0.21
Nodes (10): ChatModule, Module, AnthropicModule, Module, IntegrationsModule, Module, OpenAiModule, Module (+2 more)

### Community 35 - "AppMetricsService"
Cohesion: 0.11
Nodes (12): HealthLivenessResponseDto, ApiProperty, HealthReadinessResponseDto, HealthController, ApiOkResponse, ApiOperation, ApiRequestIdHeader, ApiTags (+4 more)

### Community 36 - "app-metrics.service.ts"
Cohesion: 0.11
Nodes (24): mockExecutorChatSuccess(), mockStreamExecutorSuccess(), clamp(), isOverrideKey(), resolveProviderCallOptions(), ChatProviderCallService, createMockStreamResult(), textStream() (+16 more)

### Community 37 - "create-openai-integration-app.ts"
Cohesion: 0.17
Nodes (22): CliAiModel, CliAiProvider, CliRateLimit, WizardRunResult, ClientCli, EnvTemplateInput, ProviderCli, ConfigTemplateInput (+14 more)

### Community 38 - "testing.md"
Cohesion: 0.12
Nodes (22): AppModule, Module, CacheModule, Module, bootstrap(), ProviderInstancesBootstrap, Injectable, ProviderRegistryModule (+14 more)

### Community 39 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.12
Nodes (19): OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 40 - ".createMessage"
Cohesion: 0.09
Nodes (26): TEST_CACHE_KEY, TEST_CACHE_TTL_CUSTOM, TEST_CACHED_CONVERSATION_ID, TEST_CACHED_REQUEST_ID, TEST_CACHED_RESPONSE_ID, TEST_COST_USD, TEST_FALLBACK_MODEL_ALIAS, TEST_INPUT_TOKENS_SMALL (+18 more)

### Community 41 - "create-e2e-app.ts"
Cohesion: 0.20
Nodes (15): asSystemFingerprint(), ChatCompletionsAdapterOptions, accumulateOpenAiStreamToolCallDeltas(), extractOpenAiStreamDeltaText(), finalizeOpenAiStreamToolCalls(), OpenAiStreamToolCallAccumulator, ChatCompletionMessageToolCall, ChatCompletionTool (+7 more)

### Community 42 - ".streamChat"
Cohesion: 0.22
Nodes (12): ToolCallId, AssistantChatMessage, ProviderAssistantTurn, ProviderChatTurn, ProviderToolDefinition, ProviderToolResultTurn, UserChatMessage, ChatCompletionMessageParam (+4 more)

### Community 43 - "AppMetricsBackend"
Cohesion: 0.17
Nodes (11): ApiHeader, ApiAnthropicErrorResponses, ApiBody, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body (+3 more)

### Community 44 - "create-openai-integration-app.ts"
Cohesion: 0.14
Nodes (14): CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema, convertClient(), convertProvider(), GatewayClientSchema, parseWizardState(), WizardStateSchema (+6 more)

### Community 45 - "logging.service.ts"
Cohesion: 0.06
Nodes (27): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, NoopErrorReportingAdapter, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable (+19 more)

### Community 46 - "LoggingService"
Cohesion: 0.09
Nodes (15): OllamaEmbeddingAdapter, Injectable, EmbeddingBackend, EmbeddingCircuitBreaker, embeddingProbeTimeoutMs(), SemanticCacheModule, Module, EMBED_NOT_ATTEMPTED (+7 more)

### Community 47 - "GatewayModelsCatalogService"
Cohesion: 0.17
Nodes (13): ApiGatewayModelsErrorResponses, ModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 49 - "app.module.ts"
Cohesion: 0.21
Nodes (7): DEFAULT_HTTP_STATUS_TO_CODE, GlobalExceptionFilter, isPayloadTooLargeError(), PayloadTooLargeError, RequestWithId, Catch, Injectable

### Community 50 - ".getOne"
Cohesion: 0.14
Nodes (11): RedisCacheAdapter, Injectable, RedisCacheModule, Module, RedisConnectionService, Injectable, CacheRegistryService, Injectable (+3 more)

### Community 51 - "openai-models.controller.ts"
Cohesion: 0.17
Nodes (11): mapGatewayModelsListToAnthropic(), mapGatewayModelToAnthropic(), toDisplayName(), GatewayModelCapabilitiesDto, GatewayModelDto, ApiProperty, ApiPropertyOptional, ModelsListResponseDto (+3 more)

### Community 52 - "Gateway CLI — documentation"
Cohesion: 0.05
Nodes (43): Agent examples, Agent mode (`config:init --agent`), `AgentReport` (stdout with `--json`), Answers contract, Boilerplate configuration and commands, CLI layer — summary, CLI scope, Commands — clients (+35 more)

### Community 53 - "RequestIdMiddleware"
Cohesion: 0.29
Nodes (6): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 54 - "PrometheusService"
Cohesion: 0.08
Nodes (6): ProviderTestOptions, AddModelInput, ModelAlias, ProviderInstanceId, AppMetricsBackend, TokenDirection

### Community 55 - "anthropic-response.mapper.ts"
Cohesion: 0.13
Nodes (25): SseDoneEvent, fromGatewayToolCallDto(), asMessageId(), MessageId, AnthropicContentBlock, AnthropicContentBlockDto, AnthropicMessagesResponseDto, AnthropicMessagesUsageDto (+17 more)

### Community 56 - "AnthropicMessagesRequestDto"
Cohesion: 0.13
Nodes (19): AnthropicMessagesRequestDto, AnthropicThinkingDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 57 - "API documentation — AI Provider Gateway"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation â AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 58 - "deployment.md"
Cohesion: 0.09
Nodes (38): content, description, content, description, content, description, content, description (+30 more)

### Community 59 - "ConsoleLoggerAdapter"
Cohesion: 0.16
Nodes (9): readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey(), requireClientGatewayKey(), resolveClientIdFromKey(), GatewayKey, ResolvedGatewayClient, getAppConfig() (+1 more)

### Community 60 - "ErrorReportingBackend"
Cohesion: 0.11
Nodes (22): buildDefaultConfigSnapshot(), ConfigFlat, ConfigRoot, createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), getByPath(), Nullable, TestCacheConfigOptions (+14 more)

### Community 61 - "project.structure.md"
Cohesion: 0.29
Nodes (9): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthReadinessChecksDto, ApiProperty, ApiPropertyOptional, HealthRedisCheckItemDto, ApiProperty (+1 more)

### Community 62 - "openai-request.mapper.ts"
Cohesion: 0.24
Nodes (10): assertEnabledProviderSecretsPresent(), assertMasterKeyPresent(), configurationValidation, ConfigurationValidationService, validateEnvironment(), assertEnabledProviderApiKeysPresent(), collectMissingEnabledProviderApiKeyErrors(), formatMissingProviderApiKeyError() (+2 more)

### Community 63 - "logging.module.ts"
Cohesion: 0.20
Nodes (3): PrometheusService, Injectable, PrometheusMetrics

### Community 64 - "ChatParamsDto"
Cohesion: 0.10
Nodes (19): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+11 more)

### Community 65 - "GlobalExceptionFilter"
Cohesion: 0.12
Nodes (36): closeE2eApp(), CreateE2eAppOptions, E2eAppContext, withE2eApp(), createAnthropicRequestBody(), E2E_ANTHROPIC_USER_MESSAGE, E2E_GATEWAY_KEY, E2E_INVALID_GATEWAY_KEY (+28 more)

### Community 66 - "EnvironmentVariables"
Cohesion: 0.11
Nodes (14): CACHE_BACKEND_TYPE, CACHE_BACKEND_VALUES, EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNumber, IsOptional (+6 more)

### Community 67 - "health.service.spec.ts"
Cohesion: 0.14
Nodes (14): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+6 more)

### Community 68 - "OpenAiBearerAuthGuard"
Cohesion: 0.13
Nodes (12): HealthModule, Module, AppMetricsModule, Global, Module, ObservabilityModule, Global, Module (+4 more)

### Community 69 - ".completions"
Cohesion: 0.09
Nodes (28): createStreamRequest(), GatewayKeyAndSmartRateLimit(), MockConfigServiceOptions, createMockContext(), createMockExpressRequest(), createMockExpressResponse(), TEST_GATEWAY_KEY_BRANDED, TEST_REQUEST_ID (+20 more)

### Community 70 - "anthropic-stream.mapper.ts"
Cohesion: 0.17
Nodes (13): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+5 more)

### Community 71 - "PinoLoggerAdapter"
Cohesion: 0.08
Nodes (21): ChatStreamController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+13 more)

### Community 72 - "chat-provider-call.service.ts"
Cohesion: 0.19
Nodes (13): DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, buildDefaultModelCapabilities(), buildDefaultModelPolicy(), getMaxOutputTokensBound(), SAMPLING_OVERRIDE_KEYS (+5 more)

### Community 73 - "main.ts"
Cohesion: 0.17
Nodes (14): resolveGateway(), createEmptyTestGatewayConfig(), createTestGatewayConfig(), CreateTestGatewayConfigOptions, defaultGatewayConfig(), GatewayModelOverrides, mergeModels(), mergeProviders() (+6 more)

### Community 74 - "wizard-state.schema.ts"
Cohesion: 0.12
Nodes (15): OpenAiChatCompletionsController, ApiBody, ApiOpenAiErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+7 more)

### Community 75 - "anthropic-thinking.mapper.ts"
Cohesion: 0.09
Nodes (30): toHttpException(), asPromptCacheCreationTokens(), asPromptCacheHitTokens(), ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort() (+22 more)

### Community 76 - "generation-warnings.ts"
Cohesion: 0.12
Nodes (16): components, securitySchemes, description, in, name, type, info, contact (+8 more)

### Community 77 - "SentryErrorReportingAdapter"
Cohesion: 0.35
Nodes (10): getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromConfig(), isRedisRequiredFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement(), shouldConnectRedis() (+2 more)

### Community 78 - "Brand types — developer guide"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 79 - "WizardOrchestratorService"
Cohesion: 0.22
Nodes (12): asJsonSchemaName(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions(), mapResponseFormatToChatCompletion(), mapResponseFormatToResponses(), mapStopSequences(), OpenAiSharedChatCompletionParams (+4 more)

### Community 80 - "anthropic-tools.mapper.ts"
Cohesion: 0.27
Nodes (10): ApiOpenAiErrorResponses(), OpenAiErrorBodyDto, OpenAiErrorResponseDto, ApiProperty, ApiPropertyOptional, OpenAiModelDto, OpenAiModelsListResponseDto, ApiProperty (+2 more)

### Community 82 - "post"
Cohesion: 0.30
Nodes (15): post, post, post, post, /api/v1/chat/stream, /api/v1/openai/chat/completions, description, operationId (+7 more)

### Community 84 - "asRateLimitBurst"
Cohesion: 0.17
Nodes (13): OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 85 - "chat-cache-guard.service.spec.ts"
Cohesion: 0.29
Nodes (6): collectInactiveProviderWarnings(), formatZodIssues(), expectEnvRef(), validateGatewayConfig(), ValidationOptions, buildEffectiveGatewayConfig()

### Community 89 - "ConfigInitCommand"
Cohesion: 0.12
Nodes (10): ConfigInitCommand, Command, Option, ConfigValidateCommand, Command, Option, CliGatewayValidatorService, CliValidateOptions (+2 more)

### Community 90 - "anthropic-tools.mapper.ts"
Cohesion: 0.42
Nodes (6): mapAnthropicRequestToGateway(), AnthropicTool, mapAnthropicContentBlockToGateway(), mapAnthropicToolChoice(), mapAnthropicToolsToGateway(), TEST_TOOL

### Community 91 - "ChatResponseDto"
Cohesion: 0.22
Nodes (3): HttpMetricsMiddleware, Injectable, HttpMethod

### Community 92 - "ProviderAddCommand"
Cohesion: 0.36
Nodes (3): ProviderAddCommand, Command, Option

### Community 93 - "openai-chat-completion-response.dto.ts"
Cohesion: 0.09
Nodes (39): collectPendingSecrets(), WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, InitAnswers, EnvPatchValue, KeyPromptService, Injectable (+31 more)

### Community 94 - "OpenAiChatMessageDto"
Cohesion: 0.14
Nodes (13): IsStringOrArrayOfStrings(), OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString (+5 more)

### Community 95 - "ClientAddCommand"
Cohesion: 0.39
Nodes (3): ClientAddCommand, Command, Option

### Community 96 - "ClientEditCommand"
Cohesion: 0.31
Nodes (7): TEST_TOOL_CALL_ID, mapOpenAiMessagesToGateway(), mapOpenAiToolCalls(), mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice(), mapOpenAiToolsToGateway(), OpenAiFunctionTool

### Community 97 - "ClientRemoveCommand"
Cohesion: 0.39
Nodes (3): ClientRemoveCommand, Command, Option

### Community 98 - "ModelAddCommand"
Cohesion: 0.39
Nodes (3): ModelAddCommand, Command, Option

### Community 99 - "ModelEditCommand"
Cohesion: 0.20
Nodes (5): ProviderTestCommand, Command, Option, ProviderTestService, Injectable

### Community 100 - "ModelRemoveCommand"
Cohesion: 0.39
Nodes (3): ModelRemoveCommand, Command, Option

### Community 101 - "ProviderEditCommand"
Cohesion: 0.39
Nodes (3): ProviderEditCommand, Command, Option

### Community 102 - "ProviderRemoveCommand"
Cohesion: 0.40
Nodes (3): ConfigSecretsStatusCommand, Command, Option

### Community 103 - "config-validator.ts"
Cohesion: 0.39
Nodes (8): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional

### Community 104 - "logging.service.spec.ts"
Cohesion: 0.43
Nodes (6): getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT, createConversationId(), asConversationId()

### Community 105 - "semantic-cache.tokens.ts"
Cohesion: 0.11
Nodes (24): assertInteractiveAllowed(), convertRateLimit(), ClientManagerService, Injectable, KeyGeneratorService, Injectable, ClientBasicAnswers, ClientPromptResult (+16 more)

### Community 106 - "instrument.ts"
Cohesion: 0.39
Nodes (3): ModelEditCommand, Command, Option

### Community 107 - "openai-exception.filter.ts"
Cohesion: 0.39
Nodes (3): ProviderRemoveCommand, Command, Option

### Community 108 - "NoopErrorReportingAdapter"
Cohesion: 0.39
Nodes (5): ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional

### Community 125 - "createMockConfigService.ts"
Cohesion: 0.43
Nodes (6): assertEnabledProviderBaseUrlPresent(), collectMissingBaseUrlErrors(), formatMissingBaseUrlError(), MissingProviderBaseUrl, RawGatewayConfig, resolveBaseUrlFromEnv()

### Community 128 - "Anthropic Messages API integration (Claude Code)"
Cohesion: 0.10
Nodes (21): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+13 more)

### Community 129 - "isRetryableHttpError"
Cohesion: 0.33
Nodes (6): ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString

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
Cohesion: 0.33
Nodes (5): AnthropicMessagesController, AnthropicAuth, ApiSecurity, ApiTags, Controller

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
- **533 isolated node(s):** `$schema`, `openapi`, `description`, `required`, `schema` (+528 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LoggingService` connect `test-constants.ts` to `create-integration-app.ts`, `api-error.code.ts`, `health.service.ts`, `responses.adapter.ts`, `anthropic-tools.mapper.ts`, `ai-provider.interface.ts`, `GatewayKey`, `app-configuration.types.ts`, `provider-registry.service.ts`, `provider-instances.bootstrap.ts`, `branded.types.ts`, `AppMetricsService`, `app-metrics.service.ts`, `create-openai-integration-app.ts`, `testing.md`, `create-e2e-app.ts`, `logging.service.ts`, `LoggingService`, `app.module.ts`, `.getOne`, `GlobalExceptionFilter`, `main.ts`, `anthropic-thinking.mapper.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `GatewayConfig` connect `config-generator.service.ts` to `create-integration-app.ts`, `cli.module.ts`, `brand-types.md`, `ClientId`, `.error`, `provider-input.ts`, `ModelAlias`, `provider-registry.service.ts`, `app-metrics.service.ts`, `openai-models.controller.ts`, `ErrorReportingBackend`, `openai-request.mapper.ts`, `chat-provider-call.service.ts`, `main.ts`, `chat-cache-guard.service.spec.ts`, `ConfigInitCommand`, `openai-chat-completion-response.dto.ts`, `ModelEditCommand`, `semantic-cache.tokens.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `ChatRequestDto` connect `provider-registry.service.ts` to `ChatParamsDto`, `ClientEditCommand`, `api-error.code.ts`, `app-metrics.service.ts`, `anthropic-tools.mapper.ts`, `health.service.ts`, `PinoLoggerAdapter`, `logging.service.spec.ts`, `LoggingService`, `ai-provider.interface.ts`, `asClientId`, `swagger.setup.ts`, `app-configuration.types.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `LoggingService` (e.g. with `initService()` and `initService()`) actually correct?**
  _`LoggingService` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `openapi`, `description` to the rest of the system?**
  _535 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `create-integration-app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05601194921583271 - nodes in this community are weakly interconnected._
- **Should `cli.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0566880217433508 - nodes in this community are weakly interconnected._