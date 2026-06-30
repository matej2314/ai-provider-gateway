# Plan implementacji — OpenAI providers

> **Cel:** dodać adaptery runtime w `src/providers/` dla oficjalnego OpenAI ChatGPT (`type: openai`) oraz providerów kompatybilnych z kontraktem OpenAI (`type: openai-compatible`: Deepseek, Ollama, …).
>
> **Zasada architektoniczna:** fasada HTTP (`src/integrations/openai/`) tylko tłumaczy kontrakt HTTP ↔ `ChatRequestDto`. Routing między chat/completions a Responses API należy wyłącznie do warstwy `src/providers/openai/`.
>
> **Konwencja nazewnictwa (Faza 0):**
> - **`type: openai`** / **`type: openai-compatible`** — wyłącznie wartości YAML (`PROVIDER_TYPES`); `openai-compatible` = endpoint third-party w kształcie OpenAI API.
> - **`src/providers/openai/`** — moduł kodu dla **całego** stosu OpenAI SDK (oficjalny ChatGPT + compatible); nie mylić z typem YAML `openai-compatible`.
> - Mapery w warstwie providera: suffix **`-provider.mapper.ts`** (np. `openai-messages-provider.mapper.ts`), żeby odróżnić od homonimów w `src/integrations/openai/mappers/`.
> - Rdzeń fabryki: **`create-openai-provider.core.ts`** (`createOpenAiProviderCore`); wrappery instancji: `create-openai-provider.ts`, `create-openai-compatible-provider-instance.ts`.
>
> **Legenda komentarzy w plikach modyfikowanych:**
> - `// [DODANE]` — nowy import, pole, funkcja lub blok
> - `// [ZMIENIONE]` — istniejący fragment wymagający podmiany
> - `// [USUNIĘTE]` — fragment do usunięcia (pokazany jako komentarz)

---

## Faza 0 — Przygotowanie i decyzje

### 0.1 Zakres MVP

| W scope (MVP) | Poza scope MVP |
|---------------|----------------|
| Pełny kontrakt konfiguracji i walidacji dla **`openai`** i **`openai-compatible`** od Fazy 1 | Hedging, multi-hop routing po intencji |
| Moduł `src/providers/openai/` (rdzeń SDK + adaptery + routing) — Faza 2 | Pełna parzystość wszystkich pól Responses API |
| `type: openai` — `complete` + `stream` przez chat/completions **i** Responses API (Faza 3) | Automatyczne wykrywanie modeli po API |
| `type: openai-compatible` — `complete` + `stream` przez chat/completions (Faza 4) | E2E i testy integracyjne przeciwko prawdziwym endpointom |
| Auto-routing `apiSurface` dla `openai` (`select-api-surface.ts`) | `store`, `conversation`, zaawansowane pola tylko Responses |
| Mapowanie tools, thinking/reasoning, podstawowych params | |
| `baseUrlRef` → walidowany URL z `.env` (bez `baseUrl` w YAML) | |
| Pusty klucz API dozwolony dla `openai` i `openai-compatible` | |
| Testy jednostkowe fabryk, mapperów, routingu i walidacji configu | |

### 0.2 Decyzje potwierdzone

- Typy w `PROVIDER_TYPES`: **`openai`** + **`openai-compatible`**
- Moduł providera: **`src/providers/openai/`**
- **`baseUrl` nie w YAML** — pole **`baseUrlRef`** wskazuje zmienną `.env`
- Domyślny `apiSurface` — **`resolveApiSurfaceDefault`**
- `apiSurface: auto` / `responses` — tylko dla `type: openai`
- Pusty klucz API dozwolony dla typów OpenAI
- Bootstrap — jedna mapa `FACTORIES` + `wrapLegacyProviderFactory` dla anthropic/google

### 0.3 Dokumenty referencyjne

- `docs/provider-openai-runtime.md`
- `docs/spec/SPEC-PROVIDERS.md`
- `docs/dictionary.md`

---

## Faza 1 — Fundament: typy, konfiguracja, walidacja, bootstrap

**Cel:** zbudować od dołu warstwę kontraktów i walidacji dla **obu** typów OpenAI, bez logiki SDK. Po Fazie 1: poprawny YAML przechodzi `config:validate`, runtime ma resolved pola, bootstrap startuje (ze stubami fabryk).

### Krok 1.1 — `PROVIDER_TYPES` i guard typów — **WYKONANY**

| Akcja | Plik |
|-------|------|
| MODIFY | `src/config/provider-types.ts` |
| NEW | `src/config/provider-types.openai.spec.ts` |

#### `src/config/provider-types.ts` (pełny plik po zmianach)

```typescript
export const PROVIDER_TYPES = [
  'anthropic',
  'google',
  'openai',
  'openai-compatible',
] as const;

export type GatewayProviderType = (typeof PROVIDER_TYPES)[number];

// [DODANE]
export type OpenAiProviderType = Extract<
  GatewayProviderType,
  'openai' | 'openai-compatible'
>;

// [DODANE]
export function isOpenAiProviderType(
  type: GatewayProviderType,
): type is OpenAiProviderType {
  return type === 'openai' || type === 'openai-compatible';
}

// [DODANE]
/** Granica modułu openai/ — wywoływana przed logiką SDK i selectApiSurface */
export function assertOpenAiProviderType(
  type: GatewayProviderType,
): asserts type is OpenAiProviderType {
  if (!isOpenAiProviderType(type)) {
    throw new Error(
      `[OpenAiProvider] Unsupported provider type "${type}". ` +
        `Only "openai" and "openai-compatible" are allowed.`,
    );
  }
}
```

#### `src/config/provider-types.openai.spec.ts` (nowy)

```typescript
import {
  assertOpenAiProviderType,
  isOpenAiProviderType,
} from './provider-types';

describe('provider-types (OpenAI)', () => {
  it('isOpenAiProviderType', () => {
    expect(isOpenAiProviderType('openai')).toBe(true);
    expect(isOpenAiProviderType('openai-compatible')).toBe(true);
    expect(isOpenAiProviderType('anthropic')).toBe(false);
  });

  it('assertOpenAiProviderType throws for non-OpenAI types', () => {
    expect(() => assertOpenAiProviderType('anthropic')).toThrow(
      /Unsupported provider type/,
    );
  });

  it('assertOpenAiProviderType passes for OpenAI types', () => {
    expect(() => assertOpenAiProviderType('openai')).not.toThrow();
    expect(() => assertOpenAiProviderType('openai-compatible')).not.toThrow();
  });
});
```

---

### Krok 1.2 — Typy modułu OpenAI — **WYKONANY**

| Akcja | Plik |
|-------|------|
| NEW | `src/providers/openai/openai-provider.types.ts` |

#### `src/providers/openai/openai-provider.types.ts` (nowy)

```typescript
export type OpenAiApiSurface = 'chat-completions' | 'responses' | 'auto';
```

> `OpenAiProviderConfig` — dodany w kroku 2.3 (przed `select-api-surface.ts`).

---

### Krok 1.3 — Schemat YAML

| Akcja | Plik |
|-------|------|
| MODIFY | `src/config/gateway-config.schema.ts` |

#### `src/config/gateway-config.schema.ts` — fragmenty do zmiany

```typescript
import { z } from 'zod';
import { PROVIDER_TYPES } from './provider-types';
import { GATEWAY_CLIENT_TYPES } from './configuration.types';
// [DODANE]
import { isOpenAiProviderType } from './provider-types';

export const EXPECTED_SCHEMA_VERSION = 1;

// [DODANE]
const OpenAiApiSurfaceSchema = z.enum([
  'chat-completions',
  'responses',
  'auto',
]);

export const GatewayConfigSchema = z
  .object({
    schemaVersion: z.number().int().min(1),
    masterKeyRef: z.string().min(1),
    providers: z
      .record(
        z.string(),
        z.object({
          type: z.enum(PROVIDER_TYPES),
          apiKeyRef: z.string(),
          enabled: z.boolean().optional().default(false),
          // [DODANE]
          baseUrlRef: z.string().optional(),
          apiSurface: OpenAiApiSurfaceSchema.optional(),
        }),
      )
      .superRefine((providers, ctx) => {
        const refs = new Map<string, string>();
        for (const [instanceId, row] of Object.entries(providers)) {
          const prev = refs.get(row.apiKeyRef);
          if (prev) {
            ctx.addIssue({
              code: 'custom',
              message: `Duplicate API key reference ${row.apiKeyRef}`,
              path: ['providers', instanceId, 'apiKeyRef'],
            });
          }
          refs.set(row.apiKeyRef, instanceId);

          // [DODANE] — reguły per typ OpenAI
          if (isOpenAiProviderType(row.type)) {
            if (!row.baseUrlRef?.trim()) {
              ctx.addIssue({
                code: 'custom',
                message: `baseUrlRef is required for provider type "${row.type}"`,
                path: ['providers', instanceId, 'baseUrlRef'],
              });
            }
          }

          if (row.type === 'openai-compatible' && row.apiSurface === 'auto') {
            ctx.addIssue({
              code: 'custom',
              message: `apiSurface "auto" is only allowed for type "openai"`,
              path: ['providers', instanceId, 'apiSurface'],
            });
          }

          if (
            row.type === 'openai-compatible' &&
            row.apiSurface === 'responses'
          ) {
            ctx.addIssue({
              code: 'custom',
              message: `apiSurface "responses" is only allowed for type "openai"`,
              path: ['providers', instanceId, 'apiSurface'],
            });
          }
        }
      }),
    // ... reszta pliku (clients, models, superRefine) bez zmian ...
  });
```

> Reszta pliku (`clients`, `models`, istniejące `superRefine` dla fallbacków i aliasów) — **bez zmian**.

**Przykład YAML (`openai`):**

```yaml
providers:
  openai-main:
    type: openai
    apiKeyRef: OPENAI_API_KEY
    baseUrlRef: OPENAI_BASE_URL
    enabled: true
```

