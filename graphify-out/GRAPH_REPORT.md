# Graph Report - .  (2026-07-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2204 nodes · 7458 edges · 107 communities (105 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fba705da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 88 edges
2. `asProviderInstanceId()` - 77 edges
3. `ApiErrorCode` - 59 edges
4. `ChatRequestDto` - 56 edges
5. `GatewayKey` - 53 edges
6. `asEnvRef()` - 53 edges
7. `asGatewayKey()` - 51 edges
8. `GatewayConfig` - 49 edges
9. `ProviderInstanceId` - 44 edges
10. `asProviderApiKey()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `createE2eApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/app.module.ts
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts
- `createOpenAiIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-openai-integration-app.ts → src/app.module.ts
- `createE2eAppWithCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eApp()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/cache/adapters/redis-cache/redis-connection.service.ts

## Import Cycles
- 2-file cycle: `src/common/errors/provider-error.mapper.ts -> src/providers/openai/mappers/openai-error.mapper.ts -> src/common/errors/provider-error.mapper.ts`

## Communities (107 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (27): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, NoopErrorReportingAdapter, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (29): ClientAddCommand, Command, ClientEditCommand, Command, ClientListCommand, Command, ClientRemoveCommand, Command (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (16): NoOpCacheBackend, Injectable, NoopCacheModule, Module, CacheModule, CacheModuleOptions, Module, CacheRegistryService (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (29): CostUsd, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext(), buildGenAiChatSpanAttributes() (+21 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (21): TEST_CACHE_KEY, TEST_CACHED_CONVERSATION_ID, TEST_CACHED_REQUEST_ID, TEST_CACHED_RESPONSE_ID, TEST_CONVERSATION_ID, TEST_COST_USD, TEST_FALLBACK_MODEL_ALIAS, TEST_GATEWAY_KEY_BRANDED (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (18): KeyGenerateCommand, KeyType, Command, WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, KeyGeneratorService, Injectable (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (34): TEST_INPUT_TOKENS_SMALL, TEST_MODEL_ID, TEST_OUTPUT_TOKENS_SMALL, OpenAiApiSurface, openAiCompatibleApiSurface, OpenAiProviderConfig, closeE2eApp(), createDefaultE2eConfigOptions() (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (28): CachedChatResponse, CachedChatResponseWithConversation, ChatResponseData, ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (24): ProviderPromptResult, validateProviderApiKey(), LEGACY_PROVIDER_API_KEY_ENV, ProviderEnvEntry, syncLegacyProviderApiKeysInEnv(), defaultBaseUrlForOpenAiProviderType(), normalizeCliProviderBaseUrl(), validateCliProviderBaseUrl() (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (29): AppModule, Module, bootstrap(), ProviderInstancesBootstrap, Injectable, PORT, setupApp(), exportOpenApi() (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (23): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), createMockResilientExecutor(), assertNoFallbackCycle(), alias1, fallback (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (25): CachedChatResponseSchema, ChatWarningSchema, parseCachedChatResponse(), asInputTokens(), asOutputTokens(), asToolCallId(), JsonSchemaName, PromptCacheCreationTokens (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (20): IsPrimitiveMetadataRecord, ResponseCacheService, Injectable, ChatRequestDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (28): ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (20): ProviderRegistryService, Injectable, ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (18): ChatController, ApiSecurity, ApiTags, Controller, GatewayKeyAndSmartRateLimit, ChatService, Injectable, createStreamRequest() (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (28): AppConfiguration, RedisRuntimeConfig, buildAppConfiguration(), buildEffectiveGatewayConfig(), buildGatewayKeyRuntime(), readRequiredPrompt(), stripHtmlComments(), tryReadOptionalPrompts() (+20 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (27): test, ConfigFlat, ConfigRoot, createMockConfigService(), getByPath(), MockConfigServiceOptions, Nullable, TestCacheConfigOptions (+19 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (14): isCachedChatAllowedForModelAlias(), asModelAlias(), GatewayConfig, GatewayModelConfig, GatewayProviderType, getAppConfigOrThrow(), GatewayModelCapabilitiesDto, GatewayModelDto (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (27): asPromptCacheCreationTokens(), asPromptCacheHitTokens(), ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic() (+19 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (12): INGRESS_LIMITS, validateChatIngress(), ApiErrorCode, ApiErrorPayload, UnsupportedProviderException, ANTHROPIC_STREAM_API_DESCRIPTION, mapAnthropicRequestToGateway(), AnthropicTool (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (14): cacheEnabledGatewayConfig, initService(), StreamCleanupInterceptor, Injectable, createMockLoggingService(), createMockResponseCacheService(), createMockSmartRateLimiter(), ResolvedGatewayClient (+6 more)

