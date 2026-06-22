# Plan likwidacji rozjazdów — AI Provider Gateway

**Status:** ⏸️ Tymczasowo wstrzymany (ostatnia aktywność: R0 ✅ 2026-06-19 · R1 ✅ 2026-06-20 · R3 ✅ WYKONANA 2026-06-22 · R4.4 ✅ WYKONANY 2026-06-22)  
**Data wstrzymania:** 2026-06-22  
**Baseline:** audyt architektoniczny 2026-06-19 (dokumentacja `docs/` + kod `src/`, w tym `src/integrations/`)  
**Snapshot testów (R0.1):** unit 58 suites / 1009 tests · e2e 7 suites / 60 tests · `npm run test:all` ✅  
**OpenAPI (R0.1):** `OPENAPI_VERSION` = `info.version` = `0.12.0` · `OPENAPI_SPEC_VERSION` = root `openapi` = `3.1.0` · `npm run openapi:export` ✅  
**Cel:** Usunąć wszystkie zidentyfikowane rozjazdy dokumentacja ↔ kod, luki kontraktu API, asymetrie walidacji między powierzchniami HTTP oraz braki w adopcji projektu przez osoby trzecie — **bez zmian w deploymentcie** (Docker, CI produkcyjne, infrastruktura — na koniec osobnego planu).

**Poza zakresem tego planu:** wdrożenie `create-openai-provider.ts` (provider runtime OpenAI.com), pełny tool runner MCP, persistence historii konwersacji, billing.

**Powiązane:** `integrations-plan.md`, `tools_implementation.md`, `docs/integracje.md`, `docs/dictionary.md`, `docs/anty-patterny.md`, `docs/dokumentacja_koncepcyjna.md`.

**Aktualizacja planu:** 2026-06-22 — plan oznaczony jako tymczasowo wstrzymany; 2026-06-19 — pierwsza wersja na podstawie raportu architektonicznego; uzupełniona o konkretne fragmenty kodu do wprowadzenia.

> **⏸️ Plan tymczasowo wstrzymany** — realizacja pozostałych faz (R2, R4, R5) wstrzymana do czasu wznowienia. Dotychczasowy postęp i rejestr rozjazdów pozostają aktualne.

---

## 🎯 Filozofia planu

1. **Źródło prawdy:** zachowanie runtime = `src/` + `openapi.json`; dokumentacja i plany muszą to odzwierciedlać, nie odwrotnie.
2. **Najpierw kontrakt, potem DX** — enforcement `capabilities`, wspólna walidacja ingress do `ChatService`, dopiero potem `warnings` i przykłady.
3. **Trzy powierzchnie, jeden silnik** — asymetrie native vs fasady są **dopuszczalne**, ale muszą być **jawnie opisane i testowane** (nie przypadkowe).
4. **Additive where possible** — nowe pola (`warnings`) i kody błędów bez łamania istniejących klientów.
5. **Iteracje pionowe** — każda faza kończy się `npm test`, `npm run test:e2e`, aktualizacją docs i (gdzie dotyczy) `npm run openapi:export`.
6. **Deployment na koniec** — ten plan nie obejmuje pipeline'ów ani hostingu.
7. **Konkretny kod w planie** — każdy krok zawiera dokładne fragmenty kodu z oznaczeniami `// NEW:` lub `// CHANGE:` dla zmian.

**Szacowany czas łącznie:** ~19–29h (R0: 1h, R1: 5–7h, R2: 5–7h, R3: 4–6h, R4: 4–6h, R5 opcjonalnie: 8–12h+)

---

## 📋 Rejestr rozjazdów (mapa na fazy)

| ID | Problem | Priorytet | Faza |
|----|---------|-----------|------|
| **D1** | `capabilities.thinking` w docs, brak enforcement w kodzie | P0 | R1 |
| **D2** | Dwa profile walidacji: native DTO vs fasady → `ChatService` bez re-walidacji | P0 | R1 |
| **D3** | OpenAI **fasada** vs **provider** — myląca komunikacja w README/docs | P0 | R3 |
| **D4** | `frequencyPenalty` / `presencePenalty` akceptowane, cicho ignorowane przez adaptery | P1 | R2 |
| **D5** | Brak `warnings` / sygnału dla ignorowanych parametrów | P1 | R2 |
| **D6** | `opis_koncepcyjny.md` — przestarzały alias z treścią | P1 | R3 |
| **D7** | `dictionary-thinking-additions.md` — orphan / brak integracji ze słownikiem | P2 | R3 |
| **D8** | `mcp.md` sugeruje `mcp.configPath` per alias — brak w Zod/kodzie | P2 | R3 |
| **D9** | Numeracja MVP / Faz myląca w `dokumentacja_koncepcyjna.md` | P2 | R3 |
| **D10** | `package.json` `1.0.0` vs OpenAPI `0.12.0` — brak strategii wersji | P1 | R4 |
| **D11** | `"private": true` + MIT — niespójny sygnał adopcji OSS | P1 | R4 |
| **D12** | Brak `CHANGELOG.md` (anulowany — R4.2), ~~`CONTRIBUTING.md`~~ (anulowany — R4.3.1), `SECURITY.md` | P1 | R4 |
| **D13** | Brak `examples/` dla trzech powierzchni API | P1 | R4 |
| **D14** | Redundancja README ↔ `docs/README` (ryzyko rozjazdu liczników) | P2 | R3 |
| **D15** | `anty-patterny.md` §5 bez wyjątku dla fasad IDE | P2 | R3 |
| **D16** | Limity treści native (3k) vs fasady (128k) — słabo opisane | P1 | R3 |
| **D17** | System prompt po stronie serwera — niewystarczająco prominentny dla użytkowników IDE | P1 | R3 |
| **D18** | Brak testów asymetrii native vs facade (15k messages) | P1 | R1 |
| **D19** | Brak ADR dla kluczowych decyzji architektonicznych | P2 | R4 |
| **D20** | Brak macierzy kompatybilności IDE (Cursor / Claude Code) | P2 | R4 |
| **D21** | Brak contract testów OpenAPI ↔ E2E | P3 | R5 |
| **D22** | Brak klienta TS z `openapi.json` | P3 | R5 |
| **D23** | Health bez „config summary" (aliasy, instancje — bez sekretów) | P3 | R5 |
| **D24** | Mieszane importy `src/` vs względne w `src/` | P3 | R5 |
| **D25** | Brak adaptera OpenAI w `src/providers/` (świadomy gap produktowy) | P3 | R5 |

---

## 📊 Przegląd faz

| Faza | Cel | Szacunek | Status |
|------|-----|----------|--------|
| **R0. Baseline i zamrożenie listy** | Potwierdzenie rozjazdów w kodzie, checklist PR | 1h | ✅ |
| **R1. Kontrakt i walidacja (kod)** | `capabilities.thinking`, `ChatIngressValidator`, testy asymetrii | 5–7h | ✅ |
| **R2. DX integratorów (kod)** | `warnings`, mapowanie ignorowanych parametrów, typy/mocki/testy unit | 5–7h | ⏳ |
| **R3. Dokumentacja — synchronizacja** | Docs, README, anty-patterny, komunikacja fasada≠provider | 4–6h | ✅ |
| **R4. Adopcja OSS** | ~~CHANGELOG~~, ~~CONTRIBUTING~~, SECURITY, examples, wersjonowanie | 4–6h | ⏳ |
| **R5. Opcjonalne (v1+)** | ADR, health summary, OpenAI provider, contract tests, klient TS | 8–12h+ | ⏳ |

---

## 🧭 Kolejność pracy

1. **R0** — baseline (must-have przed kodem)
2. **R1** — P0 kontraktu (thinking + ingress + testy)
3. **R3.1–R3.3** — równolegle z R1: README i integracje (fasada≠provider, system prompt) — same docs
4. **R2** — warnings (zależy od R1 — wspólny punkt w `ChatResponseBuilderService`): R2.1 → R2.2 → R2.3 → **R2.4** (domknięcie typów/mocków/testów unit)
5. **R3** — reszta docs (orphan files, mcp, MVP, anty-patterny)
6. **R4** — artefakty OSS
7. **R5** — według potrzeb produktowych

**Weryfikacja po każdej fazie:**

```bash
npm run build
npm test
npm run test:e2e
npm run config:validate   # gdy zmieniono schema/docs configu
npm run openapi:export    # gdy zmieniono DTO / kontrolery
npm run lint
```

---

## R0: Baseline i zamrożenie listy (1h) ✅

**Cel:** Upewnić się, że plan odnosi się do aktualnego kodu; zdefiniować Definition of Done dla całego planu.

### Krok R0.1: Snapshot repozytorium (15min) ✅ 2026-06-19

**Akcja:**

- [x] Uruchom `npm test` i `npm run test:e2e` — zapisz liczby zestawów/przypadków w nagłówku tego pliku po zakończeniu R0.
- [x] Sprawdź spójność wersji OpenAPI w `src/swagger/swagger.constants.ts` vs `openapi.json` (**to nie jest jedna liczba — dwa niezależne pola**):
  - `OPENAPI_VERSION` === `openapi.json` → `info.version` (semver **kontraktu HTTP** API gatewaya, np. `0.12.0`);
  - `OPENAPI_SPEC_VERSION` === `openapi.json` → klucz root `"openapi"` (wersja **formatu specyfikacji** OpenAPI, np. `3.1.0` — nie mylić z semver kontraktu).
  - Po `npm run openapi:export` oba mapowania nadal się zgadzają.
- [x] Grep: `capabilities.thinking`, `THINKING_NOT_SUPPORTED`, `ChatIngressValidator`, `warnings` — potwierdź brak (baseline).

**Wyniki weryfikacji (2026-06-19):**

| Sprawdzenie | Wynik |
|-------------|-------|
| `npm test` | 58 suites, 1009 tests — PASS |
| `npm run test:e2e` | 7 suites, 60 tests — PASS |
| `OPENAPI_VERSION` ↔ `info.version` | `0.12.0` ↔ `0.12.0` ✅ |
| `OPENAPI_SPEC_VERSION` ↔ root `openapi` | `3.1.0` ↔ `3.1.0` ✅ |
| `npm run openapi:export` | wersje bez rozjazdu po eksporcie ✅ |
| `capabilities.thinking` w `src/` | brak enforcement (tylko docs) ✅ |
| `THINKING_NOT_SUPPORTED` w `src/` | brak ✅ |
| `ChatIngressValidator` w `src/` | brak ✅ |
| `warnings` w `src/chat/` (response DTO) | brak ✅ |

**Definition of Done (cały plan):**

- [ ] Wszystkie ID **D1–D18** zamknięte lub świadomie przeniesione do R5 z komentarzem w docs.
- [ ] `npm run test:all` zielone.
- [ ] `openapi.json` wygenerowany i zgodny z kodem.
- [ ] `docs/README.md` linkuje do nowych artefaktów (examples, ADR jeśli powstaną; ~~CHANGELOG~~ — R4.2 anulowany).

**Commit:** `docs(plan): baseline rozjazdy likwidacja R0`

---

### Krok R0.2: Checklist PR dla każdej fazy (15min) ✅ ZROZUMIANE 2026-06-19

**Akcja (stosować przy każdym PR z tego planu):** W opisie PR podaj:

1. Które ID **D*** zamyka.
2. Czy zmieniono kontrakt HTTP (tak/nie → bump `OPENAPI_VERSION`).
3. Czy zaktualizowano `docs/` i ewentualnie `README.md`.
4. Wynik `npm run test:all`.

---

## R1: Kontrakt i walidacja — kod (5–7h)

**Cel:** Zamknąć **D1**, **D2**, **D18** — spójny kontrakt capability oraz jawna polityka wejścia do `ChatService`.

### Krok R1.1: Enforcement `capabilities.thinking` (1.5–2h) — **D1** ✅ WYKONANY 2026-06-20

**Problem:** Docs (`dictionary.md`, README, `integracje.md`) wymagają `capabilities.thinking: true`. Kod wymusza analogicznie `tools` i `streaming` w `ChatValidationService`, ale **nie** `thinking`.

**Pliki do zmiany:**

| Plik | Zmiana |
|------|--------|
| `src/common/errors/api-error.code.ts` | Dodać kod `THINKING_NOT_SUPPORTED` |
| `src/chat/services/chat-validation.service.ts` | Dodać metodę `validateThinking()` |
| `src/chat/services/chat-validation.service.spec.ts` | Testy walidacji thinking |
| `src/chat/chat.service.spec.ts` | Testy propagacji błędu |
| `docs/dictionary.md` | Wiersz w tabeli kodów błędów |

#### 1.1.1 Plik: `src/common/errors/api-error.code.ts`

**Stan wyjściowy:** Obecny kod:

```typescript
export const ApiErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MODEL_ALIAS_NOT_FOUND: 'MODEL_ALIAS_NOT_FOUND',
  MODEL_NOT_ALLOWED: 'MODEL_NOT_ALLOWED',
  PROVIDER_UNSUPPORTED: 'PROVIDER_UNSUPPORTED',
  PROVIDER_AUTH_FAILED: 'PROVIDER_AUTH_FAILED',
  PROVIDER_RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  STREAMING_NOT_SUPPORTED: 'STREAMING_NOT_SUPPORTED',
  GATEWAY_KEY_NOT_CONFIGURED: 'GATEWAY_KEY_NOT_CONFIGURED',
  GATEWAY_KEY_MISSING: 'GATEWAY_KEY_MISSING',
  GATEWAY_KEY_INVALID: 'GATEWAY_KEY_INVALID',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  TOOLS_NOT_SUPPORTED: 'TOOLS_NOT_SUPPORTED',
} as const;
```

**Zmiana:** Dodać kod `THINKING_NOT_SUPPORTED` po `TOOLS_NOT_SUPPORTED`:

```typescript
export const ApiErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MODEL_ALIAS_NOT_FOUND: 'MODEL_ALIAS_NOT_FOUND',
  MODEL_NOT_ALLOWED: 'MODEL_NOT_ALLOWED',
  PROVIDER_UNSUPPORTED: 'PROVIDER_UNSUPPORTED',
  PROVIDER_AUTH_FAILED: 'PROVIDER_AUTH_FAILED',
  PROVIDER_RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  STREAMING_NOT_SUPPORTED: 'STREAMING_NOT_SUPPORTED',
  GATEWAY_KEY_NOT_CONFIGURED: 'GATEWAY_KEY_NOT_CONFIGURED',
  GATEWAY_KEY_MISSING: 'GATEWAY_KEY_MISSING',
  GATEWAY_KEY_INVALID: 'GATEWAY_KEY_INVALID',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  TOOLS_NOT_SUPPORTED: 'TOOLS_NOT_SUPPORTED',
  // NEW: D1 - enforcement capabilities.thinking
  THINKING_NOT_SUPPORTED: 'THINKING_NOT_SUPPORTED',
} as const;
```

