---
wersja: 6
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-29
---

# SPEC — Fasady oficjalnych kontraktów (OpenAI / Anthropic)

## Cel / problem

Udostępnić **równoległe kontrakty HTTP** w kształcie API OpenAI Chat Completions oraz Anthropic Messages, żeby IDE (Cursor, Claude Code) i inne klienty vendora mogły mówić do gateway **bez** zmiany natywnego `POST /chat`.

Fasada **nie** wybiera vendora LLM. Routing zależy wyłącznie od pola `model` (= `modelAlias` z YAML) i `providerInstance`. Warstwa runtime (`src/providers/`) jest ortogonalna — `SPEC-PROVIDERS.md`, `docs/pl/dictionary.md` (fasada vs adapter).

Architektura: `docs/pl/integracje.md` / `docs/integrations.md`. OpenAPI: `openapi.json` (`BearerAuth`, `ApiKeyAuth`).

## Użytkownicy i scenariusze

### Scenariusz A — Cursor (OpenAI)

1. Operator ustawia Base URL `http://host:port/api/v1/openai` i klucz z allowlisty jako Bearer.
2. IDE woła `POST /chat/completions` z `model` = alias YAML.
3. Gateway mapuje request na `ChatService` i zwraca JSON `chat.completion` albo SSE OpenAI.

### Scenariusz B — Claude Code (Anthropic)

1. Operator ustawia Base URL `http://host:port/api/v1/anthropic` i klucz jako `x-api-key` (albo Bearer).
2. Klient woła `POST /messages`.
3. Gateway zwraca JSON Messages albo SSE Anthropic.

### Scenariusz C — ten sam alias, dwa kształty HTTP

Alias `chat-default` → `providerInstance: anthropic-primary` działa zarówno z `/openai/chat/completions`, jak i `/anthropic/messages`, i z natywnym `/chat`.

## Wymagania funkcjonalne — wspólne

F-1. Fasady są **anti-corruption layer**: kontrolery i mappery tłumaczą HTTP; jedynym orkiestratorem czatu pozostaje `ChatService` (cache exact i semantyczny na JSON **i** streamie — `SPEC-CHAT.md` F-8 / F-8b / F-8d, `SPEC-CHAT-STREAMING.md` F-10; retry, fallback, cooldown — `SPEC-CHAT.md` / `SPEC-CHAT-STREAMING.md`). Stream fasady: `resolveStreamCache` przed `flushHeaders`, hit → `replayStreamCacheHit`, miss → `executeStreamMiss` (jak native).

Zmiana względem: F-1 w wersji 5 („Stream fasady jak native v1: bez cache”). Powód: parity native stream cache w `OpenAiChatCompletionsController` / `AnthropicMessagesController`.

F-1a. Pola natywne cache (`cached`, `cachedAt`, `cacheSource` z `SPEC-CHAT.md` F-8 / F-8b) **nie** są mapowane do JSON vendora (`chat.completion` / Messages) ani do chunków SSE vendora (`openai-stream.mapper` / `anthropic-stream.mapper` ignorują `cached*`). Trafienie cache nadal zwraca 201 w kontrakcie OpenAI/Anthropic (JSON) — bez tych pól w body.
Nagłówek HTTP `X-Gateway-Cache: exact | semantic` przy hicie cache — **JSON (201) i stream (200 SSE)** fasady; brak nagłówka przy missie. Body / chunki vendora nadal bez `cached` / `cacheSource`.
Zmiana względem: F-1a w wersji 5 („brak nagłówka … na streamie”). Powód: parity JSON — `setHeader(GATEWAY_CACHE_HEADER, cacheSource)` przed `flushHeaders` na ścieżce hit.

F-2. Pole `model` w requeście fasady mapuje się na `modelAlias` YAML (`openai-request.mapper.ts`, `anthropic-request.mapper.ts`). Wartość spoza allowlisty → błąd w **formacie vendora** (nie surowy `ErrorEnvelope`), bez wywołania LLM.

F-3. Rola / pole `system` od klienta **nie** steruje promptem systemowym. Gateway nadpisuje / ignoruje je na rzecz plików w `src/config/system-prompt/` (jak native).

F-4. Klucz klienta (Bearer / `x-api-key`) jest z **tej samej allowlisty** co `X-Gateway-Key`. Nie jest przekazywany do SDK vendora. Pusta allowlista → `GATEWAY_KEY_NOT_CONFIGURED` (HTTP 500 w kodzie guarda, body w **formacie vendora** po filtrze fasady) — `SPEC-PLATFORMA-I-KONTRAKTY.md` F-14.

