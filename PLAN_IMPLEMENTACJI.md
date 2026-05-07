# Plan Implementacji — AI Provider Gateway

**Status projektu:** Implementacja MVP — start od Fazy 1 (fundament: Config, Registry; pierwszy provider: Anthropic). Setup i Milestone 0 zamknięte.  
**Providery MVP:** Anthropic API + Google Gemini API  
**Cel MVP:** Jeden endpoint `POST /api/v1/chat`, dwa providery, spójny format odpowiedzi, logi w konsoli

---

## 🎯 Filozofia planu

Plan implementacji opiera się na **małych, działających inkrementach**:
1. **Iteracje, nie big bang** — commituj działający kod co 2-3h
2. **Vertical slices** — implementuj feature end-to-end (od kontrolera do adaptera)
3. **Defer complexity** — najpierw działający kod, potem abstrakcje
4. **Test early** — testy jednostkowe po każdym module

---

## 📊 Przegląd faz

| Faza | Cel | Czas | Status |
|------|-----|------|--------|
| **0. Setup** | Środowisko + struktura + fix błędów | 2-3h | ✅ **WYKONANA** |
| **1. Fundament + Anthropic** | Config, Registry, pierwszy provider | 8-10h | ⏳ Pending |
| **2. Google Gemini** | Drugi provider (prosty dzięki Registry) | 3-4h | ⏳ Pending |
| **3. Streaming (SSE)** | Streaming dla obu providerów | 10-12h | ⏳ Pending |
| **4. Config Files** | Konfiguracja przez pliki (YAML/JSON) | 3-4h | ⏳ Pending |
| **5. Error Handling** | Spójne błędy + envelope + requestId | 4-6h | ⏳ Pending |
| **6. Observability** | Structured logs + healthcheck | 3-4h | ⏳ Pending |
| **7. Polish & Deploy** | README, Dockerfile, CI/CD | 4-6h | ⏳ Pending |

**Całość (MVP funkcjonalny):** ~37-52h (oszczędność: 3-5h dzięki reorganizacji)

---

## ✅ FAZA 0: Setup środowiska (2-3h) — **WYKONANA**

**Status fazy:** wszystkie kroki 0.1–0.5 oraz Milestone 0 zamknięte.

**Cel:** Przygotować projekt do implementacji — zależności, struktura, podstawowa konfiguracja.

**Dlaczego teraz:** Solidny fundament zapobiega chaosowi późniejszym.

### ✅ Krok 0.1: Instalacja zależności (30min) — WYKONANE

**Akcja:**
```bash
# Już masz zainstalowane:
# - @anthropic-ai/sdk
# - @google/genai
# - @nestjs/common, @nestjs/config, class-validator

# Sprawdź wersje
npm list @anthropic-ai/sdk @google/genai
```

**Weryfikacja:**
- [x] `npm install` działa bez błędów
- [x] Wersje SDK zgodne z `package.json`

**Dokumentacja:** `package.json`, `docs/architektura.md`

---

### ✅ Krok 0.2: Plik `.env` (15min) — WYKONANE

**Akcja:**
Stwórz `.env` z kluczami API:

```env
# AI Providers
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIzaSy...

# Server
PORT=3000
NODE_ENV=development
```

**Weryfikacja:**
- [x] `.env` istnieje i zawiera klucze (lokalnie u użytkownika)
- [x] `.env` jest w `.gitignore` (linia 39)
- [x] `.env.example` istnieje (bez wartości sekretów)

**Commit:** `chore: add .env.example with provider API key placeholders`

**Dokumentacja:** `docs/konfiguracja.md`, `docs/anty-patterny.md` (sekrety)

**Uwaga:** `.env.example` zawiera dodatkowo `CORS_ORIGINS` (sensowny dodatek, zgodny z best practices).

---

### ✅ Krok 0.3: Struktura katalogów (30min) — WYKONANE

**Akcja:**
Stwórz podstawową strukturę modułów:

```
src/
├── main.ts (już jest)
├── app.module.ts (już jest)
├── chat/
│   ├── chat.module.ts
│   ├── chat.controller.ts
│   ├── chat.service.ts
│   └── dto/
│       └── chat-request.dto.ts
└── providers/
    ├── providers.module.ts
    ├── provider.interface.ts
    ├── anthropic.adapter.ts
    └── google.adapter.ts
```

**Weryfikacja:**
- [x] Katalogi utworzone
- [x] Pliki z podstawowym boilerplate (puste klasy)

**Commit:** `chore: create module structure for chat and providers`

**Dokumentacja:** `docs/architektura-katalogi-pliki.md`, `docs/architektura.md`

**Uwaga:** Faktyczna struktura używa podkatalogów dla providerów (`providers/anthropic/`, `providers/google/`) — to **lepsza organizacja** zgodna z `docs/architektura-katalogi-pliki.md`. Katalog `dto/` i `provider.interface.ts` będą utworzone w krokach 1.1 i 1.3.

---

### ✅ Krok 0.4: Fix błędów kompilacji (15min) — WYKONANE

**Akcja:**
Napraw błędy w istniejącym boilerplate przed konfiguracją `main.ts`:

**1. Usuń nieistniejące klasy z `src/app.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
// import { AppController } from './app.controller'; // ❌ USUŃ (plik nie istnieje)
// import { AppService } from './app.service'; // ❌ USUŃ (plik nie istnieje)
import { ChatModule } from './chat/chat.module';
import { ProvidersModule } from './providers/providers.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ChatModule, ProvidersModule, HealthModule],
  // controllers: [AppController], // ❌ USUŃ
  // providers: [AppService], // ❌ USUŃ
})
export class AppModule {}
```

**2. Napraw import w `src/chat/chat.module.ts`:**

```typescript
// Zmień:
// import { ChatStreamController } from './chat-stream/chat-stream.controller'; // ❌

// Na:
import { ChatStreamController } from './chat-stream.controller'; // ✅
```

**3. (Opcjonalnie) Usuń OpenaiModule z `src/providers/providers.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { AnthropicModule } from './anthropic/anthropic.module';
import { GoogleModule } from './google/google.module';
// import { OpenaiModule } from './openai/openai.module'; // ❌ USUŃ (OpenAI to post-MVP)

@Module({
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
  imports: [AnthropicModule, GoogleModule] // Usuń OpenaiModule
})
export class ProvidersModule {}
```

**Weryfikacja:**
- [x] Projekt kompiluje się bez błędów: `npm run build`
- [x] TypeScript nie pokazuje błędów w IDE

**Commit:** `fix: remove non-existent imports and fix ChatStreamController path`

**Dokumentacja:** N/A (fix techniczny)

---

### ✅ Krok 0.5: Global prefix i ValidationPipe (30min) — WYKONANE

**Akcja:**
Skonfiguruj `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global prefix dla API
  app.setGlobalPrefix('api/v1');
  
  // Walidacja DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[Bootstrap] Gateway listening on http://localhost:${port}`);
}
bootstrap();
```

**Weryfikacja:**
- [x] `npm run start:dev` działa
- [x] Serwer startuje na `http://localhost:3000`
- [x] W konsoli widać `[Bootstrap] Gateway listening...`

