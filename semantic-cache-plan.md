# Plan: semantic cache

Status epiku: **Fazy 1–2 WYKONANE** (ciała kroków `WYKONANY` bez zmian). **Faza 6 NIE_ROZPOCZĘTA — MUSI być wykonana przed Fazą 3.** Fazy 3–5: **NIE_ROZPOCZĘTE**.  
Wiążący kontrakt warstwy semantic cache: **§0 + DoD v1** (uzupełnione 2026-08-25 — cel v1 **oraz** pasek poprawek: circuit z odzyskiem, jeden embed na miss, probe `/ready` w budżecie healthchecka, known limitation partycji). Migawki implementacji w krokach 2.x pozostają historią wykonania; nie nadpisują §0. Faza 6 to refaktor `src/` + docs pod ten kontrakt, **bez** Compose.  
Ten plik jest wyłącznie planem — bez zmian w `src/`, `docs/` ani Compose, dopóki użytkownik o to nie poprosi.  
Źródło ustaleń: przegląd `src/cache`, Compose, readiness (2026-08-22); korekta kontraktów opisowych po raporcie zgodności (2026-08-25).

Kolejność wykonania: **1 → 2 → 6 → 3 → 4**; Faza 5 po v1. Wyjątek od numeracji faz: **2 ⇒ 6 ⇒ 3** (Faza 6 **MUSI** przed Fazą 3). Kolejność warstw przy implementacji: **dokumentacja + kontrakty → `src/` → Compose/skrypty → testy**.

---

## 0. Zamknięte decyzje

Wiążące dla DoD warstwy. Gdzie 2026-08-25 zmienia wcześniejsze brzmienie, wiersz albo dopisek pod tabelą wskazuje **zmianę względem** poprzedniej reguły.

| Temat              | Ustalenie                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lookup             | exact (hash) → semantic (embedding + KNN) → provider                                                                                                                                                                                                                                                                                                                     |
| HTTP v1            | non-stream: `POST /api/v1/chat` i fasady przez `ChatService`                                                                                                                                                                                                                                                                                                             |
| Stream v1          | bez odczytu/zapisu cache                                                                                                                                                                                                                                                                                                                                                 |
| Stream później     | krok po v1: **zapis exact po udanym streamie** (A). Replay SSE (B) poza zakresem                                                                                                                                                                                                                                                                                         |
| Tekst wektora      | ostatnia wiadomość `role: user` z niepustym `content`                                                                                                                                                                                                                                                                                                                    |
| Partycja           | TAG `modelAlias` + `clientId`; ten sam `clientId` wchodzi do klucza exact. Semantic **nie** partycjonuje po `systemSignature` ani po efektywnych params wywołania (to ograniczenie v1, obowiązkowo opisane w docs — dopisek pod tabelą)                                                                                                                                  |
| Skip               | tooling; brak `gatewayKey`; `clientId === 'unknown'`; brak ostatniego usera (tylko semantic); stream v1                                                                                                                                                                                                                                                                  |
| Fail-open          | Redis / embedding down → chat idzie dalej; `/ready` może być `embeddings: degraded`, nie `not_ready`. Fail-open = **degradacja chwilowa**, nie trwałe wyłączenie semantic cache do restartu procesu (dopisek: circuit)                                                                                                                                                   |
| Circuit embeddingu | Obwód tylko na błędach **`embed()`**. Stany closed → open (po 3 kolejnych błędach embed) → **half-open** (próbny embed po cooldown) → closed. Sukces half-open albo sukces `probeEmbedding()` zamyka obwód. Błędy Redis (`knn` / `upsert`) **nie** zużywają tego licznika. Warmup `OnModuleInit` nie otwiera obwodu                                                      |
| Reuse wektora      | Na exact-miss + semantic-miss: **jeden** `embed` na żądanie. `lookup` udostępnia wektor; `setCachedIfAllowed` **przekazuje** go do `storeReply(..., reusedVector)`. Zapis nadal `await` (nie `void`)                                                                                                                                                                     |
| Health `/ready`    | `checks.embeddings` tylko gdy flaga on; `degraded` nie blokuje `ready`. Probe embeddings **nie wiesza** `GET /ready`: throttle wyniku (jak scrape metryk) i/lub timeout probe **krótszy** niż `EMBEDDING_TIMEOUT_MS` oraz **krótszy** niż timeout healthchecka gatewaya (Compose/Dockerfile: **3 s**). `embeddings: healthy` nie współistnieje z obwodem trwale otwartym |
| Flagi              | kod: `SEMANTIC_CACHE_ENABLED=false`; `.env` / Compose tego projektu: `true` jako przykład **lokalny**, nie certyfikat produkcji. Poza dev: kontrakt circuit + reuse + probe **oraz** Fazy 3–4 (żywy Redis Search)                                                                                                                                                        |
| Próg               | cosine **similarity** default **0.90** (env nadpisuje); w Redis COSINE dystans ≈ `1 − similarity` → cutoff **0.10**. Ryzyko „podobny tekst, inna tożsamość” zostaje (anti-patterns pkt 18)                                                                                                                                                                               |
| KNN                | `k` default 3, bierzemy najlepszy powyżej progu                                                                                                                                                                                                                                                                                                                          |
| Redis              | ten sam `deployment/docker/docker-compose.redis.yml`; obraz `redis/redis-stack-server` (pin tagu); port **6380**; `noeviction`; default `REDIS_MAX_MEMORY` **500 MB** (wektor ~5 KB/entry → ~100k wpisów); parametry przez **`REDIS_ARGS`**, nie przez nadpisanie `command:` (inaczej zniknie Search)                                                                    |
| Embedding          | osobny Compose `docker-compose.ollama-embedding.yml`; model **`qwen3-embedding:0.6b`** (DIM **1024**); CPU, bez GPU; API `POST /api/embed`; `OLLAMA_KEEP_ALIVE=-1`                                                                                                                                                                                                       |
| RAM                | **minimum 16 GB** na bazowy stack (gateway + Redis Stack + Ollama embedding). Czatowa Ollama (`llama3.1:8b`) **nie** jest częścią bazy                                                                                                                                                                                                                                   |
| Moduł              | `src/cache`: drugi port (`EmbeddingBackend`, `VectorStore`), nie rozrost `CacheBackend` KV                                                                                                                                                                                                                                                                               |
| Ten sam Redis      | `RedisConnectionService` + Search; Lua rate limit bez zmian                                                                                                                                                                                                                                                                                                              |
| Testy wektorowe    | nie na `test/integration/docker-compose.redis.yml` (`redis:7-alpine`) — osobny stack ze Stackiem; CI bez żywej Ollamy. Parser/KNN na żywym Search = Faza 4; DoD warstwy bez tego nie jest spełnione na produkcji                                                                                                                                                         |

### Dopiski kontraktowe (2026-08-25) — zmiana względem wcześniejszych reguł

- **Fail-open / circuit.** Zmiana względem: wiersz Fail-open z 2026-08-22 („chat idzie dalej; `/ready` degraded”) oraz guardrail G2 w kroku 2.2 (licznik `+=`, reset na sukces, **bez** half-open). Nadal: błąd embed/Redis nie zrywa czatu i nie ustawia `not_ready`. Nowy wymóg: po odzyskaniu Ollamy semantic cache wraca do ruchu bez restartu gatewaya; health nie kłamie (`healthy` przy martwej warstwie).
- **Reuse wektora.** Zmiana względem: komentarz `storeReply` w kroku 2.2 (intencja reuse) vs snippet `ChatCacheGuardService` bez 4. argumentu. Wiążący jest **jeden embed na miss** + przekazanie wektora z lookup do SET; snippet bez `reusedVector` nie jest kontraktem.
- **Probe `/ready`.** Zmiana względem: krok 2.3 (żywy `probeEmbedding()` na każdym `evaluateReadiness()`, bez throttlingu). Wiążące: `GET /ready` (w tym Docker `HEALTHCHECK` timeout 3 s) nie czeka na pełne `EMBEDDING_TIMEOUT_MS` (5000). Nie wydłużamy healthchecka gatewaya pod embedding — skracamy/cache’ujemy probe.
- **Partycja.** Wymiar TAG bez zmian względem 2026-08-22 (`modelAlias` + `clientId`). Dopisek: exact nadal hashuje sygnaturę system promptu i efektywne params; semantic nie. Brak bulk-invalidacji KNN przy zmianie promptu — bound to TTL. Docs (`anti-patterns` / `anty_patterny`, `configuration` / `konfiguracja`) **muszą** to nazwać jako known limitation v1. TAG `systemSignature` / params oraz opt-in per alias = poza v1 (osobna decyzja).

---

## Faza 1 — Dokumentacja i kontrakty (status: WYKONANY)

Cel: jeden spójny opis zachowania, zanim powstanie kod feature’u. OpenAPI pochodzi z DTO (`npm run openapi:export`).

### Krok 1.1 — README (status: WYKONANY)

- [x] Stack: Redis nie jest już wyłącznie „optional” w opisie produktu; bazowy Compose = gateway + Redis Stack + ollama-embedding; czatowa Ollama nadal opcjonalna
- [x] Quick start: `npm run start:dev` nie wstaje Dockera; do semantic cache lokalnie potrzeba infra (Redis :6380, embedding :11435)
- [x] `docker:up` / warianty stacku zgodne z nową bazą (doprecyzowanie w `docs/deployment.md`; skrypty npm w Fazie 3)
- [x] Tabela `src/cache/`: exact + semantic, partycja `clientId`

### Krok 1.2 — `docs/` EN + `docs/pl/` (status: WYKONANY)

Zsynchronizować obie wersje językowe:

| Dokument                                                      | Co dopisać / zmienić                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `docs/README.md`, `docs/pl/README.md`                         | temat semantic cache w indeksie                                                                              |
| `configuration.md` / `konfiguracja.md`                        | env semantic + exact `clientId`; lookup; fail-open; Redis Search; embedding URL                              |
| `deployment.md` / `pl/deployment.md`                          | obraz Stack + `REDIS_ARGS`; nowy compose embedding; baza stacku; 16 GB; port 11435; `infra` przy `start:dev` |
| `architecture.md` / `architektura.md`                         | dwa porty w `src/cache`; health `checks.embeddings`                                                          |
| `dictionary.md` / `pl/dictionary.md`                          | hasła Exact cache vs Semantic cache                                                                          |
| `api-documentation.md` / `dokumentacja_api.md`                | `/ready` + embeddings; metryki                                                                               |
| `api-architecture.md` / `architektura_api.md`                 | idempotencja: exact **lub** semantic hit                                                                     |
| `project.structure.md` / `architektura_katalogi_pliki.md`     | drzewo `src/cache/semantic`, compose embedding                                                               |
| `anti-patterns.md` / `anty_patterny.md`                       | zły hit semantyczny; nie pakować Search w `CacheBackend`; `command:` na Stacku                               |
| `data-flow.md` / `data_flow.md`                               | exact → semantic → provider                                                                                  |
| `conceptual-documentation.md` / `dokumentacja_koncepcyjna.md` | zakres: obie warstwy cache                                                                                   |
| `testing.md` / `testy.md`                                     | unit fake ports; integration Stack bez Ollamy                                                                |
| `endpoints.md` / `lista_endpointów.md`                        | `checks.embeddings`                                                                                          |
| `command_line_interface.md` / `CLI.md`                        | tylko wzmianka env (wizard CLI = osobny krok po kodzie)                                                      |

### Krok 1.3 — Kontrakt env (status: WYKONANY)

- [x] Root `.env.example`
- [x] `deployment/templates/.env.example` (lustro)

Zmienne (walidacja w kodzie = Faza 2):

| Zmienna                         | Default w kodzie         | Przykład w `.env` projektu                              |
| ------------------------------- | ------------------------ | ------------------------------------------------------- |
| `SEMANTIC_CACHE_ENABLED`        | `false`                  | `true`                                                  |
| `EMBEDDING_BASE_URL`            | `http://localhost:11435` | host vs `http://ollama-embedding:11434` w sieci Dockera |
| `EMBEDDING_MODEL`               | `qwen3-embedding:0.6b`   | zmiana = nowy indeks                                    |
| `EMBEDDING_DIM`                 | `1024`                   | zmiana = nowy indeks                                    |
| `EMBEDDING_TIMEOUT_MS`          | `5000`                   | —                                                       |
| `SEMANTIC_CACHE_MIN_SIMILARITY` | `0.90`                   | —                                                       |
| `SEMANTIC_CACHE_TTL`            | jak `CACHE_TTL` / `3600` | —                                                       |
| `SEMANTIC_CACHE_K`              | `3`                      | —                                                       |