---

#### 1.1.2 Plik: `src/chat/services/chat-validation.service.ts`

**Stan wyjściowy:** Obecny kod zawiera metody `validateTooling()` i `validateForStreaming()`.

**Zmiana:** Dodać nową metodę `validateThinking()` po metodzie `validateTooling()`:

```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import { LoggingService } from '../../logging/logging.service';
import { ProviderRegistryService } from '../../providers/provider-registry.service';
import { isToolingRequest } from '../helpers/tooling-request';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { ResolvedProviderConfig } from '../../providers/provider-registry.service';
// NEW: import dla sprawdzenia thinkingEnabled
import type { ProviderCallOptions } from '../helpers/resolve-provider-call-options';

@Injectable()
export class ChatValidationService {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly loggingService: LoggingService,
  ) {}

  validateTooling(
    requestBody: ChatRequestDto,
    resolved: ResolvedProviderConfig,
  ): void {
    if (!isToolingRequest(requestBody)) return;

    if (!resolved.capabilities?.tools) {
      throw new HttpException(
        {
          code: ApiErrorCode.TOOLS_NOT_SUPPORTED,
          message: 'Tools are not supported for this model alias.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // NEW: D1 - walidacja capabilities.thinking
  validateThinking(
    requestBody: ChatRequestDto,
    resolved: ResolvedProviderConfig,
    options: ProviderCallOptions,
  ): void {
    // Sprawdź czy effective thinkingEnabled === true (z body lub defaults)
    const effectiveThinkingEnabled = options.thinkingEnabled === true;

    if (effectiveThinkingEnabled && !resolved.capabilities?.thinking) {
      throw new HttpException(
        {
          code: ApiErrorCode.THINKING_NOT_SUPPORTED,
          message: 'Extended thinking is not supported for this model alias.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  validateForStreaming(modelAlias: string): ResolvedProviderConfig {
    const log = this.loggingService.child({
      module: 'ChatValidationService',
      modelAlias: modelAlias,
    });

    const resolved = this.registry.resolve(modelAlias);

    if (!resolved.capabilities?.streaming) {
      log.warn('Streaming not supported for this model', {
        provider: resolved.providerName,
        code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
      });
      throw new HttpException(
        {
          code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
          message: 'Streaming not supported for this model.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!resolved.provider.stream) {
      log.warn('Streaming adapter not implemented for this provider', {
        provider: resolved.providerName,
        code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
      });
      throw new HttpException(
        {
          code: ApiErrorCode.STREAMING_NOT_SUPPORTED,
          message: 'Streaming adapter not implemented for this provider.',
          details: [],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return resolved;
  }
}
```

---

#### 1.1.3 Plik: `src/chat/chat.service.ts`

**Zmiana:** Wywołać `validateThinking()` po `validateTooling()` w metodach `executeChat()` i `executeStream()`:

```typescript
// W metodzie executeChat(), po linii 59:
this.validationService.validateTooling(requestBody, primaryResolved);

const options = resolveProviderCallOptions(
  primaryResolved.params,
  requestBody.params,
);

// NEW: D1 - walidacja thinking po obliczeniu options
this.validationService.validateThinking(requestBody, primaryResolved, options);
```

```typescript
// W metodzie executeStream(), po linii 185:
this.validationService.validateTooling(requestBody, primaryResolved);

// NEW: D1 - walidacja thinking w stream
const options = resolveProviderCallOptions(
  primaryResolved.params,
  requestBody.params,
);
this.validationService.validateThinking(requestBody, primaryResolved, options);
```

**Uwaga:** W obecnym kodzie `executeStream()` nie używa `options` — jeśli nie potrzebujesz ich dalej, zmienna może pozostać niewykorzystana (lub dodaj `// eslint-disable-next-line @typescript-eslint/no-unused-vars`).

---

#### 1.1.4 Plik: `src/chat/services/chat-validation.service.spec.ts`

**Akcja:** Utworzyć nowy plik testowy lub rozszerzyć istniejący o testy `validateThinking()`:

```typescript
// NEW: Testy walidacji thinking
import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ChatValidationService } from './chat-validation.service';
import { ProviderRegistryService } from '../../providers/provider-registry.service';
import { LoggingService } from '../../logging/logging.service';
import { ApiErrorCode } from '../../common/errors/api-error.code';

describe('ChatValidationService - validateThinking', () => {
  let service: ChatValidationService;
  let registryService: ProviderRegistryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChatValidationService,
        {
          provide: ProviderRegistryService,
          useValue: { resolve: jest.fn() },
        },
        {
          provide: LoggingService,
          useValue: { child: jest.fn(() => ({ warn: jest.fn() })) },
        },
      ],
    }).compile();

    service = module.get<ChatValidationService>(ChatValidationService);
    registryService = module.get<ProviderRegistryService>(ProviderRegistryService);
  });

  it('should pass when thinkingEnabled is false', () => {
    const requestBody = { modelAlias: 'test', messages: [] } as any;
    const resolved = { capabilities: { thinking: false } } as any;
    const options = { thinkingEnabled: false };

    expect(() => service.validateThinking(requestBody, resolved, options)).not.toThrow();
  });

  it('should pass when thinkingEnabled is true and capability is true', () => {
    const requestBody = { modelAlias: 'test', messages: [] } as any;
    const resolved = { capabilities: { thinking: true } } as any;
    const options = { thinkingEnabled: true };

    expect(() => service.validateThinking(requestBody, resolved, options)).not.toThrow();
  });

  it('should throw THINKING_NOT_SUPPORTED when thinkingEnabled is true but capability is false', () => {
    const requestBody = { modelAlias: 'test', messages: [] } as any;
    const resolved = { capabilities: { thinking: false } } as any;
    const options = { thinkingEnabled: true };

    expect(() => service.validateThinking(requestBody, resolved, options)).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          code: ApiErrorCode.THINKING_NOT_SUPPORTED,
        }),
      }),
    );
  });

  it('should throw THINKING_NOT_SUPPORTED when thinkingEnabled is true but capability is undefined', () => {
    const requestBody = { modelAlias: 'test', messages: [] } as any;
    const resolved = { capabilities: {} } as any;
    const options = { thinkingEnabled: true };

    expect(() => service.validateThinking(requestBody, resolved, options)).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          code: ApiErrorCode.THINKING_NOT_SUPPORTED,
        }),
      }),
    );
  });
});
```

---

#### 1.1.5 Plik: `docs/dictionary.md`

**Zmiana:** Dodać wiersz w tabeli „Kody błędów (stabilne)" po `TOOLS_NOT_SUPPORTED`:

```markdown
| Code | Znaczenie |
|------|-----------|
| `VALIDATION_FAILED` | Body requestu lub parametry nie przeszły walidacji. |
| `MODEL_ALIAS_NOT_FOUND` | Podany `modelAlias` nie istnieje w konfiguracji gateway. |
| `MODEL_NOT_ALLOWED` | Model, tryb (np. streaming) lub pole w `params` (np. `temperature`) nie jest dozwolone przez policy (`allowOverrides`). |
| `PROVIDER_UNSUPPORTED` | `providerInstance` z configu nie jest zarejestrowany w runtime (brak fabryki dla `type` lub instancja nie przeszła bootstrapu). |
| `PROVIDER_AUTH_FAILED` | Błąd uwierzytelnienia do providera (np. zły klucz). |
| `PROVIDER_RATE_LIMITED` | Provider zwrócił limit (429) — mapowanie SDK w `provider-error.mapper.ts`. |
| `RATE_LIMITED` | Limit nałożony przez gateway: **`SmartRateLimitGuard`** (RPS/burst/streamy per `X-Gateway-Key`) oraz **cooldown** po 429 od upstream (`ChatService.executeChat` → `SmartRateLimiterService.setCooldown`; tylko czat standardowy). HTTP **429**. |
| `PROVIDER_TIMEOUT` | Przekroczono timeout dla wywołania providera. |
| `PROVIDER_UNAVAILABLE` | Provider zwrócił błąd 5xx lub jest niedostępny. |
| `STREAMING_NOT_SUPPORTED` | Wybrany model/provider nie wspiera streamingu. |
| `TOOLS_NOT_SUPPORTED` | Żądanie zawiera tooling (`tooling`, `tool` w messages, `toolCalls`), a alias nie ma `capabilities.tools: true` w YAML. |
<!-- NEW: D1 -->
| `THINKING_NOT_SUPPORTED` | Żądanie zawiera `thinkingEnabled: true` (w `params` lub defaults), a alias nie ma `capabilities.thinking: true` w YAML. HTTP **400**. |
| `GATEWAY_KEY_NOT_CONFIGURED` | Brak allowlisty kluczy w runtime (np. nie zarejestrowano `gatewayKey` w konfiguracji) — **500**, guard zwraca ten kod (`GatewayKeyGuard`). Przy poprawnym starcie z `gateway.config.yaml` i env scenariusz nie występuje. |
```

**Commit:** `feat(chat): enforce capabilities.thinking with THINKING_NOT_SUPPORTED (D1)`

---

### Krok R1.2: `ChatIngressValidator` — profile wejścia (2.5–3.5h) — **D2**, **D18** ✅ WYKONANY 2026-06-20

**Problem:** `ValidationPipe` waliduje DTO kontrolera; po mapowaniu na `ChatRequestDto` fasady omijają limity natywne (150 msg / 3000 znaków). To zamierzone dla IDE, ale **nieudokumentowane w kodzie** i nietestowane.

**Wynik implementacji (2026-06-20):** Profile `native` / `facade-openai` / `facade-anthropic` w `src/chat/validation/`; walidacja w `ChatService.executeChat` / `executeStream`; kontrolery przekazują profil jawnie. E2E asymetrii: `gateway-chat.e2e-spec.ts` (151 msg → 400), `openai-integration.e2e-spec.ts` (200 msg → 201). **Świadome odstępstwo:** brak domyślnej wartości `ingressProfile` w `ChatService` (parametr wymagany). Regresje unit (`src/` import w walidatorze) i E2E extended (thinking bez `capabilities.thinking` w mocku) — **R1.3**.

**Pliki do utworzenia/zmiany:**

| Plik | Zmiana |
|------|--------|
| `src/chat/validation/chat-ingress.types.ts` | **NOWY:** typy profili ingress |
| `src/chat/validation/chat-ingress.constants.ts` | **NOWY:** stałe limitów per profil |
| `src/chat/validation/chat-ingress.validator.ts` | **NOWY:** funkcja walidacji |
| `src/chat/validation/chat-ingress.validator.spec.ts` | **NOWY:** testy jednostkowe |
| `src/chat/chat.service.ts` | Opcjonalny param `ingressProfile` |
| `src/chat/chat.controller.ts` | Przekazanie profilu `'native'` |
| `src/chat/chat-stream.controller.ts` | Przekazanie profilu `'native'` |
| `src/integrations/openai/controllers/openai-chat-completions.controller.ts` | Przekazanie profilu `'facade-openai'` |
| `src/integrations/anthropic/controllers/anthropic-messages.controller.ts` | Przekazanie profilu `'facade-anthropic'` |
| `test/e2e/gateway-chat.e2e-spec.ts` | Test: native >150 messages → 400 |
| `test/e2e/openai-integration.e2e-spec.ts` | Test: fasada akceptuje >150 messages |

---

#### 1.2.1 Plik: `src/chat/validation/chat-ingress.types.ts` (NOWY)

```typescript
// NEW: D2 - typy profili walidacji ingress
export type ChatIngressProfile = 'native' | 'facade-openai' | 'facade-anthropic';
```

---

#### 1.2.2 Plik: `src/chat/validation/chat-ingress.constants.ts` (NOWY)

```typescript
// NEW: D2 - stałe limitów per profil (single source of truth)
export const INGRESS_LIMITS = {
  native: {
    maxMessages: 150,
    maxContentUser: 3000,
    maxContentAssistant: 3000,
    maxContentTool: 32000,
  },
  'facade-openai': {
    maxMessages: 15000,
    maxContentUser: 128000,
    maxContentAssistant: 128000,
    maxContentTool: 128000,
  },
  'facade-anthropic': {
    maxMessages: 15000,
    maxContentUser: 128000,
    maxContentAssistant: 128000,
    maxContentTool: 128000,
  },
} as const;
```

---

#### 1.2.3 Plik: `src/chat/validation/chat-ingress.validator.ts` (NOWY)

