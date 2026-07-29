# Anthropic Messages API integration (Claude Code)

> **Important — facade ≠ Anthropic provider:**  
> This document describes the **official contract facade** — the HTTP layer in `src/integrations/anthropic/` that implements the **shape** of the Anthropic Messages API. It provides compatibility with Claude Code and other clients that expect this contract; the Anthropic Messages API is a de facto standard for that ecosystem.  
> **This is not** a guarantee that an enabled `type: anthropic` provider exists in the project, nor that the LLM call will hit the Anthropic API. Routing depends solely on **`model`** (= `modelAlias` in YAML) and `providerInstance` — an alias may point to e.g. Google Gemini.  
> **Auth:** `x-api-key` / Bearer is a **gateway client key** from the allowlist, not a key from the Anthropic console.  
> Counterpart for the OpenAI facade: [`openai-contract-integration.md`](openai-contract-integration.md), [`dictionary.md`](dictionary.md).

The **`/api/v1/anthropic`** facade lets you connect **Claude Code** and other clients that expect the Anthropic Messages API to the gateway with your own key allowlist.

> Module `src/integrations/anthropic/` — `GET /models`, `POST /messages` (JSON + stream SSE in Anthropic format). Shared architecture: [`integrations.md`](integrations.md).

## Configuration (Claude Code and other clients)

| Field | Value |
|------|---------|
| **Anthropic Base URL** (custom API URL) | `http://<host>:<port>/api/v1/anthropic` |
| **API Key** | Any value from the gateway client allowlist (e.g. `GATEWAY_KEY_IDE_PLUGIN` from `.env`) — sent as **`x-api-key`** or **Bearer** |

The client appends standard Anthropic paths to the Base URL:

- `GET /models` → `GET /api/v1/anthropic/models`
- `POST /messages` → `POST /api/v1/anthropic/messages`

## Endpoints

| Method | Full path | Description |
|--------|---------------|------|
| GET | `/api/v1/anthropic/models` | List of aliases from `gateway.config.yaml` (Anthropic format: `data[].id`, `display_name`, `created_at`, …) |
| GET | `/api/v1/anthropic/models/:model` | Single alias or 404 |
| POST | `/api/v1/anthropic/messages` | Messages; `stream: true` → Anthropic SSE events (`message_start`, `content_block_delta`, …) |

## Authorization

Header priority (`AnthropicApiKeyGuard`):

1. **`x-api-key: <GATEWAY_KEY_*>`**
2. **`Authorization: Bearer <GATEWAY_KEY_*>`** (fallback)

The gateway verifies the key against **`gatewayKey.allowList`** (the same list as `X-Gateway-Key` / OpenAI Bearer). The client key does **not** reach provider SDK calls — keys from `.env` are resolved per **`providerInstance`** (`apiKeyRef` in YAML).

Guard order on Anthropic routes: **`AnthropicApiKeyGuard`** (sets `req.gatewayKey`) → **`SmartRateLimitGuard`** (RPS and concurrent streams when `RATE_LIMIT_SMART_ENABLED=true`). **Cooldown** after a 429 from upstream — **`prepareRequestForExecution`** (`checkCooldown`) and **`ChatErrorHandlerService`** (`setCooldown` after a provider error); applies to both JSON and stream. The client key is read via **`readClientGatewayKey`**.

**Concurrent streams** (`stream: true`): limit and slot release in **`AnthropicMessagesController`** (`checkConcurrentStreams` / `releaseStream`), not in the guard — the path does not end with `/stream` as in the native API.

## System prompt (gateway policy)

> **Important for Claude Code integrators:**  
> Although the Anthropic Messages API supports a `system` field in the request body, the gateway **overwrites** it with its own prompts from `src/config/system-prompt/`.  
> The client cannot control the system prompt via the API. If you need your own prompt, edit the files in `src/config/system-prompt/` and restart the gateway.  
> See: [`configuration.md`](configuration.md), section “System prompt”.

## Model selection

In the request **`model`** field, provide the **`modelAlias`** from YAML (e.g. `chat-default`, `claude-sonnet`), not the vendor `modelId`.

List of available IDs: `GET /api/v1/anthropic/models`.

## Structured outputs (JSON mode)

The facade supports the **`output_config.format`** parameter in the official Anthropic Messages API shape — per https://platform.claude.com/docs/en/build-with-claude/structured-outputs.

### Request example

```bash
curl -s http://localhost:3000/api/v1/anthropic/messages \
  -H "x-api-key: $GATEWAY_KEY_IDE_PLUGIN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "chat-default",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Generate user profile JSON with name and age"
          }
        ]
      }
    ],
    "output_config": {
      "format": {
        "type": "json_schema",
        "schema": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "age": { "type": "number" }
          },
          "required": ["name"],
          "additionalProperties": false
        }
      }
    }
  }'
```

