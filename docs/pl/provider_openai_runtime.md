# Adapter OpenAI (provider runtime)

> **Fasada ≠ adapter:** ten dokument dotyczy **wyłącznie** warstwy `src/providers/` (`type: openai` i `type: openai-compatible` w YAML).  
> Kontrakt HTTP dla Cursor (`/api/v1/openai/*`, `src/integrations/openai/`) opisuje [`integracja_openai_kontrakt.md`](integracja_openai_kontrakt.md).  
> Definicje terminów: [`dictionary.md`](dictionary.md) (sekcja „Fasada vs provider runtime”).

## Rola adaptera

| | **Fasada OpenAI** | **Adapter OpenAI (ten dokument)** |
|---|---|---|
| **Katalog** | `src/integrations/openai/` | `src/providers/factories/create-openai-provider.ts`, `create-openai-compatible-provider-instance.ts` |
| **Wejście** | HTTP od klienta (Cursor) | `ChatProviderCallService` przez `ProviderRegistryService` |
| **Wyjście** | JSON/SSE w kształcie OpenAI API | Wywołanie endpointu OpenAI (oficjalny lub compatible) przez SDK |
| **Auth klienta** | Bearer = klucz gateway | — |
| **Auth vendora** | — | `apiKeyRef` + `baseUrlRef` w YAML |
| **Wymaga drugiej warstwy?** | Nie | Nie |

Adapter implementuje port **`AIProvider`** — ten sam kontrakt co `create-anthropic-provider.ts` i `create-google-provider.ts`. Nie rejestruje tras HTTP i nie obsługuje autoryzacji klientów fasady.

Routing między Chat Completions a Responses API odbywa się w `create-openai-provider.core.ts` według **`type`** wpisu w YAML (nie w fasadzie HTTP): `openai` → Responses API, `openai-compatible` → Chat Completions.

## Kiedy adapter jest używany

1. W `gateway.config.yaml` wpis `providers:` ma `type: openai` lub `type: openai-compatible` i unikalny `providerInstance`.
2. Alias w `models[]` wskazuje ten `providerInstance` oraz vendorowy `modelId` (np. `gpt-4o`).
3. `ChatService` / `ChatProviderCallService` wywołuje `AIProvider.complete` / `stream` — **niezależnie** od tego, czy klient użył natywnego `/chat`, fasady `/openai` czy `/anthropic`.

## Składniki adaptera

| Element | Rola |
|---------|------|
| `PROVIDER_TYPES`: `openai`, `openai-compatible` | Typy w schemacie YAML |
| `create-openai-provider.ts` | Fabryka `type: openai` |
| `create-openai-compatible-provider-instance.ts` | Fabryka `type: openai-compatible` |
| `create-openai-provider.core.ts` | Routing Responses vs Chat Completions |
| Mapery `*-provider.mapper.ts` | Mapowanie opcji gateway → SDK |
| Adaptery `chat-completions` / `responses` | Wywołania SDK |
| Testy jednostkowe fabryk i mapperów | `src/providers/**/*.spec.ts` |
| Fasada `/api/v1/openai` mapująca `params.*` | Osobna warstwa HTTP — [`integracja_openai_kontrakt.md`](integracja_openai_kontrakt.md) |
| `provider:test` dla typu OpenAI (CLI) | Test SDK z CLI |

Szczegóły procesu dodania typu: [`spec/SPEC-PROVIDERS.md`](spec/SPEC-PROVIDERS.md) (scenariusz A).

## Mapowanie SDK

### Chat Completions

| Parametr gateway | Pole SDK |
|------------------|----------|
| `temperature` | `temperature` |
| `topP` | `top_p` |
| `maxOutputTokens` | `max_tokens` |
| `stop` | `stop` |
| `frequencyPenalty` | `frequency_penalty` |
| `presencePenalty` | `presence_penalty` |
| `seed` | `seed` |
| `responseFormat` | `response_format` |
| `systemFingerprint` (odpowiedź) | `system_fingerprint` → `systemFingerprint` w gateway |

### Responses API

Używane **zawsze** dla instancji `type: openai` (`create-openai-provider.core.ts` → `createResponsesAdapter`). Parametry thinking (`thinkingEnabled`, string `thinkingBudget`) mapowane na `reasoning.effort` + `reasoning.summary: auto`.

| Parametr gateway | Pole SDK |
|------------------|----------|
| `temperature` | `temperature` |
| `maxOutputTokens` | `max_output_tokens` |
| `topP` | `top_p` |
| `thinkingEnabled` + effort | `reasoning.effort` + `reasoning.summary: auto` |
| `responseFormat: json_object` | `text.format.type: json_object` |
| `thinkingContent` (odpowiedź) | reasoning summary z output / stream |

Macierz wsparcia względem innych adapterów: [`dictionary.md`](dictionary.md) (tabela parametrów generacji).

## Konfiguracja

```yaml
providers:
  openai:
    type: openai
    enabled: true
    apiKeyRef: OPENAI_API_KEY
    baseUrlRef: OPENAI_BASE_URL
    # type: openai zawsze używa Responses API — pole apiSurface jest zabronione (walidacja Zod)

  ollama-local:
    type: openai-compatible
    enabled: true
    apiKeyRef: OLLAMA_API_KEY
    baseUrlRef: OLLAMA_BASE_URL
    # apiSurface: chat-completions  # opcjonalne; jedyna dozwolona wartość

models:
  gpt-cheap:
    providerInstance: openai
    modelId: gpt-5.4-nano
    capabilities:
      streaming: true
      tools: true
      thinking: false  # Responses API wspiera thinking, ale wymaga capabilities.thinking: true
  ollama-local-chat:
    providerInstance: ollama-local
    modelId: llama3.1:8b
    capabilities:
      streaming: true
      tools: false
      thinking: false
```

W `.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OLLAMA_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

Pole `baseUrl` **nie** występuje w YAML — tylko `baseUrlRef` wskazujący zmienną środowiskową.

## Powiązane dokumenty

- [`integracja_openai_kontrakt.md`](integracja_openai_kontrakt.md) — fasada HTTP (Cursor)
- [`integracje.md`](integracje.md) — architektura fasad oficjalnych kontraktów
- [`dictionary.md`](dictionary.md) — słownik, macierz parametrów
- [`konfiguracja.md`](konfiguracja.md) — YAML, env, reguły `policy.params`
- [`spec/SPEC-PROVIDERS.md`](spec/SPEC-PROVIDERS.md) — kryteria akceptacji adapterów
- [`testy.md`](testy.md) — `*-facade*.e2e-spec.ts` testują fasadę HTTP, nie adapter SDK