**Przykład YAML (`openai-compatible`):**

```yaml
providers:
  ollama-local:
    type: openai-compatible
    apiKeyRef: OLLAMA_API_KEY
    baseUrlRef: OLLAMA_BASE_URL
    enabled: true
```

**Przykład `.env`:**

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OLLAMA_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/v1
```

---

### Krok 1.4 — Domyślne `apiSurface`

| Akcja | Plik |
|-------|------|
| NEW | `src/providers/openai/resolve-api-surface-default.ts` |
| NEW | `src/providers/openai/resolve-api-surface-default.spec.ts` |

#### `src/providers/openai/resolve-api-surface-default.ts` (nowy)

```typescript
import type { OpenAiProviderType } from '../../config/provider-types';
import type { OpenAiApiSurface } from './openai-provider.types';

export function resolveApiSurfaceDefault(
  providerType: OpenAiProviderType,
  yamlValue?: OpenAiApiSurface,
): OpenAiApiSurface {
  if (yamlValue !== undefined) return yamlValue;
  return providerType === 'openai' ? 'auto' : 'chat-completions';
}
```

#### `src/providers/openai/resolve-api-surface-default.spec.ts` (nowy)

```typescript
import { resolveApiSurfaceDefault } from './resolve-api-surface-default';

describe('resolveApiSurfaceDefault', () => {
  it.each([
    ['openai', undefined, 'auto'],
    ['openai', 'responses', 'responses'],
    ['openai', 'chat-completions', 'chat-completions'],
    ['openai-compatible', undefined, 'chat-completions'],
    ['openai-compatible', 'chat-completions', 'chat-completions'],
  ] as const)('type=%s yaml=%s → %s', (type, yaml, expected) => {
    expect(resolveApiSurfaceDefault(type, yaml)).toBe(expected);
  });
});
```

---

### Krok 1.5 — Runtime config

| Akcja | Plik |
|-------|------|
| MODIFY | `src/config/configuration.ts` |

#### `src/config/configuration.ts` — zmiany

```typescript
// [DODANE] — importy
import { isOpenAiProviderType } from './provider-types';
import type { OpenAiApiSurface } from '../providers/openai/openai-provider.types';
import { resolveApiSurfaceDefault } from '../providers/openai/resolve-api-surface-default';
import { resolveBaseUrlFromEnv } from './provider-base-url.validation';
// [DODANE] — obok assertEnabledProviderApiKeysPresent
import { assertEnabledProviderBaseUrlsPresent } from './provider-base-url.validation';

// [ZMIENIONE] — rozszerzenie interfejsu
export interface ProviderInstanceRuntime {
  type: GatewayProviderType;
  apiKeyRef: string;
  apiKey: string;
  // [DODANE]
  baseUrlRef?: string;
  baseUrl?: string;
  apiSurface?: OpenAiApiSurface;
}

// [ZMIENIONE] — w buildEffectiveGatewayConfig, po assertEnabledProviderApiKeysPresent:
  assertEnabledProviderApiKeysPresent(raw, env);
  // [DODANE]
  assertEnabledProviderBaseUrlsPresent(raw, env);

// [ZMIENIONE] — pętla w buildAppConfiguration
  for (const [instanceId, row] of Object.entries(gatewayConfig.providers)) {
    const base: ProviderInstanceRuntime = {
      type: row.type,
      apiKeyRef: row.apiKeyRef,
      apiKey: (rawEnv[row.apiKeyRef] ?? '').trim(),
    };

    // [DODANE]
    if (isOpenAiProviderType(row.type)) {
      providersByInstance[instanceId] = {
        ...base,
        baseUrlRef: row.baseUrlRef,
        baseUrl: resolveBaseUrlFromEnv(row.baseUrlRef, rawEnv),
        apiSurface: resolveApiSurfaceDefault(row.type, row.apiSurface),
      };
    } else {
      providersByInstance[instanceId] = base;
    }
  }
```

---

### Krok 1.6 — Walidacja klucza API

| Akcja | Plik |
|-------|------|
| MODIFY | `src/config/provider-api-key.validation.ts` |
| MODIFY | `src/config/provider-api-key.validation.spec.ts` |

#### `src/config/provider-api-key.validation.ts` (pełny plik po zmianach)

```typescript
import type { z } from 'zod';
import type { GatewayConfigSchema } from './gateway-config.schema';
// [DODANE]
import type { GatewayProviderType } from './provider-types';

export type RawGatewayConfig = z.infer<typeof GatewayConfigSchema>;

export interface MissingProviderApiKey {
  instanceId: string;
  apiKeyRef: string;
}

// [DODANE]
export function isApiKeyRequiredForProviderType(
  type: GatewayProviderType,
): boolean {
  return type === 'anthropic' || type === 'google';
}

export function collectMissingEnabledProviderApiKeyErrors(
  config: RawGatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): MissingProviderApiKey[] {
  const missing: MissingProviderApiKey[] = [];
  for (const [instanceId, row] of Object.entries(config.providers)) {
    if (row.enabled === false) continue;
    // [ZMIENIONE] — pomiń typy OpenAI
    if (!isApiKeyRequiredForProviderType(row.type)) continue;
    const key = (env[row.apiKeyRef] ?? '').trim();
    if (!key) {
      missing.push({ instanceId, apiKeyRef: row.apiKeyRef });
    }
  }
  return missing;
}

export function formatMissingProviderApiKeyError(
  entry: MissingProviderApiKey,
): string {
  return (
    `[GatewayConfig] Missing API key for enabled provider instance "${entry.instanceId}" ` +
    `(expected non-empty env ${entry.apiKeyRef})`
  );
}

export function assertEnabledProviderApiKeysPresent(
  config: RawGatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const missing = collectMissingEnabledProviderApiKeyErrors(config, env);
  if (missing.length === 0) return;
  throw new Error(formatMissingProviderApiKeyError(missing[0]));
}
```

#### `src/config/provider-api-key.validation.spec.ts` — [DODANE] testy

```typescript
// [DODANE] — na końcu pliku
  describe('isApiKeyRequiredForProviderType', () => {
    it('requires key for anthropic and google only', () => {
      expect(isApiKeyRequiredForProviderType('anthropic')).toBe(true);
      expect(isApiKeyRequiredForProviderType('google')).toBe(true);
      expect(isApiKeyRequiredForProviderType('openai')).toBe(false);
      expect(isApiKeyRequiredForProviderType('openai-compatible')).toBe(false);
    });
  });

  describe('openai types with empty api key', () => {
    it('does not report missing key for enabled openai provider', () => {
      const config = createTestGatewayConfig({
        providers: {
          'openai-primary': {
            type: 'openai',
            apiKeyRef: 'OPENAI_API_KEY',
            baseUrlRef: 'OPENAI_BASE_URL',
            enabled: true,
          },
        },
      });
      expect(collectMissingEnabledProviderApiKeyErrors(config, {})).toEqual([]);
    });
  });
```

---

### Krok 1.7 — Walidacja `baseUrlRef`

| Akcja | Plik |
|-------|------|
| NEW | `src/config/provider-base-url.validation.ts` |
| NEW | `src/config/provider-base-url.validation.spec.ts` |

#### `src/config/provider-base-url.validation.ts` (nowy)

```typescript
import type { z } from 'zod';
import type { GatewayConfigSchema } from './gateway-config.schema';
import { isOpenAiProviderType } from './provider-types';

export type RawGatewayConfig = z.infer<typeof GatewayConfigSchema>;

export interface MissingProviderBaseUrl {
  instanceId: string;
  baseUrlRef: string;
}