**Commit:** `feat: configure global prefix and validation pipe`

**Dokumentacja:** `docs/architektura_api.md` (walidacja), `openapi.json` (prefix `/api/v1`)

---

### ✅ 🎯 MILESTONE 0: Środowisko gotowe — OSIĄGNIĘTY

**Kryteria akceptacji:**
- ✅ Serwer NestJS startuje bez błędów
- ✅ `.env` z kluczami API (nie commitowany)
- ✅ Struktura katalogów zgodna z dokumentacją
- ✅ Błędy kompilacji naprawione
- ✅ Global prefix `/api/v1`
- ✅ ValidationPipe aktywny

**Czas:** 2-3h  
**Następny krok:** Fundament (Config, Registry) + Anthropic

---

## FAZA 1: Fundament + Anthropic MVP (8-10h)

**ZMIANA:** Ta faza została zreorganizowana względem oryginalnego planu. Config i Registry są teraz częścią fundamentu, nie refactoringiem post-MVP.

**Dlaczego zmiana:**
- ConfigModule i ProviderRegistry są **fundamentem architektury**, nie "usprawnieniem"
- Implementacja ich od razu **eliminuje tech debt** i unika 2x refactoringu (Faza 2 + stara Faza 4)
- Oszczędność netto: **3-5h** + czystszy kod od początku

**Cel:** Działający endpoint z Anthropic + fundament (Config + Registry) gotowy do łatwego dodania kolejnych providerów.

---

### ✅ Krok 1.1: Provider interface (30min) — WYKONANE

**Akcja:**
Stwórz kontrakt dla providerów w `src/providers/interfaces/ai-provider.interface.ts`:

```typescript
export type SystemChatMessage = { role: 'system'; content: string };
export type UserChatMessage = { role: 'user'; content: string };
export type AssistantChatMessage = { role: 'assistant'; content: string };

export type ChatMessage =
  | SystemChatMessage
  | UserChatMessage
  | AssistantChatMessage;

export type ProviderChatTurn = UserChatMessage | AssistantChatMessage;

export interface ProviderChatInput {
  system?: string;
  messages: ProviderChatTurn[];
}

export interface ProviderChatResponse {
  text: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AIProvider {
  complete(input: ProviderChatInput, modelId: string): Promise<ProviderChatResponse>;
}

export function normalizeMessagesForProvider(
  messages: ChatMessage[],
  opts?: { systemJoiner?: string },
): ProviderChatInput {
  const systemJoiner = opts?.systemJoiner ?? '\n\n';

  const systemParts: string[] = [];
  const turns: ProviderChatTurn[] = [];

  for (const m of messages) {
    if (m.role === 'system') {
      if (m.content?.trim()) systemParts.push(m.content);
      continue;
    }

    turns.push(m);
  }

  const system = systemParts.length ? systemParts.join(systemJoiner) : undefined;
  return { system, messages: turns };
}
```

**Uzasadnienie:** Interface-first design — definiujemy kontrakt przed implementacją. `modelId` jako parametr umożliwia dynamiczne przekazywanie modelu z konfiguracji.

**Weryfikacja:**
- [x] Plik kompiluje się bez błędów
- [x] Interface eksportowany

**Commit:** `feat(providers): define AIProvider interface and contracts`

**Dokumentacja:** `docs/spec/SPEC-PROVIDERS.md` (port providera)

---

### ✅ Krok 1.2: ConfigModule (uproszczony — tylko env) (1h) — WYKONANE

**Akcja:**
Stwórz `src/config/configuration.ts`:

```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  providers: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY,
    },
  },
});
```

Stwórz `src/config/env.validation.ts`:

```typescript
import { plainToInstance } from 'class-transformer';
import { IsString, IsNotEmpty, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  ANTHROPIC_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_API_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }
  return validatedConfig;
}
```

Dodaj do `src/app.module.ts`:

```typescript
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validate,
      isGlobal: true, // ← Config dostępny wszędzie
    }),
    ChatModule,
    ProvidersModule,
    HealthModule,
  ],
})
export class AppModule {}
```

**Uzasadnienie:**
- **Fail-fast:** Serwis nie startuje bez wymaganych kluczy (NFR-1 w SPEC-KONFIGURACJA)
- **Sekrety tylko w env:** Zgodne z `docs/konfiguracja.md`
- **Global config:** Każdy moduł może wstrzyknąć `ConfigService`

**Weryfikacja:**
- [x] Serwis nie startuje bez `ANTHROPIC_API_KEY` w `.env`
- [x] ConfigService jest dostępny w innych modułach

**Commit:** `feat(config): add ConfigModule with env validation`

**Dokumentacja:** `docs/konfiguracja.md`, `docs/spec/SPEC-KONFIGURACJA.md` (F-1, F-3, F-4)

---

### ✅ Krok 1.3: ProviderRegistry z ConfigService (45min) — WYKONANE

**Akcja:**
Rozbuduj `src/providers/provider-registry.service.ts`:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './provider.interface';

@Injectable()
export class ProviderRegistryService {
  private providers = new Map<string, { provider: AIProvider; name: string }>();

  constructor(private configService: ConfigService) {}

  register(providerName: string, provider: AIProvider) {
    this.providers.set(providerName, { provider, name: providerName });
    console.log(`[ProviderRegistry] Registered provider: ${providerName}`);
  }

  /**
   * Rozwiązuje alias modelu do providera.
   * Faza 1-3: prosty prefix matching (fallback).
   * Faza 4: zostanie rozbudowane o wczytywanie z gateway.config.yaml
   */
  resolve(modelAlias: string): { 
    provider: AIProvider; 
    providerName: string; 
    modelId: string;
  } {
    // Prosty routing (tymczasowy — Faza 4: config file YAML)
    let providerKey: string;
    let modelId: string;
    
    if (modelAlias.startsWith('claude')) {
      providerKey = 'anthropic';
      modelId = 'claude-3-5-sonnet-20241022'; // Domyślny model
    } else if (modelAlias.startsWith('gemini')) {
      providerKey = 'google';
      modelId = 'gemini-1.5-pro'; // Domyślny model
    } else {
      throw new BadRequestException(`Unknown model alias: ${modelAlias}`);
    }

    const entry = this.providers.get(providerKey);
    if (!entry) {
      throw new BadRequestException(`Provider not configured: ${providerKey}`);
    }

    console.log(`[ProviderRegistry] Resolved alias '${modelAlias}' → provider '${entry.name}', model '${modelId}'`);
    return { 
      provider: entry.provider, 
      providerName: entry.name,
      modelId,
    };
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
```

**Uzasadnienie:**
- **ConfigService od początku:** Registry ma dostęp do ConfigService (będzie używany w Fazie 4)
- **Zwraca modelId:** Interface zwraca `modelId` który może być przekazany do adaptera
- **Separacja odpowiedzialności:** ChatService nie zna szczegółów routingu
- **Łatwe dodawanie providerów:** Faza 2 to tylko `registry.register('google', googleAdapter)` — **zero zmian w ChatService**
- **Przygotowanie na Fazę 4:** Metoda `resolve()` zostanie tylko rozbudowana o wczytywanie z YAML, interfejs pozostanie ten sam

**Weryfikacja:**
- [x] ProviderRegistry kompiluje się
- [x] ConfigService jest wstrzyknięty (ale jeszcze nie używany)
- [x] Metody `register()` i `resolve()` działają
- [x] `resolve()` zwraca `modelId`

**Commit:** `feat(providers): implement ProviderRegistry with ConfigService and modelId`

**Dokumentacja:** `docs/architektura.md` (Registry pattern)

---

### ✅ Krok 1.4: Anthropic Adapter (2-3h) — WYKONANE

**Akcja:**
Stwórz `src/providers/anthropic/anthropic.adapter.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ProviderChatInput, ProviderChatResponse } from '../interfaces/ai-provider.interface';

@Injectable()
export class AnthropicAdapter implements AIProvider {
  private client: Anthropic;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('providers.anthropic.apiKey');
    
