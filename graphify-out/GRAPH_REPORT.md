# Graph Report - ai-provider-gateway  (2026-08-27)

## Corpus Check
- 532 files · ~216,220 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3161 nodes · 10380 edges · 159 communities (127 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 125 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d0f2f2f`
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
- ModelAddCommand
- ConfigShowCommand
- ModelRemoveCommand
- ProviderEditCommand
- LoggerBackend
- ModelListCommand
- ProviderListCommand
- rate-limit.module.ts
- instrument.ts
- openai-exception.filter.ts
- HealthComponent
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
- ProviderTestCommand
- Provider Abstraction Layer
- Provider Secrets Validation
- Anthropic Messages API integration (Claude Code)
- config-validator.ts
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
- gateway-key.guard.branded-types.test-d.ts
- Test Pyramid Strategy
- Three Contracts One Engine
- Architecture — AI Provider Gateway
- Dictionary — AI Provider Gateway
- Testing — AI Provider Gateway
- Data flow — AI Provider Gateway
- OpenAI adapter (provider runtime)
- ClientEditCommand
- Directory and file architecture
- Documentation — AI Provider Gateway
- ollama-chat.md
- openai-chat-gpt.md

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 111 edges
2. `asProviderInstanceId()` - 101 edges
3. `ModelAlias` - 87 edges
4. `ProviderInstanceId` - 81 edges
5. `GatewayConfig` - 73 edges
6. `asEnvRef()` - 65 edges
7. `ChatRequestDto` - 64 edges
8. `asModelAlias()` - 63 edges
9. `GatewayKey` - 62 edges
10. `ApiErrorCode` - 61 edges

## Surprising Connections (you probably didn't know these)
- `createE2eApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/app.module.ts
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts
- `createOpenAiIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-openai-integration-app.ts → src/app.module.ts
- `createE2eAppWithCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eAppWithSemanticCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-semantic-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts

## Import Cycles
- 4-file cycle: `src/cache/should-include-redis-stack.ts -> src/config/typed-config.ts -> src/config/app-configuration.types.ts -> src/config/configuration.ts -> src/cache/should-include-redis-stack.ts`

## Communities (159 total, 32 thin omitted)

### Community 0 - "create-integration-app.ts"
Cohesion: 0.09
Nodes (17): PendingSecretsItem, ClientManagerService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, EnvPatchService, Injectable (+9 more)

### Community 1 - "cli.module.ts"
Cohesion: 0.05
Nodes (64): AgentReport, AgentReportStatus, exitCodeForReport(), loadAnswers(), assertAgentHasAnswers(), CliMode, CliModeFlags, markAgentRuntime() (+56 more)

### Community 2 - "GatewayConfig"
Cohesion: 0.17
Nodes (12): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+4 more)

### Community 4 - "brand-types.md"
Cohesion: 0.07
Nodes (44): IsPrimitiveMetadataRecord, Matches, SemanticStoreEmbedState, ChatService, Injectable, ChatRequestDto, ApiProperty, ApiPropertyOptional (+36 more)

### Community 5 - "ClientId"
Cohesion: 0.08
Nodes (52): assertInteractiveAllowed(), collectPendingSecrets(), DEFAULT_MODELS, WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, InitAnswers, CliAiModelSchema (+44 more)

### Community 6 - "health.service.ts"
Cohesion: 0.08
Nodes (23): normalizeEmbeddingModelForIndex(), semanticIndexName(), SemanticIndexNameOptions, canonicalSemanticSchema(), openCircuitViaLookup(), VectorStoreProbeResult, TEST_INPUT_TOKENS, TEST_OUTPUT_TOKENS_SMALL (+15 more)

### Community 7 - "provider-manager.service.ts"
Cohesion: 0.10
Nodes (28): AppModule, Module, IntegrationsModule, Module, bootstrap(), ProviderInstancesBootstrap, Injectable, ProviderRegistryModule (+20 more)

### Community 8 - "responses.adapter.ts"
Cohesion: 0.16
Nodes (10): emitAgentReport(), exitWithAgentReport(), resolveCliMode(), toSafeClientList(), toSafeProviderList(), WizardState, Injectable, WizardOrchestratorService (+2 more)

