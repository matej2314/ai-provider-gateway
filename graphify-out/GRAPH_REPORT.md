# Graph Report - ai-provider-gateway  (2026-08-28)

## Corpus Check
- 534 files · ~220,256 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3175 nodes · 10507 edges · 156 communities (123 shown, 33 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 125 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `45c1c9a5`
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
- ConfigSecretsStatusCommand
- Provider Abstraction Layer
- Provider Secrets Validation
- Anthropic Messages API integration (Claude Code)
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
1. `LoggingService` - 112 edges
2. `asProviderInstanceId()` - 101 edges
3. `ModelAlias` - 92 edges
4. `ProviderInstanceId` - 81 edges
5. `GatewayConfig` - 73 edges
6. `ChatRequestDto` - 66 edges
7. `asModelAlias()` - 66 edges
8. `asEnvRef()` - 65 edges
9. `GatewayKey` - 63 edges
10. `ApiErrorCode` - 61 edges

## Surprising Connections (you probably didn't know these)
- `createE2eAppWithCache()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/app.module.ts
- `createE2eAppWithSemanticCache()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/gateway-chat-semantic-cache.e2e-spec.ts → src/app.module.ts
- `createE2eApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/app.module.ts
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts
- `createOpenAiIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-openai-integration-app.ts → src/app.module.ts

## Import Cycles
- 4-file cycle: `src/cache/should-include-redis-stack.ts -> src/config/typed-config.ts -> src/config/app-configuration.types.ts -> src/config/configuration.ts -> src/cache/should-include-redis-stack.ts`

## Communities (156 total, 33 thin omitted)

### Community 0 - "create-integration-app.ts"
Cohesion: 0.07
Nodes (17): ClientManagerService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, EnvPatchService, Injectable, ModelManagerService (+9 more)

### Community 1 - "cli.module.ts"
Cohesion: 0.06
Nodes (56): AgentReport, AgentReportStatus, exitCodeForReport(), PendingSecretsItem, loadAnswers(), collectPendingSecrets(), assertAgentHasAnswers(), CliMode (+48 more)

### Community 2 - "GatewayConfig"
Cohesion: 0.12
Nodes (16): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+8 more)

### Community 3 - "api-error.code.ts"
Cohesion: 0.17
Nodes (13): healthStatusToGaugeValue(), AppProviderStreamScope, AppRequestLabels, AppRequestMethod, AppRequestStatus, HealthComponent, HealthMetricsSnapshot, HealthStatus (+5 more)

### Community 4 - "brand-types.md"
Cohesion: 0.09
Nodes (21): ChatController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, ApiSecurity, ApiTags (+13 more)

### Community 5 - "ClientId"
Cohesion: 0.08
Nodes (39): DEFAULT_MODELS, InitAnswers, ClientPromptService, Injectable, KeyPromptService, Injectable, ModelPromptResult, ModelPromptService (+31 more)

### Community 6 - "health.service.ts"
Cohesion: 0.11
Nodes (16): openCircuitViaLookup(), EMBEDDING_BACKEND, VECTOR_STORE, ABOVE_THRESHOLD_VECTOR, BASIS_VECTOR, BELOW_THRESHOLD_VECTOR, CLIENT_A, CLIENT_B (+8 more)

### Community 7 - "provider-manager.service.ts"
Cohesion: 0.20
Nodes (18): ProviderInstancesBootstrap, Injectable, createE2eAppWithCache(), createInMemoryCacheBackend(), createE2eAppWithSemanticCache(), createFixedEmbeddingBackend(), createNoopExactCacheBackend(), E2eSemanticCacheModule (+10 more)

### Community 8 - "responses.adapter.ts"
Cohesion: 0.17
Nodes (9): emitAgentReport(), exitWithAgentReport(), resolveCliMode(), toSafeClientList(), toSafeConfigSnapshot(), toSafeModelList(), toSafeProviderList(), Injectable (+1 more)

### Community 9 - "openai-stream.mapper.ts"
Cohesion: 0.11
Nodes (16): ConfigValidateCommand, Command, Option, CliGatewayValidatorService, Injectable, WizardState, ConfigGeneratorService, Injectable (+8 more)

### Community 10 - "asProviderInstanceId"
Cohesion: 0.39
Nodes (3): KeyGenerateCommand, Command, Option

### Community 11 - ".error"
Cohesion: 0.13
Nodes (24): readGatewayKeyHeader(), expectGatewayKey(), asGatewayKey(), buildIntegrationConfigOptions(), buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions (+16 more)

