# Graph Report - ai-provider-gateway  (2026-07-16)

## Corpus Check
- 517 files · ~201,732 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2977 nodes · 8750 edges · 151 communities (139 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `93689c62`
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
- Community 15
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
- RedisConnectionService
- Community 74
- Community 75
- Community 76
- Community 77
- ConsoleLoggerAdapter
- Community 79
- HealthService
- Community 81
- Community 82
- Community 83
- Community 85
- create-openai-integration-app.ts
- Community 87
- getAppConfig
- Community 89
- chat-stream.controller.ts
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- create-security-app.ts
- Community 98
- Community 99
- Community 100
- Community 101
- isOpenAiProviderType
- Agent Instructions
- Architektura — AI Provider Gateway
- Słownik (dictionary) — AI Provider Gateway
- SPEC — Chat (standard) — `POST /chat`
- Testy — AI Provider Gateway
- SPEC — Chat (streaming) — `POST /chat/stream`
- Security Policy
- SPEC — Health (liveness/readiness)
- SPEC — Konfiguracja (plug&play)
- Przepływ danych (data flow) — AI Provider Gateway
- Adapter OpenAI (provider runtime)
- app.module.ts
- ClientManagerService
- e2e-provider-registry.ts
- Testy integracyjne (live SDK + Redis)
- Architektura katalogów i plików
- Komendy — providery
- Dokumentacja — AI Provider Gateway
- Specyfikacje (Spec‑Driven Development)
- deploy-production.sh
- deploy-staging.sh
- rollback.sh
- MASTER_SYSTEM_PROMPT.md
- chat-default.md
- ollama-chat.md
- openai-chat-gpt.md
- Faza 1: Application Metrics (Prometheus) — 📋 PENDING
- Faza 0: Rename i Reorganizacja (AI Metrics) — 📋 PENDING
- create-anthropic-provider.ts
- createMockConfigService
- wait-for-redis.ts
- rate-limit-bypass.security-spec.ts
- anthropic-tools.mapper.ts
- AppMetricsModule
- chat-params.dto.ts
- ResponseFormatDto
- openai-chat-message.dto.ts
- .getOne
- CliModule
- cached-chat-response.schema.ts
- prometheus.service.ts
- ChatToolingDto
- entrypoint.sh
- parse-anthropic-sse-events.ts

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 93 edges
2. `asProviderInstanceId()` - 78 edges
3. `ProviderInstanceId` - 74 edges
4. `ModelAlias` - 74 edges
5. `ApiErrorCode` - 61 edges
6. `scripts` - 57 edges
7. `ChatRequestDto` - 57 edges
8. `GatewayKey` - 57 edges
9. `asEnvRef()` - 52 edges
10. `asGatewayKey()` - 51 edges

## Surprising Connections (you probably didn't know these)
- `createE2eApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/app.module.ts
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts
- `createOpenAiCompatibleIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-openai-compatible-integration-app.ts → src/app.module.ts
- `createOpenAiIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-openai-integration-app.ts → src/app.module.ts
- `createE2eAppWithCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts

## Import Cycles
- 2-file cycle: `src/common/errors/provider-error.mapper.ts -> src/providers/openai/mappers/openai-error.mapper.ts -> src/common/errors/provider-error.mapper.ts`

## Communities (151 total, 12 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (27): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, NoopErrorReportingAdapter, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (50): ClientAddCommand, Command, ClientEditCommand, Command, ClientListCommand, Command, ClientRemoveCommand, Command (+42 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (16): assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField(), NON_FUZZABLE_OBJECT_KEYS, VALID_USER_MESSAGE (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (34): TEST_MODEL_ALIAS_BRANDED, asCostUsd(), CostUsd, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan() (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (11): ClientCli, StreamCleanupInterceptor, Injectable, readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey(), requireClientGatewayKey(), GatewayKey (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (13): createStreamRequest(), GatewayKeyAndSmartRateLimit(), createMockContext(), createMockExpressRequest(), createMockExpressResponse(), asRequestId(), GatewayKeyGuard, initGuard() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (20): CompleteOnceResult, ChatValidationService, Injectable, convertModel(), createMockAIProvider(), createMockProviderRegistryService(), createMockDefaultResolvedConfig(), TEST_CONVERSATION_ID (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (18): GatewayConfigSchema, gatewayConfig, loadRealGatewayConfig(), openAiCompatibleProviders, NOTE: We can't use loadGatewayConfigFromFile() because it's globally mocked, buildIntegrationEnvRefs(), buildOpenAiCompatibleIntegrationConfigOptions(), closeOpenAiCompatibleIntegrationApp() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (20): ProviderPromptResult, ProviderPromptService, Injectable, validateProviderApiKey(), defaultBaseUrlForOpenAiProviderType(), normalizeCliProviderBaseUrl(), validateCliProviderBaseUrl(), defaultProviderInstanceId() (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (17): asInputTokens(), asToolCallId(), buildResponsesCreateParams(), mapGatewayMetadataToOpenAi(), mapAssistantTurnToResponsesInput(), mapTurnsToResponsesInput(), CALL_1, extractResponsesToolCalls() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (23): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), createMockResilientExecutor(), assertNoFallbackCycle(), alias1, fallback (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (12): ResponseCacheService, Injectable, isCachedChatAllowedForModelAlias(), cacheEnabledGatewayConfig, initService(), ChatExecutionContext, ProviderCallContext, RateLimitCheckResult (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.31
Nodes (5): WizardState, Injectable, WizardOrchestratorService, Injectable, WizardStateManager

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (22): ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (14): ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions, IntegrationAppContext, withIntegrationApp() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (4): ConfigInitCommand, Command, ProviderTestCommand, Command

### Community 16 - "Community 16"
Cohesion: 0.32
Nodes (12): closeE2eApp(), createDefaultE2eConfigOptions(), createE2eApp(), withE2eApp(), createAnthropicRequestBody(), E2E_ANTHROPIC_USER_MESSAGE, E2E_GATEWAY_KEY, E2E_INVALID_GATEWAY_KEY (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (13): ApiGatewayModelsErrorResponses, ModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (11): ConfigGeneratorService, Injectable, FileManagerService, Injectable, WizardRunResult, EnvTemplateInput, generateEnvTemplate(), isEnvInputRedisRequired() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (11): SseMetaPayload, ProviderTestOptions, Option, CliAiModel, ModelAlias, ProviderInstanceId, MissingProviderApiKey, NoopAppMetricsAdapter (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (18): DEFAULT_MODELS, CliAiProvider, ModelPromptResult, BasicServerAnswers, CacheAnswers, MetricsAnswers, RateLimitAnswers, RedisAnswers (+10 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (13): AppModule, Module, bootstrap(), ProviderInstancesBootstrap, Injectable, PORT, setupApp(), exportOpenApi() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (25): createMockLoggingService(), healthyReadinessConfig, adaptApiKeyProviderFactory(), createAnthropicProvider(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider(), ApiKeyProviderFactoryFn (+17 more)

### Community 23 - "Community 23"
Cohesion: 0.06
Nodes (33): 1. Sklonuj repozytorium, 2. Konfiguracja, 3. Walidacja (zalecane przed deployem), 4. Sieć Docker, 5. Deploy, 6. Weryfikacja, Checklist produkcyjny, „Configuration validation failed” / boilerplate detected (+25 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (18): CACHE_BACKEND_TYPE, ConfigFlat, ConfigRoot, Nullable, TestCacheConfigOptions, TestGatewayKeyRuntimeOptions, TestRateLimitConfigOptions, TestRedisConfigOptions (+10 more)

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (11): ApiAnthropicErrorResponses(), AnthropicErrorBodyDto, AnthropicErrorResponseDto, ApiProperty, AnthropicModelDto, AnthropicModelsListResponseDto, ApiProperty, ANTHROPIC_STREAM_API_DESCRIPTION (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (28): dependencies, @anthropic-ai/sdk, boxen, chalk, class-transformer, class-validator, @google/genai, helmet (+20 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (10): ChatModule, Module, AnthropicModule, Module, OpenAiExceptionFilter, Catch, OpenAiModule, Module (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (19): AnthropicMessagesRequestDto, AnthropicThinkingDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (28): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, fast-check, globals (+20 more)

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (14): convertRateLimit(), ClientBasicAnswers, ClientPromptResult, RateLimitAnswers, generateGatewayConfigTemplate(), buildClientRateLimitConfig(), asClientId(), asMaxConcurrentStreams() (+6 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (23): ApiOpenAiErrorResponses(), OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader (+15 more)

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (26): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+18 more)

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (9): OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString, MaxLength (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.04
Nodes (56): scripts, build, build:cli, cli, config:validate, deploy:mvp, deploy:production, deploy:staging (+48 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (13): ChatController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, ApiSecurity, ApiTags (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (29): Bez buildu projektu, `gateway client:add`, `gateway client:edit <clientId>`, `gateway client:list`, `gateway client:remove <clientId>`, `gateway config:init`, `gateway config:show`, `gateway config:validate` (+21 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (30): CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema, convertClient(), convertProvider(), GatewayClientSchema, parseWizardState(), WizardStateSchema (+22 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (6): KeyGenerateCommand, KeyType, Command, Option, KeyGeneratorService, Injectable

### Community 39 - "Community 39"
Cohesion: 0.13
Nodes (24): fromGatewayToolCallDto(), asMessageId(), MessageId, AnthropicContentBlock, AnthropicContentBlockDto, AnthropicMessagesResponseDto, AnthropicMessagesUsageDto, AnthropicTextContentBlockDto (+16 more)

### Community 40 - "Community 40"
Cohesion: 0.39
Nodes (8): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (21): IsPrimitiveMetadataRecord, ChatRequestDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsObject (+13 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (20): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthReadinessChecksDto, HealthReadinessResponseDto, ApiProperty, HealthRedisCheckItemDto, ApiProperty (+12 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (12): ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional, GatewayModelCapabilitiesDto, GatewayModelDto, ApiProperty, ApiPropertyOptional (+4 more)

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (11): ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body, Post (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (16): ChatService, Injectable, ChatCacheGuardService, Injectable, ChatErrorHandlerService, Injectable, ChatProviderCallService, Injectable (+8 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (14): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (19): OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (24): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asWarningCode(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions(), mapResponseFormatToChatCompletion() (+16 more)

### Community 49 - "Community 49"
Cohesion: 0.07
Nodes (29): Dokumentacja API — AI Provider Gateway, Extended Thinking Mode, Fasady integracji (IDE), Format błędów, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models` — katalog aliasów (+21 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (5): GatewayClient, EnvPatchValue, LEGACY_PROVIDER_API_KEY_ENV, EnvRef, MissingProviderBaseUrl

### Community 51 - "Community 51"
Cohesion: 0.19
Nodes (11): GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsOptional, IsString, GatewayToolDefinitionDto, ApiProperty, ApiPropertyOptional (+3 more)

### Community 52 - "Community 52"
Cohesion: 0.09
Nodes (23): ChatOutputTextDto, ApiProperty, ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString (+15 more)

### Community 53 - "Community 53"
Cohesion: 0.09
Nodes (22): Anty-wzorce, Best practices, `brand()` i `unbrand()`, `Brand<K, T>`, Brand types — przewodnik dla developerów, `ConversationId`, Faza 1 — security-critical, Faza 2 — identifiers & tracking (+14 more)

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (21): Autoryzacja, Błędy, Endpointy, Integracja Anthropic Messages API (Claude Code), Konfiguracja (Claude Code i inne klienty), Mapowanie na gateway, Mapowanie treści wiadomości, Natywne API (bez zmian) (+13 more)

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (12): mapChatResponseToOpenAi(), mapFinishReasontoOpenAI(), mapGatewayToolCallsToOpenAi(), mapSystemFingerprintToOpenAi(), toOpenAiCompletionId(), baseChunkFields(), buildToolCallsDelta(), chunkLine() (+4 more)

### Community 56 - "Community 56"
Cohesion: 0.09
Nodes (20): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+12 more)

### Community 57 - "Community 57"
Cohesion: 0.09
Nodes (22): AI Provider Gateway (NestJS), Auth i limity, Cache odpowiedzi, Chat (wymaga `X-Gateway-Key`), Dokumentacja, Dystrybucja, Endpointy (przykłady), Extended Thinking Mode (reasoning models) (+14 more)

### Community 58 - "Community 58"
Cohesion: 0.15
Nodes (25): FIXTURES_DIR, CliRateLimit, createRequestId(), isAttemptNumber(), isBaseUrl(), isCacheTtlSeconds(), isConversationId(), isFiniteNumber() (+17 more)

### Community 59 - "Community 59"
Cohesion: 0.10
Nodes (21): CreateTestGatewayConfigOptions, TEST_CACHE_KEY, TEST_CACHED_CONVERSATION_ID, TEST_CACHED_REQUEST_ID, TEST_CACHED_RESPONSE_ID, TEST_COST_USD, TEST_FALLBACK_MODEL_ALIAS, TEST_GATEWAY_KEY_BRANDED (+13 more)

### Community 60 - "Community 60"
Cohesion: 0.39
Nodes (6): clamp(), isOverrideKey(), resolveProviderCallOptions(), OVERRIDE_KEYS, OverrideKey, GatewayParamsConfig

### Community 62 - "Community 62"
Cohesion: 0.11
Nodes (19): 0) Pierwsze uruchomienie (wizard konfiguracji), 1) Sekrety i env (`.env`), 2) Plik `gateway.config.yaml` (modele / instancje / polityki), 3) Walidacja i fail-fast, 4) Nadpisywanie parametrów per request, 5) Profile środowiskowe (opcjonalnie), 6) Pliki system promptu (`src/config/system-prompt/`), Cache odpowiedzi i Redis (opcjonalnie) (+11 more)

### Community 63 - "Community 63"
Cohesion: 0.38
Nodes (10): nameLooksLikeTimeout(), readErrorMessage(), readNumericStatus(), mapAnthropicSdkError(), mapGoogleGenAiError(), MappedProviderError, payloadOf(), toHttpException() (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.11
Nodes (12): ClientManagerService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, EnvPatchService, Injectable, ProviderManagerService (+4 more)

### Community 65 - "Community 65"
Cohesion: 0.19
Nodes (15): buildAppProviderMetricsContext(), buildLlmMetricsContext(), mapProviderResponseToAiObservation(), mapProviderResponseToUsage(), toMetricsMessages(), buildProviderInputForAlias(), resolvedPrompts, toProviderTurns() (+7 more)

### Community 67 - "Community 67"
Cohesion: 0.10
Nodes (28): result, collectInactiveProviderWarnings(), formatZodIssues(), expectEnvRef(), validateGatewayConfig(), ValidationOptions, assertMasterKeyPresent(), buildAppConfiguration() (+20 more)

### Community 68 - "Community 68"
Cohesion: 0.15
Nodes (12): author, bin, gateway, description, license, name, private, typeCoverage (+4 more)

### Community 69 - "Community 69"
Cohesion: 0.11
Nodes (18): Autoryzacja — dwa poziomy, Błędy i filtry, Fasada ≠ provider runtime, Fasady integracji (IDE) — AI Provider Gateway, Filozofia, Klucze klientów (frontend / IDE → gateway), Klucze providerów (gateway → LLM), Limity walidacji ingress (`validateChatIngress`) (+10 more)

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (16): ApiHeader, AnthropicMessagesController, AnthropicAuth, ApiAnthropicErrorResponses, ApiBody, ApiOperation, ApiProduces, ApiRequestIdHeader (+8 more)

### Community 71 - "Community 71"
Cohesion: 0.11
Nodes (36): CachedChatResponse, CachedChatResponseWithConversation, ChatResponseData, toChatResponseDto(), ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional (+28 more)

### Community 72 - "Community 72"
Cohesion: 0.17
Nodes (12): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, moduleNameMapper, rootDir, testEnvironment, testPathIgnorePatterns (+4 more)

### Community 73 - "RedisConnectionService"
Cohesion: 0.21
Nodes (7): DEFAULT_HTTP_STATUS_TO_CODE, GlobalExceptionFilter, isPayloadTooLargeError(), PayloadTooLargeError, RequestWithId, Catch, Injectable

### Community 74 - "Community 74"
Cohesion: 0.12
Nodes (16): 10) Uruchomienie bez wymaganego klucza API, 11) Mylenie kodów limitów (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`), 12) Cache odpowiedzi bez świadomości “świeżości”, 13) Mylenie trzech kontraktów API (natywny vs fasady IDE), 14) CLI zależne od `ConfigModule` (deadlock konfiguracji), 15) Start serwera bez właściwego pliku konfiguracyjnego, 1) “Open proxy” przez nadmierną konfigurowalność, 2) Sekrety w logach (+8 more)

### Community 75 - "Community 75"
Cohesion: 0.12
Nodes (17): 1) Gateway, nie “open proxy”, 2) Modele jako aliasy (preferowane), 3) Dwa tryby wykonania: standard i streaming, 4) Walidacja na brzegu, 5) Testowalność, Cel produktu, Dla kogo jest system, Dokumentacja koncepcyjna — AI Provider Gateway (+9 more)

### Community 76 - "Community 76"
Cohesion: 0.17
Nodes (12): EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString (+4 more)

### Community 77 - "Community 77"
Cohesion: 0.31
Nodes (11): getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromConfig(), isRedisRequiredFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement(), shouldConnectRedis() (+3 more)

### Community 78 - "ConsoleLoggerAdapter"
Cohesion: 0.11
Nodes (8): HttpMetricsMiddleware, Injectable, AppRequestMethod, AppRequestStatus, HealthMetricsSnapshot, HttpMethod, HttpRequestLabels, RateLimitReason

### Community 79 - "Community 79"
Cohesion: 0.12
Nodes (15): Architektura API — AI Provider Gateway, Auth, Błędy HTTP, Idempotencja, retry i fallback, Identyfikacja modeli (aliasy), Konwencje odpowiedzi sukcesu (standard), Natywny kontrakt (rdzeń), Opcjonalne śledzenie rozmowy (`conversationId`) (+7 more)

### Community 80 - "HealthService"
Cohesion: 0.12
Nodes (16): ApiErrorCode, ApiErrorPayload, UnsupportedProviderException, MockConfigServiceOptions, mapOpenAiMessagesToGateway(), mapOpenAiToolCalls(), mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice() (+8 more)

### Community 81 - "Community 81"
Cohesion: 0.12
Nodes (15): OpenAiChatCompletionsController, ApiBody, ApiOpenAiErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+7 more)

### Community 82 - "Community 82"
Cohesion: 0.13
Nodes (21): createMockStreamResult(), textStream(), asSystemFingerprint(), ProviderToolResultTurn, ChatCompletionsAdapterOptions, ChatCompletionMessageParam, mapAssistantTurn(), mapTurnsToOpenAiMessages() (+13 more)

### Community 83 - "Community 83"
Cohesion: 0.12
Nodes (15): Cache a metryki, Cel, Dwa tryby logowania w Sentry, FAQ, Konfiguracja Sentry, Kontrakt API, Logowanie konwersacji od drugiej wiadomości (zalecany przepływ), Obowiązek klienta przy starcie od tury 2 (+7 more)

### Community 85 - "Community 85"
Cohesion: 0.11
Nodes (6): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppProviderStreamScope, AppRequestLabels, AppTokenUsage

### Community 86 - "create-openai-integration-app.ts"
Cohesion: 0.23
Nodes (13): buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext, INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED, INTEGRATION_OPENAI_MODEL_ID_BRANDED, INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED (+5 more)

### Community 87 - "Community 87"
Cohesion: 0.17
Nodes (12): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+4 more)

### Community 88 - "getAppConfig"
Cohesion: 0.16
Nodes (12): resolveClientIdFromKey(), enrichRequestWithClientId(), AnthropicAuth(), AnthropicExceptionFilter, Catch, AnthropicApiKeyGuard, readAnthropicApiKey(), Injectable (+4 more)

### Community 89 - "Community 89"
Cohesion: 0.12
Nodes (16): Anthropic — `@anthropic-ai/sdk`, Cel / problem, Google Gemini — `@google/genai` (1.52+), Klucze API (env), Kryteria akceptacji, Model runtime (multi-instance), Notatki implementacyjne — mapowanie SDK, OpenAI — `@openai/openai` (6.x) (+8 more)

### Community 90 - "chat-stream.controller.ts"
Cohesion: 0.15
Nodes (10): ChatStreamController, ApiSecurity, ApiTags, Controller, GatewayKeyAndSmartRateLimit, toChatResponseDtoFromCache(), CHAT_STREAM_API_DESCRIPTION, SseSerializer (+2 more)

### Community 91 - "Community 91"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 92 - "Community 92"
Cohesion: 0.08
Nodes (17): Header, OTHER_CLIENT, TEST_CLIENT, AppMetricsService, TEST_CLIENT, Inject, Injectable, APP_METRICS_BACKEND (+9 more)

### Community 93 - "Community 93"
Cohesion: 0.13
Nodes (15): Autoryzacja, Błędy, Endpointy, Fasada kontraktu OpenAI (Cursor IDE), Konfiguracja w Cursor, Natywne API (bez zmian), Odpowiedź (`chat.completion`), Ograniczenia (+7 more)

### Community 94 - "Community 94"
Cohesion: 0.12
Nodes (17): Anthropic Messages API *(Claude Code — x-api-key)* — **wdrożone**, Chat *(wymaga `X-Gateway-Key`)*, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models/:modelAlias`, `GET /metrics`, Health *(publiczne)* (+9 more)

### Community 95 - "Community 95"
Cohesion: 0.09
Nodes (41): asOutputTokens(), asPromptCacheCreationTokens(), ContentBlockParam, mapAssistantTurn(), mapToolsToAnthropic(), mapTurnsToAnthropicMessages(), Message, MessageParam (+33 more)

### Community 96 - "Community 96"
Cohesion: 0.40
Nodes (4): distEntry, fs, path, tsEntry

### Community 97 - "create-security-app.ts"
Cohesion: 0.16
Nodes (13): CreateE2eAppOptions, E2eAppContext, E2eProviderRegistryMock, nativeChatBody, closeSecurityApp(), createSecurityApp(), CreateSecurityAppOptions, SecurityAppContext (+5 more)

### Community 98 - "Community 98"
Cohesion: 0.13
Nodes (14): Cel / problem, Envelope błędów, Gateway Key (nagłówek `X-Gateway-Key`), Kryteria akceptacji (checklista), Logowanie, Poza zakresem (względem rdzenia MVP), Request ID, Scenariusz A — uruchomienie lokalne (+6 more)

### Community 99 - "Community 99"
Cohesion: 0.39
Nodes (7): resolveGateway(), createEmptyTestGatewayConfig(), createTestGatewayConfig(), defaultGatewayConfig(), GatewayModelOverrides, mergeModels(), mergeProviders()

### Community 100 - "Community 100"
Cohesion: 0.50
Nodes (3): exclude, extends, include

### Community 107 - "isOpenAiProviderType"
Cohesion: 0.25
Nodes (9): StreamOnceParams, SseEvent, KeyGenerateOptions, ClientId, RequestId, Express, Request, ActiveStreamsTracker (+1 more)

### Community 108 - "Agent Instructions"
Cohesion: 0.15
Nodes (12): 1. Source Code (`@src`), 2. Knowledge Graph (`@graphify-out`), 3. API Specification (`@openapi.json`), 4. Documentation (`@docs/`), Agent Instructions, Context Priority Hierarchy, Example 1: Implementing a new feature, Example 2: Debugging an issue (+4 more)

### Community 109 - "Architektura — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): Architektura — AI Provider Gateway, Bezpieczeństwo (przegląd), Cel dokumentu, CLI — izolacja od runtime HTTP, Konfiguracja i sekrety, Moduły (bounded areas — rdzeń funkcjonalny), Observability, Struktura repo (orientacyjnie) (+5 more)

### Community 110 - "Słownik (dictionary) — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): Brand types (TypeScript), Fasada vs provider runtime, Kody błędów (stabilne), Kody HTTP (mapowanie), Kody ostrzeżeń (warnings), Macierz odpowiedzialności (OpenAI), Mapowanie parametrów na providerów, Parametry generacji (rozszerzenia C0-C7) (+5 more)

### Community 112 - "SPEC — Chat (standard) — `POST /chat`"
Cohesion: 0.17
Nodes (11): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — prosta rozmowa, Scenariusz C — powtórzone zapytanie z cache, Scenariusz D — wieloturowa rozmowa z metrykami Sentry, SPEC — Chat (standard) — `POST /chat`, Użytkownicy i scenariusze (+3 more)

### Community 113 - "Testy — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): CI / lokalnie, Czego testy E2E nie obejmują, Infrastruktura E2E, Kody HTTP w E2E (201 vs 200), Obszary pokrycia, Pliki spec, Przegląd, Testy — AI Provider Gateway (+5 more)

### Community 114 - "SPEC — Chat (streaming) — `POST /chat/stream`"
Cohesion: 0.18
Nodes (10): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — streaming w UI, Scenariusz B — provider bez streamingu, SPEC — Chat (streaming) — `POST /chat/stream`, Użytkownicy i scenariusze, Warunki wstępne (env) (+2 more)

### Community 115 - "Security Policy"
Cohesion: 0.18
Nodes (11): Fasady a routing do LLM, Fasady HTTP a klucze vendorów (ważne semantycznie), Gateway keys (klienci → gateway), Gateway NIE JEST open proxy, Klucze API — best practices, Provider keys (gateway → LLM), Scope, Security Policy (+3 more)

### Community 116 - "SPEC — Health (liveness/readiness)"
Cohesion: 0.20
Nodes (9): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — local dev, Scenariusz B — orchestrator, SPEC — Health (liveness/readiness), Użytkownicy i scenariusze, Wymagania funkcjonalne (+1 more)

### Community 117 - "SPEC — Konfiguracja (plug&play)"
Cohesion: 0.20
Nodes (9): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — minimalna konfiguracja, Scenariusz B — konfiguracja dwóch providerów + streaming, SPEC — Konfiguracja (plug&play), Użytkownicy i scenariusze, Wymagania funkcjonalne (+1 more)

### Community 118 - "Przepływ danych (data flow) — AI Provider Gateway"
Cohesion: 0.22
Nodes (8): 0. Wspólny szkielet: walidacja, wybór modelu, 1. Standard `POST /api/v1/chat` — sukces (201), 2. Standard `POST /api/v1/chat` — błąd, 3. Streaming `POST /api/v1/chat/stream` — sukces (SSE), 4. Fasada OpenAI — `POST /api/v1/openai/chat/completions`, 5. Fasada Anthropic — `POST /api/v1/anthropic/messages`, Legenda uczestników, Przepływ danych (data flow) — AI Provider Gateway

### Community 119 - "Adapter OpenAI (provider runtime)"
Cohesion: 0.22
Nodes (9): Adapter OpenAI (provider runtime), Chat Completions, Kiedy adapter jest używany, Konfiguracja, Mapowanie SDK, Powiązane dokumenty, Responses API, Rola adaptera (+1 more)

### Community 120 - "app.module.ts"
Cohesion: 0.15
Nodes (11): RequestIdMiddleware, Injectable, HealthModule, Module, IntegrationsModule, Module, ProviderRegistryModule, Global (+3 more)

### Community 121 - "ClientManagerService"
Cohesion: 0.19
Nodes (5): RedisConnectionService, Injectable, Inject, LoggingService, Injectable

### Community 122 - "e2e-provider-registry.ts"
Cohesion: 0.24
Nodes (15): TEST_INPUT_TOKENS_SMALL, TEST_MODEL_ID, TEST_OUTPUT_TOKENS_SMALL, buildResolvedConfig(), capabilities(), createDefaultCompleteResponse(), createDefaultParams(), createE2eFallbackProviderRegistry() (+7 more)

### Community 123 - "Testy integracyjne (live SDK + Redis)"
Cohesion: 0.29
Nodes (6): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 124 - "Architektura katalogów i plików"
Cohesion: 0.33
Nodes (6): 1) Drzewo repozytorium, 2) Opis katalogów (odpowiedzialności), 2a) CLI — izolacja runtime, 3) Stan wdrożenia vs dokumentacja, Architektura katalogów i plików, Notatki robocze (katalog główny, opcjonalnie)

### Community 125 - "Komendy — providery"
Cohesion: 0.33
Nodes (6): `gateway provider:add`, `gateway provider:edit <instanceId>`, `gateway provider:list`, `gateway provider:remove <instanceId>`, `gateway provider:test [instanceId]`, Komendy — providery

### Community 126 - "Dokumentacja — AI Provider Gateway"
Cohesion: 0.40
Nodes (5): Dokumentacja — AI Provider Gateway, Dystrybucja i kontrybucje (upstream), Jak czytać tę dokumentację, Specyfikacje (SDD), Spis plików

### Community 127 - "Specyfikacje (Spec‑Driven Development)"
Cohesion: 0.50
Nodes (3): Jak czytać te pliki, Obszary, Specyfikacje (Spec‑Driven Development)

### Community 136 - "Faza 1: Application Metrics (Prometheus) — 📋 PENDING"
Cohesion: 0.16
Nodes (21): DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, defaultModelPolicy(), ModelEditField, buildDefaultModelCapabilities(), buildDefaultModelPolicy() (+13 more)

### Community 138 - "Faza 0: Rename i Reorganizacja (AI Metrics) — 📋 PENDING"
Cohesion: 0.17
Nodes (13): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+5 more)

### Community 139 - "create-anthropic-provider.ts"
Cohesion: 0.22
Nodes (9): ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic(), resolveAnthropicOutputConfig(), mapToolChoiceToAnthropic() (+1 more)

### Community 140 - "createMockConfigService"
Cohesion: 0.25
Nodes (11): test, initService(), createMockCacheBackend(), createMockConfigService(), getByPath(), CreateNoOpCacheBackend(), initService(), initGuard() (+3 more)

### Community 141 - "wait-for-redis.ts"
Cohesion: 0.25
Nodes (9): flushIntegrationRedisDb(), loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions (+1 more)

### Community 142 - "rate-limit-bypass.security-spec.ts"
Cohesion: 0.23
Nodes (8): TEST_MAX_CONCURRENT_STREAMS, TEST_RATE_LIMIT_BURST, createE2eBurstRateLimiter(), createE2eSaturatedConcurrentStreamLimiter(), chatBody, createPerKeyBurstRateLimiter(), rateLimitEnabledConfig, SECOND_GATEWAY_KEY

### Community 143 - "anthropic-tools.mapper.ts"
Cohesion: 0.47
Nodes (6): mapAnthropicRequestToGateway(), AnthropicTool, mapAnthropicContentBlockToGateway(), mapAnthropicToolChoice(), mapAnthropicToolsToGateway(), TEST_TOOL

### Community 144 - "AppMetricsModule"
Cohesion: 0.29
Nodes (6): AppMetricsModule, Global, Module, RateLimitModule, RateLimitModuleOptions, Module

### Community 146 - "ResponseFormatDto"
Cohesion: 0.33
Nodes (6): ResponseFormatDto, ApiProperty, ApiPropertyOptional, IsIn, IsObject, IsOptional

### Community 147 - "openai-chat-message.dto.ts"
Cohesion: 0.53
Nodes (3): isTextContentItem(), normalizeOpenAiContent(), TextContentItem

### Community 148 - ".getOne"
Cohesion: 0.20
Nodes (4): alias(), asProviderInstanceId(), buildFactoryContext(), buildIntegrationGatewayModels()

### Community 149 - "CliModule"
Cohesion: 0.67
Nodes (3): bootstrap(), CliModule, Module

### Community 150 - "cached-chat-response.schema.ts"
Cohesion: 0.67
Nodes (3): CachedChatResponseSchema, ChatWarningSchema, parseCachedChatResponse()

### Community 151 - "prometheus.service.ts"
Cohesion: 0.15
Nodes (6): healthStatusToGaugeValue(), HealthComponent, HealthStatus, PrometheusService, Injectable, PrometheusMetrics

### Community 152 - "ChatToolingDto"
Cohesion: 0.50
Nodes (4): ChatToolingDto, IsArray, Type, ValidateNested

## Knowledge Gaps
- **721 isolated node(s):** `path`, `fs`, `distEntry`, `tsEntry`, `entrypoint.sh script` (+716 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `Community 34` to `createMockConfigService`, `Community 68`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `test` connect `createMockConfigService` to `Community 34`, `Community 5`, `Community 7`, `Community 11`, `Community 14`, `Community 16`, `Community 21`, `create-openai-integration-app.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `LoggingService` connect `ClientManagerService` to `Community 0`, `Community 4`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `createMockConfigService`, `create-anthropic-provider.ts`, `Community 14`, `Community 16`, `.getOne`, `Community 21`, `Community 22`, `Community 30`, `Community 41`, `Community 42`, `Community 45`, `Community 52`, `Community 56`, `RedisConnectionService`, `HealthService`, `Community 82`, `create-openai-integration-app.ts`, `Community 95`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `LoggingService` (e.g. with `initService()` and `initService()`) actually correct?**
  _`LoggingService` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `path`, `fs`, `distEntry` to the rest of the system?**
  _723 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05775638652350981 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05170441546556852 - nodes in this community are weakly interconnected._