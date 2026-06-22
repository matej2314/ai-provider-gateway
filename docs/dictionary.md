# Słownik (dictionary) — AI Provider Gateway

Ten dokument utrwala wspólny język między użytkownikami projektu, integratorami i implementacją. Nazwy pól w JSON są techniczne; opisy są po polsku.

## Podstawowe pojęcia

| Termin | Definicja | Uwagi |
|--------|-----------|------|
| **Gateway / Proxy** | Warstwa pośrednia unifikująca integrację z LLM providerami. | Nie jest “open proxy” do dowolnych URL. |
| **Fasada integracji** | Warstwa HTTP w `src/integrations/` mapująca **kształt kontraktu** vendora (OpenAI Chat Completions, Anthropic Messages) na wewnętrzny `ChatRequestDto` i `ChatService`. | Osobne ścieżki `/api/v1/openai/…`, `/api/v1/anthropic/…`; nie zastępuje natywnego `/chat`. **Fasada ≠ integracja z vendorem** — służy kompatybilności klientów (Cursor, Claude Code), nie gwarantuje backendu LLM tego samego vendora. Szczegóły: sekcja „Fasada vs provider runtime” poniżej. |
| **Klucz klienta** | Sekret z allowlisty gateway (`GATEWAY_KEY_*` / YAML) używany przez aplikację lub IDE. | `X-Gateway-Key`, Bearer (OpenAI fasada) lub `x-api-key` (Anthropic fasada) — ta sama lista, różne nagłówki. |
| **Klucz providera** | Sekret w `.env` do wywołań SDK; w YAML wskazany przez **`apiKeyRef` per `providerInstance`** (np. `GOOGLE_API_KEY`, `GOOGLE_OFFICE_API_KEY`). | Fabryki w `src/providers/factories/`; bootstrap w `ProviderInstancesBootstrap`; nigdy klucz klienta. |
| **Provider type** | Wartość z `PROVIDER_TYPES` — wybór fabryki SDK w kodzie (`anthropic`, `google`, …). | W YAML: pole `type` wpisu w `providers:`. |
| **Provider instance** (`providerInstance`) | Unikalny klucz wpisu w `providers:` w YAML; własny `apiKeyRef`, `enabled`, powiązane modele. | Runtime: klucz w `ProviderRegistryService`; pole `provider` w odpowiedzi HTTP = `instanceId`. Wiele instancji tego samego `type` dozwolone. CLI: `provider:add` / `edit` / `remove`, `provider:test [instanceId]`. |
| **Provider** | Konkretna instancja runtime (`AIProvider`) powiązana z jednym kluczem API. | Implementacja przez fabrykę + port `AIProvider`. |
| **Adapter / fabryka providera** | Funkcja tworząca `AIProvider` dla jednego klucza API (np. `createGoogleProvider`). | Ukrywa SDK; bez `@Injectable` / `ConfigService`. |
| **Integration root** | Segment Base URL w IDE: `.../api/v1/openai` lub `.../api/v1/anthropic`. | Klient dokleja `/models`, `/chat/completions`, `/messages`. |
| **Model alias** | Zwyczajowa / czytelna nazwa modelu używana w gateway (np. `chat-default`, `claude-sonnet`, `gemini-flash`). | Mapowana do `providerInstance` + vendorowy `modelId` + `policy` + `capabilities` w `gateway.config.yaml`. |
| **Tool calling / tooling** | Function calling: definicje narzędzi w body (`tooling.definitions`), wyniki w `messages[]` z rolą `tool`, odpowiedzi modelu z `toolCalls`. | Wymaga `capabilities.tools: true` dla aliasu; mapowanie SDK w `anthropic-tools.mapper.ts` / `google-tools.mapper.ts`; fasady OpenAI/Anthropic mapują kontrakt vendora. Cache i fallback YAML wyłączone dla tooling w czacie JSON. |
| **Request metadata** | Opcjonalne pole `metadata` w body czatu (`Record<string, string \| number \| boolean>`). | Propagowane przez `buildProviderInputForAlias` do `ProviderChatInput.metadata`. **Anthropic:** gdy `metadata.userId` jest ustawione → `messages.create({ metadata: { user_id } })`. **Google:** obecnie ignorowane. |
| **Usage details** | Rozszerzone statystyki użycia w odpowiedzi JSON (`usageDetails`). | Pola `promptCacheHitTokens`, `promptCacheCreationTokens` — gdy adapter Anthropic zwraca cache token stats (obecnie w ścieżce `parseAnthropicResponseWithTools`). |
| **System fingerprint** | Opcjonalne pole `systemFingerprint` w odpowiedzi JSON i SSE `done`. | W kontrakcie DTO; bieżące fabryki Anthropic/Google **nie** wypełniają tego pola (brak implementacji w adapterach sync/stream). |
| **Fallback alias** | Opcjonalny alias zapasowy (`models[].fallback` w YAML). | Używany przez `ResilientExecutor` po wyczerpaniu retry na aliasie żądanym. |
| **Effective model alias** (`effectiveModelAlias`) | Alias faktycznie użyty do wywołania providera. | Obecny w odpowiedzi JSON / SSE `meta` tylko gdy żądany alias różni się od użytego (sukces na fallbacku). Pole `model` = żądany `modelAlias`. |
| **Standard** | Tryb odpowiedzi: pełna odpowiedź JSON. | `POST /api/v1/chat`. |
| **Streaming** | Tryb odpowiedzi: SSE. | `POST /api/v1/chat/stream` — patrz `openapi.json`, `dokumentacja_api.md`. |
| **Request ID** | Identyfikator korelacyjny żądania. | `RequestIdMiddleware`: nagłówek żądania `x-request-id` (echo) lub `req_<uuid>`; to samo ID w body (`requestId`), w envelope błędów oraz w nagłówku odpowiedzi **`x-request-id`** (`src/common/middleware/request-id.middleware.ts`). |
| **Conversation ID** (`conversationId`) | Opcjonalny identyfikator w body czatu w formacie `conv_<uuid>`. W **request** włącza `gen_ai.conversation.id` w Sentry; w **response** zawsze echo lub `conv_<uuid>`. Historia = `messages[]` od klienta. Patrz `conversation-tracking.md`. |
| **Policy** | Zestaw limitów i zasad (`timeoutMs`, `retry`, `params`). | Per alias w YAML; `timeout`/`retry` w `ResilientExecutor`, `params` w `resolveProviderCallOptions`. |
| **Resilient executor** | Warstwa retry + fallback + timeout wokół wywołania adaptera. | `src/common/resilience/resilient-executor.ts`; `runOnce` deleguje do `ChatProviderCallService` (`ChatModule`). |
| **Response cache** | Opcjonalna warstwa zapisu/odczytu odpowiedzi **`POST /api/v1/chat`** (backend `noop` lub `redis`). | Lookup/zapis w `ChatService`; **pomijany** dla żądań z toolingiem (`isToolingRequest`). Odczyt cache tylko gdy provider i alias są włączone w YAML. Streaming bez cache. |
| **Walidacja env (klucze)** | Reguły na zmiennych środowiskowych przy starcie aplikacji. | Przy **`NODE_ENV=production`** wymagany jest **co najmniej jeden** niepusty klucz (po `trim()`) spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`. W innych środowiskach ta reguła nie blokuje startu (`src/config/env.validation.ts`). Dodatkowo walidowane są opcjonalne pola **`CACHE_*`** / **`REDIS_*`** (typy, wartości domyślne). |
| **Gateway CLI** | Narzędzie wiersza poleceń do inicjalizacji i zarządzania konfiguracją (`bin/gateway-cli-wrapper.js`, `npm run cli`, bin `gateway`). | Osobny entry point od HTTP; **nie** importuje `ConfigModule`. Konwencja: `gateway <namespace>:<action>`. Komendy: `config:*`, `provider:*`, `model:*`, `client:*`, `key:generate`. Patrz `CLI.md`. |
| **Placeholder config** | Konfiguracja boilerplate w `gateway.config.yaml` (np. `masterKeyRef` / ID providerów / klientów zawierające `placeholder` lub `PLACEHOLDER`). | Wykrywana przez `CliConfigLoaderService.isBoilerplateConfig()`. Wizard `config:init` generuje pełną konfigurację z szablonów w `src/cli/templates/`. |
| **CliConfigLoader** | Serwis CLI (`CliConfigLoaderService`) ładujący `gateway.config.yaml` przez `GatewayConfigSchema` **bez** wymagania `.env`. | Metody: `loadRawConfig`, `loadWithEnvCheck`, `isBoilerplateConfig`, `configExists`, `envExists`. Nie wywołuje `buildEffectiveGatewayConfig()`. |
| **Wizard state** | Plik `.gateway-wizard-state.json` w katalogu roboczym — persistencja niedokończonego `config:init` (`WizardStateManager`). | Resume po ponownym uruchomieniu; rollback utworzonych plików przy odrzuceniu resume. |

## Fasada vs provider runtime

Gateway rozdziela **dwa niezależne pojęcia**. Mylenie ich to najczęstszy błąd semantyczny integratorów.

| Pojęcie | Warstwa | Rola | Czego **nie** oznacza |
|---------|---------|------|------------------------|
| **Fasada integracji** | `src/integrations/` — HTTP | Implementuje **kształt** kontraktu OpenAI lub Anthropic Messages, bo te API stały się standardem de facto dla narzędzi IDE | Połączenia z api.openai.com / API Anthropic; obecności providera `anthropic` lub `openai` w konfiguracji |
| **Provider runtime** | `src/providers/` — adapter SDK | Wywołanie LLM u konkretnego vendora (klucz z `.env`, `modelId` z YAML) | Wyboru powierzchni HTTP przez klienta |

**Routing LLM** jest wyłącznie **konfiguracyjny**:

1. Klient podaje `model` (fasady) lub `modelAlias` (natywny API) — to **alias** z `gateway.config.yaml`, nie vendorowy `modelId`.
2. Wpis `models[<alias>]` wskazuje `providerInstance` i `modelId`.
3. `ProviderRegistryService` zwraca adapter `AIProvider` dla tej instancji.

Przykład: żądanie na `/api/v1/openai/chat/completions` z `model: "gemini-flash"` może trafić do Google Gemini, jeśli alias tak skonfigurowano. Analogicznie `/api/v1/anthropic/messages` **nie wymaga** providera `anthropic` w YAML.

**Autoryzacja na fasadach:** nagłówki w stylu vendora (`Authorization: Bearer`, `x-api-key`) niosą **klucz klienta gateway** z allowlisty (`GATEWAY_KEY_*`), **nie** klucz API OpenAI.com ani Anthropic. Klucze providerów są wyłącznie w `.env` (`apiKeyRef`).

**Powiązane dokumenty:** `integracje.md`, `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`, `SECURITY.md`.

## Parametry generacji (rozszerzenia C0-C7)

### Mapowanie parametrów na providerów

Pole w **`params`** (natywny czat) / mapowanie fasad OpenAI / Anthropic → **`ProviderCallOptions`** → adapter SDK. Status **adaptera runtime** (stan kodu w `src/providers/factories/`):

| Parametr gateway | Pole SDK (orientacyjnie) | Anthropic | Google Gemini | OpenAI (adapter) |
|------------------|--------------------------|-----------|---------------|------------------|
| `temperature` | `temperature` | ✅ przekazywany | ✅ przekazywany | ⏳ **brak fabryki** — fasada `/openai` mapuje na `params`, wywołanie idzie przez alias |
| `maxOutputTokens` | `max_tokens` / `maxOutputTokens` | ✅ | ✅ | ⏳ j.w. |
| `topP` | `top_p` / `topP` | ✅ * | ✅ | ⏳ j.w. |
| `stop` | `stop_sequences` / `stopSequences` / `stop` | ✅ | ✅ | ⏳ j.w. |
| `frequencyPenalty` | `frequency_penalty` | ❌ ignorowany | ❌ ignorowany | ⏳ fasada przyjmuje; bez adaptera OpenAI brak efektu u OpenAI.com |
| `presencePenalty` | `presence_penalty` | ❌ ignorowany | ❌ ignorowany | ⏳ j.w. |
| `seed` | `seed` | ❌ ignorowany | ✅ przekazywany | ⏳ j.w. |
| `responseFormat` | `output_config.format` (Anthropic) / `response_format` + `response_schema` (Google) | ✅ `json_object` + opcjonalny `jsonSchema` | ✅ j.w. | ⏳ fasada `/openai` mapuje `response_format.type`; wywołanie idzie przez alias Anthropic/Google |
| `topK` | `top_k` / `topK` | ✅ (priorytet nad `topP` / `temperature`) | ✅ | ⏳ fasada mapuje na `params.topK`; wywołanie idzie przez alias Anthropic/Google |
| `thinkingEnabled` | `thinking` (Anthropic) / `thinkingConfig` (Google) | ✅ `thinking: { type, budget_tokens?, display }` | ✅ `thinkingConfig: { includeThoughts }` (Gemini 3.0+) | ⚠️ fasada przyjmuje `reasoning_effort`, ale **nie działa** (wymaga `/v1/responses` API) |
| `thinkingBudget` | token budget / effort level / thinkingLevel | ✅ number → `thinking.budget_tokens`; string → `output_config.effort` | ✅ number → `thinkingBudget`; string → `thinkingLevel` | ⚠️ j.w. |

\* **Anthropic — jeden parametr losowości:** adapter wysyła **wyłącznie jeden** z `top_k`, `top_p`, `temperature` — priorytet w `resolveAnthropicSamplingParams()`: **`topK` > `topP` > `temperature`** (`create-anthropic-provider.ts`). Merge z YAML + body może ustawić wiele wartości w `ProviderCallOptions`, ale do SDK trafia tylko zwycięzca priorytetu. Szczegóły: `konfiguracja.md`.

**Merge z YAML `policy.params.defaults`:** w `resolveProviderCallOptions` wartości domyślne z YAML ładowane są dla `temperature`, `maxOutputTokens`, `topP`, `frequencyPenalty`, `presencePenalty`, `seed`, `thinkingEnabled`. Pola **`topK`**, **`stop`**, **`responseFormat`** i **`thinkingBudget`** pochodzą **wyłącznie z body** (gdy podane i dozwolone w `allowOverrides`); schemat Zod (`gateway-config.schema.ts`) **nie** definiuje ich w `defaults`.

**Fasada OpenAI vs adapter OpenAI:** moduł `src/integrations/openai/` tłumaczy kontrakt klienta (np. Cursor) na `ChatRequestDto` — to **fasada HTTP**, nie wywołanie api.openai.com. Adapter runtime `type: openai` w `src/providers/` (fabryka `create-openai-provider.ts`) jest **osobnym** elementem: dotyczy wyłącznie routingu skonfigurowanego aliasu. To samo rozróżnienie dotyczy **fasady Anthropic** (`src/integrations/anthropic/`) vs adaptera `type: anthropic` — fasada Messages API nie gwarantuje backendu Anthropic.

**Fasada Anthropic vs adapter Anthropic:** pole `model` w `/api/v1/anthropic/messages` = `modelAlias`; backend może być dowolnym `providerInstance` z YAML (np. Google), jeśli alias tak wskazuje.

### Słownik pól

| Termin | Definicja | Uwagi |
|--------|-----------|------|
| **topP** (nucleus sampling) | Parametr kontroli losowości generacji — model bierze pod uwagę tylko najmniejszy zestaw tokenów, których skumulowane prawdopodobieństwo ≥ topP (0-1). | **Google / OpenAI (docelowo):** można łączyć z `temperature` w defaults. **Anthropic:** adapter wysyła **jeden** parametr losowości — priorytet `topK` > `topP` > `temperature`. Wyższa wartość (np. 0.95) = bardziej różnorodne odpowiedzi. |
| **stop** (stop sequences) | Lista sekwencji znaków, które zatrzymują generację tekstu przez model. | **Vendor-agnostic**: OpenAI `stop` (string \| string[]), Anthropic `stop_sequences` (array), Google `stopSequences` (array). Przydatne do kontroli długości i struktury odpowiedzi (np. `["\n\n", "###"]`). Gateway przyjmuje `string \| string[]` — konwertuje string → array dla Anthropic/Google. |
| **frequencyPenalty** | Penalizuje tokeny na podstawie ich częstości w dotychczasowym tekście (-2 do 2). Dodatnie wartości zmniejszają prawdopodobieństwo powtórzeń linii verbatim. | Przyjmowane w natywnym API i fasadzie OpenAI (`ChatParamsDto`, `openai-request.mapper.ts`). Adaptery **`anthropic`** / **`google`** **nie przekazują** tego parametru do SDK (ciche pominięcie). |
| **presencePenalty** | Penalizuje tokeny na podstawie ich obecności w dotychczasowym tekście (-2 do 2). Dodatnie wartości zwiększają prawdopodobieństwo rozmów o nowych tematach. | Jak `frequencyPenalty` — akceptowane w API, **ignorowane** przez adaptery `anthropic` / `google`. |
| **seed** | Liczba całkowita (integer) do deterministycznego samplingowania — ta sama seed + te same parametry = prawie identyczna odpowiedź. | **OpenAI + Google**: wspierają natywnie. **Anthropic**: nie wspiera. Przydatne do testów A/B i reprodukowalnych wyników. Nie gwarantuje absolutnego determinizmu, ale zapewnia że "losowe" wybory modelu będą takie same przy każdym wywołaniu. |
| **topK** | Top-K sampling — model bierze pod uwagę tylko K najbardziej prawdopodobnych tokenów dla następnego tokena (liczba całkowita ≥0). | Pole w `ChatParamsDto` i `ProviderCallOptions`; override tylko z body (brak merge z YAML `defaults`). **Anthropic:** `top_k` (priorytet nad `topP` / `temperature`). **Google:** `topK` w `buildGenerationConfig`. Wymaga wpisu w `allowOverrides`. |
| **responseFormat** (JSON mode) | Wymusza strukturę odpowiedzi modelu. `{ type: "json_object" }` + opcjonalny **`jsonSchema`**. | Tylko z body (`params.responseFormat`); brak merge z YAML `defaults`. **Anthropic** → `output_config.format.type: json_schema` (domyślny schemat `{ type: object, additionalProperties: true }` gdy brak `jsonSchema`); **Google** → `response_format: application/json` + `response_schema`. Fasada Anthropic: `output_config` w żądaniu Messages API — `integracja-anthropic-messages.md`. |
| **thinkingEnabled** | Włącza extended thinking/reasoning mode dla reasoning-capable models (boolean). | Pole w `ChatParamsDto` i `ProviderCallOptions`; może pochodzić z body lub YAML `defaults`. **Anthropic Claude Opus/Sonnet 4.5+** → `thinking: { type: 'enabled' \| 'adaptive', budget_tokens?, display }`. **Google Gemini 3.0+** → `thinkingConfig: { includeThoughts: true }`. **OpenAI**: nieobsługiwane (wymaga `/v1/responses` API). Wymaga `capabilities.thinking: true` i wpisu w `allowOverrides`. **Koszty:** 2-10x więcej tokenów. |
| **thinkingBudget** | Budżet/intensywność thinking: string (`"none"` \| `"minimal"` \| `"low"` \| `"medium"` \| `"high"` \| `"xhigh"` \| `"max"`) lub integer (min 1024). | Override tylko z body (brak merge z YAML `defaults`). **Anthropic**: number → `thinking.budget_tokens`; string → `output_config.effort`. **Google Gemini 3.0+**: number → `thinkingConfig.thinkingBudget`; string → `thinkingConfig.thinkingLevel`. **OpenAI**: nieobsługiwane. **Cross-validation:** gdy number, wymagane `maxOutputTokens >= thinkingBudget + 512`. Wymaga wpisu w `allowOverrides`. |

## Kody ostrzeżeń (warnings)

Ostrzeżenia (pole `warnings` w odpowiedzi) informują klienta o parametrach, które zostały zaakceptowane w body, ale **nie zostały przekazane do providera**. Ostrzeżenia **nie** blokują wywołania — odpowiedź HTTP 200/201.

| Code | Znaczenie |
|------|-----------|
| `PARAM_IGNORED_BY_PROVIDER` | Parametr z `params` (np. `frequencyPenalty`, `presencePenalty`, `seed`) nie jest wspierany przez wybrany provider (`anthropic` / `google`) i został zignorowany. |

**Uwaga:** Fasady OpenAI i Anthropic Messages API **nie** eksponują pola `warnings` w odpowiedzi (zgodność z formatem vendora). Ostrzeżenia są dostępne **wyłącznie** w natywnym API gateway (`POST /api/v1/chat` i SSE `done`).

## Kody błędów (stabilne)

Kody są częścią kontraktu API. Klient powinien opierać logikę na `code`, a nie na `message`.

| Code | Znaczenie |
|------|-----------|
| `VALIDATION_FAILED` | Body requestu lub parametry nie przeszły walidacji. |
| `MODEL_ALIAS_NOT_FOUND` | Podany `modelAlias` nie istnieje w konfiguracji gateway. |
| `MODEL_NOT_ALLOWED` | Model, tryb (np. streaming) lub pole w `params` (np. `temperature`) nie jest dozwolone przez policy (`allowOverrides`). |
| `PROVIDER_UNSUPPORTED` | `providerInstance` z configu nie jest zarejestrowany w runtime (brak fabryki dla `type` lub instancja nie przeszła bootstrapu). |
| `PROVIDER_AUTH_FAILED` | Błąd uwierzytelnienia do providera (np. zły klucz). |
| `PROVIDER_RATE_LIMITED` | Provider zwrócił limit (429) — mapowanie SDK w `provider-error.mapper.ts`. |
| `RATE_LIMITED` | Limit nałożony przez gateway: **`SmartRateLimitGuard`** (RPS/burst/streamy per `X-Gateway-Key`) oraz **cooldown** po 429 od upstream (`ChatService.executeChat` → `SmartRateLimiterService.setCooldown`; tylko czat standardowy). HTTP **429**. |
| `PROVIDER_TIMEOUT` | Przekroczono timeout dla wywołania providera. |
| `PROVIDER_UNAVAILABLE` | Provider zwrócił błąd 5xx lub jest niedostępny. |
| `STREAMING_NOT_SUPPORTED` | Wybrany model/provider nie wspiera streamingu. |
| `TOOLS_NOT_SUPPORTED` | Żądanie zawiera tooling (`tooling`, `tool` w messages, `toolCalls`), a alias nie ma `capabilities.tools: true` w YAML. |
| `THINKING_NOT_SUPPORTED` | Żądanie zawiera `thinkingEnabled: true` (w `params` lub defaults), a alias nie ma `capabilities.thinking: true` w YAML. HTTP **400**. |
| `GATEWAY_KEY_NOT_CONFIGURED` | Brak allowlisty kluczy w runtime (np. nie zarejestrowano `gatewayKey` w konfiguracji) — **500**, guard zwraca ten kod (`GatewayKeyGuard`). Przy poprawnym starcie z `gateway.config.yaml` i env scenariusz nie występuje. |
| `GATEWAY_KEY_MISSING` | Brak nagłówka `X-Gateway-Key` dla chronionego endpointu — **401** (`GatewayKeyGuard`). |
| `GATEWAY_KEY_INVALID` | Wartość `X-Gateway-Key` spoza allowlisty — **403** (`GatewayKeyGuard`). |
| `INTERNAL_SERVER_ERROR` | Nieobsłużony wyjątek serwera; domyślny fallback w `GlobalExceptionFilter` gdy brak jawnego `code`. |

## Kody HTTP (mapowanie)

| HTTP | Typowe `code` (jawne w payloadzie wyjątku) | Fallback `DEFAULT_HTTP_STATUS_TO_CODE` |
|------|---------------------------------------------|--------------------------------------|
| 400 | `VALIDATION_FAILED`, `MODEL_ALIAS_NOT_FOUND`, `MODEL_NOT_ALLOWED` | `VALIDATION_FAILED` |
| 401 | `GATEWAY_KEY_MISSING` (`GatewayKeyGuard`) | `PROVIDER_AUTH_FAILED` |
| 403 | `GATEWAY_KEY_INVALID` (`GatewayKeyGuard`) | `GATEWAY_KEY_INVALID` |
| 429 | `RATE_LIMITED` (gateway), `PROVIDER_RATE_LIMITED` (upstream) | `RATE_LIMITED` |
| 500 | `GATEWAY_KEY_NOT_CONFIGURED`, `INTERNAL_SERVER_ERROR` | `INTERNAL_SERVER_ERROR` |
| 502 | `PROVIDER_UNSUPPORTED`, `PROVIDER_UNAVAILABLE` | `PROVIDER_UNAVAILABLE` |
| 504 | `PROVIDER_TIMEOUT` | `PROVIDER_TIMEOUT` |

**Zasada:** ścieżki domenowe (guardy, `ChatService`, `provider-error.mapper.ts`) **zawsze** ustawiają jawne `code`. Fallback dotyczy wyjątków bez pola `code` (np. część błędów walidacji Nest).

**Stan implementacji:** envelope **`ErrorEnvelope`** (`openapi.json`); `GlobalExceptionFilter` zachowuje `code` z payloadu. Enum: `src/common/errors/api-error.code.ts` (w tym **`RATE_LIMITED`** i **`PROVIDER_RATE_LIMITED`**). **`requestId`**: `RequestIdMiddleware` + ewentualne nadpisanie z payloadu wyjątku w filtrze; nagłówek odpowiedzi **`x-request-id`** ustawiany w middleware razem z `req.requestId`.

Powiązane: `openapi.json`, `architektura_api.md`, `dokumentacja_api.md`, `anty-patterny.md`.