```typescript
// NEW: D2 - walidator ingress z profilami
import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import type { ChatRequestDto } from '../dto/chat-request.dto';
import type { ChatIngressProfile } from './chat-ingress.types';
import { INGRESS_LIMITS } from './chat-ingress.constants';

export function validateChatIngress(
  dto: ChatRequestDto,
  profile: ChatIngressProfile,
): void {
  const limits = INGRESS_LIMITS[profile];

  // 1. Walidacja liczby wiadomości
  if (dto.messages.length > limits.maxMessages) {
    throw new HttpException(
      {
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Too many messages for ${profile} profile. Maximum is ${limits.maxMessages}.`,
        details: [
          {
            field: 'messages',
            issue: `Array length ${dto.messages.length} exceeds maximum ${limits.maxMessages}`,
          },
        ],
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  // 2. Walidacja długości content per role
  for (let i = 0; i < dto.messages.length; i++) {
    const msg = dto.messages[i];
    let maxLength: number;

    if (msg.role === 'tool') {
      maxLength = limits.maxContentTool;
    } else if (msg.role === 'user') {
      maxLength = limits.maxContentUser;
    } else if (msg.role === 'assistant') {
      maxLength = limits.maxContentAssistant;
    } else {
      continue; // inne role - pomijamy
    }

    if (msg.content && msg.content.length > maxLength) {
      throw new HttpException(
        {
          code: ApiErrorCode.VALIDATION_FAILED,
          message: `Message content too long for ${profile} profile and role ${msg.role}. Maximum is ${maxLength} characters.`,
          details: [
            {
              field: `messages[${i}].content`,
              issue: `Content length ${msg.content.length} exceeds maximum ${maxLength}`,
            },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
```

---

#### 1.2.4 Plik: `src/chat/validation/chat-ingress.validator.spec.ts` (NOWY)

```typescript
// NEW: D2 - testy walidatora ingress
import { HttpException } from '@nestjs/common';
import { validateChatIngress } from './chat-ingress.validator';
import { ApiErrorCode } from '../../common/errors/api-error.code';
import type { ChatRequestDto } from '../dto/chat-request.dto';

describe('validateChatIngress', () => {
  describe('native profile', () => {
    it('should pass with 150 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(150).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'native')).not.toThrow();
    });

    it('should fail with 151 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(151).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'native')).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ApiErrorCode.VALIDATION_FAILED,
          }),
        }),
      );
    });

    it('should fail when user content exceeds 3000 chars', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'user', content: 'a'.repeat(3001) }],
      };
      expect(() => validateChatIngress(dto, 'native')).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ApiErrorCode.VALIDATION_FAILED,
          }),
        }),
      );
    });

    it('should pass when tool content is 32000 chars', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'tool', content: 'a'.repeat(32000), toolCallId: 'call_1' }],
      };
      expect(() => validateChatIngress(dto, 'native')).not.toThrow();
    });
  });

  describe('facade-openai profile', () => {
    it('should pass with 200 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(200).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'facade-openai')).not.toThrow();
    });

    it('should pass when user content is 100000 chars', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: [{ role: 'user', content: 'a'.repeat(100000) }],
      };
      expect(() => validateChatIngress(dto, 'facade-openai')).not.toThrow();
    });

    it('should fail with 15001 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(15001).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'facade-openai')).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ApiErrorCode.VALIDATION_FAILED,
          }),
        }),
      );
    });
  });

  describe('facade-anthropic profile', () => {
    it('should pass with 200 messages', () => {
      const dto: ChatRequestDto = {
        modelAlias: 'test',
        messages: Array(200).fill({ role: 'user', content: 'test' }),
      };
      expect(() => validateChatIngress(dto, 'facade-anthropic')).not.toThrow();
    });
  });
});
```

---

#### 1.2.5 Plik: `src/chat/chat.service.ts`

**Zmiana:** Dodać parametr `ingressProfile` do metod `executeChat()` i `executeStream()`:

```typescript
// CHANGE: D2 - dodanie parametru ingressProfile
import { validateChatIngress } from './validation/chat-ingress.validator';
import type { ChatIngressProfile } from './validation/chat-ingress.types';

// W klasie ChatService:

async executeChat(
  requestBody: ChatRequestDto,
  requestId: string,
  gatewayKey: string,
  ingressProfile: ChatIngressProfile = 'native', // NEW: D2
) {
  // NEW: D2 - walidacja ingress na początku metody, przed resolve
  validateChatIngress(requestBody, ingressProfile);

  const log = this.loggingService.child({
    module: 'ChatService',
    requestId,
    modelAlias: requestBody.modelAlias,
  });

  // ... reszta kodu bez zmian
}

async executeStream(
  requestBody: ChatRequestDto,
  requestId: string,
  emit: (event: SseEvent) => void,
  gatewayKey?: string,
  ingressProfile: ChatIngressProfile = 'native', // NEW: D2
): Promise<void> {
  // NEW: D2 - walidacja ingress
  validateChatIngress(requestBody, ingressProfile);

  const log = this.loggingService.child({
    module: 'ChatService',
    requestId,
    modelAlias: requestBody.modelAlias,
  });

  // ... reszta kodu bez zmian
}
```

---

#### 1.2.6 Pliki kontrolerów (native)

**Plik:** `src/chat/chat.controller.ts`

```typescript
// CHANGE: D2 - przekazanie profilu 'native'
@Post()
async chat(
  @Body() requestBody: ChatRequestDto,
  @Req() req: Request,
): Promise<ChatResponseDto> {
  const requestId = req.requestId;
  const gatewayKey = req.gatewayKey;

  return this.chatService.executeChat(
    requestBody,
    requestId,
    gatewayKey,
    'native', // NEW: D2
  );
}
```

**Plik:** `src/chat/chat-stream.controller.ts`

```typescript
// CHANGE: D2 - przekazanie profilu 'native'
@Post('stream')
async chatStream(
  @Body() requestBody: ChatRequestDto,
  @Req() req: Request,
  @Res() res: Response,
) {
  const requestId = req.requestId;
  const gatewayKey = req.gatewayKey;

  // ... setup SSE ...

  await this.chatService.executeStream(
    requestBody,
    requestId,
    (event: SseEvent) => {
      // ... emit logic
    },
    gatewayKey,
    'native', // NEW: D2
  );
}
```

---

#### 1.2.7 Pliki kontrolerów (fasady)

**Plik:** `src/integrations/openai/controllers/openai-chat-completions.controller.ts`

```typescript
// CHANGE: D2 - przekazanie profilu 'facade-openai'
@Post('chat/completions')
async createChatCompletion(
  @Body() requestDto: OpenAiChatCompletionRequestDto,
  @Req() req: Request,
  @Res() res: Response,
) {
  const mappedRequest = this.requestMapper.mapOpenAiRequestToChatDto(requestDto);
  const requestId = req.requestId;
  const gatewayKey = req.gatewayKey;

  if (requestDto.stream) {
    // ... stream logic z 'facade-openai'
    await this.chatService.executeStream(
      mappedRequest,
      requestId,
      (event: SseEvent) => {
        // ...
      },
      gatewayKey,
      'facade-openai', // NEW: D2
    );
  } else {
    const result = await this.chatService.executeChat(
      mappedRequest,
      requestId,
      gatewayKey,
      'facade-openai', // NEW: D2
    );
    // ...
  }
}
```

**Plik:** `src/integrations/anthropic/controllers/anthropic-messages.controller.ts`

```typescript
// CHANGE: D2 - przekazanie profilu 'facade-anthropic'
@Post('messages')
async createMessage(
  @Body() requestDto: AnthropicMessagesRequestDto,
  @Req() req: Request,
  @Res() res: Response,
) {
  const mappedRequest = this.requestMapper.mapAnthropicRequestToChatDto(requestDto);
  const requestId = req.requestId;
  const gatewayKey = req.gatewayKey;

  if (requestDto.stream) {
    // ... stream logic
    await this.chatService.executeStream(
      mappedRequest,
      requestId,
      (event: SseEvent) => {
        // ...
      },
      gatewayKey,
      'facade-anthropic', // NEW: D2
    );
  } else {
    const result = await this.chatService.executeChat(
      mappedRequest,
      requestId,
      gatewayKey,
      'facade-anthropic', // NEW: D2
    );
    // ...
  }
}
```

---

#### 1.2.8 Testy E2E

**Plik:** `test/e2e/gateway-chat.e2e-spec.ts`

```typescript
// NEW: D2 - test asymetrii native profile
it('should reject request with more than 150 messages', async () => {
  const messages = Array(151).fill({ role: 'user', content: 'test' });
  
  const response = await request(app.getHttpServer())
    .post('/api/v1/chat')
    .set('X-Gateway-Key', validGatewayKey)
    .send({
      modelAlias: 'chat-default',
      messages,
    })
    .expect(400);

  expect(response.body.code).toBe('VALIDATION_FAILED');
  expect(response.body.message).toContain('Too many messages');
});
```

**Plik:** `test/e2e/openai-integration.e2e-spec.ts`

```typescript
// NEW: D2 - test że fasada OpenAI akceptuje >150 messages
it('should accept request with 200 messages (facade profile)', async () => {
  const messages = Array(200)
    .fill(null)
    .map((_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: 'test' }));
  
  const response = await request(app.getHttpServer())
    .post('/api/v1/openai/chat/completions')
    .set('Authorization', `Bearer ${validGatewayKey}`)
    .send({
      model: 'chat-default',
      messages,
    })
    .expect(201);

  expect(response.body.choices).toBeDefined();
});
```

**Commit:** `feat(chat): ChatIngressValidator with native vs facade profiles (D2, D18)`

---

### Krok R1.3: Test regresji thinking + ingress (30–45min) ✅ WYKONANY 2026-06-20

**Wynik implementacji (2026-06-20):** Regresje unit (`chat-validation`, `chat-ingress`) i E2E zielone; `docs/testy.md` uzupełniony o nowe pliki spec i scenariusze asymetrii native vs fasady.

**Akcja:**

```bash
npm test -- chat-validation chat-ingress
npm run test:e2e
```

Zaktualizuj `docs/testy.md` — nowe pliki spec i scenariusze E2E.

**Commit:** `test: cover thinking capability and ingress profiles`

---

## R2: DX integratorów — kod (5–7h)

**Cel:** Zamknąć **D4**, **D5** — integrator wie, które parametry **nie trafią** do SDK.

**Kroki:** R2.1 (model + wiring) → R2.2 (filtry fasad) → R2.3 (E2E) → **R2.4** (typy, mocki, testy unit — domknięcie implementacji).

### Krok R2.1: Model `warnings` w odpowiedzi natywnej (1.5–2h) — **D5** ✅ WYKONANY 2026-06-22

**Pliki do utworzenia/zmiany:**

| Plik | Zmiana |
|------|--------|
| `src/chat/dto/chat-warning.dto.ts` | **NOWY:** DTO warning |
| `src/chat/dto/chat-response.dto.ts` | Dodać pole `warnings?` |
| `src/chat/dto/sse-done-payload.dto.ts` | Dodać pole `warnings?` |
| `src/chat/helpers/generation-warnings.ts` | **NOWY:** logika budowania warnings |
| `src/chat/services/chat-response-builder.service.ts` | Dołączyć warnings |
| `docs/dictionary.md` | Sekcja kodów ostrzeżeń |

---

#### 2.1.1 Plik: `src/chat/dto/chat-warning.dto.ts` (NOWY) ✅ WYKONANY 2026-06-20

```typescript
// NEW: D5 - DTO dla ostrzeżeń
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class ChatWarningDto {
  @ApiProperty({
    description: 'Warning code',
    example: 'PARAM_IGNORED_BY_PROVIDER',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Human-readable warning message',
    example: 'Parameter frequencyPenalty is not supported by this provider and was ignored.',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Optional field name that triggered the warning',
    example: 'params.frequencyPenalty',
  })
  @IsOptional()
  @IsString()
  field?: string;
}
```

---

#### 2.1.2 Plik: `src/chat/dto/chat-response.dto.ts` ✅ WYKONANY 2026-06-20

**Zmiana:** Dodać pole `warnings` do DTO:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ChatOutputTextDto } from './chat-output-text.dto';
import { GatewayToolCallDto } from '../../common/dtos/gateway-tool-call.dto';
import { ChatUsageDto } from './chat-usage.dto';
// NEW: D5
import { ChatWarningDto } from './chat-warning.dto';

export class ChatUsageDetailsDto {
  @ApiPropertyOptional({
    description:
      'Prompt cache hit tokens (Anthropic). Number of input tokens read from cache.',
  })
  promptCacheHitTokens?: number;

  @ApiPropertyOptional({
    description:
      'Promp cache creation tokens (Anthropic). Number of input tokens written to cache.',
  })
  promptCacheCreationTokens?: number;
}

export class ChatResponseDto {
  @ApiProperty({
    example: 'gw_01HZZZZZZZZZZZZZZZZZZZZZZ',
    description: 'Gateway-generated unique response ID (prefix: gw_).',
  })
  id: string;

  @ApiProperty({
    example: 'anthropic',
    description: 'Provider that fulfilled the request.',
    enum: ['anthropic', 'google'],
  })
  provider: string;

  @ApiProperty({
    description: 'Requested modelAlias from body',
    example: 'chat-default',
  })
  model: string;

  @ApiPropertyOptional({
    description: 'Only after successful fallback in YAML',
    example: 'claude-sonnet',
  })
  effectiveModelAlias?: string;

  @ApiPropertyOptional({ type: [GatewayToolCallDto] })
  @IsOptional()
  toolCalls?: GatewayToolCallDto[];

  @ApiPropertyOptional({
    enum: [
      'end_turn',
      'tool_use',
      'max_tokens',
      'stop_sequence',
      'pause_turn',
      'refusal',
      'tool_calls',
      'stop',
      'length',
      'content_filter',
    ],
  })
  @IsOptional()
  finishReason?:
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

  @ApiProperty({ type: ChatOutputTextDto })
  output: ChatOutputTextDto;

  @ApiPropertyOptional({ type: ChatUsageDto })
  usage?: ChatUsageDto;

  @ApiProperty({ example: 'req_01HZZZZZZZZZZZZZZZZZZZZZZ' })
  requestId: string;

  @ApiProperty({
    description:
      'Conversation ID returned to client (echo conversationId from body or conv_<uuid> when missing in request). Sentry grouping requires the same ID in body of subsequent requests — see conversation-tracking.md.',
    example: 'conv_01HZZZZZZZZZZZZZZZZZZZZZZ',
  })
  conversationId: string;

  @ApiPropertyOptional({
    enum: [true],
    description: 'Whether the response was returned from cache',
  })
  cached?: true;

  @ApiPropertyOptional({
    format: 'date-time',
  })
  cachedAt?: string;

  @ApiPropertyOptional({
    type: ChatUsageDetailsDto,
    description:
      'Extended usage details (cache tokens, reasoning tokens). Populated when provider supports extended usage details.',
  })
  usageDetails?: ChatUsageDetailsDto;

  @ApiPropertyOptional({
    description:
      'System fingerprinting (OpenAI). Identifier for backend configuration snapshot.',
    example: 'fp_01HZZZZZZZZZZZZZZZZZZZZZZ',
  })
  systemFingerprint?: string;

  @ApiPropertyOptional({
    description:
      'Extended thinking/reasoning content from model. Not streamed in real-time.',
    example: 'Let me think about this step by step...',
  })
  @IsOptional()
  @IsString()
  thinkingContent?: string;

  // NEW: D5 - warnings array
  @ApiPropertyOptional({
    type: [ChatWarningDto],
    description:
      'Optional warnings about parameters that were accepted but ignored or modified by the provider.',
  })
  @IsOptional()
  warnings?: ChatWarningDto[];
}
```

---

#### 2.1.3 Plik: `src/chat/dto/sse-done-payload.dto.ts` ✅ WYKONANY 2026-06-20

**Zmiana:** Dodać pole `warnings`:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GatewayToolCallDto } from 'src/common/dtos/gateway-tool-call.dto';
// NEW: D5
import { ChatWarningDto } from './chat-warning.dto';

export class SseDoneUsageDto {
  @ApiPropertyOptional({ minimum: 0, example: 12 })
  inputTokens?: number;