### Community 12 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.08
Nodes (32): asCostUsd(), CostUsd, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext() (+24 more)

### Community 13 - "anthropic-tools.mapper.ts"
Cohesion: 0.11
Nodes (14): Header, healthyReadinessConfig, initService(), TEST_CLIENT, APP_METRICS_BACKEND, MetricsController, ApiOperation, ApiResponse (+6 more)

### Community 14 - "ai-provider.interface.ts"
Cohesion: 0.10
Nodes (39): mockExecutorChatSuccess(), mockStreamExecutorSuccess(), CachedChatResponseWithConversation, ChatResponseData, SseMetaPayload, createInProcessSingleflight(), mapStopReasonToFinishReason(), CompleteOnceResult (+31 more)

### Community 15 - "provider-input.ts"
Cohesion: 0.31
Nodes (3): ConfigInitCommand, Command, Option

### Community 16 - "ModelAlias"
Cohesion: 0.10
Nodes (23): CliValidateOptions, collectInactiveProviderWarnings(), formatZodIssues(), expectEnvRef(), validateGatewayConfig(), ValidationOptions, ValidationResult, buildEffectiveGatewayConfig() (+15 more)

### Community 17 - "test-constants.ts"
Cohesion: 0.12
Nodes (21): MockConfigServiceOptions, createEmptyTestGatewayConfig(), createTestGatewayConfig(), CreateTestGatewayConfigOptions, defaultGatewayConfig(), GatewayModelOverrides, mergeModels(), mergeProviders() (+13 more)

### Community 18 - "asClientId"
Cohesion: 0.21
Nodes (7): assertNoFallbackCycle(), alias1, fallback, myModel, primary, ApiErrorCode, ApiErrorPayload

### Community 19 - "swagger.setup.ts"
Cohesion: 0.05
Nodes (61): IsPrimitiveMetadataRecord, Matches, computeSystemSignature(), hashCallParams(), serializeCallParamsForCache(), ResponseCacheService, toCachedChatResponse(), Injectable (+53 more)

### Community 20 - "provider-error.mapper.ts"
Cohesion: 0.30
Nodes (16): MappedProviderError, isAuthError(), isClientError(), isInvalidRequestStatus(), isRateLimitStatus(), isServerError(), isTimeoutStatus(), nameLooksLikeTimeout() (+8 more)

### Community 21 - "GatewayKey"
Cohesion: 0.10
Nodes (32): ProviderTestCommand, Command, Option, WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, CliAiModelSchema, CliAiProviderSchema (+24 more)

### Community 22 - "integrations.md"
Cohesion: 0.19
Nodes (27): get, get, get, get, get, get, get, get (+19 more)

### Community 23 - "config-generator.service.ts"
Cohesion: 0.12
Nodes (21): escapeRedisSearchTag(), isRedisSearchTagSafeId(), assertInteractiveAllowed(), convertRateLimit(), KeyGeneratorService, Injectable, ClientBasicAnswers, ClientPromptResult (+13 more)

### Community 24 - "KeyGenerateCommand"
Cohesion: 0.17
Nodes (16): assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField(), NON_FUZZABLE_OBJECT_KEYS, VALID_USER_MESSAGE (+8 more)

### Community 25 - "openai-params-provider.mapper.ts"
Cohesion: 0.12
Nodes (23): ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, SseDonePayloadDto, IsOptional, buildGenerationWarnings() (+15 more)

### Community 26 - "app-configuration.types.ts"
Cohesion: 0.09
Nodes (22): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+14 more)

### Community 27 - "model-manager.service.ts"
Cohesion: 0.13
Nodes (4): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppTokenUsage

### Community 28 - "provider-registry.service.ts"
Cohesion: 0.09
Nodes (25): ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic(), resolveAnthropicOutputConfig(), ContentBlockParam (+17 more)

### Community 29 - "provider-instances.bootstrap.ts"
Cohesion: 0.14
Nodes (21): SseDeltaEvent, SseDoneEvent, SseFinishReason, SseMetaEvent, asJsonSchemaName(), asMessageId(), asPromptCacheCreationTokens(), asPromptCacheHitTokens() (+13 more)

### Community 30 - "branded.types.ts"
Cohesion: 0.08
Nodes (48): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), isRetryableHttpError(), AttemptResult, ResilientExecutionOptions, ResilientExecutionResult (+40 more)

