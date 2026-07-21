# Graph Report - ai-provider-gateway  (2026-07-21)

## Corpus Check
- 543 files · ~247,769 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3427 nodes · 9460 edges · 161 communities (151 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1858aa17`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- asProviderInstanceId
- index.ts
- chat.service.ts
- ai-provider.interface.ts
- Community 7
- Community 8
- Community 9
- gateway-models-catalog.service.ts
- responses.adapter.ts
- cache.module.ts
- sentry-ai-metrics.adapter.ts
- configuration.ts
- provider-registry.service.ts
- chat-provider-call.service.ts
- Deployment Guide — AI Provider Gateway
- ModelAlias
- Community 19
- branded.types.ts
- configuration.types.ts
- config-generator.service.ts
- provider-instances.bootstrap.ts
- health.service.ts
- SmartRateLimiterService
- model-manager.service.ts
- anthropic-messages.controller.ts
- create-security-app.ts
- openai-params-provider.mapper.ts
- Community 30
- CLI.md
- Dokumentacja API — AI Provider Gateway
- dependencies
- devDependencies
- test-constants.ts
- chat-response.dto.ts
- swagger.setup.ts
- asGatewayKey
- compilerOptions
- PrometheusAppMetricsAdapter
- GatewayKey
- chat-stream.controller.ts
- AI Provider Gateway (NestJS)
- Brand types — przewodnik dla developerów
- ClientId
- getAppConfig
- api-error.code.ts
- Integracja Anthropic Messages API (Claude Code)
- AppMetricsService
- e2e-provider-registry.ts
- Community 51
- Community 52
- Community 53
- OpenAiChatCompletionRequestDto
- .createMessage
- README.md
- Fasady integracji (IDE) — AI Provider Gateway
- ProviderCallOptions
- .streamChat
- e2e-constants.ts
- Anty‑patterny / na co uważać — AI Provider Gateway
- Dokumentacja koncepcyjna — AI Provider Gateway
- Lista endpointów — AI Provider Gateway
- ChatToolingDto
- .completions
- app-metrics.service.ts
- .getOne
- deploy-production.sh
- Architektura API — AI Provider Gateway
- Śledzenie rozmów (`conversationId`)
- SPEC — Provider adapters (Anthropic / Google Gemini / OpenAI)
- app.module.ts
- .chat
- anthropic-stream.mapper.ts
- provider-error.mapper.ts
- .getOne
- app-metrics-backend.interface.ts
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
- anthropic.module.ts
- createTestGatewayConfig.ts
- configuration-validation.service.ts
- EnvironmentVariables
- SPEC — Chat (streaming) — `POST /chat/stream`
- MetricsController
- Security Policy
- env.validation.ts
- should-include-redis-stack.ts
- Community 101
- rate-limit-bypass.security-spec.ts
- SPEC — Health (liveness/readiness)
- SPEC — Konfiguracja (plug&play)
- health-readiness-response.dto.ts
- Przepływ danych (data flow) — AI Provider Gateway
- README.md
- Anti-patterns / what to watch for — AI Provider Gateway
- resolve-provider-call-options.ts
- Conceptual documentation — AI Provider Gateway
- OpenAiChatMessageDto
- provider-base-url.validation.ts
- rollback.sh
- nest-cli.json
- Endpoint list — AI Provider Gateway
- Testy integracyjne (live SDK + Redis)
- provider-registry.service.spec.ts
- API architecture — AI Provider Gateway
- openai-chat-message.dto.ts
- gateway-cli-wrapper.js
- deploy-staging.sh
- Conversation tracking (`conversationId`)
- AnthropicContentBlockDto
- AppMetricsBackend
- OpenAI contract facade (Cursor IDE)
- tsconfig.build.json
- entrypoint.sh
- generate-key.sh script
- MASTER_SYSTEM_PROMPT.md
- chat-default.md
- ollama-chat.md
- openai-chat-gpt.md
- configuration.ts
- Architecture — AI Provider Gateway
- Dictionary — AI Provider Gateway
- Testing — AI Provider Gateway
- chat-response-builder.service.spec.ts
- anthropic-response.mapper.ts
- anthropic-stream.mapper.ts
- Data flow — AI Provider Gateway
- OpenAI adapter (provider runtime)
- ChatResponseDto
- PrometheusService
- provider-instances.bootstrap.spec.ts
- Directory and file architecture
- Documentation — AI Provider Gateway
- openai-messages-provider.mapper.ts
- wait-for-redis.ts
- MetricsController
- anthropic-stream.mapper.ts
- NoopAppMetricsAdapter
- chat-completions.adapter.ts
- resolve-provider-call-options.ts
- openai-chat-completion-response.dto.ts

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 93 edges
2. `asProviderInstanceId()` - 87 edges
3. `ProviderInstanceId` - 75 edges
4. `ModelAlias` - 75 edges
5. `ApiErrorCode` - 61 edges
6. `asEnvRef()` - 61 edges
7. `scripts` - 59 edges
8. `ChatRequestDto` - 57 edges
9. `GatewayKey` - 57 edges
10. `asGatewayKey()` - 54 edges

## Surprising Connections (you probably didn't know these)
- `createE2eAppWithCache()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/app.module.ts
- `createE2eApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/app.module.ts
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts
- `createOpenAiIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-openai-integration-app.ts → src/app.module.ts
- `createE2eApp()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/cache/adapters/redis-cache/redis-connection.service.ts

## Import Cycles
- None detected.

## Communities (161 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (19): ProviderRegistryService, Injectable, ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (69): bootstrap(), CliModule, Module, ClientAddCommand, Command, ClientEditCommand, Command, ClientListCommand (+61 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (17): NoopErrorReportingAdapter, Injectable, SentryErrorReportingAdapter, Injectable, ErrorReportingBackend, LoggerBackend, isSentryEnabled(), LoggingModule (+9 more)

### Community 3 - "asProviderInstanceId"
Cohesion: 0.14
Nodes (19): EnvPatchService, Injectable, ProviderPromptResult, validateProviderApiKey(), countActiveModelsAfterProviderChange(), syncLegacyProviderApiKeysInEnv(), defaultBaseUrlForOpenAiProviderType(), normalizeCliProviderBaseUrl() (+11 more)

### Community 4 - "index.ts"
Cohesion: 0.14
Nodes (23): FIXTURES_DIR, RequestIdMiddleware, Injectable, createConversationId(), createRequestId(), isAttemptNumber(), isBaseUrl(), isCacheTtlSeconds() (+15 more)

### Community 5 - "chat.service.ts"
Cohesion: 0.13
Nodes (12): CachedChatResponse, SseMetaPayload, StreamOnceParams, ChatExecutionContext, ProviderCallContext, RateLimitCheckResult, CliAiModel, ConversationId (+4 more)

### Community 6 - "ai-provider.interface.ts"
Cohesion: 0.14
Nodes (20): asPromptCacheCreationTokens(), ContentBlockParam, mapAssistantTurn(), mapToolChoiceToAnthropic(), mapToolsToAnthropic(), mapTurnsToAnthropicMessages(), Message, MessageParam (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (19): AnthropicMessagesRequestDto, AnthropicThinkingDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (58): scripts, build, build:cli, cli, config:validate, deploy:mvp, deploy:production, deploy:staging (+50 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (5): ConfigInitCommand, Command, WizardState, generateEnvTemplate(), isEnvInputRedisRequired()

### Community 10 - "gateway-models-catalog.service.ts"
Cohesion: 0.09
Nodes (24): ApiGatewayModelsErrorResponses, ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional, ModelsController, ApiNotFoundResponse (+16 more)

### Community 11 - "responses.adapter.ts"
Cohesion: 0.15
Nodes (23): asInputTokens(), asOutputTokens(), asToolCallId(), parseGeminiResponseWithTools(), buildResponsesCreateParams(), mapGatewayMetadataToOpenAi(), extractResponsesToolCalls(), mapResponsesStopReason() (+15 more)

### Community 12 - "cache.module.ts"
Cohesion: 0.09
Nodes (21): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheModule, Module, CacheModule, CacheModuleOptions (+13 more)

### Community 13 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.10
Nodes (27): CostUsd, ToolCallId, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan(), applyObservationToSpan(), applyRequestMetadataContext() (+19 more)

### Community 14 - "configuration.ts"
Cohesion: 0.09
Nodes (27): result, isCachedChatAllowedForModelAlias(), collectInactiveProviderWarnings(), formatZodIssues(), expectEnvRef(), validateGatewayConfig(), ValidationOptions, buildEffectiveGatewayConfig() (+19 more)

### Community 15 - "provider-registry.service.ts"
Cohesion: 0.10
Nodes (22): ChatService, Injectable, ChatStreamController, ApiSecurity, ApiTags, Controller, GatewayKeyAndSmartRateLimit, SseMetaPayloadDto (+14 more)

### Community 16 - "chat-provider-call.service.ts"
Cohesion: 0.07
Nodes (37): ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength (+29 more)

### Community 17 - "Deployment Guide — AI Provider Gateway"
Cohesion: 0.05
Nodes (43): 1. Sklonuj repozytorium, 2. Konfiguracja, 3. Walidacja (zalecane przed deployem), 4. Sieć Docker, 5. Deploy, 6. Weryfikacja, Auto-rollback, Checklist produkcyjny (+35 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (27): Option, convertProvider(), MockConfigServiceOptions, createEmptyTestGatewayConfig(), createTestGatewayConfig(), CreateTestGatewayConfigOptions, defaultGatewayConfig(), GatewayModelOverrides (+19 more)

### Community 20 - "branded.types.ts"
Cohesion: 0.06
Nodes (36): Bez buildu projektu, Gateway CLI — dokumentacja, `gateway client:add`, `gateway client:edit <clientId>`, `gateway client:list`, `gateway client:remove <clientId>`, `gateway config:init`, `gateway config:show` (+28 more)

### Community 21 - "configuration.types.ts"
Cohesion: 0.10
Nodes (25): ApiOpenAiErrorResponses(), OpenAiModelsController, ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader (+17 more)

### Community 22 - "config-generator.service.ts"
Cohesion: 0.11
Nodes (8): ConfigGeneratorService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, FileManagerService, Injectable, ValidationFormatter

### Community 23 - "provider-instances.bootstrap.ts"
Cohesion: 0.20
Nodes (11): createMockLoggingService(), adaptApiKeyProviderFactory(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider(), ApiKeyProviderFactoryFn, ProviderFactoryFn, createChatCompletionsAdapter() (+3 more)

### Community 24 - "health.service.ts"
Cohesion: 0.10
Nodes (18): HealthLivenessResponseDto, ApiProperty, HealthReadinessResponseDto, ApiProperty, HealthController, ApiOkResponse, ApiOperation, ApiRequestIdHeader (+10 more)

### Community 25 - "SmartRateLimiterService"
Cohesion: 0.12
Nodes (25): createMockStreamResult(), textStream(), createMockContext(), TEST_CACHE_TTL_CUSTOM, TEST_CACHED_CONVERSATION_ID, TEST_CACHED_REQUEST_ID, TEST_CACHED_RESPONSE_ID, TEST_CONVERSATION_ID (+17 more)

### Community 26 - "model-manager.service.ts"
Cohesion: 0.17
Nodes (18): buildGenerationConfig(), createGoogleProvider(), mapStopSequences(), mapThinkingBudgetToGeminiLevel(), extractFromLegacyFields(), extractFromThoughtParts(), extractGeminiThinkingContent(), GeminiLegacyThoughtFields (+10 more)

### Community 27 - "anthropic-messages.controller.ts"
Cohesion: 0.09
Nodes (22): ChatModule, Module, DEFAULT_HTTP_STATUS_TO_CODE, GlobalExceptionFilter, isPayloadTooLargeError(), PayloadTooLargeError, RequestWithId, Catch (+14 more)

### Community 28 - "create-security-app.ts"
Cohesion: 0.14
Nodes (19): assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField(), NON_FUZZABLE_OBJECT_KEYS, VALID_USER_MESSAGE (+11 more)

### Community 29 - "openai-params-provider.mapper.ts"
Cohesion: 0.12
Nodes (25): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asJsonSchemaName(), asWarningCode(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions() (+17 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (14): RedisCacheAdapter, Injectable, RedisConnectionService, Injectable, Inject, TEST_CACHE_KEY, LoggingService, Injectable (+6 more)

### Community 31 - "CLI.md"
Cohesion: 0.08
Nodes (53): KeyType, WIZARD_STEPS, WizardStep, CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema, convertClient(), convertModel() (+45 more)

### Community 32 - "Dokumentacja API — AI Provider Gateway"
Cohesion: 0.15
Nodes (5): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppProviderStreamScope, AppTokenUsage

### Community 33 - "dependencies"
Cohesion: 0.07
Nodes (28): dependencies, @anthropic-ai/sdk, boxen, chalk, class-transformer, class-validator, @google/genai, helmet (+20 more)

### Community 34 - "devDependencies"
Cohesion: 0.07
Nodes (28): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, fast-check, globals (+20 more)

### Community 35 - "test-constants.ts"
Cohesion: 0.10
Nodes (26): test, buildDefaultConfigSnapshot(), ConfigFlat, ConfigRoot, createMockConfigService(), createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), getByPath() (+18 more)

### Community 36 - "chat-response.dto.ts"
Cohesion: 0.16
Nodes (27): CachedChatResponseWithConversation, ChatResponseData, toChatResponseDto(), toChatResponseDtoFromCache(), mapStopReasonToFinishReason(), CompleteOnceResult, StreamOnceResult, ProviderResponse (+19 more)

### Community 37 - "swagger.setup.ts"
Cohesion: 0.12
Nodes (19): ChatOutputTextDto, ApiProperty, ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString (+11 more)

### Community 38 - "asGatewayKey"
Cohesion: 0.13
Nodes (13): ChatController, ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, ApiSecurity, ApiTags (+5 more)

### Community 39 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+18 more)

### Community 40 - "PrometheusAppMetricsAdapter"
Cohesion: 0.09
Nodes (26): ApiAnthropicErrorResponses(), AnthropicModelsController, AnthropicAuth, ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam (+18 more)

### Community 41 - "GatewayKey"
Cohesion: 0.09
Nodes (19): cacheEnabledGatewayConfig, initService(), StreamCleanupInterceptor, Injectable, createMockResponseCacheService(), createMockSmartRateLimiter(), asConversationId(), ResolvedGatewayClient (+11 more)

### Community 42 - "chat-stream.controller.ts"
Cohesion: 0.07
Nodes (29): Dokumentacja API — AI Provider Gateway, Extended Thinking Mode, Fasady integracji (IDE), Format błędów, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models` — katalog aliasów (+21 more)

### Community 43 - "AI Provider Gateway (NestJS)"
Cohesion: 0.08
Nodes (24): AI Provider Gateway (NestJS), Auth i limity, Cache odpowiedzi, Chat (wymaga `X-Gateway-Key`), Dokumentacja / Documentation, Dystrybucja, Endpointy (przykłady), Extended Thinking Mode (reasoning models) (+16 more)

### Community 44 - "Brand types — przewodnik dla developerów"
Cohesion: 0.11
Nodes (26): buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs(), assertNoFallbackCycle(), alias1, fallback, myModel (+18 more)

### Community 45 - "ClientId"
Cohesion: 0.14
Nodes (14): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+6 more)

