# Brand types — przewodnik dla developerów

Ten dokument opisuje infrastrukturę **brand types** wprowadzoną w **Fazie 0** planu implementacji (`brand-types-plan.md` w katalogu głównym repo). Celem jest zwiększenie type safety: semantycznie różne wartości oparte na tym samym typie prymitywnym (`string`) nie powinny dać się przypadkowo zamienić w compile time.

**Stan:** Faza 0 (foundation) — infrastruktura i typy `RequestId` / `ConversationId`. Migracja produkcyjnego kodu (middleware, DTO, guardy) następuje w Fazach 1–5.

---

## Pliki i importy

| Plik | Rola |
|------|------|
| `src/common/types/branded.types.ts` | Typ `Brand`, utility `brand` / `unbrand`, aliasy typów, helpery `as*` |
| `src/common/types/branded.guards.ts` | Walidacja runtime (`create*`), type guardy (`is*`), wzorce regex |
| `src/common/types/branded.spec.ts` | Testy jednostkowe (wymaganie: 100% coverage utilities) |
| `src/common/types/index.ts` | Barrel export — typy, `brand` / `unbrand`, guardy, wzorce |

**Import zalecany (barrel):**

```typescript
import {
  createConversationId,
  isConversationId,
  type ConversationId,
  CONVERSATION_ID_PATTERN,
} from '../common/types';
```

Helpery **`asRequestId`** i **`asConversationId`** są w `branded.types.ts` — import bezpośredni, dopóki nie trafią do barrel:

```typescript
import { asRequestId, type RequestId } from '../common/types/branded.types';
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

## Typy z Fazy 0

### `RequestId`

Identyfikator korelacyjny żądania. Powiązany termin: **Request ID** w `dictionary.md`, implementacja middleware: `src/common/middleware/request-id.middleware.ts`.

| Helper | Walidacja | Kiedy używać |
|--------|-----------|--------------|
| `createRequestId(value)` | Tak — regex `req_<uuid>` | Generowanie nowego ID w formacie gateway |
| `isRequestId(value)` | Tak (type guard) | Warunki, filtrowanie |
| `asRequestId(value)` | **Nie** | Echo `x-request-id` od klienta, mocki w testach |

**Generated vs echo:** middleware generuje `req_<uuid>` gdy brak nagłówka, ale **echo** dowolnego niepustego `x-request-id` od klienta — wtedy użyj `asRequestId`, nie `createRequestId`. Pełna migracja middleware: Faza 2.

Wzorzec (eksportowany jako `REQUEST_ID_PATTERN`):

```text
^req_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

(flag `i` — wielkość liter UUID bez znaczenia)

### `ConversationId`

Identyfikator sesji rozmowy (`conversationId` w body czatu). Szczegóły produktowe: `conversation-tracking.md`.

| Helper | Walidacja | Kiedy używać |
|--------|-----------|--------------|
| `createConversationId(value)` | Tak — regex `conv_<uuid>` | Po walidacji DTO lub przy generowaniu `conv_${uuidv4()}` |
| `isConversationId(value)` | Tak (type guard) | Warunki przed Sentry / metrykami |
| `asConversationId(value)` | **Nie** | Tylko gdy format jest już gwarantowany (np. testy) |

Wzorzec (`CONVERSATION_ID_PATTERN`) — **identyczny** z `@Matches` w `ChatRequestDto`:

```text
^conv_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

---

## Kiedy brand type, kiedy zwykły `string`

| Sytuacja | Podejście |
|----------|-----------|
| Dwa stringi, których **nie wolno** zamienić (np. klucz klienta vs klucz providera — Faza 1) | Osobne brand types |
| Pole w DTO HTTP (`class-validator`, OpenAPI) | **`string`** w klasie DTO; konwersja do brandu w mapperze / serwisie |
| Wartość zaufana (wewnętrzny helper, znany format) | `create*` (z walidacją) lub `as*` (cast) |
| Wartość od klienta z wymaganym formatem | Walidacja DTO **lub** `create*` — nie sam `as*` |
| Serializacja JSON / SSE | `unbrand(id)` lub implicit string — brand istnieje tylko w TS |

---

## Jak dodać nowy brand type

Wzorzec stosowany w projekcie (kolejność):

1. **Definicja typu** w `branded.types.ts`:

   ```typescript
   export type GatewayKey = Brand<string, 'GatewayKey'>;
   export const asGatewayKey = (value: string): GatewayKey => value as GatewayKey;
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

5. **Refaktoryzacja modułu** zgodnie z fazą w `brand-types-plan.md` + aktualizacja `.spec.ts` modułu.

Dla typów **bez** walidacji formatu wystarczy para: `export type X = Brand<...>` + `asX`.

---

## Migracja istniejącego kodu (fazy planu)

Implementacja jest **inkrementalna** — po Fazie 0 produkcyjny kod nadal używa `string` w większości miejsc.

| Faza | Zakres |
|------|--------|
| **0** | Infrastruktura (`Brand`, guardy, testy, dokumentacja) — **bez** refaktoru modułów |
| **1** | `GatewayKey`, `ProviderApiKey`, `EnvRef` — config, guardy, rate limit |
| **2** | `RequestId`, `ConversationId`, `ModelAlias`, `ModelId`, middleware, chat types |
| **3+** | Cache keys, tool IDs, pozostałe identyfikatory |

**Workflow per moduł** (Fazy 1–5):

1. Zmień typy w kodzie produkcyjnym.
2. Zaktualizuj mocki w `.spec.ts` (`as*` zamiast surowych stringów).
3. Uruchom `npm test` (+ integration/e2e po fazie).
4. Checkpoint: `npm run build` bez błędów TS.

---

## Best practices

1. **`create*` vs `as*`** — `create*` rzuca przy złym formacie; `as*` to świadomy cast na granicy zaufania.
2. **Granica HTTP** — DTO pozostają `string`; brand w warstwie domenowej (`ChatService`, context objects).
3. **Testy** — mocki: `asRequestId('req_123e4567-e89b-12d3-a456-426614174000')` lub krótsze ID przez `as*` gdy test nie weryfikuje formatu.
4. **Regex** — jeden source of truth: stałe `CONVERSATION_ID_PATTERN` / `REQUEST_ID_PATTERN`; DTO powinno używać tych samych wzorców (Faza 2: import wspólnego patternu).
5. **Nie mieszaj semantyk** — np. `GatewayKey` ≠ `ProviderApiKey` (Faza 1), `ModelAlias` ≠ `ModelId` (Faza 2).

---

## Anty-wzorce

| Anty-wzorzec | Dlaczego |
|--------------|----------|
| `asConversationId(clientInput)` bez wcześniejszej walidacji | Omija regex; błędne ID trafi do runtime |
| `brand<RequestId>(anyString)` z jawnym generykiem | Często błąd kompilacji TS (`UnBrand` nie ściąga brandu) |
| Brand type w `@ApiProperty` / OpenAPI jako „magiczny” typ | OpenAPI i JSON widzą `string`; dokumentuj w opisie pola |
| Masowa migracja całego repo w jednym PR | Łamie plan faz; utrudnia review i rollback |

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
- `conversation-tracking.md` — semantyka `conversationId` w API i Sentry
- `architektura_api.md` — propagacja `requestId`, nagłówek `x-request-id`
- `brand-types-plan.md` (root repo) — pełny harmonogram faz 1–5
