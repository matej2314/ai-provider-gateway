# Plan rozszerzeń kontraktów API — AI Provider Gateway

**Status:** 🔄 **W trakcie** — C0–C3 wykonane (kod); C4–C8 planowane; pozostałości docs/testy z C1–C3 → C7  
**Baseline:** MVP tekstowy + tool calling (fazy T0-T8 z `tools_implementation.md`)  
**Cel:** Rozszerzyć kontrakty gateway o kluczowe parametry OpenAI i Anthropic API, zachowując charakter projektu (gateway-first, sensowny subset vendor API).  
**Zakres:** Parametry generacji (topP, stop, penalties, seed), structured outputs (JSON mode), rozszerzony usage, metadata, extended thinking mode (reasoning_effort, max_thinking_tokens).  
**Poza zakresem:** Multimodal (images), audio, advanced/niszowe parametry (logit_bias, logprobs, n).

**Powiązane:** `tools_implementation.md` (tool calling — prerequisite), `docs/integracja-openai-kontrakt.md`, `docs/integracja-anthropic-messages.md`, `docs/dokumentacja_api.md`, `docs/spec/SPEC-PROVIDERS.md` (multi-instance model).

**Aktualizacja planu:** 
- **2026-06-12** — krok C4.6 wykonany: fasada Anthropic — `cache_creation_input_tokens` i `cache_read_input_tokens` w response usage (DTO + mapper)
- **2026-06-12** — krok C4.5 zaktualizowany: streaming `system_fingerprint` był już zaimplementowany (pełna zgodność non-stream + stream); uzupełniono opis faktycznego stanu kodu
- **2026-06-12** — faza C3 (Response format / JSON mode) zakończona; wszystkie kroki C3.1–C3.10 wykonane
- **2026-06-12** — dodano fazę C8 (Extended Thinking); szacunek: 16-24h (8 faz C0-C8)
- **2026-06-10** — audit kodu bazowego; C1–C2 zaimplementowane w `src/`; pozostałości: docs OpenAI (`integracja-openai-kontrakt.md`) + testy jednostkowe → C7

---

## ⚠️ UWAGA: Audit kodu 2026-06-10 (czytaj przed implementacją)

**Odkrycia po audycie kodu bazowego:**

1. **OpenAI DTO i mapper (stan po C1–C2):**
   - ✅ `top_p`, `stop`, `presence_penalty`, `frequency_penalty`, `seed` w `src/integrations/openai/dtos/openai-chat-completion-request.dto.ts`
   - ✅ Mapowanie w `src/integrations/openai/mappers/openai-request.mapper.ts` (C1.8 + C2.7)
   - **Rezultat:** Klient OpenAI wysyła parametry → gateway mapuje na `params.*` → adaptery przekazują zgodnie ze wsparciem vendora (penalties → tylko gdy powstanie adapter OpenAI; `seed` → Google)

2. **Korekty kroków planu (zrealizowane w C1–C2):**
   - **C1.7:** Dodano `stop` do OpenAI DTO (top_p już był)
   - **C1.8 + C2.7:** Mapowanie wszystkich pól (`top_p`, `stop`, penalties, `seed`) w jednym bloku mappera
   - **C2.6:** `seed` + doprecyzowana walidacja penalties w OpenAI DTO

3. **Backward compatibility:**
   - ✅ To jest **FIX + rozszerzenie**, nie breaking change
   - Klient który wcześniej wysyłał `top_p` / penalties otrzyma teraz **oczekiwane zachowanie** (były akceptowane ale nieaktywne)
   - Wszystkie nowe pola opcjonalne + domyślnie zablokowane przez `allowOverrides`

4. **Szacunek czasu po audycie:**
   - Oryginalny: 14-20h → **Nowy: 13-19h** (lekka optymalizacja)

---

## 🎯 Filozofia planu

1. **Gateway-first** — dodać tylko to, co ma sens w abstrakcji multi-provider (nie vendor-specific edge cases)
2. **Wysokie ROI** — parametry często używane w production, nie niszowe feature'y
3. **Backward compatible** — wszystkie nowe pola opcjonalne, bez regresji na istniejące API
4. **Vendor-agnostic gdy możliwe** — jednolite nazewnictwo w `src/chat`, mapowanie w fasadach
5. **Po tool calling** — wiele rozszerzeń wymaga kodu z faz T1-T5A (`ChatToolingDto`, response mapping)

---

## 📊 Przegląd faz

| Faza | Cel | Szacunek | Prerequisite | Status |
|------|-----|----------|--------------|--------|
| **C0. Baseline audit** | Weryfikacja stanu kodu + analiza vendor docs | 1-2h | Tool calling (T0-T8) | ✅ Wykonany 2026-06-10 |
| **C1. Core params (topP, stop)** | Nucleus sampling + stop sequences | 1.5-2.5h | Po T3 (params validation) | ✅ Wykonany 2026-06-10 (kroki C1.1–C1.10) |
| **C2. Penalties + seed** | frequency_penalty, presence_penalty, seed | 1.5-2h | Po C1 | ✅ Wykonany 2026-06-10 (kroki C2.1–C2.7, C2.8 Anthropic docs); docs OpenAI + testy → C7 |
| **C3. Response format (JSON mode)** | Structured outputs | 3-4h | Po C1 | ✅ Wykonany 2026-06-12 |
| **C4. Extended response fields** | finishReason szczegółowy, usageDetails (cache tokens) | 2-3h | Po T1.5, T5A.4 | ⏳ Planowany |
| **C5. Metadata + tracking** | Request metadata, system_fingerprint | 1-2h | Po T1.4 | ⏳ Planowany |
| **C6. Provider-specific** | topK (Anthropic), max_completion_tokens (OpenAI) | 1h | Po C1 | ⏳ Planowany |
| **C7. Docs + testy** | Aktualizacja dokumentacji, unit/e2e | 2-3h | Po C1-C6 | ⏳ Planowany (w tym dług z C1–C2: `integracja-openai-kontrakt.md`, testy helperów/mapperów/providerów) |
| **C8. Extended Thinking** | Wsparcie thinking mode dla OpenAI (reasoning_effort) i Anthropic (extended_thinking) | 3-5h | Po C1, C4 | ⏳ Planowany |

**Szacunek łącznie:** ~16-24h (po zakończeniu tool calling T0-T8; po audycie 2026-06-10; zaktualizowano 2026-06-12 z fazą C8)

---

## 📍 Stan wyjściowy kodu (baseline — po T0-T8)

> **Uwaga:** Poniższy snapshot opisuje stan **przed C1–C2** (audyt C0). Aktualny postęp — patrz **Przegląd faz** (C0–C2 ✅ w kodzie).

### Co mamy po tool calling

| Obszar | Stan |
|--------|------|
| `ChatRequestDto` | `modelAlias`, `messages` (user \| assistant \| tool), `params` (temperature, maxOutputTokens), `tooling?` (definitions, toolChoice), `conversationId?` |
| `ChatMessageDto` | `role` ∈ {user, assistant, tool}, `content` (string), `toolCallId?`, `toolCalls?` |
| `ChatResponseDto` | `output.text`, `toolCalls?`, `finishReason?` (stop \| tool_calls \| length \| content_filter), `usage?`, `cached?` |
| `ChatParamsDto` | Tylko `temperature` (0–2), `maxOutputTokens` (1–8192) |
| OpenAI request DTO | `tools?`, `tool_choice?` przyjmowane i mapowane (T5) |
| Anthropic request DTO | `tools?`, `tool_choice?` przyjmowane i mapowane (T5A) |
| `gateway.config.yaml` | `policy.params.defaults`, `allowOverrides`, `bounds` — tylko dla temperature/maxOutputTokens |
| Validation | `resolveProviderCallOptions` w `src/chat/helpers/resolve-provider-call-options.ts` — merge defaults ← overrides + bounds clamp |

### Czego brakuje (zakres tego planu)

**Gateway core (`ChatParamsDto`, `ChatRequestDto`, `ChatResponseDto`):**
- `topP`, `stop`, `frequencyPenalty`, `presencePenalty`, `seed` w `ChatParamsDto`
- `responseFormat` (JSON mode)
- `usageDetails` z cache tokens (Anthropic), `systemFingerprint` (OpenAI)
- `metadata` w request
- `topK` (Anthropic-specific)
- **🆕 C8:** `thinkingEnabled`, `thinkingBudget` (extended thinking mode)
- **🆕 C8:** `thinkingContent` w response (Anthropic thinking blocks)

**Fasady - OpenAI:**
- ✅ `top_p`, `presence_penalty`, `frequency_penalty` **już w DTO** (src/integrations/openai/dtos/openai-chat-completion-request.dto.ts linie 100-115)
- ❌ `stop`, `seed` - **brak w DTO**
- ❌ **Mapowanie** - żadne z powyższych 5 pól **nie jest mapowane** w openai-request.mapper.ts
- **🆕 C8:** ❌ `reasoning_effort` (dla modeli o1) - **brak w DTO i mapperze**

**Fasady - Anthropic:**
- ❌ Wszystkie pola (`top_p`, `stop_sequences`, `top_k`, `metadata`) - **brak w DTO i mapperach**
- **🆕 C8:** ❌ `max_thinking_tokens` (extended thinking) - **brak w DTO i mapperze**

**Adaptery providerów:**
- Propagacja nowych `ProviderCallOptions` do Anthropic/Google (create-*-provider.ts)
- **🆕 C8:** Extended thinking headers (`anthropic-beta: extended-thinking-2025-02-01`) i thinking content extraction

---

## ✅ FAZA C0: Baseline audit (1-2h)

**Cel:** Zweryfikować stan kodu po tool calling (T0-T8) i vendor docs (Context7 MCP); potwierdzić braki; zaplanować kolejność kroków.

**Prerequisite:** Zakończone fazy T0-T8 z `tools_implementation.md`.

**Milestone C0:** Checklistę braków w kontraktach, plan mapowania parametrów vendor → gateway → provider.

---

### Krok C0.1: Weryfikacja stanu po tool calling

**Status:** ✅ **WYKONANY 2026-06-10**

**Akcja:**

1. ✅ Sprawdź `src/chat/dto/chat-params.dto.ts` — tylko `temperature`, `maxOutputTokens`
2. ✅ Sprawdź `src/chat/helpers/resolve-provider-call-options.ts` — obsługuje tylko 2 pola, sztywna lista `OVERRIDE_KEYS`
3. ✅ Sprawdź fasady:
   - `src/integrations/openai/dtos/openai-chat-completion-request.dto.ts`:
     - ✅ **ODKRYCIE:** `top_p` (linia 102), `presence_penalty` (linia 111), `frequency_penalty` (linia 115) **JUŻ ISTNIEJĄ**
     - ❌ Brak: `stop`, `seed`, `response_format`, `metadata`, `max_completion_tokens`
   - `src/integrations/openai/mappers/openai-request.mapper.ts`:
     - ❌ **KRYTYCZNE:** Żadne z powyższych 5 pól (top_p, penalties) **nie jest mapowane** mimo że są w DTO
   - `src/integrations/anthropic/dtos/anthropic-messages-request.dto.ts`:
     - ✅ Tylko podstawowe pola (model, messages, system, stream, max_tokens, temperature, tools, tool_choice)
     - ❌ Brak: `top_p`, `stop_sequences`, `top_k`, `metadata`
4. ✅ Sprawdź fabryki providerów:
   - `src/providers/factories/create-anthropic-provider.ts` — przekazuje tylko `temperature`, `maxOutputTokens`, `max_tokens` do SDK
   - `src/providers/factories/create-google-provider.ts` — przekazuje tylko `temperature`, `maxOutputTokens` do SDK

**Wyniki weryfikacji:**

**Lista pól DO DODANIA w `ChatParamsDto`:**
- `topP`, `stop`, `frequencyPenalty`, `presencePenalty`, `seed`, `responseFormat`, `topK`

**Lista pól DO DODANIA w fasadach:**
- **OpenAI DTO:** ✅ `top_p`, `presence_penalty`, `frequency_penalty` już są → dodać **tylko** `stop`, `seed`
- **OpenAI mapper:** ❌ Wszystkie 5 pól (`top_p`, `stop`, penalties, `seed`) wymagają **mapowania**
- **Anthropic DTO:** `top_p`, `stop_sequences`, `top_k`, `metadata`
- **Anthropic mapper:** Wszystkie powyższe pola

**Potwierdzenie `globalValidationPipe`:**
- ✅ `forbidNonWhitelisted: true` nie zablokuje nowych pól (bo dodamy je do DTO)

**Commit:** Brak (audit)

**Dokumentacja:** ✅ Notatka w `docs/integracje.md` sekcja "Ograniczenia MVP" — aktualizacja w C7.

---

### Krok C0.2: Analiza vendor docs (Context7 MCP)

**Akcja:**

1. Pobrać dokumentację OpenAI Chat Completions API (Context7):
   - `/openai/openai-node` — pełna lista parametrów `chat.completions.create`
   - Priorytetyzacja: top_p, stop, frequency_penalty, presence_penalty, seed, response_format, max_completion_tokens
2. Pobrać dokumentację Anthropic Messages API (Context7):
   - `/anthropics/anthropic-sdk-typescript` — pełna lista parametrów `messages.create`
   - Priorytetyzacja: top_p, top_k, stop_sequences, metadata, cache_control (opcjonalnie — zaawansowane)
3. Google Gemini API:
   - Jakie parametry mapują się na gateway (top_p, top_k, stop_sequences)?

**Weryfikacja:**
- Tabela mapowania: `ChatParamsDto` pole → OpenAI param → Anthropic param → Google param
- Decyzja: jakie pola są wspólne (vendor-agnostic), jakie provider-specific

**Commit:** Brak (research)

**Dokumentacja:** `docs/dictionary.md` — dodać nowe pojęcia (topP, nucleus sampling, stop sequences, JSON mode).

---

### Krok C0.3: Plan mapowania parametrów

**Status:** ✅ **WYKONANY 2026-06-10**

**Akcja:** Sporządź tabelę:

| Gateway pole (`ChatParamsDto`) | OpenAI | Anthropic | Google | Priorytet | Uwagi (po audycie) |
|--------------------------------|--------|-----------|--------|-----------|-------------------|
| `topP` | `top_p` | `top_p` | `topP` | WYSOKI | ✅ OpenAI DTO już ma `top_p` (brak mapowania) |
| `stop` | `stop` | `stop_sequences` | `stopSequences` | WYSOKI | ❌ OpenAI DTO brak |
| `frequencyPenalty` | `frequency_penalty` | N/A | N/A | ŚREDNI | ✅ OpenAI DTO już ma (brak mapowania) |
| `presencePenalty` | `presence_penalty` | N/A | N/A | ŚREDNI | ✅ OpenAI DTO już ma (brak mapowania) |
| `seed` | `seed` | N/A | `seed` | ŚREDNI | ❌ OpenAI DTO brak; ✅ **Google wspiera** (Context7 verify) |
| `topK` | N/A | `top_k` | `topK` | ŚREDNI (provider-specific) | ❌ Anthropic DTO brak |
| `responseFormat` | `response_format` | `output_config` | `response_mime_type` | WYSOKI | ❌ Oba DTO brak (plan: C3.8-C3.10) |

**Weryfikacja:**
- ✅ Każde pole gateway ma jasne mapowanie do ≥1 providera
- ✅ Pola provider-specific (topK, penalties) są oznaczone

**Odkrycia po audycie:**
- OpenAI DTO ma 3/5 pól z C1+C2 (`top_p`, penalties) ale **żadne nie jest mapowane**
- Priorytet: C1.8 (mapowanie) jest **krytyczne** — fix istniejących pól + nowe

**Commit:** Brak (planning)

**Dokumentacja:** `docs/konfiguracja.md` — rozszerzyć sekcję `policy.params` o nowe pola (C7.3).

---

## ✅ FAZA C1: Core params (topP, stop) — 2-3h

**Cel:** Dodać nucleus sampling (`topP`) i stop sequences (`stop`) — najbardziej używane parametry kontroli generacji.

**Prerequisite:** Faza T3 zakończona (walidacja params przez `resolveProviderCallOptions`).

**Milestone C1:** Request z `params.topP` / `params.stop` → adaptery Anthropic/Google dostają prawidłowe wartości; fasady OpenAI/Anthropic mapują `top_p` / `stop`.

---

### Krok C1.1: DTO gateway — `topP`, `stop`

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/chat/dto/chat-params.dto.ts`

**Akcja:**

```typescript
import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  ValidateIf,
  IsString,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ChatParamsDto {
  // ✅ Istniejące (po T1)
  @ApiPropertyOptional({ minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 8192 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8192)
  maxOutputTokens?: number;

  // 🆕 C1.1: topP
  @ApiPropertyOptional({
    description:
      'Nucleus sampling (0-1). Alternative to temperature for controlling randomness. Lower values = more focused, higher values = more diverse. It is generally recommended to alter either temperature or topP, but not both.',
    minimum: 0,
    maximum: 1,
    example: 0.95,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  // 🆕 C1.1: stop
  @ApiPropertyOptional({
    description:
      'Sequence(s) where generation should stop. Can be a string or array of strings.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['\n\n', '###'],
  })
  @IsOptional()
  @ValidateIf((o) => typeof o.stop === 'string' || Array.isArray(o.stop))
  @ValidateIf((o) => typeof o.stop === 'string', {
    message: 'stop must be a string or array of strings',
  })
  @ValidateIf((o) => Array.isArray(o.stop), {
    message: 'stop must be a string or array of strings',
  })
  stop?: string | string[];
}
```

**Uwaga:** Custom validator dla `stop` (string | string[]) — można użyć `@IsStringOrArrayOfStrings()` z `src/common/validators/` (stworzyć helper w C1.1a jeśli nie istnieje).

**Weryfikacja:**
- `npm run build` — brak błędów
- Postman: `{ "params": { "topP": 0.9, "stop": "###" } }` → 200 (bez wywołania providera jeszcze)

**Commit:** `feat(chat): add topP and stop to ChatParamsDto`

**Dokumentacja:** `docs/dokumentacja_api.md` — rozszerzyć sekcję `params` (przykłady).

---

### Krok C1.1a: Custom validator dla `stop`

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/common/validators/is-string-or-array-of-strings.validator.ts` **(NOWY)**

**Akcja:**

```typescript
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsStringOrArrayOfStrings(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStringOrArrayOfStrings',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value === 'string') return true;
          if (
            Array.isArray(value) &&
            value.every((item) => typeof item === 'string')
          )
            return true;
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a string or an array of strings`;
        },
      },
    });
  };
}
```

**Użycie w `ChatParamsDto`:**

```typescript
import { IsStringOrArrayOfStrings } from '../../common/validators/is-string-or-array-of-strings.validator';

// Zamienić ValidateIf na:
@IsOptional()
@IsStringOrArrayOfStrings()
stop?: string | string[];
```

**Weryfikacja:**
- Test jednostkowy `chat-params.dto.spec.ts` — przypadki: string, array, number (błąd), null (OK gdy optional)

**Commit:** `feat(common): add IsStringOrArrayOfStrings validator`

---

### Krok C1.2: Config YAML — defaults i bounds

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `gateway.config.yaml`

**Akcja:** Dla aliasu `chat-default` (i innych) rozszerz `policy.params`:

```yaml
models:
  chat-default:
    # ... istniejące ...
    policy:
      params:
        defaults:
          temperature: 1.0
          # 🆕 C1.2
          topP: 0.95 # Sensowny default (większość top tokens)
        allowOverrides:
          - temperature
          - maxOutputTokens
          # 🆕 C1.2
          - topP
          - stop
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
          # 🆕 C1.2
          topP: { min: 0, max: 1 }
          # stop nie ma bounds (array/string, każdy provider sam waliduje)
```

**Zod schema** (`src/config/configuration.ts`):

```typescript
// W GatewayConfigSchema → models.*.policy.params:
const ParamsSchema = z.object({
  defaults: z
    .object({
      temperature: z.number().optional(),
      maxOutputTokens: z.number().optional(),
      // 🆕 C1.2
      topP: z.number().min(0).max(1).optional(),
    })
    .optional()
    .default({}),
  allowOverrides: z.array(z.string()).optional().default([]),
  bounds: z
    .object({
      temperature: z.object({ min: z.number(), max: z.number() }).optional(),
      maxOutputTokens: z
        .object({ min: z.number(), max: z.number() })
        .optional(),
      // 🆕 C1.2
      topP: z.object({ min: z.number(), max: z.number() }).optional(),
    })
    .optional()
    .default({}),
});
```

**Weryfikacja:**
- `npm run build`
- Aplikacja startuje z rozszerzonym YAML (logi Zod validation pass)

**Commit:** `feat(config): add topP and stop to policy.params schema`

---

### Krok C1.3: Helper `resolveProviderCallOptions` — merge topP, stop

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/chat/helpers/resolve-provider-call-options.ts`

**Stan wyjściowy (po T3):** Funkcja `resolveProviderCallOptions` merguje `temperature`, `maxOutputTokens` z defaults ← overrides + clamp bounds. **Sztywna lista kluczy:** `OVERRIDE_KEYS = ['temperature', 'maxOutputTokens']` (linia 7).

**Akcja 1:** Rozszerz listę `OVERRIDE_KEYS` o nowe parametry:

```typescript
// Stara lista (linia 7):
// const OVERRIDE_KEYS = ['temperature', 'maxOutputTokens'] as const;

// 🆕 C1.3: Rozszerzona lista
const OVERRIDE_KEYS = [
  'temperature',
  'maxOutputTokens',
  'topP',
  'stop',
  'frequencyPenalty',
  'presencePenalty',
  'seed',
  'topK',
  'responseFormat',
] as const;
```

**Akcja 2:** Rozszerz logikę o `topP` i `stop`:

```typescript
export function resolveProviderCallOptions(
  policyParams: GatewayParamsConfig | undefined,
  bodyParams?: ChatParamsDto,
): ProviderCallOptions {
  const defaults = policyParams?.defaults ?? {};
  const allowOverrides = policyParams?.allowOverrides ?? [];
  const bounds = policyParams?.bounds ?? {};

  // Validation: sprawdź czy override dozwolony (istniejąca logika dla wszystkich kluczy)
  if (bodyParams) {
    for (const key of Object.keys(bodyParams) as OverrideKey[]) {
      if (!isOverrideKey(key)) continue;
      if (bodyParams[key] === undefined) continue;

      if (!allowOverrides.includes(key)) {
        throw new HttpException(
          {
            code: ApiErrorCode.MODEL_NOT_ALLOWED,
            message: `Parameter ${key} is not allowed for this model alias`,
            details: [{ field: `params.${key}`, allowOverrides }],
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  let temperature = defaults.temperature;
  let maxOutputTokens = defaults.maxOutputTokens;
  // 🆕 C1.3
  let topP = defaults.topP;
  let stop = bodyParams?.stop; // stop nie ma defaults w YAML (opcjonalne pole)

  // Overrides z request (gdy dozwolone) — istniejąca logika
  if (bodyParams?.temperature !== undefined) {
    temperature = bodyParams.temperature;
  }
  if (bodyParams?.maxOutputTokens !== undefined) {
    maxOutputTokens = bodyParams.maxOutputTokens;
  }
  // 🆕 C1.3: topP, stop
  if (bodyParams?.topP !== undefined) {
    topP = bodyParams.topP;
  }
  // stop już zwalidowany powyżej (allowOverrides), tutaj tylko passthrough

  // Clamp bounds (temperature, maxOutputTokens, topP) — istniejąca logika
  if (temperature !== undefined && bounds.temperature) {
    temperature = clamp(
      temperature,
      bounds.temperature.min,
      bounds.temperature.max,
    );
  }
  if (maxOutputTokens !== undefined && bounds.maxOutputTokens) {
    maxOutputTokens = clamp(
      maxOutputTokens,
      bounds.maxOutputTokens.min,
      bounds.maxOutputTokens.max,
    );
  }
  // 🆕 C1.3: topP
  if (topP !== undefined && bounds.topP) {
    topP = clamp(bounds.topP.min, bounds.topP.max, topP);
  }

  return {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    ...(topP !== undefined ? { topP } : {}),
    ...(stop !== undefined ? { stop } : {}),
  };
}
```

**⚠️ Uwaga:** Ten krok wymaga rozszerzenia dla **każdego nowego parametru** (C2.3, C3.4, C6.3). Rozważ refactoring na dynamiczne mapowanie lub generyczną funkcję w przyszłości (redukcja duplikacji kodu).

**Weryfikacja:**
- Test jednostkowy `resolve-provider-call-options.spec.ts` — przypadki:
  - `topP` w bodyParams + allowOverrides → success
  - `topP` w bodyParams bez allowOverrides → 400 `MODEL_NOT_ALLOWED`
  - `topP` poza bounds → clamped
  - `stop` string → passthrough
  - `stop` array → passthrough

**Commit:** `feat(chat): support topP and stop in resolveProviderCallOptions`

---

### Krok C1.4: Provider interface — rozszerz `ProviderCallOptions`

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/providers/interfaces/ai-provider.interface.ts`

**Akcja:**

```typescript
// Stan wyjściowy (po T2):
export interface ProviderCallOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

