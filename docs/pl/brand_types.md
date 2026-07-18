# Brand types — przewodnik dla developerów

Ten dokument opisuje infrastrukturę **brand types** w projekcie. Celem jest zwiększenie type safety: semantycznie różne wartości oparte na tym samym typie prymitywnym (`string` / `number`) nie powinny dać się przypadkowo zamienić w compile time.

**Zakres (2026-07):** Brand types w runtime (`src/`), testach jednostkowych, E2E i integracyjnych (`test/`). Warstwa **CLI** (`src/cli/`) — **częściowa** adopcja brandów (`asGatewayKey`, `asModelAlias`, `asProviderInstanceId` w komendach i wizardzie); pełna migracja CLI może być kontynuowana przy kolejnych zmianach w CLI.

---

## Pliki i importy

| Plik                                 | Rola                                                                  |
| ------------------------------------ | --------------------------------------------------------------------- |
| `src/common/types/branded.types.ts`  | Typ `Brand`, utility `brand` / `unbrand`, aliasy typów, helpery `as*` |
| `src/common/types/branded.guards.ts` | Walidacja runtime (`create*`), type guardy (`is*`), wzorce regex      |
| `src/common/types/branded.spec.ts`   | Testy jednostkowe (wymaganie: 100% coverage utilities)                |
| `src/common/types/index.ts`          | Barrel export — typy, `brand` / `unbrand`, guardy, wzorce             |

**Import zalecany (barrel):**

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

Typy bez eksportu w barrel (np. `WarningCode`, `ResponseId`, `ToolCallId`) — import z `branded.types.ts`:

```typescript
import { asWarningCode, type WarningCode } from '../common/types/branded.types';
```

---

## Infrastruktura generyczna

### `Brand<K, T>`

Nominalny „brand” na typie prymitywnym:

```typescript
export type Brand<K, T> = K & { readonly __brand: T };
```

- `K` — typ bazowy (np. `string`)
- `T` — unikalny identyfikator brandu (literal type, np. `'RequestId'`)

W runtime nie ma dodatkowej struktury — to wyłącznie kontrakt TypeScript.

### `UnBrand<T>`

Wyciąga typ bazowy z branded type:

```typescript
export type UnBrand<T> = T extends Brand<infer K, any> ? K : T;
```

### `brand()` i `unbrand()`

Runtime **no-op** — służą do rzutowania w compile time:

```typescript
export const brand = <B>(value: UnBrand<B>): B => value as B;
export const unbrand = <B>(value: B): UnBrand<B> => value as UnBrand<B>;
```

**Uwaga:** unikaj jawnego `brand<RequestId>(plainString)` — TypeScript często nie rozwiązuje `UnBrand<RequestId>` jako `string`. Preferuj helpery `as*` albo inferencję z typu docelowego:

```typescript
const id: RequestId = brand(raw as RequestId);
```

---

## Katalog typów

### Security-critical

| Typ              | Helper           | Użycie w runtime                                                                 |
| ---------------- | ---------------- | -------------------------------------------------------------------------------- |
| `GatewayKey`     | `asGatewayKey`   | Allowlista klienta (`express.d.ts`, guardy, rate limit)                          |
| `ProviderApiKey` | `asProviderApiKey` | Klucze SDK providerów (`ProviderFactoryParams`, fabryki w `src/providers/`)   |
| `EnvRef`         | `asEnvRef`       | Nazwy zmiennych env w YAML (`apiKeyRef`, `gatewayKeyRef`, `baseUrlRef`)          |

### Identifiers & tracking

| Typ                  | Helper / guard                          | Użycie w runtime                                                          |
| -------------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| `RequestId`        | `createRequestId`, `isRequestId`, `asRequestId` | `RequestIdMiddleware`, `ChatExecutionContext`, envelope błędów, metryki |
| `ConversationId`   | `createConversationId`, `isConversationId`, `asConversationId` | `conversation-id.ts`, Sentry, odpowiedzi czatu                 |
| `ResponseId`       | `asResponseId`                          | ID odpowiedzi gateway (`gw_*`) w serwisach czatu i cache                  |
| `MessageId`        | `asMessageId`                           | ID wiadomości upstream (np. Anthropic stream mapper)                      |
| `ToolCallId`       | `asToolCallId`                          | Wiadomości `role: tool`, `toolCalls` w kontrakcie wewnętrznym             |
| `ClientId`         | `asClientId`                            | Identyfikator klienta z YAML                                              |
| `ProviderInstanceId` | `asProviderInstanceId`                | Klucz wpisu w `providers:` YAML, `ProviderRegistryService`                |
| `JsonSchemaName`   | `asJsonSchemaName`                      | Structured output w `ProviderCallOptions`                                 |
| `ModelAlias`       | `asModelAlias`                          | Routing modeli — alias z YAML (≠ vendor `modelId`)                          |
| `ModelId`          | `asModelId`                             | Vendorowy identyfikator modelu w wywołaniach SDK                            |

### Metrics & usage

