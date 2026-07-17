# Graph Report - ai-provider-gateway  (2026-07-17)

## Corpus Check
- 517 files · ~204,912 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3011 nodes · 8808 edges · 142 communities (132 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76dafff9`
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
- Faza 2: Prometheus + Grafana (3-4 dni) — 📦 PRZENIESIONE
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
- Plan Production Readiness — AI Provider Gateway
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
- anthropic-models.mapper.ts
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
- rate-limit-bypass.security-spec.ts
- chat-params.dto.ts
- openai-chat-message.dto.ts
- prometheus.service.ts
- entrypoint.sh

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
- `createOpenAiIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-openai-integration-app.ts → src/app.module.ts
- `createE2eAppWithCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eApp()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/cache/adapters/redis-cache/redis-connection.service.ts

## Import Cycles
- 2-file cycle: `src/common/errors/provider-error.mapper.ts -> src/providers/openai/mappers/openai-error.mapper.ts -> src/common/errors/provider-error.mapper.ts`

## Communities (142 total, 10 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (51): ClientAddCommand, Command, ClientEditCommand, Command, ClientListCommand, Command, ClientRemoveCommand, Command (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (28): CreateE2eAppOptions, E2eAppContext, assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField() (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (27): asCostUsd(), CostUsd, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext() (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (8): ChatIngressProfile, alias(), GatewayKey, RateLimitModule, RateLimitModuleOptions, Module, SmartRateLimiterService, Injectable

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (15): test, AppModule, Module, createMockConfigService(), initGuard(), initGuard(), initGuard(), bootstrap() (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (12): HttpMetricsMiddleware, Injectable, healthStatusToGaugeValue(), AppRequestLabels, AppRequestStatus, HealthComponent, HealthMetricsSnapshot, HealthStatus (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (17): buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext, INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED, INTEGRATION_OPENAI_MODEL_ID_BRANDED, INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (16): Option, ProviderPromptResult, validateProviderApiKey(), defaultBaseUrlForOpenAiProviderType(), normalizeCliProviderBaseUrl(), validateCliProviderBaseUrl(), defaultProviderInstanceId(), asBaseUrl() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (38): CachedChatResponseSchema, ChatWarningSchema, parseCachedChatResponse(), mapProviderResponseToAiObservation(), asInputTokens(), asOutputTokens(), asSystemFingerprint(), asToolCallId() (+30 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (19): resolveGateway(), createEmptyTestGatewayConfig(), createTestGatewayConfig(), CreateTestGatewayConfigOptions, defaultGatewayConfig(), GatewayModelOverrides, mergeModels(), mergeProviders() (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (25): getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT, TEST_CONVERSATION_ID, createConversationId(), createRequestId(), isAttemptNumber() (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (7): ConfigInitCommand, Command, WizardState, Injectable, WizardOrchestratorService, Injectable, WizardStateManager

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (25): createAnthropicProvider(), buildGenerationConfig(), mapStopSequences(), mapThinkingBudgetToGeminiLevel(), extractFromLegacyFields(), extractFromThoughtParts(), extractGeminiThinkingContent(), GeminiLegacyThoughtFields (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (17): ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions, IntegrationAppContext, withIntegrationApp() (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (6): ProviderTestCommand, Command, ProviderTestService, Injectable, ValidationResult, GatewayConfig

### Community 16 - "Community 16"
Cohesion: 0.31
Nodes (10): closeE2eApp(), withE2eApp(), createAnthropicRequestBody(), E2E_ANTHROPIC_USER_MESSAGE, E2E_GATEWAY_KEY, E2E_INVALID_GATEWAY_KEY, E2E_OPENAI_MODEL_ALIAS_BRANDED, E2E_OPENAI_PROVIDER_INSTANCE_BRANDED (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (13): ApiGatewayModelsErrorResponses, ModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, ApiSecurity (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (10): ConfigGeneratorService, Injectable, FileManagerService, Injectable, WizardRunResult, EnvTemplateInput, generateEnvTemplate(), isEnvInputRedisRequired() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (7): ProviderTestOptions, CliAiModel, ModelAlias, ProviderInstanceId, NoopAppMetricsAdapter, Injectable, AppMetricsBackend

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (15): TEST_INPUT_TOKENS_SMALL, TEST_MODEL_ID, asMaxAttempts(), buildResolvedConfig(), capabilities(), createDefaultCompleteResponse(), createDefaultParams(), createE2eFallbackProviderRegistry() (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.19
Nodes (8): GatewayModelConfig, ProviderRegistryService, Injectable, gatewayConfig, openAiCompatibleProviders, NOTE: We can't use loadGatewayConfigFromFile() because it's globally mocked, closeOpenAiCompatibleIntegrationApp(), OpenAiCompatibleProviderTestConfig

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (24): createMockLoggingService(), ProviderInstanceRuntime, GatewayProviderInstanceConfig, adaptApiKeyProviderFactory(), createGoogleProvider(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider() (+16 more)

### Community 23 - "Community 23"
Cohesion: 0.05
Nodes (43): 1. Sklonuj repozytorium, 2. Konfiguracja, 3. Walidacja (zalecane przed deployem), 4. Sieć Docker, 5. Deploy, 6. Weryfikacja, Auto-rollback, Checklist produkcyjny (+35 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (19): LEVEL_RANK, SentryErrorReportingAdapter, Injectable, parseLogLevel(), ErrorReportingBackend, LoggerBackend, LoggerOptions, LogLevel (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (24): ChatModule, Module, INGRESS_LIMITS, validateChatIngress(), ApiErrorCode, createMockContext(), TEST_REQUEST_ID, assertNoFallbackCycle() (+16 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (28): dependencies, @anthropic-ai/sdk, boxen, chalk, class-transformer, class-validator, @google/genai, helmet (+20 more)

### Community 27 - "Community 27"
Cohesion: 0.14
Nodes (15): resolveClientIdFromKey(), ResolvedGatewayClient, getAppConfig(), enrichRequestWithClientId(), SmartRateLimitGuard, Injectable, AnthropicAuth(), AnthropicApiKeyGuard (+7 more)

### Community 28 - "Community 28"
Cohesion: 0.05
Nodes (50): ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength (+42 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (28): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, fast-check, globals (+20 more)

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (21): WIZARD_STEPS, WizardStep, CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema, convertClient(), convertModel(), convertProvider() (+13 more)

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
Cohesion: 0.19
Nodes (9): createStreamRequest(), StreamCleanupInterceptor, Injectable, createMockExpressRequest(), createMockExpressResponse(), readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey() (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (29): Bez buildu projektu, `gateway client:add`, `gateway client:edit <clientId>`, `gateway client:list`, `gateway client:remove <clientId>`, `gateway config:init`, `gateway config:show`, `gateway config:validate` (+21 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (23): TEST_MAX_ATTEMPTS, TEST_RETRY_ON_STATUS, TEST_TIMEOUT_MS, asModelId(), asProviderApiKey(), buildIntegrationConfigOptions(), buildIntegrationEnvRefs(), buildOpenAiCompatibleIntegrationConfigOptions() (+15 more)

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (15): SseDoneEvent, asMessageId(), MessageId, mapGatewayResponseToAnthropicFormat(), mapGatewayToolCallsToAnthropic(), mapGatewayFinishReasonToAnthropicStopReason(), AnthropicStreamState, createAnthropicStreamState() (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (11): ModelAddCommand, Command, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, EnvPatchService, Injectable, ModelManagerService (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.07
Nodes (36): IsPrimitiveMetadataRecord, ResponseCacheService, Injectable, ChatRequestDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize (+28 more)

### Community 42 - "Community 42"
Cohesion: 0.08
Nodes (24): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthLivenessResponseDto, ApiProperty, HealthReadinessChecksDto, HealthReadinessResponseDto, ApiProperty (+16 more)

### Community 43 - "Community 43"
Cohesion: 0.32
Nodes (9): convertRateLimit(), generateGatewayConfigTemplate(), buildClientRateLimitConfig(), asMaxConcurrentStreams(), asRateLimitBurst(), asRateLimitRps(), createServiceWithGatewayClients(), UNKNOWN_CLIENT_ID (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (16): ChatStreamController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+8 more)

### Community 45 - "Community 45"
Cohesion: 0.25
Nodes (7): createMockStreamResult(), textStream(), createMockAIProvider(), createMockProviderRegistryService(), createMockDefaultResolvedConfig(), TEST_PROMPT_CACHE_CREATION_TOKENS, TEST_PROMPT_CACHE_HIT_TOKENS

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (3): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable

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
Cohesion: 0.12
Nodes (21): CliAiProvider, EnvPatchValue, BasicServerAnswers, CacheAnswers, MetricsAnswers, RateLimitAnswers, RedisAnswers, SentryAnswers (+13 more)

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (15): ChatToolingDto, GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsArray, IsOptional, IsString, Type (+7 more)

### Community 52 - "Community 52"
Cohesion: 0.08
Nodes (28): ChatOutputTextDto, ApiProperty, ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString (+20 more)

### Community 53 - "Community 53"
Cohesion: 0.09
Nodes (22): Anty-wzorce, Best practices, `brand()` i `unbrand()`, `Brand<K, T>`, Brand types — przewodnik dla developerów, `ConversationId`, Faza 1 — security-critical, Faza 2 — identifiers & tracking (+14 more)

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (21): Autoryzacja, Błędy, Endpointy, Integracja Anthropic Messages API (Claude Code), Konfiguracja (Claude Code i inne klienty), Mapowanie na gateway, Mapowanie treści wiadomości, Natywne API (bez zmian) (+13 more)

### Community 55 - "Community 55"
Cohesion: 0.27
Nodes (13): fromGatewayToolCallDto(), mapChatResponseToOpenAi(), mapFinishReasontoOpenAI(), mapGatewayToolCallsToOpenAi(), mapSystemFingerprintToOpenAi(), toOpenAiCompletionId(), baseChunkFields(), buildToolCallsDelta() (+5 more)

### Community 56 - "Community 56"
Cohesion: 0.09
Nodes (20): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+12 more)

### Community 57 - "Community 57"
Cohesion: 0.08
Nodes (24): AI Provider Gateway (NestJS), Auth i limity, Cache odpowiedzi, Chat (wymaga `X-Gateway-Key`), Dokumentacja, Dystrybucja, Endpointy (przykłady), Extended Thinking Mode (reasoning models) (+16 more)

### Community 58 - "Community 58"
Cohesion: 0.15
Nodes (19): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), isRetryableHttpError(), AttemptResult, ResilientExecutionOptions, ResilientExecutionResult (+11 more)

### Community 59 - "Community 59"
Cohesion: 0.14
Nodes (20): MockConfigServiceOptions, TEST_CACHE_KEY, TEST_CACHE_TTL_CUSTOM, TEST_CACHE_TTL_SECONDS, TEST_CACHED_CONVERSATION_ID, TEST_CACHED_REQUEST_ID, TEST_CACHED_RESPONSE_ID, TEST_COST_USD (+12 more)

### Community 60 - "Community 60"
Cohesion: 0.48
Nodes (5): clamp(), isOverrideKey(), resolveProviderCallOptions(), OVERRIDE_KEYS, OverrideKey

### Community 61 - "Faza 2: Prometheus + Grafana (3-4 dni) — 📦 PRZENIESIONE"
Cohesion: 0.33
Nodes (9): AnthropicContentBlock, AnthropicContentBlockDto, AnthropicMessagesResponseDto, AnthropicMessagesUsageDto, AnthropicTextContentBlockDto, AnthropicThinkingContentBlockDto, AnthropicToolUseContentBlockDto, ApiProperty (+1 more)

### Community 62 - "Community 62"
Cohesion: 0.11
Nodes (19): 0) Pierwsze uruchomienie (wizard konfiguracji), 1) Sekrety i env (`.env`), 2) Plik `gateway.config.yaml` (modele / instancje / polityki), 3) Walidacja i fail-fast, 4) Nadpisywanie parametrów per request, 5) Profile środowiskowe (opcjonalnie), 6) Pliki system promptu (`src/config/system-prompt/`), Cache odpowiedzi i Redis (opcjonalnie) (+11 more)

### Community 63 - "Community 63"
Cohesion: 0.23
Nodes (12): ApiErrorPayload, nameLooksLikeTimeout(), readErrorMessage(), readNumericStatus(), mapAnthropicSdkError(), mapGoogleGenAiError(), MappedProviderError, payloadOf() (+4 more)

### Community 64 - "Community 64"
Cohesion: 0.19
Nodes (7): FIXTURES_DIR, deriveApiKeyRef(), deriveBaseUrlRef(), asEnvRef(), expectEnvRef(), providerRow(), buildOpenAiIntegrationProvidersYaml()

### Community 65 - "Community 65"
Cohesion: 0.12
Nodes (20): buildAppProviderMetricsContext(), buildLlmMetricsContext(), mapProviderResponseToUsage(), toMetricsMessages(), buildProviderInputForAlias(), resolvedPrompts, toProviderTurns(), composeSystemPrompt() (+12 more)

### Community 67 - "Community 67"
Cohesion: 0.11
Nodes (30): result, collectInactiveProviderWarnings(), formatZodIssues(), validateGatewayConfig(), ValidationOptions, assertMasterKeyPresent(), buildAppConfiguration(), buildEffectiveGatewayConfig() (+22 more)

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
Cohesion: 0.10
Nodes (45): CachedChatResponse, CachedChatResponseWithConversation, ChatResponseData, toChatResponseDto(), ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional (+37 more)

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
Cohesion: 0.08
Nodes (26): CACHE_BACKEND_TYPE, getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromConfig(), isRedisRequiredFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement() (+18 more)

### Community 77 - "Community 77"
Cohesion: 0.38
Nodes (8): ProviderInstancesBootstrap, Injectable, createInMemoryCacheBackend(), createDefaultE2eConfigOptions(), createE2eApp(), createE2eProviderBootstrapMock(), createE2eRedisConnectionMock(), E2eProviderRegistryMock

### Community 78 - "ConsoleLoggerAdapter"
Cohesion: 0.20
Nodes (9): AiMetricsModule, Global, Module, AppMetricsModule, Global, Module, ObservabilityModule, Global (+1 more)

### Community 79 - "Community 79"
Cohesion: 0.12
Nodes (15): Architektura API — AI Provider Gateway, Auth, Błędy HTTP, Idempotencja, retry i fallback, Identyfikacja modeli (aliasy), Konwencje odpowiedzi sukcesu (standard), Natywny kontrakt (rdzeń), Opcjonalne śledzenie rozmowy (`conversationId`) (+7 more)

### Community 80 - "HealthService"
Cohesion: 0.42
Nodes (5): mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice(), mapOpenAiToolsToGateway(), OpenAiFunctionTool, GatewayToolDefinition

### Community 81 - "Community 81"
Cohesion: 0.06
Nodes (41): ChatController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, ApiSecurity, ApiTags (+33 more)

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (3): KeyGenerateCommand, Command, Option

### Community 83 - "Community 83"
Cohesion: 0.12
Nodes (15): Cache a metryki, Cel, Dwa tryby logowania w Sentry, FAQ, Konfiguracja Sentry, Kontrakt API, Logowanie konwersacji od drugiej wiadomości (zalecany przepływ), Obowiązek klienta przy starcie od tury 2 (+7 more)

### Community 84 - "Plan Production Readiness — AI Provider Gateway"
Cohesion: 0.39
Nodes (8): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional

### Community 85 - "Community 85"
Cohesion: 0.13
Nodes (5): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppProviderStreamScope, AppTokenUsage

### Community 86 - "create-openai-integration-app.ts"
Cohesion: 0.67
Nodes (3): bootstrap(), CliModule, Module

### Community 87 - "Community 87"
Cohesion: 0.17
Nodes (12): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+4 more)

### Community 88 - "getAppConfig"
Cohesion: 0.09
Nodes (25): buildDefaultConfigSnapshot(), ConfigFlat, ConfigRoot, createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), getByPath(), Nullable, TestCacheConfigOptions (+17 more)

### Community 89 - "Community 89"
Cohesion: 0.12
Nodes (16): Anthropic — `@anthropic-ai/sdk`, Cel / problem, Google Gemini — `@google/genai` (1.52+), Klucze API (env), Kryteria akceptacji, Model runtime (multi-instance), Notatki implementacyjne — mapowanie SDK, OpenAI — `@openai/openai` (6.x) (+8 more)

### Community 90 - "chat-stream.controller.ts"
Cohesion: 0.10
Nodes (23): ApiAnthropicErrorResponses(), ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional, AnthropicErrorBodyDto, AnthropicErrorResponseDto (+15 more)

### Community 91 - "Community 91"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 92 - "Community 92"
Cohesion: 0.08
Nodes (19): Header, healthyReadinessConfig, initService(), OTHER_CLIENT, TEST_CLIENT, AppMetricsService, TEST_CLIENT, Inject (+11 more)

### Community 93 - "Community 93"
Cohesion: 0.13
Nodes (15): Autoryzacja, Błędy, Endpointy, Fasada kontraktu OpenAI (Cursor IDE), Konfiguracja w Cursor, Natywne API (bez zmian), Odpowiedź (`chat.completion`), Ograniczenia (+7 more)

### Community 94 - "Community 94"
Cohesion: 0.12
Nodes (17): Anthropic Messages API *(Claude Code — x-api-key)* — **wdrożone**, Chat *(wymaga `X-Gateway-Key`)*, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models/:modelAlias`, `GET /metrics`, Health *(publiczne)* (+9 more)

### Community 95 - "Community 95"
Cohesion: 0.10
Nodes (28): asPromptCacheCreationTokens(), asPromptCacheHitTokens(), ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic() (+20 more)

### Community 96 - "Community 96"
Cohesion: 0.40
Nodes (4): distEntry, fs, path, tsEntry

### Community 97 - "create-security-app.ts"
Cohesion: 0.23
Nodes (3): PinoLoggerAdapter, Injectable, LogContext

### Community 98 - "Community 98"
Cohesion: 0.13
Nodes (14): Cel / problem, Envelope błędów, Gateway Key (nagłówek `X-Gateway-Key`), Kryteria akceptacji (checklista), Logowanie, Poza zakresem (względem rdzenia MVP), Request ID, Scenariusz A — uruchomienie lokalne (+6 more)

### Community 100 - "Community 100"
Cohesion: 0.50
Nodes (3): exclude, extends, include

### Community 107 - "isOpenAiProviderType"
Cohesion: 0.16
Nodes (6): KeyGenerateOptions, ClientId, Express, Request, ActiveStreamsTracker, Injectable

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
Cohesion: 0.18
Nodes (9): RequestIdMiddleware, Injectable, IntegrationsModule, Module, ProviderRegistryModule, Global, Module, ProvidersModule (+1 more)

### Community 121 - "ClientManagerService"
Cohesion: 0.19
Nodes (5): RedisConnectionService, Injectable, Inject, LoggingService, Injectable

### Community 122 - "e2e-provider-registry.ts"
Cohesion: 0.33
Nodes (6): `gateway provider:add`, `gateway provider:edit <instanceId>`, `gateway provider:list`, `gateway provider:remove <instanceId>`, `gateway provider:test [instanceId]`, Komendy — providery

### Community 123 - "Testy integracyjne (live SDK + Redis)"
Cohesion: 0.29
Nodes (6): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 124 - "Architektura katalogów i plików"
Cohesion: 0.33
Nodes (6): 1) Drzewo repozytorium, 2) Opis katalogów (odpowiedzialności), 2a) CLI — izolacja runtime, 3) Stan wdrożenia vs dokumentacja, Architektura katalogów i plików, Notatki robocze (katalog główny, opcjonalnie)