// 🆕 C1.4:
export interface ProviderCallOptions {
  temperature?: number;
  maxOutputTokens?: number;
  // 🆕 C1.4
  topP?: number;
  stop?: string | string[];
}
```

**Weryfikacja:**
- Brak błędów kompilacji (adaptery jeszcze nie używają, ale sygnatura gotowa)

**Commit:** `feat(providers): add topP and stop to ProviderCallOptions`

---

### Krok C1.5: Anthropic provider — mapowanie topP, stop

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/providers/factories/create-anthropic-provider.ts`

**Akcja:** W funkcji `complete` (gałąź z tools — T4.2) oraz `stream` (T6.1) wewnątrz fabryki:

```typescript
// Pseudo-kod (fragment):
async complete(
  input: ProviderChatInput,
  modelId: string,
  options?: ProviderCallOptions,
): Promise<ProviderChatResponse> {
  const params: Anthropic.Messages.MessageCreateParams = {
    model: modelId,
    max_tokens: options?.maxOutputTokens ?? 1024,
    temperature: options?.temperature,
    // 🆕 C1.5
    top_p: options?.topP,
    stop_sequences:
      options?.stop !== undefined
        ? Array.isArray(options.stop)
          ? options.stop
          : [options.stop]
        : undefined,
    // ... tools, messages ...
  };

  const response = await this.client.messages.create(params);
  return parseAnthropicResponseWithTools(response);
}
```

**Uwaga:** `stop_sequences` w Anthropic API to array — konwertujemy string → [string].

**Weryfikacja:**
- Test jednostkowy `create-anthropic-provider.spec.ts` (mock SDK):
  - `complete` z `topP: 0.9` → SDK dostaje `top_p: 0.9`
  - `complete` z `stop: "###"` → SDK dostaje `stop_sequences: ["###"]`
  - `complete` z `stop: ["###", "\n\n"]` → SDK dostaje `stop_sequences: ["###", "\n\n"]`

**Commit:** `feat(anthropic): support topP and stop in provider factory`

---

### Krok C1.6: Google provider — mapowanie topP, stop

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/providers/factories/create-google-provider.ts`

**Akcja:** Analogicznie w `complete` i `stream` wewnątrz fabryki:

```typescript
// Pseudo-kod:
const generationConfig: GenerationConfig = {
  temperature: options?.temperature,
  maxOutputTokens: options?.maxOutputTokens,
  // 🆕 C1.6
  topP: options?.topP,
  stopSequences:
    options?.stop !== undefined
      ? Array.isArray(options.stop)
        ? options.stop
        : [options.stop]
      : undefined,
};
```

**Weryfikacja:**
- Test jednostkowy `create-google-provider.spec.ts` — analogicznie do C1.5

**Commit:** `feat(google): support topP and stop in provider factory`

---

### Krok C1.7: Fasada OpenAI — DTO request stop (top_p już istnieje)

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/integrations/openai/dtos/openai-chat-completion-request.dto.ts`

**Stan wyjściowy:** DTO już zawiera `top_p` (linia 102), `presence_penalty` (linia 111), `frequency_penalty` (linia 115).

**Akcja:**

```typescript
export class OpenAiChatCompletionRequestDto {
  // ✅ Istniejące (już w DTO, linie 100-115):
  // @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  // top_p?: number;
  //
  // @ApiPropertyOptional({ minimum: -2.0, maximum: 2.0 })
  // presence_penalty?: number;
  //
  // @ApiPropertyOptional()
  // frequency_penalty?: number;

  // 🆕 C1.7: Dodać TYLKO stop (top_p już jest)
  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'Stop sequences where generation should stop.',
    example: ['\\n\\n', '###'],
  })
  @IsOptional()
  @IsStringOrArrayOfStrings()
  stop?: string | string[];
}
```

**Weryfikacja:**
- `forbidNonWhitelisted: true` nie blokuje `stop` w body (bo jest w DTO)
- `top_p`, `presence_penalty`, `frequency_penalty` już przyjmowane (bez zmian)

**Commit:** `feat(openai): add stop to request DTO`

**Dokumentacja:** `docs/integracja-openai-kontrakt.md` — rozszerzyć sekcję o `stop` (top_p, penalties już powinny być udokumentowane).

---

### Krok C1.8: Fasada OpenAI — mapper request (wszystkie params z C1+C2)

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/integrations/openai/mappers/openai-request.mapper.ts`

**Stan wyjściowy (po T5.4):** Funkcja `mapOpenAiChatRequestToGateway` mapuje `messages`, `tools`, `tool_choice`, `temperature`, `max_tokens`. **BRAK mapowania** `top_p`, `presence_penalty`, `frequency_penalty` (mimo że są w DTO).

**Akcja:** Dodaj mapowanie wszystkich parametrów (top_p, stop, penalties) w jednym kroku:

```typescript
// Fragment:
export function mapOpenAiChatRequestToGateway(
  body: OpenAiChatCompletionRequestDto,
): ChatRequestDto {
  // ... istniejący kod messages, tooling ...

  // params — rozszerz o top_p, stop, penalties (wszystkie parametry z C1+C2)
  if (
    body.temperature !== undefined ||
    body.max_tokens !== undefined ||
    body.top_p !== undefined ||
    body.stop !== undefined ||
    body.frequency_penalty !== undefined ||
    body.presence_penalty !== undefined ||
    body.seed !== undefined
  ) {
    dto.params = {};
    if (body.temperature !== undefined) {
      dto.params.temperature = body.temperature;
    }
    if (body.max_tokens !== undefined) {
      dto.params.maxOutputTokens = body.max_tokens;
    }
    // 🆕 C1.8 + C2.7 (połączone)
    if (body.top_p !== undefined) {
      dto.params.topP = body.top_p;
    }
    if (body.stop !== undefined) {
      dto.params.stop = body.stop;
    }
    if (body.frequency_penalty !== undefined) {
      dto.params.frequencyPenalty = body.frequency_penalty;
    }
    if (body.presence_penalty !== undefined) {
      dto.params.presencePenalty = body.presence_penalty;
    }
    if (body.seed !== undefined) {
      dto.params.seed = body.seed;
    }
  }

  return dto;
}
```

**Uwaga:** Ten krok **połączony** z C2.7 (penalties + seed) — wszystkie parametry mapowane razem dla spójności.

**Weryfikacja:**
- Test jednostkowy `openai-request.mapper.spec.ts`:
  - Input: `{ top_p: 0.95, stop: ["###"] }` → output: `params: { topP: 0.95, stop: ["###"] }`
  - Input: `{ frequency_penalty: 0.5, seed: 42 }` → output: `params: { frequencyPenalty: 0.5, seed: 42 }`

**Commit:** `feat(openai): map top_p, stop, penalties, seed to gateway params`

---

### Krok C1.9: Fasada Anthropic — DTO request topP, stop

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/integrations/anthropic/dtos/anthropic-messages-request.dto.ts`

**Akcja:**

```typescript
export class AnthropicMessagesRequestDto {
  // ✅ Istniejące ...

  // 🆕 C1.9
  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  top_p?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop_sequences?: string[];
}
```

**Uwaga:** Anthropic `stop_sequences` jest zawsze array (nie string | array jak OpenAI).

**Commit:** `feat(anthropic): add top_p and stop_sequences to request DTO`

---

### Krok C1.10: Fasada Anthropic — mapper request

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/integrations/anthropic/mappers/anthropic-request.mapper.ts`

**Stan wyjściowy (po T5A.3):** Funkcja `mapAnthropicRequestToGateway` mapuje `messages`, `tools`, `tool_choice`, `temperature`, `max_tokens`.

**Akcja:**

```typescript
// Fragment:
export function mapAnthropicRequestToGateway(
  body: AnthropicMessagesRequestDto,
): ChatRequestDto {
  // ... istniejący kod ...

  // params — rozszerz o topP, stop
  if (
    body.temperature !== undefined ||
    body.max_tokens !== undefined ||
    body.top_p !== undefined ||
    body.stop_sequences !== undefined
  ) {
    dto.params = {};
    if (body.temperature !== undefined) {
      dto.params.temperature = body.temperature;
    }
    if (body.max_tokens !== undefined) {
      dto.params.maxOutputTokens = body.max_tokens;
    }
    // 🆕 C1.10
    if (body.top_p !== undefined) {
      dto.params.topP = body.top_p;
    }
    if (body.stop_sequences !== undefined) {
      dto.params.stop = body.stop_sequences; // gateway stop przyjmuje array
    }
  }

  return dto;
}
```

**Weryfikacja:**
- Test jednostkowy `anthropic-request.mapper.spec.ts`:
  - Input: `{ top_p: 0.9, stop_sequences: ["###"] }` → output: `params: { topP: 0.9, stop: ["###"] }`

**Commit:** `feat(anthropic): map top_p and stop_sequences to gateway params`

---

## ✅ FAZA C2: Penalties + seed — 2-3h

**Cel:** Dodać `frequencyPenalty`, `presencePenalty`, `seed` — parametry kontroli powtórzeń i deterministycznego samplingowania.

**Prerequisite:** Faza C1 zakończona.

**Milestone C2:** Request z `params.frequencyPenalty` / `presencePenalty` / `seed` → adaptery dostają prawidłowe wartości (tylko providery które wspierają — OpenAI, ewentualnie fallback dla innych).

---

### Krok C2.1: DTO gateway — penalties, seed

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/chat/dto/chat-params.dto.ts`

**Akcja:**

```typescript
export class ChatParamsDto {
  // ✅ Istniejące (temperature, maxOutputTokens, topP, stop) ...

  // 🆕 C2.1: frequencyPenalty
  @ApiPropertyOptional({
    description:
      'Penalize token frequency (-2 to 2). Positive values reduce repetition of tokens based on their frequency in the text so far.',
    minimum: -2,
    maximum: 2,
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  // 🆕 C2.1: presencePenalty
  @ApiPropertyOptional({
    description:
      'Penalize new topics (-2 to 2). Positive values encourage staying on topic by penalizing new tokens.',
    minimum: -2,
    maximum: 2,
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;

  // 🆕 C2.1: seed
  @ApiPropertyOptional({
    description:
      'Integer seed for deterministic sampling. Useful for A/B testing and reproducible results. Only supported by some providers (OpenAI).',
    type: 'integer',
    example: 42,
  })
  @IsOptional()
  @IsInt()
  seed?: number;
}
```

**Weryfikacja:**
- Postman: `{ "params": { "frequencyPenalty": 0.5, "seed": 42 } }` → 200

**Commit:** `feat(chat): add frequencyPenalty, presencePenalty, seed to ChatParamsDto`

---

### Krok C2.2: Config YAML — defaults i bounds penalties, seed

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `gateway.config.yaml`

**Akcja:**

```yaml
models:
  chat-default:
    policy:
      params:
        defaults:
          temperature: 1.0
          topP: 0.95
          # 🆕 C2.2 (opcjonalne defaults, zazwyczaj brak)
          # frequencyPenalty: 0
          # presencePenalty: 0
        allowOverrides:
          - temperature
          - maxOutputTokens
          - topP
          - stop
          # 🆕 C2.2
          - frequencyPenalty
          - presencePenalty
          - seed
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
          topP: { min: 0, max: 1 }
          # 🆕 C2.2
          frequencyPenalty: { min: -2, max: 2 }
          presencePenalty: { min: -2, max: 2 }
          # seed nie ma bounds (integer, provider waliduje)
```

**Zod schema** (`src/config/configuration.ts`):

```typescript
// W ParamsSchema → defaults / bounds:
defaults: z
  .object({
    temperature: z.number().optional(),
    maxOutputTokens: z.number().optional(),
    topP: z.number().min(0).max(1).optional(),
    // 🆕 C2.2
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    seed: z.number().int().optional(),
  })
  .optional()
  .default({}),

bounds: z
  .object({
    // ... istniejące ...
    // 🆕 C2.2
    frequencyPenalty: z.object({ min: z.number(), max: z.number() }).optional(),
    presencePenalty: z.object({ min: z.number(), max: z.number() }).optional(),
  })
  .optional()
  .default({}),
```

**Commit:** `feat(config): add penalties and seed to policy.params schema`

---

### Krok C2.3: Helper `resolveProviderCallOptions` — merge penalties, seed

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/chat/helpers/resolve-provider-call-options.ts`

**Stan wyjściowy:** Po C1.3 — `OVERRIDE_KEYS` rozszerzony o `topP`, `stop`, `frequencyPenalty`, `presencePenalty`, `seed`, `topK`, `responseFormat`.

**Akcja:** Rozszerz logikę o `frequencyPenalty`, `presencePenalty`, `seed` (analogicznie do C1.3):

```typescript
// Fragment (kontynuacja C1.3):

export function resolveProviderCallOptions(
  policyParams: GatewayParamsConfig | undefined,
  bodyParams?: ChatParamsDto,
): ProviderCallOptions {
  const defaults = policyParams?.defaults ?? {};
  const allowOverrides = policyParams?.allowOverrides ?? [];
  const bounds = policyParams?.bounds ?? {};

  // Validation — istniejąca logika z C1.3 (dla wszystkich kluczy)

  let temperature = defaults.temperature;
  let maxOutputTokens = defaults.maxOutputTokens;
  let topP = defaults.topP;
  let stop = bodyParams?.stop;
  // 🆕 C2.3
  let frequencyPenalty = defaults.frequencyPenalty;
  let presencePenalty = defaults.presencePenalty;
  let seed = defaults.seed;

  // Overrides z bodyParams (gdy dozwolone) — istniejąca logika
  if (bodyParams?.temperature !== undefined) {
    temperature = bodyParams.temperature;
  }
  if (bodyParams?.maxOutputTokens !== undefined) {
    maxOutputTokens = bodyParams.maxOutputTokens;
  }
  if (bodyParams?.topP !== undefined) {
    topP = bodyParams.topP;
  }
  // 🆕 C2.3
  if (bodyParams?.frequencyPenalty !== undefined) {
    frequencyPenalty = bodyParams.frequencyPenalty;
  }
  if (bodyParams?.presencePenalty !== undefined) {
    presencePenalty = bodyParams.presencePenalty;
  }
  if (bodyParams?.seed !== undefined) {
    seed = bodyParams.seed;
  }

  // Clamp bounds — istniejąca logika z C1.3
  if (temperature !== undefined && bounds.temperature) {
    temperature = clamp(temperature, bounds.temperature.min, bounds.temperature.max);
  }
  if (maxOutputTokens !== undefined && bounds.maxOutputTokens) {
    maxOutputTokens = clamp(maxOutputTokens, bounds.maxOutputTokens.min, bounds.maxOutputTokens.max);
  }
  if (topP !== undefined && bounds.topP) {
    topP = clamp(topP, bounds.topP.min, bounds.topP.max);
  }
  // 🆕 C2.3
  if (frequencyPenalty !== undefined && bounds.frequencyPenalty) {
    frequencyPenalty = clamp(frequencyPenalty, bounds.frequencyPenalty.min, bounds.frequencyPenalty.max);
  }
  if (presencePenalty !== undefined && bounds.presencePenalty) {
    presencePenalty = clamp(presencePenalty, bounds.presencePenalty.min, bounds.presencePenalty.max);
  }
  // seed nie ma bounds (integer, provider waliduje)

  return {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    ...(topP !== undefined ? { topP } : {}),
    ...(stop !== undefined ? { stop } : {}),
    ...(frequencyPenalty !== undefined ? { frequencyPenalty } : {}),
    ...(presencePenalty !== undefined ? { presencePenalty } : {}),
    ...(seed !== undefined ? { seed } : {}),
  };
}
```

**⚠️ Uwaga:** Ten krok rozszerza C1.3 — duża duplikacja kodu. Rozważ refactoring na generyczną funkcję w przyszłości (redukcja 100+ linii do ~30 linii).

**Weryfikacja:**
- Test jednostkowy `resolve-provider-call-options.spec.ts` — przypadki analogiczne do C1.3:
  - `frequencyPenalty` w bodyParams + allowOverrides → success
  - `frequencyPenalty` bez allowOverrides → 400 `MODEL_NOT_ALLOWED`
  - `frequencyPenalty` poza bounds → clamped
  - `seed` passthrough (bez bounds)

**Commit:** `feat(chat): support penalties and seed in resolveProviderCallOptions`

---

### Krok C2.4: Provider interface — rozszerz `ProviderCallOptions`

**Status:** ✅ **WYKONANY 2026-06-10**

**Plik:** `src/providers/interfaces/ai-provider.interface.ts`

**Akcja:**

```typescript
export interface ProviderCallOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  stop?: string | string[];
  // 🆕 C2.4
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
}
```

**Commit:** `feat(providers): add penalties and seed to ProviderCallOptions`

---

### Krok C2.5: Fabryki providerów — mapowanie (tylko te co wspierają)

**Status:** ✅ **WYKONANY 2026-06-10** — Google przekazuje `seed` do SDK; Anthropic celowo ignoruje penalties/seed (API N/A); `create-openai-provider.ts` poza zakresem MVP (post-MVP).

**Prerequisite:** C2.3 (`resolveProviderCallOptions` zwraca `frequencyPenalty`, `presencePenalty`, `seed`).

**Tabela wsparcia vendor API:**

| `ProviderCallOptions` | Anthropic SDK | Google Gemini (`GenerationConfig`) | OpenAI SDK (przyszły adapter) |
|----------------------|---------------|--------------------------------------|-------------------------------|
| `frequencyPenalty` | ❌ brak | ❌ brak | ✅ `frequency_penalty` |
| `presencePenalty` | ❌ brak | ❌ brak | ✅ `presence_penalty` |
| `seed` | ❌ brak | ✅ `seed` | ✅ `seed` |

---

#### Plik 1: `src/providers/factories/create-anthropic-provider.ts` — **BEZ ZMIAN (celowe)**

Anthropic Messages API **nie ma** odpowiedników penalties/seed. Gateway akceptuje te pola w `params` (walidacja YAML), ale adapter **nie przekazuje** ich do SDK — to oczekiwane zachowanie, nie bug.

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { LoggingService } from 'src/logging/logging.service';
import {
  mapAnthropicSdkError,
  toHttpException,
} from '../../common/errors/provider-error.mapper';
import {
  AIProvider,
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
  StreamResult,
} from '../interfaces/ai-provider.interface';
import {
  mapToolChoiceToAnthropic,
  mapToolsToAnthropic,
  mapTurnsToAnthropicMessages,
  parseAnthropicResponseWithTools,
} from '../anthropic/anthropic-tools.mapper';

function mapStopSequences(
  stop: ProviderCallOptions['stop'],
): string[] | undefined {
  if (stop === undefined) return undefined;
  return Array.isArray(stop) ? stop : [stop];
}

// CHANGE C2.5 (opcjonalnie): pomocniczy log gdy klient wysyła parametry nieobsługiwane przez Anthropic
function logUnsupportedAnthropicOptions(
  logger: ReturnType<LoggingService['child']>,
  options?: ProviderCallOptions,
): void {
  const unsupported: string[] = [];
  if (options?.frequencyPenalty !== undefined) {
    unsupported.push('frequencyPenalty');
  }
  if (options?.presencePenalty !== undefined) {
    unsupported.push('presencePenalty');
  }
  if (options?.seed !== undefined) {
    unsupported.push('seed');
  }
  if (unsupported.length > 0) {
    logger.debug('Ignoring unsupported ProviderCallOptions for Anthropic', {
      unsupported,
    });
  }
}

export function createAnthropicProvider(
  apiKey: string,
  loggingService: LoggingService,
): AIProvider {
  if (!apiKey) {
    throw new Error('[createAnthropicProvider] API key is required.');
  }

  const client = new Anthropic({ apiKey });
  const logger = loggingService.child({ module: 'AnthropicProvider' });

  logger.info('Anthropic provider instance created.');

  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      // CHANGE C2.5 (opcjonalnie): wywołać przed buildem params
      // logUnsupportedAnthropicOptions(logger, options);

      logger.debug('Calling model', {
        model: modelId,
      });

      try {
        const baseParams = {
          model: modelId,
          max_tokens: options?.maxOutputTokens ?? 1024,
          temperature: options?.temperature ?? undefined,
          top_p: options?.topP,
          stop_sequences: mapStopSequences(options?.stop),
          // BEZ ZMIAN C2.5: frequencyPenalty, presencePenalty, seed — celowo pominięte (Anthropic N/A)
          system: input.system,
          messages: mapTurnsToAnthropicMessages(input.messages),
        };
        if (input.tools?.length) {
          const params = {
            ...baseParams,
            tools: mapToolsToAnthropic(input.tools),
            tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
          };
          const response = await client.messages.create(params);
          return parseAnthropicResponseWithTools(response);
        }

        const response = await client.messages.create(baseParams);

        let text = '';

        for (const content of response.content) {
          if (content.type === 'text') text += content.text;
        }

        return {
          text,
          model: response.model,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      } catch (error) {
        logger.warn('Error completing', {
          message: error instanceof Error ? error.message : String(error),
          model: modelId,
        });
        throw toHttpException(mapAnthropicSdkError(error));
      }
    },

    stream(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): StreamResult {
      let streamObject: ReturnType<typeof client.messages.stream> | undefined;

      async function* textStream(): AsyncIterable<string> {
        try {
          // CHANGE C2.5 (opcjonalnie): wywołać przed buildem streamParams
          // logUnsupportedAnthropicOptions(logger, options);

          logger.debug('Streaming', { model: modelId });

          const streamParams = {
            model: modelId,
            max_tokens: options?.maxOutputTokens ?? 1024,
            temperature: options?.temperature ?? undefined,
            top_p: options?.topP,
            stop_sequences: mapStopSequences(options?.stop),
            // BEZ ZMIAN C2.5: frequencyPenalty, presencePenalty, seed — celowo pominięte
            system: input.system,
            messages: mapTurnsToAnthropicMessages(input.messages),
            stream: true as const,
            ...(input.tools?.length && {
              tools: mapToolsToAnthropic(input.tools),
              tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
            }),
          };

          streamObject = client.messages.stream(streamParams);

          for await (const event of streamObject) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              yield event.delta.text;
            }
          }
        } catch (error) {
          logger.warn('Error streaming', {
            message: error instanceof Error ? error.message : String(error),
            model: modelId,
          });
          throw toHttpException(mapAnthropicSdkError(error));
        }
      }

      async function getUsageMetadata() {
        if (!streamObject) return undefined;

        try {
          const finalMessage = await streamObject.finalMessage();
          return {
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            model: finalMessage.model,
          };
        } catch (error) {
          logger.warn('Error getting stream usage metadata', {
            message: error instanceof Error ? error.message : String(error),
          });
          return undefined;
        }
      }

      async function getFinalToolCalls() {
        if (!streamObject) return undefined;
        const finalMessage = await streamObject.finalMessage();
        return parseAnthropicResponseWithTools(finalMessage).toolCalls;
      }

      async function getStopReason() {
        if (!streamObject) return undefined;
        const finalMessage = await streamObject.finalMessage();
        const mapped = parseAnthropicResponseWithTools(finalMessage);
        return mapped.stopReason;
      }

      return {
        textStream: textStream(),
        getUsageMetadata: getUsageMetadata,
        getFinalToolCalls: getFinalToolCalls,
        getStopReason: getStopReason,
      };
    },
  };
}
```

**Weryfikacja:**
- Test jednostkowy `create-anthropic-provider.spec.ts`:
  - `complete` z `frequencyPenalty: 0.5, seed: 42` → SDK **nie** dostaje tych pól (mock `messages.create` args)
  - `complete` z samym `topP` → bez regresji (C1.5)

**Commit:** `feat(anthropic): document intentional ignore of penalties and seed` (gdy dodany opcjonalny log) lub brak commitu (zero diff)

---

#### Plik 2: `src/providers/factories/create-google-provider.ts` — **wymaga 1 zmiany (`seed`)**

Google Gemini wspiera `seed` w `GenerationConfig`. Penalties — N/A.