### Community 9 - "openai-stream.mapper.ts"
Cohesion: 0.09
Nodes (29): ResponseCacheService, OTHER_CLIENT_ID, TEST_CLIENT_ID, Injectable, CachedChatResponseSchema, ChatWarningSchema, parseCachedChatResponse(), VectorStoreUpsertInput (+21 more)

### Community 10 - "asProviderInstanceId"
Cohesion: 0.07
Nodes (19): ClientAddCommand, Command, Option, KeyGeneratorService, Injectable, KeyPromptService, Injectable, ProviderPromptService (+11 more)

### Community 11 - ".error"
Cohesion: 0.18
Nodes (17): buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext, INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED, INTEGRATION_OPENAI_MODEL_ID_BRANDED, INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED (+9 more)

### Community 12 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.08
Nodes (34): asCostUsd(), CostUsd, ToolCallId, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan() (+26 more)

### Community 13 - "anthropic-tools.mapper.ts"
Cohesion: 0.12
Nodes (13): Header, TEST_CLIENT, Inject, APP_METRICS_BACKEND, MetricsController, ApiOperation, ApiResponse, ApiTags (+5 more)

### Community 14 - "ai-provider.interface.ts"
Cohesion: 0.13
Nodes (30): ChatResponseData, SseMetaPayload, mapStopReasonToFinishReason(), CompleteOnceResult, StreamOnceResult, ChatResponseBuilderService, ProviderResponse, Injectable (+22 more)

### Community 15 - "provider-input.ts"
Cohesion: 0.31
Nodes (3): ConfigInitCommand, Command, Option

### Community 16 - "ModelAlias"
Cohesion: 0.28
Nodes (8): assertEnabledProviderSecretsPresent(), assertMasterKeyPresent(), configurationValidation, ConfigurationValidationService, validateEnvironment(), assertEnabledProviderApiKeysPresent(), formatMissingProviderApiKeyError(), RawGatewayConfig

### Community 17 - "test-constants.ts"
Cohesion: 0.12
Nodes (7): CACHE_BACKEND, OllamaEmbeddingAdapter, Injectable, EmbeddingBackend, Inject, VectorStore, FIXED_VECTOR

### Community 18 - "asClientId"
Cohesion: 0.13
Nodes (15): createStreamRequest(), createMockContext(), createMockExpressRequest(), createMockExpressResponse(), TEST_CONVERSATION_ID, TEST_GATEWAY_KEY_BRANDED, TEST_REQUEST_ID, asClientId() (+7 more)

### Community 19 - "swagger.setup.ts"
Cohesion: 0.09
Nodes (31): IsNotEmpty, ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsString, MaxLength (+23 more)

### Community 20 - "provider-error.mapper.ts"
Cohesion: 0.18
Nodes (18): ApiErrorPayload, MappedProviderError, isAuthError(), isClientError(), isInvalidRequestStatus(), isRateLimitStatus(), isServerError(), isTimeoutStatus() (+10 more)

### Community 21 - "GatewayKey"
Cohesion: 0.09
Nodes (28): ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic(), resolveAnthropicOutputConfig(), ContentBlockParam (+20 more)

### Community 22 - "integrations.md"
Cohesion: 0.19
Nodes (27): get, get, get, get, get, get, get, get (+19 more)

### Community 23 - "config-generator.service.ts"
Cohesion: 0.09
Nodes (42): escapeRedisSearchTag(), isRedisSearchTagSafeId(), convertRateLimit(), CliAiModel, CliAiProvider, CliRateLimit, GatewayClient, ClientBasicAnswers (+34 more)

### Community 24 - "KeyGenerateCommand"
Cohesion: 0.17
Nodes (16): assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField(), NON_FUZZABLE_OBJECT_KEYS, VALID_USER_MESSAGE (+8 more)

### Community 25 - "openai-params-provider.mapper.ts"
Cohesion: 0.12
Nodes (24): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asWarningCode(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions(), mapResponseFormatToChatCompletion() (+16 more)

### Community 26 - "app-configuration.types.ts"
Cohesion: 0.08
Nodes (16): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+8 more)

