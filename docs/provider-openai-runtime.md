# Adapter OpenAI (provider runtime) — plan

> **Fasada ≠ adapter:** ten dokument dotyczy **wyłącznie** warstwy `src/providers/` (`type: openai` w YAML).  
> Kontrakt HTTP dla Cursor (`/api/v1/openai/*`, `src/integrations/openai/`) opisuje [`integracja-openai-kontrakt.md`](integracja-openai-kontrakt.md).  
> Definicje terminów: [`dictionary.md`](dictionary.md) (sekcja „Fasada vs provider runtime”).

## Rola adaptera

| | **Fasada OpenAI** | **Adapter OpenAI (ten dokument)** |
|---|-------------------|-----------------------------------|
| **Katalog** | `src/integrations/openai/` | `src/providers/factories/create-openai-provider.ts` *(planowany)* |
| **Wejście** | HTTP od klienta (Cursor) | `ChatProviderCallService` przez `ProviderRegistryService` |
| **Wyjście** | JSON/SSE w kształcie OpenAI API | Wywołanie api.openai.com przez SDK |
| **Auth klienta** | Bearer = klucz gateway | — |
| **Auth vendora** | — | `OPENAI_API_KEY` / `apiKeyRef` w YAML |
| **Wymaga drugiej warstwy?** | Nie | Nie |
| **Status** | Wdrożone | **Nie wdrożone** — brak fabryki w repo |

Adapter implementuje port **`AIProvider`** — ten sam kontrakt co `create-anthropic-provider.ts` i `create-google-provider.ts`. Nie rejestruje tras HTTP i nie obsługuje autoryzacji klientów IDE.

## Kiedy adapter jest używany

1. W `gateway.config.yaml` wpis `providers:` ma `type: openai` i unikalny `providerInstance`.
2. Alias w `models[]` wskazuje ten `providerInstance` oraz vendorowy `modelId` (np. `gpt-4o`).
3. `ChatService` / `ChatProviderCallService` wywołuje `AIProvider.complete` / `stream` — **niezależnie** od tego, czy klient użył natywnego `/chat`, fasady `/openai` czy `/anthropic`.

Przykład: Cursor → fasada OpenAI → `ChatService` → adapter **Google**, jeśli alias tak skonfigurowano. Adapter OpenAI wchodzi w grę **tylko** gdy YAML tak wskaże.

## Stan wdrożenia

| Element | Status |
|---------|--------|
| `PROVIDER_TYPES` z wartością `openai` | Do weryfikacji przy implementacji |
| `create-openai-provider.ts` | **Brak** w repozytorium |
| `openai-tools.mapper.ts` (lub analog) | **Brak** |
| Testy jednostkowe fabryki | **Brak** (`create-openai-provider.spec.ts`) |
| Fasada `/api/v1/openai` mapująca `params.*` | **Wdrożona** — wywołanie i tak idzie przez alias |
| `provider:test` dla typu OpenAI | **Brak** (CLI testuje Anthropic / Google) |

Szczegóły procesu dodania typu: [`spec/SPEC-PROVIDERS.md`](spec/SPEC-PROVIDERS.md) (scenariusz A).

## Oczekiwane mapowanie SDK (orientacyjnie)

Po wdrożeniu fabryki — mapowanie `ProviderCallOptions` → OpenAI Chat Completions (`@openai/openai`):

| Parametr gateway | Pole SDK |
|------------------|----------|
| `temperature` | `temperature` |
| `topP` | `top_p` |
| `maxOutputTokens` | `max_completion_tokens` / `max_tokens` |
| `stop` | `stop` |
| `frequencyPenalty` | `frequency_penalty` |
| `presencePenalty` | `presence_penalty` |
| `seed` | `seed` |
| `responseFormat` | `response_format` |
| `systemFingerprint` (odpowiedź) | `system_fingerprint` → `systemFingerprint` w gateway |

Macierz wsparcia względem innych adapterów: [`dictionary.md`](dictionary.md) (tabela parametrów generacji).

## Konfiguracja (docelowa)

```yaml
providers:
  openai-main:
    type: openai
    enabled: true
    apiKeyRef: OPENAI_API_KEY

models:
  gpt-4o-alias:
    providerInstance: openai-main
    modelId: gpt-4o
    # policy, capabilities — jak dla innych typów
```

W `.env`: `OPENAI_API_KEY=sk-...` (nazwa z `apiKeyRef`).

Do czasu wdrożenia fabryki aliasy muszą wskazywać **`anthropic`** lub **`google`** — patrz [`konfiguracja.md`](konfiguracja.md).

## Powiązane dokumenty

- [`integracja-openai-kontrakt.md`](integracja-openai-kontrakt.md) — fasada HTTP (Cursor)
- [`integracje.md`](integracje.md) — architektura fasad IDE
- [`dictionary.md`](dictionary.md) — słownik, macierz parametrów
- [`konfiguracja.md`](konfiguracja.md) — YAML, env, reguły `policy.params`
- [`spec/SPEC-PROVIDERS.md`](spec/SPEC-PROVIDERS.md) — kryteria akceptacji adapterów
- [`testy.md`](testy.md) — `*-facade*.e2e-spec.ts` testują fasadę HTTP, nie adapter SDK