`CACHE_*` / `REDIS_*` bez zmiany znaczenia KV. Semantic **nie** jest wartością `CACHE_BACKEND`.

### Krok 1.4 — Kontrakt OpenAPI / DTO (status: WYKONANY)

- [x] `HealthReadinessChecksDto`: opcjonalne `checks.embeddings` (fail-open, nie blokuje `ready`)
- [x] `HealthRedisCheckItemDto.consumers`: dopuszczalne `semantic-cache`
- [x] `npm run openapi:export` → `openapi.json`
- [x] Opis ludzki w `api-documentation.md` (zgodny z DTO)

Runtime `HealthService` wypełni nowe pola w Fazie 2; do tego czasu pole embeddings może być nieobecne w JSON (opcjonalne).

**Po Fazie 1:** implementacja feature’u w `src/` (Faza 2). Nie odwrotnie.

---

## Faza 2 — Aplikacja (`src/`) (status: WYKONANY)

Implementacja feature’u. Adaptery czytają wyłącznie `getAppConfig` / `getAppConfigOrThrow`, nigdy `process.env`. `CacheBackend` KV **bez** Search.

### Krok 2.1 — Konfiguracja (status: WYKONANY)

Pliki: `src/config/env.validation.ts`, `src/config/app-configuration.types.ts`, `src/config/configuration.ts`, `src/cache/should-include-redis-stack.ts`, `src/cache/should-include-redis-stack.spec.ts`, `src/common/mocks/createMockConfigService.ts`, `src/cli/templates/env.template.ts`, `src/cli/services/prompts/server-prompt.service.ts` (tylko snapshot Redis — pytania semantic = Faza 5).

#### `src/config/env.validation.ts`

Dopisać pola semantic **przed** zamknięciem `class EnvironmentVariables`. `ValidateIf` dla `REDIS_*` rozszerzyć: Redis walidować także gdy semantic on (Search), nie tylko gdy `CACHE_BACKEND=redis`.

**Przed:**

```ts
function isRedisCacheBackend(obj: EnvironmentVariables): boolean {
  return (
    obj.CACHE_BACKEND === 'redis' &&
    (obj.CACHE_BACKEND ?? 'noop').toLowerCase() === 'redis'
  );
}
```

**Po:**

```ts
function isRedisInfrastructureRequired(obj: EnvironmentVariables): boolean {
  const redisKv =
    obj.CACHE_ENABLED === true &&
    (obj.CACHE_BACKEND ?? 'noop').toLowerCase() === 'redis';
  return (
    redisKv ||
    obj.RATE_LIMIT_SMART_ENABLED === true ||
    obj.SEMANTIC_CACHE_ENABLED === true
  );
}
```

Wszystkie `@ValidateIf((obj) => isRedisCacheBackend(obj))` na `REDIS_*` → `isRedisInfrastructureRequired`.

**Przed:** (koniec klasy, po `AI_METRICS_BACKEND`) — brak pól semantic.

**Po:** (dopisać na końcu klasy)

```ts
  @Transform(({ value }: { value: unknown }) => toBoolean(value))
  @IsBoolean()
  @IsOptional()
  SEMANTIC_CACHE_ENABLED?: boolean = false;

  @IsString()
  @IsOptional()
  EMBEDDING_BASE_URL?: string = 'http://localhost:11435';

  @IsString()
  @IsOptional()
  EMBEDDING_MODEL?: string = 'qwen3-embedding:0.6b';

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  EMBEDDING_DIM?: number = 1024;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  EMBEDDING_TIMEOUT_MS?: number = 5000;

  @Transform(({ value }: { value: unknown }) => toNumber(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  SEMANTIC_CACHE_MIN_SIMILARITY?: number = 0.90;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  SEMANTIC_CACHE_TTL?: number = 3600;

  @Transform(({ value }: { value: unknown }) => toInt(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  SEMANTIC_CACHE_K?: number = 3;
```

`SEMANTIC_CACHE` **nie** wchodzi do `parseCacheBackend` / `CACHE_BACKEND_VALUES`.

#### `src/config/app-configuration.types.ts`

**Przed:**

```ts
export type AppConfiguration = {
  gateway: GatewayConfig;
  gatewayKey: GatewayKeyRuntimeConfig;
  port: Port;
  nodeEnv: string;
  providers: Record<ProviderInstanceId, ProviderInstanceRuntime>;
  resolvedSystemPrompts: ResolvedSystemPrompts;
  cache: CacheRuntimeConfig;
  redis: RedisRuntimeConfig;
  RATE_LIMIT_SMART_ENABLED: boolean;
  rateLimit: RateLimitRuntimeConfig;
};
```

**Po:**

```ts
export type SemanticCacheRuntimeConfig = {
  enabled: boolean;
  embeddingBaseUrl: string;
  embeddingModel: string;
  embeddingDim: number;
  embeddingTimeoutMs: number;
  minSimilarity: number;
  ttl: CacheTtlSeconds;
  k: number;
};

export type AppConfiguration = {
  gateway: GatewayConfig;
  gatewayKey: GatewayKeyRuntimeConfig;
  port: Port;
  nodeEnv: string;
  providers: Record<ProviderInstanceId, ProviderInstanceRuntime>;
  resolvedSystemPrompts: ResolvedSystemPrompts;
  cache: CacheRuntimeConfig;
  redis: RedisRuntimeConfig;
  semanticCache: SemanticCacheRuntimeConfig;
  RATE_LIMIT_SMART_ENABLED: boolean;
  rateLimit: RateLimitRuntimeConfig;
};
```

#### `src/config/configuration.ts` (`buildAppConfiguration`)

**Przed:**

```ts
const rateLimitSmartEnabled = env.RATE_LIMIT_SMART_ENABLED ?? false;

const redisConfig: RedisRuntimeConfig = isRedisRequired({
  cache: cacheConfig,
  rateLimitSmartEnabled,
})
  ? {
      host: env.REDIS_HOST ?? 'localhost',
      port: asPort(env.REDIS_PORT ?? 6379) /* … */,
    }
  : {
      host: 'localhost',
      port: asPort(6379),
      password: '',
      db: 0,
      keyPrefix: 'aigw:',
    };

return {
  /* … */
  cache: cacheConfig,
  redis: redisConfig,
  RATE_LIMIT_SMART_ENABLED: rateLimitSmartEnabled,
  rateLimit: {
    /* … */
  },
};
```

**Po:**

```ts
const rateLimitSmartEnabled = env.RATE_LIMIT_SMART_ENABLED ?? false;
const semanticCacheEnabled = env.SEMANTIC_CACHE_ENABLED ?? false;

const semanticCacheConfig: SemanticCacheRuntimeConfig = {
  enabled: semanticCacheEnabled,
  embeddingBaseUrl: env.EMBEDDING_BASE_URL ?? 'http://localhost:11435',
  embeddingModel: env.EMBEDDING_MODEL ?? 'qwen3-embedding:0.6b',
  embeddingDim: env.EMBEDDING_DIM ?? 1024,
  embeddingTimeoutMs: env.EMBEDDING_TIMEOUT_MS ?? 5000,
  minSimilarity: env.SEMANTIC_CACHE_MIN_SIMILARITY ?? 0.9,
  ttl: asCacheTtlSeconds(env.SEMANTIC_CACHE_TTL ?? env.CACHE_TTL ?? 3600),
  k: env.SEMANTIC_CACHE_K ?? 3,
};

const redisConfig: RedisRuntimeConfig = isRedisRequired({
  cache: cacheConfig,
  rateLimitSmartEnabled,
  semanticCacheEnabled,
})
  ? {
      host: env.REDIS_HOST ?? 'localhost',
      port: asPort(env.REDIS_PORT ?? 6379) /* … */,
    }
  : {
      host: 'localhost',
      port: asPort(6379),
      password: '',
      db: 0,
      keyPrefix: 'aigw:',
    };

return {
  /* … */
  cache: cacheConfig,
  redis: redisConfig,
  semanticCache: semanticCacheConfig,
  RATE_LIMIT_SMART_ENABLED: rateLimitSmartEnabled,
  rateLimit: {
    /* … */
  },
};
```

#### `src/cache/should-include-redis-stack.ts`

Refaktor predykatu Redis (względem obecnego `isRedisRequired` bez semantic).

**Przed:**

```ts
export type RedisRequirementSnapshot = {
  cache?: { enabled?: boolean; backend?: CACHE_BACKEND_TYPE };
  rateLimitSmartEnabled?: boolean;
};

export function getRedisConsumers(
  input: RedisRequirementSnapshot,
): RedisConsumer[] {
  const cache = resolveCacheForRequirement(input);
  const consumers: RedisConsumer[] = [];
  if (cache.enabled && cache.backend === 'redis') consumers.push('cache');
  if (input.rateLimitSmartEnabled === true) consumers.push('rate-limit');
  return consumers;
}

export function isRedisRequiredFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const cacheEnabled = env.CACHE_ENABLED === 'true';
  return isRedisRequired({
    cache: {
      enabled: cacheEnabled,
      backend: parseCacheBackend(env.CACHE_BACKEND, cacheEnabled),
    },
    rateLimitSmartEnabled: env.RATE_LIMIT_SMART_ENABLED === 'true',
  });
}
```

**Po:**

```ts
export type RedisRequirementSnapshot = {
  cache?: { enabled?: boolean; backend?: CACHE_BACKEND_TYPE };
  rateLimitSmartEnabled?: boolean;
  semanticCacheEnabled?: boolean;
};

export function getRedisConsumers(
  input: RedisRequirementSnapshot,
): RedisConsumer[] {
  const cache = resolveCacheForRequirement(input);
  const consumers: RedisConsumer[] = [];
  if (cache.enabled && cache.backend === 'redis') consumers.push('cache');
  if (input.rateLimitSmartEnabled === true) consumers.push('rate-limit');
  if (input.semanticCacheEnabled === true) consumers.push('semantic-cache');
  return consumers;
}

export function isRedisRequiredFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const cacheEnabled = env.CACHE_ENABLED === 'true';
  return isRedisRequired({
    cache: {
      enabled: cacheEnabled,
      backend: parseCacheBackend(env.CACHE_BACKEND, cacheEnabled),
    },
    rateLimitSmartEnabled: env.RATE_LIMIT_SMART_ENABLED === 'true',
    semanticCacheEnabled: env.SEMANTIC_CACHE_ENABLED === 'true',
  });
}
```

To samo w `isRedisRequiredFromConfig` / `getRedisConsumersFromConfig`: dodać `semanticCacheEnabled: getAppConfig(configService, 'semanticCache')?.enabled === true`.

#### `src/cache/should-include-redis-stack.spec.ts`

**Przed:** brak przypadku semantic.

**Po:** (dopisać)

```ts
it('should be true when only semantic cache enabled', () => {
  expect(
    isRedisRequiredFromEnv({
      CACHE_ENABLED: 'false',
      CACHE_BACKEND: 'noop',
      RATE_LIMIT_SMART_ENABLED: 'false',
      SEMANTIC_CACHE_ENABLED: 'true',
    }),
  ).toBe(true);
});

it('should include semantic-cache consumer', () => {
  expect(getRedisConsumers({ semanticCacheEnabled: true })).toEqual([
    'semantic-cache',
  ]);
});
```

#### `src/common/mocks/createMockConfigService.ts`

Dodać `semanticCache` do składanego `AppConfiguration` (default `enabled: false`, reszta jak defaulty kodu). Bez tego `getAppConfig(…, 'semanticCache')` w testach guard/health będzie `undefined`.

#### `src/cli/templates/env.template.ts` + `server-prompt.service.ts`

Na razie **tylko** przekazać `semanticCacheEnabled` do `isRedisRequired` / `isEnvInputRedisRequired`, gdy input/env ma flagę (wizard pytań = Faza 5). Jeśli `generateEnvTemplate` kopiuje istniejące `SEMANTIC_*` z `.env` — zostawić; nie dodawać pytań.

---

### Krok 2.2 — Porty i adaptery w `src/cache` (status: WYKONANY)