### Community 46 - "getAppConfig"
Cohesion: 0.05
Nodes (43): 1. Clone the repository, 2. Configuration, 3. Validation (recommended before deploy), 4. Docker network, 5. Deploy, 6. Verification, Adding a gateway client, Adding a model alias (+35 more)

### Community 47 - "api-error.code.ts"
Cohesion: 0.06
Nodes (36): Boilerplate configuration and commands, CLI layer — summary, CLI scope, Commands — clients, Commands — configuration, Commands — keys, Commands — models, Commands — providers (+28 more)

### Community 48 - "Integracja Anthropic Messages API (Claude Code)"
Cohesion: 0.09
Nodes (22): Anty-wzorce, Best practices, `brand()` i `unbrand()`, `Brand<K, T>`, Brand types — przewodnik dla developerów, Configuration & policy, `ConversationId`, Identifiers & tracking (+14 more)

### Community 49 - "AppMetricsService"
Cohesion: 0.13
Nodes (5): HttpMetricsMiddleware, Injectable, AppMetricsService, Injectable, HttpMethod

### Community 50 - "e2e-provider-registry.ts"
Cohesion: 0.10
Nodes (21): Autoryzacja, Błędy, Endpointy, Integracja Anthropic Messages API (Claude Code), Konfiguracja (Claude Code i inne klienty), Mapowanie na gateway, Mapowanie treści wiadomości, Natywne API (bez zmian) (+13 more)

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (19): 0) Pierwsze uruchomienie (wizard konfiguracji), 1) Sekrety i env (`.env`), 2) Plik `gateway.config.yaml` (modele / instancje / polityki), 3) Walidacja i fail-fast, 4) Nadpisywanie parametrów per request, 5) Profile środowiskowe (opcjonalnie), 6) Pliki system promptu (`src/config/system-prompt/`), Cache odpowiedzi i Redis (opcjonalnie) (+11 more)