### Community 27 - "model-manager.service.ts"
Cohesion: 0.13
Nodes (8): AppProviderCallContext, AppProviderStreamScope, AppRequestMethod, AppRequestStatus, AppTokenUsage, HealthMetricsSnapshot, RateLimitReason, SemanticCacheLookupResult

### Community 28 - "provider-registry.service.ts"
Cohesion: 0.25
Nodes (7): AppMetricsModule, Global, Module, RATE_LIMIT_MODULE_OPTIONS, RateLimitModule, RateLimitModuleOptions, Module

### Community 29 - "provider-instances.bootstrap.ts"
Cohesion: 0.12
Nodes (23): createMockProviderRegistryService(), GatewayProviderInstanceConfig, adaptApiKeyProviderFactory(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider(), ApiKeyProviderFactoryFn, ProviderFactoryFn (+15 more)

### Community 30 - "branded.types.ts"
Cohesion: 0.06
Nodes (54): mockExecutorChatSuccess(), mockStreamExecutorSuccess(), getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT, buildRetryPolicyFromResolved(), ModelRetrySource (+46 more)

### Community 31 - "anthropic-messages.controller.ts"
Cohesion: 0.17
Nodes (13): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+5 more)

### Community 32 - "Deployment — AI Provider Gateway"
Cohesion: 0.04
Nodes (45): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network (`ai-gateway-network`), 5. Deploy (local Compose), 6. Verification, Adding a gateway client, Adding a model alias (+37 more)

### Community 33 - "getAppConfig"
Cohesion: 0.25
Nodes (10): readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey(), requireClientGatewayKey(), asGatewayKey(), getAppConfig(), enrichRequestWithClientId(), readAnthropicApiKey() (+2 more)

### Community 34 - "asEnvRef"
Cohesion: 0.23
Nodes (11): OpenAiModelDto, OpenAiModelsListResponseDto, ApiProperty, mapGatewayModelsListToOpenAi(), mapGatewayModelToOpenAi(), GatewayModelCapabilitiesDto, GatewayModelDto, ApiProperty (+3 more)

### Community 35 - "AppMetricsService"
Cohesion: 0.10
Nodes (14): HealthLivenessResponseDto, ApiProperty, HealthReadinessResponseDto, HealthController, ApiOkResponse, ApiOperation, ApiRequestIdHeader, ApiTags (+6 more)

### Community 36 - "app-metrics.service.ts"
Cohesion: 0.16
Nodes (9): createMockStreamResult(), textStream(), createMockAIProvider(), createMockDefaultResolvedConfig(), TEST_PROMPT_CACHE_CREATION_TOKENS, TEST_PROMPT_CACHE_HIT_TOKENS, GatewayModelConfig, ProviderRegistryService (+1 more)

### Community 37 - "create-openai-integration-app.ts"
Cohesion: 0.07
Nodes (7): ProviderTestOptions, ModelAlias, ProviderInstanceId, NoopAppMetricsAdapter, Injectable, AppMetricsBackend, TokenDirection

### Community 38 - "testing.md"
Cohesion: 0.07
Nodes (31): MockConfigServiceOptions, CreateTestGatewayConfigOptions, TEST_CACHE_KEY, TEST_CACHED_CONVERSATION_ID, TEST_COST_USD, TEST_FALLBACK_MODEL_ALIAS, TEST_MAX_ATTEMPTS, TEST_MAX_ATTEMPTS_SINGLE (+23 more)

### Community 39 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.12
Nodes (19): OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 40 - ".createMessage"
Cohesion: 0.20
Nodes (15): asSystemFingerprint(), ChatCompletionsAdapterOptions, accumulateOpenAiStreamToolCallDeltas(), extractOpenAiStreamDeltaText(), finalizeOpenAiStreamToolCalls(), OpenAiStreamToolCallAccumulator, ChatCompletionMessageToolCall, ChatCompletionTool (+7 more)