export function resolveBaseUrlFromEnv(
  baseUrlRef: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (!baseUrlRef?.trim()) return '';
  const raw = (env[baseUrlRef] ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return raw.replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function collectMissingBaseUrlErrors(
  config: RawGatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): MissingProviderBaseUrl[] {
  const missing: MissingProviderBaseUrl[] = [];
  for (const [instanceId, row] of Object.entries(config.providers)) {
    if (row.enabled === false) continue;
    if (!isOpenAiProviderType(row.type)) continue;
    if (!row.baseUrlRef?.trim()) continue; // Zod już wymaga baseUrlRef w YAML
    const resolved = resolveBaseUrlFromEnv(row.baseUrlRef, env);
    if (!resolved) {
      missing.push({ instanceId, baseUrlRef: row.baseUrlRef });
    }
  }
  return missing;
}

export function formatMissingProviderBaseUrlError(
  entry: MissingProviderBaseUrl,
): string {
  return (
    `[GatewayConfig] Missing or invalid base URL for enabled provider instance "${entry.instanceId}" ` +
    `(expected valid http(s) URL in env ${entry.baseUrlRef})`
  );
}

export function assertEnabledProviderBaseUrlsPresent(
  config: RawGatewayConfig,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const missing = collectMissingBaseUrlErrors(config, env);
  if (missing.length === 0) return;
  throw new Error(formatMissingProviderBaseUrlError(missing[0]));
}
```

#### `src/config/provider-base-url.validation.spec.ts` (nowy)

```typescript
import { createTestGatewayConfig } from '../common/mocks/createTestGatewayConfig';
import {
  collectMissingBaseUrlErrors,
  resolveBaseUrlFromEnv,
} from './provider-base-url.validation';

describe('provider-base-url.validation', () => {
  describe('resolveBaseUrlFromEnv', () => {
    it('returns trimmed URL without trailing slash', () => {
      expect(
        resolveBaseUrlFromEnv('OPENAI_BASE_URL', {
          OPENAI_BASE_URL: 'https://api.openai.com/v1/',
        }),
      ).toBe('https://api.openai.com/v1');
    });

    it('returns empty for missing env', () => {
      expect(resolveBaseUrlFromEnv('OPENAI_BASE_URL', {})).toBe('');
    });
  });

  describe('collectMissingBaseUrlErrors', () => {
    it('reports missing base URL for enabled openai provider', () => {
      const config = createTestGatewayConfig({
        providers: {
          'openai-primary': {
            type: 'openai',
            apiKeyRef: 'OPENAI_API_KEY',
            baseUrlRef: 'OPENAI_BASE_URL',
            enabled: true,
          },
        },
      });
      expect(collectMissingBaseUrlErrors(config, {})).toEqual([
        { instanceId: 'openai-primary', baseUrlRef: 'OPENAI_BASE_URL' },
      ]);
    });

    it('ignores anthropic providers', () => {
      const config = createTestGatewayConfig({
        providers: {
          'anthropic-primary': {
            type: 'anthropic',
            apiKeyRef: 'ANTHROPIC_API_KEY',
            enabled: true,
          },
        },
      });
      expect(collectMissingBaseUrlErrors(config, {})).toEqual([]);
    });
  });
});
```

---

### Krok 1.8 — Kontrakt fabryki

| Akcja | Plik |
|-------|------|
| NEW | `src/providers/factories/provider-factory.types.ts` |
| NEW | `src/providers/factories/wrap-legacy-provider-factory.ts` |
| NEW | `src/providers/factories/wrap-legacy-provider-factory.spec.ts` |

#### `src/providers/factories/provider-factory.types.ts` (nowy)

```typescript
import type { AIProvider } from '../interfaces/ai-provider.interface';
import type { LoggingService } from 'src/logging/logging.service';
import type { GatewayProviderType } from '../../config/provider-types';
import type { OpenAiApiSurface } from '../openai/openai-provider.types';

/** Sygnatura istniejących fabryk — bez zmian w create-anthropic/google-provider.ts */
export type LegacyProviderFactoryFn = (
  apiKey: string,
  logger: LoggingService,
) => AIProvider;

/** Kontekst przekazywany z bootstrapa do każdej fabryki w mapie FACTORIES */
export interface ProviderFactoryContext {
  instanceId: string;
  type: GatewayProviderType;
  apiKeyRef: string;
  apiKey: string; // może być '' dla typów OpenAI
  baseUrlRef?: string;
  baseUrl?: string;
  apiSurface?: OpenAiApiSurface;
}

export type ProviderFactoryFn = (
  config: ProviderFactoryContext,
  logger: LoggingService,
) => AIProvider;
```

#### `src/providers/factories/wrap-legacy-provider-factory.ts` (nowy)

```typescript
import type {
  LegacyProviderFactoryFn,
  ProviderFactoryFn,
} from './provider-factory.types';

/** Przekazuje wyłącznie ctx.apiKey — reszta pól kontekstu ignorowana (anthropic/google). */
export function wrapLegacyProviderFactory(
  legacy: LegacyProviderFactoryFn,
): ProviderFactoryFn {
  return (ctx, logger) => legacy(ctx.apiKey, logger);
}
```

#### `src/providers/factories/wrap-legacy-provider-factory.spec.ts` (nowy)

```typescript
import { wrapLegacyProviderFactory } from './wrap-legacy-provider-factory';
import type { LegacyProviderFactoryFn } from './provider-factory.types';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';

describe('wrapLegacyProviderFactory', () => {
  it('passes only apiKey to legacy factory', () => {
    const legacy = jest.fn<ReturnType<LegacyProviderFactoryFn>, [string, unknown]>();
    const wrapped = wrapLegacyProviderFactory(legacy as LegacyProviderFactoryFn);
    const logger = createMockLoggingService();

    wrapped(
      {
        instanceId: 'anthropic-primary',
        type: 'anthropic',
        apiKeyRef: 'ANTHROPIC_API_KEY',
        apiKey: 'sk-ant-test',
        baseUrl: 'https://should-be-ignored.example',
      },
      logger as never,
    );

    expect(legacy).toHaveBeenCalledWith('sk-ant-test', logger);
  });
});
```

> `create-anthropic-provider.ts` / `create-google-provider.ts` — **brak zmian**.

---

### Krok 1.9 — Bootstrap i stuby fabryk

| Akcja | Plik |
|-------|------|
| MODIFY | `src/providers/provider-instances.bootstrap.ts` |
| NEW | `src/providers/factories/create-openai-provider.stub.ts` |
| NEW | `src/providers/factories/create-openai-compatible-provider.stub.ts` |

#### `src/providers/factories/create-openai-provider.stub.ts` (nowy)

```typescript
import type { ProviderFactoryFn } from './provider-factory.types';
import type { AIProvider } from '../interfaces/ai-provider.interface';

const NOT_IMPLEMENTED_MSG =
  '[OpenAiProvider] Factory not implemented — complete Faza 3';

function createNotConfiguredProvider(): AIProvider {
  return {
    async complete() {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },
    stream() {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },
  };
}

export const createOpenAiProviderStub: ProviderFactoryFn = (config, logger) => {
  logger
    .child({ module: 'OpenAiProviderStub', instanceId: config.instanceId })
    .warn('OpenAI provider stub active — replace with createOpenAiProvider in Faza 3');
  return createNotConfiguredProvider();
};
```

#### `src/providers/factories/create-openai-compatible-provider.stub.ts` (nowy)

```typescript
import type { ProviderFactoryFn } from './provider-factory.types';
import type { AIProvider } from '../interfaces/ai-provider.interface';

const NOT_IMPLEMENTED_MSG =
  '[OpenAiCompatibleProvider] Factory not implemented — complete Faza 4';

function createNotConfiguredProvider(): AIProvider {
  return {
    async complete() {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },
    stream() {
      throw new Error(NOT_IMPLEMENTED_MSG);
    },
  };
}

export const createOpenAiCompatibleProviderStub: ProviderFactoryFn = (
  config,
  logger,
) => {
  logger
    .child({
      module: 'OpenAiCompatibleProviderStub',
      instanceId: config.instanceId,
    })
    .warn(
      'OpenAI-compatible provider stub active — replace with createOpenAiCompatibleProviderInstance in Faza 4',
    );
  return createNotConfiguredProvider();
};
```

#### `src/providers/provider-instances.bootstrap.ts` (pełny plik po zmianach)

```typescript
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../config/typed-config';
import { ProviderRegistryService } from './provider-registry.service';
import { createAnthropicProvider } from './factories/create-anthropic-provider';
import { createGoogleProvider } from './factories/create-google-provider';
import { LoggingService } from 'src/logging/logging.service';
import type { GatewayProviderType } from '../config/provider-types';
// [DODANE]
import { wrapLegacyProviderFactory } from './factories/wrap-legacy-provider-factory';
import { createOpenAiProviderStub } from './factories/create-openai-provider.stub';
import { createOpenAiCompatibleProviderStub } from './factories/create-openai-compatible-provider.stub';
import type {
  ProviderFactoryContext,
  ProviderFactoryFn,
} from './factories/provider-factory.types';
import { isApiKeyRequiredForProviderType } from '../config/provider-api-key.validation';
import { isOpenAiProviderType } from '../config/provider-types';
import type { GatewayProviderInstanceConfig } from '../config/gateway-config.schema';
import type { ProviderInstanceRuntime } from '../config/configuration';

// [ZMIENIONE]
const FACTORIES: Partial<Record<GatewayProviderType, ProviderFactoryFn>> = {
  anthropic: wrapLegacyProviderFactory(createAnthropicProvider),
  google: wrapLegacyProviderFactory(createGoogleProvider),
  openai: createOpenAiProviderStub,
  'openai-compatible': createOpenAiCompatibleProviderStub,
};

// [DODANE]
function buildFactoryContext(
  instanceId: string,
  row: GatewayProviderInstanceConfig,
  runtime: ProviderInstanceRuntime,
): ProviderFactoryContext {
  const base: ProviderFactoryContext = {
    instanceId,
    type: row.type,
    apiKeyRef: runtime.apiKeyRef,
    apiKey: (runtime.apiKey ?? '').trim(),
  };
  if (!isOpenAiProviderType(row.type)) return base;
  return {
    ...base,
    baseUrlRef: runtime.baseUrlRef,
    baseUrl: runtime.baseUrl,
    apiSurface: runtime.apiSurface,
  };
}

@Injectable()
export class ProviderInstancesBootstrap implements OnApplicationBootstrap {
  constructor(
    private readonly configService: ConfigService,
    private readonly registry: ProviderRegistryService,
    private readonly loggingService: LoggingService,
  ) {}

  onApplicationBootstrap() {
    const gateway = getAppConfigOrThrow(this.configService, 'gateway');
    const byInstance = getAppConfigOrThrow(this.configService, 'providers');

    for (const [instanceId, row] of Object.entries(gateway.providers)) {
      if (row.enabled === false) continue;

      const runtime = byInstance[instanceId];
      // [DODANE]
      if (!runtime) {
        throw new Error(
          `[ProviderInstancesBootstrap] Missing runtime config for instance ${instanceId}`,
        );
      }

      const apiKey = (runtime.apiKey ?? '').trim();

      // [ZMIENIONE] — warunkowy throw klucza
      if (isApiKeyRequiredForProviderType(row.type) && !apiKey) {
        throw new Error(
          `[ProviderInstancesBootstrap] Missing API key for instance ${instanceId}`,
        );
      }

      const factory = FACTORIES[row.type];
      if (!factory) {
        throw new Error(
          `[ProviderInstancesBootstrap] Unsupported provider type: ${row.type} (instance ${instanceId})`,
        );
      }

      // [ZMIENIONE]
      const ctx = buildFactoryContext(instanceId, row, runtime);
      const provider = factory(ctx, this.loggingService);
      this.registry.registerInstance(instanceId, row.type, provider);
    }
  }
}
```

---

### Krok 1.10 — CLI, wizard, legacy env

| Akcja | Plik |
|-------|------|
| MODIFY | `src/cli/schemas/wizard-state.schema.ts` |
| MODIFY | `src/cli/services/cli.services.types.ts` |
| MODIFY | `src/cli/utils/provider-id.util.ts` |
| MODIFY | `src/cli/utils/api-key-validation.util.ts` |
| MODIFY | `src/cli/utils/legacy-provider-env.util.ts` |
| MODIFY | `src/cli/services/prompts/provider-prompt.service.ts` |
| MODIFY | `src/cli/services/provider-manager.service.ts` |
| MODIFY | `src/cli/templates/env.template.ts` |
| MODIFY | `src/cli/templates/gateway-config.template.ts` |

#### `src/cli/utils/provider-id.util.ts` — [DODANE]

```typescript
export function deriveBaseUrlRef(instanceId: string): string {
  const slug = instanceId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return `${slug}_BASE_URL`;
}
```

#### `src/cli/utils/api-key-validation.util.ts` (pełny plik po zmianach)

```typescript
import type { GatewayProviderType } from 'src/config/provider-types';
import { isApiKeyRequiredForProviderType } from 'src/config/provider-api-key.validation';

const ANTHROPIC_KEY = /^sk-ant-/;
const GOOGLE_KEY = /^(AIza|AQ\.)/;

export function validateProviderApiKey(
  type: GatewayProviderType,
  value: string,
): true | string {
  const trimmed = value.trim();
  // [ZMIENIONE] — pusty klucz OK dla typów OpenAI
  if (!trimmed) {
    return isApiKeyRequiredForProviderType(type)
      ? 'API key is required.'
      : true;
  }
  if (type === 'anthropic' && !ANTHROPIC_KEY.test(trimmed)) {
    return 'ANTHROPIC_API_KEY must start with "sk-ant-"';
  }
  if (type === 'google' && !GOOGLE_KEY.test(trimmed)) {
    return 'GOOGLE_API_KEY must start with "AIza" or "AQ."';
  }
  return true;
}
```

#### `src/cli/utils/legacy-provider-env.util.ts` — [ZMIENIONE]

```typescript
// [ZMIENIONE] — Partial<Record<...>> zamiast Record<...>
export const LEGACY_PROVIDER_API_KEY_ENV: Partial<
  Record<GatewayProviderType, string>
> = {
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  // [DODANE]
  openai: 'OPENAI_API_KEY',
  // brak wpisu dla openai-compatible — celowo
};

// [ZMIENIONE] — w applyLegacyProviderApiKeyEnv i syncLegacyProviderApiKeysInEnv:
  for (const type of PROVIDER_TYPES) {
    const legacyKey = LEGACY_PROVIDER_API_KEY_ENV[type];
    if (!legacyKey) continue; // [DODANE] — skip openai-compatible
    // ... reszta bez zmian ...
  }
```

#### `src/cli/services/cli.services.types.ts` — [ZMIENIONE] `CliAiProvider`

```typescript
export interface CliAiProvider {
  id: string;
  type: GatewayProviderType;
  apiKeyRef: string;
  apiKey: string;
  // [DODANE]
  baseUrlRef?: string;
  baseUrl?: string;
  apiSurface?: 'chat-completions' | 'responses' | 'auto';
}
```

#### `src/cli/schemas/wizard-state.schema.ts` — [ZMIENIONE] `CliAiProviderSchema`

```typescript
const CliAiProviderSchema = z.object({
  id: z.string(),
  type: z.enum(PROVIDER_TYPES),
  apiKeyRef: z.string(),
  apiKey: z.string(),
  // [DODANE]
  baseUrlRef: z.string().optional(),
  baseUrl: z.string().optional(),
  apiSurface: z
    .enum(['chat-completions', 'responses', 'auto'])
    .optional(),
});
```

#### `src/cli/services/prompts/provider-prompt.service.ts` — [DODANE] bloki dla typów OpenAI

```typescript
// [DODANE] — importy
import { isOpenAiProviderType } from 'src/config/provider-types';
import { deriveBaseUrlRef } from '../../utils/provider-id.util';

// W pętli for (const providerType of selectedProviders), po apiKeyRef:
      const baseUrlRef = isOpenAiProviderType(providerType)
        ? deriveBaseUrlRef(id)
        : undefined;

      let apiKey = '';
      if (isOpenAiProviderType(providerType)) {
        const { optionalKey } = await inquirer.prompt<{ optionalKey: string }>([
          {
            type: 'password',
            name: 'optionalKey',
            message: `API key for ${providerType} (optional, env: ${apiKeyRef}):`,
            mask: '*',
            validate: (input: string) =>
              validateProviderApiKey(providerType, String(input)),
          },
        ]);
        apiKey = String(optionalKey).trim();
      } else {
        // [istniejący prompt z wymaganym kluczem — bez zmian struktury]
      }

      let baseUrl = '';
      if (isOpenAiProviderType(providerType) && baseUrlRef) {
        const { url } = await inquirer.prompt<{ url: string }>([
          {
            type: 'input',
            name: 'url',
            message: `Base URL (env: ${baseUrlRef}):`,
            default:
              providerType === 'openai'
                ? 'https://api.openai.com/v1'
                : 'http://localhost:11434/v1',
            validate: (input: string) => {
              try {
                new URL(String(input).trim());
                return true;
              } catch {
                return 'Enter a valid URL';
              }
            },
          },
        ]);
        baseUrl = String(url).trim();
      }

      providers.push({
        id,
        type: providerType,
        apiKeyRef,
        apiKey,
        ...(baseUrlRef && { baseUrlRef, baseUrl }),
      });
```

#### `src/cli/services/provider-manager.service.ts` — [DODANE] w `addProvider`

```typescript
// [DODANE] — importy
import { isOpenAiProviderType } from 'src/config/provider-types';
import { deriveBaseUrlRef } from '../utils/provider-id.util';

// Po wyborze type, przed apiKey prompt:
    const baseUrlRef = isOpenAiProviderType(type)
      ? deriveBaseUrlRef(id)
      : undefined;

// [ZMIENIONE] — apiKey prompt: opcjonalny dla OpenAI
    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
      {
        type: 'password',
        name: 'apiKey',
        message: isOpenAiProviderType(type)
          ? `API key (optional, env: ${apiKeyRef}):`
          : `API key (env: ${apiKeyRef}):`,
        mask: '*',
        validate: (value: string) => {
          const result = validateProviderApiKey(type, value);
          return result === true ? true : result;
        },
      },
    ]);

    let baseUrl = '';
    if (baseUrlRef) {
      const { url } = await inquirer.prompt<{ url: string }>([
        {
          type: 'input',
          name: 'url',
          message: `Base URL (env: ${baseUrlRef}):`,
          default:
            type === 'openai'
              ? 'https://api.openai.com/v1'
              : 'http://localhost:11434/v1',
          validate: (input: string) => {
            try {
              new URL(String(input).trim());
              return true;
            } catch {
              return 'Enter a valid URL';
            }
          },
        },
      ]);
      baseUrl = String(url).trim();
    }

    config.providers[id] = {
      type,
      apiKeyRef,
      enabled,
      // [DODANE]
      ...(baseUrlRef && { baseUrlRef }),
    };

    await this.envPatch.setVar(cwd, apiKeyRef, apiKey.trim());
    // [DODANE]
    if (baseUrlRef) {
      await this.envPatch.setVar(cwd, baseUrlRef, baseUrl);
    }