### Community 52 - "Community 52"
Cohesion: 0.11
Nodes (24): AppModule, Module, asProviderApiKey(), GatewayConfigSchema, bootstrap(), PORT, setupApp(), createE2eLoggingServiceMock() (+16 more)

### Community 53 - "Community 53"
Cohesion: 0.27
Nodes (12): mapChatResponseToOpenAi(), mapFinishReasontoOpenAI(), mapGatewayToolCallsToOpenAi(), mapSystemFingerprintToOpenAi(), toOpenAiCompletionId(), baseChunkFields(), buildToolCallsDelta(), chunkLine() (+4 more)

### Community 54 - "OpenAiChatCompletionRequestDto"
Cohesion: 0.12
Nodes (19): OpenAiChatCompletionRequestDto, OpenAiStreamOptionsDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean (+11 more)

### Community 55 - ".createMessage"
Cohesion: 0.11
Nodes (16): ApiHeader, AnthropicMessagesController, AnthropicAuth, ApiAnthropicErrorResponses, ApiBody, ApiOperation, ApiProduces, ApiRequestIdHeader (+8 more)

### Community 57 - "Fasady integracji (IDE) — AI Provider Gateway"
Cohesion: 0.11
Nodes (18): Autoryzacja — dwa poziomy, Błędy i filtry, Fasada ≠ provider runtime, Fasady integracji (IDE) — AI Provider Gateway, Filozofia, Klucze klientów (frontend / IDE → gateway), Klucze providerów (gateway → LLM), Limity walidacji ingress (`validateChatIngress`) (+10 more)