    if (!apiKey) {
      throw new Error('[AnthropicAdapter] API key not configured');
    }

    this.client = new Anthropic({ apiKey });
    console.log('[AnthropicAdapter] Initialized');
  }

  async complete(input: ProviderChatInput, modelId: string): Promise<ProviderChatResponse> {
    console.log(`[AnthropicAdapter] Calling model: ${modelId} with ${input.messages.length} messages`);

    const response = await this.client.messages.create({
      model: modelId,
      max_tokens: 1024,
      system: input.system,
      messages: input.messages, // tylko user|assistant
    });

    console.log(`[AnthropicAdapter] Response received, tokens: ${response.usage.input_tokens + response.usage.output_tokens}`);

    return {
      text: response.content[0].type === 'text' ? response.content[0].text : '',
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
```

Rozbuduj `src/providers/anthropic/anthropic.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AnthropicAdapter } from './anthropic.adapter';

@Module({
  providers: [AnthropicAdapter],
  exports: [AnthropicAdapter], // ← Eksport
})
export class AnthropicModule {}
```

Zmodyfikuj `src/providers/providers.module.ts`:

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { AnthropicModule } from './anthropic/anthropic.module';
import { AnthropicAdapter } from './anthropic/anthropic.adapter';
import { GoogleModule } from './google/google.module';

@Module({
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
  imports: [AnthropicModule, GoogleModule],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private registry: ProviderRegistryService,
    private anthropicAdapter: AnthropicAdapter,
  ) {}

  onModuleInit() {
    // Rejestracja providerów przy starcie
    this.registry.register('anthropic', this.anthropicAdapter);
    console.log('[ProvidersModule] Providers registered');
  }
}
```

**Uzasadnienie:** 
- **ConfigService zamiast process.env:** Zgodne z architekturą, fail-fast
- **Rejestracja w onModuleInit:** Automatic wiring, zero konfiguracji w innych miejscach
- **`modelId` jako parametr:** Model przekazywany dynamicznie z Registry (z prefix matching w Fazie 1-3, z YAML w Fazie 4)

**Weryfikacja:**
- [ ] Adapter kompiluje się
- [ ] SDK Anthropic importuje poprawnie
- [ ] Metoda `complete()` przyjmuje `modelId` i zwraca `ChatResponse`
- [ ] Adapter jest zarejestrowany w Registry przy starcie

**Commit:** `feat(providers): implement AnthropicAdapter with ConfigService and dynamic modelId`

**Dokumentacja:** `docs/spec/SPEC-PROVIDERS.md`, `docs/data_flow.md`

---

### ✅ Krok 1.5: Chat DTO (45min) — WYKONANE

**Akcja:**
Stwórz `src/chat/dto/chat-request.dto.ts`:

```typescript
import { IsString, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class ChatMessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatRequestDto {
  @IsString()
  modelAlias: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}
```

**Uzasadnienie:** Walidacja na brzegu systemu (ValidationPipe).

**Weryfikacja:**
- [ ] DTO kompiluje się
- [ ] Dekoratory `class-validator` działają

**Commit:** `feat(chat): add ChatRequestDto with validation`

**Dokumentacja:** `openapi.json` (schema `ChatRequest`), `docs/architektura_api.md` (walidacja)

---

### ✅ Krok 1.6: ChatService z UUID (1h) — WYKONANE

**Akcja:**
Implementuj `src/chat/chat.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { normalizeMessagesForProvider } from '../providers/interfaces/ai-provider.interface';

@Injectable()
export class ChatService {
  constructor(private readonly registry: ProviderRegistryService) {}

  async executeChat(request: ChatRequestDto) {
    console.log(`[ChatService] Request for modelAlias: ${request.modelAlias}`);

    // Registry automatycznie wybiera providera i zwraca modelId
    const { provider, providerName, modelId } = this.registry.resolve(request.modelAlias);

    // Normalizacja: system osobno, messages tylko user|assistant
    const providerInput = normalizeMessagesForProvider(request.messages);

    // Przekazujemy modelId do adaptera
    const response = await provider.complete(providerInput, modelId);

    return {
      id: `gw_${uuidv4()}`,
      provider: providerName,
      model: response.model,
      output: {
        type: 'text',
        text: response.text,
      },
      usage: response.usage,
      requestId: `req_${uuidv4()}`,
    };
  }
}
```

**Uzasadnienie:**
- **Delegacja do Registry:** ChatService nie zna szczegółów routingu
- **Gotowe na Fazę 2:** Dodanie Google = zero zmian w tym kodzie
- **UUID od początku:** Biblioteka `uuid` już zainstalowana, używamy od razu (unikamy refactoringu w Fazie 5)
- **Przekazywanie modelId:** Model z Registry przekazywany do adaptera
- `requestId` będzie rozbudowany interceptorem w Fazie 5 (nagłówek `x-request-id`)

**Weryfikacja:**
- [ ] Service kompiluje się
- [ ] DI do ProviderRegistry działa
- [ ] Logika routingu jest w Registry, nie w Service
- [ ] `modelId` z Registry jest przekazywany do `provider.complete()`
- [ ] UUID generuje unikalne ID

**Commit:** `feat(chat): implement ChatService with ProviderRegistry and UUID`

**Dokumentacja:** `docs/architektura.md` (Service orchestration), `docs/data_flow.md`

---

### ✅ Krok 1.7: ChatController (1h) — WYKONANE

**Akcja:**
Implementuj `src/chat/chat.controller.ts`:

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() request: ChatRequestDto) {
    console.log('[ChatController] POST /api/v1/chat');
    return this.chatService.executeChat(request);
  }
}
```

**Uzasadnienie:** Cienki kontroler — deleguje do serwisu.

**Weryfikacja:**
- [ ] Kontroler kompiluje się
- [ ] Endpoint dostępny pod `POST /api/v1/chat`

**Commit:** `feat(chat): add ChatController with POST endpoint`

**Dokumentacja:** `openapi.json` (operacja `postChat`), `docs/lista_endpointów.md`

---

### ✅ Krok 1.8: Weryfikacja integracji modułów (15min) — WYKONANE

**Akcja:**
Sprawdź, czy wszystkie moduły są poprawnie połączone (większość już jest w boilerplate).

**`src/chat/chat.module.ts`** powinien importować `ProvidersModule`:

```typescript
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatStreamController } from './chat-stream.controller';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [ProvidersModule], // ✅ Już jest
  controllers: [ChatController, ChatStreamController],
  providers: [ChatService],
})
export class ChatModule {}
```

**`src/app.module.ts`** powinien importować wszystkie główne moduły:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { ChatModule } from './chat/chat.module';
import { ProvidersModule } from './providers/providers.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validate,
      isGlobal: true,
    }),
    ChatModule,
    ProvidersModule,
    HealthModule,
  ],
})
export class AppModule {}
```

