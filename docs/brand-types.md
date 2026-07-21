# Brand types — developer guide

This document describes the **brand types** infrastructure in the project. The goal is stronger type safety: semantically different values based on the same primitive type (`string` / `number`) should not be accidentally interchangeable at compile time.

**Scope (2026-07):** Brand types in runtime (`src/`), unit tests, E2E, and integration tests (`test/`). The **CLI** layer (`src/cli/`) — **partial** brand adoption (`asGatewayKey`, `asModelAlias`, `asProviderInstanceId` in commands and the wizard); full CLI migration can continue with subsequent CLI changes.

---

## Files and imports

| File                                 | Role                                                                  |
| ------------------------------------ | --------------------------------------------------------------------- |
| `src/common/types/branded.types.ts`  | `Brand` type, `brand` / `unbrand` utilities, type aliases, `as*` helpers |
| `src/common/types/branded.guards.ts` | Runtime validation (`create*`), type guards (`is*`), regex patterns      |
| `src/common/types/branded.spec.ts`   | Unit tests (requirement: 100% coverage of utilities)                |
| `src/common/types/index.ts`          | Barrel export — types, `brand` / `unbrand`, guards, patterns             |

**Recommended import (barrel):**

```typescript
import {
  asRequestId,
  asModelAlias,
  createConversationId,
  isConversationId,
  type ConversationId,
  type RequestId,
  CONVERSATION_ID_PATTERN,
} from '../common/types';
```

Types not exported from the barrel (e.g. `WarningCode`, `ResponseId`, `ToolCallId`) — import from `branded.types.ts`:

```typescript
import { asWarningCode, type WarningCode } from '../common/types/branded.types';
```

---

## Generic infrastructure

### `Brand<K, T>`

A nominal “brand” on a primitive type:

```typescript
export type Brand<K, T> = K & { readonly __brand: T };
```

- `K` — base type (e.g. `string`)
- `T` — unique brand identifier (literal type, e.g. `'RequestId'`)

At runtime there is no extra structure — this is a TypeScript-only contract.

### `UnBrand<T>`

Extracts the base type from a branded type:

```typescript
export type UnBrand<T> = T extends Brand<infer K, any> ? K : T;
```

### `brand()` and `unbrand()`

Runtime **no-op** — used for compile-time casting:

```typescript
export const brand = <B>(value: UnBrand<B>): B => value as B;
export const unbrand = <B>(value: B): UnBrand<B> => value as UnBrand<B>;
```

**Note:** avoid explicit `brand<RequestId>(plainString)` — TypeScript often fails to resolve `UnBrand<RequestId>` as `string`. Prefer `as*` helpers or inference from the target type:

```typescript
const id: RequestId = brand(raw as RequestId);
```

---

## Type catalog

### Security-critical

| Type              | Helper           | Runtime usage                                                                 |
| ---------------- | ---------------- | -------------------------------------------------------------------------------- |
| `GatewayKey`     | `asGatewayKey`   | Client allowlist (`express.d.ts`, guards, rate limit)                          |
| `ProviderApiKey` | `asProviderApiKey` | Provider SDK keys (`ProviderFactoryParams`, factories in `src/providers/`)   |
| `EnvRef`         | `asEnvRef`       | Env variable names in YAML (`apiKeyRef`, `gatewayKeyRef`, `baseUrlRef`)          |

### Identifiers & tracking

| Type                  | Helper / guard                          | Runtime usage                                                          |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| `RequestId`        | `createRequestId`, `isRequestId`, `asRequestId` | `RequestIdMiddleware`, `ChatExecutionContext`, error envelopes, metrics |
| `ConversationId`   | `createConversationId`, `isConversationId`, `asConversationId` | `conversation-id.ts`, Sentry, chat responses                 |
| `ResponseId`       | `asResponseId`                          | Gateway response IDs (`gw_*`) in chat services and cache                  |
| `MessageId`        | `asMessageId`                           | Upstream message IDs (e.g. Anthropic stream mapper)                      |
| `ToolCallId`       | `asToolCallId`                          | `role: tool` messages, `toolCalls` in the internal contract             |
| `ClientId`         | `asClientId`                            | Client identifier from YAML                                              |
| `ProviderInstanceId` | `asProviderInstanceId`                | Key of an entry in `providers:` YAML, `ProviderRegistryService`                |
| `JsonSchemaName`   | `asJsonSchemaName`                      | Structured output in `ProviderCallOptions`                                 |
| `ModelAlias`       | `asModelAlias`                          | Model routing — alias from YAML (≠ vendor `modelId`)                          |
| `ModelId`          | `asModelId`                             | Vendor model identifier in SDK calls                            |