### Community 58 - "ProviderCallOptions"
Cohesion: 0.07
Nodes (29): Alias configuration, API documentation — AI Provider Gateway, Basics, Bump rules, Codes and dictionary, Enabling thinking mode, Error format, Extended Thinking Mode (+21 more)

### Community 59 - ".streamChat"
Cohesion: 0.17
Nodes (11): ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body, Post (+3 more)

### Community 60 - "e2e-constants.ts"
Cohesion: 0.17
Nodes (21): closeE2eApp(), createDefaultE2eConfigOptions(), createE2eApp(), CreateE2eAppOptions, E2eAppContext, withE2eApp(), createAnthropicRequestBody(), E2E_ANTHROPIC_USER_MESSAGE (+13 more)

### Community 61 - "Anty‑patterny / na co uważać — AI Provider Gateway"
Cohesion: 0.12
Nodes (16): 10) Uruchomienie bez wymaganego klucza API, 11) Mylenie kodów limitów (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`), 12) Cache odpowiedzi bez świadomości “świeżości”, 13) Mylenie trzech kontraktów API (natywny vs fasady IDE), 14) CLI zależne od `ConfigModule` (deadlock konfiguracji), 15) Start serwera bez właściwego pliku konfiguracyjnego, 1) “Open proxy” przez nadmierną konfigurowalność, 2) Sekrety w logach (+8 more)

### Community 62 - "Dokumentacja koncepcyjna — AI Provider Gateway"
Cohesion: 0.12
Nodes (17): 1) Gateway, nie “open proxy”, 2) Modele jako aliasy (preferowane), 3) Dwa tryby wykonania: standard i streaming, 4) Walidacja na brzegu, 5) Testowalność, Cel produktu, Dalszy rozwój (opcjonalnie), Dla kogo jest system (+9 more)

### Community 63 - "Lista endpointów — AI Provider Gateway"
Cohesion: 0.12
Nodes (17): Anthropic Messages API *(Claude Code — x-api-key)*, Chat *(wymaga `X-Gateway-Key`)*, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models/:modelAlias`, `GET /metrics`, Health *(publiczne)* (+9 more)

### Community 64 - "ChatToolingDto"
Cohesion: 0.16
Nodes (15): ChatToolingDto, GatewayNamedToolChoiceDto, GatewayNamedToolChoiceFunctionDto, ApiPropertyOptional, IsArray, IsOptional, IsString, Type (+7 more)

### Community 65 - ".completions"
Cohesion: 0.18
Nodes (10): ApiBody, ApiOpenAiErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body, Post (+2 more)

### Community 66 - "app-metrics.service.ts"
Cohesion: 0.19
Nodes (10): healthStatusToGaugeValue(), AppRequestLabels, AppRequestMethod, AppRequestStatus, HealthComponent, HealthMetricsSnapshot, HealthStatus, HttpRequestLabels (+2 more)

### Community 67 - ".getOne"
Cohesion: 0.24
Nodes (15): TEST_INPUT_TOKENS_SMALL, TEST_MODEL_ID, TEST_PROVIDER_INSTANCE_BRANDED, buildResolvedConfig(), capabilities(), createDefaultCompleteResponse(), createDefaultParams(), createE2eFallbackProviderRegistry() (+7 more)

### Community 68 - "deploy-production.sh"
Cohesion: 0.28
Nodes (13): cmd_all(), cmd_health(), cmd_secrets(), cmd_sync(), cmd_up(), cmd_usage(), compose(), main() (+5 more)

### Community 69 - "Architektura API — AI Provider Gateway"
Cohesion: 0.12
Nodes (15): Architektura API — AI Provider Gateway, Auth, Błędy HTTP, Idempotencja, retry i fallback, Identyfikacja modeli (aliasy), Konwencje odpowiedzi sukcesu (standard), Natywny kontrakt (rdzeń), Opcjonalne śledzenie rozmowy (`conversationId`) (+7 more)

### Community 70 - "Śledzenie rozmów (`conversationId`)"
Cohesion: 0.12
Nodes (15): Cache a metryki, Cel, Dwa tryby logowania w Sentry, FAQ, Konfiguracja Sentry, Kontrakt API, Logowanie konwersacji od drugiej wiadomości (zalecany przepływ), Obowiązek klienta przy starcie od tury 2 (+7 more)

### Community 71 - "SPEC — Provider adapters (Anthropic / Google Gemini / OpenAI)"
Cohesion: 0.12
Nodes (16): Anthropic — `@anthropic-ai/sdk`, Cel / problem, Google Gemini — `@google/genai` (1.52+), Klucze API (env), Kryteria akceptacji, Model runtime (multi-instance), Notatki implementacyjne — mapowanie SDK, OpenAI — `@openai/openai` (6.x) (+8 more)

### Community 72 - "app.module.ts"
Cohesion: 0.29
Nodes (6): AiMetricsModule, Global, Module, ObservabilityModule, Global, Module

### Community 73 - ".chat"
Cohesion: 0.16
Nodes (10): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable, parseLogLevel(), LogContext (+2 more)

### Community 74 - "anthropic-stream.mapper.ts"
Cohesion: 0.18
Nodes (4): KeyGenerateOptions, ClientId, ActiveStreamsTracker, Injectable

### Community 75 - "provider-error.mapper.ts"
Cohesion: 0.23
Nodes (17): MappedProviderError, isAuthError(), isClientError(), isInvalidRequestStatus(), isProviderRateLimitError(), isRateLimitStatus(), isServerError(), isTimeoutStatus() (+9 more)

### Community 76 - ".getOne"
Cohesion: 0.17
Nodes (19): getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromConfig(), isRedisRequiredFromEnv(), RedisConsumer, RedisRequirementSnapshot, resolveCacheForRequirement() (+11 more)

### Community 77 - "app-metrics-backend.interface.ts"
Cohesion: 0.13
Nodes (15): Autoryzacja, Błędy, Endpointy, Fasada kontraktu OpenAI (Cursor IDE), Konfiguracja w Cursor, Natywne API (bez zmian), Odpowiedź (`chat.completion`), Ograniczenia (+7 more)

### Community 78 - "Community 78"
Cohesion: 0.35
Nodes (6): mapOpenAiMessagesToGateway(), mapOpenAiToolCalls(), mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice(), mapOpenAiToolsToGateway(), OpenAiFunctionTool

### Community 79 - "Community 79"
Cohesion: 0.13
Nodes (14): Cel / problem, Envelope błędów, Gateway Key (nagłówek `X-Gateway-Key`), Kryteria akceptacji (checklista), Logowanie, Poza zakresem (względem rdzenia MVP), Request ID, Scenariusz A — uruchomienie lokalne (+6 more)

### Community 80 - "Community 80"
Cohesion: 0.15
Nodes (13): Architektura — AI Provider Gateway, Bezpieczeństwo (przegląd), Cel dokumentu, CLI — izolacja od runtime HTTP, Konfiguracja i sekrety, Moduły (bounded areas — rdzeń funkcjonalny), Observability, Struktura repo (+5 more)

### Community 81 - "Community 81"
Cohesion: 0.15
Nodes (13): Brand types (TypeScript), Fasada vs provider runtime, Kody błędów (stabilne), Kody HTTP (mapowanie), Kody ostrzeżeń (warnings), Macierz odpowiedzialności (OpenAI), Mapowanie parametrów na providerów, Parametry generacji (rozszerzenia C0-C7) (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.15
Nodes (12): 1. Source Code (`@src`), 2. Knowledge Graph (`@graphify-out`), 3. API Specification (`@openapi.json`), 4. Documentation (`@docs/`), Agent Instructions, Context Priority Hierarchy, Example 1: Implementing a new feature, Example 2: Debugging an issue (+4 more)

### Community 83 - "Community 83"
Cohesion: 0.15
Nodes (13): CI / lokalnie, Czego testy E2E nie obejmują, Infrastruktura E2E, Kody HTTP w E2E (201 vs 200), Obszary pokrycia, Pliki spec, Przegląd, Testy — AI Provider Gateway (+5 more)

### Community 84 - "Community 84"
Cohesion: 0.09
Nodes (22): Anti-patterns, Best practices, `brand()` and `unbrand()`, `Brand<K, T>`, Brand types — developer guide, Code coverage, Configuration & policy, `ConversationId` (+14 more)

### Community 85 - "Community 85"
Cohesion: 0.17
Nodes (11): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — prosta rozmowa, Scenariusz C — powtórzone zapytanie z cache, Scenariusz D — wieloturowa rozmowa z metrykami Sentry, SPEC — Chat (standard) — `POST /chat`, Użytkownicy i scenariusze (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.15
Nodes (12): author, bin, gateway, description, license, name, private, typeCoverage (+4 more)

### Community 87 - "Community 87"
Cohesion: 0.23
Nodes (8): TEST_MAX_CONCURRENT_STREAMS, TEST_RATE_LIMIT_BURST, createE2eBurstRateLimiter(), createE2eSaturatedConcurrentStreamLimiter(), chatBody, createPerKeyBurstRateLimiter(), rateLimitEnabledConfig, SECOND_GATEWAY_KEY

### Community 88 - "Community 88"
Cohesion: 0.07
Nodes (32): IsPrimitiveMetadataRecord, ResponseCacheService, Injectable, CachedChatResponseSchema, ChatWarningSchema, parseCachedChatResponse(), mockExecutorChatSuccess(), mockStreamExecutorSuccess() (+24 more)

### Community 89 - "Community 89"
Cohesion: 0.10
Nodes (21): Anthropic Messages API integration (Claude Code), Authorization, Configuration (Claude Code and other clients), Differences from the full Anthropic API contract, Endpoints, Errors, Example (non-stream), Example (stream) (+13 more)

### Community 90 - "Community 90"
Cohesion: 0.10
Nodes (19): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+11 more)

### Community 91 - "Community 91"
Cohesion: 0.17
Nodes (12): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, moduleNameMapper, rootDir, testEnvironment, testPathIgnorePatterns (+4 more)

### Community 92 - "anthropic.module.ts"
Cohesion: 0.10
Nodes (21): createStreamRequest(), GatewayKeyAndSmartRateLimit(), createMockExpressRequest(), createMockExpressResponse(), TEST_GATEWAY_KEY_BRANDED, readClientGatewayKey(), readGatewayKeyHeader(), expectGatewayKey() (+13 more)

### Community 93 - "createTestGatewayConfig.ts"
Cohesion: 0.18
Nodes (10): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — streaming w UI, Scenariusz B — provider bez streamingu, SPEC — Chat (streaming) — `POST /chat/stream`, Użytkownicy i scenariusze, Warunki wstępne (env) (+2 more)

### Community 94 - "configuration-validation.service.ts"
Cohesion: 0.20
Nodes (9): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — local dev, Scenariusz B — orchestrator, SPEC — Health (liveness/readiness), Użytkownicy i scenariusze, Wymagania funkcjonalne (+1 more)

### Community 95 - "EnvironmentVariables"
Cohesion: 0.11
Nodes (13): CACHE_BACKEND_VALUES, EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional (+5 more)

### Community 96 - "SPEC — Chat (streaming) — `POST /chat/stream`"
Cohesion: 0.20
Nodes (9): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — minimalna konfiguracja, Scenariusz B — konfiguracja dwóch providerów + streaming, SPEC — Konfiguracja (plug&play), Użytkownicy i scenariusze, Wymagania funkcjonalne (+1 more)

### Community 97 - "MetricsController"
Cohesion: 0.18
Nodes (8): healthyReadinessConfig, initService(), OTHER_CLIENT, TEST_CLIENT, APP_METRICS_BACKEND, PreMetricsScrapeHook, PreMetricsScrapeRegistry, Injectable

### Community 98 - "Security Policy"
Cohesion: 0.10
Nodes (21): API keys — best practices, Client authentication, English, Facades and routing to the LLM, Fasady a routing do LLM, Fasady HTTP a klucze vendorów (ważne semantycznie), Gateway keys (clients → gateway), Gateway keys (klienci → gateway) (+13 more)

### Community 99 - "env.validation.ts"
Cohesion: 0.22
Nodes (8): 0. Wspólny szkielet: walidacja, wybór modelu, 1. Standard `POST /api/v1/chat` — sukces (201), 2. Standard `POST /api/v1/chat` — błąd, 3. Streaming `POST /api/v1/chat/stream` — sukces (SSE), 4. Fasada OpenAI — `POST /api/v1/openai/chat/completions`, 5. Fasada Anthropic — `POST /api/v1/anthropic/messages`, Legenda uczestników, Przepływ danych (data flow) — AI Provider Gateway

### Community 100 - "should-include-redis-stack.ts"
Cohesion: 0.19
Nodes (16): TEST_RETRY_ON_STATUS, buildOpenAiIntegrationConfigOptions(), closeOpenAiIntegrationApp(), createOpenAiIntegrationApp(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext, INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED, INTEGRATION_OPENAI_MODEL_ID_BRANDED (+8 more)

### Community 101 - "Community 101"
Cohesion: 0.22
Nodes (9): Adapter OpenAI (provider runtime), Chat Completions, Kiedy adapter jest używany, Konfiguracja, Mapowanie SDK, Powiązane dokumenty, Responses API, Rola adaptera (+1 more)

### Community 102 - "rate-limit-bypass.security-spec.ts"
Cohesion: 0.33
Nodes (6): 1) Drzewo repozytorium, 2) Opis katalogów (odpowiedzialności), 2a) CLI — izolacja runtime, 3) Zakres funkcji vs dokumentacja, Architektura katalogów i plików, Notatki robocze (katalog główny, opcjonalnie)