```

#### `src/cli/templates/env.template.ts` — [DODANE]

```typescript
export interface ProviderCli {
  apiKeyRef: string;
  apiKey: string;
  type?: GatewayProviderType;
  // [DODANE]
  baseUrlRef?: string;
  baseUrl?: string;
}

// W generateEnvTemplate, w pętli providers:
  input.providers.forEach((provider) => {
    env[provider.apiKeyRef] = provider.apiKey;
    // [DODANE]
    if (provider.baseUrlRef) {
      env[provider.baseUrlRef] = provider.baseUrl ?? '';
    }
  });
```

#### `src/cli/templates/gateway-config.template.ts` — [DODANE]

```typescript
// W ConfigTemplateInput.providers:
  providers: Array<{
    id: string;
    type: GatewayProviderType;
    apiKeyRef: string;
    // [DODANE]
    baseUrlRef?: string;
  }>;

// W generateGatewayConfigTemplate:
      {
        type: provider.type,
        apiKeyRef: provider.apiKeyRef,
        enabled: true,
        // [DODANE]
        ...(provider.baseUrlRef && { baseUrlRef: provider.baseUrlRef }),
      },
```

### Kryteria ukończenia Fazy 1

- [ ] `openai-provider.types.ts` istnieje przed `resolve-api-surface-default.ts`
- [ ] `config:validate` OK dla YAML `openai` i `openai-compatible` (z `baseUrlRef`)
- [ ] `config:validate` odrzuca `openai-compatible` + `apiSurface: auto|responses`
- [ ] `assertOpenAiProviderType('anthropic')` → throw (test)
- [ ] Pusty klucz dla typów OpenAI — OK w walidacji i bootstrapie
- [ ] Włączona instancja ze stubem — start OK; pierwsze `complete` → czytelny błąd
- [ ] `create-anthropic-provider.ts` / `create-google-provider.ts` — **bez diffu**
- [ ] `wrapLegacyProviderFactory` + mapa `FACTORIES` — anthropic/google rejestrowane przez wrapper

---

## Faza 2 — Moduł `src/providers/openai/` (logika SDK)

**Cel:** mapery, adaptery, routing surface, fabryka rdzeniowa. Zakłada **ukończoną Fazę 1**.

### Krok 2.1 — Struktura katalogów

| Akcja | Plik |
|-------|------|
| NEW | `src/providers/openai/openai-api-surface.models.ts` |
| NEW | `src/providers/openai/select-api-surface.ts` |
| NEW | `src/providers/openai/openai-error.mapper.ts` |
| NEW | `src/providers/openai/mappers/openai-messages-provider.mapper.ts` |
| NEW | `src/providers/openai/mappers/openai-tools-provider.mapper.ts` |
| NEW | `src/providers/openai/mappers/openai-params-provider.mapper.ts` |
| NEW | `src/providers/openai/mappers/openai-thinking-provider.mapper.ts` |
| NEW | `src/providers/openai/mappers/openai-stream-provider.mapper.ts` |
| NEW | `src/providers/openai/adapters/chat-completions.adapter.ts` |
| NEW | `src/providers/openai/adapters/responses.adapter.ts` |
| NEW | `src/providers/factories/create-openai-provider.core.ts` |

---

### Krok 2.2 — Listy modeli (`openai-api-surface.models.ts`)

#### `src/providers/openai/openai-api-surface.models.ts` (nowy)

```typescript
import type {
  ProviderCallOptions,
  ProviderChatInput,
} from '../interfaces/ai-provider.interface';

