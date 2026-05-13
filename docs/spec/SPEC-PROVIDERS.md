# SPEC — Provider adapters (Anthropic / Google Gemini)

## Cel / problem

Zamknąć integracje z providerami LLM w adapterach tak, aby:

- logika aplikacyjna nie zależała od SDK providera,
- kontrakt request/response gateway był spójny,
- błędy providerów były mapowane do stabilnych kodów gateway.

## Klucze API (env)

Wartości uwierzytelniające są wczytywane z env (w konfiguracji modeli: `apiKeyRef`). W **`NODE_ENV=production`** przy starcie obowiązuje reguła z `src/config/env.validation.ts`: **co najmniej jeden** niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (szczegóły: `docs/konfiguracja.md`). W development reguła ta nie blokuje startu, ale wywołanie adaptera bez klucza kończy się błędem konfiguracji.

## Użytkownicy i scenariusze

### Scenariusz A — dodanie nowego providera

1. Implementator tworzy nowy adapter (np. OpenAI).
2. Rejestruje go w module Providers.
3. Konfiguracja pozwala wskazać `providerInstance` typu `openai`.
4. ChatService używa go bez zmian w kontrolerze.

### Scenariusz B — ujednolicone błędy

1. Anthropic zwraca 429.
2. Gateway mapuje to do `PROVIDER_RATE_LIMITED`.
3. Klient ma jeden kod obsługi, niezależnie od providera.

## Wymagania funkcjonalne

F-1. Każdy adapter implementuje wspólny port (interfejs) providera.

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

**Stan implementacji (F-4):** adaptery rzucają obecnie standardowe `HttpException` (Nest), a `GlobalExceptionFilter` mapuje status HTTP → `code` (400→`VALIDATION_FAILED`, 429→`PROVIDER_RATE_LIMITED`, 502→`PROVIDER_UNAVAILABLE`, 504→`PROVIDER_TIMEOUT`, inne→`INTERNAL_SERVER_ERROR`). Dedykowany kod **`PROVIDER_AUTH_FAILED`** dla 401 oraz pełne mapowanie błędów SDK (np. odczyt status code z `error.response`) wymagają rozszerzenia w **Fazie 5** — `docs/dokumentacja_koncepcyjna.md`, `docs/dokumentacja_api.md`.

F-5. Adapter nie loguje sekretów.

## Wymagania niefunkcjonalne

NFR-1. Adaptery nie mogą “przeciekać” typami SDK do warstwy HTTP (kontrakt gateway jest własny).

NFR-2. W przypadku braku wsparcia funkcji (np. stream) adapter musi zgłosić błąd domenowy, a nie próbować “udawać” streamingu.

NFR-3. Adapter nie może zakładać, że rola `system` jest wspierana w `messages[]` providera.
Jeśli provider wymaga osobnego pola `system` (np. Anthropic) — adapter używa `system` z portu.
Jeśli provider udostępnia natywne pole instrukcji systemowej (np. Google Gemini przez `@google/genai` — `config.systemInstruction`), adapter używa tego pola zamiast wstrzykiwać `system` jako wiadomość użytkownika.
Mapowanie `system` na pierwszą wiadomość `user` jest dopuszczalne **tylko** jako fallback dla providerów, które nie udostępniają osobnego pola — w rdzeniu MVP (wybrane SDK Anthropic / Gemini) nie dotyczy żadnego z używanych adapterów.

## Kryteria akceptacji

- [ ] Dwa adaptery (Anthropic i Google Gemini) działają zgodnie z portem.
- [ ] Błędy 429/timeout są mapowane na te same `code`.
- [ ] Dodanie trzeciego adaptera (np. OpenAI) nie wymaga zmian w kontrolerach.

## Poza zakresem (względem rdzenia MVP)

- Zaawansowany routing (fallback, hedging, multi-provider).
- Automatyczne wykrywanie dostępnych modeli po API providerów.

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