| Typ                         | Helper                        |
| --------------------------- | ----------------------------- |
| `InputTokens`               | `asInputTokens`               |
| `OutputTokens`              | `asOutputTokens`              |
| `ThinkingBudgetTokens`      | `asThinkingBudgetTokens`      |
| `CostUsd`                   | `asCostUsd`                   |
| `PromptCacheHitTokens`      | `asPromptCacheHitTokens`      |
| `PromptCacheCreationTokens` | `asPromptCacheCreationTokens` |

### Configuration & policy

| Typ                    | Helper / guard (`is*`)     | Walidacja runtime                          |
| ---------------------- | -------------------------- | ------------------------------------------ |
| `TimeoutMs`            | `asTimeoutMs` / `isTimeoutMs` | min 1                                 |
| `RateLimitRps`         | `asRateLimitRps` / `isRateLimitRps` | min 1, floor na cast              |
| `RateLimitBurst`       | `asRateLimitBurst` / `isRateLimitBurst` | j.w.                              |
| `MaxConcurrentStreams` | `asMaxConcurrentStreams` / `isMaxConcurrentStreams` | min 1                     |
| `MaxAttempts`          | `asMaxAttempts` / `isMaxAttempts` | 1–5                               |
| `AttemptNumber`        | `asAttemptNumber` / `isAttemptNumber` | min 1                             |
| `BaseUrl`              | `asBaseUrl` / `isBaseUrl`  | prefiks `http://` lub `https://`           |
| `CacheKey`             | `asCacheKey`               | —                                          |
| `CacheTtlSeconds`      | `asCacheTtlSeconds` / `isCacheTtlSeconds` | min 0                          |
| `Port`                 | `asPort` / `isPort`        | 1–65535                                    |
| `SchemaVersion`        | `asSchemaVersion` / `isSchemaVersion` | min 1                          |
| `SystemFingerprint`    | `asSystemFingerprint`      | pass-through z OpenAI Chat Completions     |

### Warning codes

| Typ           | Helper          | Użycie w runtime                                      |
| ------------- | --------------- | ----------------------------------------------------- |
| `WarningCode` | `asWarningCode` | `generation-warnings.ts` → `ChatWarningDto.code` (wewnętrznie); pole DTO/OpenAPI pozostaje `string` |

---

## Szczegóły: `RequestId` i `ConversationId`

### `RequestId`

Identyfikator korelacyjny żądania. Powiązany termin: **Request ID** w `dictionary.md`; middleware: `src/common/middleware/request-id.middleware.ts`; typ na `Express.Request`: `src/common/types/express.d.ts`.

| Helper                   | Walidacja                | Kiedy używać                                    |
| ------------------------ | ------------------------ | ----------------------------------------------- |
| `createRequestId(value)` | Tak — regex `req_<uuid>` | Generowanie nowego ID w formacie gateway        |
| `isRequestId(value)`     | Tak (type guard)         | Warunki, filtrowanie                            |
| `asRequestId(value)`     | **Nie**                  | Echo `x-request-id` od klienta, mocki w testach |

**Generated vs echo:** middleware generuje `req_<uuid>` gdy brak nagłówka, ale **echo** dowolnego niepustego `x-request-id` od klienta — wtedy użyj `asRequestId`, nie `createRequestId`.

Wzorzec (`REQUEST_ID_PATTERN`):

```text
^req_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

(flag `i` — wielkość liter UUID bez znaczenia)

### `ConversationId`

Identyfikator sesji rozmowy (`conversationId` w body czatu). Szczegóły produktowe: `conversation_tracking.md`; helpery: `src/chat/helpers/conversation-id.ts`.

| Helper                        | Walidacja                 | Kiedy używać                                             |
| ----------------------------- | ------------------------- | -------------------------------------------------------- |
| `createConversationId(value)` | Tak — regex `conv_<uuid>` | Po walidacji DTO lub przy generowaniu `conv_${uuidv4()}` |
| `isConversationId(value)`     | Tak (type guard)          | Warunki przed Sentry / metrykami                         |
| `asConversationId(value)`     | **Nie**                   | Tylko gdy format jest już gwarantowany (np. testy)       |

Wzorzec (`CONVERSATION_ID_PATTERN`) — zgodny z `@Matches` w `ChatRequestDto`:

```text
^conv_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

---

## Kiedy brand type, kiedy zwykły `string`

| Sytuacja                                                                                    | Podejście                                                            |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Dwa stringi, których **nie wolno** zamienić (np. klucz klienta vs klucz providera) | Osobne brand types                                                   |
| Pole w DTO HTTP (`class-validator`, OpenAPI)                                                | **`string`** w klasie DTO; konwersja do brandu w mapperze / serwisie |
| Wartość zaufana (wewnętrzny helper, znany format)                                           | `create*` (z walidacją) lub `as*` (cast)                             |
| Wartość od klienta z wymaganym formatem                                                     | Walidacja DTO **lub** `create*` — nie sam `as*`                      |
| Serializacja JSON / SSE                                                                     | `unbrand(id)` lub implicit string — brand istnieje tylko w TS        |

