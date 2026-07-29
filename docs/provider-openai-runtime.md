# OpenAI adapter (provider runtime)

> **Facade ≠ adapter:** this document covers **only** the `src/providers/` layer (`type: openai` and `type: openai-compatible` in YAML).  
> The official OpenAI HTTP contract (Cursor and other clients) (`/api/v1/openai/*`, `src/integrations/openai/`) is described in [`openai-contract-integration.md`](openai-contract-integration.md).  
> Term definitions: [`dictionary.md`](dictionary.md) (section “Facade vs provider runtime”).

## Adapter role

| | **OpenAI facade** | **OpenAI adapter (this document)** |
|---|---|---|
| **Directory** | `src/integrations/openai/` | `src/providers/factories/create-openai-provider.ts`, `create-openai-compatible-provider-instance.ts` |
| **Input** | HTTP from the client (Cursor) | `ChatProviderCallService` via `ProviderRegistryService` |
| **Output** | JSON/SSE in OpenAI API shape | Call to an OpenAI endpoint (official or compatible) via SDK |
| **Client auth** | Bearer = gateway key | — |
| **Vendor auth** | — | `apiKeyRef` + `baseUrlRef` in YAML |
| **Requires the other layer?** | No | No |

The adapter implements the **`AIProvider`** port — the same contract as `create-anthropic-provider.ts` and `create-google-provider.ts`. It does not register HTTP routes and does not handle facade client authorization.

Routing between Chat Completions and Responses API happens in `create-openai-provider.core.ts` according to the YAML entry **`type`** (not in the HTTP facade): `openai` → Responses API, `openai-compatible` → Chat Completions.

## When the adapter is used

1. In `gateway.config.yaml`, a `providers:` entry has `type: openai` or `type: openai-compatible` and a unique `providerInstance`.
2. An alias in `models[]` points to that `providerInstance` and a vendor `modelId` (e.g. `gpt-4o`).
3. `ChatService` / `ChatProviderCallService` calls `AIProvider.complete` / `stream` — **regardless** of whether the client used native `/chat`, the `/openai` facade, or `/anthropic`.

## Adapter components

| Element | Role |
|---------|------|
| `PROVIDER_TYPES`: `openai`, `openai-compatible` | Types in the YAML schema |
| `create-openai-provider.ts` | Factory for `type: openai` |
| `create-openai-compatible-provider-instance.ts` | Factory for `type: openai-compatible` |
| `create-openai-provider.core.ts` | Responses vs Chat Completions routing |
| Mappers `*-provider.mapper.ts` | Mapping gateway options → SDK |
| `chat-completions` / `responses` adapters | SDK calls |
| Unit tests for factories and mappers | `src/providers/**/*.spec.ts` |
| `/api/v1/openai` facade mapping `params.*` | Separate HTTP layer — [`openai-contract-integration.md`](openai-contract-integration.md) |
| `provider:test` for the OpenAI type (CLI) | SDK test from CLI |

Details of the add-type process: [`pl/spec/SPEC-PROVIDERS.md`](pl/spec/SPEC-PROVIDERS.md) (scenario A).

## SDK mapping

### Chat Completions

| Gateway parameter | SDK field |
|------------------|----------|
| `temperature` | `temperature` |
| `topP` | `top_p` |
| `maxOutputTokens` | `max_tokens` |
| `stop` | `stop` |
| `frequencyPenalty` | `frequency_penalty` |
| `presencePenalty` | `presence_penalty` |
| `seed` | `seed` |
| `responseFormat` | `response_format` |
| `systemFingerprint` (response) | `system_fingerprint` → `systemFingerprint` in gateway |

### Responses API

Used **always** for `type: openai` instances (`create-openai-provider.core.ts` → `createResponsesAdapter`). Thinking parameters (`thinkingEnabled`, string `thinkingBudget`) map to `reasoning.effort` + `reasoning.summary: auto`.

| Gateway parameter | SDK field |
|------------------|----------|
| `temperature` | `temperature` |
| `maxOutputTokens` | `max_output_tokens` |
| `topP` | `top_p` |
| `thinkingEnabled` + effort | `reasoning.effort` + `reasoning.summary: auto` |
| `responseFormat: json_object` | `text.format.type: json_object` |
| `thinkingContent` (response) | reasoning summary from output / stream |

Support matrix vs other adapters: [`dictionary.md`](dictionary.md) (generation parameters table).

## Configuration

```yaml
providers:
  openai:
    type: openai
    enabled: true
    apiKeyRef: OPENAI_API_KEY
    baseUrlRef: OPENAI_BASE_URL
    # type: openai always uses Responses API — the apiSurface field is forbidden (Zod validation)

  ollama-local:
    type: openai-compatible
    enabled: true
    apiKeyRef: OLLAMA_API_KEY
    baseUrlRef: OLLAMA_BASE_URL
    # apiSurface: chat-completions  # optional; only allowed value

models:
  gpt-cheap:
    providerInstance: openai
    modelId: gpt-5.4-nano
    capabilities:
      streaming: true
      tools: true
      thinking: false  # Responses API supports thinking, but requires capabilities.thinking: true
  ollama-local-chat:
    providerInstance: ollama-local
    modelId: llama3.1:8b
    capabilities:
      streaming: true
      tools: false
      thinking: false
```

In `.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OLLAMA_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

The `baseUrl` field does **not** appear in YAML — only `baseUrlRef` pointing to an environment variable.

## Related documents

- [`openai-contract-integration.md`](openai-contract-integration.md) — HTTP facade (Cursor)
- [`integrations.md`](integrations.md) — official contract facade architecture
- [`dictionary.md`](dictionary.md) — glossary, parameter matrix
- [`configuration.md`](configuration.md) — YAML, env, `policy.params` rules
- [`pl/spec/SPEC-PROVIDERS.md`](pl/spec/SPEC-PROVIDERS.md) — adapter acceptance criteria
- [`testing.md`](testing.md) — `*-facade*.e2e-spec.ts` tests the HTTP facade, not the SDK adapter