  @ApiPropertyOptional({ minimum: 0, example: 48 })
  outputTokens?: number;

  @ApiPropertyOptional({ minimum: 0, example: 60 })
  totalTokens?: number;
}

export class SseDonePayloadDto {
  @ApiPropertyOptional({ type: SseDoneUsageDto })
  usage?: SseDoneUsageDto;

  @ApiPropertyOptional({ type: [GatewayToolCallDto] })
  toolCalls?: GatewayToolCallDto[];

  @ApiPropertyOptional({
    enum: ['stop', 'tool_calls', 'length', 'content_filter'],
  })
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';

  // NEW: D5 - warnings w SSE done
  @ApiPropertyOptional({
    type: [ChatWarningDto],
    description: 'Optional warnings about ignored parameters.',
  })
  warnings?: ChatWarningDto[];
}
```

---

#### 2.1.4 Plik: `src/chat/helpers/generation-warnings.ts` (NOWY)

```typescript
// NEW: D5 - logika budowania warnings
import type { ChatWarningDto } from '../dto/chat-warning.dto';
import type { ProviderCallOptions } from './resolve-provider-call-options';

export function buildGenerationWarnings(
  options: ProviderCallOptions,
  providerType: string,
): ChatWarningDto[] {
  const warnings: ChatWarningDto[] = [];

  // Reguła: frequencyPenalty ignorowane przez anthropic i google
  if (
    options.frequencyPenalty !== undefined &&
    (providerType === 'anthropic' || providerType === 'google')
  ) {
    warnings.push({
      code: 'PARAM_IGNORED_BY_PROVIDER',
      message: `Parameter frequencyPenalty is not supported by provider '${providerType}' and was ignored.`,
      field: 'params.frequencyPenalty',
    });
  }

  // Reguła: presencePenalty ignorowane przez anthropic i google
  if (
    options.presencePenalty !== undefined &&
    (providerType === 'anthropic' || providerType === 'google')
  ) {
    warnings.push({
      code: 'PARAM_IGNORED_BY_PROVIDER',
      message: `Parameter presencePenalty is not supported by provider '${providerType}' and was ignored.`,
      field: 'params.presencePenalty',
    });
  }

  // Reguła: seed ignorowane przez anthropic
  if (options.seed !== undefined && providerType === 'anthropic') {
    warnings.push({
      code: 'PARAM_IGNORED_BY_PROVIDER',
      message: `Parameter seed is not supported by provider '${providerType}' and was ignored.`,
      field: 'params.seed',
    });
  }

  return warnings;
}
```

---

#### 2.1.5 Plik: `src/chat/services/chat-response-builder.service.ts`

**Zmiana:** Dołączyć warnings do odpowiedzi:

```typescript
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { mapStopReasonToFinishReason } from '../helpers/map-provider-finish-reason';
// NEW: D5
import { buildGenerationWarnings } from '../helpers/generation-warnings';
import type { SseEvent } from '../sse/sse-event.type';
import type {
  ProviderChatResponse,
  ProviderUsageDetails,
} from '../../providers/interfaces/ai-provider.interface';
import type { GatewayToolCall } from '../../providers/types/tooling-types';
// NEW: D5
import type { ProviderCallOptions } from '../helpers/resolve-provider-call-options';

export interface ProviderResponse {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  toolCalls?: GatewayToolCall[];
  stopReason: ProviderChatResponse['stopReason'];
  usageDetails?: ProviderUsageDetails;
  systemFingerprint?: string;
  thinkingContent?: string;
}

export interface ChatResponseData {
  id: string;
  provider: string;
  model: string;
  effectiveModelAlias?: string;
  output: {
    type: 'text';
    text: string;
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  requestId: string;
  conversationId: string;
  toolCalls?: any[];
  finishReason?: string;
  usageDetails?: any;
  systemFingerprint?: string;
  thinkingContent?: string;
  // NEW: D5
  warnings?: any[];
}

@Injectable()
export class ChatResponseBuilderService {
  buildChatResponse(
    response: ProviderResponse,
    providerName: string,
    modelAlias: string,
    requestId: string,
    conversationId: string,
    effectiveModelAlias?: string,
    // NEW: D5 - options i providerType dla warnings
    options?: ProviderCallOptions,
    providerType?: string,
  ): ChatResponseData {
    // NEW: D5 - budowanie warnings
    const warnings =
      options && providerType
        ? buildGenerationWarnings(options, providerType)
        : [];

    return {
      id: `gw_${uuidv4()}`,
      provider: providerName,
      model: modelAlias,
      ...(effectiveModelAlias && { effectiveModelAlias }),
      output: {
        type: 'text',
        text: response.text,
      },
      usage: response.usage,
      requestId: requestId,
      conversationId: conversationId,
      ...(response.toolCalls?.length && { toolCalls: response.toolCalls }),
      finishReason: mapStopReasonToFinishReason(
        response.stopReason,
        response.toolCalls,
      ),
      ...(response.usageDetails ? { usageDetails: response.usageDetails } : {}),
      ...(response.systemFingerprint
        ? { systemFingerprint: response.systemFingerprint }
        : {}),
      ...(response.thinkingContent && {
        thinkingContent: response.thinkingContent,
      }),
      // NEW: D5 - dołącz warnings jeśli niepuste
      ...(warnings.length > 0 && { warnings }),
    };
  }

  buildStreamDoneEvent(
    usageMetadata:
      | {
          inputTokens: number;
          outputTokens: number;
        }
      | undefined,
    toolCalls: GatewayToolCall[] | undefined,
    stopReason: ProviderChatResponse['stopReason'] | undefined,
    systemFingerprint: string | undefined,
    thinkingContent: string | undefined,
    // NEW: D5 - warnings w stream
    options?: ProviderCallOptions,
    providerType?: string,
  ): SseEvent {
    const warnings =
      options && providerType
        ? buildGenerationWarnings(options, providerType)
        : [];

    return {
      name: 'done',
      data: {
        ...(usageMetadata && {
          usage: {
            inputTokens: usageMetadata.inputTokens,
            outputTokens: usageMetadata.outputTokens,
            totalTokens: usageMetadata.inputTokens + usageMetadata.outputTokens,
          },
        }),
        ...(toolCalls?.length && { toolCalls }),
        finishReason: mapStopReasonToFinishReason(stopReason, toolCalls),
        ...(systemFingerprint && { systemFingerprint }),
        ...(thinkingContent && { thinkingContent }),
        // NEW: D5
        ...(warnings.length > 0 && { warnings }),
      },
    };
  }
}
```

---

#### 2.1.6 Plik: `src/chat/chat.service.ts`

**Zmiana:** Przekazać `options` i `resolved.providerType` do `buildChatResponse()`:

```typescript
// W metodzie executeChat(), po linii 112:
const chatResult = this.responseBuilderService.buildChatResponse(
  {
    text: response.text,
    usage: response.usage,
    toolCalls: response.toolCalls,
    stopReason: response.stopReason,
    usageDetails: response.usageDetails,
    systemFingerprint: response.systemFingerprint,
    thinkingContent: response.thinkingContent,
  },
  resolved.providerName,
  requestBody.modelAlias,
  requestId,
  responseConversationId,
  didFallback ? usedAlias : undefined,
  // NEW: D5 - przekaż options i providerType
  options,
  resolved.providerType,
);
```

```typescript
// W metodzie executeStream(), po linii 233:
const doneEvent = this.responseBuilderService.buildStreamDoneEvent(
  usageMetadata,
  toolCalls,
  stopReason,
  systemFingerprint,
  thinkingContent,
  // NEW: D5 - przekaż options i providerType
  options,
  resolved.providerType,
);
```

> **Uwaga implementacyjna:** Pole `providerType` w `ResolvedProviderConfig` oraz aktualizacja mocków/testów — patrz **R2.4** (plan pierwotnie używał `resolved.type`, którego nie było w typie).

**Uwaga:** W `executeStream()` musisz mieć dostęp do `options` — dodaj ich obliczenie przed wywołaniem `resilientExecutor`:

```typescript
// W executeStream(), po linii 185 (po validateThinking):
const options = resolveProviderCallOptions(
  primaryResolved.params,
  requestBody.params,
);
```

---

#### 2.1.7 Plik: `docs/dictionary.md`

**Zmiana:** Dodać sekcję „Kody ostrzeżeń (warnings)" przed sekcją „Kody błędów":

```markdown
## Kody ostrzeżeń (warnings)

Ostrzeżenia (pole `warnings` w odpowiedzi) informują klienta o parametrach, które zostały zaakceptowane w body, ale **nie zostały przekazane do providera**. Ostrzeżenia **nie** blokują wywołania — odpowiedź HTTP 200/201.

| Code | Znaczenie |
|------|-----------|
| `PARAM_IGNORED_BY_PROVIDER` | Parametr z `params` (np. `frequencyPenalty`, `presencePenalty`, `seed`) nie jest wspierany przez wybrany provider (`anthropic` / `google`) i został zignorowany. |

**Uwaga:** Fasady OpenAI i Anthropic Messages API **nie** eksponują pola `warnings` w odpowiedzi (zgodność z formatem vendora). Ostrzeżenia są dostępne **wyłącznie** w natywnym API gateway (`POST /api/v1/chat` i SSE `done`).
```

**Commit:** `feat(chat): optional warnings for ignored generation params (D5, D4)`

---

### Krok R2.2: Filtry fasad — mapowanie `THINKING_NOT_SUPPORTED` (30min) ✅ WYKONANY 2026-06-21

**Akcja:** Potwierdź, że błąd `THINKING_NOT_SUPPORTED` jest mapowany w filtrach:

**Plik:** `src/integrations/openai/filters/openai-exception.filter.ts`

```typescript
// CHANGE: D5 - dodaj mapowanie THINKING_NOT_SUPPORTED
if (
  code === ApiErrorCode.TOOLS_NOT_SUPPORTED ||
  code === ApiErrorCode.THINKING_NOT_SUPPORTED // NEW
) {
  openAiErrorType = 'invalid_request_error';
  status = HttpStatus.BAD_REQUEST;
}
```

**Plik:** `src/integrations/anthropic/filters/anthropic-exception.filter.ts`

```typescript
// CHANGE: D5 - dodaj mapowanie THINKING_NOT_SUPPORTED
if (
  code === ApiErrorCode.TOOLS_NOT_SUPPORTED ||
  code === ApiErrorCode.THINKING_NOT_SUPPORTED // NEW
) {
  anthropicErrorType = 'invalid_request_error';
  status = HttpStatus.BAD_REQUEST;
}
```

**Commit:** `fix(integrations): map THINKING_NOT_SUPPORTED in vendor error filters`

---

### Krok R2.3: Testy E2E warnings (1h) ✅ WYKONANY 2026-06-21

**Plik:** `test/e2e/gateway-chat.e2e-spec.ts`

```typescript
// NEW: D5 - test warnings
it('should return warnings when frequencyPenalty is used with Anthropic provider', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/v1/chat')
    .set('X-Gateway-Key', validGatewayKey)
    .send({
      modelAlias: 'chat-default', // zakładając że to Anthropic
      messages: [{ role: 'user', content: 'test' }],
      params: {
        frequencyPenalty: 0.5,
      },
    })
    .expect(201);

  expect(response.body.warnings).toBeDefined();
  expect(response.body.warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'PARAM_IGNORED_BY_PROVIDER',
        field: 'params.frequencyPenalty',
      }),
    ]),
  );
});
```

**Commit:** `test(e2e): generation warnings on native chat (D4)`

---

### Krok R2.4: Domknięcie implementacji warnings — typy, mocki, testy unit (1–1.5h) ✅ WYKONANY 2026-06-22

**Problem:** R2.1 opisuje wiring `warnings`, ale nie enumeruje elementów koniecznych do zielonego buildu i regresji unit:

1. **`providerType` w `ResolvedProviderConfig`** — krok 2.1.6 zakłada przekazanie typu providera (`resolved.type`), lecz nie wymienia zmiany w `provider-registry.service.ts` ani aktualizacji mocków/testów zależnych.
2. **Typy wewnętrzne** — `SseDonePayloadDto` ma `warnings`, ale `SseDoneEvent` (`sse-event.type.ts`) i `CachedChatResponse` (`response-cache.service.ts`) tego nie odzwierciedlają.
3. **Testy unit** — brak `generation-warnings.spec.ts`, brak scenariuszy `warnings` w `chat-response-builder.service.spec.ts`, rozjazd sygnatur w `chat.service.spec.ts` (nowe argumenty `options` + `providerType`).

**Zależność:** po **R2.1** (kod produkcyjny warnings); można równolegle z **R2.2**; przed uznaniem fazy R2 za zamkniętą (razem z R2.3 E2E).

**Pliki do utworzenia/zmiany:**

| Plik | Zmiana |
|------|--------|
| `src/providers/provider-registry.service.ts` | Potwierdzić / uzupełnić pole `providerType` w `ResolvedProviderConfig` |
| `src/providers/provider-registry.service.spec.ts` | Asercja `providerType` w `resolve()` |
| `src/common/mocks/createMockResolvedProviderConfig.ts` | Dodać `providerType` (wymagane przez build) |
| `src/chat/sse/sse-event.type.ts` | Dodać `warnings?` do `SseDoneEvent` |
| `src/cache/response-cache.service.ts` | Dodać `warnings?` do `CachedChatResponse` |
| `src/chat/helpers/generation-warnings.ts` | Usunąć nieużywany import `PROVIDER_TYPES` (jeśli obecny) |
| `src/chat/helpers/generation-warnings.spec.ts` | **NOWY:** testy reguł ostrzeżeń |
| `src/chat/services/chat-response-builder.service.spec.ts` | Testy dołączania `warnings` w chat + SSE `done` |
| `src/chat/chat.service.spec.ts` | Zaktualizować oczekiwania wywołań buildera (+ `options`, `providerType`) |

---

#### 2.4.1 Plik: `src/providers/provider-registry.service.ts` — `providerType`

**Kontekst:** Plan R2.1 używa `resolved.type`; w kodzie pole powinno nazywać się **`providerType: GatewayProviderType`**, bo `providerName` to `instanceId`, nie typ SDK.

**Stan docelowy** w `ResolvedProviderConfig`:

```typescript
import type { GatewayProviderType } from '../config/provider-types';