- `EmbeddingBackend` + adapter Ollama (`POST /api/embed`)
- `OllamaEmbeddingAdapter` implements `OnModuleInit` — warmup request przy starcie (fail-open); eliminuje cold-start Ollamy na pierwszym żywym zapytaniu
- `VectorStore` + Redis Search (`FT.CREATE` / KNN), HASH lub JSON, TAG: `modelAlias`, `clientId`, wersja modelu embeddingu
- `RedisVectorStoreAdapter` implements `OnModuleInit` — `ensureIndex()` raz przy starcie (lazy flag `indexCreated`); nie w hot-path
- Klucz HASH deterministyczny: `sha256(clientId|modelAlias|embeddingModel|text)[:32]` — duplikat promptu nadpisuje wpis (brak śmieci w KNN top-K)
- Nazwa indeksu zawiera model + DIM (np. `qwen3-1024`)
- `SemanticCacheService`: embed last-user, KNN, próg, reuse wektora przy SET; metoda zapisu: `storeReply()`
- `ResponseCacheService`: **dodać `clientId` do exact key**
- `ChatCacheGuardService`: exact → semantic; skip jak w §0
- Nie rozszerzać `CacheBackend` o Search

Kolejność w tym kroku: interfejsy → helper → circuit → adaptery → serwis → wiring modułu → exact key → guard → `ChatService`.

#### Guardrails (lekcje z implementacji referencyjnej)

| #   | Problem                                | Zasada                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------- | ------------------------------------------------------------- |
| G1  | **`void` store — wyścig z czasem**     | Zapis semantyczny `await`-owany przed zwróceniem odpowiedzi. W NestJS v1 non-stream cały pipeline jest synchroniczny — nie używaj fire-and-forget. `void storeSemanticReply(...)` powoduje: drugi request może trafić zanim wektor wyląduje w Redis → miss.                                  |
| G2  | **Circuit breaker: `==` zamiast `+=`** | `failures == 1` to porównanie zwrócone w nicość. Licznik nigdy nie rośnie, circuit nigdy nie otwiera. Weryfikuj unit testem: `recordEmbedFailure()` × N → `isCircuitOpen() === true`.                                                                                                        |
| G3  | **Brak nomic prefix z Qwenem**         | `search_query:` to instrukcja modelu `nomic-embed-text` / `mxbai`. Qwen 3 Embedding jej nie rozumie — używaj gołego tekstu lub dedykowanej instrukcji Qwena. Obie strony (store i lookup) **muszą** używać identycznego formatu; niespójność = fałszywe missy. Zmiana formatu = nowy indeks. |
| G4  | **Cold-start Ollamy na CPU**           | Pierwszy `embed` po starcie kontenera ładuje model z dysku (~30–60 s na CPU). `healthcheck: ollama list` przechodzi, ale request timeout'uje. `OllamaEmbeddingAdapter.onModuleInit()` robi warmup request (fail-open) — model ląduje w pamięci zanim ruszy ruch.                             |
| G5  | **Duplikaty w KNN top-K**              | UUID jako klucz HASH = ten sam prompt generuje nowy wpis przy każdym miss. Po N identycznych zapytaniach top-K zwraca N kopii (szum). Klucz deterministyczny `sha256(clientId                                                                                                                | modelAlias | embeddingModel | text)` → atomowy overwrite, jedna kopia per unikatowy prompt. |

#### `src/cache/semantic/embedding-backend.interface.ts` — NOWY

```ts
export interface EmbeddingBackend {
  isAvailable(): boolean;
  embed(text: string): Promise<number[]>;
}
```

#### `src/cache/semantic/vector-store.interface.ts` — NOWY

```ts
import type { CachedChatResponse } from '../types/cached-chat-response.type';
import type { ClientId, ModelAlias } from '../../common/types/branded.types';

export type VectorSearchHit = {
  similarity: number;
  reply: CachedChatResponse;
};

export interface VectorStore {
  knn(input: {
    vector: number[];
    modelAlias: ModelAlias;
    clientId: ClientId;
    k: number;
  }): Promise<VectorSearchHit[]>;
  upsert(input: {
    vector: number[];
    text: string;
    modelAlias: ModelAlias;
    clientId: ClientId;
    reply: CachedChatResponse;
    ttlSeconds: number;
  }): Promise<void>;
}
```

#### `src/cache/semantic/semantic-cache.tokens.ts` — NOWY

```ts
export const EMBEDDING_BACKEND = Symbol('EMBEDDING_BACKEND');
export const VECTOR_STORE = Symbol('VECTOR_STORE');
```

#### `src/cache/semantic/last-user-message.ts` — NOWY

```ts
import type { ChatRequestDto } from '../../chat/dto/chat-request.dto';

/** Ostatnia wiadomość role:user z niepustym content. G3: goły tekst, bez search_query:. */
export function lastUserMessageText(request: ChatRequestDto): string | null {
  for (let i = request.messages.length - 1; i >= 0; i -= 1) {
    const msg = request.messages[i];
    if (msg.role === 'user' && typeof msg.content === 'string') {
      const text = msg.content.trim();
      if (text.length > 0) return text;
    }
  }
  return null;
}
```

#### `src/cache/semantic/embedding-circuit-breaker.ts` — NOWY

G2: licznik **`+=`**, nie `==`. Próg otwarcia: 3 kolejne błędy; reset przy sukcesie.

```ts
export class EmbeddingCircuitBreaker {
  private failures = 0;
  private readonly openAfter: number;

  constructor(openAfter = 3) {
    this.openAfter = openAfter;
  }

  isCircuitOpen(): boolean {
    return this.failures >= this.openAfter;
  }

  recordEmbedFailure(): void {
    this.failures += 1;
  }

  recordEmbedSuccess(): void {
    this.failures = 0;
  }
}
```

#### `src/cache/semantic/index-name.ts` — NOWY

```ts
/** qwen3-embedding:0.6b + 1024 → qwen3-1024 (zmiana modelu/DIM = nowy indeks). */
export function semanticIndexName(embeddingModel: string, dim: number): string {
  const head = embeddingModel.split(':')[0] ?? embeddingModel;
  const slug = head.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${dim}`;
}
```

#### `src/cache/semantic/adapters/ollama-embedding.adapter.ts` — NOWY

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../../../config/typed-config';
import { LoggingService } from '../../../logging/logging.service';
import type { EmbeddingBackend } from '../embedding-backend.interface';

@Injectable()
export class OllamaEmbeddingAdapter implements EmbeddingBackend, OnModuleInit {
  private readonly logger: LoggingService;

  constructor(
    private readonly config: ConfigService,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = loggingService.child({ module: 'OllamaEmbeddingAdapter' });
  }

  /** Warmup: ładuje model do pamięci Ollamy przy starcie (fail-open). */
  async onModuleInit(): Promise<void> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return;
    try {
      await this.embed('warmup');
      this.logger.info('Embedding model warmed up successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Embedding warmup failed (non-blocking): ${msg}`);
    }
  }

  isAvailable(): boolean {
    return getAppConfigOrThrow(this.config, 'semanticCache').enabled;
  }

  async embed(text: string): Promise<number[]> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    const url = `${cfg.embeddingBaseUrl.replace(/\/$/, '')}/api/embed`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), cfg.embeddingTimeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: cfg.embeddingModel, input: text }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        throw new Error(`embed HTTP ${res.status}`);
      }
      const body = (await res.json()) as { embeddings?: number[][] };
      const vector = body.embeddings?.[0];
      if (!vector || vector.length !== cfg.embeddingDim) {
        throw new Error(
          `embed dim mismatch: got ${vector?.length ?? 0}, expected ${cfg.embeddingDim}`,
        );
      }
      return vector;
    } finally {
      clearTimeout(timer);
    }
  }
}
```

#### `src/cache/semantic/adapters/redis-vector-store.adapter.ts` — NOWY

Ten sam `RedisConnectionService.getClient()`. HASH + TAG `modelAlias`, `clientId`, `embeddingModel`. COSINE; cutoff dystansu ≈ `1 − minSimilarity`. Brak klienta Redis → throw (serwis łapie i fail-open). Implements `OnModuleInit` — `ensureIndex()` tworzy indeks raz przy starcie modułu (lazy flag `indexCreated`); kolejne wywołania knn/upsert nie odpytują `FT.INFO`.

Szkielet:

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { getAppConfigOrThrow } from '../../../config/typed-config';
import { RedisConnectionService } from '../../adapters/redis-cache/redis-connection.service';
import { LoggingService } from '../../../logging/logging.service';
import { parseCachedChatResponse } from '../../schemas/cached-chat-response.schema';
import { semanticIndexName } from '../index-name';
import type { VectorStore, VectorSearchHit } from '../vector-store.interface';

@Injectable()
export class RedisVectorStoreAdapter implements VectorStore, OnModuleInit {
  private indexCreated = false;

  constructor(
    private readonly redis: RedisConnectionService,
    private readonly config: ConfigService,
    private readonly loggingService: LoggingService,
  ) {}

  private indexName(): string {
    const sem = getAppConfigOrThrow(this.config, 'semanticCache');
    return semanticIndexName(sem.embeddingModel, sem.embeddingDim);
  }

  async onModuleInit(): Promise<void> {
    await this.ensureIndex();
  }

  async ensureIndex(): Promise<void> {
    if (this.indexCreated) return;
    const client = this.redis.getClient();
    if (!client) throw new Error('Redis unavailable');
    const sem = getAppConfigOrThrow(this.config, 'semanticCache');
    const index = this.indexName();
    try {
      await client.call('FT.INFO', index);
      this.indexCreated = true;
      return;
    } catch {
      /* missing index — create */
    }
    await client.call(
      'FT.CREATE',
      index,
      'ON',
      'HASH',
      'PREFIX',
      '1',
      `aigw:sem:${index}:`,
      'SCHEMA',
      'modelAlias',
      'TAG',
      'clientId',
      'TAG',
      'embeddingModel',
      'TAG',
      'reply',
      'TEXT',
      'vector',
      'VECTOR',
      'FLAT',
      '6',
      'TYPE',
      'FLOAT32',
      'DIM',
      String(sem.embeddingDim),
      'DISTANCE_METRIC',
      'COSINE',
    );
    this.indexCreated = true;
  }

  async knn(input): Promise<VectorSearchHit[]> {
    /* FT.SEARCH @modelAlias:{x} @clientId:{y} => [KNN k @vector $blob]; score = 1 - COSINE distance */
  }

  /**
   * Klucz deterministyczny: hash(clientId + modelAlias + embeddingModel + text).
   * Identyczny prompt = atomowy overwrite (brak duplikatów w KNN top-K).
   */
  private entryKey(clientId: string, modelAlias: string, text: string): string {
    const sem = getAppConfigOrThrow(this.config, 'semanticCache');
    const hash = createHash('sha256')
      .update(clientId)
      .update('|')
      .update(modelAlias)
      .update('|')
      .update(sem.embeddingModel)
      .update('|')
      .update(text)
      .digest('hex')
      .slice(0, 32);
    return `aigw:sem:${this.indexName()}:${hash}`;
  }

  async upsert(input): Promise<void> {
    /* HSET entryKey(...) + EXPIRE ttl */
  }
}
```

Wektor do Redis: `Buffer.from(new Float32Array(vector).buffer)`. Query: escape TAG (`-` w aliasie). Klucz HASH deterministyczny (sha256 z clientId+modelAlias+embeddingModel+text, obcięty do 32 hex) — duplikat promptu nadpisuje wpis zamiast tworzyć nowy (brak śmieciowych kopii w top-K KNN).

#### `src/cache/semantic/semantic-cache.service.ts` — NOWY

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAppConfigOrThrow } from '../../config/typed-config';
import { AppMetricsService } from '../../observability/app-metrics/app-metrics.service';
import { LoggingService } from '../../logging/logging.service';
import type { ChatRequestDto } from '../../chat/dto/chat-request.dto';
import type { ChatResponseData } from '../../chat/services/chat-response-builder.service';
import type { CachedChatResponse } from '../types/cached-chat-response.type';
import type { ClientId, ModelAlias } from '../../common/types/branded.types';
import { asModelAlias } from '../../common/types/branded.types';
import { EMBEDDING_BACKEND, VECTOR_STORE } from './semantic-cache.tokens';
import type { EmbeddingBackend } from './embedding-backend.interface';
import type { VectorStore } from './vector-store.interface';
import { lastUserMessageText } from './last-user-message';
import { EmbeddingCircuitBreaker } from './embedding-circuit-breaker';

@Injectable()
export class SemanticCacheService {
  private readonly circuit = new EmbeddingCircuitBreaker(3);

  constructor(
    @Inject(EMBEDDING_BACKEND) private readonly embedding: EmbeddingBackend,
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore,
    private readonly config: ConfigService,
    private readonly appMetrics: AppMetricsService,
    private readonly loggingService: LoggingService,
  ) {}