```typescript
import { GoogleGenAI } from '@google/genai';
import { LoggingService } from 'src/logging/logging.service';
import {
  mapGoogleGenAiError,
  toHttpException,
} from '../../common/errors/provider-error.mapper';
import {
  AIProvider,
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
  StreamResult,
} from '../interfaces/ai-provider.interface';
import {
  mapToolsToGemini,
  mapToolChoiceToGemini,
  mapTurnsToGeminiContents,
  parseGeminiResponseWithTools,
} from '../google/google-tools.mapper';

function mapStopSequences(
  stop: ProviderCallOptions['stop'],
): string[] | undefined {
  if (stop === undefined) return undefined;
  return Array.isArray(stop) ? stop : [stop];
}

function buildGenerationConfig(options?: ProviderCallOptions) {
  return {
    temperature: options?.temperature ?? undefined,
    maxOutputTokens: options?.maxOutputTokens ?? 1024,
    topP: options?.topP,
    stopSequences: mapStopSequences(options?.stop),
    // CHANGE C2.5: dodać seed — Google Gemini wspiera deterministyczny sampling
    seed: options?.seed,
    // BEZ ZMIAN C2.5: frequencyPenalty, presencePenalty — celowo pominięte (Google N/A)
  };
}

export function createGoogleProvider(
  apiKey: string,
  loggingService: LoggingService,
): AIProvider {
  if (!apiKey) {
    throw new Error('[createGoogleProvider] API key is required.');
  }

  const client = new GoogleGenAI({ apiKey });
  const logger = loggingService.child({ module: 'GoogleProvider' });

  logger.info('Google provider instance created.');

  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      logger.debug('Calling model', {
        model: modelId,
        messagesCount: input.messages.length,
      });

      try {
        if (input.tools?.length) {
          const toolChoiceConfig = mapToolChoiceToGemini(input.toolChoice);
          const response = await client.models.generateContent({
            model: modelId,
            contents: mapTurnsToGeminiContents(input.messages),
            config: {
              ...(input.system?.trim()
                ? { systemInstruction: input.system }
                : {}),
              ...buildGenerationConfig(options),
              tools: [{ functionDeclarations: mapToolsToGemini(input.tools) }],
              ...(toolChoiceConfig && {
                toolConfig: { functionCallingConfig: toolChoiceConfig },
              }),
            },
          });
          return parseGeminiResponseWithTools(response, modelId);
        }

        const response = await client.models.generateContent({
          model: modelId,
          contents: mapTurnsToGeminiContents(input.messages),
          config: {
            ...(input.system?.trim()
              ? { systemInstruction: input.system }
              : {}),
            ...buildGenerationConfig(options),
          },
        });

        return {
          text: response.text ?? '',
          model: response.modelVersion ?? modelId,
          usage: response.usageMetadata
            ? {
                inputTokens: response.usageMetadata.promptTokenCount ?? 0,
                outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
              }
            : undefined,
        };
      } catch (error) {
        logger.warn('Error completing', {
          message: error instanceof Error ? error.message : String(error),
          model: modelId,
        });
        throw toHttpException(mapGoogleGenAiError(error));
      }
    },

    stream(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): StreamResult {
      let lastChunk: Awaited<
        ReturnType<typeof client.models.generateContentStream>
      > extends AsyncIterable<infer T>
        ? T
        : never;

      async function* textStream(): AsyncIterable<string> {
        try {
          logger.debug('Streaming', {
            model: modelId,
            messagesCount: input.messages.length,
          });

          const toolChoiceConfig = input.tools?.length
            ? mapToolChoiceToGemini(input.toolChoice)
            : undefined;

          const stream = await client.models.generateContentStream({
            model: modelId,
            contents: mapTurnsToGeminiContents(input.messages),
            config: {
              ...(input.system?.trim()
                ? { systemInstruction: input.system }
                : {}),
              ...buildGenerationConfig(options),
              ...(input.tools?.length && {
                tools: [
                  { functionDeclarations: mapToolsToGemini(input.tools) },
                ],
                ...(toolChoiceConfig && {
                  toolConfig: { functionCallingConfig: toolChoiceConfig },
                }),
              }),
            },
          });

          for await (const event of stream) {
            lastChunk = event;
            if (event.text) {
              yield event.text;
            }
          }
        } catch (error) {
          logger.warn('Error streaming', {
            message: error instanceof Error ? error.message : String(error),
            model: modelId,
          });
          throw toHttpException(mapGoogleGenAiError(error));
        }
      }
      async function getUsageMetadata() {
        if (!lastChunk) return undefined;

        const metadata = lastChunk.usageMetadata;
        if (!metadata) return undefined;

        return {
          inputTokens: metadata.promptTokenCount ?? 0,
          outputTokens: metadata.candidatesTokenCount ?? 0,
          model: lastChunk.modelVersion ?? modelId,
        };
      }

      async function getFinalToolCalls() {
        if (!lastChunk) return undefined;
        const parsed = parseGeminiResponseWithTools(lastChunk, modelId);
        return parsed.toolCalls;
      }

      async function getStopReason() {
        if (!lastChunk) return undefined;
        const parsed = parseGeminiResponseWithTools(lastChunk, modelId);
        return parsed.stopReason;
      }

      return {
        textStream: textStream(),
        getUsageMetadata,
        getFinalToolCalls,
        getStopReason,
      };
    },
  };
}
```

**Weryfikacja:**
- Test jednostkowy `create-google-provider.spec.ts`:
  - `complete` z `seed: 42` → `generateContent` config zawiera `seed: 42`
  - `complete` z `frequencyPenalty: 0.5` → config **nie** zawiera penalties

**Commit:** `feat(google): pass seed to Gemini generationConfig`

---

#### Plik 3: `src/providers/factories/create-openai-provider.ts` — **TODO post-MVP (plik nie istnieje)**

Gdy powstanie adapter OpenAI w warstwie providerów (obecnie fasada OpenAI kieruje do `ChatService` → registry → Anthropic/Google), przekaż wszystkie 3 pola:

```typescript
// NOWY PLIK — szkielet na przyszłość (CHANGE C2.5: utworzyć gdy providerInstance: openai)
import OpenAI from 'openai';
import { LoggingService } from 'src/logging/logging.service';
import type {
  AIProvider,
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
} from '../interfaces/ai-provider.interface';

function buildOpenAiCreateParams(
  input: ProviderChatInput,
  modelId: string,
  options?: ProviderCallOptions,
): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
  return {
    model: modelId,
    messages: [], // mapTurnsToOpenAiMessages(input.messages) — poza zakresem C2
    temperature: options?.temperature,
    max_tokens: options?.maxOutputTokens,
    top_p: options?.topP,
    stop: options?.stop,
    // CHANGE C2.5: penalties + seed — OpenAI natywnie wspiera wszystkie trzy
    frequency_penalty: options?.frequencyPenalty,
    presence_penalty: options?.presencePenalty,
    seed: options?.seed,
  };
}

export function createOpenAiProvider(
  apiKey: string,
  loggingService: LoggingService,
): AIProvider {
  const client = new OpenAI({ apiKey });
  const logger = loggingService.child({ module: 'OpenAiProvider' });

  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      logger.debug('Calling model', { model: modelId });
      const params = buildOpenAiCreateParams(input, modelId, options);
      const response = await client.chat.completions.create(params);
      // parseOpenAiResponse(response) — poza zakresem C2
      return { text: response.choices[0]?.message?.content ?? '' };
    },
  };
}
```

**Commit:** (przyszłość) `feat(openai): add provider factory with penalties and seed support`

---

### Krok C2.6: Fasada OpenAI — DTO seed (penalties już istnieją)

**Status:** ✅ **WYKONANY 2026-06-10** — walidacja `seed` (`@Type`, `@IsInt`, `@Min`/`@Max`) i penalties (`@Type`, `@IsNumber`, `@Min`/`@Max`) doprecyzowana w DTO; spójność z `ChatParamsDto`.

**Plik:** `src/integrations/openai/dtos/openai-chat-completion-request.dto.ts`

**Stan wyjściowy:** DTO zawiera `presence_penalty`, `frequency_penalty` (linie 114–125) oraz `seed` (127–134). Mapowanie w C1.8/C2.7 **już działa**.

**Akcja:** Doprecyzować walidację DTO (spójność z `ChatParamsDto`):

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { OpenAiChatMessageDto } from './openai-chat-message.dto';
import { IsStringOrArrayOfStrings } from 'src/common/validators/is-string-or-array-of-strings.validator';

const MAX_MESSAGES = 15000;

export class OpenAiStreamOptionsDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Include usage in the final stream chunk.',
  })
  @IsOptional()
  @IsBoolean()
  include_usage?: boolean;
}

export class OpenAiChatCompletionRequestDto {
  @ApiProperty({ example: 'chat-default' })
  @IsString()
  model: string;

  @ApiProperty({ type: [OpenAiChatMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => OpenAiChatMessageDto)
  messages: OpenAiChatMessageDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  max_tokens?: number;

  @ApiPropertyOptional({ description: 'Include usage in non-stream respose.' })
  @IsOptional()
  include_usage?: boolean;

  @ApiPropertyOptional({
    type: 'array',
    description:
      'OpenAI tools array. Requires capabilities.tools on model alias.',
  })
  @IsOptional()
  tools?: unknown[];

  @ApiPropertyOptional({
    description:
      'Tool choice: "auto" | "none" | "required" | { type: "function"; function: { name: string } }',
  })
  @IsOptional()
  tool_choice?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenAiStreamOptionsDto)
  stream_options?: OpenAiStreamOptionsDto;

  @ApiPropertyOptional()
  @IsOptional()
  user?: string;

  @ApiPropertyOptional()
  @IsOptional()
  parallel_tool_calls?: boolean;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1,
    example: 0.95,
    description: 'Nucleus sampling parameter.',
  })
  @IsOptional()
  top_p?: number;

  @ApiPropertyOptional({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'Stop sequences where generation should stop.',
    example: ['\n\n', '###'],
  })
  @IsOptional()
  @IsStringOrArrayOfStrings()
  stop?: string | string[];

  @ApiPropertyOptional({
    minimum: -2.0,
    maximum: 2.0,
    example: 0.5,
    description: 'Penalize new tokens based on their presence',
  })
  @IsOptional()
  // CHANGE C2.6: doprecyzować walidację (obecnie brak @Type/@Min/@Max)
  @Type(() => Number)
  @IsNumber()
  @Min(-2)
  @Max(2)
  presence_penalty?: number;

  @ApiPropertyOptional({
    minimum: -2.0,
    maximum: 2.0,
    example: 0.5,
    description: 'Penalize new tokens based on their frequency',
  })
  @IsOptional()
  // CHANGE C2.6: doprecyzować walidację (obecnie brak @Type/@Min/@Max)
  @Type(() => Number)
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequency_penalty?: number;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 2 ** 32 - 1,
    example: 42,
    description: 'Seed for deterministic sampling.',
  })
  @IsOptional()
  // CHANGE C2.6: pole już istnieje — dodać transformację i walidację integer
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** 32 - 1)
  seed?: number;
}
```

**Weryfikacja:**
- `forbidNonWhitelisted: true` — `seed`, penalties już na whitelist (bez regresji)
- Postman: `{ "seed": "42" }` → po `@Type` + `@IsInt` poprawnie parsowane; `{ "seed": 1.5 }` → 400

**Commit:** `feat(openai): tighten seed and penalties validation in request DTO`

**Dokumentacja:** `docs/integracja-openai-kontrakt.md` — potwierdzić że `frequency_penalty`, `presence_penalty`, `seed` są przyjmowane i mapowane na `params.*` gateway (propagacja do providera zależy od C2.5).

---

### Krok C2.7: Fasada OpenAI — mapper request (POŁĄCZONY z C1.8)

**Status:** ✅ **WYKONANY 2026-06-10** — pełne mapowanie `top_p`, `stop`, `frequency_penalty`, `presence_penalty`, `seed` już w kodzie.

**⚠️ KROK POŁĄCZONY z C1.8:** Wszystkie parametry generacji mapowane w jednym bloku `dto.params`.

**Plik:** `src/integrations/openai/mappers/openai-request.mapper.ts`

**Akcja:** **BEZ ZMIAN** — poniżej aktualny kod referencyjny (audit potwierdza implementację):

```typescript
import { mapOpenAiMessagesToGateway } from './openai-messages.mapper';
import {
  mapOpenAiToolChoice,
  mapOpenAiToolsToGateway,
} from './openai-tools.mapper';
import type { ChatRequestDto } from 'src/chat/dto/chat-request.dto';
import type { OpenAiChatCompletionRequestDto } from '../dtos/openai-chat-completion-request.dto';

export function mapOpenAiChatRequestToGateway(
  body: OpenAiChatCompletionRequestDto,
): ChatRequestDto {
  const messages = mapOpenAiMessagesToGateway(body.messages);

  const dto: ChatRequestDto = {
    modelAlias: body.model,
    messages,
  };

  if (
    body.temperature !== undefined ||
    body.max_tokens !== undefined ||
    body.top_p !== undefined ||
    body.stop !== undefined ||
    body.frequency_penalty !== undefined ||
    body.presence_penalty !== undefined ||
    body.seed !== undefined
  ) {
    dto.params = {};

    if (body.temperature !== undefined) {
      dto.params.temperature = body.temperature;
    }
    if (body.max_tokens !== undefined) {
      dto.params.maxOutputTokens = body.max_tokens;
    }

    if (body.top_p !== undefined) {
      dto.params.topP = body.top_p;
    }

    if (body.stop !== undefined) {
      dto.params.stop = body.stop;
    }

    if (body.frequency_penalty !== undefined) {
      dto.params.frequencyPenalty = body.frequency_penalty;
    }

    if (body.presence_penalty !== undefined) {
      dto.params.presencePenalty = body.presence_penalty;
    }

    if (body.seed !== undefined) {
      dto.params.seed = body.seed;
    }
  }

  const definitions = body.tools?.length
    ? mapOpenAiToolsToGateway(body.tools)
    : undefined;
  const toolChoice = mapOpenAiToolChoice(body.tool_choice);

  if (definitions?.length || toolChoice !== undefined) {
    dto.tooling = {
      ...(definitions?.length && { definitions }),
      ...(toolChoice !== undefined && { toolChoice }),
    };
  }
  return dto;
}
```

**Weryfikacja:**
- Test jednostkowy `openai-request.mapper.spec.ts`:
  - Input: `{ frequency_penalty: 0.5, seed: 42 }` → `params: { frequencyPenalty: 0.5, seed: 42 }`
  - Input: `{ top_p: 0.95, stop: ["###"], presence_penalty: -1 }` → pełny merge bez utraty pól

**Commit:** (już w C1.8) `feat(openai): map top_p, stop, penalties, seed to gateway params`

---

### Krok C2.8: Fasada Anthropic — DTO + mapper (dokumentacja limitations)

**Status:** ✅ **WYKONANY 2026-06-10** — kod fasady Anthropic **celowo** nie mapuje penalties/seed (Anthropic API ich nie ma); `docs/integracja-anthropic-messages.md` zaktualizowany. Gateway native `/api/v1/chat` akceptuje `params.frequencyPenalty` / `seed` gdy alias ma je w `allowOverrides` — adapter Anthropic je zignoruje (C2.5).

**Anthropic nie wspiera penalties/seed** — **nie dodawać** do `AnthropicMessagesRequestDto` (klient Anthropic nie wysyła tych pól w Messages API).

---

#### Plik 1: `src/integrations/anthropic/dtos/anthropic-messages-request.dto.ts` — **BEZ ZMIAN**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AnthropicMessageDto } from './anthropic-message.dto';

const MAX_MESSAGES = 15000;
const SYSTEM_MAX = 128_000;

export class AnthropicMessagesRequestDto {
  @ApiProperty({ example: 'chat-default' })
  @IsString()
  model: string;

  @ApiProperty({ type: [AnthropicMessageDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => AnthropicMessageDto)
  messages: AnthropicMessageDto[];

  @ApiPropertyOptional({ maxLength: SYSTEM_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(SYSTEM_MAX)
  system?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  max_tokens?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    type: 'array',
    description:
      'Anthropic tools array. Requires capabilities.tools on model alias.',
  })
  @IsOptional()
  tools?: unknown[];

  @ApiPropertyOptional({
    description: 'Tool choice per Anthropic API (auto, any, tool, ...).',
  })
  @IsOptional()
  tool_choice?: unknown;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  top_p?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop_sequences?: string[];

  // BEZ ZMIAN C2.8: brak frequency_penalty, presence_penalty, seed — Anthropic Messages API N/A
}
```

---

#### Plik 2: `src/integrations/anthropic/mappers/anthropic-request.mapper.ts` — **BEZ ZMIAN**

```typescript
import { BadRequestException } from '@nestjs/common';
import { ApiErrorCode } from 'src/common/errors/api-error.code';
import {
  mapAnthropicContentBlockToGateway,
  mapAnthropicToolChoice,
  mapAnthropicToolsToGateway,
} from './anthropic-tools.mapper';
import type { ChatRequestDto } from 'src/chat/dto/chat-request.dto';
import type { ChatMessageDto } from 'src/chat/dto/chat-message.dto';
import type { AnthropicMessagesRequestDto } from '../dtos/anthropic-messages-request.dto';

export function mapAnthropicRequestToGateway(
  body: AnthropicMessagesRequestDto,
): ChatRequestDto {
  const gatewayMessages: ChatMessageDto[] = [];

  for (const message of body.messages) {
    const mapped = mapAnthropicContentBlockToGateway(
      message.role,
      message.content,
    );
    gatewayMessages.push(...mapped);
  }

  if (gatewayMessages.length === 0) {
    throw new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message: 'At least one message is required.',
      details: [],
    });
  }

  const dto: ChatRequestDto = {
    modelAlias: body.model,
    messages: gatewayMessages,
  };

  if (
    body.temperature !== undefined ||
    body.max_tokens !== undefined ||
    body.top_p !== undefined ||
    body.stop_sequences !== undefined
  ) {
    dto.params = {};
    if (body.temperature !== undefined) {
      dto.params.temperature = body.temperature;
    }
    if (body.max_tokens !== undefined) {
      dto.params.maxOutputTokens = body.max_tokens;
    }
    if (body.top_p !== undefined) {
      dto.params.topP = body.top_p;
    }
    if (body.stop_sequences !== undefined) {
      dto.params.stop = body.stop_sequences;
    }
    // BEZ ZMIAN C2.8: brak mapowania frequencyPenalty, presencePenalty, seed
  }

  const definitions = body.tools?.length
    ? mapAnthropicToolsToGateway(body.tools)
    : undefined;
  const toolChoice = mapAnthropicToolChoice(body.tool_choice);

  if (definitions?.length || toolChoice !== undefined) {
    dto.tooling = {
      ...(definitions?.length && { definitions }),
      ...(toolChoice !== undefined && { toolChoice }),
    };
  }
  return dto;
}
```

**Uwaga cross-fasada:** Klient OpenAI może wysłać `frequency_penalty` / `seed` → mapper OpenAI (C2.7) → `ChatParamsDto` → `resolveProviderCallOptions` → adapter Anthropic **ignoruje** (C2.5). To oczekiwane — nie mapować tych pól w fasadzie Anthropic.

---

#### Plik 3: `docs/integracja-anthropic-messages.md` — **CHANGE C2.8: rozszerzyć tabelę różnic**

W sekcji **„Różnice względem pełnego kontraktu Anthropic API"** dopisać wiersze:

```markdown
| `frequency_penalty`, `presence_penalty`, `seed` | OpenAI-compat w innych klientach | **N/A** — brak w Messages API; gateway native `/chat` może je przyjąć, adapter Anthropic ignoruje |
| `top_p`, `stop_sequences` | Obsługiwane oficjalnie | Mapowane na `params.topP` / `params.stop` (C1.9–C1.10) |
```

W sekcji **„Parametry żądania (MVP)"** dopisać:

```markdown
| `top_p` | Opcjonalnie (0–1), mapowane na `params.topP` |
| `stop_sequences` | Opcjonalnie (tablica stringów), mapowane na `params.stop` |
```

**Weryfikacja:**
- Fasada Anthropic: request z `frequency_penalty` w body → **400** (`forbidNonWhitelisted`) — poprawne (pole nie w DTO)
- Gateway native: `POST /api/v1/chat` z `params.seed` na aliasie `chat-default` (Anthropic) → 200, seed zignorowany przez adapter

**Commit:** `docs(anthropic): document lack of penalties and seed in Messages facade`

---

## ✅ FAZA C3: Response format (JSON mode) — 3-4h

> **📝 AKTUALIZACJA PLANU (2026-06-12):** Wszystkie kroki **C3.1–C3.10** (w tym **C3.6** Anthropic provider i **C3.10** Anthropic fasada) zostały wykonane — używamy **natywnego `output_config.format`** zgodnie z oficjalnym Anthropic Messages API (https://platform.claude.com/docs/en/build-with-claude/structured-outputs). **Faza C3 zakończona**.

**Cel:** Dodać `responseFormat` w params → JSON mode (wszystkie providery używają natywnych mechanizmów: OpenAI `response_format`, Anthropic `output_config.format`, Google `responseMimeType`).

**Prerequisite:** Faza C1 zakończona (params validation).

**Milestone C3:** Request z `params.responseFormat: { type: 'json_object' }` → model generuje JSON (wszystkie providery używają natywnych mechanizmów: OpenAI `response_format`, Anthropic `output_config.format`, Google `responseMimeType`).

---

### Krok C3.1: DTO gateway — ResponseFormatDto

**Status:** ✅ **WYKONANY 2026-06-11**

**Plik:** `src/chat/dto/response-format.dto.ts` **(NOWY)**

**Akcja:**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional } from 'class-validator';

export class ResponseFormatDto {
  @ApiProperty({
    enum: ['text', 'json_object'],
    description:
      'Response format type. "json_object" enables JSON mode (model outputs valid JSON).',
    example: 'json_object',
  })
  @IsIn(['text', 'json_object'])
  type: 'text' | 'json_object';

