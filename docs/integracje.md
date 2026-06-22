# Fasady integracji (IDE) — AI Provider Gateway

Moduł **`src/integrations/`** dodaje **równoległe kontrakty HTTP** dla narzędzi, które oczekują kształtu API vendora (OpenAI lub Anthropic), bez zmiany rdzenia gatewaya (`POST /api/v1/chat`, warstwa providerów w `src/providers/`).

## Fasada ≠ provider runtime

| | **Fasada** (`src/integrations/`) | **Provider runtime** (`src/providers/`) |
|---|----------------------------------|----------------------------------------|
| **Cel** | Kompatybilność **kontraktu HTTP** z narzędziami (Cursor, Claude Code) | Wywołanie LLM u vendora przez SDK |
| **OpenAI** | `/api/v1/openai/*` — kształt OpenAI API | `type: openai` w YAML (planowany adapter) — osobna sprawa |
| **Anthropic** | `/api/v1/anthropic/*` — kształt Anthropic Messages API | `type: anthropic` w YAML — adapter SDK |
| **Gwarancja backendu** | **Brak** — fasada nie wiąże się z vendorem | Tak — `providerInstance` + `modelId` w konfiguracji |

Fasady istnieją, ponieważ OpenAI Chat Completions API i Anthropic Messages API stały się **de facto standardami** dla klientów IDE. Gateway implementuje te kształty HTTP nad jednym `ChatService`; **kierowanie zapytań do providera** odbywa się wyłącznie przez **`modelAlias`** (`model` w fasadzie) i `gateway.config.yaml`, nie przez wybór trasy `/openai` vs `/anthropic`.

Pełna definicja terminów: [`dictionary.md`](dictionary.md) (sekcja „Fasada vs provider runtime”).

## Filozofia

| Zasada | Opis |
|--------|------|
| **Trzy kontrakty, jeden silnik** | Kontrolery i mappery tłumaczą HTTP; **`ChatService`** pozostaje jedynym orchestratorem (cache, retry, fallback, limity). |
| **Anti-corruption layer** | Podmoduły `openai/` i `anthropic/` są izolowane — zmiana formatu OpenAI nie wpływa na Messages API. |
| **Bez zmiany natywnego API** | `ChatController` / `ChatStreamController` i warstwa providerów pozostają punktem odniesienia dla aplikacji pisanych pod kontrakt gateway. |
| **Separacja kluczy** | Klucze **klientów** (IDE → gateway) ≠ klucze **providerów** (gateway → LLM w `.env`). |

## Stan wdrożenia

| Element | Status |
|---------|--------|
| Szkielet katalogów `src/integrations/{openai,anthropic}/` | W repozytorium |
| `IntegrationsModule` w `AppModule` | Zarejestrowany |
| `Request.gatewayKey` w `src/common/types/express.d.ts` | W repozytorium |
| Eksport `ChatService`, `SmartRateLimitGuard` z `ChatModule` | W repozytorium — fasady importują guard z `src/guards/smart-rate-limit-guard.ts` przez `@OpenAiAuth()` / `@AnthropicAuth()` |
| `readClientGatewayKey` + aktualizacja `SmartRateLimitGuard` / `StreamCleanupInterceptor` | **Wdrożone** (`src/common/readClientGatewayKey.ts`) |
| **Fasada OpenAI** (`OpenAiModule`) — auth, models, completions JSON + stream | **Wdrożona** — [`integracja-openai-kontrakt.md`](integracja-openai-kontrakt.md) |
| **Fasada Anthropic** (`AnthropicModule`) — auth, models, messages JSON + stream | **Wdrożona** — [`integracja-anthropic-messages.md`](integracja-anthropic-messages.md) |
| Testy E2E kontraktu HTTP (mock providerów) | **Wdrożone** — `test/e2e/gateway-chat*.e2e-spec.ts`, `openai-integration*.e2e-spec.ts`, `anthropic-integration*.e2e-spec.ts` — [`testy.md`](testy.md) |

Szczegóły konfiguracji klientów (Cursor, Claude Code): **`integracja-openai-kontrakt.md`**, **`integracja-anthropic-messages.md`**.

## Widok architektury

```mermaid
flowchart TB
  subgraph clients [Klienci]
    native[Aplikacje — kontrakt gateway]
    cursor[Cursor IDE — OpenAI API]
    claude[Claude Code — Anthropic Messages API]
  end

  subgraph integrations [src/integrations]
    openaiF[openai/ — Bearer, format OpenAI]
    anthropicF[anthropic/ — x-api-key, format Anthropic]
  end

  subgraph core [Rdzeń gateway]
    chat[ChatService + ChatProviderCallService]
    providers[Providers Module — fabryki + rejestr instancji]
  end

  native -->|X-Gateway-Key POST /chat| chat
  cursor -->|Bearer POST /openai/chat/completions| openaiF
  claude -->|x-api-key POST /anthropic/messages| anthropicF
  openaiF --> chat
  anthropicF --> chat
  chat --> providers
```

