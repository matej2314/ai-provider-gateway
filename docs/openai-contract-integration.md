# OpenAI contract facade (official OpenAI API contract)

> **Important — facade ≠ OpenAI provider:**  
> This document describes the **official contract facade** — the HTTP layer in `src/integrations/openai/` that implements the **shape** of the OpenAI Chat Completions API. It provides compatibility with Cursor and other clients that expect this contract; the OpenAI API has become one of the industry standards for IDEs and other apps.  
> **This is not** a guarantee that the LLM backend is api.openai.com — routing depends solely on **`model`** (= `modelAlias` in YAML) and the `models[]` → `providerInstance` entry (may be Anthropic, Google, OpenAI, or compatible).  
> **Auth:** `Authorization: Bearer` is a **gateway client key** from the allowlist, not an OpenAI.com key.  
> The OpenAI runtime adapter (`create-openai-provider.ts`, `create-openai-compatible-provider-instance.ts` in `src/providers/`) — a separate layer — [`provider-openai-runtime.md`](provider-openai-runtime.md).  
> The same principle for the Anthropic facade: [`anthropic-messages-integration.md`](anthropic-messages-integration.md), [`dictionary.md`](dictionary.md).

The **`/api/v1/openai`** facade lets you connect **Cursor** and other clients that require the OpenAI API contract to the gateway, using your own key allowlist instead of an OpenAI.com key.

> Module `src/integrations/openai/` — `GET /models`, `POST /chat/completions` (JSON + stream SSE in OpenAI format). Shared architecture: [`integrations.md`](integrations.md).

## Configuration in Cursor

| Field | Value |
|------|---------|
| **Override OpenAI Base URL** | `http://<host>:<port>/api/v1/openai` |
| **API Key** | Any value from the gateway client allowlist (e.g. `GATEWAY_KEY_WEBAPP` from `.env`) — sent as **Bearer** |

Cursor appends standard OpenAI paths to the Base URL:

- `GET /models` → `GET /api/v1/openai/models`
- `POST /chat/completions` → `POST /api/v1/openai/chat/completions`

## Endpoints

| Method | Full path | Description |
|--------|---------------|------|
| GET | `/api/v1/openai/models` | List of aliases from `gateway.config.yaml` (OpenAI format: `object: list`, `data[].id` = alias) |
| GET | `/api/v1/openai/models/:model` | Single alias or 404 |
| POST | `/api/v1/openai/chat/completions` | Chat; `stream: true` → SSE in OpenAI format (`data: {...}`, ends with `data: [DONE]`) |

## Authorization

```
Authorization: Bearer <GATEWAY_KEY_*>
```

The gateway verifies the token against **`gatewayKey.allowList`** (the same list as `X-Gateway-Key` in the native API). The token is **not** passed to Anthropic or Google — SDK calls use keys from `.env` referenced by **`apiKeyRef`** in YAML (per `providerInstance`).

Guard order on OpenAI routes: **`OpenAiBearerAuthGuard`** (sets `req.gatewayKey`) → **`SmartRateLimitGuard`** (RPS and concurrent streams when `RATE_LIMIT_SMART_ENABLED=true`). **Cooldown** after a 429 from upstream — **`prepareRequestForExecution`** (`checkCooldown`) and **`ChatErrorHandlerService`** (`setCooldown`); applies to JSON and stream. The client key is read via **`readClientGatewayKey`** (`req.gatewayKey` or `X-Gateway-Key`).

**Concurrent streams** (`stream: true`): limit and slot release in **`OpenAiChatCompletionsController`** (`checkConcurrentStreams` / `releaseStream`), not in the guard — the path does not end with `/stream` as in the native API.

## System prompt (gateway policy)

> **Important for Cursor integrators:**  
> The gateway **ignores** the `system` role in the `messages[]` array. The system prompt is **managed on the server side** (files in `src/config/system-prompt/`).  
> The IDE cannot override or modify the system prompt. If your application requires its own system prompt, you must change the gateway configuration and restart the server.  
> See: [`configuration.md`](configuration.md), section “System prompt”.

## Model selection

In the OpenAI request **`model`** field, provide the **`modelAlias`** from YAML (e.g. `chat-default`, `claude-sonnet`), not the vendor `modelId`.

List of available IDs: `GET /api/v1/openai/models`.

## Request parameters