**Weryfikacja:**
- [ ] `npm run start:dev` działa
- [ ] Serwer startuje bez błędów DI
- [ ] W logach widać `[ProviderRegistry] Registered provider: anthropic`
- [ ] W logach widać `[ProvidersModule] Providers registered`

**Commit:** `feat: wire all modules with ConfigModule`

**Dokumentacja:** `docs/architektura.md` (moduły)

---

### ✅ Krok 1.9: Test manualny (Postman/curl) (30min) — WYKONANE

**Akcja:**
Test z Postmana:

```http
POST http://localhost:3000/api/v1/chat
Content-Type: application/json

{
  "modelAlias": "claude-sonnet",
  "messages": [
    {
      "role": "user",
      "content": "Powiedz 'hello' po polsku"
    }
  ]
}
```

**Oczekiwane logi:**
```
[ChatController] POST /api/v1/chat
[ChatService] Request for modelAlias: claude-sonnet
[ProviderRegistry] Resolved alias 'claude-sonnet' → provider 'anthropic', model 'claude-3-5-sonnet-20241022'
[AnthropicAdapter] Calling model: claude-3-5-sonnet-20241022 with 1 messages
[AnthropicAdapter] Response received, tokens: 28
```

**Oczekiwana odpowiedź (200):**
```json
{
  "id": "gw_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "output": {
    "type": "text",
    "text": "Cześć"
  },
  "usage": {
    "inputTokens": 12,
    "outputTokens": 2
  },
  "requestId": "req_f9e8d7c6-b5a4-3210-9876-543210fedcba"
}
```

**Weryfikacja:**
- [ ] Endpoint zwraca 200
- [ ] Format odpowiedzi zgodny z `openapi.json`
- [ ] `id` i `requestId` są UUID (nie timestamp)
- [ ] Logi widoczne w konsoli
- [ ] Odpowiedź od Anthropic API faktycznie przychodzi

**Commit:** `test: verify Anthropic integration with manual test`

**Dokumentacja:** `openapi.json` (przykłady), `docs/dokumentacja_api.md`

---

### ✅ Krok 1.10: Health module — podstawowa implementacja (30min) — WYKONANE

**Akcja:**
Stwórz `src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { 
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
```

Stwórz `src/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

**Uzasadnienie:**
- **Liveness endpoint od początku:** Przydatny już w trakcie development
- **Prosty implementation:** Szczegółowy healthcheck (z provider status) będzie w Fazie 6
- **Spójność z app.module.ts:** HealthModule już jest importowany w Fazie 0 — teraz dostaje implementację

**Weryfikacja:**
- [ ] `GET /api/v1/health` zwraca `{ "status": "ok", "timestamp": "..." }`
- [ ] Endpoint dostępny od razu po starcie aplikacji
- [ ] Brak błędów kompilacji związanych z pustym modułem

**Commit:** `feat(health): implement basic liveness healthcheck endpoint`

**Dokumentacja:** `docs/spec/SPEC-HEALTH.md`

---

### 🎯 MILESTONE 1: Fundament + Anthropic działają

**Kryteria akceptacji:**
- ✅ ConfigModule z walidacją env działa
- ✅ ProviderRegistry zaimplementowany z ConfigService i zwraca `modelId`
- ✅ `POST /api/v1/chat` z `modelAlias=claude-*` działa
- ✅ Gateway wywołuje Anthropic API przez Registry z dynamicznym `modelId`
- ✅ Odpowiedź w spójnym formacie gateway (z UUID)
- ✅ Logi pokazują flow: Registry → Adapter → API
- ✅ Walidacja DTO działa (błąd 400 dla niepoprawnego request)
- ✅ `/api/v1/health` zwraca status ok

**Czas:** 8-10h  
**Następny krok:** Dodanie drugiego providera (prosty dzięki Registry)

---

## FAZA 2: Google Gemini — drugi provider (3-4h)

**ZMIANA:** Ta faza jest teraz **znacznie krótsza** dzięki ProviderRegistry z Fazy 1.

**Dlaczego zmiana:**
- Registry już istnieje — nie trzeba refaktorować ChatService
- Dodanie Google = tylko adapter + rejestracja
- **Oszczędność:** 3-4h (było 6-8h)

**Cel:** Dodać Google Gemini jako drugi provider.

### Krok 2.1: Google Adapter (2h)

**Akcja:**
Stwórz `src/providers/google/google.adapter.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/genai';
import { AIProvider, ProviderChatInput, ProviderChatResponse } from '../interfaces/ai-provider.interface';

@Injectable()
export class GoogleAdapter implements AIProvider {
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('providers.google.apiKey');
    
    if (!apiKey) {
      throw new Error('[GoogleAdapter] API key not configured');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    console.log('[GoogleAdapter] Initialized');
  }

  async complete(input: ProviderChatInput, modelId: string): Promise<ProviderChatResponse> {
    console.log(`[GoogleAdapter] Calling model: ${modelId} with ${input.messages.length} messages`);

    // Tworzymy model dynamicznie z przekazanym modelId
    const model = this.genAI.getGenerativeModel({ model: modelId });

    // Google Gemini przyjmuje historię jako array
    // `system` z portu mapujemy wg semantyki SDK (zależnie od biblioteki/wersji).
    // Minimalny, przenośny wariant: dopiąć `system` jako pierwszą wiadomość użytkownika.
    const normalizedTurns = input.system?.trim()
      ? [{ role: 'user' as const, content: input.system }, ...input.messages]
      : input.messages;

    const formattedMessages = normalizedTurns.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: formattedMessages.slice(0, -1),
    });

    const lastMessage = normalizedTurns[normalizedTurns.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    console.log(`[GoogleAdapter] Response received`);

    return {
      text: response.text(),
      model: modelId,
      usage: response.usageMetadata ? {
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
      } : undefined,
    };
  }
}
```

Rozbuduj `src/providers/google/google.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { GoogleAdapter } from './google.adapter';