### Community 103 - "SPEC — Health (liveness/readiness)"
Cohesion: 0.33
Nodes (6): Dokumentacja — AI Provider Gateway, Dystrybucja i kontrybucje, Jak czytać tę dokumentację, Specyfikacje (SDD), Spis plików, Wybrane tematy

### Community 104 - "SPEC — Konfiguracja (plug&play)"
Cohesion: 0.50
Nodes (3): Jak czytać te pliki, Obszary, Specyfikacje (Spec‑Driven Development)

### Community 105 - "health-readiness-response.dto.ts"
Cohesion: 0.11
Nodes (19): 0) First run (configuration wizard), 1) Secrets and env (`.env`), 2) `gateway.config.yaml` file (models / instances / policies), 3) Validation and fail-fast, 4) Overriding parameters per request, 5) Environment profiles (optional), 6) System prompt files (`src/config/system-prompt/`), CLI vs configuration loading (+11 more)

### Community 106 - "Przepływ danych (data flow) — AI Provider Gateway"
Cohesion: 0.11
Nodes (18): Architecture view, Authorization — two levels, Client keys (frontend / IDE → gateway), Errors and filters, Facade ≠ provider runtime, Facade scope, File structure, Ingress validation limits (`validateChatIngress`) (+10 more)

### Community 108 - "Anti-patterns / what to watch for — AI Provider Gateway"
Cohesion: 0.12
Nodes (16): 10) Starting without a required API key, 11) Confusing rate-limit codes (`RATE_LIMITED` vs `PROVIDER_RATE_LIMITED`), 12) Response cache without awareness of “freshness”, 13) Confusing three API contracts (native vs IDE facades), 14) CLI dependent on `ConfigModule` (configuration deadlock), 15) Starting the server without a proper config file, 1) “Open proxy” through excessive configurability, 2) Secrets in logs (+8 more)

