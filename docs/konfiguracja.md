# Konfiguracja — AI Provider Gateway

Cel: “plug&play” — użytkownik wypełnia env + pliki konfiguracyjne i uruchamia gateway bez zmian w kodzie.

## 1) Sekrety i env (`.env`)

Zasada: **sekrety tylko w env**. Pliki konfiguracyjne nie zawierają wartości kluczy.

Przykładowe zmienne (nazwy mogą różnić się od implementacji — dokument synchronizuj z `src/config`):

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY` *(docelowo)*

W repo powinien istnieć `.env.example` bez wartości sekretów.

## 2) Pliki konfiguracyjne (modele/polityki)

Rekomendacja: jeden plik “gateway config” w formacie YAML/JSON, wczytywany przy starcie.

### Schemat koncepcyjny (v1)

```yaml
schemaVersion: 1

providers:
  openai-main:
    type: openai
    apiKeyRef: OPENAI_API_KEY
  anthropic-main:
    type: anthropic
    apiKeyRef: ANTHROPIC_API_KEY

models:
  chat-default:
    providerInstance: openai-main
    modelId: gpt-...
    capabilities:
      streaming: true
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 2
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.7
          maxOutputTokens: 512
        allowOverrides:
          - temperature
          - maxOutputTokens
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 4096 }
```

Uwagi:

- `apiKeyRef` to **nazwa** zmiennej env, nie wartość.
- `policy.params` definiuje co klient może nadpisać.
- `capabilities.streaming` kontroluje endpoint `/chat/stream`.

## 3) Walidacja i fail-fast

Gateway powinien zakończyć start, jeśli:

- brakuje wymaganej zmiennej env wskazanej przez `apiKeyRef`,
- `modelAlias` w configu ma nieznany `providerInstance`,
- `bounds` są nielogiczne,
- aliasy się duplikują lub config nie zgadza się z `schemaVersion`.

## 4) Nadpisywanie parametrów per request

Klient może przesłać `params` w request, ale gateway:

- odrzuca pola spoza allowlisty,
- clampuje lub odrzuca wartości spoza zakresów (decyzja kontraktowa),
- mapuje parametry do SDK (OpenAI/Anthropic/Google).

Szczegóły request/response: `dokumentacja_api.md`.

## 5) Profile środowiskowe (opcjonalnie)

W praktyce wygodne są osobne pliki, np.:

- `gateway.config.dev.yaml`
- `gateway.config.prod.yaml`

albo łączenie plików (bazowy + override).