@Module({
  providers: [GoogleAdapter],
  exports: [GoogleAdapter],
})
export class GoogleModule {}
```

**Uwaga:** Google Gemini SDK ma inny API niż OpenAI/Anthropic — wymaga konwersji formatu messages.

**Weryfikacja:**
- [ ] Adapter kompiluje się
- [ ] SDK `@google/genai` importuje poprawnie
- [ ] `modelId` jest przekazywany i używany do tworzenia modelu

**Commit:** `feat(providers): implement GoogleAdapter with ConfigService and dynamic modelId`

**Dokumentacja:** `docs/spec/SPEC-PROVIDERS.md`

---

### Krok 2.2: Rejestracja w ProviderRegistry (15min)

**Akcja:**
Rozszerz `src/providers/providers.module.ts`:

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { AnthropicModule } from './anthropic/anthropic.module';
import { AnthropicAdapter } from './anthropic/anthropic.adapter';
import { GoogleModule } from './google/google.module';
import { GoogleAdapter } from './google/google.adapter';

@Module({
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
  imports: [AnthropicModule, GoogleModule],
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    private registry: ProviderRegistryService,
    private anthropicAdapter: AnthropicAdapter,
    private googleAdapter: GoogleAdapter, // ← DODANE
  ) {}

  onModuleInit() {
    this.registry.register('anthropic', this.anthropicAdapter);
    this.registry.register('google', this.googleAdapter); // ← DODANE
    console.log('[ProvidersModule] Providers registered:', this.registry.list());
  }
}
```

**Uzasadnienie:** 
- **Zero zmian w ChatService** — Registry automatycznie obsługuje nowego providera
- **Prosty pattern:** Każdy nowy provider = 2 linie kodu (import + register)

**Weryfikacja:**
- [ ] Google zarejestrowany w Registry przy starcie
- [ ] Log pokazuje: `Providers registered: ['anthropic', 'google']`

**Commit:** `feat(providers): register GoogleAdapter in ProviderRegistry`

---

### Krok 2.3: Test manualny (Google) (30min)

**Akcja:**
Test z Postmana:

```http
POST http://localhost:3000/api/v1/chat
Content-Type: application/json

{
  "modelAlias": "gemini-pro",
  "messages": [
    {
      "role": "user",
      "content": "Powiedz 'hello' po polsku"
    }
  ]
}
```

**Oczekiwane logi:**
```
[ChatController] POST /api/v1/chat
[ChatService] Request for modelAlias: gemini-pro
[ChatService] Resolved to google
[GoogleAdapter] Calling Gemini with 1 messages
[GoogleAdapter] Response received
```

**Weryfikacja:**
- [ ] Endpoint zwraca 200
- [ ] Provider w odpowiedzi to `"google"`
- [ ] Model to `"gemini-1.5-pro"`
- [ ] Odpowiedź faktycznie pochodzi z Google API

**Commit:** `test: verify Google Gemini integration`

---

### Krok 2.4: Test przełączania providerów (30min)

**Akcja:**
Wyślij kilka requestów na przemian:
1. `modelAlias: "claude-sonnet"` → Anthropic
2. `modelAlias: "gemini-pro"` → Google
3. `modelAlias: "claude-opus"` → Anthropic
4. `modelAlias: "gemini-flash"` → Google

**Weryfikacja:**
- [ ] Gateway poprawnie wybiera providera na podstawie aliasu
- [ ] Logi pokazują przełączanie między providerami
- [ ] Obie odpowiedzi mają spójny format

**Commit:** `test: verify provider routing works for both adapters`

**Dokumentacja:** `docs/dokumentacja_api.md` (aliasy)

---

### 🎯 MILESTONE 2: Dwa providery działają

**Kryteria akceptacji:**
- ✅ Anthropic i Google Gemini działają
- ✅ Gateway wybiera providera przez Registry na podstawie `modelAlias`
- ✅ Format odpowiedzi spójny niezależnie od providera
- ✅ Logi pokazują flow dla obu providerów
- ✅ **Zero zmian w ChatService** podczas dodawania Google (sukces abstrakcji)

**Czas:** 3-4h (łącznie: ~13h, oszczędność 3-4h względem oryginalnego planu)  
**Następny krok:** Streaming (SSE) lub Config Files (zależnie od priorytetu)

---

## FAZA 3: Streaming (SSE) — `POST /api/v1/chat/stream` (10-12h)

**Cel:** Dodać endpoint streamingowy, który zwraca odpowiedź jako Server-Sent Events.

**Dlaczego teraz (opcjonalnie później):** Streaming jest w MVP według docs, ale możesz przesunąć do post-MVP jeśli wolisz szybciej osiągnąć działający gateway bez streamingu.

**Jeśli chcesz odłożyć streaming:** Przeskocz do Fazy 4 (Config & Registry).

### Krok 3.1: Rozszerzenie interface o streaming (30min)

**Akcja:**
Rozszerz `src/providers/interfaces/ai-provider.interface.ts`:

```typescript
export interface AIProvider {
  complete(input: ProviderChatInput, modelId: string): Promise<ProviderChatResponse>;
  stream?(input: ProviderChatInput, modelId: string): AsyncIterable<string>;
}
```

**Uwaga:** `stream` jest opcjonalne (`?`) — nie wszystkie providery muszą wspierać streaming. Wejście jest takie samo jak dla `complete`: `system?: string` + `messages[]` tylko `user|assistant`.

**Commit:** `feat(providers): add optional stream method to AIProvider interface`

**Dokumentacja:** `docs/spec/SPEC-CHAT-STREAMING.md`

---

### Krok 3.2: Anthropic streaming (2-3h)

**Akcja:**
Dodaj metodę `stream()` do `AnthropicAdapter`:

```typescript
async *stream(input: ProviderChatInput, modelId: string): AsyncIterable<string> {
  const stream = await this.client.messages.create({
    model: modelId,
    max_tokens: 1024,
    system: input.system,
    messages: input.messages,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
```

**Commit:** `feat(providers): implement streaming for AnthropicAdapter`

---

### Krok 3.3: Google streaming (2-3h)

**Akcja:**
Dodaj metodę `stream()` do `GoogleAdapter`:

```typescript
async *stream(input: ProviderChatInput, modelId: string): AsyncIterable<string> {
  console.log(`[GoogleAdapter] Streaming with model: ${modelId}`);

  const model = this.genAI.getGenerativeModel({ model: modelId });

  const normalizedTurns = input.system?.trim()
    ? [{ role: 'user' as const, content: input.system }, ...input.messages]
    : input.messages;

  const formattedMessages = normalizedTurns.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history: formattedMessages.slice(0, -1),
  });

  const lastMessage = normalizedTurns[normalizedTurns.length - 1];
  const result = await chat.sendMessageStream(lastMessage.content);

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}
```

**Commit:** `feat(providers): implement streaming for GoogleAdapter`

---

### Krok 3.4: SSE Controller (3-4h)