### Community 41 - "create-e2e-app.ts"
Cohesion: 0.18
Nodes (18): toCachedChatResponse(), mapProviderResponseToAiObservation(), asInputTokens(), asOutputTokens(), asToolCallId(), parseGeminiResponseWithTools(), buildResponsesCreateParams(), mapGatewayMetadataToOpenAi() (+10 more)

### Community 42 - ".streamChat"
Cohesion: 0.12
Nodes (31): asPort(), ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), buildIntegrationConfigOptions(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions (+23 more)

### Community 43 - "AppMetricsBackend"
Cohesion: 0.29
Nodes (9): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthReadinessChecksDto, ApiProperty, ApiPropertyOptional, HealthRedisCheckItemDto, ApiProperty (+1 more)

### Community 44 - "create-openai-integration-app.ts"
Cohesion: 0.14
Nodes (10): ConfigGeneratorService, Injectable, FileManagerService, Injectable, WizardRunResult, EnvTemplateInput, generateEnvTemplate(), isEnvInputRedisRequired() (+2 more)

### Community 45 - "logging.service.ts"
Cohesion: 0.06
Nodes (27): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, NoopErrorReportingAdapter, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable (+19 more)

### Community 46 - "LoggingService"
Cohesion: 0.09
Nodes (27): RedisConnectionService, Injectable, CacheRegistryService, initService(), Injectable, createAdapter(), initAdapter(), initService() (+19 more)

### Community 47 - "GatewayModelsCatalogService"
Cohesion: 0.17
Nodes (13): ApiGatewayModelsErrorResponses, ModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 49 - "app.module.ts"
Cohesion: 0.11
Nodes (16): ApiErrorCode, DEFAULT_HTTP_STATUS_TO_CODE, GlobalExceptionFilter, isPayloadTooLargeError(), PayloadTooLargeError, RequestWithId, Catch, Injectable (+8 more)

### Community 50 - ".getOne"
Cohesion: 0.10
Nodes (19): computeSystemSignature(), hashCallParams(), serializeCallParamsForCache(), EmbeddingCircuitBreaker, isSingleTurnUserRequest(), lastUserMessageText(), embeddingProbeTimeoutMs(), SEMANTIC_SCHEMA_TAG_FIELDS (+11 more)

### Community 51 - "openai-models.controller.ts"
Cohesion: 0.17
Nodes (13): OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

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
Cohesion: 0.22
Nodes (13): AnthropicContentBlock, AnthropicContentBlockDto, AnthropicMessagesResponseDto, AnthropicMessagesUsageDto, AnthropicTextContentBlockDto, AnthropicThinkingContentBlockDto, AnthropicToolUseContentBlockDto, ApiProperty (+5 more)

### Community 56 - "AnthropicMessagesRequestDto"
Cohesion: 0.14
Nodes (10): StreamCleanupInterceptor, Injectable, createMockSmartRateLimiter(), resolveClientIdFromKey(), ResolvedGatewayClient, SmartRateLimitGuard, Injectable, RateLimitResult (+2 more)

### Community 57 - "API documentation — AI Provider Gateway"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation â AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 58 - "deployment.md"
Cohesion: 0.09
Nodes (38): content, description, content, description, content, description, content, description (+30 more)

### Community 59 - "ConsoleLoggerAdapter"
Cohesion: 0.20
Nodes (9): CHAT_STREAM_API_DESCRIPTION, SseSerializer, ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ApiRequestIdHeader(), GatewayKeyAndSmartRateLimit(), ErrorEnvelopeDto, ApiProperty (+1 more)

### Community 60 - "ErrorReportingBackend"
Cohesion: 0.21
Nodes (8): ResponseFormatDto, ApiProperty, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsStringOrArrayOfStrings(), IsThinkingBudget()

### Community 61 - "project.structure.md"
Cohesion: 0.36
Nodes (10): getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromEnv(), isSemanticCacheEnabledFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement(), shouldConnectRedis() (+2 more)

### Community 62 - "openai-request.mapper.ts"
Cohesion: 0.10
Nodes (26): ChatToolingDto, GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsArray, IsOptional, IsString, Type (+18 more)

### Community 63 - "logging.module.ts"
Cohesion: 0.16
Nodes (4): AppRequestLabels, PrometheusService, Injectable, PrometheusMetrics

### Community 64 - "ChatParamsDto"
Cohesion: 0.18
Nodes (18): buildGenerationConfig(), mapStopSequences(), mapThinkingBudgetToGeminiLevel(), extractFromLegacyFields(), extractFromThoughtParts(), extractGeminiThinkingContent(), GeminiLegacyThoughtFields, GeminiResponseWithTools (+10 more)

### Community 65 - "GlobalExceptionFilter"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 66 - "EnvironmentVariables"
Cohesion: 0.21
Nodes (13): buildAppConfiguration(), BuildEffectiveGatewayConfigOptions, buildGatewayKeyRuntime(), readRequiredPrompt(), stripHtmlComments(), tryReadOptionalPrompts(), loadGatewayConfigFromFile(), GatewayClientConfig (+5 more)

### Community 67 - "health.service.spec.ts"
Cohesion: 0.27
Nodes (12): fromGatewayToolCallDto(), mapChatResponseToOpenAi(), mapFinishReasontoOpenAI(), mapGatewayToolCallsToOpenAi(), mapSystemFingerprintToOpenAi(), toOpenAiCompletionId(), baseChunkFields(), buildToolCallsDelta() (+4 more)

### Community 68 - "OpenAiBearerAuthGuard"
Cohesion: 0.17
Nodes (7): Inject, OTHER_CLIENT, TEST_CLIENT, AppMetricsService, Injectable, Inject, Optional

### Community 69 - ".completions"
Cohesion: 0.11
Nodes (16): ChatStreamController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+8 more)