### Community 126 - "Dokumentacja — AI Provider Gateway"
Cohesion: 0.40
Nodes (5): Dokumentacja — AI Provider Gateway, Dystrybucja i kontrybucje (upstream), Jak czytać tę dokumentację, Specyfikacje (SDD), Spis plików

### Community 127 - "Specyfikacje (Spec‑Driven Development)"
Cohesion: 0.50
Nodes (3): Jak czytać te pliki, Obszary, Specyfikacje (Spec‑Driven Development)

### Community 128 - "deploy-production.sh"
Cohesion: 0.28
Nodes (13): cmd_all(), cmd_health(), cmd_secrets(), cmd_sync(), cmd_up(), cmd_usage(), compose(), main() (+5 more)

### Community 129 - "deploy-staging.sh"
Cohesion: 0.40
Nodes (4): DEPLOY_DIR, DEPLOY_MODE, deploy-staging.sh script, VAULT_ENV

### Community 130 - "rollback.sh"
Cohesion: 0.52
Nodes (6): append_summary(), DEPLOY_MODE, fail_rollback(), rollback.sh script, SKIP_VAULT_FETCH, write_output()

### Community 136 - "Faza 1: Application Metrics (Prometheus) — 📋 PENDING"
Cohesion: 0.15
Nodes (20): DEFAULT_MODELS, DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, defaultModelPolicy(), ModelEditField, buildDefaultModelCapabilities() (+12 more)

