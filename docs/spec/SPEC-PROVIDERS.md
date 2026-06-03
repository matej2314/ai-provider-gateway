# SPEC — Provider adapters (Anthropic / Google Gemini)

## Cel / problem

Zamknąć integracje z providerami LLM w warstwie `src/providers/` tak, aby:

- logika aplikacyjna nie zależała od SDK providera,
- kontrakt request/response gateway był spójny,
- błędy providerów były mapowane do stabilnych kodów gateway,
- **wiele instancji tego samego typu** (np. `google` + `google-office`) mogło używać **różnych** kluczy API.

## Model runtime (multi-instance)

| Pojęcie | Znaczenie | Przykład |
|---------|-----------|----------|
| **`type`** | Typ adaptera w kodzie (`PROVIDER_TYPES`) — wybór fabryki SDK | `google`, `anthropic` |
| **`providerInstance`** | Klucz wpisu w `providers:` w YAML — unikalna instancja runtime | `google`, `google-office` |
| **`AIProvider`** | Obiekt portu (`complete` / `stream`) z własnym klientem SDK | jeden per `providerInstance` |

Przepływ przy starcie:

1. `configuration.ts` buduje mapę runtime `providers: Record<instanceId, ProviderInstanceRuntime>` (klucz API z env per `apiKeyRef`).
2. `ProviderInstancesBootstrap.onApplicationBootstrap()` iteruje po `gateway.providers` (tylko wpisy z YAML; `enabled: false` pomijane).
3. Dla każdego `instanceId` wybiera fabrykę po `row.type`, wywołuje `factory(apiKey, logger)` i rejestruje wynik: `ProviderRegistryService.registerInstance(instanceId, type, provider)`.
4. Przy requeście `ProviderRegistryService.resolve(modelAlias)` czyta `models[alias].providerInstance` i zwraca **AIProvider tej instancji** (pole `providerName` = `instanceId`).

Implementacja: fabryki w `src/providers/factories/` (zwykłe funkcje, bez `@Injectable`), bootstrap w `provider-instances.bootstrap.ts`, rejestr w `provider-registry.service.ts`.

## Klucze API (env)

Wartości uwierzytelniające są wczytywane z env przez **`apiKeyRef`** w YAML (per **instancja**, nie per typ). W **`NODE_ENV=production`** przy starcie obowiązuje reguła z `src/config/env.validation.ts`: **co najmniej jeden** niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (szczegóły: `docs/konfiguracja.md`). Dla każdego **aktywnego** `providerInstance` `buildEffectiveGatewayConfig` wymaga niepustego env wskazanego przez `apiKeyRef`. W development reguła globalna nie blokuje startu, ale brak klucza dla używanej instancji kończy się błędem bootstrapu lub API.

## Użytkownicy i scenariusze

### Scenariusz A — dodanie nowego **typu** providera (np. OpenAI)

1. Implementator dodaje wartość do `PROVIDER_TYPES` i tworzy fabrykę `create-openai-provider.ts` (implementacja portu `AIProvider`).
2. Rejestruje fabrykę w mapie `FACTORIES` w `provider-instances.bootstrap.ts`.
3. W YAML dodaje wpis `providers:` z `type: openai` i unikalnym `apiKeyRef`; w `models:` wskazuje `providerInstance`.
4. `ChatProviderCallService` wywołuje zwrócony `AIProvider`; `ChatService` orkiestruje bez zmian w kontrolerze.

### Scenariusz A2 — dodanie drugiej instancji istniejącego typu (np. `google-office`)

1. W `gateway.config.yaml` dodaje wpis `google-office: { type: google, apiKeyRef: GOOGLE_OFFICE_API_KEY, enabled: true }`.
2. W `.env` ustawia `GOOGLE_OFFICE_API_KEY`.
3. Dodaje aliasy modeli z `providerInstance: google-office`.
4. Po restarcie bootstrap tworzy **drugi** `AIProvider` (drugi klient SDK) — bez zmian w kodzie fabryki.

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
- `messages[]` — wyłącznie role `user` i `assistant` (bez `system`).

Uwaga: kontrakt HTTP **nie** przekazuje roli `system` w `messages[]`; pole `system` w porcie providera pochodzi z polityki gatewaya (pliki promptów), nie z body żądania.

F-3. Adapter mapuje parametry z kontraktu gateway do pól SDK:

- `temperature`
- `maxOutputTokens` (lub odpowiednik)

F-4. Adapter mapuje błędy SDK na błędy gateway:

- auth → `PROVIDER_AUTH_FAILED`
- 429 → `PROVIDER_RATE_LIMITED`
- timeout → `PROVIDER_TIMEOUT`
- 5xx → `PROVIDER_UNAVAILABLE`

**Stan implementacji (F-4):** fabryki providerów używają `mapAnthropicSdkError` / `mapGoogleGenAiError` (`provider-error.mapper.ts`) → `HttpException` z kodami m.in. **`PROVIDER_AUTH_FAILED`**, **`PROVIDER_RATE_LIMITED`**, **`PROVIDER_TIMEOUT`**, **`PROVIDER_UNAVAILABLE`**. `GlobalExceptionFilter` zachowuje `code` z payloadu.

