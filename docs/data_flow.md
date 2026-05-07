# Przepływ danych (data flow) — AI Provider Gateway

Dokument uzupełnia `dokumentacja_api.md` i `architektura.md`: pokazuje kierunek danych między klientem, warstwą HTTP (NestJS), logiką aplikacyjną oraz adapterami providerów.

**Konfiguracja:** przy starcie ładowany jest `gateway.config.yaml` (`src/config/configuration.ts`). Env: w **production** wymagany jest co najmniej jeden niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`).

## Legenda uczestników

| Skrót | Znaczenie |
|-------|-----------|
| **Klient** | Dowolny klient HTTP (aplikacja, serwis, BFF). |
| **HTTP** | Kontroler + walidacja DTO + odpowiedź. |
| **ChatService** | Resolve aliasu, normalizacja wiadomości, wywołanie adaptera. |
| **Registry** | `ProviderRegistryService` — mapowanie aliasu z YAML na adapter + `modelId`. |
| **Provider** | Adapter Anthropic / Google. |
| **LLM API** | Zewnętrzny serwis providera. |

---

## 0. Wspólny szkielet: walidacja, wybór modelu

```mermaid
sequenceDiagram
  autonumber
  participant K as Klient
  participant H as HTTP (ChatController)
  participant S as ChatService

  K->>+H: POST /api/v1/chat (JSON)
  H->>H: ValidationPipe (DTO)
  Note over H: x-request-id / gateway key — docelowo (Faza 5)
  H->>+S: executeChat(request)
  S-->>-H: wynik lub wyjątek HTTP
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
  participant R as ProviderRegistry
  participant P as Provider Adapter
  participant A as LLM API

  K->>+H: POST /api/v1/chat (modelAlias, messages)
  H->>H: walidacja DTO
  H->>+S: executeChat
  S->>S: normalizeMessagesForProvider
  S->>+R: resolve(modelAlias)
  R-->>-S: adapter + providerName + modelId
  S->>+P: complete(input, modelId)
  P->>+A: request do providera
  A-->>-P: response
  P-->>-S: ProviderChatResponse
  S-->>-H: ChatResponse (id, usage, requestId, …)
  H-->>-K: 200 JSON
```

**Uwaga:** opcjonalne `params` z kontraktu OpenAPI nie są jeszcze w DTO — nie występują w tym przepływie.

---

## 2. Standard `POST /api/v1/chat` — błąd (plan kontraktu)

Docelowo (Faza 5 + mapowanie w adapterach): 429 / timeout / 5xx mają być mapowane na envelope z polami `code` i `requestId` (`openapi.json`, `dictionary.md`).  
**Dziś:** zachowanie zależy od wyjątków Nest/SDK — konsument powinien traktować to jako przejściowe do czasu ujednolicenia.

```mermaid
sequenceDiagram
  participant H as HTTP
  participant S as ChatService
  participant P as Provider
  participant A as LLM API

  H->>S: executeChat
  S->>P: complete
  P->>A: request
  alt błąd HTTP / timeout (aktualne SDK)
    A-->>P: błąd
    P-->>S: wyjątek
    S-->>H: propagacja / mapowanie (do ujednolicenia)
  end
```

---

## 3. Streaming `POST /api/v1/chat/stream` — sukces (SSE) *(plan)*

Kontrakt i diagram docelowy są zgodne z `openapi.json` i **Fazą 4** (`PLAN_IMPLEMENTACJI.md`). Implementacja **nie jest jeszcze podłączona** pod ścieżkę z OpenAPI.

```mermaid
sequenceDiagram
  autonumber
  participant K as Klient
  participant H as HTTP (stream)
  participant S as ChatService
  participant R as ProviderRegistry
  participant P as Provider Adapter
  participant A as LLM API

  K->>+H: POST /api/v1/chat/stream
  H->>H: walidacja DTO
  H-->>K: SSE: event meta
  H->>+S: executeStream *(plan)*
  S->>+R: resolve
  R-->>-S: adapter + modelId
  S->>+P: stream *(plan)*
  P->>+A: streaming request
  loop fragmenty
    A-->>P: chunk
    P-->>S: delta
    S-->>H: delta
    H-->>K: SSE: event delta
  end
  H-->>-K: SSE: event done
```

---

Powiązane: `openapi.json`, `dokumentacja_api.md`, `architektura.md`, `PLAN_IMPLEMENTACJI.md`.