**Akcja:**
Dodaj metodę streaming do `ChatController`:

```typescript
import { Controller, Post, Body, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  // ... istniejący POST

  @Post('stream')
  @Sse()
  async chatStream(@Body() request: ChatRequestDto): Promise<Observable<MessageEvent>> {
    return this.chatService.executeStreamChat(request);
  }
}
```

Dodaj metodę do `ChatService`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

async executeStreamChat(request: ChatRequestDto): Promise<Observable<MessageEvent>> {
  // Resolve provider, providerName i modelId z Registry
  const { provider, providerName, modelId } = this.registry.resolve(request.modelAlias);
  
  if (!provider.stream) {
    throw new BadRequestException('Streaming not supported for this model');
  }

  return new Observable<MessageEvent>((subscriber) => {
    (async () => {
      const requestId = `req_${uuidv4()}`;

      // Emit meta event
      subscriber.next({
        data: JSON.stringify({
          type: 'meta',
          provider: providerName,
          model: modelId,
          requestId,
        }),
      });

      // Emit delta events
      for await (const chunk of provider.stream(request.messages, modelId)) {
        subscriber.next({
          data: JSON.stringify({
            type: 'delta',
            text: chunk,
          }),
        });
      }

      // Emit done event
      subscriber.next({
        data: JSON.stringify({
          type: 'done',
          usage: { /* TODO: zbieraj usage podczas streaming */ },
        }),
      });

      subscriber.complete();
    })();
  });
}
```

**Commit:** `feat(chat): implement SSE streaming endpoint with Registry integration`

**Dokumentacja:** `docs/spec/SPEC-CHAT-STREAMING.md`, `openapi.json` (operacja `postChatStream`)

---

### Krok 3.5: Test streaming (Postman/curl) (1h)

**Akcja:**
```bash
curl -N -X POST http://localhost:3000/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"modelAlias":"claude-sonnet","messages":[{"role":"user","content":"Count to 10"}]}'
```

**Oczekiwany output:**
```
data: {"type":"meta","provider":"anthropic","model":"claude-3-5-sonnet-20241022","requestId":"req_..."}

data: {"type":"delta","text":"1"}

data: {"type":"delta","text":", 2"}

data: {"type":"delta","text":", 3"}

...

data: {"type":"done","usage":{"inputTokens":5,"outputTokens":20}}
```

**Weryfikacja:**
- [ ] SSE stream działa
- [ ] Zdarzenia `meta`, `delta`, `done` w poprawnej kolejności
- [ ] Streaming działa dla obu providerów

**Commit:** `test: verify SSE streaming for both providers`

---

### 🎯 MILESTONE 3: Streaming działa

**Kryteria akceptacji:**
- ✅ `POST /api/v1/chat/stream` zwraca SSE
- ✅ Format zdarzeń: `meta`, `delta`, `done`
- ✅ Streaming działa dla Anthropic i Google
- ✅ Błąd dla modeli bez streamingu

**Czas:** 10-12h (łącznie: ~25h)  
**Następny krok:** Config & Registry (eliminacja hardcoded values)

---

## FAZA 4: Config Files — konfiguracja modeli przez pliki (3-4h)

**ZMIANA:** Ta faza jest teraz **znacznie krótsza** — ConfigModule i Registry już istnieją z Fazy 1.

**Dlaczego zmiana:**
- ConfigModule już działa (env)
- ProviderRegistry już działa (prefix matching)
- Zostaje tylko: dodać wczytywanie `gateway.config.json` i dynamiczny resolve aliasów

**Cel:** Eliminacja hardcoded prefix matching — aliasy i modele konfigurowane przez plik YAML.

---

### Krok 4.1: gateway.config.yaml (30min)

**Akcja:**
Stwórz `gateway.config.yaml` w root projektu:

```yaml
schemaVersion: 1

providers:
  anthropic-main:
    type: anthropic
  google-main:
    type: google

models:
  chat-default:
    providerInstance: anthropic-main
    modelId: claude-3-5-sonnet-20241022
  claude-sonnet:
    providerInstance: anthropic-main
    modelId: claude-3-5-sonnet-20241022
  claude-opus:
    providerInstance: anthropic-main
    modelId: claude-3-opus-20240229
  gemini-pro:
    providerInstance: google-main
    modelId: gemini-1.5-pro
  gemini-flash:
    providerInstance: google-main
    modelId: gemini-1.5-flash
```

**Commit:** `feat(config): add gateway.config.yaml with model aliases`

**Dokumentacja:** `docs/konfiguracja.md` (schemat koncepcyjny)

---

### Krok 4.2: Wczytywanie gateway.config.yaml z walidacją (1-2h)

**Akcja:**
Rozbuduj `src/config/configuration.ts`:

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';

// Schemat walidacji dla gateway config
const GatewayConfigSchema = z.object({
  schemaVersion: z.number().int().min(1),
  providers: z.record(z.object({
    type: z.enum(['anthropic', 'google']),
  })),
  models: z.record(z.object({
    providerInstance: z.string(),
    modelId: z.string(),
  })),
});

export default () => {
  // Wczytaj gateway config YAML
  const configPath = join(process.cwd(), 'gateway.config.yaml');
  let gatewayConfig;
  
  try {
    const fileContents = readFileSync(configPath, 'utf8');
    const parsedYaml = yaml.load(fileContents);
    
    // Walidacja schematu
    const validationResult = GatewayConfigSchema.safeParse(parsedYaml);
    
    if (!validationResult.success) {
      console.error('[Config] Gateway config validation failed:', validationResult.error.format());
      throw new Error('Invalid gateway.config.yaml structure');
    }
    
    gatewayConfig = validationResult.data;
    console.log('[Config] Loaded and validated gateway.config.yaml');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('[Config] gateway.config.yaml not found');
      throw new Error('gateway.config.yaml is required');
    }
    throw error;
  }

  return {
    gateway: gatewayConfig,
    port: parseInt(process.env.PORT, 10) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    providers: {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      google: {
        apiKey: process.env.GOOGLE_API_KEY,
      },
    },
  };
};
```

**Uzasadnienie:**
- **YAML zamiast JSON:** Bardziej czytelny, wspiera komentarze
- **js-yaml:** Biblioteka już zainstalowana w projekcie
- **Zod walidacja:** Fail-fast z dokładnymi komunikatami błędów
- **Enum dla providerów:** Zapobiega literówkom

**Weryfikacja:**
- [ ] Serwis nie startuje bez `gateway.config.yaml`
- [ ] Serwis nie startuje gdy `gateway.config.yaml` ma błędną strukturę
- [ ] Log pokazuje `Loaded and validated gateway.config.yaml`
- [ ] Błędna walidacja pokazuje dokładny komunikat błędu

**Commit:** `feat(config): load and validate gateway.config.yaml with js-yaml and zod`

**Dokumentacja:** `docs/konfiguracja.md` (schemat YAML)

---

### Krok 4.3: Dynamiczny resolve aliasów w Registry (1-2h)