## Trzy powierzchnie API

Globalny prefiks aplikacji: **`/api/v1`** (`API_GLOBAL_PREFIX` w `src/setup.app.ts`).

| Powierzchnia | Base URL (przykład) | Auth klienta | Główne trasy |
|--------------|---------------------|--------------|--------------|
| **Natywna** | `http://host:3000/api/v1` | `X-Gateway-Key` | `POST /chat`, `POST /chat/stream` |
| **OpenAI** | `http://host:3000/api/v1/openai` | `Authorization: Bearer <klucz_klienta>` | `GET /models`, `POST /chat/completions` |
| **Anthropic** | `http://host:3000/api/v1/anthropic` | `x-api-key` (lub Bearer) | `GET /models`, `POST /messages` |

IDE ustawia **Base URL** z segmentem integracji; klient dokleja ścieżki ze specyfikacji vendora (`/models`, `/chat/completions`, `/messages`) — ten sam wzorzec co `https://api.openai.com/v1` + `/chat/completions`.

**Świadomie brak** wspólnej trasy `GET /api/v1/models` — OpenAI i Anthropic mają różny kształt listy modeli.

Stałe ścieżek w `src/integrations/integrations.constants.ts`:

- `OPENAI_INTEGRATION_PATH = 'openai'`
- `ANTHROPIC_INTEGRATION_PATH = 'anthropic'`

## Mapowanie modeli

Pole **`model`** w żądaniu fasady (OpenAI / Anthropic) = **`modelAlias`** z `gateway.config.yaml` (np. `chat-default`, `claude-sonnet`). Vendorowy `modelId` pozostaje w konfiguracji; klient IDE nie podaje go bezpośrednio.

`GET .../models` zwraca aliasy włączone w YAML (provider instancji `enabled !== false`), w formacie JSON odpowiedniego standardu.

## Autoryzacja — dwa poziomy

### Klucze klientów (frontend / IDE → gateway)

Wszystkie trzy powierzchnie weryfikują **tę samą allowlistę** (`gatewayKey.allowList` z `.env` / `gateway.config.yaml`):

| Powierzchnia | Nagłówek | Guard |
|--------------|----------|-------|
| Natywna | `X-Gateway-Key` | `GatewayKeyGuard` |
| OpenAI | `Authorization: Bearer` | `OpenAiBearerAuthGuard` → `req.gatewayKey` |
| Anthropic | `x-api-key` (priorytet) lub Bearer | `AnthropicApiKeyGuard` → `req.gatewayKey` |

Kody błędów wewnętrzne (`GATEWAY_KEY_MISSING`, `GATEWAY_KEY_INVALID`) są mapowane na format OpenAI (`error.type`) lub Anthropic w **lokalnych filtrach** (`OpenAiExceptionFilter`, `AnthropicExceptionFilter`). `GlobalExceptionFilter` nadal obsługuje natywne API.

### Klucze providerów (gateway → LLM)

Adaptery w `src/providers/` używają wyłącznie `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` itd. z `.env` — **nigdy** klucza klienta z IDE.

## Smart rate limit

Fasady muszą współdzielić **`SmartRateLimiterService`** z natywnym API.

**Kolejność guardów (wymagana):**

1. Guard auth fasady (ustawia `req.gatewayKey`)
2. `SmartRateLimitGuard` (token bucket RPS, równoległe streamy)

**Cooldown** po 429 od providera: `ChatService.executeChat` → `SmartRateLimiterService.checkCooldown` / `setCooldown` (tylko czat standardowy JSON, nie streaming).

**Helper `readClientGatewayKey(req)`** (`src/common/readClientGatewayKey.ts`):

- integracje: `req.gatewayKey` po guardzie fasady,
- natywne API: `X-Gateway-Key` (`readGatewayKeyHeader`).

**Równoległe streamy:** natywny `POST /chat/stream` — `SmartRateLimitGuard` (URL kończy się na `/stream`) + `StreamCleanupInterceptor`. Fasady OpenAI / Anthropic (`stream: true` w body) — **rezerwacja i zwolnienie slotu w kontrolerze fasady** (guard nie parsuje body `stream`).

## Przepływ żądania (implementacja)