  @ApiPropertyOptional({
    description:
      'JSON schema for structured outputs (when type=json_object). Currently experimental, OpenAI only.',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  jsonSchema?: Record<string, unknown>;
}
```

**Commit:** `feat(chat): add ResponseFormatDto`

---

### Krok C3.2: ChatParamsDto — pole responseFormat

**Status:** ✅ **WYKONANY 2026-06-11**

**Plik:** `src/chat/dto/chat-params.dto.ts`

**Akcja:**

```typescript
import { ResponseFormatDto } from './response-format.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class ChatParamsDto {
  // ✅ Istniejące ...

  // 🆕 C3.2
  @ApiPropertyOptional({
    type: ResponseFormatDto,
    description:
      'Desired response format. Use { type: "json_object" } for JSON mode.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResponseFormatDto)
  responseFormat?: ResponseFormatDto;
}
```

**Weryfikacja:**
- Postman: `{ "params": { "responseFormat": { "type": "json_object" } } }` → 200

**Commit:** `feat(chat): add responseFormat to ChatParamsDto`

---

### Krok C3.3: Config YAML — allowOverrides responseFormat

**Status:** ✅ **WYKONANY 2026-06-11**

**Plik:** `gateway.config.yaml`

**Akcja:**

```yaml
models:
  chat-default:
    policy:
      params:
        # defaults nie ma responseFormat (brak sensownego default)
        allowOverrides:
          # ... istniejące ...
          # 🆕 C3.3
          - responseFormat
        # bounds nie ma responseFormat (enum, nie numeric)
```

**Commit:** `feat(config): allow responseFormat override in policy.params`

---

### Krok C3.4: Helper `resolveProviderCallOptions` — passthrough responseFormat

**Status:** ✅ **WYKONANY 2026-06-11**

**Plik:** `src/chat/helpers/resolve-provider-call-options.ts`

**Stan wyjściowy:** Po C2.3 — `OVERRIDE_KEYS` zawiera już `responseFormat`.

**Akcja:** Passthrough `responseFormat` (bez defaults, bez bounds — enum validation w DTO):

```typescript
// Fragment (kontynuacja C2.3):

export function resolveProviderCallOptions(
  policyParams: GatewayParamsConfig | undefined,
  bodyParams?: ChatParamsDto,
): ProviderCallOptions {
  // ... istniejąca logika validation, defaults, overrides, clamp bounds ...

  // 🆕 C3.4: responseFormat (passthrough, validation w allowOverrides wystarczy)
  let responseFormat = bodyParams?.responseFormat;

  return {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    ...(topP !== undefined ? { topP } : {}),
    ...(stop !== undefined ? { stop } : {}),
    ...(frequencyPenalty !== undefined ? { frequencyPenalty } : {}),
    ...(presencePenalty !== undefined ? { presencePenalty } : {}),
    ...(seed !== undefined ? { seed } : {}),
    // 🆕 C3.4
    ...(responseFormat !== undefined ? { responseFormat } : {}),
  };
}
```

**Uwaga:** `responseFormat` nie ma bounds (enum `type` + opcjonalnie `jsonSchema`) ani defaults (brak sensownego default). Walidowana przez `allowOverrides` i DTO (`@IsIn(['text', 'json_object'])`).

**Weryfikacja:**
- Test jednostkowy:
  - `responseFormat` w bodyParams + allowOverrides → success (passthrough)
  - `responseFormat` bez allowOverrides → 400 `MODEL_NOT_ALLOWED`

**Commit:** `feat(chat): support responseFormat in resolveProviderCallOptions`

---

### Krok C3.5: Provider interface — rozszerz `ProviderCallOptions`

**Status:** ✅ **WYKONANY 2026-06-11**

**Plik:** `src/providers/interfaces/ai-provider.interface.ts`

**Akcja:**

```typescript
export interface ProviderCallOptions {
  // ... istniejące ...
  // 🆕 C3.5
  responseFormat?: { type: 'text' | 'json_object'; jsonSchema?: Record<string, unknown> };
}
```

**Commit:** `feat(providers): add responseFormat to ProviderCallOptions`

---

### Krok C3.6: Anthropic provider — natywny output_config

**Status:** ✅ **WYKONANY 2026-06-11**

**Plik:** `src/providers/factories/create-anthropic-provider.ts`

**Akcja:** W `complete` i `stream` wewnątrz fabryki — gdy `options?.responseFormat?.type === 'json_object'`, użyj **natywnego `output_config`**:

```typescript
// Fragment w complete:
async complete(
  input: ProviderChatInput,
  modelId: string,
  options?: ProviderCallOptions,
): Promise<ProviderChatResponse> {
  try {
    const baseParams = {
      model: modelId,
      max_tokens: options?.maxOutputTokens ?? 1024,
      ...resolveAnthropicSamplingParams(options),
      stop_sequences: mapStopSequences(options?.stop),
      system: input.system, // 🆕 Bez modyfikacji system prompt (nie używamy fallback)
      messages: mapTurnsToAnthropicMessages(input.messages),
      // 🆕 C3.6: Natywny output_config.format (Anthropic oficjalne API)
      ...(options?.responseFormat?.type === 'json_object' && {
        output_config: {
          format: {
            type: 'json_schema' as const,
            schema: options.responseFormat.jsonSchema ?? {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      }),
    };
    
    if (input.tools?.length) {
      const params = {
        ...baseParams,
        tools: mapToolsToAnthropic(input.tools),
        tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
      };
      const response = await client.messages.create(params);
      return parseAnthropicResponseWithTools(response);
    }

    const response = await client.messages.create(baseParams);
    
    let text = '';
    for (const content of response.content) {
      if (content.type === 'text') text += content.text;
    }

    return {
      text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    logger.warn('Error completing', {
      message: error instanceof Error ? error.message : String(error),
      model: modelId,
    });
    throw toHttpException(mapAnthropicSdkError(error));
  }
}
```

**Analogicznie w `stream()`** — dodać `output_config` do `streamParams`:

```typescript
const streamParams = {
  model: modelId,
  max_tokens: options?.maxOutputTokens ?? 1024,
  ...resolveAnthropicSamplingParams(options),
  stop_sequences: mapStopSequences(options?.stop),
  system: input.system,
  messages: mapTurnsToAnthropicMessages(input.messages),
  stream: true as const,
  ...(input.tools?.length && {
    tools: mapToolsToAnthropic(input.tools),
    tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
  }),
  // 🆕 C3.6: Natywny output_config.format również dla stream
  ...(options?.responseFormat?.type === 'json_object' && {
    output_config: {
      format: {
        type: 'json_schema' as const,
        schema: options.responseFormat.jsonSchema ?? {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
  }),
};

streamObject = client.messages.stream(streamParams);
```

**⚠️ UWAGI KRYTYCZNE:**

1. **Natywne API:** Anthropic oficjalnie wspiera parametr `output_config.format` w `MessageCreateParamsBase` — zgodnie z https://platform.claude.com/docs/en/build-with-claude/structured-outputs.
2. **Usunięto fallback:** Nie modyfikujemy `system` prompt — używamy natywnego mechanizmu Anthropic.
3. **Type mapping:** Gateway `responseFormat.type: 'json_object'` → Anthropic `output_config.format.type: 'json_schema'` z **obowiązkowym** `schema`.
4. **JSON Schema fallback:** Gdy gateway NIE dostanie `responseFormat.jsonSchema`, używamy permissive schema `{ type: 'object', additionalProperties: true }` (wymagane przez oficjalne API).
5. **Brak temperatury wymuszania:** NIE ustawiamy `temperature: 0` — respektujemy wartość z `options?.temperature`.
6. **Conditional spread:** Używamy spread operatora `...()` — gdy `responseFormat` nie jest ustawiony, `output_config` nie jest dodawany do params.

**Weryfikacja:**

```typescript
// Test case 1: JSON mode ze schematem
const options1: ProviderCallOptions = {
  responseFormat: { 
    type: 'json_object',
    jsonSchema: { type: 'object', properties: { name: { type: 'string' } } },
  },
};
// SDK call powinien zawierać: 
// output_config: { format: { type: 'json_schema', schema: {...} } }

// Test case 2: JSON mode bez schematu (fallback)
const options2: ProviderCallOptions = {
  responseFormat: { type: 'json_object' },
};
// SDK call powinien zawierać:
// output_config: { format: { type: 'json_schema', schema: { type: 'object', additionalProperties: true } } }

// Test case 3: Brak responseFormat
const options3: ProviderCallOptions = { temperature: 0.7 };
// SDK call NIE powinien zawierać output_config
```

**Testy:**
- Mock SDK — weryfikacja że `client.messages.create()` jest wywoływany z `output_config` gdy `responseFormat` jest obecny
- Test e2e — request z `responseFormat: { type: 'json_object' }` → odpowiedź zawiera valid JSON

**Commit:** `feat(anthropic): use native output_config.format (official API shape)`

**Dokumentacja:** Aktualizacja w kroku C3.10d (fasada Anthropic).

---

### Krok C3.7: Google provider — natywny JSON mode

**Status:** ✅ **WYKONANY 2026-06-11**

**Plik:** `src/providers/factories/create-google-provider.ts`

**Akcja:** W `complete` i `stream` wewnątrz fabryki:

```typescript
// Pseudo-kod (fragment w complete):
const generationConfig: GenerationConfig = {
  temperature: options?.temperature,
  maxOutputTokens: options?.maxOutputTokens,
  topP: options?.topP,
  stopSequences: /* ... */,
  // 🆕 C3.7
  responseMimeType: options?.responseFormat?.type === 'json_object' ? 'application/json' : undefined,
};
```

**Uwaga:** Google Gemini wspiera `response_mime_type: 'application/json'` (natywny JSON mode).

**Commit:** `feat(google): support JSON mode via responseMimeType`

---

### Krok C3.8: Fasada OpenAI — DTO request response_format

**Status:** ✅ **WYKONANY 2026-06-11**

**Plik:** `src/integrations/openai/dtos/openai-chat-completion-request.dto.ts`

**Akcja:**

```typescript
export class OpenAiChatCompletionRequestDto {
  // ✅ Istniejące ...

  // 🆕 C3.8
  @ApiPropertyOptional({
    type: 'object',
    properties: {
      type: { enum: ['text', 'json_object'] },
    },
  })
  @IsOptional()
  @IsObject()
  response_format?: { type: 'text' | 'json_object' };
}
```

**Uwaga:** Uproszczony DTO (bez `jsonSchema` — to structured outputs beta, można dodać później).

**Commit:** `feat(openai): add response_format to request DTO`

---

### Krok C3.9: Fasada OpenAI — mapper request

**Status:** ✅ **WYKONANY 2026-06-11**

**Plik:** `src/integrations/openai/mappers/openai-request.mapper.ts`

**Akcja:**

```typescript
// Fragment w mapOpenAiChatRequestToGateway:
if (body.response_format !== undefined) {
  dto.params = dto.params ?? {};
  dto.params.responseFormat = {
    type: body.response_format.type,
  };
}
```

**Commit:** `feat(openai): map response_format to gateway params`

---

### Krok C3.10: Fasada Anthropic — DTO i mapper output_config

> **⚠️ UWAGA:** Ten krok opisuje implementację **natywnego `output_config`** Anthropic w fasadzie. Provider (**C3.6** ✅) już używa natywnego `output_config`.

**Status:** ✅ **WYKONANY 2026-06-12**

---

#### C3.10a: Fasada Anthropic — DTO request output_config

**Plik:** `src/integrations/anthropic/dtos/anthropic-messages-request.dto.ts`

**Akcja:**

```typescript
export class AnthropicMessagesRequestDto {
  // ✅ Istniejące pola: model, messages, system, stream, max_tokens, temperature, tools, tool_choice, top_p, stop_sequences

  // 🆕 C3.10a
  @ApiPropertyOptional({
    description:
      'Output format configuration for structured JSON outputs (Anthropic official API shape). ' +
      'Use format.type="json_schema" with required schema field. ' +
      'Gateway maps this to unified responseFormat internally. ' +
      'Example: { "format": { "type": "json_schema", "schema": {...} } }',
    type: 'object',
    properties: {
      format: {
        type: 'object',
        properties: {
          type: { enum: ['json_schema'] },
          schema: { type: 'object' },
        },
        required: ['type', 'schema'],
      },
    },
  })
  @IsOptional()
  @IsObject()
  output_config?: {
    format: {
      type: 'json_schema';
      schema: Record<string, unknown>;
    };
  };
}
```

**Uwagi:**

1. **Format Anthropic:** Fasada przyjmuje **oficjalny kształt** Anthropic Messages API: `output_config.format.type` (nie uproszczony `output_config.type`).
2. **Type:** Tylko `"json_schema"` jest wspierany (zgodnie z oficjalnym API). Brak `"text"` ani `"json"` bez schematu.
3. **Schema wymagane:** W oficjalnym API Anthropic, `schema` jest **obowiązkowe** przy `type: "json_schema"`.
4. **Mapowanie:** `output_config.format.type: "json_schema"` → gateway `responseFormat: { type: 'json_object' }`, `output_config.format.schema` → gateway `responseFormat.jsonSchema`.
5. **Backward compatibility:** Pole opcjonalne; requesty bez niego działają jak dotychczas.

**Commit:** `feat(anthropic): add output_config to request DTO (official API shape)`

---

#### C3.10b: Fasada Anthropic — mapper request

**Plik:** `src/integrations/anthropic/mappers/anthropic-request.mapper.ts`

**Akcja:**

```typescript
// Fragment w mapAnthropicRequestToGateway (po mapowaniu params):

if (
  body.temperature !== undefined ||
  body.max_tokens !== undefined ||
  body.top_p !== undefined ||
  body.stop_sequences !== undefined ||
  body.output_config !== undefined // 🆕 C3.10b
) {
  dto.params = {};
  if (body.temperature !== undefined) {
    dto.params.temperature = body.temperature;
  }
  if (body.max_tokens !== undefined) {
    dto.params.maxOutputTokens = body.max_tokens;
  }
  if (body.top_p !== undefined) {
    dto.params.topP = body.top_p;
  }
  if (body.stop_sequences !== undefined) {
    dto.params.stop = body.stop_sequences;
  }
  
  // 🆕 C3.10b: output_config.format → responseFormat
  if (body.output_config?.format !== undefined) {
    dto.params.responseFormat = {
      type: body.output_config.format.type === 'json_schema' ? 'json_object' : 'text',
      jsonSchema: body.output_config.format.schema, // Schema jest obowiązkowe w oficjalnym API
    };
  }
}
```

**Uwagi:**

1. **Mapowanie struktury:** Anthropic `output_config.format.type: 'json_schema'` → gateway `responseFormat.type: 'json_object'`.
2. **Schema zawsze obecne:** W oficjalnym API Anthropic, `schema` jest obowiązkowe przy `json_schema`, więc bezpośrednio przypisujemy `body.output_config.format.schema`.
3. **Optional chaining:** Używamy `body.output_config?.format` dla bezpieczeństwa.

**Commit:** `feat(anthropic): map output_config.format to gateway responseFormat`

---

#### C3.10c: Aktualizacja C3.6 — Anthropic provider natywny output_config

> **✅ WYKONANE w C3.6 (2026-06-11):** Provider używa **natywnego `output_config.format`** gdy `options?.responseFormat` jest dostępne.

**Plik:** `src/providers/factories/create-anthropic-provider.ts`

**Akcja (zastępuje linie 67-73 w C3.6):**

```typescript
// Fragment w complete (i analogicznie w stream):
async complete(
  input: ProviderChatInput,
  modelId: string,
  options?: ProviderCallOptions,
): Promise<ProviderChatResponse> {
  try {
    const baseParams = {
      model: modelId,
      max_tokens: options?.maxOutputTokens ?? 1024,
      ...resolveAnthropicSamplingParams(options),
      stop_sequences: mapStopSequences(options?.stop),
      system: input.system,
      messages: mapTurnsToAnthropicMessages(input.messages),
      // 🆕 C3.10c: Natywny output_config.format zamiast fallback
      ...(options?.responseFormat?.type === 'json_object' && {
        output_config: {
          format: {
            type: 'json_schema' as const,
            schema: options.responseFormat.jsonSchema ?? {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      }),
    };
    
    if (input.tools?.length) {
      const params = {
        ...baseParams,
        tools: mapToolsToAnthropic(input.tools),
        tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
      };
      const response = await client.messages.create(params);
      return parseAnthropicResponseWithTools(response);
    }

    const response = await client.messages.create(baseParams);
    // ... reszta bez zmian
  }
}
```

**⚠️ UWAGI KRYTYCZNE:**

1. **Natywne API:** Anthropic oficjalnie wspiera parametr `output_config.format` w `messages.create()` (typ `MessageCreateParamsBase.output_config.format?: OutputFormat`).
2. **Struktura:** Gateway `responseFormat.type: 'json_object'` → Anthropic `output_config.format.type: 'json_schema'` z **obowiązkowym** `schema`.
3. **Schema fallback:** Gdy gateway NIE dostanie `responseFormat.jsonSchema`, używamy permissive schema `{ type: 'object', additionalProperties: true }`.
4. **Brak uproszczonej wersji:** Nie używamy `output_config.type` (to nie istnieje w oficjalnym API) — używamy oficjalnej struktury `output_config.format.type`.
5. **Backward compatibility:** Gdy `responseFormat` jest `undefined` lub `type: 'text'`, nie dodajemy `output_config` (Anthropic używa domyślnego text output).

**Weryfikacja:**

```typescript
// Test case 1: JSON mode ze schematem
const options1: ProviderCallOptions = {
  responseFormat: { 
    type: 'json_object',
    jsonSchema: { type: 'object', properties: { name: { type: 'string' } } },
  },
};
// SDK call powinien zawierać:
// output_config: { format: { type: 'json_schema', schema: {...} } }

// Test case 2: JSON mode bez schematu (gateway nie wysłał jsonSchema)
const options2: ProviderCallOptions = {
  responseFormat: { type: 'json_object' },
};
// SDK call powinien zawierać:
// output_config: { format: { type: 'json_schema', schema: { type: 'object', additionalProperties: true } } }

// Test case 3: Brak responseFormat
const options3: ProviderCallOptions = { temperature: 0.7 };
// SDK call NIE powinien zawierać output_config
```

**Commit:** `feat(anthropic): use native output_config.format in provider`

---

#### C3.10d: Dokumentacja

**Plik:** `docs/integracja-anthropic-messages.md`

**Akcja:** Dodać sekcję (po „Wybór modelu”) o nagłówku **Structured outputs (JSON mode)** z treścią:

Fasada wspiera parametr **`output_config.format`** w oficjalnym kształcie Anthropic Messages API — zgodnie z dokumentacją https://platform.claude.com/docs/en/build-with-claude/structured-outputs.

**Przykład żądania** (do wklejenia w docs):

```json
{
  "model": "chat-default",
  "messages": [{ "role": "user", "content": "Generate user profile JSON" }],
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
}
```

**Mapowanie na gateway** (w docs jako podsekcja):

- `output_config.format.type: 'json_schema'` → gateway `responseFormat: { type: 'json_object' }`
- `output_config.format.schema` → gateway `responseFormat.jsonSchema`

Gateway propaguje to do Anthropic provider, który używa **natywnego `output_config.format`** w wywołaniu SDK.

**Ograniczenia** (w docs jako podsekcja):

- Fasada przyjmuje kształt zgodny z **oficjalnym Anthropic Messages API** (wire-compatible): `output_config.format.type: 'json_schema'` z obowiązkowym `schema`.
- Nie ma wsparcia dla uproszczonego JSON mode bez schematu — oficjalne API Anthropic wymaga schematu przy `json_schema`.
- Gateway internal używa abstrakcji `responseFormat`, ale fasada respektuje oficjalny shape Anthropic.

**Commit:** `docs(anthropic): document output_config.format support in facade`

---

#### Podsumowanie C3.10

| Aspekt | Przed | Po |
|--------|-------|-----|
| **Fasada Anthropic DTO** | Brak `output_config` | ✅ `output_config?: { format: { type, schema } }` |
| **Mapper fasady** | Brak mapowania | ✅ `output_config.format` → gateway `responseFormat` |
| **Provider Anthropic** | Fallback (system prompt) | ✅ Natywny `output_config.format` w SDK call |
| **Dokumentacja** | Brak | ✅ Sekcja w `integracja-anthropic-messages.md` |

**Szacunek:** 1.5-2h (DTO + mapper + aktualizacja providera + docs)

---

## ✅ FAZA C4: Extended response fields — 2-3h

**Cel:** Rozszerzyć `ChatResponseDto` o `usageDetails` (cache tokens z Anthropic) i `systemFingerprint` (OpenAI).

**Prerequisite:** Faza T1.5 (finishReason już jest w tool calling), T5A.4 (response mapping Anthropic).

**Milestone C4:** Response z Anthropic zawiera `usageDetails.promptCacheHitTokens` gdy cache był użyty; response z OpenAI (przyszłość) zawiera `systemFingerprint`.

---

### Krok C4.1: DTO gateway — rozszerzenie ChatResponseDto

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/chat/dto/chat-response.dto.ts`

**Stan wyjściowy (po T1.5):**

```typescript
export class ChatResponseDto {
  // ... istniejące pola ...
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}
```

**Akcja:**

```typescript
// 🆕 C4.1
export class ChatUsageDetailsDto {
  @ApiPropertyOptional({
    description:
      'Prompt cache hit tokens (Anthropic). Number of input tokens read from cache (90% discount).',
  })
  promptCacheHitTokens?: number;

  @ApiPropertyOptional({
    description:
      'Prompt cache creation tokens (Anthropic). Number of input tokens written to cache.',
  })
  promptCacheCreationTokens?: number;
}

export class ChatResponseDto {
  // ✅ Istniejące pola ...

  // 🆕 C4.1
  @ApiPropertyOptional({
    type: ChatUsageDetailsDto,
    description:
      'Extended usage details (cache tokens, reasoning tokens). Populated when provider supports extended usage.',
  })
  usageDetails?: ChatUsageDetailsDto;

  @ApiPropertyOptional({
    description:
      'System fingerprint (OpenAI). Identifier for backend configuration snapshot.',
    example: 'fp_44709d6fcb',
  })
  systemFingerprint?: string;
}
```

**Commit:** `feat(chat): add usageDetails and systemFingerprint to ChatResponseDto`

---

### Krok C4.2: Provider interface — rozszerzenie ProviderChatResponse

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/providers/interfaces/ai-provider.interface.ts`

**Stan wyjściowy (po T2.1):**

```typescript
export interface ProviderChatResponse {
  text: string;
  toolCalls?: ProviderToolCall[];
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
}
```

**Akcja:**

```typescript
// 🆕 C4.2
export interface ProviderUsageDetails {
  promptCacheHitTokens?: number;
  promptCacheCreationTokens?: number;
}

export interface ProviderChatResponse {
  text: string;
  toolCalls?: ProviderToolCall[];
  stopReason?: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
  // 🆕 C4.2
  usageDetails?: ProviderUsageDetails;
  systemFingerprint?: string;
}
```

**Commit:** `feat(providers): add usageDetails and systemFingerprint to ProviderChatResponse`

---

### Krok C4.3: Anthropic provider — mapowanie usage cache tokens

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/providers/anthropic/anthropic-tools.mapper.ts` (mapper response z T4.1 w katalogu `providers/anthropic/`)

**Akcja:** W funkcji `parseAnthropicResponseWithTools`:

```typescript
// Pseudo-kod (fragment):
export function parseAnthropicResponseWithTools(
  response: Anthropic.Messages.Message,
): ProviderChatResponse {
  // ... istniejący kod (text, toolCalls, stopReason) ...

  // 🆕 C4.3: Extended usage
  const usageDetails: ProviderUsageDetails | undefined =
    response.usage.cache_read_input_tokens !== undefined ||
    response.usage.cache_creation_input_tokens !== undefined
      ? {
          promptCacheHitTokens: response.usage.cache_read_input_tokens,
          promptCacheCreationTokens: response.usage.cache_creation_input_tokens,
        }
      : undefined;

  return {
    text,
    toolCalls,
    stopReason: mapStopReason(response.stop_reason),
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    usageDetails, // 🆕
  };
}
```

**Weryfikacja:**
- Mock SDK response z `usage: { cache_read_input_tokens: 500, ... }` → adapter zwraca `usageDetails.promptCacheHitTokens: 500`

**Commit:** `feat(anthropic): map cache tokens to usageDetails`

---

### Krok C4.4: ChatService — propagacja usageDetails, systemFingerprint

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/chat/chat.service.ts` — metoda `executeChat` (po wywołaniu `completeOnce`)

**Akcja:**

```typescript
// Fragment w executeChat (po T3.3):
const chatResult: ChatResponseDto = {
  id: `gw_${uuidv4()}`,
  provider: resolved.providerName,
  model: requestBody.modelAlias,
  output: { type: 'text', text: response.text },
  usage: response.usage,
  requestId,
  conversationId: responseConversationId,
  ...(response.toolCalls?.length && { toolCalls: response.toolCalls }),
  ...(response.stopReason === 'tool_use' && { finishReason: 'tool_calls' }),
  ...(response.stopReason === 'end_turn' && !response.toolCalls?.length && {
    finishReason: 'stop',
  }),
  // 🆕 C4.4
  ...(response.usageDetails && { usageDetails: response.usageDetails }),
  ...(response.systemFingerprint && { systemFingerprint: response.systemFingerprint }),
};
```

**Commit:** `feat(chat): expose usageDetails and systemFingerprint in ChatResponseDto`

---

### Krok C4.5: Fasada OpenAI — response systemFingerprint (non-stream + stream)

**Status:** ✅ **WYKONANY 2026-06-12** (non-stream + stream)

**Pliki:**
- DTO: `src/integrations/openai/dtos/openai-chat-completion-response.dto.ts`
- Non-stream mapper: `src/integrations/openai/mappers/openai-response.mapper.ts`
- Stream mapper: `src/integrations/openai/mappers/openai-stream.mapper.ts`

---

#### C4.5a: OpenAI DTO — pole `system_fingerprint`

**Plik:** `src/integrations/openai/dtos/openai-chat-completion-response.dto.ts`

**Implementacja:**

```typescript
export class OpenAiChatCompletionResponseDto {
  // ... istniejące pola ...
  
  // 🆕 C4.5
  @ApiPropertyOptional({
    description:
      'System fingerprinting (OpenAI). Identifier for backend configuration snapshot.',
    example: 'fp_01HZZZZZZZZZZZZZZZZZZZZZZ',
  })
  system_fingerprint?: string;
}
```

✅ **Zrealizowane:** Pole na top-level DTO, zgodne z OpenAI API spec.

---

#### C4.5b: Mapper non-stream — mapowanie `systemFingerprint` → `system_fingerprint`

**Plik:** `src/integrations/openai/mappers/openai-response.mapper.ts`

**Implementacja:**

```typescript
// 🆕 C4.5 — Helper (L21-25) współdzielony z stream mapper
export function mapSystemFingerprintToOpenAi(
  systemFingerprint?: string,
): Pick<OpenAiChatCompletionResponseDto, 'system_fingerprint'> | {} {
  return systemFingerprint ? { system_fingerprint: systemFingerprint } : {};
}

// Fragment w mapChatResponseToOpenAi (L49-83):
export function mapChatResponseToOpenAi(
  result: ChatResponseDto,
  requestedModel: string,
): OpenAiChatCompletionResponseDto {
  const input = result.usage?.inputTokens ?? 0;
  const output = result.usage?.outputTokens ?? 0;
  const hasToolCalls = (result.toolCalls?.length ?? 0) > 0;

  return {
    id: toOpenAiCompletionId(result.id),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: requestedModel,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content:
            hasToolCalls && !result.output.text ? null : result.output.text,
          ...(hasToolCalls && {
            tool_calls: mapGatewayToolCallsToOpenAi(result.toolCalls!),
          }),
        },
        finish_reason: mapFinishReasontoOpenAI(result.finishReason),
      },
    ],
    usage: {
      prompt_tokens: input,
      completion_tokens: output,
      total_tokens: input + output,
    },
    // 🆕 C4.5 — mapowanie przez helper (L81)
    ...mapSystemFingerprintToOpenAi(result.systemFingerprint),
  };
}
```

✅ **Zrealizowane:** Conditional spread przez helper — klucz `system_fingerprint` pomijany gdy brak wartości.

---

#### C4.5c: Mapper stream — `system_fingerprint` w final chunk

**Plik:** `src/integrations/openai/mappers/openai-stream.mapper.ts`

**Implementacja:**

```typescript
// 🆕 C4.5 — Import helpera (L4)
import {
  mapFinishReasontoOpenAI,
  toOpenAiCompletionId,
  mapSystemFingerprintToOpenAi, // ← współdzielony z non-stream
} from './openai-response.mapper';

// Fragment w case 'done' (L108-156):
case 'done': {
  const finishReason = resolveOpenAiFinishReason(event.data);
  const lines: string[] = [];

  if (event.data.toolCalls?.length) {
    lines.push(
      chunkLine({
        ...baseChunkFields(state),
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: buildToolCallsDelta(event.data.toolCalls),
            },
            finish_reason: null,
          },
        ],
      }),
    );
  }

  const finalChunk: Record<string, unknown> = {
    ...baseChunkFields(state),
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: finishReason,
      },
    ],
  };

  if (state.includeUsage && event.data.usage) {
    const input = event.data.usage.inputTokens;
    const output = event.data.usage.outputTokens;
    finalChunk.usage = {
      prompt_tokens: input,
      completion_tokens: output,
      total_tokens: event.data.usage.totalTokens ?? input + output,
    };
  }
  
  // 🆕 C4.5 — mapowanie systemFingerprint na final chunk (L149-152)
  Object.assign(
    finalChunk,
    mapSystemFingerprintToOpenAi(event.data.systemFingerprint),
  );

  lines.push(chunkLine(finalChunk), 'data: [DONE]\n\n');
  return lines;
}
```

✅ **Zrealizowane:** 
- Pole `system_fingerprint` na top-level final chunka (zgodnie z OpenAI streaming spec).
- Niezależne od `includeUsage` (prawidłowo — fingerprint to osobne pole).
- Ten sam helper co non-stream (DRY).

---

**Commit:** `feat(openai): add system_fingerprint to response DTO (non-stream + stream)`

---

### Krok C4.6: Fasada Anthropic — response usage cache tokens

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/integrations/anthropic/dtos/anthropic-messages-response.dto.ts`

**Stan wyjściowy:**

```typescript
export type AnthropicMessagesResponse = {
  // ...
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};
```

**Akcja:**

```typescript
// 🆕 C4.6
export type AnthropicMessagesResponse = {
  // ... istniejące ...
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
};
```

**Mapper response** (`src/integrations/anthropic/mappers/anthropic-response.mapper.ts`):

```typescript
// Fragment w mapGatewayChatResponseToAnthropic:
export function mapGatewayChatResponseToAnthropic(
  result: ChatResponseDto,
): AnthropicMessagesResponse {
  return {
    id: result.id,
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: result.output.text }],
    // tool_use blocks (T5A.4) ...
    model: result.model,
    stop_reason: mapStopReason(result.finishReason),
    stop_sequence: null,
    usage: {
      input_tokens: result.usage?.inputTokens ?? 0,
      output_tokens: result.usage?.outputTokens ?? 0,
      // 🆕 C4.6
      cache_creation_input_tokens: result.usageDetails?.promptCacheCreationTokens,
      cache_read_input_tokens: result.usageDetails?.promptCacheHitTokens,
    },
  };
}
```

**Commit:** `feat(anthropic): add cache tokens to response usage`

---

## ✅ FAZA C5: Metadata + tracking — 1-2h

**Cel:** Dodać pole `metadata` w request → propagacja do providerów (OpenAI metadata, Anthropic metadata.user_id) oraz observability przez pipeline `LlmCallContext` → `SentryAiMetricsAdapter` (bez importu Sentry w warstwie chat).

**Prerequisite:** Faza T1.4 zakończona (ChatRequestDto rozszerzone).

**Milestone C5:** Request z `metadata: { userId: "123" }` → Anthropic dostaje `metadata.user_id`, span LLM w Sentry ma custom context `request_metadata` (wyczyszczony po zakończeniu wywołania).

---

### Krok C5.1: DTO gateway — pole metadata

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/chat/dto/chat-request.dto.ts`

**Akcja:**

```typescript
export class ChatRequestDto {
  // ✅ Istniejące pola ...

  // 🆕 C5.1
  @ApiPropertyOptional({
    description:
      'User-defined metadata for tracking and analytics. Propagated to providers when supported (OpenAI, Anthropic).',
    type: 'object',
    additionalProperties: true,
    example: { userId: '123', sessionId: 'abc' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string | number | boolean>;
}
```

**Weryfikacja:**
- Postman: `{ "metadata": { "userId": "123" } }` → 200

**Commit:** `feat(chat): add metadata to ChatRequestDto`

---

### Krok C5.2: Provider interface — pole metadata w input

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/providers/interfaces/ai-provider.interface.ts`

**Akcja:**

```typescript
export interface ProviderChatInput {
  system?: string;
  messages: ProviderChatTurn[];
  tools?: ProviderToolDefinition[];
  toolChoice?: GatewayToolChoice;
  // 🆕 C5.2
  metadata?: Record<string, string | number | boolean>;
}
```

**Commit:** `feat(providers): add metadata to ProviderChatInput`

---

### Krok C5.3: Helper provider-input — propagacja metadata

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/chat/helpers/provider-input.ts` — funkcja `buildProviderInputForAlias`

**Akcja:**

```typescript
// Pseudo-kod (fragment):
export function buildProviderInputForAlias(
  request: ChatRequestDto,
  alias: string,
  /* ... */
): ProviderChatInput {
  const input: ProviderChatInput = {
    system: composeSystemPrompt(/* ... */),
    messages: toProviderTurns(request.messages),
  };

  // Tooling (T2.2) ...
  if (request.tooling?.definitions?.length) {
    input.tools = request.tooling.definitions;
    input.toolChoice = request.tooling.toolChoice;
  }

  // 🆕 C5.3: Metadata
  if (request.metadata) {
    input.metadata = request.metadata;
  }

  return input;
}
```

**Commit:** `feat(chat): propagate metadata to ProviderChatInput`

---

### Krok C5.4: Anthropic provider — mapowanie metadata.user_id

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/providers/factories/create-anthropic-provider.ts`

**Akcja:** W `complete` i `stream` wewnątrz fabryki:

```typescript
// Pseudo-kod (fragment):
const params: Anthropic.Messages.MessageCreateParams = {
  model: modelId,
  max_tokens: options?.maxOutputTokens ?? 1024,
  // ... temperature, top_p, stop_sequences, tools, system, messages ...
  // 🆕 C5.4
  metadata:
    input.metadata?.userId !== undefined
      ? { user_id: String(input.metadata.userId) }
      : undefined,
};
```

**Uwaga:** Anthropic `metadata.user_id` to string (abuse monitoring). Inne klucze w `input.metadata` nie są propagowane (Anthropic nie wspiera arbitrary metadata).

**Commit:** `feat(anthropic): map metadata.userId to Anthropic metadata.user_id`

---

### Krok C5.5: Request metadata w pipeline observability (Sentry custom context)

**Status:** ⏳ Planowany

**Cel:** Udostępnić `request.metadata` w observability bez importu Sentry w warstwie chat. Metadata trafia do `LlmCallContext`; adapter Sentry ustawia `Sentry.setContext('request_metadata', …)` z poprawnym cyklem życia (analogicznie do `setConversationId`).

**Pliki:**

| Plik | Zmiana |
|------|--------|
| `src/metrics/interfaces/metrics-backend.interface.ts` | pole `metadata?` w `LlmCallContext` |
| `src/chat/helpers/metrics.ts` | propagacja z `ChatRequestDto` |
| `src/metrics/adapters/sentry-metrics.adapter.ts` | `setContext` + cleanup w `observeLlmCall` / `observeLlmStream` |
| `src/chat/chat-provider-call.service.ts` | **bez zmian** (już używa `buildLlmMetricsContext` + `MetricsService`) |

**Prerequisite:** C5.1 (pole `metadata` w DTO).

**Milestone (weryfikacja):** Request `{ metadata: { userId: "123" } }` → span LLM w Sentry ma custom context `request_metadata` z tymi danymi; po zakończeniu wywołania context jest wyczyszczony (brak wycieku między requestami).

---

#### C5.5.1: Interfejs — `metadata` w `LlmCallContext`

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/metrics/interfaces/metrics-backend.interface.ts`

**Akcja:**

```typescript
// 🆕 C5.5 — wspólny typ metadata (zgodny z ChatRequestDto / ProviderChatInput)
export type LlmRequestMetadata = Record<string, string | number | boolean>;

export interface LlmCallContext {
  provider: string;
  modelAlias: string;
  modelId: string;
  requestId: string;
  conversationId?: string;
  messages?: LlmCallMessage[];
  // 🆕 C5.5
  metadata?: LlmRequestMetadata;
}
```

---

#### C5.5.2: Helper — propagacja metadata do kontekstu metryk

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/chat/helpers/metrics.ts` — funkcja `buildLlmMetricsContext`

**Akcja:**

```typescript
export function buildLlmMetricsContext(
  requestBody: ChatRequestDto,
  provider: string,
  modelAlias: string,
  modelId: string,
  requestId: string,
): LlmCallContext {
  return {
    provider,
    modelAlias,
    modelId,
    requestId,
    conversationId: getClientConversationId(requestBody),
    messages: toMetricsMessages(requestBody.messages),
    // 🆕 C5.5 — metadata idzie do observability (provider dostaje je osobno przez C5.3)
    ...(requestBody.metadata && { metadata: requestBody.metadata }),
  };
}
```

**Uwaga:** `ChatProviderCallService` nie wymaga edycji — `completeOnce` i `streamOnce` już budują `metricsCtx` i przekazują go do `MetricsService`.

---

#### C5.5.3: Adapter Sentry — `setContext` + cleanup

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/metrics/adapters/sentry-metrics.adapter.ts`

**Akcja:**

```typescript
import type {
  MetricsBackend,
  LlmCallContext,
  LlmCallObservation,
  llmStreamSpanController,
  LlmCallMessage,
  // 🆕 C5.5
  LlmRequestMetadata,
} from '../interfaces/metrics-backend.interface';

// ... istniejące helpery (toGenAiProviderName, applyGenAiMessagesToSpan, itd.)

// 🆕 C5.5 — izolacja wywołań Sentry (spójne z setConversationId)
function applyRequestMetadataContext(metadata: LlmRequestMetadata): void {
  Sentry.setContext('request_metadata', metadata);
}

function clearRequestMetadataContext(): void {
  Sentry.setContext('request_metadata', null);
}

@Injectable()
export class SentryAiMetricsAdapter implements MetricsBackend {
  async observeLlmCall<T>(
    context: LlmCallContext,
    fn: () => Promise<T>,
    mapResult?: (result: T) => LlmCallObservation,
  ): Promise<T> {
    if (context.conversationId) {
      Sentry.setConversationId(context.conversationId);
    }
    // 🆕 C5.5
    if (context.metadata) {
      applyRequestMetadataContext(context.metadata);
    }

    try {
      return await Sentry.startSpan(
        {
          op: 'gen_ai.chat',
          name: `chat ${context.modelId}`,
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.request.model': context.modelId,
            'gen_ai.provider.name': toGenAiProviderName(context.provider),
            requestId: context.requestId,
            modelAlias: context.modelAlias,
          },
        },
        async (span) => {
          // ... istniejąca logika spanu bez zmian
        },
      );
    } finally {
      if (context.conversationId) {
        Sentry.setConversationId(null);
      }
      // 🆕 C5.5
      if (context.metadata) {
        clearRequestMetadataContext();
      }
    }
  }

  observeLlmStream(context: LlmCallContext): llmStreamSpanController {
    if (context.conversationId) {
      Sentry.setConversationId(context.conversationId);
    }
    // 🆕 C5.5
    if (context.metadata) {
      applyRequestMetadataContext(context.metadata);
    }

    const span = Sentry.startInactiveSpan({
      // ... istniejąca konfiguracja spanu
    });

    // ... applyGenAiMessagesToSpan, applyGenAiConversationIdToSpan

    return {
      end: (observation: LlmCallObservation) => {
        // ... istniejąca finalizacja spanu

        span.end();

        if (context.conversationId) {
          Sentry.setConversationId(null);
        }
        // 🆕 C5.5
        if (context.metadata) {
          clearRequestMetadataContext();
        }
      },
    };
  }
}
```

**Pliki bez zmian (świadoma decyzja architektoniczna):**

| Plik | Dlaczego |
|------|----------|
| `src/chat/chat-provider-call.service.ts` | Już używa `buildLlmMetricsContext` + `MetricsService` |
| `src/metrics/metrics.service.ts` | Pass-through do backendu |
| `src/metrics/adapters/noop-metrics.adapter.ts` | Ignoruje `context.metadata` — OK dla testów / dev bez Sentry |

**Uwagi implementacyjne:**

1. **Cykl życia** — `setContext` bez cleanup w async Node może przenosić metadata między requestami; wzorzec `try/finally` + cleanup w `end()` streamu jest obowiązkowy (jak przy `setConversationId`).
2. **Brak konfliktu z `setConversationId`** — to osobne pola scope Sentry: `conversationId` grupuje spany w Conversations, `request_metadata` to dowolne metadane requestu (cost attribution, user tracking).
3. **Semantyczna duplikacja** — unikać wysyłania `conversationId` w `metadata`; do grupowania rozmów służy pole `conversationId` w body (C5 + `getClientConversationId`).

**Commit:** `feat(observability): propagate request metadata via LlmCallContext to Sentry`

---

### Krok C5.6: Fasada OpenAI — DTO metadata

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/integrations/openai/dtos/openai-chat-completion-request.dto.ts`

**Akcja:**

```typescript
export class OpenAiChatCompletionRequestDto {
  // ✅ Istniejące ...

  // 🆕 C5.6
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
```

**Mapper request** (`src/integrations/openai/mappers/openai-request.mapper.ts`):

```typescript
// Fragment:
if (body.metadata) {
  dto.metadata = body.metadata;
}
```

**Commit:** `feat(openai): add metadata to request DTO and mapper`

---

### Krok C5.7: Fasada Anthropic — DTO metadata

**Status:** ✅ **WYKONANY 2026-06-12**

**Plik:** `src/integrations/anthropic/dtos/anthropic-messages-request.dto.ts`

**Akcja:**

```typescript
export class AnthropicMessagesRequestDto {
  // ✅ Istniejące ...

  // 🆕 C5.7
  @ApiPropertyOptional({
    description: 'Metadata for abuse monitoring (user_id).',
    type: 'object',
    properties: {
      user_id: { type: 'string' },
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: { user_id?: string };
}
```

**Mapper request** (`src/integrations/anthropic/mappers/anthropic-request.mapper.ts`):

```typescript
// Fragment:
if (body.metadata?.user_id) {
  dto.metadata = { userId: body.metadata.user_id };
}
```

**Commit:** `feat(anthropic): add metadata to request DTO and mapper`

---

## ✅ FAZA C6: Provider-specific params — 1h

**Cel:** Dodać `topK` (Anthropic/Google) i `max_completion_tokens` (OpenAI alias dla max_tokens).

**Prerequisite:** Faza C1 zakończona.

**Milestone C6:** Request z `topK` → Anthropic/Google dostają wartość; OpenAI `max_completion_tokens` mapuje na `maxOutputTokens`.

---

### Krok C6.1: DTO gateway — topK (provider-specific)

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `src/chat/dto/chat-params.dto.ts`

**Akcja:**

```typescript
export class ChatParamsDto {
  // ✅ Istniejące ...

  // 🆕 C6.1
  @ApiPropertyOptional({
    description:
      'Top-K sampling (Anthropic/Google). Only used when provider supports it. Limits sampling to top K tokens.',
    minimum: 0,
    example: 40,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  topK?: number;
}
```

**Commit:** `feat(chat): add topK to ChatParamsDto (provider-specific)`

---

### Krok C6.2: Config YAML — allowOverrides topK

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `gateway.config.yaml`

**Akcja:**

```yaml
models:
  chat-default: # Jeśli provider = Anthropic
    policy:
      params:
        allowOverrides:
          # ... istniejące ...
          # 🆕 C6.2
          - topK
        bounds:
          # ... istniejące ...
          # topK nie ma bounds (int, provider waliduje)
```

**Commit:** `feat(config): allow topK override for Anthropic/Google aliases`

---

### Krok C6.3: Helper `resolveProviderCallOptions` — topK

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `src/chat/helpers/resolve-provider-call-options.ts`

**Akcja:** Analogicznie do innych parametrów:

```typescript
// Fragment:
let topK = request.params?.topK;

if (topK !== undefined) {
  if (!allowOverrides.has('topK')) {
    throw new BadRequestException({
      code: ApiErrorCode.MODEL_NOT_ALLOWED,
      message: 'topK override not allowed',
      details: [],
    });
  }
}

return { /* ... */, topK };
```

**Commit:** `feat(chat): support topK in resolveProviderCallOptions`

---

### Krok C6.4: Provider interface — topK w ProviderCallOptions

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `src/providers/interfaces/ai-provider.interface.ts`

**Akcja:**

```typescript
export interface ProviderCallOptions {
  // ... istniejące ...
  topK?: number;
}
```

**Commit:** `feat(providers): add topK to ProviderCallOptions`

---

### Krok C6.5: Fabryki providerów — mapowanie topK

**Status:** ✅ **WYKONANY 2026-06-13**

**Anthropic provider (`create-anthropic-provider.ts`):**

```typescript
// Fragment w complete (wewnątrz fabryki):
const params = {
  // ...
  top_k: options?.topK,
};
```

**Google provider (`create-google-provider.ts`):**

```typescript
// Fragment (wewnątrz fabryki):
const generationConfig = {
  // ...
  topK: options?.topK,
};
```

**Commit:** `feat(anthropic,google): support topK in provider factories`

---

### Krok C6.6: Fasada OpenAI — max_completion_tokens

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `src/integrations/openai/dtos/openai-chat-completion-request.dto.ts`

**Akcja:**

```typescript
export class OpenAiChatCompletionRequestDto {
  // ✅ Istniejące: max_tokens ...

  // 🆕 C6.6 (alias dla max_tokens, newer naming)
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_completion_tokens?: number;
}
```

**Mapper request** (`src/integrations/openai/mappers/openai-request.mapper.ts`):

```typescript
// Fragment:
if (body.max_completion_tokens !== undefined) {
  dto.params = dto.params ?? {};
  dto.params.maxOutputTokens = body.max_completion_tokens;
}
// Priorytet: max_completion_tokens > max_tokens (jeśli oba są)
```

**Commit:** `feat(openai): add max_completion_tokens (alias for max_tokens)`

---

### Krok C6.7: Fasada Anthropic — topK

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `src/integrations/anthropic/dtos/anthropic-messages-request.dto.ts`

**Akcja:**

```typescript
export class AnthropicMessagesRequestDto {
  // ✅ Istniejące ...

  // 🆕 C6.7
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  top_k?: number;
}
```

**Mapper request:**

```typescript
// Fragment:
if (body.top_k !== undefined) {
  dto.params = dto.params ?? {};
  dto.params.topK = body.top_k;
}
```

**Commit:** `feat(anthropic): add top_k to request DTO and mapper`

---

## ✅ FAZA C7: Dokumentacja + testy — 2-3h

**Cel:** Aktualizować dokumentację po rozszerzeniach C1-C6; napisać testy jednostkowe i e2e.

**Prerequisite:** Fazy C1-C6 zakończone.

**Milestone C7:** Swagger UI zawiera nowe pola, `docs/` aktualizowane, testy pass.

---

### Krok C7.1: Swagger / OpenAPI — eksport

**Akcja:**

```bash
npm run openapi:export
```

**Weryfikacja:**
- `openapi.json` zawiera nowe pola: `ChatParamsDto` z `topP`, `stop`, `responseFormat`, itd.
- Swagger UI (`/api/v1/api-docs`) — sekcje:
  - **Chat API** — request z rozszerzonymi `params`
  - **OpenAI API** — request z `top_p`, `frequency_penalty`, `response_format`, ...
  - **Anthropic API** — request z `top_p`, `top_k`, `stop_sequences`, ...

**Commit:** `docs(openapi): update schema with extended params`

---

### Krok C7.2: Dokumentacja — `docs/dokumentacja_api.md`

**Plik:** `docs/dokumentacja_api.md`

**Akcja:** Rozszerz sekcję **`POST /api/v1/chat`** → Request body → `params`:

```markdown
## Parametry żądania (rozszerzone)

| Pole | Typ | Opis | Zakres |
|------|-----|------|--------|
| `temperature` | number | Losowość (sampling) | 0-2 |
| `maxOutputTokens` | number | Limit tokenów odpowiedzi | 1-8192 |
| **`topP`** | number | Nucleus sampling (alternatywa dla temperature) | 0-1 |
| **`stop`** | string \| string[] | Sekwencje stop | - |
| **`frequencyPenalty`** | number | Kara za powtórzenia | -2 do 2 |
| **`presencePenalty`** | number | Kara za nowe tematy | -2 do 2 |
| **`seed`** | integer | Deterministyczny sampling | - |
| **`responseFormat`** | object | JSON mode: `{ type: 'json_object' }` | - |
| **`topK`** | integer | Top-K sampling (Anthropic/Google) | ≥0 |

### Przykład (z rozszerzonymi params):

```json
{
  "modelAlias": "chat-default",
  "messages": [{ "role": "user", "content": "Generate JSON" }],
  "params": {
    "temperature": 0.7,
    "topP": 0.95,
    "stop": ["###"],
    "responseFormat": { "type": "json_object" }
  }
}
```
```

**Analogicznie:** Rozszerz sekcje dla fasad (`integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md`).

**Commit:** `docs(api): document extended params in chat API`

---

### Krok C7.3: Dokumentacja — `docs/konfiguracja.md`

**Plik:** `docs/konfiguracja.md`

**Akcja:** Sekcja **`policy.params`** w YAML — przykład z nowymi polami:

```yaml
models:
  chat-default:
    policy:
      params:
        defaults:
          temperature: 1.0
          topP: 0.95
        allowOverrides:
          - temperature
          - maxOutputTokens
          - topP
          - stop
          - frequencyPenalty
          - presencePenalty
          - seed
          - responseFormat
          - topK
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
          topP: { min: 0, max: 1 }
          frequencyPenalty: { min: -2, max: 2 }
          presencePenalty: { min: -2, max: 2 }
```

**Commit:** `docs(config): document extended params in gateway.config.yaml`

---

### Krok C7.4: Testy jednostkowe — DTO

**Pliki:**
- `src/chat/dto/chat-params.dto.spec.ts` **(NOWY)**
- `src/integrations/openai/dtos/openai-chat-completion-request.dto.spec.ts`
- `src/integrations/anthropic/dtos/anthropic-messages-request.dto.spec.ts`

**Akcja:** Dla każdego nowego pola:

```typescript
// Przykład test ChatParamsDto:
describe('ChatParamsDto', () => {
  it('should accept topP in valid range', async () => {
    const dto = plainToClass(ChatParamsDto, { topP: 0.95 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject topP out of range', async () => {
    const dto = plainToClass(ChatParamsDto, { topP: 1.5 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept stop as string', async () => {
    const dto = plainToClass(ChatParamsDto, { stop: '###' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept stop as array', async () => {
    const dto = plainToClass(ChatParamsDto, { stop: ['###', '\n\n'] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  // Analogicznie: frequencyPenalty, presencePenalty, seed, responseFormat, topK
});
```

**Commit:** `test(chat): add unit tests for extended ChatParamsDto`

---

### Krok C7.5: Testy jednostkowe — mappery

**Pliki:**
- `src/integrations/openai/mappers/openai-request.mapper.spec.ts`
- `src/integrations/anthropic/mappers/anthropic-request.mapper.spec.ts`

**Akcja:** Dla każdego mappera — przypadki z nowymi polami:

```typescript
// Przykład OpenAI mapper (C1.8 + C2.7 połączone):
describe('mapOpenAiChatRequestToGateway', () => {
  it('should map top_p to topP', () => {
    const body: OpenAiChatCompletionRequestDto = {
      model: 'chat-default',
      messages: [{ role: 'user', content: 'test' }],
      top_p: 0.9,
    };
    const result = mapOpenAiChatRequestToGateway(body);
    expect(result.params?.topP).toBe(0.9);
  });

  it('should map stop string to stop', () => {
    const body = { 
      model: 'chat-default',
      messages: [{ role: 'user', content: 'test' }],
      stop: '###',
    };
    const result = mapOpenAiChatRequestToGateway(body);
    expect(result.params?.stop).toBe('###');
  });

  it('should map stop array to stop', () => {
    const body = { 
      model: 'chat-default',
      messages: [{ role: 'user', content: 'test' }],
      stop: ['###', '\n\n'],
    };
    const result = mapOpenAiChatRequestToGateway(body);
    expect(result.params?.stop).toEqual(['###', '\n\n']);
  });

  it('should map frequency_penalty to frequencyPenalty', () => {
    const body = { 
      model: 'chat-default',
      messages: [{ role: 'user', content: 'test' }],
      frequency_penalty: 0.5,
    };
    const result = mapOpenAiChatRequestToGateway(body);
    expect(result.params?.frequencyPenalty).toBe(0.5);
  });

  it('should map presence_penalty to presencePenalty', () => {
    const body = { 
      model: 'chat-default',
      messages: [{ role: 'user', content: 'test' }],
      presence_penalty: 0.5,
    };
    const result = mapOpenAiChatRequestToGateway(body);
    expect(result.params?.presencePenalty).toBe(0.5);
  });

  it('should map seed to seed', () => {
    const body = { 
      model: 'chat-default',
      messages: [{ role: 'user', content: 'test' }],
      seed: 42,
    };
    const result = mapOpenAiChatRequestToGateway(body);
    expect(result.params?.seed).toBe(42);
  });

  it('should map all params together', () => {
    const body = {
      model: 'chat-default',
      messages: [{ role: 'user', content: 'test' }],
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.95,
      stop: ['###'],
      frequency_penalty: 0.3,
      presence_penalty: 0.2,
      seed: 123,
    };
    const result = mapOpenAiChatRequestToGateway(body);
    expect(result.params).toEqual({
      temperature: 0.7,
      maxOutputTokens: 1024,
      topP: 0.95,
      stop: ['###'],
      frequencyPenalty: 0.3,
      presencePenalty: 0.2,
      seed: 123,
    });
  });
});
```

**⚠️ Uwaga:** OpenAI mapper (C1.8) mapuje **wszystkie 7 parametrów** (temperature, maxOutputTokens, topP, stop, penalties, seed) — testy powinny pokryć każdy parametr pojedynczo + combined case.

**Commit:** `test(openai,anthropic): add unit tests for extended param mappers`

---

### Krok C7.6: Testy jednostkowe — fabryki providerów

**Pliki:**
- `src/providers/factories/create-anthropic-provider.spec.ts`
- `src/providers/factories/create-google-provider.spec.ts`

**Akcja:** Mock SDK — weryfikować że fabryka zwraca provider który przekazuje parametry:

```typescript
// Przykład Anthropic:
describe('createAnthropicProvider', () => {
  it('should pass topP to SDK as top_p', async () => {
    const mockClient = { messages: { create: jest.fn() } };
    const mockLogger = { /* ... */ };
    const provider = createAnthropicProvider('fake-key', mockLogger);
    // Inject mockClient do providera lub stub całą fabrykę

    const input: ProviderChatInput = { messages: [{ role: 'user', content: 'test' }] };
    const options: ProviderCallOptions = { topP: 0.9 };

    await provider.complete(input, 'claude-3-5-sonnet-20241022', options);

    expect(mockClient.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ top_p: 0.9 }),
    );
  });

  // Analogicznie: stop_sequences, JSON mode fallback
});
```

**Commit:** `test(providers): add unit tests for extended params in provider factories`

---

### Krok C7.7: Testy e2e (opcjonalne)

**Plik:** `test/chat-extended-params.e2e-spec.ts` **(NOWY)**

**Akcja:** Request do `POST /api/v1/chat` z nowymi params (wymaga prawdziwych kluczy API lub mocków providerów):

```typescript
describe('Chat API with extended params (e2e)', () => {
  it('should accept topP in request', () => {
    return request(app.getHttpServer())
      .post('/api/v1/chat')
      .set('X-Gateway-Key', process.env.GATEWAY_KEY_TEST)
      .send({
        modelAlias: 'chat-default',
        messages: [{ role: 'user', content: 'Count to 3' }],
        params: { topP: 0.9 },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.output.text).toBeDefined();
      });
  });

  // Analogicznie: stop, responseFormat (JSON mode), ...
});
```

**Commit:** `test(e2e): add extended params e2e tests`

---

### Krok C7.8: Aktualizacja README (opcjonalnie)

**Plik:** `README.md`

**Akcja:** Sekcja **Features** — dodać:

```markdown
## Features (rozszerzone)

- **Advanced generation params**: nucleus sampling (topP), stop sequences, frequency/presence penalties, seed
- **Structured outputs**: JSON mode (native OpenAI, fallback Anthropic)
- **Extended usage tracking**: prompt cache tokens (Anthropic cost optimization)
- **Metadata propagation**: user tracking, analytics
```

**Commit:** `docs(readme): highlight extended params features`

---

## 🔒 Checklist regresji (po każdej fazie)

| Scenariusz | Oczekiwane |
|------------|------------|
| `POST /api/v1/chat` bez nowych params | Identycznie jak przed C1-C8 (backward compatible) |
| `POST /api/v1/chat` z `params.topP` bez allowOverrides | `400` `MODEL_NOT_ALLOWED` |
| Fasada OpenAI: `top_p` w body | ✅ Mapowane na `params.topP` (wcześniej przyjmowane ale NIE mapowane) |
| Fasada OpenAI: `presence_penalty` w body | ✅ Mapowane na `params.presencePenalty` (wcześniej przyjmowane ale NIE mapowane) |
| Fasada Anthropic: `top_k` w body | Mapowane na `params.topK` w gateway |
| Request z `responseFormat: { type: 'json_object' }` | Model generuje JSON (OpenAI natywnie, Anthropic fallback) |
| Response z Anthropic cache hit | `usageDetails.promptCacheHitTokens` wypełnione |
| `forbidNonWhitelisted: true` w `setup.app.ts` | Bez zmian; nowe pola w DTO OpenAI/Anthropic nie są blokowane |
| Postman natywny chat bez nowych pól | Nadal działa jak w MVP |
| **🆕 C8:** Request z `params.thinkingEnabled: true` bez allowOverrides | `400` `MODEL_NOT_ALLOWED` |
| **🆕 C8:** OpenAI facade: `reasoning_effort: "high"` dla o1-preview | Mapowane na `params.thinkingEnabled: true, thinkingBudget: "high"` |
| **🆕 C8:** Anthropic facade: `max_thinking_tokens: 5000` | Mapowane na `params.thinkingEnabled: true, thinkingBudget: 5000` |
| **🆕 C8:** Response z Anthropic thinking content | `thinkingContent` field wypełnione (gdy dostępne) |
| **🆕 C8:** Alias bez `capabilities.thinking` + thinkingEnabled request | `400` lub ignorowanie parametru (w zależności od policy) |

**⚠️ UWAGA BACKWARD COMPATIBILITY:**

1. **OpenAI fasada - IMPROVEMENT, nie breaking change:**
   - Przed zmianami: `top_p`, `presence_penalty`, `frequency_penalty` w body były **akceptowane** przez DTO, ale **NIE mapowane** na gateway params
   - Po zmianach (C1.8): Te same pola są **akceptowane i mapowane** → parametry działają jak oczekiwano
   - **Rezultat:** To jest **FIX**, nie breaking change — klient który już wysyłał te pola teraz dostaje oczekiwane zachowanie

2. **Wszystkie nowe pola opcjonalne:**
   - Każdy nowy parametr ma `@IsOptional()` → request bez niego = valid
   - Domyślnie zablokowane przez `allowOverrides` (opt-in per model alias)

3. **Config YAML bez nowych `allowOverrides`:**
   - Nowe parametry są **domyślnie zablokowane** przez validation (`MODEL_NOT_ALLOWED`)
   - Admini muszą **explicite** dodać do `allowOverrides` aby włączyć → safe rollout

---

## ⏳ FAZA C8: Extended Thinking — 5-7h

**Cel:** Dodać wsparcie dla "extended thinking" mode — parametry kontrolujące rozszerzone rozumowanie w modelach OpenAI (gpt-5+, o-series), Anthropic (Claude with extended thinking) i Google Gemini (Gemini 3.0+ z ThinkingConfig).

**Prerequisite:** Fazy C1 (params validation), C4 (extended response fields) zakończone.

**Milestone C8:** Request z `params.thinkingEnabled: true` → providery włączają thinking mode zgodnie z vendor API; response zawiera `thinkingContent` gdy dostępne.

**Vendor API mapping (Context7 MCP verify — 2026-06-13):**

| Provider | API Endpoint/Method | Parametr kontroli budżetu | Parametr kontroli poziomu | Zwracanie thoughts | Wspierane modele |
|----------|---------------------|---------------------------|---------------------------|-------------------|------------------|
| **OpenAI** | `/v1/responses` (NOWE API) | ❌ Brak | `reasoning: { effort: string }` ("none", "minimal", "low", "medium", "high", "xhigh") | `reasoning: { summary: "auto" }` (dostęp do reasoning summary) | gpt-5.1+, gpt-5-pro, o-series; **NIE** gpt-4.x |
| **Anthropic** | `messages.create` | `thinking.budget_tokens` (integer, min 1024) | `output_config.effort` ("low", "medium", "high", "xhigh", "max") | `thinking: { type: "enabled" \| "adaptive", display?: "summarized" \| "omitted" }` (thinking blocks w response) | Claude Opus 4.6+, Sonnet 3.7+ |
| **Google Gemini** | `generateContent` | `thinkingConfig.thinkingBudget` (integer, liczba thought tokens) | `thinkingConfig.thinkingLevel` (enum: MINIMAL, LOW, MEDIUM, HIGH) | `thinkingConfig.includeThoughts` (boolean) | **Tylko Gemini 3.0+** (wcześniejsze zwracają błąd) |

**⚠️ KRYTYCZNE ODKRYCIA Z CONTEXT7:**

1. **OpenAI — NOWE API `/v1/responses`:**
   - Chat Completions API (`/v1/chat/completions`) **NIE wspiera** `reasoning_effort` (stare modele o1/o3)
   - Nowe API `/v1/responses` z parametrem `reasoning: { effort, summary }`
   - Modele: gpt-5.1+ (defaults: gpt-5.1=none, gpt-5-pro=high, inne=medium), gpt-5.5, gpt-5.1-codex-max+
   - **⚠️ Gateway nie implementuje** `/v1/responses` → **Extended thinking dla OpenAI wymaga NOWEGO controllera/service** (poza zakresem C8)
   - **Alternatywa:** Fasada OpenAI może przyjmować `reasoning_effort` dla kompatybilności, ale **nie może użyć** tego parametru bez implementacji Responses API

2. **Anthropic — NOWE UNIFIED API:**
   - `thinking?: ThinkingConfigParam` (nie wymaga już beta headers!)
   - Trzy typy: `ThinkingConfigEnabled` (z `budget_tokens`), `ThinkingConfigDisabled`, `ThinkingConfigAdaptive`
   - `output_config.effort` (low/medium/high/xhigh/max) — niezależne od thinking (może być używane razem)
   - Thinking blocks w response `content` z `type: 'thinking'`
   - Min budget: 1024 tokens (wymagane w oficjalnym SDK)

3. **Google Gemini — Gemini 3.0+ ONLY:**
   - `thinkingConfig` dostępne od Gemini 3.0+
   - Wcześniejsze modele (2.5, 2.0, 1.5) zwracają **błąd**
   - Trzy parametry: `includeThoughts`, `thinkingBudget`, `thinkingLevel`
   - `thinkingLevel` default: HIGH (zalecany dla Gemini 3.0+)

**Uwaga filozofii projektu:** Extended thinking to **parametr o rosnącym znaczeniu** (wysokie koszty 2-10x, ale kluczowy dla reasoning use-cases). ROI: średnie-wysokie dla złożonych zadań (matematyka, code review, multi-step reasoning). Domyślnie wyłączone (opt-in per alias przez `capabilities.thinking`).

---

### Krok C8.1: DTO gateway — thinkingEnabled, thinkingBudget

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `src/chat/dto/chat-params.dto.ts`

**Akcja:**

```typescript
export class ChatParamsDto {
  // ✅ Istniejące pola (C1-C6) ...

  // 🆕 C8.1: Extended thinking
  @ApiPropertyOptional({
    description:
      'Enable extended thinking/reasoning mode for reasoning-capable models. ' +
      'OpenAI: gpt-5+ models use Responses API reasoning. ' +
      'Anthropic: enables thinking parameter with budget_tokens (min 1024). ' +
      'Google Gemini: enables ThinkingConfig (Gemini 3.0+ only). ' +
      'Significantly increases latency and token usage (2-10x cost).',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  thinkingEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Thinking budget/effort level (provider-specific interpretation). ' +
      'OpenAI: "none"|"minimal"|"low"|"medium"|"high"|"xhigh" (maps to reasoning.effort). ' +
      'Anthropic: integer token budget (min 1024) OR "low"|"medium"|"high"|"xhigh"|"max" (maps to output_config.effort). ' +
      'Google Gemini: integer thought tokens (thinkingBudget) OR "minimal"|"low"|"medium"|"high" (maps to thinkingLevel enum). ' +
      'Default: provider-specific (OpenAI=medium, Anthropic=adaptive, Gemini=high).',
    oneOf: [
      { type: 'string', enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] },
      { type: 'number', minimum: 0 },
    ],
    example: 'medium',
  })
  @IsOptional()
  @ValidateIf((o) => typeof o.thinkingBudget === 'string' || typeof o.thinkingBudget === 'number')
  thinkingBudget?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' | number;
}
```

**Custom validator** (analogicznie do `IsStringOrArrayOfStrings` z C1.1a):

**Plik:** `src/common/validators/is-thinking-budget.validator.ts` **(NOWY)**

```typescript
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsThinkingBudget(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isThinkingBudget',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value === 'string') {
            // OpenAI: none, minimal, low, medium, high, xhigh
            // Anthropic: low, medium, high, xhigh, max
            // Google: minimal, low, medium, high
            return ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(value);
          }
          if (typeof value === 'number') {
            return value >= 0;
          }
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be one of 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max' or a non-negative number`;
        },
      },
    });
  };
}
```

**Użycie w `ChatParamsDto`:**

```typescript
import { IsThinkingBudget } from '../../common/validators/is-thinking-budget.validator';

@IsOptional()
@IsThinkingBudget()
thinkingBudget?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' | number;
```

**Weryfikacja:**
- `npm run build` — brak błędów
- Test jednostkowy `chat-params.dto.spec.ts` — przypadki: boolean, string enum, number, invalid types

**Commit:** `feat(chat): add thinkingEnabled and thinkingBudget to ChatParamsDto`

---

### Krok C8.2: Config YAML — thinking allowOverrides

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `gateway.config.yaml`

**Akcja:** Dla aliasów obsługujących thinking (np. `chat-reasoning`):

```yaml
models:
  chat-reasoning: # Dedykowany alias dla thinking models
    provider: anthropic # lub openai z o1 models
    modelId: claude-3-7-sonnet-20250219 # lub o1-preview
    capabilities:
      tools: true
      thinking: true # 🆕 C8.2 capability flag
    policy:
      params:
        defaults:
          temperature: 1.0
          thinkingEnabled: false # Default wyłączone (wysokie koszty)
        allowOverrides:
          - temperature
          - maxOutputTokens
          - thinkingEnabled # 🆕 C8.2
          - thinkingBudget # 🆕 C8.2
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 16384 }
          # thinkingBudget nie ma bounds (provider-specific)