### Community 109 - "resolve-provider-call-options.ts"
Cohesion: 0.23
Nodes (7): createMockAIProvider(), createMockDefaultResolvedConfig(), ModelId, GatewayCapabilitiesConfig, AIProvider, RegisteredProviderInstance, ResolvedProviderConfig

### Community 110 - "Conceptual documentation — AI Provider Gateway"
Cohesion: 0.12
Nodes (17): 1) Gateway, not an “open proxy”, 2) Models as aliases (preferred), 3) Two execution modes: standard and streaming, 4) Edge validation, 5) Testability, Conceptual documentation — AI Provider Gateway, Functional scope (summary), Further development (optional) (+9 more)

### Community 111 - "OpenAiChatMessageDto"
Cohesion: 0.24
Nodes (9): ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, SseDonePayloadDto, SseDoneUsageDto, ApiPropertyOptional (+1 more)

### Community 112 - "provider-base-url.validation.ts"
Cohesion: 0.14
Nodes (13): ApiRequestIdHeader(), ApiErrorCode, ApiErrorPayload, UnsupportedProviderException, requireClientGatewayKey(), ANTHROPIC_STREAM_API_DESCRIPTION, mapAnthropicRequestToGateway(), AnthropicTool (+5 more)

### Community 113 - "rollback.sh"
Cohesion: 0.52
Nodes (6): append_summary(), DEPLOY_MODE, fail_rollback(), rollback.sh script, SKIP_VAULT_FETCH, write_output()