**Akcja:**
Rozbuduj `src/providers/provider-registry.service.ts` — zamień hardcoded prefix matching na wczytywanie z configu:

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider } from './provider.interface';

@Injectable()
export class ProviderRegistryService {
  private providers = new Map<string, { provider: AIProvider; name: string }>();

  constructor(private configService: ConfigService) {}

  register(providerName: string, provider: AIProvider) {
    this.providers.set(providerName, { provider, name: providerName });
    console.log(`[ProviderRegistry] Registered provider: ${providerName}`);
  }

  /**
   * Rozwiązuje alias modelu do providera i modelId (dynamicznie z config file).
   */
  resolve(modelAlias: string): { 
    provider: AIProvider; 
    providerName: string; 
    modelId: string;
  } {
    const gatewayConfig = this.configService.get('gateway');
    
    // Wyszukaj alias w konfiguracji
    const modelConfig = gatewayConfig.models[modelAlias];
    if (!modelConfig) {
      throw new BadRequestException(
        `Unknown model alias: ${modelAlias}. Available: ${Object.keys(gatewayConfig.models).join(', ')}`
      );
    }

    // Resolve provider instance
    const providerInstanceConfig = gatewayConfig.providers[modelConfig.providerInstance];
    if (!providerInstanceConfig) {
      throw new BadRequestException(
        `Provider instance not found: ${modelConfig.providerInstance}`
      );
    }

    const providerType = providerInstanceConfig.type;
    const entry = this.providers.get(providerType);
    
    if (!entry) {
      throw new BadRequestException(`Provider not registered: ${providerType}`);
    }

    console.log(`[ProviderRegistry] Resolved alias '${modelAlias}' → provider '${entry.name}', model '${modelConfig.modelId}'`);
    
    return {
      provider: entry.provider,
      providerName: entry.name,
      modelId: modelConfig.modelId,
    };
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}
```

Opcjonalnie: dodaj `modelId` do odpowiedzi adaptera (jeśli chcesz zwracać konfigurowany model zamiast tego z API):

```typescript
// W ChatService:
const { provider, providerName, modelId } = this.registry.resolve(request.modelAlias);
const response = await provider.complete(request.messages);

return {
  id: `gw_${Date.now()}`,
  provider: providerName,
  model: modelId, // ← Z configu zamiast response.model
  // ...
};
```

**Weryfikacja:**
- [ ] Aliasy z `gateway.config.json` działają (np. `chat-default`, `gemini-flash`)
- [ ] Nieznany alias zwraca błąd z listą dostępnych aliasów
- [ ] Log pokazuje resolved alias → provider → modelId

**Commit:** `feat(providers): implement dynamic alias resolution from config file`

**Dokumentacja:** `docs/architektura.md`, `docs/spec/SPEC-KONFIGURACJA.md`

---

### 🎯 MILESTONE 4: Konfiguracja przez pliki

**Kryteria akceptacji:**
- ✅ Modele i providery konfigurowane przez `gateway.config.yaml`
- ✅ ProviderRegistry dynamicznie rozwiązuje aliasy (nie hardcoded prefix matching)
- ✅ Możliwość dodania nowych aliasów bez zmiany kodu
- ✅ Serwis nie startuje bez `gateway.config.yaml` (fail-fast)
- ✅ Walidacja schematu YAML z komunikatami błędów (Zod)

**Czas:** 3-4h (łącznie: ~18h, oszczędność 3-4h względem oryginalnego planu)  
**Następny krok:** Error handling (spójne błędy)

---

## FAZA 5: Error Handling — spójne błędy i requestId (4-6h)

**Cel:** Ujednolicony envelope błędów, mapowanie błędów providerów, propagacja requestId.

**Dlaczego teraz:** Mamy działającą funkcjonalność — czas na production-ready error handling.

### Krok 5.1: Error envelope (1h)

**Akcja:**
Stwórz `src/common/dto/error-envelope.dto.ts`:

```typescript
export class ErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  details?: unknown[];
}
```

**Commit:** `feat(common): add ErrorEnvelope DTO`

**Dokumentacja:** `openapi.json` (schema `ErrorEnvelope`), `docs/spec/SPEC-PLATFORMA-I-KONTRAKTY.md`

---

### Krok 5.2: Global Exception Filter (2-3h)

**Akcja:**
Stwórz `src/common/filters/http-exception.filter.ts`:

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message;
      code = this.mapHttpStatusToCode(status);
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      requestId: request.requestId || 'unknown',
      details: [],
    });
  }

  private mapHttpStatusToCode(status: number): string {
    // Mapowanie zgodne z docs/dictionary.md
    const mapping = {
      400: 'VALIDATION_FAILED',
      429: 'RATE_LIMITED',
      502: 'PROVIDER_UNAVAILABLE',
      504: 'PROVIDER_TIMEOUT',
    };
    return mapping[status] || 'INTERNAL_SERVER_ERROR';
  }
}
```

Dodaj do `main.ts`:

```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

**Commit:** `feat(common): implement global exception filter with error envelope`

**Dokumentacja:** `docs/anty-patterny.md` (błędy), `docs/dictionary.md` (kody błędów)

---

### Krok 5.3: RequestId Interceptor (1h)

**Akcja:**
Stwórz `src/common/interceptors/request-id.interceptor.ts`:

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    request.requestId = request.headers['x-request-id'] || `req_${uuidv4()}`;
    return next.handle();
  }
}
```

Aktywuj w `main.ts`:

```typescript
app.useGlobalInterceptors(new RequestIdInterceptor());
```

Opcjonalnie: zaktualizuj `ChatService.executeChat()` aby korzystał z `request.requestId` jeśli dostępny (wymaga przekazania przez parametr).

**Uwaga:** Biblioteka `uuid` już jest zainstalowana i używana od Fazy 1 (krok 1.6).

**Commit:** `feat(common): add RequestIdInterceptor for x-request-id header correlation`

**Dokumentacja:** `docs/spec/SPEC-PLATFORMA-I-KONTRAKTY.md` (requestId)

---

### 🎯 MILESTONE 5: Production-ready errors

**Kryteria akceptacji:**
- ✅ Wszystkie błędy mają envelope z `code`, `message`, `requestId`
- ✅ RequestId propagowany z nagłówka lub generowany
- ✅ Błędy providerów mapowane na stabilne kody
- ✅ Brak sekretów w odpowiedziach błędów

**Czas:** 4-6h (łącznie: ~24h)  
**Następny krok:** Observability (structured logs, healthcheck)

---

## FAZA 6: Observability — structured logs + healthcheck (3-4h)

**Cel:** Zamienić `console.log` na structured logger, dodać `/health` endpoint.

### Krok 6.1: Structured logger (pino) (2h)

**Akcja:**
```bash
npm install nestjs-pino pino-http pino-pretty
```

Dodaj do `AppModule`:

```typescript
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production' 
          ? { target: 'pino-pretty' } 
          : undefined,
      },
    }),
    // ...
  ],
})
export class AppModule {}
```