/** Modele wymagające Responses API w trybie auto (gdy brak jawnego thinking). */
const RESPONSES_ONLY_MODEL_PATTERNS: RegExp[] = [
  /^o\d/i,
  /^gpt-5/i,
];

export function isResponsesOnlyModel(modelId: string): boolean {
  return RESPONSES_ONLY_MODEL_PATTERNS.some((pattern) =>
    pattern.test(modelId),
  );
}

export function requestRequiresResponsesApi(
  options: ProviderCallOptions,
  input: ProviderChatInput,
): boolean {
  if (options.responseFormat?.type === 'json_object') {
    // json_object działa na chat/completions — nie wymusza responses
    return false;
  }
  // Rozszerzenia gateway wymagające Responses (MVP):
  // parallel_tool_calls — gdy dodane do ProviderCallOptions
  void input;
  return false;
}
```

#### `src/providers/openai/openai-api-surface.models.spec.ts` (nowy)

```typescript
import {
  isResponsesOnlyModel,
  requestRequiresResponsesApi,
} from './openai-api-surface.models';

describe('openai-api-surface.models', () => {
  it('isResponsesOnlyModel', () => {
    expect(isResponsesOnlyModel('o3-mini')).toBe(true);
    expect(isResponsesOnlyModel('gpt-4o')).toBe(false);
  });

  it('requestRequiresResponsesApi returns false for MVP defaults', () => {
    expect(requestRequiresResponsesApi({}, { messages: [] })).toBe(false);
  });
});
```

---

### Krok 2.3 — Routing (`select-api-surface.ts`)

| Akcja | Plik |
|-------|------|
| MODIFY | `src/providers/openai/openai-provider.types.ts` |
| NEW | `src/providers/openai/select-api-surface.ts` |
| NEW | `src/providers/openai/select-api-surface.spec.ts` |

#### `src/providers/openai/openai-provider.types.ts` — [DODANE] `OpenAiProviderConfig`

```typescript
export interface OpenAiProviderConfig {
  apiKey: string; // może być ''
  baseUrl: string;
  apiSurface: OpenAiApiSurface;
  defaultHeaders?: Record<string, string>;
}
```

#### `src/providers/openai/select-api-surface.ts` (nowy)

```typescript
import type { OpenAiProviderType } from '../../config/provider-types';
import type { OpenAiProviderConfig } from './openai-provider.types';
import type {
  ProviderCallOptions,
  ProviderChatInput,
} from '../interfaces/ai-provider.interface';
import {
  isResponsesOnlyModel,
  requestRequiresResponsesApi,
} from './openai-api-surface.models';

export type SelectedOpenAiApiSurface = 'chat-completions' | 'responses';

export function selectApiSurface(
  providerType: OpenAiProviderType,
  config: OpenAiProviderConfig,
  modelId: string,
  options: ProviderCallOptions,
  input: ProviderChatInput,
): SelectedOpenAiApiSurface {
  if (providerType === 'openai-compatible') {
    return 'chat-completions';
  }

  if (config.apiSurface === 'chat-completions') return 'chat-completions';
  if (config.apiSurface === 'responses') return 'responses';

  // apiSurface === 'auto'
  if (options.thinkingEnabled === true || options.thinkingBudget !== undefined) {
    return 'responses';
  }
  if (requestRequiresResponsesApi(options, input)) return 'responses';
  if (isResponsesOnlyModel(modelId)) return 'responses';

  return 'chat-completions';
}
```

#### `src/providers/openai/select-api-surface.spec.ts` (nowy)

```typescript
import { selectApiSurface } from './select-api-surface';
import type { OpenAiProviderConfig } from './openai-provider.types';

const baseConfig: OpenAiProviderConfig = {
  apiKey: 'sk-test',
  baseUrl: 'https://api.openai.com/v1',
  apiSurface: 'auto',
};

describe('selectApiSurface', () => {
  it('openai-compatible always chat-completions', () => {
    expect(
      selectApiSurface(
        'openai-compatible',
        { ...baseConfig, apiSurface: 'chat-completions' },
        'llama3',
        {},
        { messages: [] },
      ),
    ).toBe('chat-completions');
  });

  it('thinking wins over responses-only model list', () => {
    expect(
      selectApiSurface(
        'openai',
        baseConfig,
        'o3-mini',
        { thinkingEnabled: true },
        { messages: [] },
      ),
    ).toBe('responses');
  });

  it('responses-only model without thinking', () => {
    expect(
      selectApiSurface('openai', baseConfig, 'o3-mini', {}, { messages: [] }),
    ).toBe('responses');
  });

  it('default gpt-4o → chat-completions', () => {
    expect(
      selectApiSurface('openai', baseConfig, 'gpt-4o', {}, { messages: [] }),
    ).toBe('chat-completions');
  });
});
```

---

### Krok 2.4 — Mapery providera

#### `src/providers/openai/mappers/openai-messages-provider.mapper.ts` (nowy)

```typescript
import type OpenAI from 'openai';
import type {
  ProviderAssistantTurn,
  ProviderChatTurn,
  ProviderToolResultTurn,
} from '../../interfaces/ai-provider.interface';
import { parseJsonObject } from '../../helpers/parse-json-object';

type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export function mapTurnsToOpenAiMessages(
  turns: ProviderChatTurn[],
  system?: string,
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  if (system?.trim()) {
    messages.push({ role: 'system', content: system });
  }

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];

    switch (turn.role) {
      case 'user':
        messages.push({ role: 'user', content: turn.content });
        continue;
      case 'assistant':
        messages.push(mapAssistantTurn(turn));
        continue;
      case 'tool': {
        const toolResults: ChatCompletionMessageParam[] = [
          {
            role: 'tool',
            tool_call_id: turn.toolCallId,
            content: turn.content,
          },
        ];

        while (i + 1 < turns.length && turns[i + 1].role === 'tool') {
          i++;
          const next = turns[i] as ProviderToolResultTurn;
          toolResults.push({
            role: 'tool',
            tool_call_id: next.toolCallId,
            content: next.content,
          });
        }

        messages.push(...toolResults);
        break;
      }
    }
  }

  return messages;
}

function mapAssistantTurn(
  turn: ProviderAssistantTurn,
): ChatCompletionMessageParam {
  if (!turn.toolCalls?.length) {
    return { role: 'assistant', content: turn.content };
  }

  return {
    role: 'assistant',
    content: turn.content || null,
    tool_calls: turn.toolCalls.map((call) => ({
      id: call.id,
      type: 'function' as const,
      function: {
        name: call.name,
        arguments: call.arguments,
      },
    })),
  };
}

export function extractOpenAiTextContent(
  content: string | null | undefined,
): string {
  return content ?? '';
}
```

#### `src/providers/openai/mappers/openai-tools-provider.mapper.ts` (nowy)

```typescript
import type OpenAI from 'openai';
import type {
  ProviderChatResponse,
  ProviderToolDefinition,
} from '../../interfaces/ai-provider.interface';
import type { GatewayToolChoice } from '../../types/tooling-types';
import { parseJsonObject } from '../../helpers/parse-json-object';

type ChatCompletionTool = OpenAI.Chat.Completions.ChatCompletionTool;
type ChatCompletionMessageToolCall =
  OpenAI.Chat.Completions.ChatCompletionMessageToolCall;

export function mapToolsToOpenAi(
  tools: ProviderToolDefinition[],
): ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      ...(tool.description ? { description: tool.description } : {}),
      parameters: tool.parameters,
    },
  }));
}

export function mapToolChoiceToOpenAi(
  choice?: GatewayToolChoice,
): OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | undefined {
  if (choice === undefined) return undefined;
  if (choice === 'auto' || choice === 'none' || choice === 'required') {
    return choice;
  }
  if (typeof choice === 'object' && choice.type === 'function') {
    return {
      type: 'function',
      function: { name: choice.function.name },
    };
  }
  return undefined;
}

export function parseOpenAiCompletionWithTools(
  response: OpenAI.Chat.Completions.ChatCompletion,
): ProviderChatResponse {
  const choice = response.choices[0];
  const message = choice?.message;
  const text = message?.content ?? '';
  const toolCalls = message?.tool_calls?.length
    ? mapOpenAiToolCalls(message.tool_calls)
    : undefined;

  return {
    text,
    ...(toolCalls?.length && { toolCalls }),
    stopReason: mapOpenAiFinishReason(choice?.finish_reason),
    model: response.model,
    usage: response.usage
      ? {
          inputTokens: response.usage.prompt_tokens ?? 0,
          outputTokens: response.usage.completion_tokens ?? 0,
        }
      : undefined,
    systemFingerprint: response.system_fingerprint ?? undefined,
  };
}

function mapOpenAiToolCalls(
  raw: ChatCompletionMessageToolCall[],
): ProviderChatResponse['toolCalls'] {
  return raw
    .filter((call) => call.type === 'function')
    .map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: call.function.arguments ?? '{}',
    }));
}