### Community 23 - "Community 23"
Cohesion: 0.17
Nodes (24): RequestIdMiddleware, Injectable, createRequestId(), isAttemptNumber(), isBaseUrl(), isCacheTtlSeconds(), isConversationId(), isFiniteNumber() (+16 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (12): ConfigValidateCommand, Command, CliGatewayValidatorService, Injectable, ConfigGeneratorService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite() (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (19): adaptApiKeyProviderFactory(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider(), ApiKeyProviderFactoryFn, ProviderFactoryContext, ProviderFactoryFn, createChatCompletionsAdapter() (+11 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (28): dependencies, @anthropic-ai/sdk, boxen, chalk, class-transformer, class-validator, @google/genai, helmet (+20 more)

### Community 27 - "Community 27"
Cohesion: 0.19
Nodes (18): DEFAULT_MODELS, DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, defaultModelPolicy(), ModelEditField, buildDefaultModelCapabilities() (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (15): ApiOpenAiErrorResponses(), ApiRequestIdHeader(), OpenAiAuth(), OpenAiErrorBodyDto, OpenAiErrorResponseDto, ApiProperty, ApiPropertyOptional, OpenAiModelDto (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (27): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+19 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (17): CACHE_BACKEND_TYPE, getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromConfig(), isRedisRequiredFromEnv(), RedisConsumer, RedisRequirementSnapshot (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (20): ChatModule, Module, AnthropicModule, Module, AnthropicMessagesController, AnthropicAuth, ApiSecurity, ApiTags (+12 more)

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (26): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+18 more)

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (12): ChatErrorHandlerService, Injectable, ChatProviderCallService, createMockStreamResult(), textStream(), Injectable, ChatValidationService, Injectable (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.08
Nodes (25): scripts, build, build:cli, cli, config:validate, format, lint, openapi:export (+17 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (19): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (16): ToolCallId, AssistantChatMessage, ProviderAssistantTurn, ProviderChatInput, ProviderChatTurn, ProviderToolDefinition, ProviderToolResultTurn, UserChatMessage (+8 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (11): SseMetaPayload, ChatExecutionContext, ProviderCallContext, RateLimitCheckResult, ChatIngressProfile, alias(), GatewayKey, ModelAlias (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (14): KeyGenerateOptions, Option, CliRateLimit, GatewayClient, ClientBasicAnswers, ClientPromptResult, RateLimitAnswers, ClientId (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (18): buildGenerationConfig(), createGoogleProvider(), mapStopSequences(), mapThinkingBudgetToGeminiLevel(), extractFromLegacyFields(), extractFromThoughtParts(), extractGeminiThinkingContent(), GeminiLegacyThoughtFields (+10 more)

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (12): DEFAULT_HTTP_STATUS_TO_CODE, GlobalExceptionFilter, RequestWithId, Catch, Injectable, IntegrationsModule, Module, ProviderRegistryModule (+4 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (13): CliAiProvider, EnvPatchService, EnvPatchValue, Injectable, ClientCli, generateEnvTemplate(), isEnvInputRedisRequired(), ProviderCli (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (11): HealthController, ApiOkResponse, ApiOperation, ApiRequestIdHeader, ApiTags, Controller, Get, HealthModule (+3 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (18): TEST_MAX_ATTEMPTS, TEST_RETRY_ON_STATUS, TEST_TIMEOUT_MS, buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext (+10 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (16): ChatStreamController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+8 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (15): asSystemFingerprint(), ChatCompletionsAdapterOptions, accumulateOpenAiStreamToolCallDeltas(), extractOpenAiStreamDeltaText(), finalizeOpenAiStreamToolCalls(), OpenAiStreamToolCallAccumulator, ChatCompletionMessageToolCall, ChatCompletionTool (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (19): AnthropicMessagesRequestDto, AnthropicThinkingDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (19): OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (14): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asWarningCode(), ChatCompletionThinkingParam, isOpenAiEffortLevel(), isOpenAiReasoningRequested(), mapThinkingBudgetToEffort() (+6 more)

### Community 49 - "Community 49"
Cohesion: 0.12
Nodes (7): ConfigInitCommand, Command, WizardState, Injectable, WizardOrchestratorService, Injectable, WizardStateManager

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (12): RedisCacheAdapter, Injectable, RedisCacheModule, Module, RedisConnectionService, Injectable, Inject, TEST_CACHE_TTL_CUSTOM (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (15): ChatToolingDto, GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsArray, IsOptional, IsString, Type (+7 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (13): ChatUsageDto, ApiPropertyOptional, SseDeltaPayloadDto, ApiProperty, SseMetaPayloadDto, ApiProperty, ApiPropertyOptional, buildSwaggerConfig() (+5 more)

### Community 53 - "Community 53"
Cohesion: 0.16
Nodes (12): CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema, convertClient(), convertModel(), convertProvider(), GatewayClientSchema, parseWizardState() (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (8): ModelAddCommand, Command, ModelEditCommand, Command, ModelRemoveCommand, Command, ModelManagerService, Injectable

### Community 55 - "Community 55"
Cohesion: 0.27
Nodes (12): mapChatResponseToOpenAi(), mapFinishReasontoOpenAI(), mapGatewayToolCallsToOpenAi(), mapSystemFingerprintToOpenAi(), toOpenAiCompletionId(), baseChunkFields(), buildToolCallsDelta(), chunkLine() (+4 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (13): ApiGatewayModelsErrorResponses, ModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 57 - "Community 57"
Cohesion: 0.19
Nodes (9): result, CliValidateOptions, collectInactiveProviderWarnings(), formatZodIssues(), expectEnvRef(), validateGatewayConfig(), ValidationOptions, ValidationResult (+1 more)

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (7): CHAT_STREAM_API_DESCRIPTION, SseSerializer, ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional

### Community 59 - "Community 59"
Cohesion: 0.43
Nodes (9): convertRateLimit(), generateGatewayConfigTemplate(), buildClientRateLimitConfig(), asClientId(), asMaxConcurrentStreams(), asRateLimitBurst(), asRateLimitRps(), createServiceWithGatewayClients() (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.14
Nodes (14): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+6 more)

### Community 61 - "Community 61"
Cohesion: 0.17
Nodes (13): OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 62 - "Community 62"
Cohesion: 0.21
Nodes (6): ProviderTestCommand, Command, Option, ProviderTestService, Injectable, ProviderApiKey

### Community 63 - "Community 63"
Cohesion: 0.38
Nodes (10): nameLooksLikeTimeout(), readErrorMessage(), readNumericStatus(), mapAnthropicSdkError(), mapGoogleGenAiError(), MappedProviderError, payloadOf(), toHttpException() (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.23
Nodes (10): HealthCheckItemDto, ApiProperty, HealthLivenessResponseDto, ApiProperty, HealthReadinessChecksDto, HealthReadinessResponseDto, ApiProperty, HealthRedisCheckItemDto (+2 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (7): AnthropicApiKeyGuard, readAnthropicApiKey(), Injectable, OpenAiBearerAuthGuard, readAuthorizationHeader(), readBearerToken(), Injectable

### Community 66 - "Community 66"
Cohesion: 0.26
Nodes (10): mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions(), mapResponseFormatToChatCompletion(), mapResponseFormatToResponses(), mapStopSequences(), OpenAiSharedChatCompletionParams, OpenAiSharedResponsesParams (+2 more)

### Community 67 - "Community 67"
Cohesion: 0.27
Nodes (10): buildIntegrationConfigOptions(), buildIntegrationGatewayKeyAllowList(), getIntegrationMasterKey(), readIntegrationEnv(), requireVendorApiKey(), assertMasterKeyPresent(), buildGatewayKeyRuntime(), cacheFromEnv() (+2 more)

### Community 68 - "Community 68"
Cohesion: 0.15
Nodes (12): author, bin, gateway, description, license, name, private, typeCoverage (+4 more)

### Community 69 - "Community 69"
Cohesion: 0.48
Nodes (4): composeSystemPrompt(), getResolvedSystemPrompts(), ChatExecutionPrep, ResolvedSystemPrompts

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (11): ApiHeader, ApiAnthropicErrorResponses, ApiBody, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body (+3 more)

### Community 71 - "Community 71"
Cohesion: 0.17
Nodes (12): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+4 more)

### Community 72 - "Community 72"
Cohesion: 0.17
Nodes (12): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, moduleNameMapper, rootDir, testEnvironment, testPathIgnorePatterns (+4 more)

### Community 73 - "Community 73"
Cohesion: 0.17
Nodes (11): ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, Body, Post, Req (+3 more)

### Community 74 - "Community 74"
Cohesion: 0.19
Nodes (14): resolveGateway(), createEmptyTestGatewayConfig(), createTestGatewayConfig(), CreateTestGatewayConfigOptions, defaultGatewayConfig(), GatewayModelOverrides, mergeModels(), mergeProviders() (+6 more)

### Community 75 - "Community 75"
Cohesion: 0.20
Nodes (11): BasicServerAnswers, CacheAnswers, MetricsAnswers, RateLimitAnswers, RedisAnswers, SentryAnswers, ServerConfigPromptResult, WizardRunResult (+3 more)

### Community 76 - "Community 76"
Cohesion: 0.17
Nodes (12): EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString (+4 more)

### Community 77 - "Community 77"
Cohesion: 0.35
Nodes (6): mapOpenAiMessagesToGateway(), mapOpenAiToolCalls(), mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice(), mapOpenAiToolsToGateway(), OpenAiFunctionTool

### Community 78 - "Community 78"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 79 - "Community 79"
Cohesion: 0.36
Nodes (5): readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey(), requireClientGatewayKey(), asGatewayKey()

### Community 80 - "Community 80"
Cohesion: 0.35
Nodes (8): asMessageId(), MessageId, AnthropicStreamState, createAnthropicStreamState(), emitThinkingBlock(), eventLine(), mapSseEventToAnthropic(), nextToolBlockIndex()

### Community 81 - "Community 81"
Cohesion: 0.18
Nodes (10): ApiBody, ApiOpenAiErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body, Post (+2 more)

### Community 82 - "Community 82"
Cohesion: 0.24
Nodes (7): ResponseFormatDto, ApiProperty, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsThinkingBudget()

### Community 83 - "Community 83"
Cohesion: 0.31
Nodes (6): buildDefaultConfigSnapshot(), createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), asPort(), defaultConfiguration(), gatewayConfig

### Community 84 - "Community 84"
Cohesion: 0.22
Nodes (8): ChatOutputTextDto, ApiProperty, ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (4): IsStringOrArrayOfStrings(), isTextContentItem(), normalizeOpenAiContent(), TextContentItem

### Community 86 - "Community 86"
Cohesion: 0.39
Nodes (8): AnthropicContentBlockDto, AnthropicMessagesResponseDto, AnthropicMessagesUsageDto, AnthropicTextContentBlockDto, AnthropicThinkingContentBlockDto, AnthropicToolUseContentBlockDto, ApiProperty, ApiPropertyOptional

### Community 87 - "Community 87"
Cohesion: 0.39
Nodes (8): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional

### Community 88 - "Community 88"
Cohesion: 0.22
Nodes (9): OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString, MaxLength (+1 more)

### Community 89 - "Community 89"
Cohesion: 0.32
Nodes (7): SseDonePayloadDto, SseDoneUsageDto, ApiPropertyOptional, IsOptional, GatewayToolCallDto, ApiProperty, IsString

### Community 90 - "Community 90"
Cohesion: 0.43
Nodes (5): fromGatewayToolCallDto(), AnthropicContentBlock, mapGatewayResponseToAnthropicFormat(), mapGatewayToolCallsToAnthropic(), mapGatewayFinishReasonToAnthropicStopReason()

### Community 91 - "Community 91"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 92 - "Community 92"
Cohesion: 0.48
Nodes (5): clamp(), isOverrideKey(), resolveProviderCallOptions(), OVERRIDE_KEYS, OverrideKey

### Community 93 - "Community 93"
Cohesion: 0.57
Nodes (4): ApiAnthropicErrorResponses(), AnthropicErrorBodyDto, AnthropicErrorResponseDto, ApiProperty

### Community 94 - "Community 94"
Cohesion: 0.53
Nodes (4): SseDoneEvent, GatewayUsageDetails, mapGatewayUsageToAnthropic(), mapSseDoneUsageToAnthropic()

### Community 95 - "Community 95"
Cohesion: 0.60
Nodes (4): countActiveModelsAfterProviderChange(), countModelsForInstance(), isLastModelForEnabledProvider(), isLastModelInConfig()

### Community 96 - "Community 96"
Cohesion: 0.40
Nodes (4): distEntry, fs, path, tsEntry

### Community 97 - "Community 97"
Cohesion: 0.67
Nodes (3): bootstrap(), CliModule, Module

### Community 99 - "Community 99"
Cohesion: 0.29
Nodes (7): CompleteOnceResult, ProviderTestOptions, CliAiModel, ModelId, ProviderInstanceId, AIProvider, RegisteredProviderInstance

### Community 100 - "Community 100"
Cohesion: 0.50
Nodes (3): exclude, extends, include

## Knowledge Gaps
- **287 isolated node(s):** `path`, `fs`, `distEntry`, `tsEntry`, `$schema` (+282 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `Community 34` to `Community 18`, `Community 68`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `test` connect `Community 18` to `Community 34`, `Community 2`, `Community 6`, `Community 9`, `Community 43`, `Community 14`, `Community 22`, `Community 59`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `LoggingService` connect `Community 50` to `Community 0`, `Community 2`, `Community 6`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 25`, `Community 30`, `Community 33`, `Community 37`, `Community 39`, `Community 40`, `Community 43`, `Community 45`, `Community 52`, `Community 59`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `LoggingService` (e.g. with `initService()` and `initService()`) actually correct?**
  _`LoggingService` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `path`, `fs`, `distEntry` to the rest of the system?**
  _289 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05775638652350981 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08397337429595494 - nodes in this community are weakly interconnected._