### Mapping to the gateway

- `output_config.format.type: 'json_schema'` → gateway `responseFormat: { type: 'json_object' }`
- `output_config.format.schema` → gateway `responseFormat.jsonSchema`

The gateway propagates this to the Anthropic provider, which uses the **native `output_config.format`** in the SDK call.

### Limitations

- The facade accepts the shape matching the **official Anthropic Messages API** (wire-compatible): `output_config.format.type: 'json_schema'` with a required `schema`.
- There is no support for simplified JSON mode without a schema — the official Anthropic API requires a schema with `json_schema`.
- The gateway internally uses the `responseFormat` abstraction, but the facade respects the official Anthropic shape.

## Message content mapping

Each message must contain at least one **`type: text`** block with a `text` field. The official API also allows a shorthand `content` as a string — in this MVP facade a **block array** is required.

**`type: image`** blocks → **400** (`VALIDATION_FAILED`).

Text content is mapped to gateway contract `messages[]` (`role` + `content` as a string).

## Request parameters (MVP)

| Field | Description |
|------|------|
| `messages` | Required; `content` = array of blocks with at least one `type: text` |
| `stream` | `true` — Anthropic SSE; `false` or omitted — JSON `Message` |
| `temperature` | Optional (0–2 in the gateway), mapped to `params.temperature`; the Anthropic adapter may reject values outside the vendor range |
| `max_tokens` | Optional; mapped to `params.maxOutputTokens`; without a value — defaults from YAML |
| `top_p` | Optional (0–1), mapped to `params.topP`. The Anthropic adapter sends **one** randomness parameter — priority: **`topK` > `topP` > `temperature`**. With default `temperature` in YAML, a `top_p` override in the body **will overwrite** `temperature` in the SDK. See `configuration.md`, `dictionary.md`. |
| `stop_sequences` | Optional (array of strings), mapped to `params.stop` |
| `output_config` | Optional — structured outputs (JSON mode). Format: `{ format: { type: 'json_schema', schema: {...} } }`. Mapped to `params.responseFormat`. Requires a JSON schema. See section “Structured outputs (JSON mode)”. |
| `tools`, `tool_choice` | Optional — mapped to gateway `tooling`; requires `capabilities.tools: true` on the alias |
| `thinking` | Optional — extended thinking (Anthropic API shape). Mapped to `params.thinkingEnabled` / `params.thinkingBudget`; requires `capabilities.thinking: true` on the alias. In JSON response: `content[].type: thinking` block; in stream: `content_block_*` blocks with `thinking_delta` in the `done` phase (see stream section). |
| `system` | **Ignored** — system instruction from `src/config/system-prompt/` |

**`messages`** limit: 1–15 000 (facade DTO; native chat: 1–150).

## Example (non-stream)

```bash
curl -s http://localhost:3000/api/v1/anthropic/messages \
  -H "x-api-key: $GATEWAY_KEY_IDE_PLUGIN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "chat-default",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": [{"type": "text", "text": "Hello"}]}
    ]
  }'
```

Response (simplified `Message` shape): `type: message`, `role: assistant`, `content[]` with a text block (optionally a `thinking` block before text), `model` = alias from the request, `stop_reason`, `usage` (`input_tokens`, `output_tokens`, optionally `cache_creation_input_tokens` / `cache_read_input_tokens` from gateway `usageDetails`).

## Example (stream)

```bash
curl -N -X POST http://localhost:3000/api/v1/anthropic/messages \
  -H "x-api-key: $GATEWAY_KEY_IDE_PLUGIN" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "chat-default",
    "max_tokens": 1024,
    "stream": true,
    "messages": [
      {"role": "user", "content": [{"type": "text", "text": "Count to 3"}]}
    ]
  }'
```

Response: SSE stream (`Content-Type: text/event-stream; charset=utf-8`, header `anthropic-version: 2023-06-01`) — events `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`. Internally: `ChatService.executeStream` → `anthropic-stream.mapper.ts` (mapping of gateway events `meta` / `delta` / `done`).

**Stream → Anthropic SSE mapping:**

| Gateway phase | Anthropic events |
|--------------|---------------------|
| `meta` | `message_start` (id, model; zero usage) |
| `delta` | `content_block_start` (text) + `content_block_delta` (`text_delta`) |
| `done` | `content_block_stop` (text), optionally `thinking` blocks (`thinking_delta`), optionally `tool_use` (`input_json_delta`), `message_delta` (stop_reason + full usage), `message_stop` |