function mapOpenAiFinishReason(
  reason: string | null | undefined,
): ProviderChatResponse['stopReason'] {
  switch (reason) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'tool_calls':
      return 'tool_calls';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'stop';
  }
}
```

#### `src/providers/openai/mappers/openai-params-provider.mapper.ts` (nowy)

```typescript
import type OpenAI from 'openai';
import type { ProviderCallOptions } from '../../interfaces/ai-provider.interface';

export function mapStopSequences(
  stop: ProviderCallOptions['stop'],
): string[] | undefined {
  if (stop === undefined) return undefined;
  return Array.isArray(stop) ? stop : [stop];
}

export function mapCallOptionsToChatCompletionParams(
  options?: ProviderCallOptions,
): Partial<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming> {
  if (!options) return {};

  return {
    ...(options.temperature !== undefined && {
      temperature: options.temperature,
    }),
    ...(options.maxOutputTokens !== undefined && {
      max_tokens: options.maxOutputTokens,
    }),
    ...(options.topP !== undefined && { top_p: options.topP }),
    ...(options.frequencyPenalty !== undefined && {
      frequency_penalty: options.frequencyPenalty,
    }),
    ...(options.presencePenalty !== undefined && {
      presence_penalty: options.presencePenalty,
    }),
    ...(options.seed !== undefined && { seed: options.seed }),
    ...(mapStopSequences(options.stop) && {
      stop: mapStopSequences(options.stop),
    }),
    ...(options.responseFormat?.type === 'json_object' && {
      response_format: { type: 'json_object' },
    }),
  };
}
```

#### `src/providers/openai/mappers/openai-thinking-provider.mapper.ts` (nowy)

```typescript
import type { ProviderCallOptions } from '../../interfaces/ai-provider.interface';

const OPENAI_EFFORT_LEVELS = [
  'low',
  'medium',
  'high',
] as const;

type OpenAiReasoningEffort = (typeof OPENAI_EFFORT_LEVELS)[number];

function isOpenAiEffortLevel(value: unknown): value is OpenAiReasoningEffort {
  return (
    typeof value === 'string' &&
    (OPENAI_EFFORT_LEVELS as readonly string[]).includes(value)
  );
}

export function mapThinkingToResponsesReasoning(
  options?: ProviderCallOptions,
): { effort?: OpenAiReasoningEffort } | undefined {
  if (!options?.thinkingEnabled) return undefined;

  if (isOpenAiEffortLevel(options.thinkingBudget)) {
    return { effort: options.thinkingBudget };
  }

  return { effort: 'medium' };
}
```

#### `src/providers/openai/mappers/openai-stream-provider.mapper.ts` (nowy)

```typescript
import type OpenAI from 'openai';
import type { ProviderToolCall } from '../../interfaces/ai-provider.interface';

export function extractOpenAiStreamDeltaText(
  chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
): string {
  return chunk.choices[0]?.delta?.content ?? '';
}

export function extractOpenAiStreamToolCallDeltas(
  chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
): ProviderToolCall[] {
  const deltas = chunk.choices[0]?.delta?.tool_calls;
  if (!deltas?.length) return [];

  return deltas
    .filter((d) => d.id && d.function?.name)
    .map((d) => ({
      id: d.id!,
      name: d.function!.name!,
      arguments: d.function!.arguments ?? '',
    }));
}
```

---

### Krok 2.5 — Adaptery

#### `src/providers/openai/adapters/chat-completions.adapter.ts` (nowy)

```typescript
import OpenAI from 'openai';
import { LoggingService } from 'src/logging/logging.service';
import {
  mapOpenAiSdkError,
  toHttpException,
} from '../../../common/errors/provider-error.mapper';
import type {
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
  StreamResult,
} from '../../interfaces/ai-provider.interface';
import { mapTurnsToOpenAiMessages } from '../mappers/openai-messages-provider.mapper';
import {
  mapCallOptionsToChatCompletionParams,
} from '../mappers/openai-params-provider.mapper';
import {
  mapToolChoiceToOpenAi,
  mapToolsToOpenAi,
  parseOpenAiCompletionWithTools,
} from '../mappers/openai-tools-provider.mapper';
import {
  extractOpenAiStreamDeltaText,
  extractOpenAiStreamToolCallDeltas,
} from '../mappers/openai-stream-provider.mapper';

export function createChatCompletionsAdapter(
  client: OpenAI,
  logger: LoggingService,
) {
  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      try {
        const messages = mapTurnsToOpenAiMessages(input.messages, input.system);
        const baseParams = {
          model: modelId,
          messages,
          ...mapCallOptionsToChatCompletionParams(options),
        };

        const params = input.tools?.length
          ? {
              ...baseParams,
              tools: mapToolsToOpenAi(input.tools),
              tool_choice: mapToolChoiceToOpenAi(input.toolChoice),
            }
          : baseParams;

        const response = await client.chat.completions.create(params);
        return parseOpenAiCompletionWithTools(response);
      } catch (error) {
        logger.warn('OpenAI chat.completions error', {
          model: modelId,
          message: error instanceof Error ? error.message : String(error),
        });
        throw toHttpException(mapOpenAiSdkError(error));
      }
    },

    stream(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): StreamResult {
      let finalChunk: OpenAI.Chat.Completions.ChatCompletionChunk | undefined;
      const accumulatedToolCalls = new Map<string, { name: string; args: string }>();

      async function* textStream(): AsyncIterable<string> {
        try {
          const messages = mapTurnsToOpenAiMessages(
            input.messages,
            input.system,
          );
          const stream = await client.chat.completions.create({
            model: modelId,
            messages,
            stream: true,
            stream_options: { include_usage: true },
            ...mapCallOptionsToChatCompletionParams(options),
            ...(input.tools?.length && {
              tools: mapToolsToOpenAi(input.tools),
              tool_choice: mapToolChoiceToOpenAi(input.toolChoice),
            }),
          });

          for await (const chunk of stream) {
            finalChunk = chunk;
            for (const partial of extractOpenAiStreamToolCallDeltas(chunk)) {
              const existing = accumulatedToolCalls.get(partial.id);
              accumulatedToolCalls.set(partial.id, {
                name: partial.name || existing?.name || '',
                args: (existing?.args ?? '') + partial.arguments,
              });
            }
            const delta = extractOpenAiStreamDeltaText(chunk);
            if (delta) yield delta;
          }
        } catch (error) {
          logger.warn('OpenAI chat.completions stream error', {
            model: modelId,
            message: error instanceof Error ? error.message : String(error),
          });
          throw toHttpException(mapOpenAiSdkError(error));
        }
      }

      return {
        textStream: textStream(),
        getUsageMetadata: async () => {
          const usage = finalChunk?.usage;
          if (!usage) return undefined;
          return {
            inputTokens: usage.prompt_tokens ?? 0,
            outputTokens: usage.completion_tokens ?? 0,
            model: finalChunk?.model ?? modelId,
          };
        },
        getFinalToolCalls: async () => {
          if (accumulatedToolCalls.size === 0) return undefined;
          return [...accumulatedToolCalls.entries()].map(([id, call]) => ({
            id,
            name: call.name,
            arguments: call.args || '{}',
          }));
        },
        getStopReason: async () => {
          const reason = finalChunk?.choices[0]?.finish_reason;
          if (reason === 'tool_calls') return 'tool_calls';
          if (reason === 'length') return 'length';
          return 'stop';
        },
        getSystemFingerprint: async () => finalChunk?.system_fingerprint,
      };
    },
  };
}
```

#### `src/providers/openai/adapters/responses.adapter.ts` (nowy)

```typescript
import OpenAI from 'openai';
import { LoggingService } from 'src/logging/logging.service';
import {
  mapOpenAiSdkError,
  toHttpException,
} from '../../../common/errors/provider-error.mapper';
import type {
  ProviderCallOptions,
  ProviderChatInput,
  ProviderChatResponse,
  StreamResult,
} from '../../interfaces/ai-provider.interface';
import { mapTurnsToOpenAiMessages } from '../mappers/openai-messages-provider.mapper';
import { mapCallOptionsToChatCompletionParams } from '../mappers/openai-params-provider.mapper';
import { mapThinkingToResponsesReasoning } from '../mappers/openai-thinking-provider.mapper';
import {
  mapToolChoiceToOpenAi,
  mapToolsToOpenAi,
} from '../mappers/openai-tools-provider.mapper';