### Community 31 - "anthropic-messages.controller.ts"
Cohesion: 0.16
Nodes (18): CACHE_BACKEND, OTHER_CLIENT_ID, TEST_CLIENT_ID, TEST_CACHE_KEY, TEST_CACHE_TTL_CUSTOM, TEST_CACHE_TTL_SECONDS, TEST_CACHED_CONVERSATION_ID, TEST_CACHED_REQUEST_ID (+10 more)

### Community 32 - "Deployment — AI Provider Gateway"
Cohesion: 0.04
Nodes (46): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network (`ai-gateway-network`), 5. Deploy (local Compose), 6. Verification, Adding a gateway client, Adding a model alias (+38 more)

### Community 33 - "getAppConfig"
Cohesion: 0.21
Nodes (10): ChatModule, Module, AnthropicModule, Module, IntegrationsModule, Module, OpenAiModule, Module (+2 more)

### Community 34 - "asEnvRef"
Cohesion: 0.21
Nodes (8): GatewayModelCapabilitiesDto, GatewayModelDto, ApiProperty, ApiPropertyOptional, ModelsListResponseDto, ApiProperty, GatewayModelsCatalogService, Injectable

### Community 35 - "AppMetricsService"
Cohesion: 0.08
Nodes (25): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthLivenessResponseDto, ApiProperty, HealthReadinessChecksDto, HealthReadinessResponseDto, ApiProperty (+17 more)

### Community 36 - "app-metrics.service.ts"
Cohesion: 0.39
Nodes (3): OpenAiAuth(), OpenAiExceptionFilter, Catch

### Community 37 - "create-openai-integration-app.ts"
Cohesion: 0.05
Nodes (10): ProviderTestOptions, CliAiModel, ModelAlias, ProviderInstanceId, NoopAppMetricsAdapter, Injectable, AppMetricsService, Inject (+2 more)

### Community 38 - "testing.md"
Cohesion: 0.07
Nodes (41): buildDefaultConfigSnapshot(), ConfigFlat, ConfigRoot, createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), Nullable, resolveGateway(), TestCacheConfigOptions (+33 more)

### Community 39 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.12
Nodes (19): OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 40 - ".createMessage"
Cohesion: 0.06
Nodes (62): IsNotEmpty, ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsString, MaxLength (+54 more)

### Community 41 - "create-e2e-app.ts"
Cohesion: 0.15
Nodes (23): buildGenerationConfig(), createGoogleProvider(), mapStopSequences(), mapThinkingBudgetToGeminiLevel(), extractFromLegacyFields(), extractFromThoughtParts(), extractGeminiThinkingContent(), GeminiLegacyThoughtFields (+15 more)

### Community 42 - ".streamChat"
Cohesion: 0.18
Nodes (18): ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions, IntegrationAppContext, withIntegrationApp() (+10 more)

### Community 43 - "AppMetricsBackend"
Cohesion: 0.24
Nodes (5): VectorStore, VectorStoreProbeResult, VectorStoreTextIdentityInput, VectorStoreUpsertInput, SemanticCacheTtlSeconds

### Community 44 - "create-openai-integration-app.ts"
Cohesion: 0.10
Nodes (26): AppModule, Module, convertProvider(), asBaseUrl(), asProviderApiKey(), bootstrap(), PORT, setupApp() (+18 more)

### Community 45 - "logging.service.ts"
Cohesion: 0.23
Nodes (4): GatewayModelConfig, buildFactoryContext(), ProviderRegistryService, Injectable

### Community 46 - "LoggingService"
Cohesion: 0.10
Nodes (11): Inject, Inject, Inject, Optional, PinoLoggerAdapter, Injectable, LogContext, LoggingService (+3 more)

### Community 47 - "GatewayModelsCatalogService"
Cohesion: 0.35
Nodes (6): mapOpenAiMessagesToGateway(), mapOpenAiToolCalls(), mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice(), mapOpenAiToolsToGateway(), OpenAiFunctionTool

### Community 49 - "app.module.ts"
Cohesion: 0.15
Nodes (13): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+5 more)

### Community 50 - ".getOne"
Cohesion: 0.33
Nodes (6): normalizeEmbeddingModelForIndex(), semanticIndexName(), SemanticIndexNameOptions, canonicalSemanticSchema(), SEMANTIC_SCHEMA_TAG_FIELDS, semanticSchemaFtCreateArgs()