F-5. Po auth działa `SmartRateLimitGuard` (RPS/burst jak native — `SPEC-PLATFORMA-I-KONTRAKTY.md` F-16; wyłączony, gdy `RATE_LIMIT_SMART_ENABLED` nie jest `true`). Cooldown po 429 upstream — te same `prepareRequestForExecution` / `handleProviderError` co native. Limit równoległych streamów przy `stream: true` jest egzekwowany **w kontrolerze fasady** (`checkConcurrentStreams` / `releaseStream`), bo ścieżka nie kończy się na `/stream`.

F-6. Katalog modeli fasad czyta **ten sam** `GatewayModelsCatalogService` co `SPEC-MODELS.md`, ale serializuje kształt vendora (`openai-models.mapper.ts`, `anthropic-models.mapper.ts`). `id` w odpowiedzi = alias YAML, nie `modelId` vendora.

F-7. Błędy HTTP fasady: lokalne filtry (`OpenAiExceptionFilter`, `AnthropicExceptionFilter`) — format vendora. Native `ErrorEnvelope` **nie** jest kontraktem tych tras.

F-8. Ingress fasady dopuszcza wyższe limity niż native (`INGRESS_LIMITS`: do 15000 wiadomości, content do 128000 znaków) — profil `'facade-openai'` / `'facade-anthropic'` w `ChatService`.

F-9. Sukces POST JSON → **201**; POST ze `stream: true` → **200** SSE. GET katalogu → **200**.

## OpenAI — `/api/v1/openai`

F-O1. Auth: `Authorization: Bearer <klucz z allowlisty>` (`OpenAiBearerAuthGuard`). Brak/zły token → błąd w kształcie OpenAI (`authentication_error` / analog).

F-O2. Trasy:

- `GET /api/v1/openai/models`
- `GET /api/v1/openai/models/:model`
- `POST /api/v1/openai/chat/completions` (`stream: true` → SSE `data: {...}` zakończone `data: [DONE]`)

F-O3. Mapowanie parametrów body (skrót; pełna tabela: `docs/pl/integracja_openai_kontrakt.md`): `temperature`, `max_tokens` / `max_completion_tokens` → `maxOutputTokens`, `top_p`, `stop`, kary, `seed`, `response_format.type`, `reasoning_effort` → thinking, `tools` / `tool_choice` → `tooling`, `parallel_tool_calls` → `params.parallelToolCalls`.

F-O4. `system_fingerprint` w odpowiedzi tylko gdy adapter upstream je dostarczy (pass-through z `ChatService`).

## Anthropic — `/api/v1/anthropic`

F-A1. Auth (`AnthropicApiKeyGuard`), priorytet:

1. `x-api-key`
2. `Authorization: Bearer` (fallback)

F-A2. Trasy:

- `GET /api/v1/anthropic/models`
- `GET /api/v1/anthropic/models/:model`
- `POST /api/v1/anthropic/messages` (`stream: true` → zdarzenia SSE Anthropic, m.in. `message_start`, `content_block_delta`, `message_delta`)

F-A3. `max_tokens` w body Messages jest wymagane przez kształt vendora i mapuje się na `params.maxOutputTokens`. Pole `system` w body jest **nadpisywane** promptami serwera. Tooling i structured output (`output_config.format`) — `docs/pl/integracja_anthropic_messages.md`.

## Wymagania niefunkcjonalne

NFR-1. Zmiana kształtu OpenAI nie może psuć kontraktu Anthropic (osobne podmoduły `src/integrations/openai` i `anthropic`).

NFR-2. Natywne `POST /chat` pozostaje niezmienione przez istnienie fasad.

NFR-3. Odpowiedzi fasad nie dumpują sekretów ani surowych stack trace SDK.

## Kryteria akceptacji

- [x] OpenAI: auth Bearer, katalog w formacie list/`data[].id` = alias, JSON 201 i SSE 200 (`openai-facade.e2e-spec.ts`, `facade-models.e2e-spec.ts`).
- [x] Anthropic: auth `x-api-key` (i fallback Bearer), katalog w formacie Anthropic, JSON 201 i SSE 200 (`anthropic-facade.e2e-spec.ts`).
- [x] `model` spoza YAML nie woła providera.
- [x] Ten sam alias działa na fasadzie niezależnie od `providerType` runtime (E2E mock + integracje live).
- [x] Błędy w formacie vendora, nie `ErrorEnvelope`.
- [x] RPS/burst na fasadzie przez `SmartRateLimitGuard`; concurrent streams przy `stream: true` w kontrolerze fasady.
- [x] *(Cache stream)* Hit streamu ustawia `X-Gateway-Cache`; body vendora bez `cacheSource` / `cachedAt` (controller + mapper specs).

## Poza zakresem

- Adapter runtime `type: openai` / `openai-compatible` — `SPEC-PROVIDERS.md`.
- Natywny katalog `GET /api/v1/models` — `SPEC-MODELS.md`.
- Implementacja 1:1 pełnego API OpenAI/Anthropic (Assistants, Batches, Files, itd.).