F-5. Adapter nie loguje sekretów.

## Wymagania niefunkcjonalne

NFR-1. Adaptery nie mogą “przeciekać” typami SDK do warstwy HTTP (kontrakt gateway jest własny).

NFR-2. W przypadku braku wsparcia funkcji (np. stream) adapter musi zgłosić błąd domenowy, a nie próbować “udawać” streamingu.

NFR-3. Adapter nie może zakładać, że rola `system` jest wspierana w `messages[]` providera.
Jeśli provider wymaga osobnego pola `system` (np. Anthropic) — adapter używa `system` z portu.
Jeśli provider udostępnia natywne pole instrukcji systemowej (np. Google Gemini przez `@google/genai` — `config.systemInstruction`), adapter używa tego pola zamiast wstrzykiwać `system` jako wiadomość użytkownika.
Mapowanie `system` na pierwszą wiadomość `user` jest dopuszczalne **tylko** jako fallback dla providerów, które nie udostępniają osobnego pola — w rdzeniu MVP (wybrane SDK Anthropic / Gemini) nie dotyczy żadnego z używanych adapterów.

## Kryteria akceptacji

- [x] Dwa typy providerów (Anthropic i Google Gemini) działają zgodnie z portem `AIProvider` (fabryki + bootstrap).
- [x] Rejestr providerów jest indeksowany po **`providerInstance`**, nie po `type`.
- [x] W YAML dozwolone są **wiele wpisów** z tym samym `type` (unikalne `apiKeyRef` per instancja).
- [ ] Błędy 429/timeout są mapowane na te same `code`.
- [ ] Dodanie trzeciego **typu** (np. OpenAI) wymaga tylko fabryki + wpisu w `FACTORIES`, bez zmian w kontrolerach.

## Poza zakresem (względem rdzenia MVP)

- Zaawansowany routing (hedging, multi-hop fallback chains, routing po intencji).
- Automatyczne wykrywanie dostępnych modeli po API providerów.

**Uwaga:** prosty **fallback jednego hopu** (`models[].fallback` + `ResilientExecutor`) jest wdrożony na warstwie gateway — patrz `konfiguracja.md`, `SPEC-CHAT.md` (F-10).

## Notatki implementacyjne — mapowanie SDK

Tabela referencyjna pokazująca jak port providera (`ProviderChatInput` + `modelId`) mapuje się na używane SDK. Opisuje **aktualnie zainstalowane** wersje (`package.json`).

### Anthropic — `@anthropic-ai/sdk`

| Port providera | Pole SDK |
|----------------|----------|
| `system` | `messages.create({ system })` — osobne pole, nie wiadomość |
| `messages[]` (`user` / `assistant`) | `messages.create({ messages })` — te same role |
| `modelId` | `messages.create({ model })` |
| `response.text` | konkatenacja `response.content[*].text` (gdzie `type === 'text'`) |
| `usage.inputTokens` / `usage.outputTokens` | `response.usage.input_tokens` / `response.usage.output_tokens` |

### Google Gemini — `@google/genai` (1.52+)

SDK `@google/genai` zastąpiło wcześniejszy pakiet `@google/generative-ai`. Adapter musi używać **wyłącznie** nowego SDK; stare API (`GoogleGenerativeAI`, `getGenerativeModel`, `model.startChat`, `result.response.text()`) **nie istnieje** w `@google/genai` i nie wolno się na nim opierać.

| Port providera | Pole / wywołanie SDK |
|----------------|----------------------|
| inicjalizacja | `new GoogleGenAI({ apiKey })` |
| `system` | `config.systemInstruction` w `ai.chats.create({ config })` lub `ai.models.generateContent({ config })` |
| `messages[]` (`user` / `assistant`) | `Content[]` z `role: 'user' \| 'model'` (`assistant` → `model`) i `parts: [{ text }]`; historia musi naprzemiennie zawierać `user`/`model` i zaczynać się od `user` |
| `modelId` | `ai.chats.create({ model })` lub `ai.models.generateContent({ model })` |
| wywołanie sync | `chat.sendMessage({ message })` — zwraca `GenerateContentResponse` bezpośrednio (nie zagnieżdżone w `result.response`) |
| wywołanie stream | `chat.sendMessageStream({ message })` — zwraca `AsyncGenerator<GenerateContentResponse>`; iterujemy bez `.stream` |
| `response.text` | property (getter) — **nie** `response.text()` |
| `usage.inputTokens` / `usage.outputTokens` | `response.usageMetadata.promptTokenCount` / `response.usageMetadata.candidatesTokenCount` |

Dla rdzenia MVP wystarczy `chats.create` (obsługuje historię i system instruction). Dla pojedynczych zapytań bez historii idiomatyczne jest `ai.models.generateContent({ model, contents, config })`.

