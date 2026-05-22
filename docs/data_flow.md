# Przepływ danych (data flow) — AI Provider Gateway

Dokument uzupełnia `dokumentacja_api.md` i `architektura.md`: pokazuje kierunek danych między klientem, warstwą HTTP (NestJS), logiką aplikacyjną oraz adapterami providerów.

**Konfiguracja:** przy starcie ładowany jest `gateway.config.yaml` (`src/config/configuration.ts`). Env: w **production** wymagany jest co najmniej jeden niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`). Opcjonalnie: zmienne cache/Redis — `docs/konfiguracja.md`.

## Legenda uczestników

| Skrót | Znaczenie |
|-------|-----------|
| **Klient** | Dowolny klient HTTP (aplikacja, serwis, BFF). |
| **HTTP** | Kontroler + walidacja DTO + odpowiedź. |
| **ChatService** | Cache, smart rate limit (cooldown), `ResilientExecutor`, budowa odpowiedzi gateway (`id`, `conversationId`, `effectiveModelAlias`). |
| **ChatProviderCallService** | Pojedyncze wywołanie adaptera: `buildProviderInputForAlias`, `resolveProviderCallOptions`, `MetricsService.observeLlmCall` / `observeLlmStream`, emisja SSE `meta`/`delta`. |
| **ResilientExecutor** | Retry na aliasie żądanym (`policy.retry`, `policy.timeoutMs`), potem opcjonalnie alias `fallback` z YAML. |
| **Registry** | `ProviderRegistryService` — mapowanie aliasu z YAML na adapter + `modelId`. |
| **Provider** | Adapter Anthropic / Google. |
| **LLM API** | Zewnętrzny serwis providera. |
| **ResponseCache** | `ResponseCacheService` — opcjonalny odczyt/zapis odpowiedzi **`POST /api/v1/chat`** (klucz z hasha: `modelAlias`, `messages`, sygnatura system promptu, efektywne parametry wywołania); brak wpływu na streaming. |
| **Metrics** | `MetricsService` + Sentry/noop — span `gen_ai.chat` per wywołanie LLM; **`gen_ai.conversation.id`** tylko gdy klient poda `conversationId`; `messages[]` → atrybuty input/output przy `SENTRY_INCLUDE_PROMPTS` (`conversation-tracking.md`). |

---

## 0. Wspólny szkielet: walidacja, wybór modelu

```mermaid
sequenceDiagram
  autonumber
  participant K as Klient
  participant H as HTTP (ChatController)
  participant S as ChatService
  participant C as ResponseCache

  K->>+H: POST /api/v1/chat (JSON)
  H->>H: ValidationPipe (DTO)
  Note over H: RequestIdMiddleware (req.requestId + response header x-request-id); GatewayKeyGuard + SmartRateLimitGuard na czacie
  H->>+S: executeChat(request)
  S->>C: get (opcjonalnie)
  alt cache HIT
    C-->>S: zapisana odpowiedź
    S-->>-H: 200 JSON (cached)
  else cache MISS / wyłączony
    Note over S: resolve + provider (szczegóły: sekcja 1)
    S-->>-H: wynik lub wyjątek HTTP
  end
  H-->>-K: 200 JSON lub błąd
