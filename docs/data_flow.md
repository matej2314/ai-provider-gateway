# Przepływ danych (data flow) — AI Provider Gateway

Dokument uzupełnia `dokumentacja_api.md` i `architektura.md`: pokazuje kierunek danych między klientem, warstwą HTTP (NestJS), logiką aplikacyjną oraz adapterami providerów.

## Legenda uczestników

| Skrót | Znaczenie |
|-------|-----------|
| **Klient** | Dowolny klient HTTP (aplikacja, serwis, BFF). |
| **HTTP** | Kontroler + walidacja DTO + response mapping. |
| **ChatService** | Przypadek użycia: resolve aliasu, polityki, wywołanie providera. |
| **Registry** | Rejestr adapterów providerów (DI). |
| **Provider** | Adapter: OpenAI / Anthropic / Google. |
| **LLM API** | Zewnętrzny serwis providera. |

---

## 0. Wspólny szkielet: requestId, walidacja, wybór modelu

```mermaid
sequenceDiagram
  autonumber
  participant K as Klient
  participant H as HTTP (ChatController)
  participant S as ChatService

  K->>+H: POST /chat (JSON)
  H->>H: ValidationPipe (DTO)
  H->>H: requestId (propaguj lub wygeneruj)
  H->>+S: execute(modelAlias, messages, params)
  S-->>-H: wynik lub błąd domenowy
  H-->>-K: 200 JSON lub error envelope
```

---

## 1. Standard `POST /chat` — sukces (200)

```mermaid
sequenceDiagram
  autonumber
  participant K as Klient
  participant H as HTTP
  participant S as ChatService
  participant R as ProviderRegistry
  participant P as Provider Adapter
  participant A as LLM API

  K->>+H: POST /chat (modelAlias, messages, params)
  H->>H: walidacja DTO + requestId
  H->>+S: execute
  S->>S: resolve modelAlias -> provider + modelId + policy
  S->>+R: getProvider(provider)
  R-->>-S: adapter
  S->>+P: complete(modelId, messages, params, policy)
  P->>+A: request do providera
  A-->>-P: response
  P-->>-S: znormalizowana odpowiedź
  S-->>-H: ChatResponse
  H-->>-K: 200 JSON (gateway contract)
```

---

## 2. Standard `POST /chat` — błąd (np. 429 / timeout)

```mermaid
sequenceDiagram
  participant H as HTTP
  participant S as ChatService
  participant P as Provider
  participant A as LLM API

  H->>S: execute
  S->>P: complete
  P->>A: request
  alt 429 / throttling
    A-->>P: 429
    P-->>S: ProviderRateLimited
    S-->>H: map -> 429 + code PROVIDER_RATE_LIMITED
  else timeout
    A--xP: timeout
    P-->>S: ProviderTimeout
    S-->>H: map -> 504 + code PROVIDER_TIMEOUT
  end
```

---

## 3. Streaming `POST /chat/stream` — sukces (SSE)

```mermaid
sequenceDiagram
  autonumber
  participant K as Klient
  participant H as HTTP (stream)
  participant S as ChatService
  participant R as ProviderRegistry
  participant P as Provider Adapter
  participant A as LLM API

  K->>+H: POST /chat/stream
  H->>H: walidacja DTO + requestId
  H-->>K: SSE: event meta
  H->>+S: executeStream
  S->>S: resolve modelAlias -> provider + modelId + policy
  S->>+R: getProvider
  R-->>-S: adapter
  S->>+P: stream(modelId,...)
  P->>+A: request stream
  loop fragmenty
    A-->>P: delta chunk
    P-->>S: delta
    S-->>H: delta
    H-->>K: SSE: event delta
  end
  A-->>P: done/usage
  P-->>S: done
  S-->>H: done
  H-->>-K: SSE: event done (i zamknięcie)
```

---

Powiązane: `dokumentacja_api.md`, `architektura.md`, `anty-patterny.md`.