```

**Zod schema** (`src/config/configuration.ts`):

```typescript
const ModelCapabilitiesSchema = z.object({
  tools: z.boolean().optional().default(false),
  // 🆕 C8.2
  thinking: z.boolean().optional().default(false),
});

const ParamsSchema = z.object({
  defaults: z
    .object({
      temperature: z.number().optional(),
      maxOutputTokens: z.number().optional(),
      topP: z.number().min(0).max(1).optional(),
      // 🆕 C8.2
      thinkingEnabled: z.boolean().optional(),
    })
    .optional()
    .default({}),
  allowOverrides: z.array(z.string()).optional().default([]),
  bounds: z
    .object({
      temperature: z.object({ min: z.number(), max: z.number() }).optional(),
      maxOutputTokens: z.object({ min: z.number(), max: z.number() }).optional(),
      topP: z.object({ min: z.number(), max: z.number() }).optional(),
      // thinkingBudget — nie ma bounds (vendor-specific)
    })
    .optional()
    .default({}),
});
```

**Weryfikacja:**
- Aplikacja startuje z rozszerzonym YAML (logi Zod validation pass)
- `capabilities.thinking` dostępne w model registry

**Commit:** `feat(config): add thinking capability and params to model config`

---

### Krok C8.3: Helper `resolveProviderCallOptions` — thinking params

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `src/chat/helpers/resolve-provider-call-options.ts`

**Akcja:** Rozszerz `OVERRIDE_KEYS` i logikę merge:

```typescript
const OVERRIDE_KEYS = [
  'temperature',
  'maxOutputTokens',
  'topP',
  'stop',
  'frequencyPenalty',
  'presencePenalty',
  'seed',
  'topK',
  'responseFormat',
  // 🆕 C8.3
  'thinkingEnabled',
  'thinkingBudget',
] as const;