```

---

## 1. Standard `POST /api/v1/chat` — sukces (200)

```mermaid
sequenceDiagram
  autonumber
  participant K as Klient
  participant H as HTTP
  participant S as ChatService
  participant PC as ChatProviderCallService
  participant C as ResponseCache
  participant R as ProviderRegistry
  participant M as MetricsService
  participant P as Provider Adapter
  participant A as LLM API

  K->>+H: POST /api/v1/chat (modelAlias, messages, conversationId?, params?)
  H->>H: walidacja DTO
  H->>+S: executeChat
  S->>S: conversationId response (echo/conv_*)
  S->>+R: resolve(modelAlias)
  R-->>-S: adapter + policy.params
  S->>S: resolveProviderCallOptions(policy, body.params)
  S->>C: getCachedResponse (z efektywnymi params)
  alt trafienie w cache (provider włączony w YAML)
    C-->>S: JSON (z cached/cachedAt)
    S-->>H: odpowiedź
  else brak wpisu
    S->>S: checkCooldown (opcjonalnie, smart limit)
    S->>S: ResilientExecutor (retry / fallback / timeout)
    S->>+PC: completeOnce (per alias w łańcuchu)
    PC->>PC: buildProviderInputForAlias + resolveProviderCallOptions
    PC->>+M: observeLlmCall
    M->>+P: complete(input, modelId, options)
    P->>+A: request do providera
    A-->>-P: response
    P-->>-M: ProviderChatResponse
    M-->>-PC: wynik + span Sentry
    PC-->>-S: response + resolved
    S->>C: setCachedResponse
    S-->>-H: ChatResponse (id, usage, requestId, conversationId, effectiveModelAlias?, …)
  end
  H-->>-K: 200 JSON (+ conversationId)
```

**Uwagi:** opcjonalne **`params`** w body są scalane z `policy.params` w YAML (`resolveProviderCallOptions`) przed cache i wywołaniem providera. Odpowiedź z cache zawiera **`cached: true`** i **`cachedAt`**; pole **`requestId`** pochodzi z żądania zapisanej w cache (nie jest nadpisywane na nowe ID per request). Błąd **`MODEL_NOT_ALLOWED`** może powstać już po `resolve`, przed wywołaniem LLM.

---

## 2. Standard `POST /api/v1/chat` — błąd

Odpowiedzi JSON błędów są w envelope **`ErrorEnvelope`** (`openapi.json`) z polami `{statusCode, code, message, requestId, details?}` — `GlobalExceptionFilter` (global). **`code`** pochodzi z payloadu wyjątku (m.in. auth brzegowy, `MODEL_NOT_ALLOWED`, `MODEL_ALIAS_NOT_FOUND`) lub z domyślnego mapowania statusu; pełny słownik: `dictionary.md`.

```mermaid
sequenceDiagram
  participant H as HTTP
  participant S as ChatService
  participant P as Provider
  participant A as LLM API

  H->>S: executeChat
  S->>P: complete
  P->>A: request
  alt błąd HTTP / timeout (SDK)
    A-->>P: błąd
    P-->>S: wyjątek
    S-->>H: odpowiedź błędu Nest / propagacja
  end
```

---

## 3. Streaming `POST /api/v1/chat/stream` — sukces (SSE)

Zgodnie z `openapi.json` i kodem (`ChatStreamController`, `ChatService.executeStream`): nagłówki SSE, potem `meta`, `delta`, `done` (`done` z pustym `data`).

```mermaid
sequenceDiagram
  autonumber
  participant K as Klient
  participant H as HTTP (ChatStreamController)
  participant S as ChatService
  participant PC as ChatProviderCallService
  participant R as ProviderRegistry
  participant M as MetricsService
  participant P as Provider Adapter
  participant A as LLM API

  K->>+H: POST /api/v1/chat/stream
  H->>H: walidacja DTO + validateForStreaming
  H->>H: nagłówki SSE + flushHeaders
  H->>+S: executeStream
  S->>S: conversationId response
  S->>+R: resolve
  R-->>-S: adapter + capabilities
  S->>S: ResilientExecutor (retry / fallback / timeout)
  S->>+PC: streamOnce (emit przez callback)
  PC->>PC: buildProviderInputForAlias
  PC->>M: observeLlmStream
  PC-->>H: SSE meta (id, conversationId, effectiveModelAlias?)
  H-->>K: event meta
  PC->>+P: stream(...)
  P->>+A: streaming request
  loop fragmenty
    A-->>P: chunk
    P-->>PC: tekst
    PC-->>H: delta
    H-->>K: SSE: event delta
  end
  S-->>H: emit done
  H-->>-K: SSE: event done
```

---

Powiązane: `openapi.json`, `dokumentacja_api.md`, `architektura.md`, `dictionary.md` (kody `RATE_LIMITED` / `PROVIDER_RATE_LIMITED`), `konfiguracja.md`.