export interface ResolvedProviderConfig {
  // ... istniejące pola
  providerType: GatewayProviderType; // NEW: wymagane dla buildGenerationWarnings
}
```

**W metodzie `resolve()`** — ustawić z rejestru instancji:

```typescript
return {
  provider: providerEntry.provider,
  providerName: providerEntry.instanceId,
  providerType: providerEntry.type, // NEW
  // ... reszta bez zmian
};
```

**Plik:** `src/providers/provider-registry.service.spec.ts` — dodać asercję w teście happy-path `resolve()`:

```typescript
expect(result.providerType).toBe('anthropic');
```

---

#### 2.4.2 Plik: `src/common/mocks/createMockResolvedProviderConfig.ts`

**Zmiana:** Dodać wymagane pole — bez tego `npm run build` kończy się błędem TS2741:

```typescript
export function createMockDefaultResolvedConfig(): ResolvedProviderConfig {
  return {
    provider: createMockAIProvider() as ResolvedProviderConfig['provider'],
    providerName: 'anthropic',
    providerType: 'anthropic', // NEW: R2.4
    modelId: 'claude-sonnet-4-5',
    modelAlias: TEST_MODEL_ALIAS,
    capabilities: { tools: true, streaming: true },
    params: {
      defaults: { temperature: 0.7 },
      allowOverrides: ['temperature'],
      bounds: {},
    },
  };
}
```

---

#### 2.4.3 Plik: `src/chat/sse/sse-event.type.ts`

**Zmiana:** Wyrównać typ wewnętrzny SSE z `SseDonePayloadDto`:

```typescript
import type { ChatWarningDto } from '../dto/chat-warning.dto';

export type SseDoneEvent = {
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
  };
  toolCalls?: GatewayToolCall[];
  finishReason?: /* ... istniejący union ... */;
  systemFingerprint?: string;
  thinkingContent?: string;
  // NEW: R2.4 — spójność z SseDonePayloadDto / buildStreamDoneEvent
  warnings?: ChatWarningDto[];
};
```

---

#### 2.4.4 Plik: `src/cache/response-cache.service.ts`

**Zmiana:** `CachedChatResponse` musi odzwierciedlać pełny kształt odpowiedzi zapisywanej w cache (w tym opcjonalne `warnings` z R2.1):

```typescript
import type { ChatWarningDto } from '../chat/dto/chat-warning.dto';

export interface CachedChatResponse {
  id: string;
  provider: string;
  model: string;
  output: {
    type: string;
    text: string;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  requestId: string;
  cached: true;
  cachedAt: string;
  // NEW: R2.4 — pole opcjonalne, persystowane przy cache SET z chatResult
  warnings?: ChatWarningDto[];
}
```

**Uwaga:** Logika cache (hit zwraca zapisany blob) **nie wymaga** ponownego liczenia warnings — wystarczy poprawny typ.

---

#### 2.4.5 Plik: `src/chat/helpers/generation-warnings.spec.ts` (NOWY)

**Akcja:** Testy reguł z R2.1.4 — per provider i parametr:

```typescript
import { buildGenerationWarnings } from './generation-warnings';

describe('buildGenerationWarnings', () => {
  it('should warn frequencyPenalty for anthropic', () => {
    const warnings = buildGenerationWarnings(
      { frequencyPenalty: 0.5 },
      'anthropic',
    );
    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'PARAM_IGNORED_BY_PROVIDER',
        field: 'params.frequencyPenalty',
      }),
    ]);
  });

  it('should warn frequencyPenalty and presencePenalty for google', () => {
    const warnings = buildGenerationWarnings(
      { frequencyPenalty: 0.1, presencePenalty: 0.2 },
      'google',
    );
    expect(warnings).toHaveLength(2);
    expect(warnings.map((w) => w.field)).toEqual(
      expect.arrayContaining([
        'params.frequencyPenalty',
        'params.presencePenalty',
      ]),
    );
  });

  it('should warn seed only for anthropic, not google', () => {
    expect(
      buildGenerationWarnings({ seed: 42 }, 'anthropic'),
    ).toHaveLength(1);
    expect(
      buildGenerationWarnings({ seed: 42 }, 'google'),
    ).toHaveLength(0);
  });

  it('should return empty array when no ignored params are set', () => {
    expect(buildGenerationWarnings({ temperature: 0.7 }, 'anthropic')).toEqual(
      [],
    );
  });
});
```

---

#### 2.4.6 Plik: `src/chat/services/chat-response-builder.service.spec.ts`

**Akcja:** Dodać scenariusze `warnings` (oraz usunąć martwy import `buildGenerationWarnings`, jeśli nieużywany):

```typescript
it('should include warnings when options and providerType are passed', () => {
  const result = service.buildChatResponse(
    baseProviderResponse,
    'anthropic',
    'test-model',
    'req-123',
    VALID_CONVERSATION_ID,
    undefined,
    { frequencyPenalty: 0.5 },
    'anthropic',
  );

  expect(result.warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: 'PARAM_IGNORED_BY_PROVIDER',
        field: 'params.frequencyPenalty',
      }),
    ]),
  );
});

it('should omit warnings when providerType is missing', () => {
  const result = service.buildChatResponse(
    baseProviderResponse,
    'anthropic',
    'test-model',
    'req-123',
    VALID_CONVERSATION_ID,
    undefined,
    { frequencyPenalty: 0.5 },
    undefined,
  );

  expect(result.warnings).toBeUndefined();
});

it('should include warnings in stream done event', () => {
  const event = service.buildStreamDoneEvent(
    { inputTokens: 1, outputTokens: 2 },
    undefined,
    'end_turn',
    undefined,
    undefined,
    { presencePenalty: 0.3 },
    'google',
  );

  if (event.name !== 'done') throw new Error('Expected done event');
  expect(event.data.warnings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'params.presencePenalty' }),
    ]),
  );
});
```

---

#### 2.4.7 Plik: `src/chat/chat.service.spec.ts`

**Akcja:** Zaktualizować oczekiwania po rozszerzeniu sygnatur buildera w R2.1.6 — przekazywane są **`options`** (z `resolveProviderCallOptions`) oraz **`resolved.providerType`**:

```typescript
// executeChat — przykład asercji:
const expectedOptions = resolveProviderCallOptions(
  resolvedConfig.params,
  baseRequest.params,
);

expect(mockResponseBuilder.buildChatResponse).toHaveBeenCalledWith(
  expect.any(Object),
  'anthropic',
  TEST_MODEL_ALIAS,
  'req-123',
  VALID_CONVERSATION_ID,
  undefined,
  expectedOptions,
  'anthropic', // providerType z mock resolvedConfig
);

// executeStream — buildStreamDoneEvent:
expect(mockResponseBuilder.buildStreamDoneEvent).toHaveBeenCalledWith(
  { inputTokens: 15, outputTokens: 25 },
  expect.any(Array),
  'tool_use',
  'fp_stream_123',
  'Stream thinking',
  expectedOptions,
  'anthropic',
);
```

**Uwaga:** Mock `createMockDefaultResolvedConfig()` musi zawierać `providerType: 'anthropic'` (patrz 2.4.2) — inaczej ostatni argument będzie `undefined` i gałąź warnings w builderze nigdy nie zostanie przetestowana w orchestracji.

---

#### 2.4.8 Weryfikacja

```bash
npm run build
npm test -- generation-warnings chat-response-builder chat.service provider-registry
npm run lint
```

**Definition of Done (R2.4):**

- [x] `ResolvedProviderConfig.providerType` obecne w registry, mocku i teście registry.
- [x] `SseDoneEvent` i `CachedChatResponse` zawierają opcjonalne `warnings`.
- [x] Testy unit pokrywają reguły `buildGenerationWarnings`, builder (chat + SSE) oraz propagację z `ChatService`.
- [x] `npm run build` i powyższe testy unit — zielone.

**Commit:** `test(chat): close warnings gaps — types, mocks, unit tests (R2.4)`

---

## R3: Dokumentacja — synchronizacja (4–6h) ✅ WYKONANA 2026-06-22

**Cel:** Zamknąć **D3**, **D6–D9**, **D14–D17**, **D15** — jeden spójny przekaz dla czytelników i integratorów.

### Krok R3.1: Fasada OpenAI ≠ provider OpenAI (45min) — **D3** ✅ WYKONANY 2026-06-22

**Pliki:**

| Plik | Zmiana |
|------|--------|
| `README.md` | Sekcja callout o fasadzie vs backend |
| `docs/dokumentacja_koncepcyjna.md` | Tabela „Powierzchnia vs silnik LLM" |
| `docs/integracja-openai-kontrakt.md` | Callout na początku |
| `docs/README.md` | Punkt w „Jak czytać" |

**Szablon callout dla `README.md`:**

```markdown
## Integracje API

Gateway wystawia równoległe kontrakty HTTP nad tym samym `ChatService`:

| Standard | Endpointy | Dokumentacja | Dla |
|----------|-----------|--------------|-----|
| **Natywny** | `/api/v1/chat`, `/api/v1/chat/stream` | [`docs/dokumentacja_api.md`](docs/dokumentacja_api.md) | Własne aplikacje |
| **OpenAI API** | `/api/v1/openai/models`, `/api/v1/openai/chat/completions` | [`docs/integracja-openai-kontrakt.md`](docs/integracja-openai-kontrakt.md) | Cursor IDE |
| **Anthropic Messages API** | `/api/v1/anthropic/messages`, `/api/v1/anthropic/models` | [`docs/integracja-anthropic-messages.md`](docs/integracja-anthropic-messages.md) | Claude Code |

<!-- NEW: D3 -->
> **⚠️ Ważne — OpenAI: kształt API vs backend LLM:**  
> Endpointy `/api/v1/openai/*` implementują **kształt** OpenAI API (kompatybilność z Cursor IDE), **nie** bezpośrednie połączenie z api.openai.com.  
> Pole `model` w żądaniu to `modelAlias` z YAML; wywołanie LLM idzie do adaptera wskazanego przez alias (Anthropic / Google).  
> **Brak providera `openai`** w `src/providers/` — OpenAI API istnieje tylko jako **fasada** (format klienta).  
> Patrz: [`docs/integracja-openai-kontrakt.md`](docs/integracja-openai-kontrakt.md).

**Autoryzacja:** ta sama allowlista (`GATEWAY_KEY_*` z `.env`), różne nagłówki:
```

**Plik:** `docs/integracja-openai-kontrakt.md` — dodać callout na początku:

```markdown
# Integracja OpenAI (kontrakt Cursor IDE)

<!-- NEW: D3 -->
> **⚠️ Ważne — fasada vs provider:**  
> Ten dokument opisuje **fasadę OpenAI** — warstwę HTTP mapującą kontrakt OpenAI API (`/chat/completions`) na wewnętrzny `ChatService`.  
> Gateway **nie** wysyła requestów do api.openai.com; pole `model` w żądaniu = `modelAlias` z YAML; backend to Anthropic / Google.  
> **Brak adaptera `create-openai-provider.ts`** w `src/providers/` — provider OpenAI jest planowany, ale niezaimplementowany.

## Cel
```

**Commit:** `docs: clarify OpenAI facade vs OpenAI provider (D3)`

---

### Krok R3.2: System prompt — prominentne ostrzeżenie IDE (30min) — **D17** ✅ WYKONANY 2026-06-22

**Pliki:**

- `docs/integracja-openai-kontrakt.md` — sekcja **„System prompt (polityka gateway)"** tuż po Autoryzacji.
- `docs/integracja-anthropic-messages.md` — analogicznie.
- `docs/integracje.md` — tabela MVP: wiersz `system` w messages → **„ignorowane, źródło: `src/config/system-prompt/`"** pogrubione.

**Plik:** `docs/integracja-openai-kontrakt.md` — dodać sekcję po „Autoryzacja":

```markdown
## System prompt (polityka gateway)

<!-- NEW: D17 -->
> **⚠️ Ważne dla integratorów Cursor:**  
> Gateway **ignoruje** rolę `system` w tablicy `messages[]`. System prompt jest **zarządzany po stronie serwera** (pliki w `src/config/system-prompt/`).  
> IDE nie może nadpisać ani modyfikować system promptu. Jeśli Twoja aplikacja wymaga własnego system promptu, musisz zmodyfikować konfigurację gateway i zrestartować serwer.  
> Patrz: [`konfiguracja.md`](konfiguracja.md), sekcja „System prompt".
```

**Plik:** `docs/integracja-anthropic-messages.md` — analogicznie:

```markdown
## System prompt (polityka gateway)

<!-- NEW: D17 -->
> **⚠️ Ważne dla integratorów Claude Code:**  
> Mimo że Anthropic Messages API wspiera pole `system` w request body, gateway **nadpisuje** je własnymi promptami z `src/config/system-prompt/`.  
> Klient nie może kontrolować system promptu przez API. Jeśli potrzebujesz własnego promptu, edytuj pliki w `src/config/system-prompt/` i zrestartuj gateway.  
> Patrz: [`konfiguracja.md`](konfiguracja.md), sekcja „System prompt".
```

**Commit:** `docs: prominent system prompt policy for IDE integrators (D17)`

---

### Krok R3.3: Limity walidacji native vs fasady (45min) — **D16** ✅ WYKONANY 2026-06-22

**Plik:** `docs/integracje.md` — rozszerz tabelę „Limity wiadomości":

```markdown
## Limity walidacji (ChatIngressValidator)

<!-- NEW: D16 -->
Gateway stosuje **różne profile walidacji** dla natywnego API i fasad IDE:

| Profil | Endpoint | Max messages | Max content (user/assistant) | Max content (tool) |
|--------|----------|--------------|------------------------------|---------------------|
| `native` | `/api/v1/chat`, `/api/v1/chat/stream` | 150 | 3000 | 32000 |
| `facade-openai` | `/api/v1/openai/chat/completions` | 15000 | 128000 | 128000 |
| `facade-anthropic` | `/api/v1/anthropic/messages` | 15000 | 128000 | 128000 |

**Implementacja:** `src/chat/validation/chat-ingress.validator.ts` — walidacja przed wejściem do `ChatService`.  
**Testy:** `src/chat/validation/chat-ingress.validator.spec.ts`, E2E w `test/e2e/`.
```

**Plik:** `docs/dokumentacja_api.md` — dodać sekcję „Różnice natywny vs fasady":

```markdown
## Różnice natywny API vs fasady IDE