| Field | Description |
|------|------|
| `messages` | Required; `content` string; roles `user`, `assistant`, `tool` (`tool_call_id` required); `assistant` may have `tool_calls` |
| `tools`, `tool_choice` | Optional — mapped to gateway `tooling`; requires `capabilities.tools: true` on the alias |
| `stream` | `true` — OpenAI SSE; `false` or omitted — JSON `chat.completion` |
| `temperature` | Optional (0–2), mapped to `params.temperature` |
| `max_tokens` | Optional, mapped to `params.maxOutputTokens` |
| `top_p` | Optional (0–1), mapped to `params.topP` |
| `stop` | Optional (string \| string[]), mapped to `params.stop` |
| `frequency_penalty` | Optional (-2–2), mapped to `params.frequencyPenalty` (`anthropic`/`google` adapters ignore) |
| `presence_penalty` | Optional (-2–2), mapped to `params.presencePenalty` (`anthropic`/`google` adapters ignore) |
| `seed` | Optional (integer), mapped to `params.seed` (Anthropic ignores) |
| `response_format` | Optional (`{ type: "text" \| "json_object" }`), mapped to `params.responseFormat.type` (no `jsonSchema` from the OpenAI body — `type` only) |
| `reasoning_effort` | Optional (`none` \| `minimal` \| `low` \| `medium` \| `high` \| `xhigh`), mapped to `params.thinkingEnabled` / `params.thinkingBudget` (`openai-request.mapper.ts`); requires `capabilities.thinking: true` on the alias; takes effect when the alias points to `type: openai` (Responses API) |

## Response (`chat.completion`)

| OpenAI field | When present |
|-------------|-----------------|
| `system_fingerprint` | Only when the upstream adapter returns `systemFingerprint` — in practice **OpenAI Chat Completions**. For an alias pointing to **Anthropic** or **Google** the field is **absent** (vendors have no equivalent). The facade maps pass-through from `ChatService`; it does not generate a fingerprint itself. |

Details: [`dictionary.md`](dictionary.md) (section “`systemFingerprint` — semantics and providers”).

**Target provider:** the facade maps OpenAI fields to shared `params.*`, but the **LLM call** goes to the adapter indicated by **`model`** (= `modelAlias` in YAML). For an Anthropic alias, the `temperature` + `top_p` mutual exclusion applies (see `anthropic-messages-integration.md`). When the alias points to **`type: openai`** or **`openai-compatible`**, the OpenAI runtime adapter (`create-openai-provider.ts`) handles penalties, seed, and `system_fingerprint` among other things — details: [`provider-openai-runtime.md`](provider-openai-runtime.md). Parameter matrix: `dictionary.md`, `configuration.md`.

**`messages`** limit: 1–15 000 (facade DTO; native chat: 1–150).

**`system`** roles in `messages` are **skipped** — system instruction from files in `src/config/system-prompt/`.

## Example (non-stream)

```bash
curl -s http://localhost:3000/api/v1/openai/chat/completions \
  -H "Authorization: Bearer $GATEWAY_KEY_WEBAPP" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chat-default",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Example (stream)

```bash
curl -N -X POST http://localhost:3000/api/v1/openai/chat/completions \
  -H "Authorization: Bearer $GATEWAY_KEY_WEBAPP" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "chat-default",
    "messages": [{"role": "user", "content": "Count to 3"}],
    "stream": true
  }'
```

Response: SSE stream (`Content-Type: text/event-stream`) — lines `data: {"object":"chat.completion.chunk",...}`, ending with **`data: [DONE]`**. Internally: `ChatService.executeStream` + mapping of gateway events (`meta` / `delta` / `done`) in `openai-stream.mapper.ts`.

## Native API (unchanged)

If you build your own application against the gateway contract:

- `POST /api/v1/chat` — **`X-Gateway-Key`** header
- `POST /api/v1/chat/stream` — native SSE (`meta` / `delta` / `done`)

## Limitations

- **LLM routing is configuration-driven** — the OpenAI facade does **not** force an OpenAI.com backend; a YAML alias may point to Anthropic, Google, OpenAI, or OpenAI-compatible (`providerInstance` + `modelId`). OpenAI runtime adapter — see [`provider-openai-runtime.md`](provider-openai-runtime.md).
- Client **`role: system`** messages are **skipped** — the system instruction comes from files in `src/config/system-prompt/`.
- **`messages[].content`** must be a string (no multimodal array).
- Function calling requires `capabilities.tools: true` on the alias in YAML.
- Facade responses do **not** include gateway fields (`provider`, `cached`, `conversationId`).

## Errors

JSON format like the OpenAI API (`error.message`, `error.type`, `error.code`) — **`OpenAiExceptionFilter`**. Internal gateway codes (`RATE_LIMITED`, `MODEL_ALIAS_NOT_FOUND`, …) are mapped to OpenAI types (e.g. `rate_limit_error`, `invalid_request_error`). Correlation: **`x-request-id`** header.

## Swagger / OpenAPI

OpenAI routes are in **`openapi.json`** (tag **OpenAI API**, security `BearerAuth`) and in Swagger UI (`/api/v1/api-docs`) when `SWAGGER_ENABLED=true`. Request/response and error schemas (`OpenAiErrorResponseDto`) come from `@Api*` decorators on controllers; static export: `npm run openapi:export`.

## Related

- [`integrations.md`](integrations.md) — facade architecture, rate limit
- [`anthropic-messages-integration.md`](anthropic-messages-integration.md) — Anthropic official contract facade
- [`configuration.md`](configuration.md) — `gateway.config.yaml`, env keys
- [`endpoints.md`](endpoints.md)