### Community 70 - "anthropic-stream.mapper.ts"
Cohesion: 0.16
Nodes (4): HttpMetricsMiddleware, Injectable, HttpMethod, HttpRequestLabels

### Community 71 - "PinoLoggerAdapter"
Cohesion: 0.53
Nodes (3): isTextContentItem(), normalizeOpenAiContent(), TextContentItem

### Community 72 - "chat-provider-call.service.ts"
Cohesion: 0.42
Nodes (6): AnthropicModelDto, AnthropicModelsListResponseDto, ApiProperty, mapGatewayModelsListToAnthropic(), mapGatewayModelToAnthropic(), toDisplayName()

### Community 73 - "main.ts"
Cohesion: 0.09
Nodes (48): alias(), toSafeConfigSnapshot(), toSafeModelList(), TEST_INPUT_TOKENS_SMALL, TEST_MAX_CONCURRENT_STREAMS, TEST_MODEL_ID, TEST_OUTPUT_TOKENS, TEST_RATE_LIMIT_BURST (+40 more)

### Community 74 - "wizard-state.schema.ts"
Cohesion: 0.12
Nodes (14): ChatController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, ApiSecurity, ApiTags (+6 more)

### Community 75 - ".createMessage"
Cohesion: 0.11
Nodes (16): ApiHeader, AnthropicMessagesController, AnthropicAuth, ApiAnthropicErrorResponses, ApiBody, ApiOperation, ApiProduces, ApiRequestIdHeader (+8 more)

### Community 76 - "generation-warnings.ts"
Cohesion: 0.12
Nodes (16): components, securitySchemes, description, in, name, type, info, contact (+8 more)

### Community 77 - "SentryErrorReportingAdapter"
Cohesion: 0.13
Nodes (17): CACHE_BACKEND_TYPE, ConfigFlat, ConfigRoot, getByPath(), Nullable, TestCacheConfigOptions, TestGatewayKeyRuntimeOptions, TestRateLimitConfigOptions (+9 more)

### Community 78 - "Brand types — developer guide"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 79 - ".completions"
Cohesion: 0.12
Nodes (15): OpenAiChatCompletionsController, ApiBody, ApiOpenAiErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+7 more)

### Community 80 - "anthropic-tools.mapper.ts"
Cohesion: 0.11
Nodes (14): CACHE_BACKEND_VALUES, EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString (+6 more)