  async lookup(
    request: ChatRequestDto,
    clientId: ClientId,
  ): Promise<CachedChatResponse | null> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return null;
    const text = lastUserMessageText(request);
    if (!text) return null;
    if (this.circuit.isCircuitOpen()) {
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      return null;
    }
    try {
      const vector = await this.embedding.embed(text);
      this.circuit.recordEmbedSuccess();
      const hits = await this.vectorStore.knn({
        vector,
        modelAlias: asModelAlias(request.modelAlias),
        clientId,
        k: cfg.k,
      });
      const best = hits[0];
      if (!best || best.similarity < cfg.minSimilarity) {
        this.appMetrics.recordSemanticCacheLookup(
          asModelAlias(request.modelAlias),
          'below-threshold',
        );
        return null;
      }
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'hit',
      );
      return best.reply;
    } catch {
      this.circuit.recordEmbedFailure();
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      return null; // fail-open
    }
  }

  /** G1: caller MUSI await. Zwraca wektor do reuse (lookup miss → SET bez drugiego embed). */
  async storeReply(
    request: ChatRequestDto,
    reply: CachedChatResponse,
    clientId: ClientId,
    reusedVector?: number[],
  ): Promise<void> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return;
    const text = lastUserMessageText(request);
    if (!text) return;
    if (this.circuit.isCircuitOpen()) return;
    try {
      const vector = reusedVector ?? (await this.embedding.embed(text));
      this.circuit.recordEmbedSuccess();
      await this.vectorStore.upsert({
        vector,
        text,
        modelAlias: asModelAlias(request.modelAlias),
        clientId,
        reply,
        ttlSeconds: cfg.ttl,
      });
    } catch {
      this.circuit.recordEmbedFailure();
    }
  }

  async probeEmbedding(): Promise<boolean> {
    try {
      await this.embedding.embed('ping');
      return true;
    } catch {
      return false;
    }
  }
}
```

`ChatResponseData` → `CachedChatResponse` składa guard (jak dziś exact SET), nie ten serwis.

#### `src/cache/semantic/semantic-cache.module.ts` — NOWY

```ts
import { Module } from '@nestjs/common';
import { AppMetricsModule } from '../../observability/app-metrics/app-metrics.module';
import { EMBEDDING_BACKEND, VECTOR_STORE } from './semantic-cache.tokens';
import { OllamaEmbeddingAdapter } from './adapters/ollama-embedding.adapter';
import { RedisVectorStoreAdapter } from './adapters/redis-vector-store.adapter';
import { SemanticCacheService } from './semantic-cache.service';

@Module({
  imports: [AppMetricsModule],
  providers: [
    OllamaEmbeddingAdapter,
    RedisVectorStoreAdapter,
    { provide: EMBEDDING_BACKEND, useExisting: OllamaEmbeddingAdapter },
    { provide: VECTOR_STORE, useExisting: RedisVectorStoreAdapter },
    SemanticCacheService,
  ],
  exports: [SemanticCacheService, EMBEDDING_BACKEND],
})
export class SemanticCacheModule {}
```

Nie importować tego modułu, gdy `semanticCache.enabled === false` (oszczędza probe / circuit).

#### `src/cache/cache.module.ts`

**Przed:**

```ts
const imports = [
  NoopCacheModule,
  AppMetricsModule,
  ...(options.includeRedisStack ? [RedisCacheModule] : []),
];
const exports: Array<
  | typeof CACHE_BACKEND
  | typeof CacheRegistryService
  | typeof RedisCacheModule
  | typeof ResponseCacheService
> = [CACHE_BACKEND, CacheRegistryService, ResponseCacheService];
```

**Po:**

```ts
const semanticEnabled = process.env.SEMANTIC_CACHE_ENABLED === 'true';
const imports = [
  NoopCacheModule,
  AppMetricsModule,
  ...(options.includeRedisStack ? [RedisCacheModule] : []),
  ...(semanticEnabled ? [SemanticCacheModule] : []),
];
const exports: Array<
  | typeof CACHE_BACKEND
  | typeof CacheRegistryService
  | typeof RedisCacheModule
  | typeof ResponseCacheService
  | typeof SemanticCacheModule