### Community 51 - "openai-models.controller.ts"
Cohesion: 0.28
Nodes (10): ApiAnthropicErrorResponses(), AnthropicErrorBodyDto, AnthropicErrorResponseDto, ApiProperty, AnthropicModelDto, AnthropicModelsListResponseDto, ApiProperty, mapGatewayModelsListToAnthropic() (+2 more)

### Community 52 - "Gateway CLI — documentation"
Cohesion: 0.05
Nodes (43): Agent examples, Agent mode (`config:init --agent`), `AgentReport` (stdout with `--json`), Answers contract, Boilerplate configuration and commands, CLI layer — summary, CLI scope, Commands — clients (+35 more)

### Community 53 - "RequestIdMiddleware"
Cohesion: 0.25
Nodes (7): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Semantic cache (Redis Stack, wektory), Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 54 - "PrometheusService"
Cohesion: 0.07
Nodes (39): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+31 more)

### Community 55 - "anthropic-response.mapper.ts"
Cohesion: 0.17
Nodes (21): SseEvent, OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty (+13 more)

### Community 56 - "AnthropicMessagesRequestDto"
Cohesion: 0.05
Nodes (48): ChatService, Injectable, toChatResponseDto(), toChatResponseDtoFromCache(), CHAT_STREAM_API_DESCRIPTION, ChatErrorHandlerService, Injectable, ChatValidationService (+40 more)

### Community 57 - "API documentation — AI Provider Gateway"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation â AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 58 - "deployment.md"
Cohesion: 0.08
Nodes (40): content, description, content, description, headers, content, description, content (+32 more)

### Community 59 - "ConsoleLoggerAdapter"
Cohesion: 0.12
Nodes (19): createStreamRequest(), createMockContext(), createMockExpressRequest(), createMockExpressResponse(), TEST_GATEWAY_KEY_BRANDED, getAppConfig(), GatewayKeyGuard, initGuard() (+11 more)

### Community 60 - "ErrorReportingBackend"
Cohesion: 0.08
Nodes (21): NoopErrorReportingAdapter, Injectable, LEVEL_RANK, SentryErrorReportingAdapter, Injectable, parseLogLevel(), ErrorReportingBackend, LoggerBackend (+13 more)

### Community 61 - "project.structure.md"
Cohesion: 0.33
Nodes (3): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable

### Community 62 - "openai-request.mapper.ts"
Cohesion: 0.20
Nodes (10): GatewayProviderInstanceConfig, createBootstrap(), createConfigServiceMock(), mockCreateAnthropicProvider, mockCreateGoogleProvider, mockCreateOpenAiCompatibleProviderInstance, mockCreateOpenAiProvider, providerRow() (+2 more)

### Community 63 - "logging.module.ts"
Cohesion: 0.20
Nodes (3): PrometheusService, Injectable, PrometheusMetrics

### Community 64 - "ChatParamsDto"
Cohesion: 0.13
Nodes (24): alias(), TEST_INPUT_TOKENS_SMALL, TEST_MAX_CONCURRENT_STREAMS, TEST_MODEL_ID, TEST_OUTPUT_TOKENS, TEST_RATE_LIMIT_BURST, buildResolvedConfig(), capabilities() (+16 more)

### Community 65 - "GlobalExceptionFilter"
Cohesion: 0.24
Nodes (7): ProviderToolResultTurn, ChatCompletionMessageParam, mapAssistantTurn(), mapTurnsToOpenAiMessages(), mapAssistantTurnToResponsesInput(), mapTurnsToResponsesInput(), CALL_1

### Community 66 - "EnvironmentVariables"
Cohesion: 0.16
Nodes (12): OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString, MaxLength (+4 more)

### Community 67 - "health.service.spec.ts"
Cohesion: 0.24
Nodes (11): mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions(), mapResponseFormatToChatCompletion(), mapResponseFormatToResponses(), mapStopSequences(), OpenAiSharedChatCompletionParams, OpenAiSharedResponsesParams (+3 more)

### Community 68 - "OpenAiBearerAuthGuard"
Cohesion: 0.09
Nodes (25): CACHE_BACKEND_TYPE, getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromConfig(), isRedisRequiredFromEnv(), isSemanticCacheEnabledFromEnv(), RedisRequirementSnapshot (+17 more)

### Community 69 - ".completions"
Cohesion: 0.11
Nodes (16): ChatStreamController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+8 more)