export function resolveProviderCallOptions(
  policyParams: GatewayParamsConfig | undefined,
  bodyParams?: ChatParamsDto,
): ProviderCallOptions {
  // ... istniejąca logika validation i merge ...

  // 🆕 C8.3: Thinking params
  let thinkingEnabled = defaults.thinkingEnabled;
  let thinkingBudget = bodyParams?.thinkingBudget;

  if (bodyParams?.thinkingEnabled !== undefined) {
    if (!allowOverrides.includes('thinkingEnabled')) {
      throw new HttpException(
        {
          code: ApiErrorCode.MODEL_NOT_ALLOWED,
          message: 'Parameter thinkingEnabled is not allowed for this model alias',
          details: [{ field: 'params.thinkingEnabled', allowOverrides }],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    thinkingEnabled = bodyParams.thinkingEnabled;
  }

  if (thinkingBudget !== undefined) {
    if (!allowOverrides.includes('thinkingBudget')) {
      throw new HttpException(
        {
          code: ApiErrorCode.MODEL_NOT_ALLOWED,
          message: 'Parameter thinkingBudget is not allowed for this model alias',
          details: [{ field: 'params.thinkingBudget', allowOverrides }],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  return {
    // ... istniejące pola ...
    thinkingEnabled,
    thinkingBudget,
  };
}
```

**Commit:** `feat(chat): support thinkingEnabled and thinkingBudget in resolveProviderCallOptions`

---

### Krok C8.4: Provider interface — thinking w ProviderCallOptions i response

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `src/providers/interfaces/ai-provider.interface.ts`

**Akcja:**

```typescript
export interface ProviderCallOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  stop?: string | string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  responseFormat?: {
    type: 'text' | 'json_object';
    jsonSchema?: Record<string, unknown>;
  };
  // 🆕 C8.4
  thinkingEnabled?: boolean;
  thinkingBudget?: 'low' | 'medium' | 'high' | number;
}

export interface ProviderChatResponse {
  text: string;
  toolCalls?: ProviderToolCall[];
  stopReason?:
    | 'end_turn'
    | 'tool_use'
    | 'max_tokens'
    | 'stop_sequence'
    | 'pause_turn'
    | 'refusal'
    | 'tool_calls'
    | 'stop'
    | 'length'
    | 'content_filter';
  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  // 🆕 C8.4: Thinking content (when available)
  thinkingContent?: string;
}
```

**Commit:** `feat(providers): add thinking params to ProviderCallOptions and thinkingContent to response`

---

### Krok C8.5: Anthropic provider — thinking parameter (unified API)

**Status:** ✅ **WYKONANY 2026-06-13**

**Plik:** `src/providers/factories/create-anthropic-provider.ts`

**Akcja:** W `complete` i `stream` (Anthropic SDK TypeScript v2.x — Context7 verify 2026-06-13):

**⚠️ BREAKING CHANGE w Anthropic API:**
- **Stare API (≤2024):** `max_thinking_tokens` + beta headers `anthropic-beta: extended-thinking-2025-02-01`
- **Nowe API (2025+):** `thinking?: ThinkingConfigParam` (unified, bez beta headers!)
- **Dodatkowy:** `output_config.effort` (low/medium/high/xhigh/max) — niezależny od thinking

```typescript
export function createAnthropicProvider(
  apiKey: string,
  loggingService: LoggingService,
): AIProvider {
  const client = new Anthropic({ apiKey });
  const logger = loggingService.child({ module: 'AnthropicProvider' });

  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      const baseParams = {
        model: modelId,
        max_tokens: options?.maxOutputTokens ?? 1024,
        ...resolveAnthropicSamplingParams(options),
        stop_sequences: mapStopSequences(options?.stop),
        system: input.system,
        messages: mapTurnsToAnthropicMessages(input.messages),
        ...(options?.responseFormat?.type === 'json_object' &&
          options?.responseFormat?.jsonSchema !== undefined && {
            output_config: {
              format: {
                type: 'json_schema' as const,
                schema: {
                  ...options.responseFormat.jsonSchema,
                  additionalProperties:
                    options.responseFormat.jsonSchema.additionalProperties ??
                    false,
                },
              },
              // 🆕 C8.5: output_config.effort (niezależne od thinking!)
              ...(typeof options?.thinkingBudget === 'string' &&
                ['low', 'medium', 'high', 'xhigh', 'max'].includes(options.thinkingBudget) && {
                  effort: options.thinkingBudget as 'low' | 'medium' | 'high' | 'xhigh' | 'max',
                }),
            },
          }),
        // 🆕 C8.5: thinking parameter (unified API, bez beta headers!)
        ...(options?.thinkingEnabled && {
          thinking:
            typeof options.thinkingBudget === 'number'
              ? {
                  type: 'enabled' as const,
                  budget_tokens: Math.max(1024, options.thinkingBudget), // Min 1024 tokens
                  display: 'summarized' as const, // 'summarized' | 'omitted'
                }
              : {
                  type: 'adaptive' as const, // Adaptive mode (no budget_tokens)
                  display: 'summarized' as const,
                },
        }),
      };

      try {
        if (input.tools?.length) {
          const params = {
            ...baseParams,
            tools: mapToolsToAnthropic(input.tools),
            tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
          };
          const response = await client.messages.create(params);
          return parseAnthropicResponseWithTools(response);
        }

        const response = await client.messages.create(baseParams);

        let text = '';
        let thinkingContent = '';

        for (const content of response.content) {
          if (content.type === 'text') {
            text += content.text;
          }
          // 🆕 C8.5: Extract thinking content blocks
          if (content.type === 'thinking') {
            // Thinking blocks: { type: 'thinking', thinking: string }
            thinkingContent += (content as any).thinking || '';
          }
        }

        return {
          text,
          model: response.model,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
          ...(thinkingContent && { thinkingContent }),
        };
      } catch (error) {
        logger.warn('Error completing', {
          message: error instanceof Error ? error.message : String(error),
          model: modelId,
        });
        throw toHttpException(mapAnthropicSdkError(error));
      }
    },

    stream(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): StreamResult {
      let streamObject: ReturnType<typeof client.messages.stream> | undefined;

      async function* textStream(): AsyncIterable<string> {
        try {
          logger.debug('Streaming', { model: modelId });

          const streamParams = {
            model: modelId,
            max_tokens: options?.maxOutputTokens ?? 1024,
            ...resolveAnthropicSamplingParams(options),
            stop_sequences: mapStopSequences(options?.stop),
            system: input.system,
            messages: mapTurnsToAnthropicMessages(input.messages),
            stream: true,
            ...(input.tools?.length && {
              tools: mapToolsToAnthropic(input.tools),
              tool_choice: mapToolChoiceToAnthropic(input.toolChoice),
            }),
            ...(options?.responseFormat?.type === 'json_object' &&
              options?.responseFormat?.jsonSchema && {
                output_config: {
                  format: {
                    type: 'json_schema' as const,
                    schema: {
                      ...options.responseFormat.jsonSchema,
                      additionalProperties:
                        options.responseFormat.jsonSchema
                          .additionalProperties ?? false,
                    },
                  },
                  ...(typeof options?.thinkingBudget === 'string' &&
                    ['low', 'medium', 'high', 'xhigh', 'max'].includes(options.thinkingBudget) && {
                      effort: options.thinkingBudget as 'low' | 'medium' | 'high' | 'xhigh' | 'max',
                    }),
                },
              }),
            // 🆕 C8.5: thinking parameter (stream)
            ...(options?.thinkingEnabled && {
              thinking:
                typeof options.thinkingBudget === 'number'
                  ? {
                      type: 'enabled' as const,
                      budget_tokens: Math.max(1024, options.thinkingBudget),
                      display: 'summarized' as const,
                    }
                  : {
                      type: 'adaptive' as const,
                      display: 'summarized' as const,
                    },
            }),
          };

          streamObject = client.messages.stream(streamParams);

          for await (const event of streamObject) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              yield event.delta.text;
            }
            // 🆕 C8.5: Stream thinking content (opcjonalnie - może być pominięte w streaming)
            // Thinking content zwykle NIE jest streamowany w real-time (zwracane po zakończeniu)
          }
        } catch (error) {
          logger.warn('Error streaming', {
            message: error instanceof Error ? error.message : String(error),
            model: modelId,
          });
          throw toHttpException(mapAnthropicSdkError(error));
        }
      }

      async function getUsageMetadata() {
        if (!streamObject) return undefined;

        try {
          const finalMessage = await streamObject.finalMessage();
          return {
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            model: finalMessage.model,
          };
        } catch (error) {
          logger.warn('Error getting stream usage metadata', {
            message: error instanceof Error ? error.message : String(error),
          });
          return undefined;
        }
      }

      async function getFinalToolCalls() {
        if (!streamObject) return undefined;
        const finalMessage = await streamObject.finalMessage();
        return parseAnthropicResponseWithTools(finalMessage).toolCalls;
      }

      async function getStopReason() {
        if (!streamObject) return undefined;
        const finalMessage = await streamObject.finalMessage();
        const mapped = parseAnthropicResponseWithTools(finalMessage);
        return mapped.stopReason;
      }

      // 🆕 C8.5: Get thinking content from stream
      async function getThinkingContent() {
        if (!streamObject) return undefined;
        const finalMessage = await streamObject.finalMessage();
        let thinkingContent = '';
        for (const content of finalMessage.content) {
          if (content.type === 'thinking') {
            thinkingContent += (content as any).thinking || '';
          }
        }
        return thinkingContent || undefined;
      }

      return {
        textStream: textStream(),
        getUsageMetadata: getUsageMetadata,
        getFinalToolCalls: getFinalToolCalls,
        getStopReason: getStopReason,
        // 🆕 C8.5: Expose thinking content getter
        getThinkingContent: getThinkingContent,
      };
    },
  };
}
```

**Aktualizacja interface** (`src/providers/interfaces/ai-provider.interface.ts`):

```typescript
export interface StreamResult {
  textStream: AsyncIterable<string>;
  getUsageMetadata: () => Promise<
    | {
        inputTokens: number;
        outputTokens: number;
        model?: string;
      }
    | undefined
  >;
  getFinalToolCalls?: () => Promise<ProviderToolCall[] | undefined>;
  getStopReason?: () => Promise<ProviderChatResponse['stopReason']>;
  // 🆕 C8.5
  getThinkingContent?: () => Promise<string | undefined>;
}
```

**⚠️ UWAGI KRYTYCZNE:**

1. **Unified API:** Anthropic SDK TypeScript używa `thinking?: ThinkingConfigParam` (typ `ThinkingConfigEnabled | ThinkingConfigDisabled | ThinkingConfigAdaptive`)
2. **Budget min 1024:** Oficjalne SDK wymaga minimum 1024 tokens dla `budget_tokens`
3. **Bez beta headers:** Nowe unified API **NIE wymaga** `anthropic-beta` headers (automatyczne w SDK)
4. **output_config.effort:** Niezależne od `thinking` — może być używane razem (np. thinking enabled + effort=high)
5. **Thinking types:**
   - `ThinkingConfigEnabled`: `{ type: 'enabled', budget_tokens: number, display?: 'summarized' | 'omitted' }`
   - `ThinkingConfigAdaptive`: `{ type: 'adaptive', display?: 'summarized' | 'omitted' }` (brak budget_tokens)
   - `ThinkingConfigDisabled`: `{ type: 'disabled' }`

**Commit:** `feat(anthropic): support unified thinking parameter and output_config.effort`

---

### Krok C8.6: OpenAI provider — POZA ZAKRESEM (wymaga Responses API)

**Status:** ⚠️ **POZA ZAKRESEM C8** (wymaga nowego controllera/service)

**Uwaga (Context7 verify 2026-06-13):** OpenAI **ZMIENIŁ API** dla reasoning models:

**Stare API (o1/o3 models — deprecated):**
- Chat Completions API `/v1/chat/completions` z parametrem `reasoning_effort`
- Tylko dla modeli `o1-preview`, `o1-mini`, `o3-mini`

**Nowe API (gpt-5+ models — production):**
- **`/v1/responses`** endpoint (ZUPEŁNIE NOWE API!)
- Parametr: `reasoning: { effort: string, summary?: "auto" }` (nie `reasoning_effort`!)
- Effort levels: "none", "minimal", "low", "medium", "high", "xhigh"
- Modele: gpt-5.1+, gpt-5-pro, gpt-5.5, gpt-5.1-codex-max+
- Response shape: `{ output_text, status, incomplete_details, reasoning_summary? }`

**⚠️ PROBLEM:** Gateway **NIE implementuje** `/v1/responses` endpoint! Implementacja wymaga:
1. Nowy controller `/api/v1/responses` (lub rozszerzenie istniejącego)
2. Nowy request/response DTO (inny shape niż Chat Completions)
3. Nowy service layer dla Responses API
4. Mapowanie reasoning summary → `thinkingContent`

**ALTERNATYWA DLA C8:**
- Fasada OpenAI (`/v1/chat/completions`) może **przyjmować** `reasoning_effort` dla kompatybilności
- Mapping do gateway `thinkingEnabled` / `thinkingBudget`
- **ALE:** Gateway provider **NIE MOŻE użyć** tego parametru (brak implementacji Responses API)
- Efekt: Parametr akceptowany, ale **ignorowany** przez backend (nie jest przekazywany do OpenAI)

**Zalecenie:**
1. **Faza C8:** Pominąć implementację OpenAI provider thinking (dokumentować jako "unsupported")
2. **Przyszłość:** Osobna faza dla implementacji `/v1/responses` endpoint (poza zakresem kontraktów gateway)

**Commit:** `docs(openai): document reasoning API requires /v1/responses endpoint (future work)`

---

### Krok C8.11: Google Gemini provider — ThinkingConfig

**Status:** ⏳ **Planowany**

**Plik:** `src/providers/factories/create-google-provider.ts`

**Akcja:** W `complete` i `stream` (Google Generative AI SDK — Context7 verify 2026-06-13):

**⚠️ OGRANICZENIE:** ThinkingConfig wspierane **TYLKO od Gemini 3.0+**. Wcześniejsze modele (2.5, 2.0, 1.5, 1.0) zwracają **błąd**.

```typescript
export function createGoogleProvider(
  apiKey: string,
  loggingService: LoggingService,
): AIProvider {
  const genAI = new GoogleGenerativeAI(apiKey);
  const logger = loggingService.child({ module: 'GoogleProvider' });

  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      // 🆕 C8.11: Validation — ThinkingConfig tylko dla Gemini 3.0+
      if (options?.thinkingEnabled && !modelId.startsWith('gemini-3')) {
        logger.warn('ThinkingConfig requested but model does not support it', {
          model: modelId,
          note: 'ThinkingConfig requires Gemini 3.0+',
        });
        // Opcja 1: Throw error
        // throw new Error(`ThinkingConfig not supported for model ${modelId} (Gemini 3.0+ required)`);
        // Opcja 2: Ignore silently (preferowane dla backward compatibility)
        // Continue without thinkingConfig
      }

      const generationConfig: GenerationConfig = {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxOutputTokens,
        topP: options?.topP,
        topK: options?.topK,
        stopSequences: Array.isArray(options?.stop) ? options.stop : options?.stop ? [options.stop] : undefined,
        ...(options?.seed !== undefined && { seed: options.seed }),
        ...(options?.responseFormat?.type === 'json_object' && {
          responseMimeType: 'application/json',
          ...(options.responseFormat.jsonSchema && {
            responseSchema: options.responseFormat.jsonSchema,
          }),
        }),
        // 🆕 C8.11: ThinkingConfig (Gemini 3.0+ only)
        ...(options?.thinkingEnabled &&
          modelId.startsWith('gemini-3') && {
            thinkingConfig: {
              includeThoughts: true, // Zwracaj thoughts w response
              ...(typeof options.thinkingBudget === 'number'
                ? {
                    thinkingBudget: options.thinkingBudget, // Integer: liczba thought tokens
                    thinkingLevel: 'HIGH' as const, // Default HIGH gdy podano integer
                  }
                : typeof options.thinkingBudget === 'string'
                  ? {
                      thinkingLevel: mapThinkingBudgetToGeminiLevel(options.thinkingBudget), // Enum: MINIMAL, LOW, MEDIUM, HIGH
                      // thinkingBudget nie podawane gdy używamy enum
                    }
                  : {
                      thinkingLevel: 'HIGH' as const, // Default gdy thinkingEnabled=true bez budget
                    }),
            },
          }),
      };

      const model = genAI.getGenerativeModel({
        model: modelId,
        generationConfig,
        ...(input.system && { systemInstruction: input.system }),
        ...(input.tools?.length && {
          tools: [{ functionDeclarations: mapToolsToGoogle(input.tools) }],
        }),
      });

      try {
        const result = await model.generateContent({
          contents: mapTurnsToGoogle(input.messages),
          ...(input.toolChoice && {
            toolConfig: mapToolChoiceToGoogle(input.toolChoice),
          }),
        });

        const response = result.response;
        const text = response.text();

        // 🆕 C8.11: Extract thinking content (jeśli includeThoughts=true)
        // Struktura thoughts w response Google — do weryfikacji w runtime
        let thinkingContent: string | undefined = undefined;
        if (options?.thinkingEnabled && modelId.startsWith('gemini-3')) {
          // Google zwraca thoughts w specjalnej strukturze response
          // TODO: Verify exact structure in Google SDK response
          const thoughts = (response as any).thoughts || (response as any).thinkingContent;
          if (thoughts) {
            thinkingContent = Array.isArray(thoughts) ? thoughts.join('\n') : String(thoughts);
          }
        }

        return {
          text,
          model: response.model,
          usage: {
            inputTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
          },
          ...(thinkingContent && { thinkingContent }),
        };
      } catch (error) {
        logger.warn('Error completing', {
          message: error instanceof Error ? error.message : String(error),
          model: modelId,
        });
        throw toHttpException(mapGoogleSdkError(error));
      }
    },

    // stream() — analogicznie, dodać thinkingConfig do generationConfig
  };
}