<!-- NEW: D16 -->
| Aspekt | Natywny (`/api/v1/chat`) | Fasady OpenAI/Anthropic |
|--------|--------------------------|-------------------------|
| Max wiadomości | 150 | 15000 |
| Max długość `content` (user/assistant) | 3000 znaków | 128000 znaków |
| Max długość `content` (tool) | 32000 znaków | 128000 znaków |
| Pole `warnings` w response | ✅ Tak | ❌ Nie (zgodność z vendorem) |
| System prompt | Serwer | Serwer (ignorowane z body) |

**Uzasadnienie:** Fasady IDE są zaprojektowane dla długich konwersacji i dużych kontekstów (Cursor, Claude Code), podczas gdy natywne API ma konserwatywne limity dla własnych aplikacji.
```

**Commit:** `docs: document native vs facade validation limits (D16)`

---

### Krok R3.4: Porządek plików koncepcyjnych (30min) — **D6**, **D7** ✅ WYKONANY 2026-06-22

**`opis_koncepcyjny.md`:**

Zastąp całą treść redirectem (max 15 linii):

```markdown
# Opis koncepcyjny → Dokumentacja koncepcyjna

<!-- NEW: D6 -->
Ten plik jest **aliasem historycznym**. Aktualna treść znajduje się w:

➡️ [`docs/dokumentacja_koncepcyjna.md`](docs/dokumentacja_koncepcyjna.md)

**Dlaczego redirect:**  
Oryginalny `opis_koncepcyjny.md` zawierał przestarzałe opisy; został zastąpiony przez `dokumentacja_koncepcyjna.md` z aktualnymi informacjami o architekturze, fasadach i MVP.
```

**`dictionary-thinking-additions.md`:**

Jeśli plik istnieje — **scal** treść do `docs/dictionary.md` (sekcja thinking), usuń orphan. Jeśli nie istnieje — usuń wzmianki z innych docs.

**Commit:** `docs: consolidate thinking dictionary and retire opis_koncepcyjny body (D6, D7)`

---

### Krok R3.5: `mcp.md` — honest scope (30min) — **D8** ✅ WYKONANY 2026-06-22

**Plik:** `docs/mcp.md`

**Zmiana:** Sekcja „Konfiguracja (kierunek)" → nagłówek **„Planowane (niezaimplementowane)"**:

```markdown
## Planowane (niezaimplementowane)

<!-- NEW: D8 -->
> **⚠️ Status:** MCP w gateway to **koncepcja planowana**, nie działająca funkcjonalność.  
> Poniższe przykłady konfiguracji YAML są **propozycją** na przyszłość — **nie** używaj ich w produkcji.

### Propozycja v2: `mcp.configPath` per alias

```yaml
models:
  chat-default:
    # ... istniejące pola
    mcp:
      configPath: ./mcp-configs/cursor.json  # PLANOWANE, niezaimplementowane
```

**Uwaga:** Zod schema (`gateway-config.schema.ts`) **nie** definiuje pola `mcp` — próba użycia kończy się błędem walidacji.
```

**Plik:** `docs/README.md` — punkt 4:

```markdown
4. MCP w gateway — poza rdzeniem; **patrz status w `mcp.md`** (planowane, niezaimplementowane).
```

**Commit:** `docs: mark MCP config as planned not implemented (D8)`

---

### Krok R3.6: MVP / Fazy — uproszczenie (45min) — **D9** ✅ WYKONANY 2026-06-22

**Plik:** `docs/dokumentacja_koncepcyjna.md`

**Zmiana:** Dodać tabelę **„Co jest w produkcie dziś"** vs **„Historyczna numeracja faz"**:

```markdown
## MVP i fazy — wyjaśnienie numeracji

<!-- NEW: D9 -->
> **⚠️ Ważne:** Numeracja faz (Faza 1, Faza 2 itd.) w dokumentacji jest **chronologiczna** (porządek implementacji), **nie** równa się kolejności MVP ani ważności funkcjonalności.

| Funkcjonalność | Status w produkcie | Historyczna faza |
|----------------|-------------------|------------------|
| Natywne API (`/chat`, `/chat/stream`) | ✅ Wdrożone | Faza 1 |
| Fasada OpenAI (Cursor IDE) | ✅ Wdrożone | Faza 2 |
| Fasada Anthropic (Claude Code) | ✅ Wdrożone | Faza 2 |
| Tool calling | ✅ Wdrożone | Faza 3 |
| Extended thinking (reasoning models) | ✅ Wdrożone | Faza 4 |
| Response caching (Redis) | ✅ Wdrożone | Faza 1 |
| Smart rate limiting | ✅ Wdrożone | Faza 1 |

**Podsumowanie:** Wszystkie kluczowe funkcjonalności z planu MVP są **wdrożone**. Numeracja faz pozostała w dokumentacji dla historycznego kontekstu (plany implementacyjne `tools_implementation.md`, `integrations-plan.md`).
```

**Commit:** `docs: clarify MVP vs phase numbering (D9)`

---

### Krok R3.7: `anty-patterny.md` §5 — wyjątek fasad (20min) — **D15** ✅ WYKONANY 2026-06-22

**Plik:** `docs/anty-patterny.md`

**Zmiana:** Po §5 dodać callout:

```markdown
## §5. Endpointy REST — unikanie redundancji ścieżek

[... istniejąca treść ...]

<!-- NEW: D15 -->
**Wyjątek (zamierzony):** osobne prefiksy `/api/v1/openai` i `/api/v1/anthropic` z formatem vendora — patrz §13 (Fasady integracji). Nie dotyczy natywnego `/api/v1/chat`.

Uzasadnienie: Fasady IDE wymagają zgodności z OpenAI API i Anthropic Messages API; osobne ścieżki są **zamierzone** i nie naruszają zasad tego anty-wzorca (dotyczy wyłącznie natywnego kontraktu gateway).
```

**Commit:** `docs: anty-patterny exception for IDE facades in section 5 (D15)`

---

### Krok R3.8: Redukcja redundancji README (45min) — **D14** ✅ WYKONANY 2026-06-22

**Zasada:**

- `README.md` (root) — quick start, linki, 1 tabela endpointów.
- `docs/README.md` — pełna mapa dokumentacji.
- Liczniki testów (**58** / **1009** / E2E) — **tylko** w `docs/testy.md`; w README: „patrz testy.md".

**Plik:** `README.md` — zastąp sekcję „Testy":

```markdown
## Testy

<!-- NEW: D14 -->
Szczegóły pokrycia, liczniki zestawów i przypadków testowych: [`docs/testy.md`](docs/testy.md).

Uruchomienie:

```bash
npm test                 # jednostkowe
npm run test:e2e         # end-to-end
npm run test:all         # wszystkie
```
```

**Plik:** `docs/testy.md` — pozostaw liczniki bez zmian (single source of truth).

**Plik:** `docs/architektura-katalogi-pliki.md` — sekcja 3:

```markdown
## 3. Pokrycie testami

Liczby zestawów i przypadków: **[`testy.md`](testy.md)** (single source of truth).
```

**Commit:** `docs: single source of truth for test counts in testy.md (D14)`

---

## R4: Adopcja OSS (4–6h)

**Cel:** Zamknąć **D10–D13**, **D19**, **D20** — projekt gotowy do forków i integracji przez osoby trzecie.

### Krok R4.1: Strategia wersjonowania (30min) — **D10**

**Plik:** `docs/dokumentacja_api.md` — dodać sekcję **„Wersjonowanie"**:

```markdown
## Wersjonowanie

<!-- NEW: D10 -->
Gateway stosuje **trzy niezależne numeracje wersji** (nie mylić ze sobą):

| Wersja | Lokalizacja | Pole w `openapi.json` | Znaczenie | Semver |
|--------|-------------|----------------------|-----------|--------|
| **App version** | `package.json` → `version` | — | Wersja aplikacji (release) | ✅ |
| **OpenAPI version** | `src/swagger/swagger.constants.ts` → `OPENAPI_VERSION` | `info.version` | Semver kontraktu HTTP API | ✅ |
| **OpenAPI spec version** | `src/swagger/swagger.constants.ts` → `OPENAPI_SPEC_VERSION` | `"openapi"` (root) | Wersja formatu dokumentu (3.0 / 3.1) | ❌ (stała specyfikacji) |

### Zasady bump

- **OPENAPI_VERSION:**
  - **MAJOR** — breaking change w JSON (usunięte pola, zmiana typów wymaganych pól).
  - **MINOR** — additive (nowe pola opcjonalne, nowe kody błędów).
  - **PATCH** — fixы bez zmian kontraktu (typo w opisie OpenAPI).

- **package.json version:**
  - Wersja aplikacji; nie musi być zsynchronizowana 1:1 z OpenAPI.
  - Bump przy każdym release (feat, fix, docs, refactor).

**Przykład:** `OPENAPI_VERSION = 0.12.1`, `package.json version = 1.0.5` — OK (app ma więcej wydań niż breaking changes API).

**Eksport OpenAPI:** `npm run openapi:export` — generuje `openapi.json`; `info.version` z `OPENAPI_VERSION`, klucz `"openapi"` z `OPENAPI_SPEC_VERSION` (`export-openapi.ts`).
```

**Plik:** `src/swagger/swagger.constants.ts` — dodać komentarz:

```typescript
// NEW: D10 - komentarz o semver
export const OPENAPI_VERSION = '0.12.0';
// Semver kontraktu HTTP → openapi.json info.version
// MAJOR - breaking change w JSON (usunięte/zmienione pola wymagane)
// MINOR - additive (nowe pola opcjonalne, nowe kody błędów)
// PATCH - dokumentacja, opisy, bez zmian kontraktu

export const OPENAPI_SPEC_VERSION = '3.1.0';
// Wersja formatu specyfikacji OpenAPI → openapi.json klucz root "openapi" (nie semver API)
```

**Commit:** `docs: document app vs OpenAPI versioning strategy (D10)`

---

### Krok R4.2: `CHANGELOG.md` (45min) — **D12** ❌ ANULOWANY 2026-06-22

**Status:** ❌ **ANULOWANY** — brak formalnej polityki release'ów i tagów Git; `CHANGELOG.md` wprowadzałby fałszywe oczekiwania semver (por. uwaga w R4.3.2 / `SECURITY.md`). Możliwy powrót po wdrożeniu tagów release i deploy pipeline.

**Pozostała treść poniżej:** archiwalny szablon — nie implementować bez ponownej decyzji produktowej.

**Plik:** `CHANGELOG.md` (root, NOWY)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (D1, D2, D5)
- Enforcement `capabilities.thinking` — kod błędu `THINKING_NOT_SUPPORTED` przy `thinkingEnabled: true` na aliasie bez wsparcia reasoning.
- `ChatIngressValidator` — profile walidacji (`native`, `facade-openai`, `facade-anthropic`) z różnymi limitami wiadomości i content.
- Pole `warnings` w odpowiedzi natywnej (`POST /api/v1/chat`, SSE `done`) — informacja o ignorowanych parametrach (np. `frequencyPenalty` przez Anthropic/Google).

### Fixed
- Mapowanie `THINKING_NOT_SUPPORTED` w filtrach fasad OpenAI i Anthropic.

### Changed (D3, D16, D17)
- Dokumentacja: wyraźne rozróżnienie **fasada OpenAI** (format klienta) vs **provider OpenAI** (backend LLM, niezaimplementowany).
- Dokumentacja: prominentne ostrzeżenie o system prompt po stronie serwera dla integratorów IDE.
- Dokumentacja: limity walidacji native vs fasady (150 vs 15000 wiadomości, 3k vs 128k content).

## [0.12.0] - 2026-06-XX (baseline audytu)

### Added
- Fasada OpenAI (Cursor IDE) — kontrakt `/api/v1/openai/chat/completions`.
- Fasada Anthropic (Claude Code) — kontrakt `/api/v1/anthropic/messages`.
- Tool calling — full loop dla Anthropic i Google providers.
- Extended thinking — wsparcie reasoning models (Anthropic Claude Opus/Sonnet 4.5+, Google Gemini 3.0+).
- Response caching (Redis backend).
- Smart rate limiting per-client (RPS/burst/concurrent streams).

## [Earlier releases]

Historia przed 0.12.0 nie była dokumentowana w CHANGELOG.

[Unreleased]: https://github.com/yourorg/yourrepo/compare/v0.12.0...HEAD
[0.12.0]: https://github.com/yourorg/yourrepo/releases/tag/v0.12.0
```

**README.md:** link do CHANGELOG:

```markdown
## Dokumentacja

Wejście od strony dokumentów: [`docs/README.md`](docs/README.md).

<!-- NEW: D12 -->
Historia zmian: [`CHANGELOG.md`](CHANGELOG.md).
```

**Commit:** `docs: add CHANGELOG.md (D12)`

---

### Krok R4.3: ~~`CONTRIBUTING.md`~~ + `SECURITY.md` (1–1.5h) — **D12**

**Uwaga:** `CONTRIBUTING.md` — ❌ **ANULOWANY** (2026-06-22). Stworzenie i wykorzystanie pliku `CONTRIBUTING.md` zostało porzucone; krok 4.3.1 nie implementować. Realizować wyłącznie `SECURITY.md` (4.3.2).

#### 4.3.1 Plik: `CONTRIBUTING.md` (NOWY) — ❌ ANULOWANY 2026-06-22

**Status:** ❌ **ANULOWANY** — stworzenie i wykorzystanie `CONTRIBUTING.md` zostało porzucone. Możliwy powrót po otwarciu publicznego workflow kontrybucji OSS.

**Pozostała treść poniżej:** archiwalny szablon — nie implementować bez ponownej decyzji produktowej.

