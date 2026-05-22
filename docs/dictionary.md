# Słownik (dictionary) — AI Provider Gateway

Ten dokument utrwala wspólny język między użytkownikami projektu, integratorami i implementacją. Nazwy pól w JSON są techniczne; opisy są po polsku.

## Podstawowe pojęcia

| Termin | Definicja | Uwagi |
|--------|-----------|------|
| **Gateway / Proxy** | Warstwa pośrednia unifikująca integrację z LLM providerami. | Nie jest “open proxy” do dowolnych URL. |
| **Provider** | Konkretny dostawca LLM (Anthropic, Google Gemini, ewentualnie OpenAI). | Implementowany jako adapter. |
| **Adapter** | Implementacja kontraktu gateway dla danego providera. | Ukrywa SDK i szczegóły request/response. |
| **Model ID** | Vendorowa nazwa modelu (np. `gpt-*`, `claude-*`). | Trafia do requestów providera. |
| **Model alias** | Zwyczajowa / czytelna nazwa modelu używana w gateway (np. `chat-default`, `claude-sonnet`, `gemini-flash`). | Mapowana do `providerInstance` + vendorowy `modelId` + `policy` w `gateway.config.yaml`. |
| **Fallback alias** | Opcjonalny alias zapasowy (`models[].fallback` w YAML). | Używany przez `ResilientExecutor` po wyczerpaniu retry na aliasie żądanym. |
| **Effective model alias** (`effectiveModelAlias`) | Alias faktycznie użyty do wywołania providera. | Obecny w odpowiedzi JSON / SSE `meta` tylko gdy żądany alias różni się od użytego (sukces na fallbacku). Pole `model` = żądany `modelAlias`. |
| **Standard** | Tryb odpowiedzi: pełna odpowiedź JSON. | `POST /api/v1/chat`. |
| **Streaming** | Tryb odpowiedzi: SSE. | `POST /api/v1/chat/stream` — patrz `openapi.json`, `dokumentacja_api.md`. |
| **Request ID** | Identyfikator korelacyjny żądania. | W logach i w error envelope. |
| **Conversation ID** (`conversationId`) | Opcjonalny identyfikator w body czatu w formacie `conv_<uuid>`. W **request** włącza `gen_ai.conversation.id` w Sentry; w **response** zawsze echo lub `conv_<uuid>`. Historia = `messages[]` od klienta. Patrz `conversation-tracking.md`. |
| **Policy** | Zestaw limitów i zasad (`timeoutMs`, `retry`, `params`). | Per alias w YAML; `timeout`/`retry` w `ResilientExecutor`, `params` w `resolveProviderCallOptions`. |
| **Resilient executor** | Warstwa retry + fallback + timeout wokół wywołania adaptera. | `src/common/resilience/resilient-executor.ts`; `runOnce` deleguje do `ChatProviderCallService` (`ChatModule`). |
| **Response cache** | Opcjonalna warstwa zapisu/odczytu odpowiedzi **`POST /api/v1/chat`** (backend `noop` lub `redis`). | Lookup/zapis w `ChatService`; odczyt cache tylko gdy provider i alias są włączone w YAML (`isCachedChatAllowedForModelAlias`). Klucz m.in. z aliasu, `messages`, sygnatury system promptu i efektywnych `params`. Streaming bez cache. |
| **Walidacja env (klucze)** | Reguły na zmiennych środowiskowych przy starcie aplikacji. | Przy **`NODE_ENV=production`** wymagany jest **co najmniej jeden** niepusty klucz (po `trim()`) spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`. W innych środowiskach ta reguła nie blokuje startu (`src/config/env.validation.ts`). Dodatkowo walidowane są opcjonalne pola **`CACHE_*`** / **`REDIS_*`** (typy, wartości domyślne). |

## Kody błędów (stabilne)

Kody są częścią kontraktu API. Klient powinien opierać logikę na `code`, a nie na `message`.

| Code | Znaczenie |
|------|-----------|
| `VALIDATION_FAILED` | Body requestu lub parametry nie przeszły walidacji. |
| `MODEL_ALIAS_NOT_FOUND` | Podany `modelAlias` nie istnieje w konfiguracji gateway. |
| `MODEL_NOT_ALLOWED` | Model, tryb (np. streaming) lub pole w `params` (np. `temperature`) nie jest dozwolone przez policy (`allowOverrides`). |
| `PROVIDER_UNSUPPORTED` | Provider wskazany w konfiguracji nie ma adaptera w kodzie. |
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

| HTTP | Przykładowe `code` |
|------|---------------------|
| 400 | `VALIDATION_FAILED`, `MODEL_ALIAS_NOT_FOUND`, `MODEL_NOT_ALLOWED` |
| 401 | `PROVIDER_AUTH_FAILED` *(jeśli mapujesz 401 od providera jako 502/401 zależnie od polityki)* |
| 429 | `RATE_LIMITED`, `PROVIDER_RATE_LIMITED` |
| 502 | `PROVIDER_UNAVAILABLE` |
| 504 | `PROVIDER_TIMEOUT` |
| 401 | `GATEWAY_KEY_MISSING` |
| 403 | `GATEWAY_KEY_INVALID` |
| 500 | `GATEWAY_KEY_NOT_CONFIGURED` |

**Stan implementacji:** odpowiedzi błędów są w envelope **`ErrorEnvelope`** (`openapi.json`) z polem **`code`**. `GlobalExceptionFilter` **zachowuje** jawne kody z payloadu wyjątku (m.in. **`GATEWAY_KEY_*`**, **`RATE_LIMITED`**, **`MODEL_ALIAS_NOT_FOUND`**, **`STREAMING_NOT_SUPPORTED`**, **`PROVIDER_*`** z `provider-error.mapper.ts`). W przeciwnym razie: `DEFAULT_HTTP_STATUS_TO_CODE` (`src/common/errors/api-error.code.ts`). **`requestId`**: `RequestIdMiddleware` + ewentualnie nadpisanie z payloadu wyjątku. Pole **`message`**: string (`join('; ')` przy walidacji).

Powiązane: `openapi.json`, `architektura_api.md`, `dokumentacja_api.md`, `anty-patterny.md`.

