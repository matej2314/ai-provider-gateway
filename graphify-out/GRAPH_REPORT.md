# Graph Report - ai-provider-gateway  (2026-07-18)

## Corpus Check
- 520 files · ~207,178 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3036 nodes · 8898 edges · 129 communities (122 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e0069e37`
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
- resolve-provider-call-options.ts
- OpenAiChatMessageDto
- provider-base-url.validation.ts
- rollback.sh
- nest-cli.json
- Testy integracyjne (live SDK + Redis)
- openai-chat-message.dto.ts
- gateway-cli-wrapper.js
- deploy-staging.sh
- tsconfig.build.json
- entrypoint.sh
- generate-key.sh script
- MASTER_SYSTEM_PROMPT.md
- chat-default.md
- ollama-chat.md
- openai-chat-gpt.md

## God Nodes (most connected - your core abstractions)
1. `LoggingService` - 93 edges
2. `asProviderInstanceId()` - 78 edges
3. `ProviderInstanceId` - 75 edges
4. `ModelAlias` - 75 edges
5. `ApiErrorCode` - 61 edges
6. `scripts` - 57 edges
7. `ChatRequestDto` - 57 edges
8. `GatewayKey` - 57 edges
9. `asEnvRef()` - 52 edges
10. `asGatewayKey()` - 51 edges

## Surprising Connections (you probably didn't know these)
- `createIntegrationApp()` --indirect_call--> `AppModule`  [INFERRED]
  test/integration/helpers/create-integration-app.ts → src/app.module.ts
- `createE2eAppWithCache()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/gateway-chat-cache.e2e-spec.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eApp()` --indirect_call--> `RedisConnectionService`  [INFERRED]
  test/e2e/helpers/create-e2e-app.ts → src/cache/adapters/redis-cache/redis-connection.service.ts
- `createE2eFallbackProviderRegistry()` --indirect_call--> `alias()`  [INFERRED]
  test/e2e/helpers/e2e-provider-registry.ts → src/chat/resilience/resilient-executor.spec.ts
- `createE2eProviderRegistry()` --indirect_call--> `alias()`  [INFERRED]
  test/e2e/helpers/e2e-provider-registry.ts → src/chat/resilience/resilient-executor.spec.ts

## Import Cycles
- None detected.

## Communities (129 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (32): ApiUsageBody, ExpectedGatewayUsage, expectGatewayUsage(), buildIntegrationConfigOptions(), closeIntegrationApp(), createIntegrationApp(), CreateIntegrationAppOptions, IntegrationAppContext (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (47): bootstrap(), CliModule, Module, ClientAddCommand, Command, ClientEditCommand, Command, ClientListCommand (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (27): ConsoleLoggerAdapter, LEVEL_ORDER, Injectable, NoopErrorReportingAdapter, Injectable, LEVEL_RANK, PinoLoggerAdapter, Injectable (+19 more)

### Community 3 - "asProviderInstanceId"
Cohesion: 0.11
Nodes (33): Option, CliAiModelSchema, CliAiProviderSchema, CliRateLimitSchema, convertClient(), convertModel(), convertProvider(), GatewayClientSchema (+25 more)

### Community 4 - "index.ts"
Cohesion: 0.06
Nodes (62): getClientConversationId(), getOrCreateConversationIdForResponse(), mockedUuidV4, VALID_CONV_ID_ALT, buildRetryPolicyFromResolved(), ModelRetrySource, resolveMaxAttempts(), resolveTimeoutMs() (+54 more)

### Community 5 - "chat.service.ts"
Cohesion: 0.10
Nodes (25): IsPrimitiveMetadataRecord, ResponseCacheService, Injectable, ChatRequestDto, ApiProperty, ApiPropertyOptional, ArrayMaxSize, ArrayMinSize (+17 more)

### Community 6 - "ai-provider.interface.ts"
Cohesion: 0.09
Nodes (29): TEST_PROMPT_CACHE_CREATION_TOKENS, TEST_PROMPT_CACHE_HIT_TOKENS, asPromptCacheCreationTokens(), asPromptCacheHitTokens(), ANTHROPIC_EFFORT_LEVELS, AnthropicEffortLevel, extractAnthropicThinkingContent(), isAnthropicEffortLevel() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (39): AnthropicContentBlockDto, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsString, MaxLength, AnthropicMessageDto (+31 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (56): scripts, build, build:cli, cli, config:validate, deploy:mvp, deploy:production, deploy:staging (+48 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (7): ProviderTestCommand, Command, ProviderManagerService, Injectable, ProviderTestService, Injectable, GatewayConfig

### Community 10 - "gateway-models-catalog.service.ts"
Cohesion: 0.06
Nodes (36): ApiGatewayModelsErrorResponses, ApiGatewayChatErrorResponses(), ApiGatewayModelsErrorResponses(), ErrorEnvelopeDto, ApiProperty, ApiPropertyOptional, AnthropicModelsController, AnthropicAuth (+28 more)

### Community 11 - "responses.adapter.ts"
Cohesion: 0.09
Nodes (37): CachedChatResponseSchema, ChatWarningSchema, parseCachedChatResponse(), mapProviderResponseToAiObservation(), asInputTokens(), asOutputTokens(), asSystemFingerprint(), asToolCallId() (+29 more)

### Community 12 - "cache.module.ts"
Cohesion: 0.07
Nodes (31): NoOpCacheBackend, Injectable, NoopCacheModule, Module, RedisCacheAdapter, Injectable, RedisCacheModule, Module (+23 more)

### Community 13 - "sentry-ai-metrics.adapter.ts"
Cohesion: 0.08
Nodes (35): TEST_MODEL_ALIAS_BRANDED, asCostUsd(), CostUsd, ToolCallId, NoopAiMetricsAdapter, Injectable, applyGenAiConversationIdToSpan(), applyGenAiMessagesToSpan() (+27 more)

### Community 14 - "configuration.ts"
Cohesion: 0.08
Nodes (38): result, isCachedChatAllowedForModelAlias(), collectInactiveProviderWarnings(), formatZodIssues(), validateGatewayConfig(), ValidationOptions, ValidationResult, buildEffectiveGatewayConfig() (+30 more)

### Community 15 - "provider-registry.service.ts"
Cohesion: 0.08
Nodes (29): mockExecutorChatSuccess(), mockStreamExecutorSuccess(), ChatProviderCallService, createMockStreamResult(), textStream(), Injectable, ChatResponseBuilderService, Injectable (+21 more)

### Community 16 - "chat-provider-call.service.ts"
Cohesion: 0.09
Nodes (32): ChatMessageDto, ApiProperty, ApiPropertyOptional, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength (+24 more)

### Community 17 - "Deployment Guide — AI Provider Gateway"
Cohesion: 0.05
Nodes (43): 1. Sklonuj repozytorium, 2. Konfiguracja, 3. Walidacja (zalecane przed deployem), 4. Sieć Docker, 5. Deploy, 6. Weryfikacja, Auto-rollback, Checklist produkcyjny (+35 more)

### Community 18 - "ModelAlias"
Cohesion: 0.07
Nodes (7): ProviderTestOptions, CliAiModel, ModelAlias, ProviderInstanceId, NoopAppMetricsAdapter, Injectable, AppMetricsBackend

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (16): DEFAULT_MODELS, WIZARD_INIT_STEPS, WIZARD_STEPS, WizardStep, WizardState, ClientPromptService, Injectable, ModelPromptResult (+8 more)

### Community 20 - "branded.types.ts"
Cohesion: 0.06
Nodes (36): Bez buildu projektu, Gateway CLI — dokumentacja, `gateway client:add`, `gateway client:edit <clientId>`, `gateway client:list`, `gateway client:remove <clientId>`, `gateway config:init`, `gateway config:show` (+28 more)

### Community 21 - "configuration.types.ts"
Cohesion: 0.15
Nodes (18): ApiOpenAiErrorResponses(), ApiNotFoundResponse, ApiOkResponse, ApiOpenAiErrorResponses, ApiOperation, ApiParam, ApiRequestIdHeader, Get (+10 more)

### Community 22 - "config-generator.service.ts"
Cohesion: 0.09
Nodes (10): ConfigInitCommand, Command, ConfigGeneratorService, Injectable, ConfigPersistenceService, normalizeGatewayConfigForWrite(), Injectable, FileManagerService (+2 more)

### Community 23 - "provider-instances.bootstrap.ts"
Cohesion: 0.10
Nodes (26): asProviderApiKey(), ProviderInstanceRuntime, adaptApiKeyProviderFactory(), createOpenAiCompatibleProviderInstance(), createOpenAiProviderCore(), createOpenAiProvider(), ApiKeyProviderFactoryFn, ProviderFactoryFn (+18 more)

### Community 24 - "health.service.ts"
Cohesion: 0.22
Nodes (4): HealthReadinessResponseDto, ApiProperty, HealthService, Injectable

### Community 25 - "SmartRateLimiterService"
Cohesion: 0.11
Nodes (18): createMockSmartRateLimiter(), resolveClientIdFromKey(), asClientId(), ResolvedGatewayClient, SmartRateLimitGuard, Injectable, OpenAiAuth(), OpenAiExceptionFilter (+10 more)

### Community 26 - "model-manager.service.ts"
Cohesion: 0.18
Nodes (18): DEFAULT_MODEL_ALLOW_OVERRIDES, getRecommendedMaxOutputTokens(), isThinkingCapableModel(), THINKING_CAPABLE_MODEL_PATTERNS, defaultModelPolicy(), ModelEditField, buildDefaultModelCapabilities(), buildDefaultModelPolicy() (+10 more)

### Community 27 - "anthropic-messages.controller.ts"
Cohesion: 0.15
Nodes (14): ApiAnthropicErrorResponses(), AnthropicAuth(), AnthropicErrorBodyDto, AnthropicErrorResponseDto, ApiProperty, AnthropicModelDto, AnthropicModelsListResponseDto, ApiProperty (+6 more)

### Community 28 - "create-security-app.ts"
Cohesion: 0.17
Nodes (16): assertSafeFuzzResponse(), CHAT_REQUEST_DTO_KEYS, expectNoServerError(), FC_OPTIONS, isFuzzableModelAlias(), isFuzzableUnknownTopLevelField(), NON_FUZZABLE_OBJECT_KEYS, VALID_USER_MESSAGE (+8 more)

### Community 29 - "openai-params-provider.mapper.ts"
Cohesion: 0.12
Nodes (24): buildGenerationWarnings(), OPENAI_RESPONSES_UNSUPPORTED_PARAMS, PARAM_IGNORED, asWarningCode(), mapCallOptionsToChatCompletionParams(), mapCallOptionsToResponsesParams(), mapMaxOutputTokensForChatCompletions(), mapResponseFormatToChatCompletion() (+16 more)

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (4): Inject, LoggingService, Injectable, createAnthropicProvider()

### Community 31 - "CLI.md"
Cohesion: 0.14
Nodes (21): convertRateLimit(), KeyGeneratorService, Injectable, ClientBasicAnswers, ClientPromptResult, RateLimitAnswers, generateGatewayConfigTemplate(), buildClientRateLimitConfig() (+13 more)

### Community 32 - "Dokumentacja API — AI Provider Gateway"
Cohesion: 0.14
Nodes (21): CliAiProvider, EnvPatchService, EnvPatchValue, Injectable, WizardRunResult, ClientCli, EnvTemplateInput, generateEnvTemplate() (+13 more)

### Community 33 - "dependencies"
Cohesion: 0.07
Nodes (28): dependencies, @anthropic-ai/sdk, boxen, chalk, class-transformer, class-validator, @google/genai, helmet (+20 more)

### Community 34 - "devDependencies"
Cohesion: 0.07
Nodes (28): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, fast-check, globals (+20 more)

### Community 35 - "test-constants.ts"
Cohesion: 0.07
Nodes (43): ConfigFlat, ConfigRoot, createTestGatewayKeyRuntimeConfig(), createTestResolvedSystemPrompts(), getByPath(), MockConfigServiceOptions, Nullable, resolveGateway() (+35 more)

### Community 36 - "chat-response.dto.ts"
Cohesion: 0.14
Nodes (30): CachedChatResponse, CachedChatResponseWithConversation, ChatResponseData, toChatResponseDto(), ChatWarningDto, ApiProperty, ApiPropertyOptional, IsOptional (+22 more)

### Community 37 - "swagger.setup.ts"
Cohesion: 0.11
Nodes (20): ChatOutputTextDto, ApiProperty, ChatUsageDto, ApiPropertyOptional, SseDeltaPayloadDto, ApiProperty, SseDonePayloadDto, SseDoneUsageDto (+12 more)

### Community 38 - "asGatewayKey"
Cohesion: 0.09
Nodes (29): ChatController, ApiSecurity, ApiTags, Controller, GatewayKeyAndSmartRateLimit, ChatService, Injectable, ChatStreamController (+21 more)

### Community 39 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+18 more)

### Community 40 - "PrometheusAppMetricsAdapter"
Cohesion: 0.11
Nodes (5): PrometheusAppMetricsAdapter, Injectable, AppProviderCallContext, AppProviderStreamScope, AppTokenUsage

### Community 41 - "GatewayKey"
Cohesion: 0.11
Nodes (13): alias(), ChatExecutionContext, ProviderCallContext, RateLimitCheckResult, KeyGenerateOptions, GatewayClient, ClientId, GatewayKey (+5 more)

### Community 42 - "chat-stream.controller.ts"
Cohesion: 0.07
Nodes (29): Dokumentacja API — AI Provider Gateway, Extended Thinking Mode, Fasady integracji (IDE), Format błędów, `GET /api/v1/health`, `GET /api/v1/health/ready`, `GET /api/v1/models`, `GET /api/v1/models` — katalog aliasów (+21 more)

### Community 43 - "AI Provider Gateway (NestJS)"
Cohesion: 0.08
Nodes (24): AI Provider Gateway (NestJS), Auth i limity, Cache odpowiedzi, Chat (wymaga `X-Gateway-Key`), Dokumentacja, Dystrybucja, Endpointy (przykłady), Extended Thinking Mode (reasoning models) (+16 more)

### Community 44 - "Brand types — przewodnik dla developerów"
Cohesion: 0.15
Nodes (11): assertNoFallbackCycle(), alias1, fallback, myModel, primary, isRetryableHttpError(), ResilientExecutionOptions, ResilientExecutor (+3 more)

### Community 45 - "ClientId"
Cohesion: 0.33
Nodes (3): KeyGenerateCommand, Command, Option

### Community 46 - "getAppConfig"
Cohesion: 0.11
Nodes (31): buildGenerationConfig(), createGoogleProvider(), mapStopSequences(), mapThinkingBudgetToGeminiLevel(), extractFromLegacyFields(), extractFromThoughtParts(), extractGeminiThinkingContent(), GeminiLegacyThoughtFields (+23 more)

### Community 47 - "api-error.code.ts"
Cohesion: 0.15
Nodes (9): ChatErrorHandlerService, Injectable, ApiErrorCode, DEFAULT_HTTP_STATUS_TO_CODE, ApiErrorPayload, PayloadTooLargeError, RequestWithId, createMockLoggingService() (+1 more)

### Community 48 - "Integracja Anthropic Messages API (Claude Code)"
Cohesion: 0.09
Nodes (22): Anty-wzorce, Best practices, `brand()` i `unbrand()`, `Brand<K, T>`, Brand types — przewodnik dla developerów, Configuration & policy, `ConversationId`, Identifiers & tracking (+14 more)

### Community 49 - "AppMetricsService"
Cohesion: 0.12
Nodes (6): HttpMetricsMiddleware, Injectable, OTHER_CLIENT, TEST_CLIENT, AppMetricsService, Injectable

### Community 50 - "e2e-provider-registry.ts"
Cohesion: 0.10
Nodes (21): Autoryzacja, Błędy, Endpointy, Integracja Anthropic Messages API (Claude Code), Konfiguracja (Claude Code i inne klienty), Mapowanie na gateway, Mapowanie treści wiadomości, Natywne API (bez zmian) (+13 more)

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (19): 0) Pierwsze uruchomienie (wizard konfiguracji), 1) Sekrety i env (`.env`), 2) Plik `gateway.config.yaml` (modele / instancje / polityki), 3) Walidacja i fail-fast, 4) Nadpisywanie parametrów per request, 5) Profile środowiskowe (opcjonalnie), 6) Pliki system promptu (`src/config/system-prompt/`), Cache odpowiedzi i Redis (opcjonalnie) (+11 more)

### Community 52 - "Community 52"
Cohesion: 0.14
Nodes (31): test, AppModule, Module, createMockConfigService(), initGuard(), initGuard(), bootstrap(), ProviderInstancesBootstrap (+23 more)

### Community 53 - "Community 53"
Cohesion: 0.06
Nodes (51): ChatResponseDto, ChatUsageDetailsDto, ApiProperty, ApiPropertyOptional, IsOptional, IsString, SseDoneEvent, fromGatewayToolCallDto() (+43 more)

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
Cohesion: 0.18
Nodes (15): gatewayConfig, loadRealGatewayConfig(), openAiCompatibleProviders, NOTE: We can't use loadGatewayConfigFromFile() because it's globally mocked, buildIntegrationEnvRefs(), buildOpenAiCompatibleIntegrationConfigOptions(), closeOpenAiCompatibleIntegrationApp(), CreateOpenAiCompatibleIntegrationAppOptions (+7 more)

### Community 59 - ".streamChat"
Cohesion: 0.17
Nodes (11): ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, Body, Post (+3 more)

### Community 60 - "e2e-constants.ts"
Cohesion: 0.10
Nodes (32): TEST_INPUT_TOKENS_SMALL, TEST_MAX_CONCURRENT_STREAMS, TEST_OUTPUT_TOKENS_SMALL, TEST_RATE_LIMIT_BURST, createAnthropicRequestBody(), E2E_ANTHROPIC_USER_MESSAGE, E2E_GATEWAY_KEY, E2E_INVALID_GATEWAY_KEY (+24 more)

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
Cohesion: 0.12
Nodes (15): OpenAiChatCompletionsController, ApiBody, ApiOpenAiErrorResponses, ApiOperation, ApiProduces, ApiRequestIdHeader, ApiResponse, ApiSecurity (+7 more)

### Community 66 - "app-metrics.service.ts"
Cohesion: 0.20
Nodes (12): healthStatusToGaugeValue(), TEST_CLIENT, APP_METRICS_BACKEND, AppRequestLabels, AppRequestStatus, HealthComponent, HealthMetricsSnapshot, HealthStatus (+4 more)

### Community 67 - ".getOne"
Cohesion: 0.27
Nodes (8): getAppConfig(), enrichRequestWithClientId(), AnthropicApiKeyGuard, readAnthropicApiKey(), initGuard(), Injectable, readAuthorizationHeader(), readBearerToken()

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
Cohesion: 0.13
Nodes (13): HealthModule, Module, HealthCheckResult, HealthRedisCheckResult, healthyReadinessConfig, initService(), AppMetricsModule, Global (+5 more)

### Community 73 - ".chat"
Cohesion: 0.20
Nodes (9): ApiBody, ApiGatewayChatErrorResponses, ApiOperation, ApiRequestIdHeader, ApiResponse, Body, Post, Req (+1 more)

### Community 74 - "anthropic-stream.mapper.ts"
Cohesion: 0.17
Nodes (9): HealthLivenessResponseDto, ApiProperty, HealthController, ApiOkResponse, ApiOperation, ApiRequestIdHeader, ApiTags, Controller (+1 more)

### Community 75 - "provider-error.mapper.ts"
Cohesion: 0.36
Nodes (10): MappedProviderError, nameLooksLikeTimeout(), readErrorMessage(), readNumericStatus(), mapAnthropicSdkError(), mapGoogleGenAiError(), payloadOf(), toHttpException() (+2 more)

### Community 76 - ".getOne"
Cohesion: 0.29
Nodes (8): ApiAnthropicErrorResponses, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiRequestIdHeader, Get, Param

### Community 77 - "app-metrics-backend.interface.ts"
Cohesion: 0.13
Nodes (15): Autoryzacja, Błędy, Endpointy, Fasada kontraktu OpenAI (Cursor IDE), Konfiguracja w Cursor, Natywne API (bez zmian), Odpowiedź (`chat.completion`), Ograniczenia (+7 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (3): PrometheusService, Injectable, PrometheusMetrics

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
Cohesion: 0.28
Nodes (9): buildOpenAiIntegrationConfigOptions(), CreateOpenAiIntegrationAppOptions, OpenAiIntegrationAppContext, INTEGRATION_OPENAI_MODEL_ALIAS_BRANDED, INTEGRATION_OPENAI_MODEL_ID_BRANDED, INTEGRATION_OPENAI_PROVIDER_INSTANCE_BRANDED, buildOpenAiIntegrationGatewayModels(), OPENAI_INTEGRATION_MODEL_POLICY (+1 more)

### Community 85 - "Community 85"
Cohesion: 0.17
Nodes (11): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — prosta rozmowa, Scenariusz C — powtórzone zapytanie z cache, Scenariusz D — wieloturowa rozmowa z metrykami Sentry, SPEC — Chat (standard) — `POST /chat`, Użytkownicy i scenariusze (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.15
Nodes (12): author, bin, gateway, description, license, name, private, typeCoverage (+4 more)

### Community 87 - "Community 87"
Cohesion: 0.21
Nodes (8): ResponseFormatDto, ApiProperty, ApiPropertyOptional, IsIn, IsObject, IsOptional, IsStringOrArrayOfStrings(), IsThinkingBudget()

### Community 88 - "Community 88"
Cohesion: 0.35
Nodes (6): mapOpenAiMessagesToGateway(), mapOpenAiToolCalls(), mapOpenAiChatRequestToGateway(), mapOpenAiToolChoice(), mapOpenAiToolsToGateway(), OpenAiFunctionTool

### Community 89 - "Community 89"
Cohesion: 0.29
Nodes (8): loadIntegrationEnv(), getRedisConnectionOptions(), isRedisReachable(), RedisConnectionOptions, sleep(), waitForRedis(), WaitForRedisOptions, globalSetup()

### Community 90 - "Community 90"
Cohesion: 0.17
Nodes (12): IsThinkingBudget, ChatParamsDto, ApiPropertyOptional, IsBoolean, IsInt, IsNumber, IsOptional, IsStringOrArrayOfStrings (+4 more)

### Community 91 - "Community 91"
Cohesion: 0.17
Nodes (12): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, moduleNameMapper, rootDir, testEnvironment, testPathIgnorePatterns (+4 more)

### Community 92 - "anthropic.module.ts"
Cohesion: 0.15
Nodes (15): ChatModule, Module, AnthropicModule, Module, IntegrationsModule, Module, OpenAiModule, Module (+7 more)

### Community 93 - "createTestGatewayConfig.ts"
Cohesion: 0.18
Nodes (10): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — streaming w UI, Scenariusz B — provider bez streamingu, SPEC — Chat (streaming) — `POST /chat/stream`, Użytkownicy i scenariusze, Warunki wstępne (env) (+2 more)

### Community 94 - "configuration-validation.service.ts"
Cohesion: 0.20
Nodes (9): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — local dev, Scenariusz B — orchestrator, SPEC — Health (liveness/readiness), Użytkownicy i scenariusze, Wymagania funkcjonalne (+1 more)

### Community 95 - "EnvironmentVariables"
Cohesion: 0.17
Nodes (12): EnvironmentVariables, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString (+4 more)

### Community 96 - "SPEC — Chat (streaming) — `POST /chat/stream`"
Cohesion: 0.20
Nodes (9): Cel / problem, Kryteria akceptacji, Poza zakresem (względem rdzenia MVP), Scenariusz A — minimalna konfiguracja, Scenariusz B — konfiguracja dwóch providerów + streaming, SPEC — Konfiguracja (plug&play), Użytkownicy i scenariusze, Wymagania funkcjonalne (+1 more)

### Community 97 - "MetricsController"
Cohesion: 0.18
Nodes (7): Header, MetricsController, ApiOperation, ApiResponse, ApiTags, Controller, Get

### Community 98 - "Security Policy"
Cohesion: 0.10
Nodes (21): API keys — best practices, Client authentication, English, Facades and routing to the LLM, Fasady a routing do LLM, Fasady HTTP a klucze vendorów (ważne semantycznie), Gateway keys (clients → gateway), Gateway keys (klienci → gateway) (+13 more)

### Community 99 - "env.validation.ts"
Cohesion: 0.22
Nodes (8): 0. Wspólny szkielet: walidacja, wybór modelu, 1. Standard `POST /api/v1/chat` — sukces (201), 2. Standard `POST /api/v1/chat` — błąd, 3. Streaming `POST /api/v1/chat/stream` — sukces (SSE), 4. Fasada OpenAI — `POST /api/v1/openai/chat/completions`, 5. Fasada Anthropic — `POST /api/v1/anthropic/messages`, Legenda uczestników, Przepływ danych (data flow) — AI Provider Gateway

### Community 100 - "should-include-redis-stack.ts"
Cohesion: 0.17
Nodes (12): CACHE_BACKEND_TYPE, getRedisConsumers(), getRedisConsumersFromConfig(), isRedisRequired(), isRedisRequiredFromConfig(), isRedisRequiredFromEnv(), RedisRequirementSnapshot, resolveCacheForRequirement() (+4 more)

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
Cohesion: 0.38
Nodes (7): RedisConsumer, HealthCheckItemDto, ApiProperty, HealthReadinessChecksDto, HealthRedisCheckItemDto, ApiProperty, ApiPropertyOptional

### Community 109 - "resolve-provider-call-options.ts"
Cohesion: 0.19
Nodes (9): clamp(), isOverrideKey(), resolveProviderCallOptions(), OVERRIDE_KEYS, OverrideKey, INGRESS_LIMITS, ChatIngressProfile, validateChatIngress() (+1 more)

### Community 111 - "OpenAiChatMessageDto"
Cohesion: 0.22
Nodes (9): OpenAiChatMessageDto, ApiProperty, ApiPropertyOptional, IsArray, IsIn, IsOptional, IsString, MaxLength (+1 more)

### Community 112 - "provider-base-url.validation.ts"
Cohesion: 0.32
Nodes (4): GlobalExceptionFilter, isPayloadTooLargeError(), Catch, Injectable

### Community 113 - "rollback.sh"
Cohesion: 0.52
Nodes (6): append_summary(), DEPLOY_MODE, fail_rollback(), rollback.sh script, SKIP_VAULT_FETCH, write_output()

### Community 114 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, plugins, $schema, sourceRoot

### Community 116 - "Testy integracyjne (live SDK + Redis)"
Cohesion: 0.29
Nodes (6): Co jest prawdziwe vs mock, Pliki konfiguracyjne, Setup lokalny, Testy integracyjne (live SDK + Redis), Wymagania, Wymagania runtime

### Community 119 - "openai-chat-message.dto.ts"
Cohesion: 0.53
Nodes (3): isTextContentItem(), normalizeOpenAiContent(), TextContentItem

### Community 120 - "gateway-cli-wrapper.js"
Cohesion: 0.40
Nodes (4): distEntry, fs, path, tsEntry

### Community 121 - "deploy-staging.sh"
Cohesion: 0.40
Nodes (4): DEPLOY_DIR, DEPLOY_MODE, deploy-staging.sh script, VAULT_ENV

### Community 126 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): exclude, extends, include

## Knowledge Gaps
- **740 isolated node(s):** `path`, `fs`, `distEntry`, `tsEntry`, `entrypoint.sh script` (+735 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `Community 8` to `Community 52`, `Community 86`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `test` connect `Community 52` to `Community 0`, `.getOne`, `chat.service.ts`, `Community 8`, `app.module.ts`, `cache.module.ts`, `provider-registry.service.ts`, `CLI.md`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `LoggingService` connect `Community 30` to `Community 0`, `Community 2`, `chat.service.ts`, `ai-provider.interface.ts`, `responses.adapter.ts`, `cache.module.ts`, `provider-registry.service.ts`, `provider-instances.bootstrap.ts`, `health.service.ts`, `SmartRateLimiterService`, `CLI.md`, `swagger.setup.ts`, `GatewayKey`, `Brand types — przewodnik dla developerów`, `getAppConfig`, `api-error.code.ts`, `Community 52`, `ProviderCallOptions`, `app.module.ts`, `Community 84`, `resolve-provider-call-options.ts`, `provider-base-url.validation.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `LoggingService` (e.g. with `initService()` and `initService()`) actually correct?**
  _`LoggingService` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `path`, `fs`, `distEntry` to the rest of the system?**
  _742 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10909090909090909 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05282842449742871 - nodes in this community are weakly interconnected._