> = [CACHE_BACKEND, CacheRegistryService, ResponseCacheService];
if (semanticEnabled) exports.push(SemanticCacheModule);
```

`process.env` tylko w `register()` (bootstrap, jak `app.module` przy `RATE_LIMIT_SMART_ENABLED`). Runtime adapterów = `getAppConfig`.

`CACHE_BACKEND` factory **bez** metod Search.

#### `src/cache/cache.tokens.ts`

Bez zmian (`CACHE_BACKEND` zostaje KV).

#### `src/cache/response-cache.service.ts`

Refaktor klucza exact (względem obecnego `generateCacheKey` bez `clientId`).

**Przed:**

```ts
  private generateCacheKey(
    request: ChatRequestDto,
    effectiveCallParams?: ProviderCallOptions,
  ): CacheKey {
    /* … */
    const payload = JSON.stringify({
      modelAlias: request.modelAlias,
      messages: request.messages,
      systemSignature,
      callParams: this.serializeCallParamsForCache(effectiveCallParams),
    });
```

**Po:**

```ts
  private generateCacheKey(
    request: ChatRequestDto,
    clientId: ClientId,
    effectiveCallParams?: ProviderCallOptions,
  ): CacheKey {
    /* … */
    const payload = JSON.stringify({
      modelAlias: request.modelAlias,
      clientId,
      messages: request.messages,
      systemSignature,
      callParams: this.serializeCallParamsForCache(effectiveCallParams),
    });
```

`getCachedResponse` / `setCachedResponse` / `invalidateCache`: dodać argument `clientId: ClientId` i przekazać do `generateCacheKey`. Istniejące wywołania w specach i guardzie zaktualizować.

#### `src/chat/services/chat-cache-guard.service.ts`

**Przed:**

```ts
  constructor(
    private readonly cacheService: ResponseCacheService,
    private readonly config: ConfigService,
    private readonly rateLimiter: SmartRateLimiterService,
    private readonly loggingService: LoggingService,
  ) { /* … */ }

  async getCachedIfAllowed(
    requestBody: ChatRequestDto,
    options: ProviderCallOptions,
  ): Promise<CachedChatResponse | null> {
    const skipCache = isToolingRequest(requestBody);
    if (skipCache) return null;
    const cachedResponse = await this.cacheService.getCachedResponse(
      requestBody,
      options,
    );
    /* … isCachedChatAllowedForModelAlias … */
  }

  async setCachedIfAllowed(
    requestBody: ChatRequestDto,
    response: ChatResponseData,
    options: ProviderCallOptions,
  ): Promise<void> {
    const skipCache = isToolingRequest(requestBody);
    if (!skipCache) {
      await this.cacheService.setCachedResponse(requestBody, response, options);
    }
  }
```

**Po:**

```ts
  constructor(
    private readonly cacheService: ResponseCacheService,
    private readonly config: ConfigService,
    private readonly rateLimiter: SmartRateLimiterService,
    private readonly loggingService: LoggingService,
    @Optional() private readonly semanticCache?: SemanticCacheService,
  ) { /* … */ }

  async getCachedIfAllowed(
    requestBody: ChatRequestDto,
    options: ProviderCallOptions,
    clientId: ClientId,
    gatewayKey: GatewayKey,
  ): Promise<CachedChatResponse | null> {
    if (
      isToolingRequest(requestBody) ||
      !gatewayKey ||
      clientId === 'unknown'
    ) {
      return null;
    }

    const exact = await this.cacheService.getCachedResponse(
      requestBody,
      clientId,
      options,
    );
    const gateway = getAppConfigOrThrow(this.config, 'gateway');
    if (exact && isCachedChatAllowedForModelAlias(gateway, requestBody.modelAlias)) {
      return exact;
    }

    if (!lastUserMessageText(requestBody) || !this.semanticCache) {
      return null;
    }
    const semantic = await this.semanticCache.lookup(requestBody, clientId);
    if (semantic && isCachedChatAllowedForModelAlias(gateway, requestBody.modelAlias)) {
      return semantic;
    }
    return null;
  }

  async setCachedIfAllowed(
    requestBody: ChatRequestDto,
    response: ChatResponseData,
    options: ProviderCallOptions,
    clientId: ClientId,
    gatewayKey: GatewayKey,
  ): Promise<void> {
    if (
      isToolingRequest(requestBody) ||
      !gatewayKey ||
      clientId === 'unknown'
    ) {
      return;
    }
    await this.cacheService.setCachedResponse(
      requestBody,
      response,
      clientId,
      options,
    );
    if (this.semanticCache && lastUserMessageText(requestBody)) {
      const cachedShape = /* ten sam kształt co ResponseCacheService.setCachedResponse */;
      await this.semanticCache.storeReply(requestBody, cachedShape, clientId); // G1: await, nie void
    }
  }
```

Żeby nie dublować mapowania `ChatResponseData` → `CachedChatResponse`, wydzielić `toCachedChatResponse(response)` w `response-cache.service.ts` i reuse w guardzie / `store`.

#### `src/chat/chat.service.ts`

**Przed:**

```ts
if (gatewayKey) {
  const cachedResponse = await this.cacheGuardService.getCachedIfAllowed(
    requestBody,
    options,
  );
  /* … */
}
/* … */
await this.cacheGuardService.setCachedIfAllowed(
  requestBody,
  chatResult,
  options,
);
```

**Po:**

```ts
if (gatewayKey) {
  const cachedResponse = await this.cacheGuardService.getCachedIfAllowed(
    requestBody,
    options,
    clientId,
    gatewayKey,
  );
  /* … */
}
/* … */
await this.cacheGuardService.setCachedIfAllowed(
  requestBody,
  chatResult,
  options,
  clientId,
  gatewayKey,
);
```

`executeStream` w v1 **bez** tych wywołań (Faza 5.A).

#### `src/chat/chat.module.ts`

Bez zmian listy providerów (`ChatCacheGuardService` już jest). `SemanticCacheService` przychodzi z globalnego `CacheModule` / `SemanticCacheModule`; `@Optional()` gdy flaga off.

#### `src/cache/adapters/redis-cache/redis-connection.service.ts`

Bez zmian API (`getClient()` wystarczy Search). Lua rate limit nietknięty.

---

### Krok 2.3 — Health i metryki (status: WYKONANY)

DTO z Fazy 1 (`checks.embeddings`, `consumers: semantic-cache`) już są. Tu wypełnienie runtime.

#### `src/health/health.service.ts`

**Przed:**

```ts
const redisRequired = isRedisRequiredFromConfig(this.config);
const redisCheck = redisRequired ? await this.checkRedis() : undefined;
const cacheCheck = this.checkCache(redisCheck);

const checks: HealthReadinessResponseDto['checks'] = {
  config: configCheck,
  cache: cacheCheck,
  ...(redisCheck ? { redis: redisCheck } : {}),
};

const allHealthy = [
  configCheck,
  cacheCheck,
  ...(redisCheck ? [redisCheck] : []),
].every((check) => check.status === 'healthy' || check.status === 'degraded');
```

**Po:**

```ts
const redisRequired = isRedisRequiredFromConfig(this.config);
const redisCheck = redisRequired ? await this.checkRedis() : undefined;
const cacheCheck = this.checkCache(redisCheck);
const embeddingsCheck = await this.checkEmbeddings();

const checks: HealthReadinessResponseDto['checks'] = {
  config: configCheck,
  cache: cacheCheck,
  ...(redisCheck ? { redis: redisCheck } : {}),
  ...(embeddingsCheck ? { embeddings: embeddingsCheck } : {}),
};

const allHealthy = [
  configCheck,
  cacheCheck,
  ...(redisCheck ? [redisCheck] : []),
  ...(embeddingsCheck ? [embeddingsCheck] : []),
].every((check) => check.status === 'healthy' || check.status === 'degraded');
```

`checkEmbeddings()`: brak gdy `semanticCache.enabled !== true` → `undefined`. Gdy on: `semanticCache.probeEmbedding()`; `false` → `{ status: 'degraded', message: 'Embedding service unavailable' }` (fail-open, nie `unhealthy`). Constructor: `@Optional() private readonly semanticCache?: SemanticCacheService`.

**Przed (`publishMetrics`):**

```ts
const components: HealthMetricsSnapshot['components'] = {
  config: result.checks.config.status,
  cache: result.checks.cache.status,
};
if (result.checks.redis) {
  components.redis = result.checks.redis.status;
}
```

**Po:** dodatkowo `if (result.checks.embeddings) components.embeddings = result.checks.embeddings.status`.

`checkRedis` już woła `getRedisConsumersFromConfig` — po Kroku 2.1 `semantic-cache` pojawi się sam.

#### `src/health/health.module.ts`

Bez zmian, o ile `SemanticCacheModule` jest globalnie wyeksportowany z `CacheModule`. W testach health mockować `@Optional()` semantic.

#### `src/health/dto/health-readiness-response.dto.ts` / `health-redis-check-item.dto.ts`

Bez zmian kontraktu (Faza 1). Opcjonalnie dopisać w opisie `redis`: „or semantic cache”.

#### `src/observability/app-metrics/interfaces/app-metrics-backend.interface.ts`

**Przed:**

```ts
export type HealthComponent = 'config' | 'redis' | 'cache';
```

**Po:**

```ts
export type HealthComponent = 'config' | 'redis' | 'cache' | 'embeddings';
export type SemanticCacheLookupResult = 'hit' | 'below-threshold' | 'error';
```

Na `AppMetricsBackend` i `AppMetricsService` dodać:

```ts
recordSemanticCacheLookup(model: ModelAlias, result: SemanticCacheLookupResult): void;
```

`recordCacheAccess` zostaje dla **exact** (hit/miss).

#### `src/observability/app-metrics/prometheus.service.ts`

**Przed:** tylko `gateway_cache_access_total{model,hit}`.

**Po:** nowy counter

```ts
const semanticCacheLookupTotal = new Counter({
  name: 'gateway_semantic_cache_lookup_total',
  help: 'Semantic cache lookup outcomes',
  labelNames: ['model', 'result'],
  registers: [this.registry],
});
```

i eksport w `metrics`. Gauge `gateway_health_status{component=embeddings}` działa przez istniejący `setComponentHealth` po rozszerzeniu unii.

#### Adaptery Prometheus / noop + `app-metrics.service.ts`

**Przed:** brak `recordSemanticCacheLookup`.

**Po:** delegacja do countera / no-op. `prometheus-app-metrics.adapter.spec.ts`: asercja `gateway_health_status{component="embeddings"}` gdy snapshot go zawiera.

---

### Krok 2.4 — Testy jednostkowe (status: WYKONANY)

Fake `EmbeddingBackend` (stały wektor) + fake `VectorStore`. Bez sieci, bez Redis, bez Ollamy.

#### `src/cache/semantic/last-user-message.spec.ts` — NOWY

Pusty content / brak usera → `null`; ostatni user wygrywa; G3: zwrócony string === surowy `content` (bez `search_query:`).

#### `src/cache/semantic/embedding-circuit-breaker.spec.ts` — NOWY

```ts
it('opens after N failures (G2: += not ==)', () => {
  const c = new EmbeddingCircuitBreaker(3);
  c.recordEmbedFailure();
  c.recordEmbedFailure();
  expect(c.isCircuitOpen()).toBe(false);
  c.recordEmbedFailure();
  expect(c.isCircuitOpen()).toBe(true);
});
```

#### `src/cache/semantic/semantic-cache.service.spec.ts` — NOWY

Scenariusze: similarity 0.89 → below-threshold + null; 0.90 → hit; brak last-user → null bez `embed`; `embed` throw → null (fail-open) + `error`; `storeReply` z `reusedVector` **nie** woła `embed`; po `recordEmbedFailure` × 3 lookup nie woła `embed`.

#### `src/cache/semantic/index-name.spec.ts` — NOWY

`qwen3-embedding:0.6b` + 1024 → `qwen3-1024`; zmiana modelu/DIM → inna nazwa.

#### `src/cache/response-cache.service.spec.ts`

**Przed:** `getCachedResponse(request)` — klucz bez `clientId`.

**Po:** `getCachedResponse(request, TEST_CLIENT_ID)`; nowy test: ten sam request, inny `clientId` → inny klucz (regresja izolacji).

#### `src/chat/services/chat-cache-guard.service.spec.ts`

**Przed:** `getCachedIfAllowed(baseRequest, providerOptions)`.

**Po:** dodać `clientId` + `gatewayKey`; przypadki skip: tooling, `unknown`, pusty key; exact hit bez wołania semantic; exact miss → semantic; `setCachedIfAllowed` **await** `semantic.storeReply` (G1 — nie `void`).

#### `src/chat/chat.service.spec.ts`

Zaktualizować expect `getCachedIfAllowed` / `setCachedIfAllowed` o `clientId` i `gatewayKey`. `executeStream` nadal **nie** woła cache.

#### `src/health/health.service.spec.ts`

Flaga off → brak `checks.embeddings`; flaga on + probe fail → `embeddings: degraded` i `status: ready`.

---

## Faza 6 — Poprawki po raporcie (`src/` + docs) (status: NIE_ROZPOCZĘTY)

> **KOLEJNOŚĆ — OBOWIĄZKOWA:** **Faza 6 MUSI być w całości wykonana przed Fazą 3.**  
> Dalsze fazy idą numeracją: **3 → 4**; Faza 5 po v1.  
> Wyjątek od kolejności numerów: **2 ⇒ 6 ⇒ 3**. Nie startować Compose / Redis Stack / ollama-embedding (Faza 3), dopóki ta faza nie ma statusu WYKONANY.

Refaktor względem: Faza 2 / Kroki **2.2**, **2.3**, **2.4** (WYKONANY) oraz docs z Fazy 1 (known limitation partycji — §0).  
Źródło: raport zgodności 2026-08-25 + zamknięte decyzje §0.  
Cel: domknąć kontrakt warstwy w kodzie i dokumentacji **bez** zmian Compose (to Faza 3) i **bez** żywego Redis Search (to Faza 4).

Stałe w kodzie (bez nowych zmiennych env): `openAfter = 3`, `CIRCUIT_COOLDOWN_MS = 30_000`, `EMBEDDING_PROBE_TIMEOUT_MS = 2000` (musi być **< 3 s** healthchecka gatewaya), `EMBEDDINGS_PROBE_REFRESH_MS = 5000` (jak scrape metryk).

Kolejność w tej fazie: circuit → port embed timeout → serwis lookup/store/probe → guard + `ChatService` → health → docs → unit.

---

### Krok 6.1 — Circuit breaker: half-open i odzysk (status: NIE_ROZPOCZĘTY)

Refaktor względem: Faza 2 / Krok 2.2 `embedding-circuit-breaker.ts` (WYKONANY; G2: `+=` bez half-open).

#### `src/cache/semantic/embedding-circuit-breaker.ts`

**Przed:**
```ts
export class EmbeddingCircuitBreaker {
  private failures = 0;
  private readonly openAfter: number;

  constructor(openAfter = 3) {
    this.openAfter = openAfter;
  }

  isCircuitOpen(): boolean {
    return this.failures >= this.openAfter;
  }

  recordEmbedFailure(): void {
    this.failures += 1;
  }

  recordEmbedSuccess(): void {
    this.failures = 0;
  }
}
```

**Po:** (plik w całości — stany closed → open → half-open; jeden trial po cooldown)
```ts
export class EmbeddingCircuitBreaker {
  private failures = 0;
  private readonly openAfter: number;
  private readonly cooldownMs: number;
  private openedAtMs = 0;
  private trialInFlight = false;

  constructor(openAfter = 3, cooldownMs = 30_000) {
    this.openAfter = openAfter;
    this.cooldownMs = cooldownMs;
  }

  /**
   * Hot path: true = nie wołaj embed().
   * Po cooldown wpuszcza dokładnie jeden trial (half-open).
   */
  shouldSkipEmbed(): boolean {
    if (this.failures < this.openAfter) return false;
    const cooledDown = Date.now() - this.openedAtMs >= this.cooldownMs;
    if (!cooledDown) return true;
    if (this.trialInFlight) return true;
    this.trialInFlight = true;
    return false;
  }

  /** true tylko w oknie open (cooldown jeszcze trwa) — do logów / testów. */
  isCircuitOpen(): boolean {
    return (
      this.failures >= this.openAfter &&
      Date.now() - this.openedAtMs < this.cooldownMs
    );
  }

  recordEmbedFailure(): void {
    this.failures += 1;
    this.trialInFlight = false;
    if (this.failures >= this.openAfter) {
      this.openedAtMs = Date.now();
    }
  }

  recordEmbedSuccess(): void {
    this.failures = 0;
    this.openedAtMs = 0;
    this.trialInFlight = false;
  }
}
```

`shouldSkipEmbed()` **nie** jest używane w `probeEmbedding()` — probe zawsze może próbować (odzysk przez `/ready`).

---

### Krok 6.2 — Timeout probe na porcie embed (status: NIE_ROZPOCZĘTY)

Refaktor względem: Faza 2 / Krok 2.2 `EmbeddingBackend` + `OllamaEmbeddingAdapter.embed` (WYKONANY; zawsze `EMBEDDING_TIMEOUT_MS`).

Throttle samego `/ready` nie wystarczy: pierwsze trafienie i tak czeka do 5 s, a Docker `HEALTHCHECK` ma timeout **3 s**. Probe musi mieć **krótszy** timeout.

#### `src/cache/semantic/embedding-backend.interface.ts`

**Przed:**
```ts
export interface EmbeddingBackend {
  isAvailable(): boolean;
  embed(text: string): Promise<number[]>;
}
```

**Po:**
```ts
export interface EmbeddingBackend {
  isAvailable(): boolean;
  /** timeoutMs nadpisuje SEMANTIC timeout (probe /ready). */
  embed(text: string, timeoutMs?: number): Promise<number[]>;
}
```

Fake w specach: drugi argument ignorować.

#### `src/cache/semantic/adapters/ollama-embedding.adapter.ts` (`embed`)

**Przed:**
```ts
  async embed(text: string): Promise<number[]> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    const url = `${cfg.embeddingBaseUrl.replace(/\/$/, '')}/api/embed`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.embeddingTimeoutMs);
```

**Po:**
```ts
  async embed(text: string, timeoutMs?: number): Promise<number[]> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    const url = `${cfg.embeddingBaseUrl.replace(/\/$/, '')}/api/embed`;
    const budget = timeoutMs ?? cfg.embeddingTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budget);
```

Reszta metody bez zmian. Warmup `onModuleInit` nadal `this.embed('warmup')` (pełny timeout, fail-open, **nie** woła circuit).

---

### Krok 6.3 — Lookup zwraca wektor; Redis ≠ circuit embed (status: NIE_ROZPOCZĘTY)

Refaktor względem: Faza 2 / Krok 2.2 `SemanticCacheService` (WYKONANY).

Nowy typ (dopisać w `semantic-cache.service.ts` albo osobny plik `semantic-lookup-result.ts`):

```ts
export type SemanticLookupResult = {
  reply: CachedChatResponse | null;
  vector: number[] | null;
};
```

#### `src/cache/semantic/semantic-cache.service.ts`

**Przed** (`lookup` zwraca `CachedChatResponse | null`; jeden `try/catch` na embed+knn; `isCircuitOpen()` przed embed; `probeEmbedding` bez circuit i z pełnym timeoutem):
```ts
  async lookup(
    request: ChatRequestDto,
    clientId: ClientId,
  ): Promise<CachedChatResponse | null> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return null;
    const text = lastUserMessageText(request);
    if (!text) return null;
    if (this.circuit.isCircuitOpen()) {
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      return null;
    }
    try {
      const vector = await this.embedding.embed(text);
      this.circuit.recordEmbedSuccess();
      const hits = await this.vectorStore.knn({ /* … */ });
      /* … hit / below-threshold … */
      return best.reply;
    } catch (err: unknown) {
      this.circuit.recordEmbedFailure();
      /* … */
      return null;
    }
  }

  async probeEmbedding(): Promise<boolean> {
    try {
      await this.embedding.embed('ping');
      return true;
    } catch {
      return false;
    }
  }