### Community 82 - "post"
Cohesion: 0.30
Nodes (15): post, post, post, post, /api/v1/chat/stream, /api/v1/openai/chat/completions, description, operationId (+7 more)

### Community 83 - "rate-limit-bypass.security-spec.ts"
Cohesion: 0.35
Nodes (6): mapOpenAiMessagesToGateway(), mapOpenAiToolCalls(), mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice(), mapOpenAiToolsToGateway(), OpenAiFunctionTool

### Community 85 - "chat-cache-guard.service.spec.ts"
Cohesion: 0.09
Nodes (23): ChatModule, Module, ApiAnthropicErrorResponses(), ApiOpenAiErrorResponses(), AnthropicModule, Module, AnthropicAuth(), AnthropicErrorBodyDto (+15 more)

### Community 89 - "ChatWarningDto"
Cohesion: 0.10
Nodes (25): ChatCacheSource, ChatOutputTextDto, ApiProperty, ChatResponseDto, ChatUsageDetailsDto, toChatResponseDto(), ApiProperty, ApiPropertyOptional (+17 more)

### Community 90 - "anthropic-tools.mapper.ts"
Cohesion: 0.22
Nodes (5): RedisVectorStoreAdapter, Injectable, VectorSearchHit, VectorStoreKnnInput, getAppConfigOrThrow()

### Community 91 - "ClientListCommand"
Cohesion: 0.23
Nodes (8): ProviderChatTurn, ProviderToolResultTurn, ChatCompletionMessageParam, mapAssistantTurn(), mapTurnsToOpenAiMessages(), mapAssistantTurnToResponsesInput(), mapTurnsToResponsesInput(), CALL_1

### Community 92 - "ProviderAddCommand"
Cohesion: 0.31
Nodes (3): ProviderAddCommand, Command, Option

### Community 93 - "openai-chat-completion-response.dto.ts"
Cohesion: 0.12
Nodes (24): DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, defaultModelPolicy(), ModelEditField, ModelManagerService, Injectable (+16 more)

### Community 94 - "OpenAiChatMessageDto"
Cohesion: 0.22
Nodes (14): SseDoneEvent, asMessageId(), asPromptCacheCreationTokens(), asPromptCacheHitTokens(), MessageId, AnthropicStreamState, createAnthropicStreamState(), emitThinkingBlock() (+6 more)

### Community 95 - "ConfigSecretsStatusCommand"
Cohesion: 0.38
Nodes (6): mapAnthropicRequestToGateway(), AnthropicTool, mapAnthropicContentBlockToGateway(), mapAnthropicToolChoice(), mapAnthropicToolsToGateway(), TEST_TOOL

### Community 96 - "ClientEditCommand"
Cohesion: 0.22
Nodes (9): OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString, MaxLength (+1 more)

### Community 97 - "ClientRemoveCommand"
Cohesion: 0.33
Nodes (3): ClientRemoveCommand, Command, Option

### Community 98 - "ModelAddCommand"
Cohesion: 0.39
Nodes (3): ModelAddCommand, Command, Option

### Community 99 - "ConfigShowCommand"
Cohesion: 0.39
Nodes (6): clamp(), isOverrideKey(), resolveProviderCallOptions(), OVERRIDE_KEYS, OverrideKey, GatewayParamsConfig

### Community 100 - "ModelRemoveCommand"
Cohesion: 0.33
Nodes (3): ModelRemoveCommand, Command, Option

### Community 101 - "ProviderEditCommand"
Cohesion: 0.33
Nodes (3): ProviderEditCommand, Command, Option

### Community 102 - "LoggerBackend"
Cohesion: 0.43
Nodes (6): assertEnabledProviderBaseUrlPresent(), collectMissingBaseUrlErrors(), formatMissingBaseUrlError(), MissingProviderBaseUrl, RawGatewayConfig, resolveBaseUrlFromEnv()

### Community 103 - "ModelListCommand"
Cohesion: 0.39
Nodes (8): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional

### Community 104 - "ProviderListCommand"
Cohesion: 0.39
Nodes (3): KeyGenerateCommand, Command, Option

### Community 105 - "rate-limit.module.ts"
Cohesion: 0.32
Nodes (4): createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), defaultConfiguration(), gatewayConfig