export function createResponsesAdapter(client: OpenAI, logger: LoggingService) {
  return {
    async complete(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): Promise<ProviderChatResponse> {
      try {
        const reasoning = mapThinkingToResponsesReasoning(options);
        const sampling = mapCallOptionsToChatCompletionParams(options);

        const response = await client.responses.create({
          model: modelId,
          input: mapTurnsToOpenAiMessages(input.messages, input.system),
          ...(reasoning && { reasoning }),
          ...(sampling.temperature !== undefined && {
            temperature: sampling.temperature,
          }),
          ...(sampling.max_tokens !== undefined && {
            max_output_tokens: sampling.max_tokens,
          }),
          ...(input.tools?.length && {
            tools: mapToolsToOpenAi(input.tools),
            tool_choice: mapToolChoiceToOpenAi(input.toolChoice),
          }),
        });

        const text =
          response.output_text ??
          response.output
            ?.filter((item) => item.type === 'message')
            .flatMap((item) =>
              item.type === 'message'
                ? item.content
                    .filter((c) => c.type === 'output_text')
                    .map((c) => (c.type === 'output_text' ? c.text : ''))
                : [],
            )
            .join('') ??
          '';

        return {
          text,
          model: response.model ?? modelId,
          usage: response.usage
            ? {
                inputTokens: response.usage.input_tokens ?? 0,
                outputTokens: response.usage.output_tokens ?? 0,
              }
            : undefined,
        };
      } catch (error) {
        logger.warn('OpenAI responses error', {
          model: modelId,
          message: error instanceof Error ? error.message : String(error),
        });
        throw toHttpException(mapOpenAiSdkError(error));
      }
    },

    stream(
      input: ProviderChatInput,
      modelId: string,
      options?: ProviderCallOptions,
    ): StreamResult {
      let lastResponseId: string | undefined;

      async function* textStream(): AsyncIterable<string> {
        try {
          const reasoning = mapThinkingToResponsesReasoning(options);
          const stream = await client.responses.create({
            model: modelId,
            input: mapTurnsToOpenAiMessages(input.messages, input.system),
            stream: true,
            ...(reasoning && { reasoning }),
            ...(input.tools?.length && {
              tools: mapToolsToOpenAi(input.tools),
              tool_choice: mapToolChoiceToOpenAi(input.toolChoice),
            }),
          });

          for await (const event of stream) {
            if (event.type === 'response.created') {
              lastResponseId = event.response.id;
            }
            if (event.type === 'response.output_text.delta') {
              yield event.delta;
            }
          }
        } catch (error) {
          logger.warn('OpenAI responses stream error', {
            model: modelId,
            message: error instanceof Error ? error.message : String(error),
          });
          throw toHttpException(mapOpenAiSdkError(error));
        }
      }

      return {
        textStream: textStream(),
        getUsageMetadata: async () => undefined,
        getStopReason: async () => 'stop',
      };
    },
  };
}
```

---

### Krok 2.7 — Error mapper

| Akcja | Plik |
|-------|------|
| NEW | `src/providers/openai/openai-error.mapper.ts` |
| MODIFY | `src/common/errors/provider-error.mapper.ts` |

#### `src/providers/openai/openai-error.mapper.ts` (nowy)

```typescript
import { HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import type { MappedProviderError } from '../../common/errors/provider-error.mapper';
import {
  readErrorMessage,
  readNumericStatus,
  nameLooksLikeTimeout,
} from '../../common/errors/provider-error.mapper.helpers';

function payloadOf(message: string, code: ApiErrorCode) {
  return { code, message, details: [] as [] };
}

export function mapOpenAiSdkError(error: unknown): MappedProviderError {
  const fallbackMsg = readErrorMessage(error, 'OpenAI request failed.');

  if (error instanceof OpenAI.APIError) {
    const status =
      typeof error.status === 'number' ? error.status : HttpStatus.BAD_GATEWAY;

    if (status === 429) {
      return {
        httpStatus: HttpStatus.TOO_MANY_REQUESTS,
        payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_RATE_LIMITED),
      };
    }
    if (status === 401 || status === 403) {
      return {
        httpStatus: HttpStatus.UNAUTHORIZED,
        payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_AUTH_FAILED),
      };
    }
    if (status === 408 || status === 504) {
      return {
        httpStatus: HttpStatus.GATEWAY_TIMEOUT,
        payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_TIMEOUT),
      };
    }
    if (status >= 500) {
      return {
        httpStatus: HttpStatus.BAD_GATEWAY,
        payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_UNAVAILABLE),
      };
    }
    if (status >= 400) {
      return {
        httpStatus: HttpStatus.BAD_REQUEST,
        payload: payloadOf(fallbackMsg, ApiErrorCode.VALIDATION_FAILED),
      };
    }
  }

  const status = readNumericStatus(error);
  if (nameLooksLikeTimeout(error) || status === 408 || status === 504) {
    return {
      httpStatus: HttpStatus.GATEWAY_TIMEOUT,
      payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_TIMEOUT),
    };
  }

  return {
    httpStatus: HttpStatus.BAD_GATEWAY,
    payload: payloadOf(fallbackMsg, ApiErrorCode.PROVIDER_UNAVAILABLE),
  };
}
```

#### `src/common/errors/provider-error.mapper.ts` — [DODANE]

```typescript
// [DODANE] — re-export
export { mapOpenAiSdkError } from '../../providers/openai/openai-error.mapper';
```

---

### Krok 2.8 — Fabryka rdzeniowa

#### `src/providers/factories/create-openai-provider.core.ts` (nowy)

```typescript
import OpenAI from 'openai';
import { LoggingService } from 'src/logging/logging.service';
import {
  assertOpenAiProviderType,
  type GatewayProviderType,
} from '../../config/provider-types';
import type { AIProvider } from '../interfaces/ai-provider.interface';
import type { OpenAiProviderConfig } from '../openai/openai-provider.types';
import { selectApiSurface } from '../openai/select-api-surface';
import { createChatCompletionsAdapter } from '../openai/adapters/chat-completions.adapter';
import { createResponsesAdapter } from '../openai/adapters/responses.adapter';

export function createOpenAiProviderCore(
  providerType: GatewayProviderType,
  config: OpenAiProviderConfig,
  loggingService: LoggingService,
): AIProvider {
  assertOpenAiProviderType(providerType);

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    ...(config.defaultHeaders && { defaultHeaders: config.defaultHeaders }),
  });

  const logger = loggingService.child({
    module: 'OpenAiProviderCore',
    providerType,
  });

  const chatCompletions = createChatCompletionsAdapter(client, logger);
  const responses = createResponsesAdapter(client, logger);

  logger.info('OpenAI provider core created.', {
    baseUrl: config.baseUrl,
    apiSurface: config.apiSurface,
  });

  return {
    async complete(input, modelId, options) {
      const surface = selectApiSurface(
        providerType,
        config,
        modelId,
        options ?? {},
        input,
      );
      if (surface === 'responses') {
        return responses.complete(input, modelId, options);
      }
      return chatCompletions.complete(input, modelId, options);
    },

    stream(input, modelId, options) {
      const surface = selectApiSurface(
        providerType,
        config,
        modelId,
        options ?? {},
        input,
      );
      if (surface === 'responses') {
        return responses.stream(input, modelId, options);
      }
      return chatCompletions.stream(input, modelId, options);
    },
  };
}
```

#### `src/providers/factories/create-openai-provider.core.spec.ts` (nowy)

```typescript
import OpenAI from 'openai';
import { createOpenAiProviderCore } from './create-openai-provider.core';
import { createMockLoggingService } from '../../common/mocks/createMockLoggingService';

jest.mock('openai');

describe('createOpenAiProviderCore', () => {
  it('throws for non-OpenAI provider type', () => {
    expect(() =>
      createOpenAiProviderCore(
        'anthropic',
        {
          apiKey: 'x',
          baseUrl: 'https://api.openai.com/v1',
          apiSurface: 'auto',
        },
        createMockLoggingService() as never,
      ),
    ).toThrow(/Unsupported provider type/);
  });

  it('creates OpenAI client with baseURL', () => {
    createOpenAiProviderCore(
      'openai',
      {
        apiKey: 'sk-test',
        baseUrl: 'https://api.openai.com/v1',
        apiSurface: 'auto',
      },
      createMockLoggingService() as never,
    );
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'sk-test',
        baseURL: 'https://api.openai.com/v1',
      }),
    );
  });
});
```

### Kryteria ukończenia Fazy 2

- [ ] Rdzeń SDK kompletny; `createOpenAiProviderCore` gotowy do użycia w wrapperach
- [ ] Testy routingu potwierdzają priorytet thinking > responses-only
- [ ] Błędy SDK → `PROVIDER_*`

---

## Faza 3 — Runtime `type: openai` (MVP)

### Krok 3.1 — Fabryka `create-openai-provider.ts`

| Akcja | Plik |
|-------|------|
| NEW | `src/providers/factories/create-openai-provider.ts` |
| NEW | `src/providers/factories/create-openai-provider.spec.ts` |

#### `src/providers/factories/create-openai-provider.ts` (nowy)

```typescript
import type { ProviderFactoryFn } from './provider-factory.types';
import { createOpenAiProviderCore } from './create-openai-provider.core';

export const createOpenAiProvider: ProviderFactoryFn = (config, logger) => {
  if (config.type !== 'openai') {
    throw new Error(
      `[createOpenAiProvider] Expected type "openai", got "${config.type}".`,
    );
  }
  if (!config.baseUrl || config.apiSurface === undefined) {
    throw new Error(
      `[createOpenAiProvider] Missing baseUrl or apiSurface for instance ${config.instanceId}`,
    );
  }
  return createOpenAiProviderCore(
    config.type,
    {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      apiSurface: config.apiSurface,
    },
    logger,
  );
};
```

### Krok 3.2 — Bootstrap

| Akcja | Plik |
|-------|------|
| MODIFY | `src/providers/provider-instances.bootstrap.ts` |

```typescript
// [ZMIENIONE] — import
import { createOpenAiProvider } from './factories/create-openai-provider';
// [USUNIĘTE] import createOpenAiProviderStub

// [ZMIENIONE] — mapa FACTORIES
  openai: createOpenAiProvider,
```

### Krok 3.3 — Capabilities i policy

| Akcja | Plik |
|-------|------|
| MODIFY | `src/cli/constants/thinking-capable-models.ts` |
| MODIFY | `src/cli/constants/default-models.ts` |
| MODIFY | `src/chat/helpers/generation-warnings.ts` |

#### `src/cli/constants/thinking-capable-models.ts` — [DODANE]

```typescript
export const THINKING_CAPABLE_MODEL_PATTERNS: Partial<
  Record<GatewayProviderType, RegExp[]>