**Usage in the stream:** final `message_delta.usage` contains `input_tokens`, `output_tokens`, and cache fields (`cache_creation_input_tokens`, `cache_read_input_tokens`) — the same logic as in JSON (`anthropic-usage.mapper.ts`).

**Extended thinking in the stream:** when the gateway returns `thinkingContent` in the `done` event, the facade emits a `content_block` with `type: thinking` and `thinking_delta`. Content is **not** streamed in real time (gateway SSE limitation); in JSON the `thinking` block is **before** text, in the stream — **after** text deltas (before `tool_use`, if present).

## Manual test without Claude Code

curl, Postman, or Swagger UI (`/api/v1/api-docs`, tag **Anthropic API** — routes in `openapi.json` with security `ApiKeyAuth`) is enough.

## Native API (unchanged)

If you build your own application against the gateway contract:

- `POST /api/v1/chat` — **`X-Gateway-Key`** header
- `POST /api/v1/chat/stream` — native SSE (`meta` / `delta` / `done`)

## Differences from the full Anthropic API contract

The MVP facade targets simple text chat and IDE clients — it is **not** a drop-in replacement for `api.anthropic.com` without adaptation:

| Topic | Officially | Gateway (MVP) |
|-------|------------|---------------|
| `model` in response | Anthropic model ID | **Echo of the alias** from the request (`chat-default`, …) |
| `usage` | including cache, `service_tier` | **`input_tokens`**, **`output_tokens`**, optionally **`cache_creation_input_tokens`** / **`cache_read_input_tokens`** — in JSON and in the final stream `message_delta` (shared mapper `anthropic-usage.mapper.ts`). No `service_tier`. |
| Extended thinking | Streamed `thinking` blocks before text | JSON: `thinking` block before text. Facade stream: `thinking` block in the `done` phase (after text deltas); not in real time. |
| `stop_reason` | including `tool_use`, `max_tokens`, `refusal` | Mapped from `GatewayFinishReason` via `anthropic-stop-reason.mapper.ts` (`tool_calls` → `tool_use`, `length` → `max_tokens`, `content_filter` → `refusal`, `stop` → `end_turn`) |
| `system`, images | Supported officially | `system` ignored; `image` → 400 |
| `tools` | Supported officially | Mapped by the facade when the alias has `capabilities.tools` |
| `messages[].content` | string or array | Block array of `text` only |
| `output_config.format` | Supported officially | Mapped to `params.responseFormat`; requires a JSON schema |
| `frequency_penalty`, `presence_penalty`, `seed` | OpenAI-compat in other clients | **N/A** — not in Messages API; gateway native `/chat` may accept them, Anthropic adapter ignores |
| `temperature` + `top_p` | Mutually exclusive in one request | Gateway passes both if both are in effective options after YAML ← body merge; configure policy so both are not sent (default: only `temperature` in defaults) |
| `top_p`, `stop_sequences` | Supported officially | Mapped to `params.topP` / `params.stop` |

Full contract alignment — later iterations (beyond STAGE 2.5).

## Limitations

- **`temperature` and `top_p`:** do not send both in one Anthropic call. Also applies to aliases with default `temperature` in YAML — a client `params.topP` override may still send both parameters to the API. Parameter matrix: `dictionary.md`, YAML configuration: `configuration.md`.
- The **`system`** field in the client request — ignored (prompt from `src/config/system-prompt/`).
- No images in content blocks (`type: image` → 400).
- Function calling requires `capabilities.tools: true` on the alias in YAML.
- Responses do **not** include gateway fields (`provider`, `cached`, `conversationId`).

## Errors

JSON format like the Anthropic API:

```json
{
  "type": "error",
  "error": { "type": "invalid_request_error", "message": "..." }
}
```

**`AnthropicExceptionFilter`** on controllers (`@AnthropicAuth()`). Correlation: **`x-request-id`** header.

## Swagger / OpenAPI

Anthropic routes are in **`openapi.json`** (tag **Anthropic API**, security `ApiKeyAuth`) and in Swagger UI (`/api/v1/api-docs`) when `SWAGGER_ENABLED=true`. Request/response and error schemas (`AnthropicErrorResponseDto`) come from `@Api*` decorators; export: `npm run openapi:export`.

## Related

- [`integrations.md`](integrations.md) — facade architecture, rate limit
- [`openai-contract-integration.md`](openai-contract-integration.md) — OpenAI official contract facade
- [`configuration.md`](configuration.md) — `gateway.config.yaml`, env keys
- [`endpoints.md`](endpoints.md)