### Community 106 - "instrument.ts"
Cohesion: 0.33
Nodes (3): ModelEditCommand, Command, Option

### Community 107 - "openai-exception.filter.ts"
Cohesion: 0.33
Nodes (3): ProviderRemoveCommand, Command, Option

### Community 108 - "HealthComponent"
Cohesion: 0.32
Nodes (3): healthStatusToGaugeValue(), HealthComponent, HealthStatus

### Community 125 - "ProviderTestCommand"
Cohesion: 0.33
Nodes (3): ProviderTestCommand, Command, Option

### Community 128 - "Anthropic Messages API integration (Claude Code)"
Cohesion: 0.10
Nodes (21): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+13 more)

### Community 129 - "config-validator.ts"
Cohesion: 0.53
Nodes (5): collectInactiveProviderWarnings(), formatZodIssues(), validateGatewayConfig(), ValidationOptions, buildEffectiveGatewayConfig()

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

### Community 156 - "ClientEditCommand"
Cohesion: 0.39
Nodes (3): ClientEditCommand, Command, Option

### Community 160 - "Directory and file architecture"
Cohesion: 0.40
Nodes (5): 1) Repository tree, 2) Directory descriptions (responsibilities), 2a) CLI — runtime isolation, 3) Feature scope vs documentation, Directory and file architecture

### Community 161 - "Documentation — AI Provider Gateway"
Cohesion: 0.33
Nodes (6): Distribution and contributions, Documentation — AI Provider Gateway, File index, How to read this documentation, Selected topics, Specifications (SDD)

## Knowledge Gaps
- **548 isolated node(s):** `$schema`, `openapi`, `description`, `required`, `schema` (+543 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LoggingService` connect `LoggingService` to `brand-types.md`, `health.service.ts`, `provider-manager.service.ts`, `openai-stream.mapper.ts`, `.error`, `test-constants.ts`, `GatewayKey`, `app-configuration.types.ts`, `provider-instances.bootstrap.ts`, `branded.types.ts`, `AppMetricsService`, `app-metrics.service.ts`, `testing.md`, `.createMessage`, `create-e2e-app.ts`, `.streamChat`, `logging.service.ts`, `app.module.ts`, `.getOne`, `AnthropicMessagesRequestDto`, `openai-request.mapper.ts`, `ChatParamsDto`, `OpenAiBearerAuthGuard`, `main.ts`, `anthropic-tools.mapper.ts`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `asProviderInstanceId()` connect `ClientId` to `create-integration-app.ts`, `cli.module.ts`, `brand-types.md`, `provider-manager.service.ts`, `responses.adapter.ts`, `openai-stream.mapper.ts`, `.error`, `ai-provider.interface.ts`, `asClientId`, `swagger.setup.ts`, `config-generator.service.ts`, `provider-instances.bootstrap.ts`, `branded.types.ts`, `app-metrics.service.ts`, `testing.md`, `create-e2e-app.ts`, `.streamChat`, `LoggingService`, `EnvironmentVariables`, `main.ts`, `ConsoleLoggerAdapter`, `chat-cache-guard.service.spec.ts`, `openai-chat-completion-response.dto.ts`, `LoggerBackend`, `ProviderTestCommand`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `ChatRequestDto` connect `brand-types.md` to `GatewayConfig`, `app-metrics.service.ts`, `.completions`, `health.service.ts`, `openai-stream.mapper.ts`, `wizard-state.schema.ts`, `ai-provider.interface.ts`, `.getOne`, `swagger.setup.ts`, `rate-limit-bypass.security-spec.ts`, `branded.types.ts`, `ConsoleLoggerAdapter`, `openai-request.mapper.ts`, `ConfigSecretsStatusCommand`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `LoggingService` (e.g. with `initService()` and `createAdapter()`) actually correct?**
  _`LoggingService` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `openapi`, `description` to the rest of the system?**
  _550 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `create-integration-app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08552188552188553 - nodes in this community are weakly interconnected._
- **Should `cli.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.049778761061946904 - nodes in this community are weakly interconnected._