### Metrics & usage

| Type                         | Helper                        |
| --------------------------- | ----------------------------- |
| `InputTokens`               | `asInputTokens`               |
| `OutputTokens`              | `asOutputTokens`              |
| `ThinkingBudgetTokens`      | `asThinkingBudgetTokens`      |
| `CostUsd`                   | `asCostUsd`                   |
| `PromptCacheHitTokens`      | `asPromptCacheHitTokens`      |
| `PromptCacheCreationTokens` | `asPromptCacheCreationTokens` |

### Configuration & policy

| Type                    | Helper / guard (`is*`)     | Runtime validation                          |
| ---------------------- | -------------------------- | ------------------------------------------ |
| `TimeoutMs`            | `asTimeoutMs` / `isTimeoutMs` | min 1                                 |
| `RateLimitRps`         | `asRateLimitRps` / `isRateLimitRps` | min 1, floor on cast              |
| `RateLimitBurst`       | `asRateLimitBurst` / `isRateLimitBurst` | same as above                              |
| `MaxConcurrentStreams` | `asMaxConcurrentStreams` / `isMaxConcurrentStreams` | min 1                     |
| `MaxAttempts`          | `asMaxAttempts` / `isMaxAttempts` | 1–5                               |
| `AttemptNumber`        | `asAttemptNumber` / `isAttemptNumber` | min 1                             |
| `BaseUrl`              | `asBaseUrl` / `isBaseUrl`  | prefix `http://` or `https://`           |
| `CacheKey`             | `asCacheKey`               | —                                          |
| `CacheTtlSeconds`      | `asCacheTtlSeconds` / `isCacheTtlSeconds` | min 0                          |
| `Port`                 | `asPort` / `isPort`        | 1–65535                                    |
| `SchemaVersion`        | `asSchemaVersion` / `isSchemaVersion` | min 1                          |
| `SystemFingerprint`    | `asSystemFingerprint`      | pass-through from OpenAI Chat Completions     |

### Warning codes

| Type           | Helper          | Runtime usage                                      |
| ------------- | --------------- | ----------------------------------------------------- |
| `WarningCode` | `asWarningCode` | `generation-warnings.ts` → `ChatWarningDto.code` (internally); DTO/OpenAPI field remains `string` |

---

## Details: `RequestId` and `ConversationId`

### `RequestId`

Correlational request identifier. Related term: **Request ID** in `dictionary.md`; middleware: `src/common/middleware/request-id.middleware.ts`; type on `Express.Request`: `src/common/types/express.d.ts`.

| Helper                   | Validation                | When to use                                    |
| ------------------------ | ------------------------ | ----------------------------------------------- |
| `createRequestId(value)` | Yes — regex `req_<uuid>` | Generating a new ID in gateway format        |
| `isRequestId(value)`     | Yes (type guard)         | Conditions, filtering                            |
| `asRequestId(value)`     | **No**                  | Echoing `x-request-id` from the client, mocks in tests |

**Generated vs echo:** middleware generates `req_<uuid>` when the header is missing, but **echoes** any non-empty `x-request-id` from the client — then use `asRequestId`, not `createRequestId`.

Pattern (`REQUEST_ID_PATTERN`):

```text
^req_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

(`i` flag — UUID letter case is insignificant)

### `ConversationId`

Conversation session identifier (`conversationId` in the chat body). Product details: `conversation-tracking.md`; helpers: `src/chat/helpers/conversation-id.ts`.

| Helper                        | Validation                 | When to use                                             |
| ----------------------------- | ------------------------- | -------------------------------------------------------- |
| `createConversationId(value)` | Yes — regex `conv_<uuid>` | After DTO validation or when generating `conv_${uuidv4()}` |
| `isConversationId(value)`     | Yes (type guard)          | Conditions before Sentry / metrics                         |
| `asConversationId(value)`     | **No**                   | Only when the format is already guaranteed (e.g. tests)       |

Pattern (`CONVERSATION_ID_PATTERN`) — aligned with `@Matches` in `ChatRequestDto`:

```text
^conv_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

---

## When to use a brand type vs plain `string`

| Situation                                                                                    | Approach                                                            |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Two strings that **must not** be swapped (e.g. client key vs provider key) | Separate brand types                                                   |
| Field in an HTTP DTO (`class-validator`, OpenAPI)                                                | **`string`** in the DTO class; convert to brand in the mapper / service |
| Trusted value (internal helper, known format)                                           | `create*` (with validation) or `as*` (cast)                             |
| Client value with a required format                                                     | DTO validation **or** `create*` — not `as*` alone                      |
| JSON / SSE serialization                                                                     | `unbrand(id)` or implicit string — the brand exists only in TS        |