---

## Jak dodać nowy brand type

Wzorzec stosowany w projekcie (kolejność):

1. **Definicja typu** w `branded.types.ts`:

   ```typescript
   export type GatewayKey = Brand<string, 'GatewayKey'>;
   export const asGatewayKey = (value: string): GatewayKey =>
     value as GatewayKey;
   ```

2. **Opcjonalna walidacja** w `branded.guards.ts` (gdy format ma znaczenie runtime):

   ```typescript
   export function createGatewayKey(value: string): GatewayKey {
     if (!value.trim()) throw new Error('Invalid GatewayKey');
     return value as GatewayKey;
   }
   ```

3. **Eksport** z `index.ts`.

4. **Testy** w `branded.spec.ts` (lub dedykowany `.spec.ts` przy złożonej logice).

5. **Refaktoryzacja modułu** + aktualizacja `.spec.ts` modułu.

Dla typów **bez** walidacji formatu wystarczy para: `export type X = Brand<...>` + `asX`.

---

## Pokrycie w kodzie

| Obszar | Status runtime | Zakres |
| ------ | -------------- | ------ |
| Infrastruktura | ✅ | `Brand`, guardy, testy, dokumentacja |
| Security keys | ✅ | `GatewayKey`, `ProviderApiKey`, `EnvRef` — config, guardy, rate limit |
| Identyfikatory | ✅ | Routing modeli, middleware, typy czatu |
| Metryki / usage | ✅ | Tokeny, koszty, usage w metrykach i odpowiedziach |
| Config / policy | ✅ | Policy, resilience, cache, port, `SystemFingerprint` |
| Providery / fasady | ✅ | `WarningCode`, audyt testów i mocków |
| CLI | częściowe | Pełna adopcja brandów w `src/cli/` — do dokończenia przy kolejnych zmianach CLI |

**Granica HTTP (bez zmian):** klasy DTO (`class-validator`, OpenAPI) nadal deklarują `string` / `number`; konwersja do brand type następuje w serwisach, mapperach i helperach po walidacji wejścia.

**Workflow per moduł** (przy kolejnych typach):

1. Zmień typy w kodzie produkcyjnym.
2. Zaktualizuj mocki w `.spec.ts` i helpery w `src/common/mocks/`, `test/e2e/helpers/`, `test/integration/helpers/` (`as*` zamiast surowych stringów).
3. Uruchom `npm test`, `npm run test:e2e` (+ `npm run test:integration` po większej zmianie).
4. Checkpoint: `npm run build` bez błędów TS.

---

## Best practices

1. **`create*` vs `as*`** — `create*` rzuca przy złym formacie; `as*` to świadomy cast na granicy zaufania.
2. **Granica HTTP** — DTO pozostają `string`; brand w warstwie domenowej (`ChatService`, context objects).
3. **Testy** — mocki: `asRequestId('req_123e4567-e89b-12d3-a456-426614174000')` lub krótsze ID przez `as*` gdy test nie weryfikuje formatu.
4. **Regex** — jeden source of truth: `CONVERSATION_ID_PATTERN` / `REQUEST_ID_PATTERN` w `branded.guards.ts`; DTO i helpery importują te same stałe.
5. **Nie mieszaj semantyk** — np. `GatewayKey` ≠ `ProviderApiKey`, `ModelAlias` ≠ `ModelId`, `InputTokens` ≠ `OutputTokens`.
6. **Mocki testowe** — `src/common/mocks/createMockContext.ts`, `createTestGatewayConfig.ts`, stałe w `test/e2e/helpers/e2e-constants.ts` i `test/integration/helpers/integration-constants.ts` używają branded types tam, gdzie runtime wymaga semantyki (np. `RequestId`, `GatewayKey`, `ModelAlias`).

---

## Anty-wzorce

| Anty-wzorzec                                                | Dlaczego                                                |
| ----------------------------------------------------------- | ------------------------------------------------------- |
| `asConversationId(clientInput)` bez wcześniejszej walidacji | Omija regex; błędne ID trafi do runtime                 |
| `brand<RequestId>(anyString)` z jawnym generykiem           | Często błąd kompilacji TS (`UnBrand` nie ściąga brandu) |
| Brand type w `@ApiProperty` / OpenAPI jako „magiczny” typ   | OpenAPI i JSON widzą `string`; dokumentuj w opisie pola |
| Masowa migracja całego repo w jednym PR                     | Łamie plan faz; utrudnia review i rollback              |

---

## Testy

```bash
# Tylko brand utilities
npm test -- common/types/branded.spec.ts

# Coverage (target: 100% dla branded*.ts)
npm run test:cov -- --collectCoverageFrom="common/types/branded*.ts" common/types/branded.spec.ts
```

---

## Powiązane dokumenty

- `dictionary.md` — terminy Request ID, Conversation ID, sekcja Brand types
- `conversation_tracking.md` — semantyka `conversationId` w API i Sentry
- `architektura_api.md` — propagacja `requestId`, nagłówek `x-request-id`