// 🆕 C8.11: Helper function
function mapThinkingBudgetToGeminiLevel(
  budget: string,
): 'THINKING_LEVEL_UNSPECIFIED' | 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' {
  // Gateway unified budget → Gemini enum
  const map: Record<string, 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH'> = {
    none: 'MINIMAL',
    minimal: 'MINIMAL',
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    xhigh: 'HIGH', // Gemini nie ma xhigh → mapuj na HIGH
    max: 'HIGH', // Gemini nie ma max → mapuj na HIGH
  };
  return map[budget] ?? 'HIGH'; // Default HIGH
}
```

**⚠️ UWAGI KRYTYCZNE:**

1. **Gemini 3.0+ ONLY:** ThinkingConfig dostępne od Gemini 3.0+ (wcześniejsze zwracają błąd)
2. **Validation:** Kod sprawdza `modelId.startsWith('gemini-3')` przed dodaniem `thinkingConfig`
3. **Trzy parametry:**
   - `includeThoughts: boolean` (zawsze true gdy thinking enabled)
   - `thinkingBudget: integer` (liczba thought tokens) **LUB**
   - `thinkingLevel: enum` (MINIMAL, LOW, MEDIUM, HIGH)
4. **Mapping:**
   - `thinkingBudget` number → `thinkingBudget` integer + `thinkingLevel: HIGH`
   - `thinkingBudget` string → `thinkingLevel` enum (bez `thinkingBudget` integer)
5. **Default:** HIGH (zalecany dla Gemini 3.0+)
6. **Thoughts w response:** Struktura do weryfikacji w runtime (Google docs nie pokazują szczegółów)

**Weryfikacja:**
- Gemini 3.0-flash + `thinkingEnabled: true` → `thinkingConfig` w SDK call
- Gemini 2.5-flash + `thinkingEnabled: true` → warning w logs, bez `thinkingConfig` (graceful degradation)
- Response z thoughts → `thinkingContent` field wypełnione

**Commit:** `feat(google): support ThinkingConfig for Gemini 3.0+ models`

---

### Krok C8.7: Gateway response DTO — thinkingContent

**Status:** ⏳ **Planowany**

**Plik:** `src/chat/dto/chat-response.dto.ts`

**Akcja:**

```typescript
export class ChatResponseDto {
  // ✅ Istniejące pola ...

  // 🆕 C8.7: Thinking content (when available from provider)
  @ApiPropertyOptional({
    description:
      'Extended thinking/reasoning content from model (Anthropic extended_thinking). Not streamed in real-time.',
    example: 'Let me think about this step by step...',
  })
  @IsOptional()
  @IsString()
  thinkingContent?: string;
}
```

**Commit:** `feat(chat): add thinkingContent to ChatResponseDto`

---

### Krok C8.8: Chat service — propagacja thinking content

**Status:** ⏳ **Planowany**

**Plik:** `src/chat/chat-provider-call.service.ts` (lub podobny)

**Akcja:** W metodzie `completeOnce` / `streamOnce`:

```typescript
// Fragment (pseudo-kod):
const providerResult = await provider.complete(input, modelId, options);

const response: ChatResponseDto = {
  id: generateId(),
  model: providerResult.model || modelId,
  output: {
    text: providerResult.text,
  },
  finishReason: mapStopReason(providerResult.stopReason),
  usage: providerResult.usage
    ? {
        inputTokens: providerResult.usage.inputTokens,
        outputTokens: providerResult.usage.outputTokens,
      }
    : undefined,
  // 🆕 C8.8: Propagate thinking content
  thinkingContent: providerResult.thinkingContent,
};
```

**Stream:** W `streamOnce`:

```typescript
// Fragment:
const streamResult = provider.stream(input, modelId, options);

// ... consume textStream ...

// Po zakończeniu streamu:
const thinkingContent = streamResult.getThinkingContent
  ? await streamResult.getThinkingContent()
  : undefined;

// Dodaj do final response
response.thinkingContent = thinkingContent;
```

**Commit:** `feat(chat): propagate thinkingContent from provider to gateway response`

---

### Krok C8.9: Fasada OpenAI — reasoning_effort (akceptowany, nie działa)

**Status:** ⏳ **Planowany** (kompatybilność API, bez działającej implementacji)

**Plik:** `src/integrations/openai/dtos/openai-chat-completion-request.dto.ts`

**Akcja (Context7 verify 2026-06-13):**

**⚠️ WAŻNE:** OpenAI reasoning wymaga nowego `/v1/responses` endpoint (NIE `/v1/chat/completions`). Gateway **NIE implementuje** tego endpointu. Ten krok dodaje parametr `reasoning_effort` dla **kompatybilności API**, ale **nie będzie działać** dopóki nie zostanie zaimplementowane Responses API.

```typescript
export class OpenAiChatCompletionRequestDto {
  // ✅ Istniejące pola ...

  // 🆕 C8.9: reasoning_effort (dla kompatybilności, nie działa bez /v1/responses)
  @ApiPropertyOptional({
    description:
      'Reasoning effort for OpenAI reasoning models. ' +
      '⚠️ UWAGA: Gateway nie wspiera OpenAI /v1/responses API — parametr jest akceptowany dla kompatybilności, ale NIE działa. ' +
      'Wymaga implementacji nowego endpoint /v1/responses (poza zakresem). ' +
      'Deprecated: dla starych modeli o1-preview, o1-mini, o3-mini (tylko Chat Completions). ' +
      'Production: gpt-5+ models wymagają nowego API (/v1/responses).',
    enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
    example: 'medium',
    deprecated: true, // Marked as deprecated — requires new API
  })
  @IsOptional()
  @IsString()
  @IsIn(['none', 'minimal', 'low', 'medium', 'high', 'xhigh'])
  reasoning_effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}
```

**Mapper request** (`src/integrations/openai/mappers/openai-request.mapper.ts`):

```typescript
// Fragment:
export function mapOpenAiRequestToGateway(
  body: OpenAiChatCompletionRequestDto,
): ChatRequestDto {
  const dto: ChatRequestDto = {
    modelAlias: body.model,
    messages: mapMessagesToGateway(body.messages),
    params: {
      temperature: body.temperature,
      maxOutputTokens: body.max_tokens,
      topP: body.top_p,
      stop: body.stop,
      frequencyPenalty: body.frequency_penalty,
      presencePenalty: body.presence_penalty,
      seed: body.seed,
      // ... responseFormat (C3) ...
      // 🆕 C8.9: Reasoning effort → thinking params (mapowane, ale nie działa bez Responses API)
      ...(body.reasoning_effort && {
        thinkingEnabled: true,
        thinkingBudget: body.reasoning_effort, // Mapowane na gateway params
      }),
    },
  };

  return dto;
}
```

**⚠️ UWAGI KRYTYCZNE:**

1. **Parametr akceptowany:** DTO przyjmuje `reasoning_effort` dla kompatybilności z OpenAI Chat Completions API
2. **Mapowanie działa:** Mapper przekształca `reasoning_effort` → gateway `thinkingEnabled` / `thinkingBudget`
3. **Backend NIE działa:** Gateway provider **NIE MOŻE użyć** tego parametru (brak implementacji `/v1/responses` endpoint)
4. **Efekt:** Request z `reasoning_effort` jest akceptowany, ale parametr jest **ignorowany** przez backend
5. **Deprecated:** Oznaczony jako deprecated w Swagger (wymaga nowego API)
6. **Dokumentacja:** Należy jasno dokumentować że parametr nie działa (wymaga przyszłej implementacji)

**Commit:** `feat(openai): add reasoning_effort to DTO for API compatibility (non-functional without /v1/responses)`

---

### Krok C8.10: Fasada Anthropic — thinking + output_config (unified API)

**Status:** ⏳ **Planowany**

**Plik:** `src/integrations/anthropic/dtos/anthropic-messages-request.dto.ts`

**Akcja (Context7 verify 2026-06-13 — nowe unified API):**

**⚠️ BREAKING CHANGE:** Anthropic zmienił API — `max_thinking_tokens` **deprecated**, używaj `thinking` parameter (bez beta headers!).

```typescript
export class AnthropicMessagesRequestDto {
  // ✅ Istniejące pola ...

  // 🆕 C8.10a: thinking parameter (unified API, bez beta headers)
  @ApiPropertyOptional({
    description:
      'Extended thinking configuration (Anthropic unified API). ' +
      'Use thinking.budget_tokens (integer, min 1024) for token budget, OR omit for adaptive mode. ' +
      'Requires Claude Opus 4.6+ or Sonnet 3.7+. ' +
      'Example: { "type": "enabled", "budget_tokens": 5000, "display": "summarized" } OR { "type": "adaptive", "display": "summarized" }',
    type: 'object',
    properties: {
      type: { enum: ['enabled', 'disabled', 'adaptive'] },
      budget_tokens: { type: 'number', minimum: 1024 },
      display: { enum: ['summarized', 'omitted'] },
    },
    example: { type: 'enabled', budget_tokens: 5000, display: 'summarized' },
  })
  @IsOptional()
  @IsObject()
  thinking?: {
    type: 'enabled' | 'disabled' | 'adaptive';
    budget_tokens?: number; // Min 1024 dla type='enabled'
    display?: 'summarized' | 'omitted'; // Default: summarized
  };

  // 🆕 C8.10b: output_config.effort (niezależne od thinking!)
  // Rozszerzenie istniejącego output_config z C3.10a
  @ApiPropertyOptional({
    description:
      'Output configuration including format (JSON schema) and effort level. ' +
      'Effort: "low"|"medium"|"high"|"xhigh"|"max" controls reasoning depth (independent of thinking parameter). ' +
      'Can be used together with thinking for maximum reasoning.',
    type: 'object',
    properties: {
      format: {
        type: 'object',
        properties: {
          type: { enum: ['json_schema'] },
          schema: { type: 'object' },
        },
      },
      effort: { enum: ['low', 'medium', 'high', 'xhigh', 'max'] },
    },
    example: { effort: 'high' },
  })
  @IsOptional()
  @IsObject()
  output_config?: {
    format?: {
      type: 'json_schema';
      schema: Record<string, unknown>;
    };
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'; // 🆕 C8.10b
  };
}
```

**Mapper request** (`src/integrations/anthropic/mappers/anthropic-request.mapper.ts`):

```typescript
// Fragment:
export function mapAnthropicRequestToGateway(
  body: AnthropicMessagesRequestDto,
): ChatRequestDto {
  const dto: ChatRequestDto = {
    modelAlias: body.model,
    messages: mapAnthropicMessagesToGateway(body.messages),
    params: {
      temperature: body.temperature,
      maxOutputTokens: body.max_tokens,
      topP: body.top_p,
      stop: body.stop_sequences,
      // ... (C6: topK) ...
      // 🆕 C8.10: Thinking (unified API)
      ...(body.thinking && body.thinking.type !== 'disabled' && {
        thinkingEnabled: true,
        // Mapuj budget_tokens na thinkingBudget (gdy dostępne)
        ...(body.thinking.type === 'enabled' && body.thinking.budget_tokens && {
          thinkingBudget: body.thinking.budget_tokens,
        }),
        // Adaptive mode → bez explicit budget (gateway użyje providera defaults)
      }),
      // 🆕 C8.10b: output_config.effort → thinkingBudget (gdy thinking NIE jest włączone)
      // Effort może być używane NIEZALEŻNIE od thinking
      ...(body.output_config?.effort &&
        !body.thinking && {
          // Jeśli thinking NIE jest włączone, effort → thinkingBudget string
          thinkingBudget: body.output_config.effort,
        }),
    },
    ...(body.system && { /* system handling */ }),
  };

  return dto;
}
```

**Response mapper** (`src/integrations/anthropic/mappers/anthropic-response.mapper.ts`):

```typescript
// Fragment:
export function mapGatewayChatResponseToAnthropic(
  result: ChatResponseDto,
): AnthropicMessagesResponse {
  const contentBlocks: Array<{ type: string; [key: string]: any }> = [];

  // 🆕 C8.10: Add thinking content block if present (przed text!)
  if (result.thinkingContent) {
    contentBlocks.push({
      type: 'thinking',
      thinking: result.thinkingContent,
    });
  }

  // Text content block
  contentBlocks.push({
    type: 'text',
    text: result.output.text,
  });

  return {
    id: result.id,
    type: 'message',
    role: 'assistant',
    content: contentBlocks,
    model: result.model,
    stop_reason: mapStopReason(result.finishReason),
    stop_sequence: null,
    usage: {
      input_tokens: result.usage?.inputTokens ?? 0,
      output_tokens: result.usage?.outputTokens ?? 0,
      cache_creation_input_tokens: result.usageDetails?.promptCacheCreationTokens,
      cache_read_input_tokens: result.usageDetails?.promptCacheHitTokens,
    },
  };
}
```

**⚠️ UWAGI KRYTYCZNE:**

1. **Unified API:** Anthropic używa `thinking` parameter (nie `max_thinking_tokens`!)
2. **Bez beta headers:** SDK automatycznie obsługuje thinking (bez `anthropic-beta` headers)
3. **Trzy typy thinking:**
   - `{ type: 'enabled', budget_tokens: number }` — explicit budget (min 1024)
   - `{ type: 'adaptive' }` — adaptive mode (brak budget_tokens)
   - `{ type: 'disabled' }` — wyłączone
4. **output_config.effort:** Niezależne od `thinking` — może być używane razem (np. thinking enabled + effort=high)
5. **Thinking blocks w response:** Zwracane jako `{ type: 'thinking', thinking: string }` w content array (przed text)

**Commit:** `feat(anthropic): support unified thinking parameter and output_config.effort in facade`

---

### Krok C8.12: Dokumentacja — thinking mode usage

**Status:** ⏳ **Planowany**

**Plik:** `docs/dokumentacja_api.md`

**Akcja:** Dodać sekcję **Extended Thinking Mode**:

```markdown
## Extended Thinking Mode

Gateway wspiera "extended thinking" dla modeli z głębokim rozumowaniem (reasoning) — Anthropic Claude, Google Gemini 3.0+. OpenAI wymaga nowego API (obecnie nieobsługiwane).

### Provider support matrix

| Provider | API | Wspierane modele | Status w Gateway | Thinking content w response |
|----------|-----|------------------|------------------|---------------------------|
| **Anthropic** | `thinking` parameter | Claude Opus 4.6+, Sonnet 3.7+ | ✅ **Pełne wsparcie** | ✅ Thinking blocks |
| **Google Gemini** | `thinkingConfig` | Gemini 3.0+ | ✅ **Pełne wsparcie** | ✅ Thoughts (gdy `includeThoughts=true`) |
| **OpenAI** | `/v1/responses` (NOWE API) | gpt-5.1+, gpt-5-pro | ⚠️ **Nieobsługiwane** (wymaga impl. nowego endpoint) | ❌ Brak |

### Włączanie thinking mode

**Gateway native API:**

```json
POST /api/v1/chat
{
  "modelAlias": "chat-reasoning",
  "messages": [{ "role": "user", "content": "Solve this complex problem..." }],
  "params": {
    "thinkingEnabled": true,
    "thinkingBudget": "medium"
  }
}
```

**OpenAI-compatible facade (NON-FUNCTIONAL):**

```json
POST /v1/chat/completions
{
  "model": "gpt-5.1",
  "messages": [{ "role": "user", "content": "..." }],
  "reasoning_effort": "high"
}
```

⚠️ **UWAGA:** Parametr `reasoning_effort` jest **akceptowany dla kompatybilności**, ale **NIE działa** (wymaga implementacji `/v1/responses` endpoint — poza zakresem).

**Anthropic-compatible facade:**

```json
POST /v1/messages
{
  "model": "claude-opus-4-8",
  "messages": [{ "role": "user", "content": "..." }],
  "thinking": {
    "type": "enabled",
    "budget_tokens": 5000,
    "display": "summarized"
  },
  "output_config": {
    "effort": "high"
  }
}
```

**Google Gemini (przez native API):**

```json
POST /api/v1/chat
{
  "modelAlias": "gemini-3-flash",
  "messages": [{ "role": "user", "content": "..." }],
  "params": {
    "thinkingEnabled": true,
    "thinkingBudget": 2000
  }
}
```

### Parametry

**Gateway unified params:**
- **`thinkingEnabled`** (boolean): Włącza thinking mode
- **`thinkingBudget`** (string | number): Budżet/intensywność thinking:
  - **String:** `"none"` | `"minimal"` | `"low"` | `"medium"` | `"high"` | `"xhigh"` | `"max"`
  - **Number:** Integer token budget (provider-specific)

**Vendor-specific mapping:**

| Gateway param | Anthropic API | Google Gemini API | OpenAI (unsupported) |
|---------------|---------------|-------------------|----------------------|
| `thinkingEnabled: true` | `thinking: { type: 'enabled' \| 'adaptive' }` | `thinkingConfig: { includeThoughts: true }` | `/v1/responses` (nie impl.) |
| `thinkingBudget: number` | `thinking.budget_tokens` (min 1024) | `thinkingConfig.thinkingBudget` | N/A |
| `thinkingBudget: "low"` | `output_config.effort: "low"` | `thinkingConfig.thinkingLevel: "LOW"` | `reasoning.effort: "low"` |
| `thinkingBudget: "high"` | `output_config.effort: "high"` | `thinkingConfig.thinkingLevel: "HIGH"` | `reasoning.effort: "high"` |

### Response

Gdy model używa thinking mode, response zawiera dodatkowe pole:

```json
{
  "id": "chat-abc123",
  "output": {
    "text": "Based on my analysis..."
  },
  "thinkingContent": "Let me break this down step by step... [Anthropic/Gemini thoughts]",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 2500
  }
}
```

**Provider-specific notes:**
- **Anthropic:** Thinking blocks zwracane jako `{ type: 'thinking', thinking: string }` w content array
- **Google Gemini:** Thoughts zwracane gdy `includeThoughts: true` (struktura do weryfikacji)
- **OpenAI:** Nieobsługiwane (wymaga `/v1/responses` API)

**Uwagi:**
- Thinking mode **znacząco zwiększa** latencję i koszty (2-10x więcej tokenów)
- Domyślnie **wyłączone** — wymagane `capabilities.thinking` + `allowOverrides` w config YAML
- **Gemini 3.0+ ONLY** — wcześniejsze modele (2.5, 2.0, 1.5) zwracają błąd przy `thinkingConfig`

