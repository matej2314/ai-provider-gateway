---
wersja: 2
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-26
---

# SPEC — Provider adapters (Anthropic / Google Gemini / OpenAI)

## Cel / problem

Zamknąć integracje z providerami LLM w warstwie `src/providers/` tak, aby:

- logika aplikacyjna nie zależała od SDK providera,
- kontrakt request/response gateway był spójny,
- błędy providerów były mapowane do stabilnych kodów gateway,
- **wiele instancji tego samego typu** (np. `google` + `google-office`) mogło używać **różnych** kluczy API.

## Model runtime (multi-instance)

| Pojęcie | Znaczenie | Przykład |
|---------|-----------|----------|
| **`type`** | Typ adaptera w kodzie (`PROVIDER_TYPES`) — wybór fabryki SDK | `google`, `anthropic`, `openai`, `openai-compatible` |
| **`providerInstance`** | Klucz wpisu w `providers:` w YAML — unikalna instancja runtime | `google`, `google-office` |
| **`AIProvider`** | Obiekt portu (`complete` / `stream`) z własnym klientem SDK | jeden per `providerInstance` |

Przepływ przy starcie:

1. `configuration.ts` buduje mapę runtime `providers: Record<instanceId, ProviderInstanceRuntime>` (sekret z env per `apiKeyRef` / `baseUrlRef`).
2. `ProviderInstancesBootstrap.onApplicationBootstrap()` iteruje po `gateway.providers` (tylko wpisy z YAML; `enabled: false` pomijane).
3. Dla każdego `instanceId` wybiera fabrykę po `row.type`, wywołuje `factory(...)` i rejestruje wynik: `ProviderRegistryService.registerInstance(instanceId, type, provider)`.
4. Przy requeście `ProviderRegistryService.resolve(modelAlias)` czyta `models[alias].providerInstance` i zwraca **AIProvider tej instancji** (pole `providerName` = `instanceId`).

Implementacja: fabryki w `src/providers/factories/` (zwykłe funkcje, bez `@Injectable`), bootstrap w `provider-instances.bootstrap.ts`, rejestr w `provider-registry.service.ts`.

## Klucze API i URL (env)

Wartości uwierzytelniające i bazowe URL-e są wczytywane z env przez `apiKeyRef` / `baseUrlRef` w YAML (per **instancja**, nie per typ). Reguła startu — `SPEC-KONFIGURACJA.md` F-1a: niepusty klucz dla typów innych niż OpenAI; dla `openai` / `openai-compatible` klucz może być pusty, wymagany `baseUrlRef`.

Zmiana względem: wcześniejszy akapit w tym pliku („niepusty env pod `apiKeyRef` dla każdej włączonej instancji”). Powód: wyjątek typów OpenAI w `isApiKeyRequiredForProviderType`.

Szczegóły: `docs/pl/konfiguracja.md` / `docs/configuration.md`.

## Użytkownicy i scenariusze

### Scenariusz A — dodanie nowego **typu** providera (np. OpenAI)

1. Implementator dodaje wartość do `PROVIDER_TYPES` i tworzy fabrykę (implementacja portu `AIProvider`).
2. Rejestruje fabrykę w mapie `FACTORIES` w `provider-instances.bootstrap.ts`.
3. W YAML dodaje wpis `providers:` z odpowiednim `type`, `apiKeyRef` i (gdy wymagane) `baseUrlRef`; w `models:` wskazuje `providerInstance`.
4. `ChatProviderCallService` wywołuje zwrócony `AIProvider`; `ChatService` orkiestruje bez zmian w kontrolerze.

### Scenariusz A2 — dodanie drugiej instancji istniejącego typu (np. `google-office`)

1. W `gateway.config.yaml` dodaje wpis `google-office: { type: google, apiKeyRef: GOOGLE_OFFICE_API_KEY, enabled: true }`.
2. W `.env` ustawia `GOOGLE_OFFICE_API_KEY`.
3. Dodaje aliasy modeli z `providerInstance: google-office`.
4. Po restarcie bootstrap tworzy **drugi** `AIProvider` — bez zmian w kodzie fabryki.

### Scenariusz B — ujednolicone błędy