Zamień `console.log` na `this.logger.log()` w adapterach i serwisach.

**Commit:** `feat(observability): replace console.log with structured logger (pino)`

**Dokumentacja:** `docs/architektura.md` (Observability)

---

### Krok 6.2: Healthcheck (1-2h)

**Akcja:**
Stwórz `src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

Dodaj `HealthModule` do `AppModule`.

**Commit:** `feat(health): add basic liveness healthcheck endpoint`

**Dokumentacja:** `docs/spec/SPEC-HEALTH.md`, `openapi.json` (operacja `getHealth`)

---

### 🎯 MILESTONE 6: Observability gotowe

**Kryteria akceptacji:**
- ✅ Structured logs (JSON w prod, pretty w dev)
- ✅ RequestId w każdym logu
- ✅ `/api/v1/health` zwraca `{ "status": "ok" }`

**Czas:** 3-4h (łącznie: ~30h)  
**Następny krok:** Polish & deployment-ready

---

## FAZA 7: Polish & Deploy-ready (4-6h)

**Cel:** Przygotować projekt do wdrożenia i prezentacji — README, Dockerfile, testy.

### Krok 7.1: README.md (2h)

**Akcja:**
Napisz kompletny README z:
- Opis projektu
- Instalacja i setup
- Konfiguracja (`.env`, `gateway.config.json`)
- Przykłady użycia (curl)
- Architektura (link do docs)
- Roadmap

**Commit:** `docs: write comprehensive README with setup and usage examples`

---

### Krok 7.2: Dockerfile + docker-compose (1-2h)

**Akcja:**
Stwórz `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "dist/main"]
```

Stwórz `docker-compose.yml`:

```yaml
version: '3.8'
services:
  gateway:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./gateway.config.json:/app/gateway.config.json
```

**Commit:** `chore: add Dockerfile and docker-compose for deployment`

---

### Krok 7.3: Testy jednostkowe (1-2h)

**Akcja:**
Napisz podstawowe testy dla:
- `ChatService.resolveAlias()` (mockowany registry)
- `ProviderRegistry.resolveAlias()` (mockowany config)
- `AnthropicAdapter.complete()` (mockowany SDK)

**Commit:** `test: add unit tests for core services and adapters`

**Dokumentacja:** `docs/dokumentacja_koncepcyjna.md` (testowalność)

---

### 🎯 MILESTONE 7: Deploy-ready

**Kryteria akceptacji:**
- ✅ README kompletny z przykładami
- ✅ Dockerfile działa (`docker build` sukces)
- ✅ `docker-compose up` uruchamia gateway
- ✅ Podstawowe testy jednostkowe przechodzą

**Czas:** 4-6h (łącznie: ~36h)  
**Status:** **MVP COMPLETE** 🎉

**Oszczędność względem oryginalnego planu:** ~8-13h dzięki reorganizacji faz 1-4

---

## 🚀 Po MVP — rozszerzenia (opcjonalne)

### Post-MVP Features:

1. **OpenAI jako trzeci provider** (4-6h)
   - Wymaga płatnego konta API
   - Analogiczny adapter do Anthropic/Google

2. **Retry & Circuit Breaker** (6-8h)
   - Biblioteka: `cockatiel` lub `resilience4ts`
   - Policy per provider z konfiguracji

3. **Metryki Prometheus** (4-6h)
   - Endpoint `/metrics`
   - Metryki: latency, błędy, tokeny per provider

4. **Rate Limiting** (3-4h)
   - Guard: `@nestjs/throttler`
   - Limity globalne i per endpoint

5. **OpenAPI Generator** (2-3h)
   - Automatyczna generacja z dekoratorów
   - Swagger UI pod `/api-docs`

6. **CLI klienta** (6-8h)
   - TypeScript SDK dla gateway
   - Przykłady użycia

---

## 📋 Checklista końcowa (MVP)

Przed uznaniem MVP za ukończone:

**Funkcjonalność:**
- [ ] `POST /api/v1/chat` działa dla Anthropic
- [ ] `POST /api/v1/chat` działa dla Google Gemini
- [ ] `POST /api/v1/chat/stream` działa (SSE) dla obu providerów
- [ ] Routing przez `modelAlias` działa
- [ ] Konfiguracja przez `gateway.config.json` działa

**Jakość:**
- [ ] Walidacja DTO działa (błąd 400 dla niepoprawnego input)
- [ ] Error envelope spójny dla wszystkich błędów
- [ ] RequestId w każdej odpowiedzi i logu
- [ ] Logi strukturalne (JSON w prod)
- [ ] `/api/v1/health` działa

**Dokumentacja:**
- [ ] README kompletny
- [ ] Przykłady curl w README
- [ ] `.env.example` bez sekretów

**Deploy:**
- [ ] Dockerfile buduje się bez błędów
- [ ] `docker-compose up` uruchamia gateway
- [ ] Testy jednostkowe przechodzą

**Bezpieczeństwo:**
- [ ] Sekrety tylko w `.env` (nie w kodzie)
- [ ] `.env` w `.gitignore`
- [ ] Logi nie zawierają kluczy API

---

## 🎓 Wnioski i nauka

**Czego nauczysz się implementując ten plan:**

1. **NestJS zaawansowane:**
   - Moduły i DI
   - Pipes, Interceptors, Filters
   - SSE (Streaming)
   - ConfigModule

2. **Architektura:**
   - Clean Architecture (warstwy)
   - Adapter Pattern
   - Registry Pattern (od początku, nie jako refactoring)
   - Strategy Pattern

3. **Integracje:**
   - Różne SDK LLM (Anthropic, Google)
   - Mapowanie między kontraktami
   - Error handling dla zewnętrznych API

4. **Operacyjność:**
   - Structured logging
   - Healthchecks
   - Error envelopes
   - RequestId correlation

5. **DevOps:**
   - Docker
   - docker-compose
   - Środowiska (dev/prod)

---

## 🔄 Zmiany względem oryginalnego planu

**Główna różnica:** ConfigModule i ProviderRegistry zostały **przeniesione do Fazy 1** zamiast być "refactoringiem" w Fazie 4.

**Korzyści:**
- ✅ **Oszczędność czasu:** ~8-13h (mniej refactoringu w Fazach 2 i 4)
- ✅ **Czystszy kod:** Architektura od początku, nie tech debt → refactoring
- ✅ **Łatwiejsze rozszerzanie:** Dodanie Google w Fazie 2 = 2 linie kodu (rejestracja)
- ✅ **Zgodność z dokumentacją:** `docs/architektura.md` opisuje Registry jako fundament, nie usprawnienie

**Trade-off:**
- ⚠️ Faza 1 jest dłuższa (8-10h zamiast 6-8h)
- ✅ Ale Fazy 2 i 4 są znacznie krótsze (kompensacja z nawiązką)

---

**Powodzenia! 🚀**

*Plan żywy — aktualizuj status milestone po każdej fazie.*