> = {
  anthropic: [ /* bez zmian */ ],
  google: [ /* bez zmian */ ],
  // [DODANE]
  openai: [/^o\d/i, /^gpt-5/i],
  // openai-compatible — brak domyślnych wzorców thinking (MVP)
};
```

#### `src/cli/constants/default-models.ts` — [DODANE]

```typescript
export const DEFAULT_MODELS: Partial<Record<GatewayProviderType, string>> = {
  anthropic: 'claude-sonnet-4-5-20250929',
  google: 'gemini-2.5-flash',
  // [DODANE]
  openai: 'gpt-4o',
  'openai-compatible': 'llama3.2',
};
```

#### `src/chat/helpers/generation-warnings.ts` — [DODANE]

```typescript
  // [DODANE] — po istniejących regułach
  if (options.topK !== undefined && providerType === 'openai') {
    warnings.push({
      code: 'PARAM_IGNORED_BY_PROVIDER',
      message:
        'Parameter topK has limited support on OpenAI chat/completions and may be ignored.',
      field: 'params.topK',
    });
  }

  if (
    options.topK !== undefined &&
    providerType === 'openai-compatible'
  ) {
    warnings.push({
      code: 'PARAM_IGNORED_BY_PROVIDER',
      message: `Parameter topK is not supported by provider ${providerType} and was ignored.`,
      field: 'params.topK',
    });
  }
```

### Krok 3.4 — Fasada HTTP

| Akcja | Plik |
|-------|------|
| MODIFY | `src/integrations/openai/mappers/openai-request.mapper.ts` |

> Plik **już mapuje** `reasoning_effort` → `thinkingEnabled` / `thinkingBudget` (linie 70–73). Brak routingu upstream — zgodnie z planem **bez zmian** w Fazie 3.

### Krok 3.5 — CLI `provider:test`

| Akcja | Plik |
|-------|------|
| MODIFY | `src/cli/services/provider-test.service.ts` |
| MODIFY | `src/cli/commands/provider/provider-test.command.ts` |

#### `src/cli/services/provider-test.service.ts` — [DODANE]

```typescript
import OpenAI from 'openai';

// [DODANE]
  async testOpenAi(apiKey: string, baseUrl: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey, baseURL: baseUrl });
      await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch (err) {
      if (err instanceof Error) {
        CliLogger.error(`OpenAI test failed: ${err.message}`);
      }
      return false;
    }
  }
```

#### `src/cli/commands/provider/provider-test.command.ts` — [DODANE] w `testSingleProvider`

```typescript
    // [ZMIENIONE] — apiKey opcjonalny dla OpenAI
    const apiKey = process.env[provider.apiKeyRef] ?? '';

    if (provider.type === 'anthropic' || provider.type === 'google') {
      if (!apiKey) { /* istniejący throw */ }
    }

    // [DODANE]
    if (provider.type === 'openai' || provider.type === 'openai-compatible') {
      const baseUrlRef = provider.baseUrlRef;
      const baseUrl = baseUrlRef ? process.env[baseUrlRef] : undefined;
      if (!baseUrl) {
        spinner.fail('Base URL not found.');
        CliLogger.error(
          `Please ensure ${baseUrlRef} is set in your .env file.`,
        );
        process.exit(1);
      }
      success = await this.tester.testOpenAi(apiKey, baseUrl);
    }
```

### Kryteria ukończenia Fazy 3 (MVP)

- [ ] GPT-4o → chat/completions; reasoning + `thinkingEnabled` → responses
- [ ] Stream + tool calls na obu surface'ach
- [ ] `generation-warnings` dla `openai`

---

## Faza 4 — Runtime `type: openai-compatible`

### Krok 4.1 — Fabryka wrappera

| Akcja | Plik |
|-------|------|
| NEW | `src/providers/factories/create-openai-compatible-provider-instance.ts` |
| NEW | `src/providers/factories/create-openai-compatible-provider-instance.spec.ts` |

#### `src/providers/factories/create-openai-compatible-provider-instance.ts` (nowy)

```typescript
import type { ProviderFactoryFn } from './provider-factory.types';
import { createOpenAiProviderCore } from './create-openai-provider.core';

export const createOpenAiCompatibleProviderInstance: ProviderFactoryFn = (
  config,
  logger,
) => {
  if (config.type !== 'openai-compatible') {
    throw new Error(
      `[createOpenAiCompatibleProviderInstance] Expected type "openai-compatible", got "${config.type}".`,
    );
  }
  if (!config.baseUrl || config.apiSurface === undefined) {
    throw new Error(
      `[createOpenAiCompatibleProviderInstance] Missing baseUrl or apiSurface for instance ${config.instanceId}`,
    );
  }
  return createOpenAiProviderCore(
    config.type,
    {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      apiSurface: config.apiSurface,
    },
    logger,
  );
};
```

### Krok 4.2 — Bootstrap

| Akcja | Plik |
|-------|------|
| MODIFY | `src/providers/provider-instances.bootstrap.ts` |

```typescript
// [ZMIENIONE]
import { createOpenAiCompatibleProviderInstance } from './factories/create-openai-compatible-provider-instance';

const FACTORIES = {
  // ...
  'openai-compatible': createOpenAiCompatibleProviderInstance,
};
```

### Krok 4.3 — CLI

Zmiany z Fazy 3 (`provider:test`, wizard, `DEFAULT_MODELS`) już obejmują `openai-compatible`. Brak dodatkowych plików.

### Kryteria ukończenia Fazy 4

- [ ] Ollama / Deepseek — `complete` + `stream` przez chat/completions
- [ ] Pusty klucz — OK
- [ ] `selectApiSurface('openai-compatible', …)` → zawsze chat-completions

---

## Faza 5 — Hardening i release

Bez zmian kodu w planie — observability, review SPEC, `npm run openapi:export` jeśli zmiany w DTO.

---

## Podsumowanie faz

| Faza | Co dodajesz | Zależności |
|------|-------------|------------|
| **0** | Decyzje, konwencja nazw | — |
| **1** | Typy → YAML → defaults → runtime → walidacja env → fabryka context → bootstrap (stuby) → CLI | 0 |
| **2** | Listy modeli, `selectApiSurface`, mapery, adaptery, `createOpenAiProviderCore` | 1 |
| **3** | Wrapper `openai`, capabilities, integracja gateway (MVP) | 2 |
| **4** | Wrapper `openai-compatible` (zamiana stubu) | 2 |
| **5** | Observability, release | 3, 4 |

---

## Struktura docelowa plików

```
src/config/
  provider-types.ts                         # MODIFY
  provider-types.openai.spec.ts             # NEW (Faza 1)
  provider-api-key.validation.ts            # MODIFY
  provider-base-url.validation.ts           # NEW (Faza 1)
  gateway-config.schema.ts                  # MODIFY
  configuration.ts                          # MODIFY
src/providers/
  openai/
    openai-provider.types.ts                # NEW (Faza 1)
    resolve-api-surface-default.ts          # NEW (Faza 1)
    openai-api-surface.models.ts            # NEW (Faza 2)
    select-api-surface.ts                   # NEW (Faza 2)
    openai-error.mapper.ts                  # NEW (Faza 2)
    mappers/*-provider.mapper.ts            # NEW (Faza 2)
    adapters/                               # NEW (Faza 2)
  factories/
    provider-factory.types.ts               # NEW (Faza 1)
    wrap-legacy-provider-factory.ts         # NEW (Faza 1)
    create-openai-provider.stub.ts          # NEW (Faza 1) → zastąpiony Faza 3
    create-openai-compatible-provider.stub.ts # NEW (Faza 1) → zastąpiony Faza 4
    create-openai-provider.core.ts          # NEW (Faza 2)
    create-openai-provider.ts               # NEW (Faza 3)
    create-openai-compatible-provider-instance.ts # NEW (Faza 4)
    create-anthropic-provider.ts            # bez zmian
    create-google-provider.ts               # bez zmian
  provider-instances.bootstrap.ts           # MODIFY (Faza 1, 3, 4)
src/cli/ ...                                # MODIFY (Faza 1, 3)
src/common/errors/provider-error.mapper.ts  # MODIFY (Faza 2 — re-export)
src/chat/helpers/generation-warnings.ts     # MODIFY (Faza 3)
```

---

## Macierz walidacji (Faza 1)

| Reguła | Zod `superRefine` | `buildEffectiveGatewayConfig` | Bootstrap |
|--------|-------------------|-------------------------------|-----------|
| `baseUrlRef` dla typów OpenAI | tak | `provider-base-url.validation` | — |
| `apiSurface: auto\|responses` tylko `openai` | tak | — | — |
| Domyślne `apiSurface` | — | `resolveApiSurfaceDefault` | — |
| Klucz wymagany anthropic/google | — | `assertEnabledProviderApiKeysPresent` | throw |
| Klucz opcjonalny openai/compatible | — | brak błędu | `''` do fabryki |
| Fabryka (stub lub real) | — | — | wpis w `FACTORIES` obowiązkowy |

---

## Ryzyka i mitigacje

| Ryzyko | Mitigacja |
|--------|-----------|
| Responses API niestabilne | Izolowany `responses.adapter.ts` + testy mock SDK |
| Nakładanie list modeli | Priorytet thinking w `selectApiSurface`; test regresji |
| Stub vs włączona instancja | Stub = start OK, błąd przy `complete`/`stream` |
| Homonimy mapperów | Suffix `-provider.mapper.ts` |
| Rozjazd `apiSurface` defaults | Jedna funkcja `resolveApiSurfaceDefault` |
| Regresja anthropic/google | `wrapLegacyProviderFactory` — zero diffu w fabrykach legacy |

---

## Ćwiczenie weryfikacyjne (po Fazie 3)

1. `.env`: `OPENAI_API_KEY`, `OPENAI_BASE_URL=https://api.openai.com/v1`
2. YAML `type: openai` + `baseUrlRef`
3. `config:validate` — `apiSurface` effective = `auto`
4. Chat GPT-4o → chat/completions; `thinkingEnabled` na reasoning → responses
5. `npm test`

## Ćwiczenie weryfikacyjne (po Fazie 4)

1. YAML `openai-compatible`, pusty `OLLAMA_API_KEY`, poprawny `OLLAMA_BASE_URL`
2. `config:validate` — effective `apiSurface` = `chat-completions`
3. `apiSurface: auto` na compatible → błąd Zod
4. Alias compatible → chat/completions