1. HTTP → kontroler fasady + walidacja DTO vendora.
2. Mapper request → `ChatRequestDto` (`modelAlias`, `messages`, opcjonalnie `params`, `metadata`, `tooling` — tools/tool_calls z kontraktu vendora).
3. `ChatService.executeChat` / `executeStream` z `req.gatewayKey` i `req.requestId`.
4. Mapper response / stream → format OpenAI lub Anthropic.
5. Pola specyficzne dla gateway (`provider`, `cached`, `conversationId`) **nie** są eksponowane w fasadach MVP.

## Limity walidacji (ChatIngressValidator)

Gateway stosuje **różne profile walidacji** dla natywnego API i fasad IDE:

| Profil | Endpoint | Max messages | Max content (user/assistant) | Max content (tool) |
|--------|----------|--------------|------------------------------|---------------------|
| `native` | `/api/v1/chat`, `/api/v1/chat/stream` | 150 | 3000 | 32000 |
| `facade-openai` | `/api/v1/openai/chat/completions` | 15000 | 128000 | 128000 |
| `facade-anthropic` | `/api/v1/anthropic/messages` | 15000 | 128000 | 128000 |

**Implementacja:** `src/chat/validation/chat-ingress.validator.ts` — walidacja przed wejściem do `ChatService`.  
**Testy:** `src/chat/validation/chat-ingress.validator.spec.ts`, E2E w `test/e2e/`.

## Streaming

| API | Format strumienia |
|-----|-------------------|
| Natywny | SSE gateway: `meta` → `delta` → `done` |
| OpenAI | SSE zgodny z OpenAI Chat Completions (`data: {...}`) |
| Anthropic | SSE zgodny z Anthropic Messages (zdarzenia `message_start`, `content_block_delta`, …) |

Wewnętrznie fasady korzystają z `ChatProviderCallService.streamOnce` i mapują zdarzenia gateway na format vendora.

## Błędy i filtry

- **Natywne API:** `GlobalExceptionFilter` → `ErrorEnvelope`.
- **Fasady:** lokalne filtry na kontrolerach (`@OpenAiAuth()`, `@AnthropicAuth()`) — kształt JSON jak u vendora, z zachowaniem nagłówka **`x-request-id`**.

## Ograniczenia MVP fasad

| Temat | Decyzja |
|-------|---------|
| `system` w messages klienta | **Ignorowane** — prompt z `src/config/system-prompt/` (źródło: serwer, nie body klienta) |
| Tools / function calling | Mapowane na wewnętrzne `tooling` (`openai-tools.mapper.ts`, `anthropic-tools.mapper.ts`); wymaga `capabilities.tools: true` na aliasie |
| Multimodal (obrazy) | Nieobsługiwane — 400 przy blokach `image` (Anthropic) |
| Cache odpowiedzi | Działa przez `ChatService` dla wywołań non-stream; pola `cached` ukryte w odpowiedzi fasady |
| `system_fingerprint` / `systemFingerprint` | Fasada OpenAI: pass-through gdy upstream zwraca (praktycznie OpenAI). Fasada Anthropic: brak pola. Anthropic/Gemini nie mają odpowiednika upstream — patrz `dictionary.md` |
| OpenAPI / Swagger | Tagi **OpenAI API** i **Anthropic API** w `openapi.json` i Swagger UI; osobne schematy błędów (`OpenAiErrorResponseDto`, `AnthropicErrorResponseDto`) |

## Struktura plików

```
src/integrations/
├── integrations.module.ts
├── integrations.constants.ts
├── openai/
│   ├── controllers/     # models, chat/completions
│   ├── services/        # models catalog (kontrolery wywołują ChatService bezpośrednio)
│   ├── mappers/         # request, response, stream, tools, messages
│   ├── helpers/         # normalize-openai-content, openai-stream-api-description
│   ├── guards/          # Bearer auth
│   ├── filters/         # OpenAI-shaped errors
│   ├── decorators/      # @OpenAiAuth()
│   └── dtos/            # w tym openai-error-response.dto.ts
└── anthropic/
    ├── controllers/     # models, messages
    ├── services/
    ├── mappers/         # request, response, stream, tools
    ├── helpers/         # anthropic-stream-api-description
    ├── guards/          # x-api-key auth
    ├── filters/
    ├── decorators/      # @AnthropicAuth()
    └── dtos/            # w tym anthropic-error-response.dto.ts
```

## Powiązane dokumenty

- `integracja-openai-kontrakt.md` — konfiguracja Cursor IDE
- `integracja-anthropic-messages.md` — konfiguracja Claude Code
- `lista_endpointów.md` — pełna lista tras (w tym fasady)
- `data_flow.md` — diagramy przepływu
- `architektura.md`, `architektura-katalogi-pliki.md`
- `dictionary.md` — pojęcia (fasada, klucz klienta)
- `anty-patterny.md` — pułapki przy wielu kontraktach
- `testy.md` — testy E2E fasad i natywnego czatu