---

## How to add a new brand type

Pattern used in the project (order):

1. **Type definition** in `branded.types.ts`:

   ```typescript
   export type GatewayKey = Brand<string, 'GatewayKey'>;
   export const asGatewayKey = (value: string): GatewayKey =>
     value as GatewayKey;
   ```

2. **Optional validation** in `branded.guards.ts` (when format matters at runtime):

   ```typescript
   export function createGatewayKey(value: string): GatewayKey {
     if (!value.trim()) throw new Error('Invalid GatewayKey');
     return value as GatewayKey;
   }
   ```

3. **Export** from `index.ts`.

4. **Tests** in `branded.spec.ts` (or a dedicated `.spec.ts` for complex logic).

5. **Module refactor** + update the module’s `.spec.ts`.

For types **without** format validation, a pair is enough: `export type X = Brand<...>` + `asX`.

---

## Code coverage

| Area | Runtime status | Scope |
| ------ | -------------- | ------ |
| Infrastructure | ✅ | `Brand`, guards, tests, documentation |
| Security keys | ✅ | `GatewayKey`, `ProviderApiKey`, `EnvRef` — config, guards, rate limit |
| Identifiers | ✅ | Model routing, middleware, chat types |
| Metrics / usage | ✅ | Tokens, costs, usage in metrics and responses |
| Config / policy | ✅ | Policy, resilience, cache, port, `SystemFingerprint` |
| Providers / facades | ✅ | `WarningCode`, test and mock audit |
| CLI | partial | Full brand adoption in `src/cli/` — to finish with subsequent CLI changes |

**HTTP boundary (unchanged):** DTO classes (`class-validator`, OpenAPI) still declare `string` / `number`; conversion to brand type happens in services, mappers, and helpers after input validation.

**Workflow per module** (for subsequent types):

1. Change types in production code.
2. Update mocks in `.spec.ts` and helpers in `src/common/mocks/`, `test/e2e/helpers/`, `test/integration/helpers/` (`as*` instead of raw strings).
3. Run `npm test`, `npm run test:e2e` (+ `npm run test:integration` after a larger change).
4. Checkpoint: `npm run build` with no TS errors.

---

## Best practices

1. **`create*` vs `as*`** — `create*` throws on a bad format; `as*` is a deliberate cast at a trust boundary.
2. **HTTP boundary** — DTOs remain `string`; brand in the domain layer (`ChatService`, context objects).
3. **Tests** — mocks: `asRequestId('req_123e4567-e89b-12d3-a456-426614174000')` or shorter IDs via `as*` when the test does not verify format.
4. **Regex** — single source of truth: `CONVERSATION_ID_PATTERN` / `REQUEST_ID_PATTERN` in `branded.guards.ts`; DTOs and helpers import the same constants.
5. **Do not mix semantics** — e.g. `GatewayKey` ≠ `ProviderApiKey`, `ModelAlias` ≠ `ModelId`, `InputTokens` ≠ `OutputTokens`.
6. **Test mocks** — `src/common/mocks/createMockContext.ts`, `createTestGatewayConfig.ts`, constants in `test/e2e/helpers/e2e-constants.ts` and `test/integration/helpers/integration-constants.ts` use branded types where runtime requires the semantics (e.g. `RequestId`, `GatewayKey`, `ModelAlias`).

---

## Anti-patterns

| Anti-pattern                                                | Why                                                |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| `asConversationId(clientInput)` without prior validation | Bypasses the regex; a bad ID reaches runtime                 |
| `brand<RequestId>(anyString)` with an explicit generic           | Often a TS compile error (`UnBrand` does not strip the brand) |
| Brand type in `@ApiProperty` / OpenAPI as a “magic” type   | OpenAPI and JSON see `string`; document in the field description |
| Mass migration of the whole repo in one PR                     | Breaks the phased plan; harder review and rollback              |

---

## Tests

```bash
# Brand utilities only
npm test -- common/types/branded.spec.ts

# Coverage (target: 100% for branded*.ts)
npm run test:cov -- --collectCoverageFrom="common/types/branded*.ts" common/types/branded.spec.ts
```

---

## Related documents

- `dictionary.md` — Request ID, Conversation ID terms, Brand types section
- `conversation-tracking.md` — `conversationId` semantics in the API and Sentry
- `api-architecture.md` — `requestId` propagation, `x-request-id` header