1. Anthropic zwraca 429.
2. Gateway mapuje to do `PROVIDER_RATE_LIMITED`.
3. Klient ma jeden kod obsługi, niezależnie od providera.

## Wymagania funkcjonalne

F-1. Każda instancja providera implementuje wspólny port (interfejs) `AIProvider`.

F-2. Adapter musi wspierać co najmniej:

- `complete` (standard),
- `stream` (jeśli provider wspiera).

F-2a. Port providera przyjmuje **znormalizowane** wejście rozmowy:

- `system?: string` — instrukcja systemowa przekazywana osobno,
- `messages[]` — role `user`, `assistant`, `tool` (oraz opcjonalne `toolCalls` na turze assistenta); bez `system` w body HTTP,
- `tools?`, `toolChoice?` — opcjonalne definicje narzędzi (port `ProviderChatInput`); mapowanie SDK w mapperach Anthropic / Google / OpenAI.

Uwaga: kontrakt HTTP **nie** przekazuje roli `system` w `messages[]`; pole `system` w porcie pochodzi z polityki gatewaya (pliki promptów).

F-3. Adapter mapuje parametry z kontraktu gateway do pól SDK (`ProviderCallOptions`):

- `temperature`, `maxOutputTokens` — wszystkie wdrożone adaptery (`anthropic`, `google`, `openai`, `openai-compatible`)
- `topP`, `stop` — Anthropic, Google; OpenAI: `stop` tylko Chat Completions
- `topK` — **Anthropic** (`top_k`, priorytet nad `topP` / `temperature` w `resolveAnthropicSamplingParams`) i **Google**; tylko z body requestu; OpenAI ignoruje (może powstać `warnings`)
- `seed` — **Google** oraz Chat Completions (`openai-compatible`); Anthropic ignoruje; Responses API nie mapuje
- `frequencyPenalty`, `presencePenalty` — **nie przekazywane** do SDK przez adaptery **`anthropic`** i **`google`** (pola akceptowane w API). Adapter **`openai-compatible`** (Chat Completions) **mapuje** je na `frequency_penalty` / `presence_penalty`. Adapter **`openai`** (Responses API) ich nie wysyła.
- `responseFormat` — tylko z body; mapowane gdy `type === json_object` przez Anthropic, Google i OpenAI (Chat Completions `response_format` / Responses `text.format`)
- `thinkingEnabled`, `thinkingBudget` — Anthropic (`anthropic-thinking.mapper.ts`), Google Gemini (`thinkingConfig`), OpenAI Responses (`reasoning.effort`); wymaga `capabilities.thinking: true`; odpowiedź może zawierać `thinkingContent`

Zmiana względem: wcześniejsze F-3 („`frequencyPenalty` / `presencePenalty` — nie przekazywane przez bieżące adaptery”, lista `temperature` tylko Anthropic/Google). Powód: adapter OpenAI Chat Completions przekazuje kary; Responses i Anthropic/Google — nie.

**Macierz per provider:** `docs/pl/dictionary.md` / `docs/dictionary.md` (sekcja mapowania parametrów), `docs/pl/konfiguracja.md`.

**Anthropic — jeden parametr losowości:** adapter wysyła do SDK wyłącznie jeden z `top_k`, `top_p`, `temperature` — priorytet: **`topK` > `topP` > `temperature`** (`resolveAnthropicSamplingParams`).

**OpenAI — adapter:** wdrożony (`create-openai-provider.ts`, `create-openai-compatible-provider-instance.ts`, `create-openai-provider.core.ts`). Routing: `type: openai` → Responses API; `type: openai-compatible` → Chat Completions. Wymaga `baseUrlRef`. Szczegóły: `docs/pl/provider_openai_runtime.md` / `docs/provider-openai-runtime.md`.

F-4. Adapter mapuje błędy SDK na błędy gateway:

- auth → `PROVIDER_AUTH_FAILED`
- 429 → `PROVIDER_RATE_LIMITED`
- timeout → `PROVIDER_TIMEOUT`
- 5xx → `PROVIDER_UNAVAILABLE`

**Stan implementacji (F-4):** `mapAnthropicSdkError` / `mapGoogleGenAiError` / `mapOpenAiSdkError` (`provider-error.mapper.ts`). `GlobalExceptionFilter` zachowuje `code` z payloadu.