### Community 138 - "Faza 0: Rename i Reorganizacja (AI Metrics) — 📋 PENDING"
Cohesion: 0.17
Nodes (13): AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader (+5 more)

### Community 142 - "rate-limit-bypass.security-spec.ts"
Cohesion: 0.25
Nodes (7): TEST_MAX_CONCURRENT_STREAMS, TEST_RATE_LIMIT_BURST, createE2eBurstRateLimiter(), createE2eSaturatedConcurrentStreamLimiter(), chatBody, rateLimitEnabledConfig, SECOND_GATEWAY_KEY

### Community 145 - "chat-params.dto.ts"
Cohesion: 0.21
Nodes (8): ResponseFormatDto, ApiProperty, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsStringOrArrayOfStrings(), IsThinkingBudget()

### Community 147 - "openai-chat-message.dto.ts"
Cohesion: 0.53
Nodes (3): isTextContentItem(), normalizeOpenAiContent(), TextContentItem

### Community 151 - "prometheus.service.ts"
Cohesion: 0.20
Nodes (3): PrometheusService, Injectable, PrometheusMetrics

## Knowledge Gaps
- **734 isolated node(s):** `path`, `fs`, `distEntry`, `tsEntry`, `entrypoint.sh script` (+729 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `Community 34` to `Community 68`, `Community 5`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `test` connect `Community 5` to `Community 34`, `Community 7`, `Community 41`, `Community 43`, `Community 77`, `Community 14`, `Community 56`, `Community 92`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `LoggingService` connect `ClientManagerService` to `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 13`, `Community 14`, `Community 21`, `Community 22`, `Community 24`, `Community 27`, `Community 37`, `Community 41`, `Community 42`, `Community 43`, `Community 45`, `Community 52`, `Community 56`, `Community 58`, `Community 59`, `Community 65`, `RedisConnectionService`, `Community 77`, `Community 92`, `Community 95`, `create-security-app.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `LoggingService` (e.g. with `initService()` and `initService()`) actually correct?**
  _`LoggingService` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `path`, `fs`, `distEntry` to the rest of the system?**
  _736 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05416666666666667 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09411764705882353 - nodes in this community are weakly interconnected._