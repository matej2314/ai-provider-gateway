# Graph Report - ai-provider-gateway  (2026-08-29)

## Corpus Check
- 552 files · ~228,685 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3226 nodes · 10837 edges · 158 communities (126 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 132 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2422a94e`
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
- ResponseCacheService
- chat-provider-call.service.spec.ts
- mock-configuration.ts
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
- provider-base-url.validation.ts
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
1. `LoggingService` - 120 edges
2. `asProviderInstanceId()` - 107 edges
3. `ModelAlias` - 93 edges
4. `ProviderInstanceId` - 81 edges
5. `GatewayConfig` - 73 edges
6. `asModelAlias()` - 69 edges
7. `GatewayKey` - 65 edges
8. `asEnvRef()` - 65 edges
9. `ApiErrorCode` - 63 edges
10. `AppMetricsService` - 60 edges

## Surprising Connections (you probably didn't know these)
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts
- `createOpenAiIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-openai-integration-app.ts → src/app.module.ts
- `createE2eAppWithCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eAppWithSemanticCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-semantic-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eAppWithStreamCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-stream-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts

## Import Cycles
- 4-file cycle: `src/cache/should-include-redis-stack.ts -> src/config/typed-config.ts -> src/config/app-configuration.types.ts -> src/config/configuration.ts -> src/cache/should-include-redis-stack.ts`

## Communities (158 total, 32 thin omitted)

### Community 0 - "create-integration-app.ts"
Cohesion: 0.11
Nodes (35): DEFAULT_MODELS, CliAiProvider, GatewayClient, ModelPromptResult, ProviderPromptResult, ClientCli, ProviderCli, AddClientInput (+27 more)

### Community 1 - "cli.module.ts"
Cohesion: 0.05
Nodes (62): AgentReport, AgentReportStatus, exitCodeForReport(), PendingSecretsItem, loadAnswers(), collectPendingSecrets(), assertAgentHasAnswers(), CliMode (+54 more)

### Community 2 - "GatewayConfig"
Cohesion: 0.09
Nodes (25): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+17 more)

### Community 3 - "api-error.code.ts"
Cohesion: 0.13
Nodes (7): AppProviderStreamScope, AppRequestLabels, AppRequestMethod, AppRequestStatus, HealthMetricsSnapshot, RateLimitReason, SemanticCacheLookupResult

### Community 4 - "brand-types.md"
Cohesion: 0.33
Nodes (5): AnthropicMessagesController, AnthropicAuth, ApiSecurity, ApiTags, Controller

### Community 5 - "ClientId"
Cohesion: 0.10
Nodes (35): escapeRedisSearchTag(), isRedisSearchTagSafeId(), CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema, convertClient(), convertModel(), convertProvider() (+27 more)

### Community 6 - "health.service.ts"
Cohesion: 0.10
Nodes (26): ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic(), resolveAnthropicOutputConfig(), ContentBlockParam (+18 more)

### Community 7 - "provider-manager.service.ts"
Cohesion: 0.12
Nodes (35): AppModule, Module, CACHE_BACKEND, bootstrap(), FACTORIES, ProviderInstancesBootstrap, Injectable, ProviderRegistryModule (+27 more)

### Community 8 - "responses.adapter.ts"
Cohesion: 0.12
Nodes (12): emitAgentReport(), exitWithAgentReport(), resolveCliMode(), toSafeClientList(), toSafeConfigSnapshot(), toSafeModelList(), toSafeProviderList(), ProviderTestCommand (+4 more)

### Community 9 - "openai-stream.mapper.ts"
Cohesion: 0.10
Nodes (15): ConfigValidateCommand, Command, Option, CliGatewayValidatorService, Injectable, ConfigGeneratorService, Injectable, FileManagerService (+7 more)

### Community 10 - "asProviderInstanceId"
Cohesion: 0.33
Nodes (3): KeyGenerateCommand, Command, Option

### Community 11 - ".error"
Cohesion: 0.11
Nodes (21): SemanticStoreEmbedState, ChatService, Injectable, isCachedChatAllowedForModelAlias(), shouldStoreChatResponse(), TEST_CLIENT_ID, toChatCacheIdentity(), isToolingRequest() (+13 more)

### Community 12 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.08
Nodes (32): CostUsd, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext(), buildGenAiChatSpanAttributes() (+24 more)

### Community 13 - "anthropic-tools.mapper.ts"
Cohesion: 0.12
Nodes (12): Header, Inject, APP_METRICS_BACKEND, MetricsController, ApiOperation, ApiResponse, ApiTags, Controller (+4 more)

### Community 14 - "ai-provider.interface.ts"
Cohesion: 0.12
Nodes (30): CachedChatResponse, CachedChatWarning, CachedFinishReason, ChatCacheSource, ChatResponseData, ChatWarningDto, ApiProperty, ApiPropertyOptional (+22 more)

### Community 15 - "provider-input.ts"
Cohesion: 0.08
Nodes (26): IsPrimitiveMetadataRecord, Matches, ChatRequestDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray (+18 more)

### Community 16 - "ModelAlias"
Cohesion: 0.20
Nodes (13): CliValidateOptions, collectInactiveProviderWarnings(), formatZodIssues(), validateGatewayConfig(), ValidationOptions, ValidationResult, buildEffectiveGatewayConfig(), assertEnabledProviderSecretsPresent() (+5 more)

### Community 17 - "test-constants.ts"
Cohesion: 0.12
Nodes (15): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+7 more)

### Community 18 - "asClientId"
Cohesion: 0.06
Nodes (28): RedisConnectionService, createService(), MockRedis, mockRedisInstances, Injectable, Inject, createAdapter(), initAdapter() (+20 more)

### Community 19 - "swagger.setup.ts"
Cohesion: 0.08
Nodes (15): assertInteractiveAllowed(), ClientManagerService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, EnvPatchService, Injectable (+7 more)

### Community 20 - "provider-error.mapper.ts"
Cohesion: 0.15
Nodes (22): ApiErrorPayload, MappedProviderError, isAuthError(), isClientError(), isInvalidRequestStatus(), isProviderRateLimitError(), isRateLimitStatus(), isServerError() (+14 more)

### Community 21 - "GatewayKey"
Cohesion: 0.25
Nodes (7): AppMetricsModule, Global, Module, RATE_LIMIT_MODULE_OPTIONS, RateLimitModule, RateLimitModuleOptions, Module

### Community 22 - "integrations.md"
Cohesion: 0.19
Nodes (27): get, get, get, get, get, get, get, get (+19 more)

### Community 23 - "config-generator.service.ts"
Cohesion: 0.09
Nodes (26): WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, InitAnswers, WizardState, ClientPromptService, Injectable, KeyPromptService (+18 more)

### Community 24 - "KeyGenerateCommand"
Cohesion: 0.16
Nodes (17): ChatWarningSchema, FinishReasonSchema, asCostUsd(), asMessageId(), asPromptCacheCreationTokens(), asPromptCacheHitTokens(), MessageId, PromptCacheCreationTokens (+9 more)

### Community 25 - "openai-params-provider.mapper.ts"
Cohesion: 0.22
Nodes (14): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asWarningCode(), ChatCompletionThinkingParam, isOpenAiEffortLevel(), isOpenAiReasoningRequested(), mapThinkingBudgetToEffort() (+6 more)

### Community 26 - "app-configuration.types.ts"
Cohesion: 0.09
Nodes (22): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+14 more)

### Community 27 - "model-manager.service.ts"
Cohesion: 0.16
Nodes (4): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppTokenUsage

### Community 28 - "provider-registry.service.ts"
Cohesion: 0.15
Nodes (16): JsonSchemaName, ToolCallId, AssistantChatMessage, ProviderAssistantTurn, ProviderChatInput, ProviderChatTurn, ProviderToolResultTurn, UserChatMessage (+8 more)

### Community 29 - "provider-instances.bootstrap.ts"
Cohesion: 0.12
Nodes (23): ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, SseDoneEvent, AnthropicContentBlock (+15 more)

### Community 30 - "branded.types.ts"
Cohesion: 0.06
Nodes (53): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), assertNoFallbackCycle(), alias1, fallback, myModel (+45 more)

### Community 31 - "anthropic-messages.controller.ts"
Cohesion: 0.09
Nodes (36): computeSystemSignature(), OTHER_CLIENT_ID, TEST_CLIENT_ID, validReplyJson, cachedReply, FIXED_VECTOR, TEST_CLIENT_ID, cacheEnabledGatewayConfig (+28 more)

### Community 32 - "Deployment — AI Provider Gateway"
Cohesion: 0.04
Nodes (46): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network (`ai-gateway-network`), 5. Deploy (local Compose), 6. Verification, Adding a gateway client, Adding a model alias (+38 more)

### Community 33 - "getAppConfig"
Cohesion: 0.21
Nodes (7): DEFAULT_HTTP_STATUS_TO_CODE, GlobalExceptionFilter, isPayloadTooLargeError(), PayloadTooLargeError, RequestWithId, Catch, Injectable

### Community 34 - "asEnvRef"
Cohesion: 0.15
Nodes (8): EmbeddingCircuitBreaker, normalizeEmbeddingModelForIndex(), semanticIndexName(), SemanticIndexNameOptions, canonicalSemanticSchema(), embeddingProbeTimeoutMs(), SEMANTIC_SCHEMA_TAG_FIELDS, semanticSchemaFtCreateArgs()

### Community 35 - "AppMetricsService"
Cohesion: 0.08
Nodes (21): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthReadinessChecksDto, HealthReadinessResponseDto, ApiProperty, ApiPropertyOptional, HealthRedisCheckItemDto (+13 more)

### Community 36 - "app-metrics.service.ts"
Cohesion: 0.27
Nodes (5): StreamCleanupInterceptor, Injectable, readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey()

### Community 37 - "create-openai-integration-app.ts"
Cohesion: 0.07
Nodes (8): ProviderTestOptions, CliAiModel, ModelAlias, ProviderInstanceId, NoopAppMetricsAdapter, Injectable, AppMetricsBackend, TokenDirection

### Community 38 - "testing.md"
Cohesion: 0.11
Nodes (19): ConfigFlat, ConfigRoot, getByPath(), Nullable, resolveGateway(), TestCacheConfigOptions, TestGatewayKeyRuntimeOptions, TestRateLimitConfigOptions (+11 more)

### Community 39 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.11
Nodes (24): IsNotEmpty, ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsString, MaxLength (+16 more)

### Community 40 - ".createMessage"
Cohesion: 0.20
Nodes (14): ChatCompletionsAdapterOptions, accumulateOpenAiStreamToolCallDeltas(), extractOpenAiStreamDeltaText(), finalizeOpenAiStreamToolCalls(), OpenAiStreamToolCallAccumulator, ChatCompletionMessageToolCall, ChatCompletionTool, mapOpenAiFinishReason() (+6 more)

### Community 41 - "create-e2e-app.ts"
Cohesion: 0.14
Nodes (14): ChatOutputTextDto, ApiProperty, ChatUsageDto, ApiPropertyOptional, SseDeltaPayloadDto, ApiProperty, HealthLivenessResponseDto, ApiProperty (+6 more)

### Community 42 - ".streamChat"
Cohesion: 0.12
Nodes (16): UnsupportedProviderException, createEmptyTestGatewayConfig(), createTestGatewayConfig(), CreateTestGatewayConfigOptions, defaultGatewayConfig(), GatewayModelOverrides, mergeModels(), mergeProviders() (+8 more)

### Community 43 - "AppMetricsBackend"
Cohesion: 0.07
Nodes (32): IsStringOrArrayOfStrings(), OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray (+24 more)

### Community 44 - "create-openai-integration-app.ts"
Cohesion: 0.15
Nodes (24): ProviderRegistryService, Injectable, joinedDeltaText(), ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), joinedDeltaText(), closeIntegrationApp() (+16 more)

### Community 45 - "logging.service.ts"
Cohesion: 0.17
Nodes (14): ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional, mapGatewayModelsListToAnthropic(), mapGatewayModelToAnthropic(), toDisplayName() (+6 more)

### Community 46 - "LoggingService"
Cohesion: 0.07
Nodes (26): OllamaEmbeddingAdapter, Injectable, EmbeddingBackend, EMBED_NOT_ATTEMPTED, SemanticCacheService, SemanticLookupResult, Injectable, EMBEDDING_BACKEND (+18 more)

### Community 47 - "GatewayModelsCatalogService"
Cohesion: 0.36
Nodes (10): getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromEnv(), isSemanticCacheEnabledFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement(), shouldConnectRedis() (+2 more)

### Community 49 - "app.module.ts"
Cohesion: 0.10
Nodes (39): alias(), TEST_INPUT_TOKENS_SMALL, TEST_MAX_ATTEMPTS, TEST_MAX_CONCURRENT_STREAMS, TEST_MODEL_ID, TEST_RATE_LIMIT_BURST, TEST_TIMEOUT_MS, OpenAiApiSurface (+31 more)

### Community 50 - ".getOne"
Cohesion: 0.11
Nodes (21): GatewayKeyAndSmartRateLimit(), resolveClientIdFromKey(), ResolvedGatewayClient, getAppConfig(), GatewayKeyGuard, initGuard(), Injectable, enrichRequestWithClientId() (+13 more)

### Community 51 - "openai-models.controller.ts"
Cohesion: 0.21
Nodes (10): ChatModule, Module, AnthropicModule, Module, IntegrationsModule, Module, OpenAiModule, Module (+2 more)

### Community 52 - "Gateway CLI — documentation"
Cohesion: 0.05
Nodes (43): Agent examples, Agent mode (`config:init --agent`), `AgentReport` (stdout with `--json`), Answers contract, Boilerplate configuration and commands, CLI layer — summary, CLI scope, Commands — clients (+35 more)

### Community 53 - "RequestIdMiddleware"
Cohesion: 0.25
Nodes (7): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Semantic cache (Redis Stack, wektory), Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 54 - "PrometheusService"
Cohesion: 0.13
Nodes (19): AnthropicMessagesRequestDto, AnthropicThinkingDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 55 - "anthropic-response.mapper.ts"
Cohesion: 0.22
Nodes (15): SseEvent, fromGatewayToolCallDto(), OPENAI_STREAM_API_DESCRIPTION, mapChatResponseToOpenAi(), mapFinishReasontoOpenAI(), mapGatewayToolCallsToOpenAi(), mapSystemFingerprintToOpenAi(), toOpenAiCompletionId() (+7 more)

### Community 56 - "AnthropicMessagesRequestDto"
Cohesion: 0.21
Nodes (13): asSemanticCacheTtlSeconds(), buildAppConfiguration(), BuildEffectiveGatewayConfigOptions, buildGatewayKeyRuntime(), readRequiredPrompt(), stripHtmlComments(), tryReadOptionalPrompts(), loadGatewayConfigFromFile() (+5 more)

### Community 57 - "API documentation — AI Provider Gateway"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation â AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 58 - "deployment.md"
Cohesion: 0.10
Nodes (35): content, description, content, description, content, description, content, description (+27 more)

### Community 59 - "ConsoleLoggerAdapter"
Cohesion: 0.16
Nodes (18): mockExecutorChatSuccess(), mockStreamExecutorSuccess(), createStreamRequest(), ChatExecutionPrep, StreamCacheDecision, StreamCacheHit, MockConfigServiceOptions, createMockContext() (+10 more)

### Community 60 - "ErrorReportingBackend"
Cohesion: 0.06
Nodes (27): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, NoopErrorReportingAdapter, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable (+19 more)

### Community 61 - "project.structure.md"
Cohesion: 0.12
Nodes (20): GatewayProviderInstanceConfig, adaptApiKeyProviderFactory(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider(), ApiKeyProviderFactoryFn, ProviderFactoryFn, AIProvider (+12 more)

### Community 62 - "openai-request.mapper.ts"
Cohesion: 0.17
Nodes (13): OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 63 - "logging.module.ts"
Cohesion: 0.15
Nodes (6): healthStatusToGaugeValue(), HealthComponent, HealthStatus, PrometheusService, Injectable, PrometheusMetrics

### Community 65 - "GlobalExceptionFilter"
Cohesion: 0.31
Nodes (3): ConfigInitCommand, Command, Option

### Community 66 - "EnvironmentVariables"
Cohesion: 0.09
Nodes (28): CreateE2eAppOptions, E2eAppContext, assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField() (+20 more)

### Community 67 - "health.service.spec.ts"
Cohesion: 0.15
Nodes (21): buildAppProviderMetricsContext(), buildLlmMetricsContext(), mapProviderResponseToAiObservation(), mapProviderResponseToUsage(), toMetricsMessages(), buildProviderInputForAlias(), resolvedPrompts, toProviderTurns() (+13 more)

### Community 68 - "OpenAiBearerAuthGuard"
Cohesion: 0.10
Nodes (15): CACHE_BACKEND_TYPE, CACHE_BACKEND_VALUES, EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNumber, IsOptional (+7 more)

### Community 69 - ".completions"
Cohesion: 0.12
Nodes (24): toCachedChatResponse(), asInputTokens(), asOutputTokens(), buildGenerationConfig(), createGoogleProvider(), mapStopSequences(), mapThinkingBudgetToGeminiLevel(), extractFromLegacyFields() (+16 more)

### Community 70 - "anthropic-stream.mapper.ts"
Cohesion: 0.16
Nodes (4): HttpMetricsMiddleware, Injectable, HttpMethod, HttpRequestLabels

### Community 71 - "PinoLoggerAdapter"
Cohesion: 0.05
Nodes (45): ApiHeader, ChatController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, ApiSecurity (+37 more)

### Community 72 - "chat-provider-call.service.ts"
Cohesion: 0.22
Nodes (15): buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext, INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED, INTEGRATION_OPENAI_MODEL_ID_BRANDED, INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED (+7 more)

### Community 73 - "main.ts"
Cohesion: 0.27
Nodes (10): ApiOpenAiErrorResponses(), OpenAiErrorBodyDto, OpenAiErrorResponseDto, ApiProperty, ApiPropertyOptional, OpenAiModelDto, OpenAiModelsListResponseDto, ApiProperty (+2 more)

### Community 74 - "wizard-state.schema.ts"
Cohesion: 0.33
Nodes (6): content, description, headers, headers, X-Gateway-Cache, 200

### Community 75 - ".createMessage"
Cohesion: 0.13
Nodes (26): asEnvRef(), asGatewayKey(), GatewayConfigSchema, gatewayConfig, loadRealGatewayConfig(), openAiCompatibleProviders, NOTE: We can't use loadGatewayConfigFromFile() because it's globally mocked, buildIntegrationConfigOptions() (+18 more)

### Community 76 - "generation-warnings.ts"
Cohesion: 0.22
Nodes (8): info, contact, description, title, version, openapi, $schema, tags

### Community 77 - "SentryErrorReportingAdapter"
Cohesion: 0.28
Nodes (10): asToolCallId(), buildResponsesCreateParams(), mapGatewayMetadataToOpenAi(), extractResponsesOutputItemToolCall(), extractResponsesStreamToolCallDone(), registerResponsesFunctionCallItemId(), accumulateResponsesReasoningDelta(), extractResponsesReasoningSummaryText() (+2 more)

### Community 78 - "Brand types — developer guide"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 79 - ".completions"
Cohesion: 0.32
Nodes (7): SseDonePayloadDto, SseDoneUsageDto, ApiPropertyOptional, IsOptional, GatewayToolCallDto, ApiProperty, IsString

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
Cohesion: 0.19
Nodes (11): GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsOptional, IsString, GatewayToolDefinitionDto, ApiProperty, ApiPropertyOptional (+3 more)

### Community 90 - "anthropic-tools.mapper.ts"
Cohesion: 0.15
Nodes (19): isUnservableCachedReply(), CachedChatResponseSchema, parseCachedChatResponse(), RedisVectorStoreAdapter, Injectable, asString(), ParsedKnnHits, parseKnnHits() (+11 more)

### Community 91 - "ClientListCommand"
Cohesion: 0.39
Nodes (3): ClientEditCommand, Command, Option

### Community 92 - "ProviderAddCommand"
Cohesion: 0.36
Nodes (3): ProviderAddCommand, Command, Option

### Community 93 - "openai-chat-completion-response.dto.ts"
Cohesion: 0.13
Nodes (23): DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, defaultModelPolicy(), ModelEditField, ModelManagerService, Injectable (+15 more)

### Community 94 - "OpenAiChatMessageDto"
Cohesion: 0.39
Nodes (3): ClientRemoveCommand, Command, Option

### Community 95 - "ConfigSecretsStatusCommand"
Cohesion: 0.39
Nodes (3): ModelAddCommand, Command, Option

### Community 96 - "logging.service.ts"
Cohesion: 0.14
Nodes (14): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+6 more)

### Community 97 - "ClientRemoveCommand"
Cohesion: 0.35
Nodes (7): ApiAnthropicErrorResponses(), AnthropicErrorBodyDto, AnthropicErrorResponseDto, ApiProperty, AnthropicModelDto, AnthropicModelsListResponseDto, ApiProperty

### Community 98 - "RequestIdMiddleware"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 99 - "ConfigShowCommand"
Cohesion: 0.39
Nodes (8): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional

### Community 100 - "ModelRemoveCommand"
Cohesion: 0.39
Nodes (3): ModelEditCommand, Command, Option

### Community 101 - "ProviderEditCommand"
Cohesion: 0.39
Nodes (3): ProviderEditCommand, Command, Option

### Community 102 - ".getLiveness"
Cohesion: 0.11
Nodes (16): ChatStreamController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+8 more)

### Community 103 - "logging.service.spec.ts"
Cohesion: 0.26
Nodes (10): mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions(), mapResponseFormatToChatCompletion(), mapResponseFormatToResponses(), mapStopSequences(), OpenAiSharedChatCompletionParams, OpenAiSharedResponsesParams (+2 more)

### Community 104 - ".getMetrics"
Cohesion: 0.39
Nodes (3): ModelRemoveCommand, Command, Option

### Community 105 - "ResponseCacheService"
Cohesion: 0.18
Nodes (9): hashCallParams(), serializeCallParamsForCache(), ResponseCacheService, Injectable, isSingleTurnUserRequest(), lastUserMessageText(), CacheIdentityMessage, ChatCacheIdentity (+1 more)

### Community 106 - "chat-provider-call.service.spec.ts"
Cohesion: 0.31
Nodes (5): createMockStreamResult(), textStream(), createMockAIProvider(), createMockProviderRegistryService(), createMockDefaultResolvedConfig()

### Community 107 - "mock-configuration.ts"
Cohesion: 0.31
Nodes (5): createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), asCacheTtlSeconds(), defaultConfiguration(), gatewayConfig

### Community 108 - "ActiveStreamsTracker"
Cohesion: 0.14
Nodes (14): CachedChatResponseWithConversation, createInProcessSingleflight(), ChatCachePipelineService, Injectable, ChatErrorHandlerService, Injectable, ChatProviderCallService, Injectable (+6 more)

### Community 125 - "provider-base-url.validation.ts"
Cohesion: 0.43
Nodes (6): assertEnabledProviderBaseUrlPresent(), collectMissingBaseUrlErrors(), formatMissingBaseUrlError(), MissingProviderBaseUrl, RawGatewayConfig, resolveBaseUrlFromEnv()

### Community 128 - "Anthropic Messages API integration (Claude Code)"
Cohesion: 0.10
Nodes (21): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+13 more)

### Community 129 - "OpenAiChatCompletionsController"
Cohesion: 0.33
Nodes (5): OpenAiChatCompletionsController, ApiSecurity, ApiTags, Controller, OpenAiAuth

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
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LoggingService` connect `asClientId` to `health.service.ts`, `provider-manager.service.ts`, `.error`, `ai-provider.interface.ts`, `provider-error.mapper.ts`, `app-configuration.types.ts`, `branded.types.ts`, `anthropic-messages.controller.ts`, `getAppConfig`, `AppMetricsService`, `.createMessage`, `create-e2e-app.ts`, `.streamChat`, `create-openai-integration-app.ts`, `LoggingService`, `ConsoleLoggerAdapter`, `ErrorReportingBackend`, `project.structure.md`, `.completions`, `chat-provider-call.service.ts`, `.createMessage`, `SentryErrorReportingAdapter`, `anthropic-tools.mapper.ts`, `ResponseCacheService`, `ActiveStreamsTracker`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `ChatRequestDto` connect `provider-input.ts` to `GatewayConfig`, `health.service.spec.ts`, `.getLiveness`, `OpenAiChatCompletionRequestDto`, `PinoLoggerAdapter`, `create-e2e-app.ts`, `chat-provider-call.service.spec.ts`, `.error`, `ActiveStreamsTracker`, `anthropic-messages.controller.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `asProviderInstanceId()` connect `openai-chat-completion-response.dto.ts` to `create-integration-app.ts`, `cli.module.ts`, `ClientId`, `provider-manager.service.ts`, `responses.adapter.ts`, `.error`, `ai-provider.interface.ts`, `test-constants.ts`, `asClientId`, `swagger.setup.ts`, `provider-error.mapper.ts`, `config-generator.service.ts`, `KeyGenerateCommand`, `branded.types.ts`, `anthropic-messages.controller.ts`, `.streamChat`, `create-openai-integration-app.ts`, `logging.service.ts`, `app.module.ts`, `anthropic-response.mapper.ts`, `AnthropicMessagesRequestDto`, `ConsoleLoggerAdapter`, `project.structure.md`, `health.service.spec.ts`, `.completions`, `chat-provider-call.service.ts`, `.createMessage`, `chat-provider-call.service.spec.ts`, `ActiveStreamsTracker`, `provider-base-url.validation.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `LoggingService` (e.g. with `createService()` and `initService()`) actually correct?**
  _`LoggingService` has 17 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `openapi`, `description` to the rest of the system?**
  _556 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `create-integration-app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11038961038961038 - nodes in this community are weakly interconnected._
- **Should `cli.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053732303732303734 - nodes in this community are weakly interconnected._