### Konfiguracja aliasu

**Anthropic (pełne wsparcie):**

```yaml
models:
  chat-reasoning-anthropic:
    provider: anthropic
    modelId: claude-opus-4-8
    capabilities:
      thinking: true  # Wymagane dla thinking mode
    policy:
      params:
        allowOverrides:
          - thinkingEnabled
          - thinkingBudget
```

**Google Gemini 3.0+ (pełne wsparcie):**

```yaml
models:
  chat-reasoning-gemini:
    provider: google
    modelId: gemini-3.0-flash
    capabilities:
      thinking: true  # Wymagane dla thinking mode
    policy:
      params:
        allowOverrides:
          - thinkingEnabled
          - thinkingBudget
```

**OpenAI (nieobsługiwane):**

```yaml
models:
  chat-reasoning-openai:
    provider: openai
    modelId: gpt-5.1
    capabilities:
      thinking: false  # ⚠️ NIE wspierane (wymaga /v1/responses API)
    # reasoning_effort w facade jest akceptowany ale nie działa
```
```

**Commit:** `docs(api): add extended thinking mode documentation`

---

### Krok C8.12: Testy jednostkowe — thinking validation

**Status:** ⏳ **Planowany**

**Plik:** `src/chat/helpers/resolve-provider-call-options.spec.ts`

**Akcja:**

```typescript
describe('resolveProviderCallOptions - thinking params', () => {
  it('should merge thinkingEnabled from defaults and overrides', () => {
    const result = resolveProviderCallOptions(
      {
        defaults: { thinkingEnabled: false },
        allowOverrides: ['thinkingEnabled'],
      },
      { thinkingEnabled: true },
    );

    expect(result.thinkingEnabled).toBe(true);
  });

  it('should throw MODEL_NOT_ALLOWED when thinkingEnabled not in allowOverrides', () => {
    expect(() => {
      resolveProviderCallOptions(
        {
          defaults: {},
          allowOverrides: ['temperature'],
        },
        { thinkingEnabled: true },
      );
    }).toThrow(HttpException);
  });

  it('should accept string thinkingBudget (low/medium/high)', () => {
    const result = resolveProviderCallOptions(
      {
        defaults: {},
        allowOverrides: ['thinkingEnabled', 'thinkingBudget'],
      },
      { thinkingEnabled: true, thinkingBudget: 'high' },
    );

    expect(result.thinkingBudget).toBe('high');
  });

  it('should accept number thinkingBudget (Anthropic max_thinking_tokens)', () => {
    const result = resolveProviderCallOptions(
      {
        defaults: {},
        allowOverrides: ['thinkingEnabled', 'thinkingBudget'],
      },
      { thinkingEnabled: true, thinkingBudget: 5000 },
    );

    expect(result.thinkingBudget).toBe(5000);
  });
});
```

**Commit:** `test(chat): add unit tests for thinking params validation`

---

### Krok C8.13: Testy e2e — thinking mode (opcjonalne)

**Status:** ⏳ **Planowany**

**Plik:** `test/chat-thinking-mode.e2e-spec.ts` **(NOWY)**

**Akcja:**

```typescript
describe('Chat API with thinking mode (e2e)', () => {
  it('should enable thinking mode with thinkingEnabled', () => {
    return request(app.getHttpServer())
      .post('/api/v1/chat')
      .set('X-Gateway-Key', process.env.GATEWAY_KEY_TEST)
      .send({
        modelAlias: 'chat-reasoning',
        messages: [
          {
            role: 'user',
            content: 'Explain quantum entanglement step by step',
          },
        ],
        params: {
          thinkingEnabled: true,
          thinkingBudget: 'medium',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.output.text).toBeDefined();
        // Anthropic może zwrócić thinkingContent
        if (res.body.thinkingContent) {
          expect(typeof res.body.thinkingContent).toBe('string');
        }
      });
  });

  it('should reject thinking mode when not allowed in config', () => {
    return request(app.getHttpServer())
      .post('/api/v1/chat')
      .set('X-Gateway-Key', process.env.GATEWAY_KEY_TEST)
      .send({
        modelAlias: 'chat-default', // Alias bez allowOverrides: thinkingEnabled
        messages: [{ role: 'user', content: 'Test' }],
        params: {
          thinkingEnabled: true,
        },
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.code).toBe(ApiErrorCode.MODEL_NOT_ALLOWED);
      });
  });
});
```

**Commit:** `test(e2e): add thinking mode e2e tests`

---

### Krok C8.14: Aktualizacja README — thinking mode feature

**Status:** ⏳ **Planowany**

**Plik:** `README.md`

**Akcja:** Sekcja **Features** — dodać:

```markdown
## Features (zaktualizowane po C8)

- **Advanced generation params**: nucleus sampling (topP), stop sequences, frequency/presence penalties, seed
- **Structured outputs**: JSON mode (native OpenAI, Anthropic)
- **Extended usage tracking**: prompt cache tokens (Anthropic cost optimization)
- **Metadata propagation**: user tracking, analytics
- **🆕 Extended Thinking Mode**: Deep reasoning with OpenAI o1/o3 (reasoning_effort) and Anthropic extended_thinking (max_thinking_tokens)
  - Configurable thinking budget (low/medium/high for OpenAI, token budget for Anthropic)
  - Thinking content extraction (Anthropic only)
  - Opt-in per model alias with `capabilities.thinking`
```

**Commit:** `docs(readme): add extended thinking mode to features`

---

## 📝 Uwagi końcowe — Faza C8

**Vendor support:**
- **OpenAI:** Modele `o1-preview`, `o1-mini`, `o3-mini` — parametr `reasoning_effort` ("low", "medium", "high"); reasoning content wbudowany w response text
- **Anthropic:** Claude 3.7 Sonnet (2025-02-19+) — parametr `max_thinking_tokens` (liczba); thinking content w osobnym bloku `thinking`
- **Google:** Brak natywnego wsparcia extended thinking (na razie)

**Cost implications:**
- Thinking mode **2-10x więcej tokenów** niż standardowe completion (głównie output tokens)
- Latencja: **10-60 sekund** dla złożonych zadań reasoning
- **Domyślnie wyłączone** w config (opt-in per model alias)

**Use cases (wysokie ROI):**
- Złożone zadania matematyczne, logiczne, programistyczne
- Multi-step reasoning (chain-of-thought wymagający głębokiej analizy)
- Code review, security analysis, complex debugging
- Scientific reasoning, data analysis

**Backward compatibility:**
- Wszystkie pola thinking są **opcjonalne**
- Request bez `thinkingEnabled` = identyczne zachowanie jak przed C8
- Aliasy bez `capabilities.thinking` lub `allowOverrides: ['thinkingEnabled']` = thinking mode **zablokowany**

**Testing priorities:**
- Validation `thinkingEnabled` / `thinkingBudget`
- Anthropic `extended-thinking` beta headers
- OpenAI `reasoning_effort` dla modeli o1
- Thinking content extraction (Anthropic)

---

## 📁 Docelowa struktura plików (po C0-C8)

```
src/
├── chat/
│   ├── dto/
│   │   ├── chat-params.dto.ts                 # C1.1, C2.1, C3.2, C6.1, C8.1 UPDATE (topP, stop, penalties, seed, responseFormat, topK, thinkingEnabled, thinkingBudget)
│   │   ├── response-format.dto.ts             # C3.1 NEW
│   │   ├── chat-request.dto.ts                # C5.1 UPDATE (metadata)
│   │   └── chat-response.dto.ts               # C4.1, C8.7 UPDATE (usageDetails, systemFingerprint, thinkingContent)
│   └── helpers/
│       └── resolve-provider-call-options.ts   # C1.3, C2.3, C3.4, C6.3, C8.3 UPDATE (+ rozszerz OVERRIDE_KEYS)
├── providers/
│   ├── interfaces/
│   │   └── ai-provider.interface.ts           # C1.4, C2.4, C3.5, C4.2, C5.2, C6.4, C8.4 UPDATE (thinkingEnabled, thinkingBudget, thinkingContent in response)
│   ├── factories/
│   │   ├── create-anthropic-provider.ts       # C1.5, C3.6, C5.4, C6.5, C8.5 UPDATE (extended_thinking headers, max_thinking_tokens, thinking content)
│   │   └── create-google-provider.ts          # C1.6, C3.7, C6.5 UPDATE
│   ├── anthropic/
│   │   └── anthropic-tools.mapper.ts          # C4.3, C8.5 UPDATE (usage cache tokens, thinking content parsing)
│   └── google/
│       └── google-tools.mapper.ts             # (po T7.1 z tools_implementation.md)
├── integrations/
│   ├── openai/
│   │   ├── dtos/
│   │   │   ├── openai-chat-completion-request.dto.ts  # C1.7, C2.6, C8.9 UPDATE (stop, seed, reasoning_effort)
│   │   │   │                                          # ⚠️ top_p, penalties JUŻ ISTNIEJĄ (bez zmian w DTO)
│   │   │   └── openai-chat-completion-response.dto.ts # C4.5 UPDATE (system_fingerprint)
│   │   └── mappers/
│   │       ├── openai-request.mapper.ts       # C1.8, C8.9 UPDATE (top_p, stop, penalties, seed, reasoning_effort → thinking params)
│   │       └── openai-response.mapper.ts      # C4.5 UPDATE
│   └── anthropic/
│       ├── dtos/
│       │   ├── anthropic-messages-request.dto.ts      # C1.9, C5.7, C6.7, C8.10 UPDATE (max_thinking_tokens)
│       │   └── anthropic-messages-response.dto.ts     # C4.6, C8.10 UPDATE (cache tokens, thinking content blocks)
│       └── mappers/
│           ├── anthropic-request.mapper.ts    # C1.10, C5.7, C6.7, C8.10 UPDATE (thinking params mapping)
│           └── anthropic-response.mapper.ts   # C4.6, C8.10 UPDATE (thinking content in response)
├── common/
│   └── validators/
│       ├── is-string-or-array-of-strings.validator.ts # C1.1a NEW
│       └── is-thinking-budget.validator.ts    # C8.1 NEW
└── config/
    └── configuration.ts                       # C1.2, C2.2, C8.2 UPDATE (Zod schema + thinking capability)

gateway.config.yaml                            # C1.2, C2.2, C3.3, C6.2, C8.2 UPDATE (thinking capability + params)
```

**⚠️ Uwaga po audycie:**
- OpenAI DTO (`openai-chat-completion-request.dto.ts`): `top_p`, `presence_penalty`, `frequency_penalty` **już istnieją** → tylko dodać `stop`, `seed`, `reasoning_effort` (C8)
- OpenAI mapper (`openai-request.mapper.ts`): **brak mapowania** dla istniejących pól → C1.8 dodaje mapowanie wszystkich 5 pól (top_p, stop, penalties, seed) + C8.9 reasoning_effort

---

## 🧭 Kolejność pracy

1. **C0** — Baseline audit (1-2h) — ✅ **WYKONANY 2026-06-10**
2. **C1** — topP + stop (1.5-2.5h; kluczowe parametry; **C1.8 połączony z C2.7**) — ✅ **WYKONANY 2026-06-10**
3. **C3** — responseFormat / JSON mode (3-4h; równolegle z C2 lub po) — ✅ **WYKONANY 2026-06-12**
4. **C2** — penalties + seed (1.5-2h; medium priority; **C2.7 połączony z C1.8**) — ✅ **WYKONANY 2026-06-10**
5. **C4** — usageDetails + systemFingerprint (2-3h; po T5A.4)
6. **C5** — metadata (1-2h; nice-to-have)
7. **C6** — topK + max_completion_tokens (1h; provider-specific)
8. **C8** — Extended thinking mode (3-5h; po C1, C4; reasoning models OpenAI o1/Anthropic extended_thinking)
9. **C7** — Docs + testy (2-3h; po C1-C6, C8)

**⚠️ Uwaga:** C1.8 i C2.7 **połączone** — mapowanie wszystkich parametrów OpenAI (top_p, stop, penalties, seed) w jednym kroku dla spójności.

**Testy integracyjne/e2e:**
- Cursor: `topP`, `stop`, `frequency_penalty`, `response_format` (JSON mode), `thinkingEnabled` (C8)
- Claude Code: `top_p`, `top_k`, `stop_sequences`, `max_thinking_tokens` (C8)
- OpenAI o1: `reasoning_effort` (C8)
- Natywne API gateway: wszystkie nowe pola w `params` (C1-C8)

---

## Uwagi końcowe

1. **Tool calling (T0-T8) jest prerequisite** — większość rozszerzeń korzysta z kodu z faz tool calling (validation params, response mapping).
2. **Gateway-first approach zachowany** — dodajemy tylko parametry wysokiego ROI, vendor-agnostic gdzie możliwe.
3. **Backward compatibility** — wszystkie nowe pola opcjonalne; request bez nich = identyczne zachowanie jak przed C1-C8.
4. **Provider-agnostic JSON mode** — wszystkie providery używają natywnych mechanizmów (OpenAI `response_format`, Anthropic `output_config`, Google `responseMimeType`); penalties/seed — provider-specific (tylko OpenAI/Google).
5. **Cost optimization** — `usageDetails.promptCacheHitTokens` (Anthropic cache = 90% discount) daje visibility do optymalizacji kosztów.
6. **Extended thinking mode (C8 — przepisane 2026-06-13)** — wsparcie dla reasoning models (Anthropic `thinking` + `output_config.effort` pełne wsparcie, Google Gemini `ThinkingConfig` Gemini 3.0+ pełne wsparcie; OpenAI wymaga `/v1/responses` API — poza zakresem C8); **wysokie koszty** (2-10x tokens), domyślnie wyłączone, opt-in per alias z `capabilities.thinking`.
7. **Dokumentacja** — Swagger UI, `docs/`, `openapi.json` aktualizowane po każdej fazie.

**Ostatnia aktualizacja planu:** 2026-06-12 (dodano fazę C8 — Extended Thinking; poprzednio: audit kodu bazowego 2026-06-10; korekty C1.7-C2.7; szacunek zaktualizowany: ~16-24h; 8 faz C0-C8).

---

## 📝 CHANGELOG PLANU

### Aktualizacja 2026-06-13: Przepisano fazę C8 (Extended Thinking) — nowe API

**Zaktualizowana faza C8:**
- **C8. Extended Thinking** (5-7h) — wsparcie dla reasoning models z aktualnymi API (Context7 MCP verify 2026-06-13):
  - **Anthropic:** unified `thinking` parameter + `output_config.effort` (bez beta headers!) — pełne wsparcie
  - **Google Gemini:** `ThinkingConfig` (`includeThoughts`, `thinkingBudget`, `thinkingLevel`) — pełne wsparcie (Gemini 3.0+ ONLY)
  - **OpenAI:** wymaga nowego `/v1/responses` API (nie `/v1/chat/completions`) — POZA ZAKRESEM (facade przyjmuje parametr dla kompatybilności, ale nie działa)
  - Gateway unified API: `thinkingEnabled` (boolean) + `thinkingBudget` (string: "none"|"minimal"|"low"|"medium"|"high"|"xhigh"|"max" | number)
  - Response: `thinkingContent` field (Anthropic thinking blocks, Gemini thoughts)
  - Config: capability flag `capabilities.thinking`

**Kluczowe zmiany API (vs pierwotna wersja C8):**
1. **Anthropic:** `max_thinking_tokens` → `thinking: { type, budget_tokens, display }` (unified API, bez beta headers)
2. **OpenAI:** Chat Completions `reasoning_effort` → `/v1/responses` API `reasoning: { effort, summary }` (wymaga nowego endpoint — nieobsługiwane)
3. **Google Gemini:** dodane jako nowy provider (krok C8.11) — Gemini 3.0+ only

**Uzasadnienie:**
- Context7 MCP pokazał NOWE API dla wszystkich trzech providerów (2025-2026)
- Anthropic usunął requirement beta headers (unified thinking parameter w SDK)
- OpenAI całkowicie zmienił API reasoning (stare o1 models deprecated, nowe gpt-5+ wymagają `/v1/responses`)
- Google Gemini wspiera thinking od wersji 3.0+
- ROI: wysokie dla złożonych zadań (matematyka, code review, multi-step reasoning)
- Wysokie koszty (2-10x tokens) → domyślnie wyłączone, opt-in per model alias

**Zmiany w planie:**
- Zaktualizowano vendor API mapping table (Anthropic + Google + OpenAI status)
- Szacunek czasu: 16-24h → **18-26h** (5-7h na C8: +Google Gemini, +complexity nowych API)
- Dodano krok C8.11 (Google Gemini provider)
- Zaktualizowano C8.5 (Anthropic: thinking parameter zamiast beta headers + max_thinking_tokens)
- Zaktualizowano C8.6 (OpenAI: POZA ZAKRESEM, wymaga Responses API)
- Zaktualizowano C8.9 (OpenAI facade: parametr akceptowany dla kompatybilności, nie działa)
- Zaktualizowano C8.10 (Anthropic facade: thinking + output_config.effort)
- Zaktualizowano C8.12 (dokumentacja: provider support matrix)
- Validator `is-thinking-budget.validator.ts`: rozszerzony enum ("none", "minimal", "xhigh", "max")
- Testy: unit testy thinking validation, e2e testy reasoning mode (Anthropic + Gemini)

### Aktualizacja 2026-06-12: Dodano fazę C8 (Extended Thinking) — pierwotna wersja

**Pierwotna wersja (nieaktualna — patrz aktualizacja 2026-06-13):**
- **C8. Extended Thinking** (3-5h) — wsparcie dla reasoning models (pierwotny plan):
  - OpenAI: parametr `reasoning_effort` dla modeli o1-preview, o1-mini, o3-mini (NIEAKTUALNE — wymaga Responses API)
  - Anthropic: parametr `max_thinking_tokens` dla extended thinking mode (beta) (NIEAKTUALNE — zmieniono na unified `thinking` parameter)
  - Gateway unified API: `thinkingEnabled` (boolean) + `thinkingBudget` (string | number)
  - Response: `thinkingContent` field (Anthropic thinking blocks)
  - Config: nowy capability flag `capabilities.thinking`

**Uzasadnienie (pierwotne):**
- Extended thinking został usunięty z "Poza zakresem" (linia 7)
- Rosnące znaczenie reasoning models w production (OpenAI o1 series, Anthropic extended_thinking)
- ROI: średnie-wysokie dla złożonych zadań (matematyka, code review, multi-step reasoning)
- Wysokie koszty (2-10x tokens) → domyślnie wyłączone, opt-in per model alias

**Zmiany w planie (pierwotne):**
- Zaktualizowano tabelę przeglądu faz (dodano C8)
- Szacunek czasu: 13-19h → **16-24h** (+3-5h na C8)
- Kolejność pracy: C8 przed C7 (docs), po C1 i C4
- Aktualizacja struktury plików: nowy validator `is-thinking-budget.validator.ts`, rozszerzenie DTOs i providerów
- Testy: unit testy thinking validation, e2e testy reasoning mode

---

### Aktualizacja 2026-06-10: Audit kodu bazowego

**Zmiany po audycie kodu bazowego:**

1. **C1.7 (OpenAI DTO top_p, stop):**
   - ❌ Plan zakładał: dodać `top_p` i `stop`
   - ✅ Korekta: dodać **tylko `stop`** — `top_p` już istnieje w DTO (linia 102)
   - Odkryto: `presence_penalty` (linia 111) i `frequency_penalty` (linia 115) również już w DTO

2. **C1.8 (OpenAI mapper):**
   - ❌ Plan zakładał: mapowanie `top_p` i `stop`
   - ✅ Korekta: mapowanie **wszystkich 5 pól** (top_p, stop, penalties, seed) razem
   - Powód: Obecny mapper **nie mapuje** żadnego z tych pól mimo że są w DTO → fix + rozszerzenie w jednym kroku

3. **C2.6 (OpenAI penalties, seed):**
   - ❌ Plan zakładał: dodać `frequency_penalty`, `presence_penalty`, `seed`
   - ✅ Korekta: dodać **tylko `seed`** — penalties już w DTO

4. **C2.7 (OpenAI mapper penalties):**
   - ✅ Korekta: **Połączony z C1.8** — wszystkie parametry mapowane razem dla spójności

### Zmiany po analizie vendor docs (Context7 MCP — krok C0.2):

5. **Google wspiera `seed`:**
   - ❌ Plan zakładał: Google nie wspiera `seed` (C0.3 tabela, C2.5)
   - ✅ Korekta (Context7 verify): Google **wspiera** `seed` (`seed?: number` w GenerationConfig)
   - Zmieniono: Tabela C0.3 (linia 190), krok C2.5 — Google przekazuje `seed` do SDK

6. **Zalecenie temperature vs topP:**
   - 📖 OpenAI docs (Context7): "We generally recommend altering this or `top_p` but not both."
   - Dodano: Ostrzeżenie w C1.1 (opis topP w DTO), już obecne w `docs/dictionary.md`

7. **Weryfikacja innych parametrów:**
   - ✅ Anthropic `metadata` — potwierdzone że tylko `user_id` (plan C5.4 OK)
   - ✅ Wszystkie mapowania OpenAI/Anthropic/Google — potwierdzone przez oficjalne SDK docs
   - ✅ JSON mode — OpenAI natywny (`response_format`), Anthropic natywny (`output_config`), Google natywny (`responseMimeType`)

### Weryfikacja backward compatibility:

- ✅ Wszystkie nowe pola w `ChatParamsDto` są **opcjonalne** (`@IsOptional()`)
- ✅ Domyślnie **zablokowane** przez `allowOverrides` validation (opt-in)
- ✅ OpenAI DTO: `top_p`, penalties były akceptowane ale **nie działały** (brak mapowania) — to **FIX**, nie breaking change
- ✅ Request bez nowych pól = **identyczne zachowanie** jak przed zmianami
- ✅ Config YAML bez nowych `allowOverrides` = nowe parametry **automatycznie zablokowane**

### Stan bazowy po audycie:

**OpenAI DTO (src/integrations/openai/dtos/openai-chat-completion-request.dto.ts):**
- ✅ Już istnieją: `top_p` (102), `presence_penalty` (111), `frequency_penalty` (115)
- ❌ Brak: `stop`, `seed`, `response_format`, `metadata`, `max_completion_tokens`
- ❌ Mapowanie: **żadne** z powyższych 5 istniejących pól nie jest mapowane

**Anthropic DTO (src/integrations/anthropic/dtos/anthropic-messages-request.dto.ts):**
- ❌ Brak wszystkich pól z planu (top_p, stop_sequences, top_k, metadata)

**resolve-provider-call-options.ts:**
- Sztywna lista `OVERRIDE_KEYS = ['temperature', 'maxOutputTokens']`
- Wymaga rozszerzenia o 8+ nowych kluczy (lub refactoring na dynamiczne)

### Szacunek czasu (po audycie):

- Oryginalny: **14-20h**
- Korekta: -2h (mniej pracy w OpenAI DTO) +1h (refactoring resolve-provider-call-options jeśli potrzebne)
- **Nowy szacunek: 13-19h** (lekka optymalizacja)

---

## ✅ TL;DR — KLUCZOWE PUNKTY (Czytaj przed implementacją)

**Stan bazowy (po audycie 2026-06-10):**
- ✅ MVP gotowy — tool calling (T0-T8) zakończony
- ✅ `ChatParamsDto` ma tylko `temperature`, `maxOutputTokens`
- ⚠️ OpenAI DTO **częściowo zaimplementowane** — `top_p`, `presence_penalty`, `frequency_penalty` są w DTO ale **nie mapowane**
- ❌ Anthropic DTO — brak wszystkich pól z planu

**Najważniejsze korekty:**
1. **C1.7:** Dodać **tylko `stop`** do OpenAI DTO (top_p już jest)
2. **C1.8:** Dodać **mapowanie 5 pól** (top_p, stop, penalties, seed) → **połączone z C2.7**
3. **C2.6:** Dodać **tylko `seed`** do OpenAI DTO (penalties już są)
4. **C2.7:** **Krok połączony z C1.8** — nie implementować osobno
5. **C2.5:** Google **wspiera** `seed` — przekazać do SDK (Context7 verify w C0.2)
6. **🆕 C8 (2026-06-13 — przepisane):** Extended thinking mode — `thinkingEnabled`, `thinkingBudget` (Anthropic `thinking` + `output_config.effort`, Google Gemini `ThinkingConfig` Gemini 3.0+; OpenAI wymaga `/v1/responses` API — poza zakresem)

**Backward compatibility:**
- ✅ Wszystkie zmiany są **backward compatible** (opcjonalne pola + opt-in przez `allowOverrides`)
- ✅ OpenAI: `top_p`, penalties były akceptowane ale nieaktywne → to **FIX**, nie breaking change
- ✅ Request bez nowych pól = **identyczne zachowanie** jak przed zmianami
- ✅ **C8:** Thinking mode **domyślnie wyłączone** (wysokie koszty 2-10x); wymagane `capabilities.thinking` + `allowOverrides`; Anthropic+Gemini pełne wsparcie, OpenAI wymaga nowego API (poza zakresem)

**Szacunek czasu:** 18-26h (zaktualizowano 2026-06-13: C8 przepisane +Google Gemini +nowe API; poprzednio 16-24h z C8, 13-19h po audycie 2026-06-10)