### Community 71 - "PinoLoggerAdapter"
Cohesion: 0.10
Nodes (14): RedisConnectionService, Injectable, OllamaEmbeddingAdapter, createAdapter(), Injectable, initAdapter(), EmbeddingBackend, initService() (+6 more)

### Community 72 - "chat-provider-call.service.ts"
Cohesion: 0.24
Nodes (9): adaptApiKeyProviderFactory(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider(), ApiKeyProviderFactoryFn, ProviderFactoryFn, createChatCompletionsAdapter(), createResponsesAdapter() (+1 more)

### Community 73 - "main.ts"
Cohesion: 0.16
Nodes (21): closeE2eApp(), createE2eApp(), withE2eApp(), createAnthropicRequestBody(), E2E_ANTHROPIC_USER_MESSAGE, E2E_GATEWAY_KEY, E2E_INVALID_GATEWAY_KEY, E2E_OPENAI_MODEL_ALIAS_BRANDED (+13 more)

### Community 74 - "wizard-state.schema.ts"
Cohesion: 0.10
Nodes (22): ApiHeader, ChatCacheSource, ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString (+14 more)

### Community 75 - ".createMessage"
Cohesion: 0.33
Nodes (9): AnthropicContentBlock, AnthropicContentBlockDto, AnthropicMessagesResponseDto, AnthropicMessagesUsageDto, AnthropicTextContentBlockDto, AnthropicThinkingContentBlockDto, AnthropicToolUseContentBlockDto, ApiProperty (+1 more)

### Community 76 - "generation-warnings.ts"
Cohesion: 0.15
Nodes (12): components, securitySchemes, info, contact, description, title, version, openapi (+4 more)

### Community 77 - "SentryErrorReportingAdapter"
Cohesion: 0.21
Nodes (8): ResponseFormatDto, ApiProperty, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsStringOrArrayOfStrings(), IsThinkingBudget()

### Community 78 - "Brand types — developer guide"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 79 - ".completions"
Cohesion: 0.13
Nodes (16): createMockStreamResult(), textStream(), UnsupportedProviderException, createMockAIProvider(), createMockProviderRegistryService(), createMockDefaultResolvedConfig(), TEST_PROMPT_CACHE_CREATION_TOKENS, GatewayCapabilitiesConfig (+8 more)

### Community 80 - "anthropic-tools.mapper.ts"
Cohesion: 0.36
Nodes (5): ProviderRegistryModule, Global, Module, ProvidersModule, Module

### Community 82 - "post"
Cohesion: 0.30
Nodes (15): post, post, post, post, /api/v1/chat/stream, /api/v1/openai/chat/completions, description, operationId (+7 more)

### Community 83 - "rate-limit-bypass.security-spec.ts"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 84 - "ConsoleLoggerAdapter"
Cohesion: 0.17
Nodes (13): ApiGatewayModelsErrorResponses, ModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 85 - "chat-cache-guard.service.spec.ts"
Cohesion: 0.39
Nodes (3): ClientAddCommand, Command, Option

### Community 89 - "ChatWarningDto"
Cohesion: 0.07
Nodes (32): ChatOutputTextDto, ApiProperty, ChatToolingDto, GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsArray, IsOptional (+24 more)

### Community 90 - "anthropic-tools.mapper.ts"
Cohesion: 0.22
Nodes (4): RedisVectorStoreAdapter, Injectable, VectorSearchHit, VectorStoreKnnInput

### Community 91 - "ClientListCommand"
Cohesion: 0.39
Nodes (3): ClientEditCommand, Command, Option

### Community 92 - "ProviderAddCommand"
Cohesion: 0.36
Nodes (3): ProviderAddCommand, Command, Option

### Community 93 - "openai-chat-completion-response.dto.ts"
Cohesion: 0.14
Nodes (22): DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, convertModel(), defaultModelPolicy(), ModelEditField, AddModelInput (+14 more)

### Community 94 - "OpenAiChatMessageDto"
Cohesion: 0.39
Nodes (3): ClientRemoveCommand, Command, Option

### Community 95 - "ConfigSecretsStatusCommand"
Cohesion: 0.39
Nodes (3): ModelAddCommand, Command, Option

### Community 96 - "ClientEditCommand"
Cohesion: 0.21
Nodes (7): DEFAULT_HTTP_STATUS_TO_CODE, GlobalExceptionFilter, isPayloadTooLargeError(), PayloadTooLargeError, RequestWithId, Catch, Injectable

### Community 97 - "ClientRemoveCommand"
Cohesion: 0.25
Nodes (7): AppMetricsModule, Global, Module, RATE_LIMIT_MODULE_OPTIONS, RateLimitModule, RateLimitModuleOptions, Module

### Community 99 - "ConfigShowCommand"
Cohesion: 0.27
Nodes (10): ApiOpenAiErrorResponses(), OpenAiErrorBodyDto, OpenAiErrorResponseDto, ApiProperty, ApiPropertyOptional, OpenAiModelDto, OpenAiModelsListResponseDto, ApiProperty (+2 more)

### Community 100 - "ModelRemoveCommand"
Cohesion: 0.39
Nodes (3): ModelRemoveCommand, Command, Option

### Community 101 - "ProviderEditCommand"
Cohesion: 0.39
Nodes (3): ProviderEditCommand, Command, Option

### Community 102 - ".getLiveness"
Cohesion: 0.15
Nodes (13): OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 103 - "logging.service.spec.ts"
Cohesion: 0.39
Nodes (5): ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional

### Community 104 - "ProviderListCommand"
Cohesion: 0.43
Nodes (3): AnthropicAuth(), AnthropicExceptionFilter, Catch

### Community 105 - "RequestIdMiddleware"
Cohesion: 0.53
Nodes (4): getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT

### Community 106 - "instrument.ts"
Cohesion: 0.39
Nodes (3): ModelEditCommand, Command, Option

### Community 107 - "openai-exception.filter.ts"
Cohesion: 0.39
Nodes (3): ProviderRemoveCommand, Command, Option

### Community 125 - "ConfigSecretsStatusCommand"
Cohesion: 0.40
Nodes (3): ConfigSecretsStatusCommand, Command, Option

### Community 128 - "Anthropic Messages API integration (Claude Code)"
Cohesion: 0.10
Nodes (21): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+13 more)

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
- **548 isolated node(s):** `$schema`, `openapi`, `description`, `required`, `schema` (+543 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LoggingService` connect `LoggingService` to `health.service.ts`, `provider-manager.service.ts`, `.error`, `anthropic-tools.mapper.ts`, `ai-provider.interface.ts`, `test-constants.ts`, `swagger.setup.ts`, `app-configuration.types.ts`, `provider-registry.service.ts`, `branded.types.ts`, `anthropic-messages.controller.ts`, `AppMetricsService`, `.createMessage`, `create-e2e-app.ts`, `.streamChat`, `AppMetricsBackend`, `create-openai-integration-app.ts`, `logging.service.ts`, `AnthropicMessagesRequestDto`, `ErrorReportingBackend`, `openai-request.mapper.ts`, `PinoLoggerAdapter`, `chat-provider-call.service.ts`, `main.ts`, `.completions`, `ChatWarningDto`, `anthropic-tools.mapper.ts`, `ClientEditCommand`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `ChatRequestDto` connect `swagger.setup.ts` to `GatewayConfig`, `brand-types.md`, `.completions`, `health.service.ts`, `.createMessage`, `RequestIdMiddleware`, `ai-provider.interface.ts`, `.completions`, `GatewayModelsCatalogService`, `PrometheusService`, `AnthropicMessagesRequestDto`, `ChatWarningDto`, `anthropic-messages.controller.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `asProviderInstanceId()` connect `openai-chat-completion-response.dto.ts` to `create-integration-app.ts`, `cli.module.ts`, `ClientId`, `provider-manager.service.ts`, `responses.adapter.ts`, `.error`, `ai-provider.interface.ts`, `ModelAlias`, `test-constants.ts`, `swagger.setup.ts`, `GatewayKey`, `config-generator.service.ts`, `provider-instances.bootstrap.ts`, `branded.types.ts`, `anthropic-messages.controller.ts`, `asEnvRef`, `testing.md`, `.createMessage`, `.streamChat`, `create-openai-integration-app.ts`, `logging.service.ts`, `AnthropicMessagesRequestDto`, `ConsoleLoggerAdapter`, `openai-request.mapper.ts`, `ChatParamsDto`, `PinoLoggerAdapter`, `chat-provider-call.service.ts`, `main.ts`, `.completions`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `LoggingService` (e.g. with `initService()` and `createAdapter()`) actually correct?**
  _`LoggingService` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `openapi`, `description` to the rest of the system?**
  _550 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `create-integration-app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06599597585513078 - nodes in this community are weakly interconnected._
- **Should `cli.module.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06198019801980198 - nodes in this community are weakly interconnected._