```markdown
# Contributing to AI Provider Gateway

Dziękujemy za zainteresowanie projektem! 🎉

## Setup lokalny

Wymagania: Node.js 18+ + npm.

1. Clone repo:
   ```bash
   git clone https://github.com/yourorg/ai-provider-gateway.git
   cd ai-provider-gateway
   ```

2. Instalacja zależności:
   ```bash
   npm install
   ```

3. Konfiguracja (interaktywny wizard):
   ```bash
   npm run cli config:init
   ```
   Alternatywnie: skopiuj `.env.example` → `.env` i uzupełnij klucze providerów.

4. Walidacja configu:
   ```bash
   npm run config:validate
   ```

5. Uruchomienie:
   ```bash
   npm run start:dev
   ```

## Testy

**Przed każdym PR** uruchom:

```bash
npm run test:all
```

- `npm test` — jednostkowe
- `npm run test:e2e` — end-to-end
- `npm run lint` — ESLint + Prettier

## Struktura projektu

Katalogi kluczowe:

- `src/chat/` — rdzeń orchestration (ChatService, walidacja, mappery).
- `src/providers/` — adaptery SDK (fabryki Anthropic, Google).
- `src/integrations/` — fasady OpenAI/Anthropic (mappery kontraktów IDE).
- `docs/` — dokumentacja (architektura, API, konfiguracja).
- `test/e2e/` — testy integracyjne.

## Gdzie dodawać nowe funkcje

| Funkcja | Lokalizacja |
|---------|-------------|
| **Nowy provider** (np. OpenAI, Mistral) | `src/providers/factories/create-{provider}-provider.ts` + rejestracja w `provider-instances.bootstrap.ts` |
| **Mapper tools dla providera** | `src/providers/{provider}/{provider}-tools.mapper.ts` |
| **Fasada nowego IDE** | `src/integrations/{ide-name}/` (kontroler, mappery, DTO, filtry) |
| **Walidacja requestów** | `src/chat/validation/` lub `src/chat/services/chat-validation.service.ts` |
| **Nowy parametr generacji** | `src/chat/dto/chat-params.dto.ts` → `resolve-provider-call-options.ts` → fabryka providera |

## Konwencja commitów

Preferujemy [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(chat): add warnings for ignored params
fix(providers): handle timeout in Anthropic adapter
docs: update README with new examples
test(e2e): cover thinking validation
```

## Pull Requests

1. Fork repo i stwórz branch (`feature/my-feature`, `fix/bug-123`).
2. Zaimplementuj zmiany + testy.
3. Uruchom `npm run test:all` i `npm run lint`.
4. Otwórz PR z opisem:
   - Które issue zamyka (jeśli dotyczy).
   - Czy zmieniono kontrakt HTTP (bump `OPENAPI_VERSION`?).
   - Czy zaktualizowano docs.
   - Wynik testów.

## Pytania?

Otwórz issue na GitHubie lub napisz na [email].
```

---

#### 4.3.2 Plik: `SECURITY.md` (NOWY)

**Uwaga implementacyjna:** Nie obiecuj w sekcji „Supported Versions" konkretnych zakresów semver (np. `0.12.x`), dopóki nie ma ustalonej polityki release'ów i tagów Git. Bez `CHANGELOG.md` (R4.2 anulowany) i bez strategii deployu tabela wersji wprowadza fałszywe oczekiwania wobec wsparcia bezpieczeństwa. Bezpieczniejsze warianty na ten etap:

- „Supported: aktualny branch `main` (lub ostatni tag, jeśli istnieje)"
- jeden wiersz: `development` — brak formalnych release'ów semver

Po wdrożeniu polityki release'ów (tagi, deploy) — uzupełnić tabelę wspieranych wersji.

```markdown
# Security Policy

## Supported Versions

| Wersja / gałąź | Supported          |
| -------------- | ------------------ |
| `main` (HEAD)  | :white_check_mark: |
| Starsze commity / brak tagu | :x: (brak formalnych release'ów) |

## Klucze API — best practices

### Gateway keys (klienci → gateway)

- **Nigdy** nie commituj kluczy w PR (`.env`, `gateway.config.yaml`).
- Używaj `GATEWAY_KEY_*` z allowlisty w `.env`.
- Rotacja: usuń stary klucz z allowlisty, zrestartuj gateway.

### Provider keys (gateway → LLM)

- Klucze providerów (`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`) w `.env` — **nigdy** w YAML.
- Per-instance keys: `apiKeyRef` w `gateway.providers[].apiKeyRef` wskazuje zmienną env.
- W production: używaj secret manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).

### Gateway NIE JEST open proxy

Gateway **nie** przekazuje dowolnych requestów do dowolnych URL — wyłącznie wywołania SDK providerów z kluczami z `.env`.  
Klient **nie** może podać własnego klucza providera przez API.

## Zgłaszanie podatności

Jeśli znalazłeś problem bezpieczeństwa:

1. **Nie** otwieraj publicznego issue.
2. Wyślij email na: **[email autora z package.json]**
3. Alternatywnie: GitHub Security Advisories (jeśli repo publiczne).

Odpowiemy w ciągu 48h.

## Scope

Gateway obsługuje:

- Autoryzację klientów (allowlista `GATEWAY_KEY_*`).
- Izolację kluczy providerów (nigdy nie wystawiamy ich klientowi).
- Rate limiting per-client.
- Timeout i retry dla wywołań upstream.

Gateway **nie** obsługuje (out of scope):

- Audyt logów pod kątem PII (odpowiedzialność operatora).
- Encryption at rest dla cache Redis (konfiguracja zewnętrzna).
- Network-level security (firewall, VPN — infrastruktura).
```

**Commit:** `docs: add SECURITY.md (D12)` *(~~`CONTRIBUTING.md`~~ — anulowane w 4.3.1)*

---

### Krok R4.4: `"private": true` vs MIT (15min) — **D11** ✅ WYKONANY 2026-06-22

**Status:** ✅ **WYKONANY** — sekcja „Dystrybucja" dodana do `README.md` (MIT, fork/clone, brak publikacji na npm).

**Decyzja produktowa:** Opcja A — OSS / fork (pozostaw `"private": true`, wyjaśnij w README).

**Plik:** `README.md` — dodać sekcję „Dystrybucja":

```markdown
## Dystrybucja

<!-- NEW: D11 -->
Projekt jest open-source pod licencją **MIT** — możesz forkować, modyfikować i deployować własne instancje.

**Uwaga:** `"private": true` w `package.json` oznacza, że **nie publikujemy** tego pakietu na npm. Jeśli chcesz użyć gateway:

1. Fork repozytorium.
2. Clone lokalnie i skonfiguruj (patrz „Szybki start").
3. Deploy na własnej infrastrukturze (VPS, Kubernetes, Docker Compose).

Alternatywnie: jeśli potrzebujesz pakietu npm, otwórz issue z use case.
```

**Commit:** `docs: clarify distribution model (MIT, not npm) (D11)`

---

### Krok R4.5: Katalog `examples/` (1.5–2h) — **D13**

**Struktura:**

```
examples/
├── README.md
├── native-chat.sh              # curl POST /api/v1/chat
├── native-chat-stream.sh       # curl SSE
├── openai-cursor-minimal.sh    # Bearer + /openai/chat/completions
├── anthropic-claude-code-minimal.sh
└── gateway.config.snippet.yaml # minimalny fragment aliasów (bez sekretów)
```

---

#### 4.5.1 Plik: `examples/README.md` (NOWY)

```markdown
# Przykłady użycia — AI Provider Gateway

Ten katalog zawiera przykładowe skrypty curl dla trzech powierzchni API gateway.

## Wymagania

1. Gateway uruchomiony lokalnie (`npm run start:dev`) lub na serwerze.
2. Plik `.env` z kluczami providerów i gateway.
3. Konfiguracja `gateway.config.yaml` (lub użyj `gateway.config.snippet.yaml`).

## Autoryzacja

- **Natywny API:** `X-Gateway-Key: <twoj_klucz>`
- **OpenAI fasada:** `Authorization: Bearer <twoj_klucz>`
- **Anthropic fasada:** `x-api-key: <twoj_klucz>`

Klucze z allowlisty `GATEWAY_KEY_*` w `.env`.

## Przykłady

### 1. Natywny czat (JSON)

```bash
bash examples/native-chat.sh
```

### 2. Natywny czat (SSE stream)

```bash
bash examples/native-chat-stream.sh
```

### 3. Cursor IDE (OpenAI API)

```bash
bash examples/openai-cursor-minimal.sh
```

### 4. Claude Code (Anthropic Messages API)

```bash
bash examples/anthropic-claude-code-minimal.sh
```

## Dokumentacja

- Natywny API: [`docs/dokumentacja_api.md`](../docs/dokumentacja_api.md)
- OpenAI fasada: [`docs/integracja-openai-kontrakt.md`](../docs/integracja-openai-kontrakt.md)
- Anthropic fasada: [`docs/integracja-anthropic-messages.md`](../docs/integracja-anthropic-messages.md)
```

---

#### 4.5.2 Plik: `examples/native-chat.sh` (NOWY)

```bash
#!/bin/bash
# Przykład: POST /api/v1/chat (natywny API)

GATEWAY_URL="http://localhost:3000"
GATEWAY_KEY="your-gateway-key-from-env"

curl -X POST "$GATEWAY_URL/api/v1/chat" \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Key: $GATEWAY_KEY" \
  -d '{
    "modelAlias": "chat-default",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'
```

---

#### 4.5.3 Plik: `examples/native-chat-stream.sh` (NOWY)

```bash
#!/bin/bash
# Przykład: POST /api/v1/chat/stream (SSE)

GATEWAY_URL="http://localhost:3000"
GATEWAY_KEY="your-gateway-key-from-env"

curl -N -X POST "$GATEWAY_URL/api/v1/chat/stream" \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Key: $GATEWAY_KEY" \
  -d '{
    "modelAlias": "chat-default",
    "messages": [
      {
        "role": "user",
        "content": "Tell me a short story."
      }
    ]
  }'
```

---

#### 4.5.4 Plik: `examples/openai-cursor-minimal.sh` (NOWY)

```bash
#!/bin/bash
# Przykład: Cursor IDE (OpenAI API fasada)

GATEWAY_URL="http://localhost:3000"
GATEWAY_KEY="your-gateway-key-from-env"

curl -X POST "$GATEWAY_URL/api/v1/openai/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GATEWAY_KEY" \
  -d '{
    "model": "chat-default",
    "messages": [
      {
        "role": "user",
        "content": "Explain quantum computing."
      }
    ]
  }'
```

---

#### 4.5.5 Plik: `examples/anthropic-claude-code-minimal.sh` (NOWY)

```bash
#!/bin/bash
# Przykład: Claude Code (Anthropic Messages API fasada)

GATEWAY_URL="http://localhost:3000"
GATEWAY_KEY="your-gateway-key-from-env"

curl -X POST "$GATEWAY_URL/api/v1/anthropic/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $GATEWAY_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "chat-default",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  }'
```

---

#### 4.5.6 Plik: `examples/gateway.config.snippet.yaml` (NOWY)

```yaml
# Minimalny snippet konfiguracji dla przykładów
# Skopiuj do gateway.config.yaml w root projektu

gatewayKey:
  allowList:
    - '{{env.GATEWAY_KEY_DEV}}'

providers:
  anthropic:
    type: anthropic
    apiKeyRef: ANTHROPIC_API_KEY
    enabled: true

  google:
    type: google
    apiKeyRef: GOOGLE_API_KEY
    enabled: true

models:
  chat-default:
    provider: anthropic
    modelId: claude-sonnet-4.5-20250514
    policy:
      timeoutMs: 60000
    capabilities:
      streaming: true
      tools: true
      thinking: true
```

---

**Root `README.md`:** link do `examples/`:

```markdown
## Przykłady użycia

Skrypty curl dla trzech powierzchni API: [`examples/`](examples/).
```

**Commit:** `docs: add examples for three API surfaces (D13)`

---

### Krok R4.6: Macierz kompatybilności IDE (30min) — **D20**

**Plik:** `docs/compatibility-matrix.md` (NOWY)

```markdown
# Macierz kompatybilności IDE — AI Provider Gateway

Ten dokument zawiera listę narzędzi i klientów IDE, które zostały **ręcznie przetestowane** z gateway.

## Status testów

| Status | Znaczenie |
|--------|-----------|
| ✅ Tested | Ręcznie przetestowane i działające |
| ⚠️ Community | Zgłoszone przez community, nie zweryfikowane przez maintainerów |
| ❌ Broken | Znane problemy |
| ⏳ Planned | Do przetestowania |

## Klienci

| Klient | Wersja (testowana) | Base URL | Endpoint | Status | Uwagi |
|--------|-------------------|----------|----------|--------|-------|
| **Cursor IDE** | 0.4x | `http://host:3000/api/v1/openai` | `/chat/completions` | ⏳ Planned | Tools, stream — do uzupełnienia |
| **Claude Code** | x.y | `http://host:3000/api/v1/anthropic` | `/messages` | ⏳ Planned | Messages stream — do uzupełnienia |
| **curl** | - | `http://host:3000/api/v1` | `/chat`, `/chat/stream` | ✅ Tested | Przykłady w `examples/` |

## Zgłaszanie problemów

Jeśli przetestowałeś gateway z innym klientem (np. Continue, Cody, VSCode + extension), otwórz issue z:

- Nazwa i wersja klienta.
- Base URL i endpoint.
- Czy stream / tools działają.
- Logi błędów (jeśli dotyczy).

Dodamy wpis do tabeli z tagiem `⚠️ Community`.
```

**`docs/README.md`:** link:

```markdown
<!-- NEW: D20 -->
- [Macierz kompatybilności IDE](compatibility-matrix.md)
```

**Commit:** `docs: add IDE compatibility matrix (D20)`

---

### Krok R4.7: ADR — kluczowe decyzje (1–1.5h) — **D19**

**Katalog:** `docs/adr/` (NOWY)

**Pliki:**

| Plik | Tytuł |
|------|--------|
| `0001-three-api-surfaces-one-chatservice.md` | Trzy powierzchnie HTTP, jeden silnik |
| `0002-server-side-system-prompt.md` | Brak `role=system` w API klienta |
| `0003-no-openai-provider-facade-only.md` | Fasada OpenAI bez adaptera OpenAI.com |
| `0004-native-vs-facade-validation-profiles.md` | Po implementacji R1.2 |

**Szablon ADR:** tytuł, status, kontekst, decyzja, konsekwencje.

---

#### 4.7.1 Plik: `docs/adr/0001-three-api-surfaces-one-chatservice.md` (NOWY)

```markdown
# ADR 0001: Trzy powierzchnie HTTP, jeden silnik

**Status:** Accepted  
**Data:** 2026-06-19  
**Deciders:** Core team

## Kontekst

Gateway musi wspierać:

1. Własne aplikacje z natywnym API gateway.
2. Cursor IDE (oczekuje OpenAI API).
3. Claude Code (oczekuje Anthropic Messages API).

Potrzebne są **różne formaty** HTTP (różne kształty JSON, nagłówki auth), ale **ta sama logika** orchestration (cache, retry, fallback, rate limiting, walidacja capabilities).

## Decyzja

Zaimplementować **trzy równoległe kontrolery** (`src/integrations/{openai,anthropic}`, `src/chat/chat.controller.ts`), które:

1. Mapują request vendora → `ChatRequestDto` (wspólny DTO).
2. Delegują do **tego samego** `ChatService.executeChat()` / `executeStream()`.
3. Mapują response `ChatResponseDto` → format vendora (OpenAI / Anthropic).

