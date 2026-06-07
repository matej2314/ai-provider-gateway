# Słownik (dictionary) — AI Provider Gateway

Ten dokument utrwala wspólny język między użytkownikami projektu, integratorami i implementacją. Nazwy pól w JSON są techniczne; opisy są po polsku.

## Podstawowe pojęcia

| Termin | Definicja | Uwagi |
|--------|-----------|------|
| **Gateway / Proxy** | Warstwa pośrednia unifikująca integrację z LLM providerami. | Nie jest “open proxy” do dowolnych URL. |
| **Fasada integracji** | Warstwa HTTP w `src/integrations/` mapująca kontrakt vendora (OpenAI / Anthropic Messages) na wewnętrzny `ChatRequestDto` i `ChatService`. | Osobne ścieżki `/api/v1/openai/…`, `/api/v1/anthropic/…`; nie zastępuje natywnego `/chat`. |
| **Klucz klienta** | Sekret z allowlisty gateway (`GATEWAY_KEY_*` / YAML) używany przez aplikację lub IDE. | `X-Gateway-Key`, Bearer (OpenAI fasada) lub `x-api-key` (Anthropic fasada) — ta sama lista, różne nagłówki. |
| **Klucz providera** | Sekret w `.env` do wywołań SDK; w YAML wskazany przez **`apiKeyRef` per `providerInstance`** (np. `GOOGLE_API_KEY`, `GOOGLE_OFFICE_API_KEY`). | Fabryki w `src/providers/factories/`; bootstrap w `ProviderInstancesBootstrap`; nigdy klucz klienta. |
| **Provider type** | Wartość z `PROVIDER_TYPES` — wybór fabryki SDK w kodzie (`anthropic`, `google`, …). | W YAML: pole `type` wpisu w `providers:`. |
| **Provider instance** (`providerInstance`) | Unikalny klucz wpisu w `providers:` w YAML; własny `apiKeyRef`, `enabled`, powiązane modele. | Runtime: klucz w `ProviderRegistryService`; pole `provider` w odpowiedzi HTTP = `instanceId`. Wiele instancji tego samego `type` dozwolone. CLI: `provider:add` / `edit` / `remove`, `provider:test [instanceId]`. |
| **Provider** | Konkretna instancja runtime (`AIProvider`) powiązana z jednym kluczem API. | Implementacja przez fabrykę + port `AIProvider`. |
| **Adapter / fabryka providera** | Funkcja tworząca `AIProvider` dla jednego klucza API (np. `createGoogleProvider`). | Ukrywa SDK; bez `@Injectable` / `ConfigService`. |
| **Integration root** | Segment Base URL w IDE: `.../api/v1/openai` lub `.../api/v1/anthropic`. | Klient dokleja `/models`, `/chat/completions`, `/messages`. |
| **Model alias** | Zwyczajowa / czytelna nazwa modelu używana w gateway (np. `chat-default`, `claude-sonnet`, `gemini-flash`). | Mapowana do `providerInstance` + vendorowy `modelId` + `policy` w `gateway.config.yaml`. |
| **Fallback alias** | Opcjonalny alias zapasowy (`models[].fallback` w YAML). | Używany przez `ResilientExecutor` po wyczerpaniu retry na aliasie żądanym. |
| **Effective model alias** (`effectiveModelAlias`) | Alias faktycznie użyty do wywołania providera. | Obecny w odpowiedzi JSON / SSE `meta` tylko gdy żądany alias różni się od użytego (sukces na fallbacku). Pole `model` = żądany `modelAlias`. |
| **Standard** | Tryb odpowiedzi: pełna odpowiedź JSON. | `POST /api/v1/chat`. |
| **Streaming** | Tryb odpowiedzi: SSE. | `POST /api/v1/chat/stream` — patrz `openapi.json`, `dokumentacja_api.md`. |
| **Request ID** | Identyfikator korelacyjny żądania. | `RequestIdMiddleware`: nagłówek żądania `x-request-id` (echo) lub `req_<uuid>`; to samo ID w body (`requestId`), w envelope błędów oraz w nagłówku odpowiedzi **`x-request-id`** (`src/common/middleware/request-id.middleware.ts`). |
| **Conversation ID** (`conversationId`) | Opcjonalny identyfikator w body czatu w formacie `conv_<uuid>`. W **request** włącza `gen_ai.conversation.id` w Sentry; w **response** zawsze echo lub `conv_<uuid>`. Historia = `messages[]` od klienta. Patrz `conversation-tracking.md`. |
| **Policy** | Zestaw limitów i zasad (`timeoutMs`, `retry`, `params`). | Per alias w YAML; `timeout`/`retry` w `ResilientExecutor`, `params` w `resolveProviderCallOptions`. |
| **Resilient executor** | Warstwa retry + fallback + timeout wokół wywołania adaptera. | `src/common/resilience/resilient-executor.ts`; `runOnce` deleguje do `ChatProviderCallService` (`ChatModule`). |
| **Response cache** | Opcjonalna warstwa zapisu/odczytu odpowiedzi **`POST /api/v1/chat`** (backend `noop` lub `redis`). | Lookup/zapis w `ChatService`; odczyt cache tylko gdy provider i alias są włączone w YAML (`isCachedChatAllowedForModelAlias`). Klucz m.in. z aliasu, `messages`, sygnatury system promptu i efektywnych `params`. Streaming bez cache. |
| **Walidacja env (klucze)** | Reguły na zmiennych środowiskowych przy starcie aplikacji. | Przy **`NODE_ENV=production`** wymagany jest **co najmniej jeden** niepusty klucz (po `trim()`) spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`. W innych środowiskach ta reguła nie blokuje startu (`src/config/env.validation.ts`). Dodatkowo walidowane są opcjonalne pola **`CACHE_*`** / **`REDIS_*`** (typy, wartości domyślne). |
| **Gateway CLI** | Narzędzie wiersza poleceń do inicjalizacji i zarządzania konfiguracją (`bin/gateway-cli-wrapper.js`, `npm run cli`, bin `gateway`). | Osobny entry point od HTTP; **nie** importuje `ConfigModule`. Konwencja: `gateway <namespace>:<action>`. Komendy: `config:*`, `provider:*`, `model:*`, `client:*`, `key:generate`. Patrz `CLI.md`. |
| **Placeholder config** | Wzorzec konfiguracji `gateway.config.placeholder.yaml` w repozytorium z placeholderami (`PLACEHOLDER_*`, `enabled: false`). | Przechodzi walidację schematu, ale **nie** pozwala wystartować serwisowi HTTP. Wizard `config:init` wykrywa boilerplate w `gateway.config.yaml` przez `isBoilerplateConfig()` (`masterKeyRef` z `PLACEHOLDER`/`placeholder` lub ID providera/klienta zawierające `placeholder`) i generuje pełną konfigurację. |
| **CliConfigLoader** | Serwis CLI (`CliConfigLoaderService`) ładujący `gateway.config.yaml` przez `GatewayConfigSchema` **bez** wymagania `.env`. | Metody: `loadRawConfig`, `loadWithEnvCheck`, `isBoilerplateConfig`, `configExists`, `envExists`. Nie wywołuje `buildEffectiveGatewayConfig()`. |
| **Wizard state** | Plik `.gateway-wizard-state.json` w katalogu roboczym — persistencja niedokończonego `config:init` (`WizardStateManager`). | Resume po ponownym uruchomieniu; rollback utworzonych plików przy odrzuceniu resume. |

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
| `RATE_LIMITED` | Limit nałożony przez gateway: smart rate limit per `X-Gateway-Key` (`SmartRateLimitGuard`, `ChatService` cooldown po 429 od providera). HTTP **429**. |
| `PROVIDER_TIMEOUT` | Przekroczono timeout dla wywołania providera. |
| `PROVIDER_UNAVAILABLE` | Provider zwrócił błąd 5xx lub jest niedostępny. |
| `STREAMING_NOT_SUPPORTED` | Wybrany model/provider nie wspiera streamingu. |
| `GATEWAY_KEY_NOT_CONFIGURED` | Brak allowlisty kluczy w runtime (np. nie zarejestrowano `gatewayKey` w konfiguracji) — **500**, guard zwraca ten kod (`GatewayKeyGuard`). Przy poprawnym starcie z `gateway.config.yaml` i env scenariusz nie występuje. |
| `GATEWAY_KEY_MISSING` | Brak nagłówka `X-Gateway-Key` dla chronionego endpointu — **401** (`GatewayKeyGuard`). |
| `GATEWAY_KEY_INVALID` | Wartość `X-Gateway-Key` spoza allowlisty — **403** (`GatewayKeyGuard`). |

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