F-4a. Gdy `models[].providerInstance` istnieje w YAML, ale instancja **nie** jest w rejestrze runtime (brak fabryki dla `type` albo bootstrap nie zarejestrował wpisu), `ProviderRegistryService` rzuca `PROVIDER_UNSUPPORTED` (`UnsupportedProviderException`). HTTP w kodzie: **500**.

Uwaga vs docs: `docs/pl/dictionary.md` / `docs/pl/lista_endpointów.md` przypisują `PROVIDER_UNSUPPORTED` do **502**. Wyjątek w `src/` używa `HttpStatus.INTERNAL_SERVER_ERROR` (500). Korekta dokumentacji — osobna decyzja.

F-5. Adapter nie loguje sekretów.

## Wymagania niefunkcjonalne

NFR-1. Adaptery nie mogą “przeciekać” typami SDK do warstwy HTTP (kontrakt gateway jest własny).

NFR-2. W przypadku braku wsparcia funkcji (np. stream) adapter musi zgłosić błąd domenowy, a nie próbować “udawać” streamingu.

NFR-3. Adapter nie może zakładać, że rola `system` jest wspierana w `messages[]` providera.
Jeśli provider wymaga osobnego pola `system` (np. Anthropic) — adapter używa `system` z portu.
Jeśli provider udostępnia natywne pole instrukcji systemowej (np. Google Gemini — `config.systemInstruction`), adapter używa tego pola zamiast wstrzykiwać `system` jako wiadomość użytkownika.
Mapowanie `system` na pierwszą wiadomość `user` jest dopuszczalne **tylko** jako fallback dla providerów bez osobnego pola.

## Kryteria akceptacji

- [x] Cztery typy providerów (Anthropic, Google Gemini, OpenAI, OpenAI-compatible) działają zgodnie z portem `AIProvider` (fabryki + bootstrap).
- [x] Rejestr providerów jest indeksowany po **`providerInstance`**, nie po `type`.
- [x] W YAML dozwolone są **wiele wpisów** z tym samym `type` (unikalne `apiKeyRef` per instancja).
- [x] Błędy 429/timeout/5xx/auth są mapowane na wspólne kody `PROVIDER_*` (F-4); testy: `provider-error.mapper.spec.ts`.
- [x] Niezarejestrowana instancja → `PROVIDER_UNSUPPORTED` (F-4a).
- [x] Dodanie nowego **typu** wymaga fabryki + wpisu w `FACTORIES` oraz rozszerzenia `PROVIDER_TYPES` / schematu YAML — bez zmian w kontrolerach HTTP.

## Poza zakresem (względem rdzenia MVP)

- Zaawansowany routing (hedging, multi-hop fallback chains, routing po intencji).
- Automatyczne wykrywanie dostępnych modeli po API providerów.

**Uwaga:** prosty **fallback jednego hopu** (`models[].fallback` + `ResilientExecutor`) jest wdrożony na warstwie gateway — `SPEC-CHAT.md` (F-10), `docs/pl/konfiguracja.md`.

## Notatki implementacyjne — mapowanie SDK

Tabela referencyjna: port providera (`ProviderChatInput` + `modelId`) → używane SDK. Wersje: `package.json`.

### Anthropic — `@anthropic-ai/sdk`

| Port providera | Pole SDK |
|----------------|----------|
| `system` | `messages.create({ system })` — osobne pole, nie wiadomość |
| `messages[]` (`user` / `assistant` / `tool`) | `messages.create({ messages })` — mapowanie tool turns przez `anthropic-tools.mapper.ts` |
| `tools`, `toolChoice` | `tools`, `tool_choice` w `messages.create` |
| `modelId` | `messages.create({ model })` |
| `options.temperature` | `messages.create({ temperature })` — **nie** razem z `top_p` w tym samym wywołaniu |
| `options.topP` | `messages.create({ top_p })` — **nie** razem z `temperature` |
| `options.maxOutputTokens` | `messages.create({ max_tokens })` |
| `options.stop` | `messages.create({ stop_sequences })` — string → `[string]` |
| `options.responseFormat` (`type: json_object`) | `messages.create({ output_config: { format: { type: json_schema, schema } } })` — domyślny schemat `{ type: object, additionalProperties: true }` gdy brak `jsonSchema` |
| `input.metadata.userId` | `messages.create({ metadata: { user_id } })` |
| `response.text` | konkatenacja `response.content[*].text` (gdzie `type === 'text'`) |
| `usage.inputTokens` / `usage.outputTokens` | `response.usage.input_tokens` / `response.usage.output_tokens` |
| `usageDetails` | `cache_read_input_tokens` / `cache_creation_input_tokens` (ścieżka tool calling / `parseAnthropicResponseWithTools`) |