```

**Po:**
```ts
  private readonly circuit = new EmbeddingCircuitBreaker(3, 30_000);

  async lookup(
    request: ChatRequestDto,
    clientId: ClientId,
  ): Promise<SemanticLookupResult> {
    const empty: SemanticLookupResult = { reply: null, vector: null };
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return empty;
    const text = lastUserMessageText(request);
    if (!text) return empty;
    if (this.circuit.shouldSkipEmbed()) {
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      return empty;
    }
    let vector: number[];
    try {
      vector = await this.embedding.embed(text);
      this.circuit.recordEmbedSuccess();
    } catch (err: unknown) {
      this.circuit.recordEmbedFailure();
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Semantic cache lookup failed (fail-open): ${msg}`);
      return empty;
    }
    try {
      const hits = await this.vectorStore.knn({
        vector,
        modelAlias: asModelAlias(request.modelAlias),
        clientId,
        k: cfg.k,
      });
      const best = hits[0];
      if (!best || best.similarity < cfg.minSimilarity) {
        this.appMetrics.recordSemanticCacheLookup(
          asModelAlias(request.modelAlias),
          'below-threshold',
        );
        return { reply: null, vector };
      }
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'hit',
      );
      return { reply: best.reply, vector };
    } catch (err: unknown) {
      // Redis Search — fail-open; NIE recordEmbedFailure; wektor zostaje na SET
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Semantic cache KNN failed (fail-open): ${msg}`);
      this.appMetrics.recordSemanticCacheLookup(
        asModelAlias(request.modelAlias),
        'error',
      );
      return { reply: null, vector };
    }
  }

  async storeReply(
    request: ChatRequestDto,
    reply: CachedChatResponse,
    clientId: ClientId,
    reusedVector?: number[],
  ): Promise<void> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return;
    const text = lastUserMessageText(request);
    if (!text) return;
    if (!reusedVector && this.circuit.shouldSkipEmbed()) return;
    try {
      const vector = reusedVector ?? (await this.embedding.embed(text));
      if (!reusedVector) this.circuit.recordEmbedSuccess();
      await this.vectorStore.upsert({
        vector,
        text,
        modelAlias: asModelAlias(request.modelAlias),
        clientId,
        reply,
        ttlSeconds: cfg.ttl,
      });
    } catch (err: unknown) {
      if (!reusedVector) this.circuit.recordEmbedFailure();
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Semantic cache store failed (fail-open): ${msg}`);
    }
  }

  /** Ominąć shouldSkipEmbed. Sukces zamyka circuit. Porażka NIE otwiera obwodu. */
  async probeEmbedding(): Promise<boolean> {
    try {
      await this.embedding.embed('ping', 2_000);
      this.circuit.recordEmbedSuccess();
      return true;
    } catch {
      return false;
    }
  }
```

`storeReply` z `reusedVector`: błąd `upsert` **nie** woła `recordEmbedFailure`.

---

### Krok 6.4 — Guard + `ChatService`: jeden embed na miss (status: NIE_ROZPOCZĘTY)

Refaktor względem: Faza 2 / Krok 2.2 `ChatCacheGuardService` + `ChatService.executeChat` (WYKONANY; `storeReply` bez 4. argumentu).

`getCachedIfAllowed` i `setCachedIfAllowed` to osobne wywołania — wektor trzeba **przekazać** przez `ChatService` (ten sam `requestBody` nie wystarcza jako kontrakt; jawny argument).

#### `src/chat/services/chat-cache-guard.service.ts`

**Przed:**
```ts
    const semantic = await this.semanticCache.lookup(requestBody, clientId);
    if (semantic && isCachedChatAllowedForModelAlias(gateway, modelAlias)) {
      return semantic;
    }

    return null;
```

oraz
```ts
      await this.semanticCache.storeReply(
        requestBody,
        toCachedChatResponse(response),
        clientId,
      );
```

**Po:**
```ts
  async getCachedIfAllowed(
    requestBody: ChatRequestDto,
    options: ProviderCallOptions,
    clientId: ClientId,
    gatewayKey: GatewayKey,
  ): Promise<{
    cached: CachedChatResponse | null;
    reusedVector?: number[];
  }> {
    if (
      isToolingRequest(requestBody) ||
      !gatewayKey ||
      clientId === 'unknown'
    ) {
      return { cached: null };
    }

    const exact = await this.cacheService.getCachedResponse(
      requestBody,
      clientId,
      options,
    );

    const gateway = getAppConfigOrThrow(this.config, 'gateway');
    const modelAlias = requestBody.modelAlias;

    if (exact && isCachedChatAllowedForModelAlias(gateway, modelAlias)) {
      return { cached: exact };
    }

    if (!lastUserMessageText(requestBody) || !this.semanticCache) {
      return { cached: null };
    }

    const semantic = await this.semanticCache.lookup(requestBody, clientId);
    if (
      semantic.reply &&
      isCachedChatAllowedForModelAlias(gateway, modelAlias)
    ) {
      return { cached: semantic.reply };
    }

    return {
      cached: null,
      reusedVector: semantic.vector ?? undefined,
    };
  }

  async setCachedIfAllowed(
    requestBody: ChatRequestDto,
    response: ChatResponseData,
    options: ProviderCallOptions,
    clientId: ClientId,
    gatewayKey: GatewayKey,
    reusedVector?: number[],
  ): Promise<void> {
    /* skip tooling / unknown — bez zmian */
    await this.cacheService.setCachedResponse(
      requestBody,
      response,
      clientId,
      options,
    );
    if (this.semanticCache && lastUserMessageText(requestBody)) {
      await this.semanticCache.storeReply(
        requestBody,
        toCachedChatResponse(response),
        clientId,
        reusedVector,
      );
    }
  }
```

Na semantic hit **nie** przekazujemy wektora do SET (brak zapisu). Na miss: `reusedVector` z lookup (może być `undefined`, gdy circuit pominął embed).

#### `src/chat/chat.service.ts` (`executeChat`)

**Przed:**
```ts
      const cachedResponse = await this.cacheGuardService.getCachedIfAllowed(
        requestBody,
        options,
        clientId,
        gatewayKey,
      );

      if (cachedResponse) {
        log.info('Chat cache hit');
        return {
          ...cachedResponse,
          conversationId: responseConversationId,
        };
      }
```

oraz
```ts
      await this.cacheGuardService.setCachedIfAllowed(
        requestBody,
        chatResult,
        options,
        clientId,
        gatewayKey,
      );
```

**Po:**
```ts
      const { cached: cachedResponse, reusedVector } =
        await this.cacheGuardService.getCachedIfAllowed(
          requestBody,
          options,
          clientId,
          gatewayKey,
        );

      if (cachedResponse) {
        log.info('Chat cache hit');
        return {
          ...cachedResponse,
          conversationId: responseConversationId,
        };
      }
```

oraz
```ts
      await this.cacheGuardService.setCachedIfAllowed(
        requestBody,
        chatResult,
        options,
        clientId,
        gatewayKey,
        reusedVector,
      );
```

`executeStream` nadal **bez** tych wywołań (Faza 5.A).

---

### Krok 6.5 — `/ready`: throttle + krótki probe (status: NIE_ROZPOCZĘTY)

Refaktor względem: Faza 2 / Krok 2.3 `HealthService.checkEmbeddings` / `getReadiness` (WYKONANY; żywy probe na każdym `evaluateReadiness()`, bez throttlingu).

Nie zmieniać Docker `HEALTHCHECK` (timeout 3 s) — to Faza 3 / istniejący compose.

#### `src/health/health.service.ts`

**Przed:**
```ts
  private static readonly SCRAPE_REFRESH_MS = 5_000;
  /* … */
  private lastScrapeRefreshAt = 0;
  private scrapeRefreshInFlight: Promise<void> | undefined;
```

oraz
```ts
  private async checkEmbeddings(): Promise<HealthCheckResult | undefined> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return undefined;
    if (!this.semanticCache) {
      return {
        status: 'degraded',
        message: 'Embedding service unavailable',
      };
    }
    const available = await this.semanticCache.probeEmbedding();
    if (!available) {
      return {
        status: 'degraded',
        message: 'Embedding service unavailable',
      };
    }
    return {
      status: 'healthy',
      message: 'Embedding service available',
    };
  }
```

**Po:** (dopisać pola obok scrape; `SCRAPE_REFRESH_MS` bez zmian)
```ts
  private static readonly SCRAPE_REFRESH_MS = 5_000;
  private static readonly EMBEDDINGS_PROBE_REFRESH_MS = 5_000;

  private lastEmbeddingsProbeAt = 0;
  private lastEmbeddingsCheck: HealthCheckResult | undefined;
  private embeddingsProbeInFlight: Promise<HealthCheckResult> | undefined;
```

```ts
  private async checkEmbeddings(): Promise<HealthCheckResult | undefined> {
    const cfg = getAppConfigOrThrow(this.config, 'semanticCache');
    if (!cfg.enabled) return undefined;
    if (!this.semanticCache) {
      return {
        status: 'degraded',
        message: 'Embedding service unavailable',
      };
    }

    const now = Date.now();
    if (
      this.lastEmbeddingsCheck &&
      now - this.lastEmbeddingsProbeAt < HealthService.EMBEDDINGS_PROBE_REFRESH_MS
    ) {
      return this.lastEmbeddingsCheck;
    }
    if (this.embeddingsProbeInFlight) {
      return this.embeddingsProbeInFlight;
    }

    this.embeddingsProbeInFlight = (async () => {
      const available = await this.semanticCache!.probeEmbedding();
      const result: HealthCheckResult = available
        ? { status: 'healthy', message: 'Embedding service available' }
        : { status: 'degraded', message: 'Embedding service unavailable' };
      this.lastEmbeddingsCheck = result;
      this.lastEmbeddingsProbeAt = Date.now();
      return result;
    })().finally(() => {
      this.embeddingsProbeInFlight = undefined;
    });

    return this.embeddingsProbeInFlight;
  }
```

`getReadiness()` nadal woła `evaluateReadiness()` (bez obejścia cache probe). Sukces probe zamyka circuit (krok 6.3) — `/ready` `embeddings: healthy` nie współistnieje z trwale otwartym obwodem.

---

### Krok 6.6 — Docs: known limitation partycji + fail-open (status: NIE_ROZPOCZĘTY)

Refaktor względem: Faza 1 / Krok 1.2 (WYKONANY) oraz pkt 12/18 w `anti-patterns.md` (pkt 12 mówi, że zmiana system promptu zmienia klucz cache — to **tylko exact**).

Nie zmieniamy wymiaru TAG (nadal `modelAlias` + `clientId`). TAG `systemSignature` / params = poza v1.

#### `docs/anti-patterns.md` — NOWY pkt 20 (po pkt 19)

**Przed:** brak pkt 20; pkt 12 nie rozróżnia exact vs semantic.

**Po:** (dopisać)
```markdown
## 20) Assuming a system-prompt change invalidates semantic cache

**Don’t:** assume that editing `MASTER_SYSTEM_PROMPT.md` / per-alias prompts, or changing call params (`responseFormat`, `temperature`, `seed`, …), drops semantic KNN hits. Exact cache hashes `systemSignature` and effective params; the Redis Search index partitions only on `modelAlias` + `clientId`. Old semantic replies can be served until TTL (`SEMANTIC_CACHE_TTL`). There is no bulk semantic invalidation.

**Do:** treat this as a v1 known limitation. Document it next to exact-vs-semantic lookup. Shorten `SEMANTIC_CACHE_TTL` if prompt/params churn is high. Do not lower the similarity threshold to “make up” for missing partitions. Adding `systemSignature` / params as TAG is a separate decision (out of v1).
```

Pkt 12: **nie przepisywać** (Faza 1 WYKONANY w tym pliku planu jako historia). W pkt 20 jest odniesienie. Opcjonalnie jedno zdanie w pkt 12 „(exact cache only; semantic: see 20)” — jeśli edycja pkt 12 w docs przy implementacji, treść Fazy 1 w planie zostaje.

#### `docs/pl/anty_patterny.md` — NOWY pkt 20 (lustro PL)

```markdown
## 20) Założenie, że zmiana system promptu unieważnia cache semantyczny

**Nie rób:** zakładać, że edycja `MASTER_SYSTEM_PROMPT.md` / promptów per alias albo zmiana parametrów wywołania (`responseFormat`, `temperature`, `seed`, …) kasuje trafienia KNN. Exact cache hashuje `systemSignature` i efektywne params; indeks Redis Search partycjonuje tylko po `modelAlias` + `clientId`. Stare odpowiedzi semantyczne mogą być serwowane do końca TTL (`SEMANTIC_CACHE_TTL`). Nie ma hurtowej invalidacji semantic.

**Rób:** traktuj to jako known limitation v1. Opisz obok kolejności lookup exact vs semantic. Skróć `SEMANTIC_CACHE_TTL`, gdy prompt/params często się zmieniają. Nie obniżaj progu podobieństwa, żeby „nadrobić” brak partycji. TAG `systemSignature` / params — osobna decyzja (poza v1).
```

#### `docs/configuration.md` — sekcja Semantic cache (`Fail-open` + dopisek po **Lookup order**)

**Przed:**
```markdown
**Fail-open:** when the embedding service or Redis Search is unavailable, the request is forwarded to the provider — the cache layer does not block chat. `GET /api/v1/health/ready` may report `checks.embeddings: degraded` without changing `status` to `not_ready`.
```

**Po:**
```markdown
**Fail-open:** when the embedding service or Redis Search is unavailable, the request is forwarded to the provider — the cache layer does not block chat. Degradation is **temporary**: the embedding circuit breaker recovers (half-open after cooldown; a successful `/ready` probe closes the circuit). `GET /api/v1/health/ready` may report `checks.embeddings: degraded` without changing `status` to `not_ready`. Embedding probes are throttled and use a timeout shorter than the gateway Docker HEALTHCHECK (3 s); `embeddings: healthy` must not coexist with a permanently open circuit.

**Partition (v1 known limitation):** semantic KNN is filtered only by `modelAlias` + `clientId`. Unlike exact cache, it does **not** include system-prompt signature or effective call parameters. A prompt or `responseFormat` change does not invalidate semantic entries (TTL is the bound). See `anti-patterns.md` §20.

**Miss path:** one embedding per new prompt — the vector from lookup is reused on store (no second `embed` after provider).
```

W wierszu tabeli `SEMANTIC_CACHE_ENABLED`: dopisać, że `true` w `.env.example` to przykład **lokalny**, nie certyfikat produkcji (wymaga Fazy 6 + 3 + 4).

#### `docs/pl/konfiguracja.md` — lustro PL tego samego bloku (`Fail-open` + partycja + miss).

---

### Krok 6.7 — Testy jednostkowe poprawek (status: NIE_ROZPOCZĘTY)

Refaktor względem: Faza 2 / Krok 2.4 (WYKONANY). Fake porty; bez Redis Stack / Ollamy.

#### `src/cache/semantic/embedding-circuit-breaker.spec.ts`

**Przed:** otwarcie po N failach; reset sukcesem **przed** otwarciem; brak odzysku po open.

**Po:** (dopisać)
```ts
  it('allows a single trial after cooldown (half-open)', () => {
    const c = new EmbeddingCircuitBreaker(3, 1_000);
    c.recordEmbedFailure();
    c.recordEmbedFailure();
    c.recordEmbedFailure();
    expect(c.shouldSkipEmbed()).toBe(true);
    jest.advanceTimersByTime(1_000);
    expect(c.shouldSkipEmbed()).toBe(false); // trial
    expect(c.shouldSkipEmbed()).toBe(true); // drugi request czeka na wynik trialu
  });

  it('should close after success on half-open trial', () => {
    const c = new EmbeddingCircuitBreaker(3, 1_000);
    c.recordEmbedFailure();
    c.recordEmbedFailure();
    c.recordEmbedFailure();
    jest.advanceTimersByTime(1_000);
    expect(c.shouldSkipEmbed()).toBe(false);
    c.recordEmbedSuccess();
    expect(c.isCircuitOpen()).toBe(false);
    expect(c.shouldSkipEmbed()).toBe(false);
  });
```

Użyć `jest.useFakeTimers()`.

#### `src/cache/semantic/semantic-cache.service.spec.ts`

**Przed:** `lookup` → `CachedChatResponse | null`; po 3 failach embed brak `embed()`; `storeReply` z `reusedVector` bez `embed`.

**Po:** asercje na `{ reply, vector }`; knn throw **nie** woła `recordEmbedFailure` (kolejne `lookup` nadal woła `embed`); miss zwraca `vector`; `probeEmbedding` sukces resetuje circuit po 3 failach; `probeEmbedding` fail **nie** otwiera circuitu; `storeReply` z wektorem + upsert throw nie otwiera circuitu.

#### `src/chat/services/chat-cache-guard.service.spec.ts`

**Przed:**
```ts
        expect(mockSemanticCache.storeReply).toHaveBeenCalledWith(
          baseRequest,
          expect.objectContaining({ /* … */ }),
          TEST_CLIENT_ID,
        );
```

**Po:** mock `lookup` zwraca `{ reply: null, vector: FIXED_VECTOR }`; `getCachedIfAllowed` → `{ cached: null, reusedVector: FIXED_VECTOR }`; `setCachedIfAllowed(..., FIXED_VECTOR)`:
```ts
        expect(mockSemanticCache.storeReply).toHaveBeenCalledWith(
          baseRequest,
          expect.objectContaining({ /* … */ }),
          TEST_CLIENT_ID,
          FIXED_VECTOR,
        );
```

#### `src/chat/chat.service.spec.ts`

**Przed:** `getCachedIfAllowed` → `CachedChatResponse | null`.

**Po:** mock `{ cached: null }` / `{ cached: hit }`; `setCachedIfAllowed` expect z 6. argumentem (`reusedVector`). `executeStream` nadal bez cache.

#### `src/health/health.service.spec.ts`

**Przed:** każde `getReadiness()` przy fladze on woła `probeEmbedding`.

**Po:** dwa `getReadiness()` w oknie 5 s → `probeEmbedding` **raz**; po sukcesie probe circuit w serwisie zamknięty (jeśli test składa prawdziwy `SemanticCacheService`; inaczej asercja że `probeEmbedding` jest wołane i wynik cachowany). Nadal: probe fail → `embeddings: degraded`, `status: ready`.

---

**Po Fazie 6:** Faza 3 (Compose). Nie odwrotnie.

---

## Faza 3 — Infrastruktura Compose i skrypty (status: NIE_ROZPOCZĘTY)

> **Nie startować tej fazy, dopóki Faza 6 nie jest WYKONANA.** Kolejność: **2 ⇒ 6 ⇒ 3 → 4**.

### Krok 3.1 — Redis Stack (status: NIE_ROZPOCZĘTY)

Tylko istniejący `deployment/docker/docker-compose.redis.yml` — **bez** nowego pliku Compose dla Redis. Pin tagu `redis/redis-stack-server` (np. `7.4.2-v2`; potwierdzić tag przy implementacji). `REDIS_ARGS`, nie `command:`.

#### `deployment/docker/docker-compose.redis.yml`

**Przed:**

```yaml
redis:
  image: redis:7-alpine
  container_name: ai-gateway-redis
  restart: unless-stopped
  ports:
    - '0.0.0.0:6380:6380'
  command: >-
    redis-server
    --port 6380
    --maxmemory ${REDIS_MAX_MEMORY:-256mb}
    --maxmemory-policy noeviction
  healthcheck:
    test: ['CMD', 'redis-cli', '-p', '6380', 'ping']
```

**Po:**

```yaml
redis:
  image: redis/redis-stack-server:latest
  container_name: ai-gateway-redis
  restart: unless-stopped
  ports:
    - '0.0.0.0:6380:6380'
  environment:
    REDIS_ARGS: '--port 6380 --maxmemory ${REDIS_MAX_MEMORY:-500mb} --maxmemory-policy noeviction'
  healthcheck:
    test: ['CMD', 'redis-cli', '-p', '6380', 'ping']
    interval: 10s
    timeout: 3s
    retries: 5
```

Sanity po starcie (nie w YAML): `docker exec ai-gateway-redis redis-cli -p 6380 MODULE LIST` zawiera `search`. Nadpisanie `command:` jest zakazane (znika Search).

`test/integration/docker-compose.redis.yml` (`redis:7-alpine`) **bez zmian** w tym kroku.

---

### Krok 3.2 — Ollama embedding (status: NIE_ROZPOCZĘTY)

#### `deployment/docker/docker-compose.ollama-embedding.yml` — NOWY

Osobny volume od czatowej Ollamy. CPU, bez `deploy.resources.reservations.devices` GPU. Host `11435:11434`. Obraz `ollama/ollama:latest` (bez build). Model `qwen3-embedding:0.6b` ładuje one-shot `ollama-pull` na wspólny volume `ollama-embedding-data`; po sukcesie kontener `ollama-pull` kończy się i jest automatycznie usuwany — long-running zostaje tylko `ollama-embedding`.

```yaml
name: ai-provider-gateway-ollama-embedding

# Embedding only (npm run infra:up / część bazy docker:up)
# NIE współdziel volume z docker-compose.ollama.yml (czat llama3.1:8b)
# Model: one-shot ollama-pull → wspólny volume → kontener usuwany po sukcesie

services:
  ollama-pull:
    image: ollama/ollama:latest
    container_name: ai-gateway-ollama-pull
    volumes:
      - ollama-embedding-data:/root/.ollama
    networks:
      - ai-gateway-network
    entrypoint: ['/bin/sh', '-c']
    command: >
      ollama serve &
      until ollama list >/dev/null 2>&1; do sleep 1; done &&
      ollama pull qwen3-embedding:0.6b &&
      ollama list | grep -Fq qwen3-embedding:0.6b
    restart: 'no'

  ollama-embedding:
    image: ollama/ollama:latest
    container_name: ai-gateway-ollama-embedding
    restart: unless-stopped
    depends_on:
      ollama-pull:
        condition: service_completed_successfully
    environment:
      OLLAMA_KEEP_ALIVE: '-1'
    ports:
      - '11435:11434'
    networks:
      - ai-gateway-network
    volumes:
      - ollama-embedding-data:/root/.ollama
    healthcheck:
      test: ['CMD', 'ollama', 'list']
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 90s

volumes:
  ollama-embedding-data:

networks:
  ai-gateway-network:
    external: true
    name: ai-gateway-network
```

Po sukcesie `ollama-pull` kończy pracę (`restart: "no"`, `service_completed_successfully`) i jest usuwany — long-running zostaje tylko `ollama-embedding`. W sieci Dockera gateway: `EMBEDDING_BASE_URL=http://ollama-embedding:11434`. Na hoście (`start:dev`): `http://localhost:11435`.

---

### Krok 3.3 — Skrypty i deploy (status: NIE_ROZPOCZĘTY)

Nowa **baza**: gateway + Redis Stack + ollama-embedding. Czatowa Ollama nadal osobno.

Kontrakt §0 Health: istniejący `HEALTHCHECK` gatewaya (`GET /api/v1/health/ready`, timeout **3 s** w `deployment/docker/Dockerfile` i `docker-compose.yml`) **zostaje** — tego kroku nie używamy do wydłużenia timeoutu pod `EMBEDDING_TIMEOUT_MS=5000`. Budżet probe embeddings musi się w nim zmieścić.

#### `package.json` (`scripts`)

**Przed:**

```json
    "docker:up": "docker-compose --env-file .env -f deployment/docker/docker-compose.yml up --build -d",
    "docker:up:full": "docker-compose -p ai-provider-gateway --env-file .env -f deployment/docker/docker-compose.yml -f deployment/docker/docker-compose.redis.yml -f deployment/docker/docker-compose.monitoring.yml up -d",
    "docker:down": "docker-compose -p ai-provider-gateway --env-file .env -f deployment/docker/docker-compose.yml -f deployment/docker/docker-compose.redis.yml -f deployment/docker/docker-compose.monitoring.yml -f deployment/docker/docker-compose.ollama.yml -f deployment/docker/docker-compose.dev.yml down",
```

**Po:**

```json
    "docker:up": "docker-compose -p ai-provider-gateway --env-file .env -f deployment/docker/docker-compose.yml -f deployment/docker/docker-compose.redis.yml -f deployment/docker/docker-compose.ollama-embedding.yml up --build -d",
    "docker:up:full": "docker-compose -p ai-provider-gateway --env-file .env -f deployment/docker/docker-compose.yml -f deployment/docker/docker-compose.redis.yml -f deployment/docker/docker-compose.ollama-embedding.yml -f deployment/docker/docker-compose.monitoring.yml up -d",
    "infra:up": "docker-compose -p ai-provider-gateway --env-file .env -f deployment/docker/docker-compose.redis.yml -f deployment/docker/docker-compose.ollama-embedding.yml up -d",
    "infra:down": "docker-compose -p ai-provider-gateway --env-file .env -f deployment/docker/docker-compose.redis.yml -f deployment/docker/docker-compose.ollama-embedding.yml down",
    "docker:down": "docker-compose -p ai-provider-gateway --env-file .env -f deployment/docker/docker-compose.yml -f deployment/docker/docker-compose.redis.yml -f deployment/docker/docker-compose.ollama-embedding.yml -f deployment/docker/docker-compose.monitoring.yml -f deployment/docker/docker-compose.ollama.yml -f deployment/docker/docker-compose.dev.yml down",
```

`docker:up:ollama` **bez zmian** (czat). `docker:up:redis` może zostać jako gateway+Stack bez embeddingu. `docker:ps` / `docker:clean` / `docker:logs` — dokleić `-f …ollama-embedding.yml`.

#### `Makefile`

**Przed:**

```makefile
COMPOSE_REDIS := $(DOCKER_DIR)/docker-compose.redis.yml
COMPOSE_OLLAMA := $(DOCKER_DIR)/docker-compose.ollama.yml

## docker-up: Start MVP (gateway only)
docker-up:
	$(COMPOSE) -f $(COMPOSE_BASE) up -d

## docker-up-full: Start full production stack (gateway + redis + monitoring)
docker-up-full:
	$(COMPOSE) -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_MONITORING) up -d
```

**Po:**

```makefile
COMPOSE_REDIS := $(DOCKER_DIR)/docker-compose.redis.yml
COMPOSE_EMBEDDING := $(DOCKER_DIR)/docker-compose.ollama-embedding.yml
COMPOSE_OLLAMA := $(DOCKER_DIR)/docker-compose.ollama.yml

## docker-up: Base stack (gateway + Redis Stack + ollama-embedding)
docker-up:
	$(COMPOSE) -p ai-provider-gateway -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_EMBEDDING) up -d

## docker-up-full: Base + Prometheus + Grafana
docker-up-full:
	$(COMPOSE) -p ai-provider-gateway -f $(COMPOSE_BASE) -f $(COMPOSE_REDIS) -f $(COMPOSE_EMBEDDING) -f $(COMPOSE_MONITORING) up -d

## infra-up: Redis Stack + embedding (for start:dev)
infra-up:
	$(COMPOSE) -p ai-provider-gateway -f $(COMPOSE_REDIS) -f $(COMPOSE_EMBEDDING) up -d
```

`.PHONY` i `docker-down` — dodać `COMPOSE_EMBEDDING`.

#### `deployment/scripts/deploy-production.sh`

**Przed:**

```bash
compose_files() {
  local files=(
    -f deployment/docker/docker-compose.yml
  )
  if [[ "${DEPLOY_MODE}" == "production" ]]; then
    files+=(-f deployment/docker/docker-compose.redis.yml)
  fi
  files+=(
    -f deployment/docker/docker-compose.monitoring.yml
    -f "${OVERLAY_BINDS}"
  )
  printf '%s\n' "${files[@]}"
}
```

**Po:**

```bash
compose_files() {
  local files=(
    -f deployment/docker/docker-compose.yml
  )
  if [[ "${DEPLOY_MODE}" == "production" ]]; then
    files+=(-f deployment/docker/docker-compose.redis.yml)
    files+=(-f deployment/docker/docker-compose.ollama-embedding.yml)
  fi
  files+=(
    -f deployment/docker/docker-compose.monitoring.yml
    -f "${OVERLAY_BINDS}"
  )
  printf '%s\n' "${files[@]}"
}
```

Redis już był w production; embedding doklejamy do tej samej gałęzi. Czatowej Ollamy tu nie ma.

---

## Faza 4 — Testy integracyjne i E2E (status: NIE_ROZPOCZĘTY)

### Krok 4.1 — Compose Redis Stack tylko pod wektory (status: NIE_ROZPOCZĘTY)

`test/integration/docker-compose.redis.yml` (`redis:7-alpine`, mapowanie `6380:6379`) **zostaje** dla KV / rate-limit.

#### `test/integration/docker-compose.redis-stack.yml` — NOWY

```yaml
# Vector integration only — NIE używać z test:integration (alpine).
# npm run test:integration:semantic:redis:up

services:
  redis-stack-integration:
    image: redis/redis-stack-server:7.4.2-v2
    container_name: integration-redis-stack-test
    ports:
      - '6381:6380'
    environment:
      REDIS_ARGS: '--port 6380 --maxmemory 128mb --maxmemory-policy noeviction'
    healthcheck:
      test: ['CMD', 'redis-cli', '-p', '6380', 'ping']
      interval: 2s
      timeout: 3s
      retries: 15
    tmpfs:
      - /data
```

Port **6381** na hoście — bez kolizji z alpine na 6380 i z dev Stack na 6380.

#### `package.json`

**Przed:** brak skryptów semantic integration.

**Po:**

```json
    "test:integration:semantic:redis:up": "docker compose -p integration-redis-stack-test -f test/integration/docker-compose.redis-stack.yml up -d --wait",
    "test:integration:semantic:redis:down": "docker compose -p integration-redis-stack-test -f test/integration/docker-compose.redis-stack.yml down -v",
    "pretest:integration:semantic": "npm run test:integration:semantic:redis:up",
    "posttest:integration:semantic": "npm run test:integration:semantic:redis:down",
    "test:integration:semantic": "cross-env REDIS_PORT=6381 SEMANTIC_CACHE_ENABLED=true EMBEDDING_BASE_URL=http://127.0.0.1:9 jest --config ./test/jest-integration.json --runInBand --testPathPattern=semantic-cache"
```

(`cross-env` tylko jeśli już jest w repo; inaczej PowerShell-safe env w skrypcie `scripts/`.) CI: **bez** żywej Ollamy — `EMBEDDING_BASE_URL` celowo martwy; testy podmieniają `EMBEDDING_BACKEND` na fake.

### Krok 4.2 — Integration wektorowa (status: NIE_ROZPOCZĘTY)

#### `test/integration/gateway-semantic-cache.integration-spec.ts` — NOWY

- Bootstrap jak inne integration, ale `CacheModule` + `SemanticCacheModule`.
- `EMBEDDING_BACKEND`: fake zwracający **stały** `Float32Array(1024)` (ten sam wektor dla store i lookup).
- `VECTOR_STORE`: prawdziwy `RedisVectorStoreAdapter` + `RedisConnectionService` na `REDIS_PORT=6381`.
- Scenariusze: SET → KNN hit przy progu 0.90; inny `clientId` → miss (TAG); `FT.INFO` indeksu `qwen3-1024` (lub `semanticIndexName`).
- Nie wołać HTTP Ollamy.

### Krok 4.3 — E2E HTTP (status: NIE_ROZPOCZĘTY)

#### `test/e2e/helpers/create-e2e-app.ts` / env E2E

**Przed:** brak `SEMANTIC_CACHE_ENABLED` (runtime default `false` po Kroku 2.1).

**Po:** jawne `SEMANTIC_CACHE_ENABLED=false` w env E2E (albo mock `SemanticCacheService`), żeby suite nie wymagał Stack/Ollamy. Istniejący `gateway-chat-cache.e2e-spec.ts` zostaje exact-only.

Opcjonalnie NOWY `test/e2e/gateway-chat-semantic-cache.e2e-spec.ts`: fake embedding w module override; bez live modelu. Nie blokuje CI gdy flaga off.

---

## Faza 5 — Po v1 (osobno) (status: NIE_ROZPOCZĘTY)

Poza zakresem v1 poza punktem A gdy ktoś go świadomie odpali. Każdy podkrok `NIE_ROZPOCZĘTY`.

### Krok 5.A — Zapis exact + upsert wektora po `executeStream` (status: NIE_ROZPOCZĘTY)

Refaktor względem: `src/chat/chat.service.ts` `executeStream` (v1: zero cache). Wymaga złożenia pełnego `output` z chunków / `streamResult`.

**Przed** (koniec happy-path, po `emit(doneEvent)`):

```ts
emit(doneEvent);

const latency = Date.now() - startedAt;

log.info('Chat stream completed', {
  /* … */
});
```

**Po:**

```ts
      emit(doneEvent);

      const chatResult = this.responseBuilderService.buildChatResponse(
        {
          text: /* złożony output ze streamResult */,
          usage: usageMetadata,
          toolCalls,
          stopReason,
          usageDetails,
          systemFingerprint,
          thinkingContent,
        },
        resolved.providerName,
        asModelAlias(requestBody.modelAlias),
        requestId,
        responseConversationId,
        didFallback ? usedAlias : undefined,
        options,
        resolved.providerType,
      );
      await this.cacheGuardService.setCachedIfAllowed(
        requestBody,
        chatResult,
        options,
        clientId,
        gatewayKey,
      );

      const latency = Date.now() - startedAt;
      log.info('Chat stream completed', { /* … */ });
```

Lookup na streamie nadal **off** (klient już otworzył SSE). Replay SSE = 5.B.

### Krok 5.B — Replay SSE z cache (status: NIE_ROZPOCZĘTY)

Poza v1. Nie implementować, dopóki nie będzie osobnej decyzji. Miejsce: `executeStream` przed `runOnce` — gdy exact/semantic hit, emit `meta`/`delta`/`done` z zapisanego `output`. Poza zakresem v1.

### Krok 5.C — Wizard `config:init` (status: NIE_ROZPOCZĘTY)

Refaktor względem: `src/cli/services/prompts/server-prompt.service.ts` krok 5/5 (dziś cache + rate limit + Redis).

**Przed:**

```ts
const redisRequired = isRedisRequired({
  cache: {
    /* … */
  },
  rateLimitSmartEnabled: rateLimitAnswers.rateLimitSmartEnabled === true,
});
```

**Po:** po rate-limit `inquirer.prompt` o `semanticCacheEnabled` (default `false`); gdy `true` — `embeddingBaseUrl` (default `http://localhost:11435`). `isRedisRequired({ …, semanticCacheEnabled })`. `generateEnvTemplate` zapisuje `SEMANTIC_*` + model `qwen3-embedding:0.6b`.

#### `src/cli/templates/env.template.ts`

**Przed:** `isEnvInputRedisRequired` bez semantic; `generateEnvTemplate` bez `SEMANTIC_*`.

**Po:** `EnvTemplateInput.semanticCacheEnabled?`, `embeddingBaseUrl?`; w generatorze te same klucze co `.env.example`.

### Krok 5.D — Lżejszy model przez env (status: NIE_ROZPOCZĘTY)

Nie hot-swap. `EMBEDDING_MODEL=nomic-embed-text` + nowy `EMBEDDING_DIM` → `semanticIndexName` nowy indeks. Stary `qwen3-1024` zostaje w Redis do ręcznego `FT.DROPINDEX`. Kod adaptera bez zmian, o ile G3: przy nomic **nadal** nie dodawać `search_query:` dopóki obie strony nie przejdą na ten format (osobna decyzja + nowy indeks).

---

## DoD v1

Warstwa semantic cache jest domknięta, gdy spełnione jest **§0** (cel v1 + pasek poprawek z 2026-08-25), nie sama migawka kroków 2.x. Poprawki aplikacyjne i docs z raportu = **Faza 6** (przed Fazą 3); infra i żywy Search = Fazy 3–4.

1. Docs EN+PL i README zgodne z **§0** (lookup, fail-open = degradacja chwilowa, circuit z odzyskiem, jeden embed na miss, probe `/ready` w budżecie healthchecka, known limitation partycji: brak `systemSignature` / params w KNN, próg 0.90 / anti-patterns pkt 18).
2. OpenAPI: opcjonalne `checks.embeddings`; `degraded` nie blokuje `ready`; `embeddings: healthy` nie maskuje trwale otwartego circuitu.
3. JSON chat: exact → semantic → provider; partycja TAG `modelAlias`+`clientId`; próg 0.90; **jeden embed** na ścieżce miss (reuse wektora w guardzie); fail-open z **half-open** / zamknięciem obwodu po odzyskaniu embeddingu; błędy Redis Search nie otwierają circuitu embed.
4. Stream v1 bez cache.
5. Compose baza: gateway + Stack + embedding CPU; 16 GB w docs; healthcheck gatewaya (3 s) niesprzeczny z timeoutem/throttle probe embeddings.
6. Testy: unit pokrywa odzysk circuitu, reuse wektora z guarda, probe bez stallu `/ready`; Faza 4 — integration na żywym Redis Search (fake embedding, bez Ollamy w CI). Bez Fazy 4 warstwa nie jest gotowa na produkcję.
7. `SEMANTIC_CACHE_ENABLED=true` w `.env.example` = przykład lokalny; produkcja dopiero po pkt 1–6.

---

## Poza zakresem v1

Replay SSE z cache; semantic lookup na streamie; wspólna Ollama czat+embedding; nowy plik Compose dla Redis; TEI/OpenAI embeddings (port ma to umożliwić później); microservices; zmiana `maxmemory-policy` na LRU; TAG `systemSignature` / call params w indeksie KNN; opt-in semantic per alias/model; wydłużanie Docker `HEALTHCHECK` gatewaya, żeby pomieścić pełne `EMBEDDING_TIMEOUT_MS`.