### Community 114 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 115 - "Endpoint list — AI Provider Gateway"
Cohesion: 0.12
Nodes (17): Anthropic Messages API *(Claude Code — x-api-key)*, Chat *(requires `X-Gateway-Key`)*, Endpoint list — AI Provider Gateway, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models/:modelAlias`, `GET /metrics` (+9 more)

### Community 116 - "Testy integracyjne (live SDK + Redis)"
Cohesion: 0.29
Nodes (6): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 117 - "provider-registry.service.spec.ts"
Cohesion: 0.09
Nodes (33): DEFAULT_MODELS, DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, defaultModelPolicy(), ModelEditField, buildDefaultModelCapabilities() (+25 more)

### Community 118 - "API architecture — AI Provider Gateway"
Cohesion: 0.12
Nodes (15): API architecture — AI Provider Gateway, API style, Auth, Extensions, Generation parameters (`params` in body), HTTP errors, Idempotency, retry, and fallback, Model identification (aliases) (+7 more)

### Community 119 - "openai-chat-message.dto.ts"
Cohesion: 0.33
Nodes (3): KeyGenerateCommand, Command, Option

### Community 120 - "gateway-cli-wrapper.js"
Cohesion: 0.40
Nodes (4): distEntry, fs, path, tsEntry

### Community 121 - "deploy-staging.sh"
Cohesion: 0.40
Nodes (4): DEPLOY_DIR, DEPLOY_MODE, deploy-staging.sh script, VAULT_ENV

### Community 122 - "Conversation tracking (`conversationId`)"
Cohesion: 0.12
Nodes (15): API contract, Cache and metrics, Client example (turn 1 → turn 2), Client obligation when starting from turn 2, Conversation tracking (`conversationId`), Difference: field in response vs field in request (metrics), FAQ, Logging conversations from the second message (recommended flow) (+7 more)

### Community 123 - "AnthropicContentBlockDto"
Cohesion: 0.32
Nodes (5): OpenAiAuth(), OpenAiExceptionFilter, Catch, OpenAiBearerAuthGuard, Injectable

### Community 124 - "AppMetricsBackend"
Cohesion: 0.14
Nodes (13): IsStringOrArrayOfStrings(), OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString (+5 more)

### Community 125 - "OpenAI contract facade (Cursor IDE)"
Cohesion: 0.13
Nodes (15): Authorization, Configuration in Cursor, Endpoints, Errors, Example (non-stream), Example (stream), Limitations, Model selection (+7 more)

### Community 126 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, include

### Community 139 - "configuration.ts"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, types, exclude, extends, include

### Community 140 - "Architecture — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): Architecture — AI Provider Gateway, CLI — isolation from HTTP runtime, Configuration and secrets, Document purpose, Layers within modules (NestJS convention), Logical view, Modules (bounded areas — functional core), Observability (+5 more)

### Community 141 - "Dictionary — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): Brand types (TypeScript), Canonical terms, Core concepts, Dictionary — AI Provider Gateway, Error codes (stable), Facade vs provider runtime, Field dictionary, Generation parameters (C0–C7 extensions) (+5 more)

### Community 142 - "Testing — AI Provider Gateway"
Cohesion: 0.15
Nodes (13): CI / locally, Coverage areas, E2E infrastructure, E2E tests (`test/e2e/`), HTTP codes in E2E (201 vs 200), Integration tests (`test/integration/`), Overview, Security tests (`test/security/`) (+5 more)

### Community 143 - "chat-response-builder.service.spec.ts"
Cohesion: 0.18
Nodes (9): ProviderTestCommand, Command, ProviderTestService, Injectable, ProviderApiKey, ProviderFactoryContext, OpenAiApiSurface, openAiCompatibleApiSurface (+1 more)

### Community 144 - "anthropic-response.mapper.ts"
Cohesion: 0.17
Nodes (17): SseDoneEvent, fromGatewayToolCallDto(), AnthropicContentBlock, AnthropicContentBlockDto, AnthropicMessagesResponseDto, AnthropicMessagesUsageDto, AnthropicTextContentBlockDto, AnthropicThinkingContentBlockDto (+9 more)

### Community 145 - "anthropic-stream.mapper.ts"
Cohesion: 0.20
Nodes (10): ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel(), mapThinkingBudgetToAnthropicEffort(), mapThinkingToAnthropic(), resolveAnthropicOutputConfig(), AnthropicMessage (+2 more)

### Community 146 - "Data flow — AI Provider Gateway"
Cohesion: 0.22
Nodes (8): 0. Shared skeleton: validation, model selection, 1. Standard `POST /api/v1/chat` — success (201), 2. Standard `POST /api/v1/chat` — error, 3. Streaming `POST /api/v1/chat/stream` — success (SSE), 4. OpenAI facade — `POST /api/v1/openai/chat/completions`, 5. Anthropic facade — `POST /api/v1/anthropic/messages`, Data flow — AI Provider Gateway, Participant legend

### Community 147 - "OpenAI adapter (provider runtime)"
Cohesion: 0.22
Nodes (9): Adapter components, Adapter role, Chat Completions, Configuration, OpenAI adapter (provider runtime), Related documents, Responses API, SDK mapping (+1 more)

### Community 148 - "ChatResponseDto"
Cohesion: 0.24
Nodes (13): asGatewayKey(), AppConfiguration, GatewayKeyRuntimeConfig, buildIntegrationConfigOptions(), buildIntegrationGatewayKeyAllowList(), getIntegrationMasterKey(), INTEGRATION_RESOLVED_PROMPTS, readIntegrationEnv() (+5 more)

### Community 149 - "PrometheusService"
Cohesion: 0.20
Nodes (3): PrometheusService, Injectable, PrometheusMetrics

### Community 150 - "provider-instances.bootstrap.spec.ts"
Cohesion: 0.18
Nodes (11): createMockProviderRegistryService(), GatewayProviderInstanceConfig, createBootstrap(), createConfigServiceMock(), mockCreateAnthropicProvider, mockCreateGoogleProvider, mockCreateOpenAiCompatibleProviderInstance, mockCreateOpenAiProvider (+3 more)

### Community 151 - "Directory and file architecture"
Cohesion: 0.33
Nodes (6): 1) Repository tree, 2) Directory descriptions (responsibilities), 2a) CLI — runtime isolation, 3) Feature scope vs documentation, Directory and file architecture, Working notes (repo root, optional)

### Community 152 - "Documentation — AI Provider Gateway"
Cohesion: 0.33
Nodes (6): Distribution and contributions, Documentation — AI Provider Gateway, File index, How to read this documentation, Selected topics, Specifications (SDD)

### Community 153 - "openai-messages-provider.mapper.ts"
Cohesion: 0.23
Nodes (8): ProviderAssistantTurn, ProviderToolResultTurn, ChatCompletionMessageParam, mapAssistantTurn(), mapTurnsToOpenAiMessages(), mapAssistantTurnToResponsesInput(), mapTurnsToResponsesInput(), CALL_1

### Community 154 - "wait-for-redis.ts"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 155 - "MetricsController"
Cohesion: 0.18
Nodes (7): Header, MetricsController, ApiOperation, ApiResponse, ApiTags, Controller, Get

### Community 156 - "anthropic-stream.mapper.ts"
Cohesion: 0.36
Nodes (8): asMessageId(), MessageId, AnthropicStreamState, createAnthropicStreamState(), emitThinkingBlock(), eventLine(), mapSseEventToAnthropic(), nextToolBlockIndex()

### Community 158 - "chat-completions.adapter.ts"
Cohesion: 0.38
Nodes (7): ChatCompletionsAdapterOptions, accumulateOpenAiStreamToolCallDeltas(), extractOpenAiStreamDeltaText(), finalizeOpenAiStreamToolCalls(), OpenAiStreamToolCallAccumulator, mapToolChoiceToOpenAi(), mapToolsToOpenAi()

### Community 159 - "resolve-provider-call-options.ts"
Cohesion: 0.39
Nodes (6): clamp(), isOverrideKey(), resolveProviderCallOptions(), OVERRIDE_KEYS, OverrideKey, GatewayParamsConfig

### Community 160 - "openai-chat-completion-response.dto.ts"
Cohesion: 0.39
Nodes (8): OpenAiChatCompletionChoiceDto, OpenAiChatCompletionMessageDto, OpenAiChatCompletionResponseDto, OpenAiChatCompletionUsageDto, OpenAiToolCallDto, OpenAiToolCallFunctionDto, ApiProperty, ApiPropertyOptional

## Knowledge Gaps
- **1034 isolated node(s):** `path`, `fs`, `distEntry`, `tsEntry`, `entrypoint.sh script` (+1029 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `Community 8` to `test-constants.ts`, `Community 86`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `test` connect `test-constants.ts` to `Community 0`, `MetricsController`, `should-include-redis-stack.ts`, `Community 8`, `GatewayKey`, `cache.module.ts`, `Community 52`, `e2e-constants.ts`, `Community 30`, `CLI.md`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `LoggingService` connect `Community 30` to `Community 0`, `Community 2`, `chat.service.ts`, `responses.adapter.ts`, `cache.module.ts`, `provider-registry.service.ts`, `anthropic-stream.mapper.ts`, `Community 19`, `provider-instances.bootstrap.spec.ts`, `provider-instances.bootstrap.ts`, `health.service.ts`, `SmartRateLimiterService`, `model-manager.service.ts`, `anthropic-messages.controller.ts`, `chat-completions.adapter.ts`, `CLI.md`, `test-constants.ts`, `swagger.setup.ts`, `GatewayKey`, `Brand types — przewodnik dla developerów`, `Community 52`, `e2e-constants.ts`, `.chat`, `provider-error.mapper.ts`, `.getOne`, `Community 88`, `MetricsController`, `should-include-redis-stack.ts`, `resolve-provider-call-options.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `LoggingService` (e.g. with `initService()` and `initService()`) actually correct?**
  _`LoggingService` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `path`, `fs`, `distEntry` to the rest of the system?**
  _1036 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03829006031995804 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08461538461538462 - nodes in this community are weakly interconnected._