**Architektura:**

```
Klienci (Cursor, Claude Code, własne)
  ↓
Fasady / kontrolery (OpenAI / Anthropic / native)
  ↓
ChatService (jeden silnik orchestration)
  ↓
Providers (Anthropic SDK, Google SDK)
```

## Konsekwencje

**Pozytywne:**

- Brak duplikacji logiki orchestration.
- Jedna lista `GATEWAY_KEY_*` dla wszystkich klientów.
- Łatwe dodanie nowej fasady (np. dla Continue, Cody).

**Negatywne:**

- Mappery fasad muszą być **dokładne** (różnice w formatach → ryzyko regresji).
- OpenAPI generuje **dwa schematy** (natywny + vendorowe) — większy `openapi.json`.

**Mitigacja:**

- Testy E2E per fasada.
- Filtry błędów per fasada (mapowanie kodów gateway na format vendora).
```

---

#### 4.7.2 Plik: `docs/adr/0002-server-side-system-prompt.md` (NOWY)

```markdown
# ADR 0002: Brak `role=system` w API klienta

**Status:** Accepted  
**Data:** 2026-06-19  
**Deciders:** Core team

## Kontekst

LLM providerzy wspierają system prompt (Anthropic `system`, OpenAI `messages[0].role=system`). Klienci (IDE) mogą próbować nadpisać system prompt przez API.

**Problem:** Gateway chce kontrolować system prompt (polityka per alias, wersjonowanie, bez ekspozycji wewnętrznych instrukcji do IDE).

## Decyzja

Gateway **ignoruje** `role=system` w `messages[]` (natywny API) i nadpisuje pole `system` w request body fasad.

System prompt jest **zarządzany po stronie serwera:**

- Pliki w `src/config/system-prompt/` (per wariant: default, tool-calling, thinking).
- Funkcja `composeSystemPrompt()` łączy sekcje per alias.
- Klient **nie może** modyfikować system promptu przez API.

## Konsekwencje

**Pozytywne:**

- Kontrola nad instrukcjami dla modelu (bezpieczeństwo, spójność).
- Wersjonowanie promptów w repo (GitOps).
- Brak ryzyka „prompt injection" przez klienta.

**Negatywne:**

- Klienci IDE (Cursor, Claude Code) **nie mogą** nadpisać system promptu bez restartu gateway.
- Operatorzy muszą edytować pliki w `src/config/system-prompt/` i restartować serwer.

**Mitigacja:**

- Dokumentacja: callout w `integracja-openai-kontrakt.md`, `integracja-anthropic-messages.md` (D17).
- Rozważyć w przyszłości: dynamiczne promptowanie per `gatewayKey` (out of scope MVP).
```

---

#### 4.7.3 Plik: `docs/adr/0003-no-openai-provider-facade-only.md` (NOWY)

```markdown
# ADR 0003: Fasada OpenAI bez adaptera OpenAI.com

**Status:** Accepted  
**Data:** 2026-06-19  
**Deciders:** Core team

## Kontekst

Gateway ma fasadę OpenAI (`src/integrations/openai/`) dla Cursor IDE. Użytkownicy mogą oczekiwać, że gateway wysyła requesty do **api.openai.com**.

**Rzeczywistość:** Gateway **nie** ma adaptera `create-openai-provider.ts` w `src/providers/`. Pole `model` w żądaniu to `modelAlias`; backend to Anthropic / Google.

## Decyzja

**Nie** implementować providera OpenAI w MVP. Fasada OpenAI = **format klienta** (kontrakt HTTP), nie backend LLM.

**Komunikacja:**

- Callout w README i `integracja-openai-kontrakt.md` (D3).
- Tabela w `dictionary.md`: OpenAI provider = ⏳ **brak fabryki**.

## Konsekwencje

**Pozytywne:**

- Brak konieczności klucza OpenAI w `.env` (wystarczy Anthropic + Google).
- Cursor IDE działa z gateway bez OpenAI subscription.

**Negatywne:**

- Potencjalne zamieszanie użytkowników („dlaczego OpenAI API nie idzie do OpenAI?").
- Brak wsparcia dla modeli OpenAI (GPT-4, GPT-3.5) — tylko Anthropic / Google.

**Mitigacja:**

- Dokumentacja (D3).
- Opcjonalnie: zaimplementować `create-openai-provider.ts` w R5 (D25).
```

---

#### 4.7.4 Plik: `docs/adr/0004-native-vs-facade-validation-profiles.md` (NOWY)

```markdown
# ADR 0004: Profile walidacji native vs facade

**Status:** Accepted  
**Data:** 2026-06-19 (po implementacji R1.2)  
**Deciders:** Core team

## Kontekst

Natywny API (`/chat`) ma limity: 150 messages, 3000 chars content (user/assistant).  
Fasady IDE (Cursor, Claude Code) potrzebują **większych limitów** (długie konwersacje, duże konteksty).

`ValidationPipe` NestJS waliduje DTO kontrolera (fasada vs native = **różne DTO**). Po mapowaniu na wspólny `ChatRequestDto`, fasady omijają limity natywne.

## Decyzja

Wprowadzić **`ChatIngressValidator`** z trzema profilami:

| Profil | Max messages | Max content (user/assistant) | Max content (tool) |
|--------|--------------|------------------------------|---------------------|
| `native` | 150 | 3000 | 32000 |
| `facade-openai` | 15000 | 128000 | 128000 |
| `facade-anthropic` | 15000 | 128000 | 128000 |

Kontrolery przekazują profil do `ChatService.executeChat(requestBody, requestId, gatewayKey, ingressProfile)`.

## Konsekwencje

**Pozytywne:**

- Jawna polityka asymetrii (nie przypadkowa).
- Testowalna (unit + E2E).
- Single source of truth dla limitów (`chat-ingress.constants.ts`).

**Negatywne:**

- Dodatkowa warstwa walidacji (oprócz `ValidationPipe`).
- Duplikacja limitów między DTO dekoratorami a `INGRESS_LIMITS` (trzeba synchronizować).

**Mitigacja:**

- Testy pokrywają oba profile (D18).
- Dokumentacja (D16).
```

---

**`docs/README.md`:** sekcja ADR:

```markdown
## Architecture Decision Records (ADR)

Kluczowe decyzje architektoniczne: [`adr/`](adr/).

- [ADR 0001: Trzy powierzchnie HTTP, jeden silnik](adr/0001-three-api-surfaces-one-chatservice.md)
- [ADR 0002: Brak role=system w API klienta](adr/0002-server-side-system-prompt.md)
- [ADR 0003: Fasada OpenAI bez adaptera OpenAI.com](adr/0003-no-openai-provider-facade-only.md)
- [ADR 0004: Profile walidacji native vs facade](adr/0004-native-vs-facade-validation-profiles.md)
```

**Commit:** `docs: add architecture decision records (D19)`

---

## R5: Opcjonalne — v1+ (8–12h+)

**Cel:** **D21–D25** — tylko jeśli produkt ma iść w stronę biblioteki / pełnego providera OpenAI.

### Krok R5.1: `create-openai-provider.ts` (8h+) — **D25**

**Zależność:** osobny plan (poza `rozjazdy_likwidacja_plan.md`).

**Minimum:**

- `src/providers/factories/create-openai-provider.ts`
- Rejestracja w `provider-instances.bootstrap.ts` + `GatewayProviderType`
- `docs/dictionary.md` — kolumna OpenAI ✅
- Testy fabryki + E2E z aliasem `type: openai`

---

### Krok R5.2: Contract tests OpenAPI (3–4h) — **D21**

**Akcja:** skrypt lub test Jest ładujący `openapi.json` i walidujący przykładowe odpowiedzi E2E względem schematu (np. `ajv` + OpenAPI 3.1).

**Plik:** `test/contract/openapi-contract.spec.ts`

---

### Krok R5.3: Klient TypeScript z OpenAPI (3–4h) — **D22**

**Akcja:** `openapi-typescript` lub `orval` → `packages/gateway-client/` (opcjonalny workspace).

**Poza zakresem** jeśli nie publikujesz na npm.

---

### Krok R5.4: Health — config summary (2h) — **D23**

**Plik:** `src/health/health.service.ts`

**Pole (bez sekretów):** `enabledModelAliases: string[]`, `enabledProviderInstances: string[]`.

**Docs:** `docs/dokumentacja_api.md`, `SPEC-HEALTH.md`.

---

### Krok R5.5: Importy — konwencja `src/` (1–2h) — **D24**

**Akcja:** ESLint rule lub jednorazowy refactor — preferuj alias `src/` w `src/**` (zgodnie z `tsconfig`).

**Niski priorytet** — kosmetyka.

---

## 📁 Docelowa struktura plików (po R1–R4)

```
src/
├── chat/
│   ├── validation/                          # R1.2 NEW
│   │   ├── chat-ingress.types.ts
│   │   ├── chat-ingress.constants.ts
│   │   ├── chat-ingress.validator.ts
│   │   └── chat-ingress.validator.spec.ts
│   ├── dto/
│   │   ├── chat-warning.dto.ts              # R2.1 NEW
│   │   └── chat-response.dto.ts             # + warnings
│   ├── helpers/
│   │   ├── generation-warnings.ts           # R2.1 NEW
│   │   └── generation-warnings.spec.ts      # R2.4 NEW
│   └── services/
│       ├── chat-validation.service.ts       # R1.1 + validateThinking
│       └── chat-response-builder.service.ts # R2.1 + warnings
├── providers/
│   └── provider-registry.service.ts         # R2.4 + providerType
├── common/errors/
│   └── api-error.code.ts                    # + THINKING_NOT_SUPPORTED

docs/
├── adr/                                     # R4.7 NEW
├── compatibility-matrix.md                  # R4.6 NEW
├── dictionary.md                            # R1, R2, R3
├── integracje.md                            # R3.2, R3.3
├── mcp.md                                   # R3.5
└── anty-patterny.md                         # R3.7

examples/                                    # R4.5 NEW
# CHANGELOG.md                               # R4.2 — ❌ ANULOWANY
# CONTRIBUTING.md                            # R4.3.1 — ❌ ANULOWANY
SECURITY.md                                  # R4.3 NEW
README.md                                    # R3, R4
```

---

## ✅ Kryteria akceptacji (całość planu)

### Kontrakt (R1)

- [x] `thinkingEnabled: true` na aliasie bez `capabilities.thinking` → `400` + `THINKING_NOT_SUPPORTED` (native + fasady). *(R1.1, R1.3)*
- [x] `ChatIngressValidator` odrzuca native request >150 wiadomości. *(R1.2)*
- [x] Fasada akceptuje request >150 wiadomości (do limitu 15000). *(R1.2)*
- [x] Testy jednostkowe i E2E pokrywają powyższe. *(R1.3)*

### DX (R2)

- [x] Natywna odpowiedź z `frequencyPenalty` na Anthropic zawiera `warnings`. *(R2.3 E2E)*
- [ ] Fasady **nie** dodają `warnings` do JSON vendora.
- [x] Build i testy unit warnings (`generation-warnings`, builder, `ChatService`, mock `providerType`) — zielone. *(R2.4)*

### Dokumentacja (R3)

- [x] Nowy użytkownik Cursor rozumie z README różnicę fasada vs provider. *(R3.1)*
- [x] System prompt opisany w obu integracjach IDE na początku. *(R3.2)*
- [x] Brak sprzecznych treści w `opis_koncepcyjny.md`. *(R3.4)*
- [x] `mcp.md` nie sugeruje działającego `mcp.configPath` w YAML. *(R3.5)*

### OSS (R4)

- [ ] ~~`CHANGELOG.md`~~ — anulowane (R4.2).
- [ ] ~~`CONTRIBUTING.md`~~ — anulowane (R4.3.1).
- [ ] `SECURITY.md` istnieje.
- [ ] `examples/` z działającymi skryptami curl.
- [ ] Strategia wersji OpenAPI opisana.
- [x] Model dystrybucji (MIT, nie npm) opisany w README. *(R4.4)*

---

## 📝 Notatki po zakończeniu R0

| Metryka | Wartość (R0.1, 2026-06-19) |
|---------|----------------------------|
| Unit test suites | 58 |
| Unit tests | 1009 |
| E2E suites | 7 |
| E2E tests | 60 |
| OPENAPI_VERSION (`info.version`) | 0.12.0 |
| OPENAPI_SPEC_VERSION (`openapi`) | 3.1.0 |
| `capabilities.thinking` enforcement | ✅ R1.1 |
| `ChatIngressValidator` | ✅ R1.2 |
| Regresje thinking + ingress (R1.3) | ✅ R1.3 |
| `warnings` w response | ❌ brak |

---

## Powiązane commity (sugerowana seria)

1. `docs(plan): baseline rozjazdy likwidacja R0`
2. `feat(chat): enforce capabilities.thinking with THINKING_NOT_SUPPORTED (D1)`
3. `feat(chat): ChatIngressValidator with native vs facade profiles (D2, D18)`
4. `test: cover thinking capability and ingress profiles`
5. `feat(chat): optional warnings for ignored generation params (D5, D4)`
6. `fix(integrations): map THINKING_NOT_SUPPORTED in vendor error filters`
7. `test(e2e): generation warnings on native chat`
8. `test(chat): close warnings gaps — types, mocks, unit tests (R2.4)`
9. `docs: clarify OpenAI facade vs OpenAI provider (D3)`
10. `docs: prominent system prompt policy for IDE integrators (D17)`
11. `docs: document native vs facade validation limits (D16)`
12. `docs: consolidate thinking dictionary and retire opis_koncepcyjny body (D6, D7)`
13. `docs: mark MCP config as planned not implemented (D8)`
14. `docs: clarify MVP vs phase numbering (D9)`
15. `docs: anty-patterny exception for IDE facades in section 5 (D15)`
16. `docs: single source of truth for test counts in testy.md (D14)`
17. `docs: document app vs OpenAPI versioning strategy (D10)`
18. ~~`docs: add CHANGELOG.md (D12)`~~ — R4.2 anulowany
19. `docs: add SECURITY.md (D12)` *(~~`CONTRIBUTING.md`~~ — R4.3.1 anulowany)*
20. ~~`docs: clarify distribution model (MIT, not npm) (D11)`~~ — R4.4 wykonany
21. `docs: add examples for three API surfaces (D13)`
22. `docs: add IDE compatibility matrix (D20)`
23. `docs: add architecture decision records (D19)`