### Google Gemini — `@google/genai` (1.52+)

SDK `@google/genai` zastąpiło wcześniejszy pakiet `@google/generative-ai`. Adapter musi używać **wyłącznie** nowego SDK; stare API (`GoogleGenerativeAI`, `getGenerativeModel`, `model.startChat`, `result.response.text()`) **nie istnieje** w `@google/genai`.

| Port providera | Pole / wywołanie SDK |
|----------------|----------------------|
| inicjalizacja | `new GoogleGenAI({ apiKey })` |
| `system` | `config.systemInstruction` w `ai.chats.create({ config })` lub `ai.models.generateContent({ config })` |
| `messages[]` (`user` / `assistant` / `tool`) | `Content[]` + `functionCall` / `functionResponse` parts — `google-tools.mapper.ts` |
| `tools`, `toolChoice` | `tools: [{ functionDeclarations }]`, `toolConfig` w `config` |
| `modelId` | `ai.chats.create({ model })` lub `ai.models.generateContent({ model })` |
| `options.temperature`, `options.topP`, `options.maxOutputTokens`, `options.stop`, `options.seed` | `config` / `generationConfig` — **temperature i topP mogą współistnieć** |
| `options.responseFormat` (`type: json_object`) | `response_format: application/json`, opcjonalnie `response_schema: jsonSchema` |
| wywołanie sync | `chat.sendMessage({ message })` — `GenerateContentResponse` bezpośrednio |
| wywołanie stream | `chat.sendMessageStream({ message })` — `AsyncGenerator<GenerateContentResponse>` |
| `response.text` | property (getter) — **nie** `response.text()` |
| `usage.inputTokens` / `usage.outputTokens` | `response.usageMetadata.promptTokenCount` / `response.usageMetadata.candidatesTokenCount` |

Dla rdzenia MVP wystarczy `chats.create`. Dla pojedynczych zapytań bez historii idiomatyczne jest `ai.models.generateContent({ model, contents, config })`.

### OpenAI — `@openai/openai` (6.x)

Szczegóły warstwy runtime: `docs/pl/provider_openai_runtime.md` / `docs/provider-openai-runtime.md`.

Fabryki `create-openai-provider.ts` i `create-openai-compatible-provider-instance.ts` — wspólna logika `create-openai-provider.core.ts`. Routing: **`type: openai`** → Responses API (`responses.adapter.ts`); **`type: openai-compatible`** → Chat Completions (`chat-completions.adapter.ts`). Parametry thinking na ścieżce Responses: `reasoning.effort`.

| Port providera | Pole SDK (Chat Completions) | Pole SDK (Responses API) |
|----------------|----------------------------|--------------------------|
| `options.temperature` | `temperature` | `temperature` |
| `options.topP` | `top_p` | `top_p` |
| `options.maxOutputTokens` | `max_tokens` | `max_output_tokens` |
| `options.stop` | `stop` | — |
| `options.frequencyPenalty` | `frequency_penalty` | — |
| `options.presencePenalty` | `presence_penalty` | — |
| `options.seed` | `seed` | — |
| `options.responseFormat` | `response_format` | `text.format.type: json_object` |
| `options.thinkingEnabled` + effort | — | `reasoning.effort` + `reasoning.summary: auto` |
| `systemFingerprint` (odpowiedź) | `system_fingerprint` | — |

Typ **`openai-compatible`**: zawsze Chat Completions; wymaga `baseUrlRef`; opcjonalne `apiSurface: chat-completions` lub pominięte — inne wartości zabronione w Zod. Typ **`openai`**: zawsze Responses API; pole `apiSurface` w YAML jest zabronione.
