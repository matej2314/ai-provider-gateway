# Plan implementacji — semantic cache (rekomendacje 2–4)

**Status:** plan (bez implementacji, dopóki użytkownik jawnie nie zleci wdrożenia)  
**Punkt 1 (identity `callParams`):** uznany za naprawiony — poza zakresem.  
**Data planu:** 2026-08-27  
**Poza zakresem:** HNSW; wizard CLI semantic (Faza 5.C); cache na streamie.

## Decyzje produktowe / architektoniczne (zamknięte)

| # | Decyzja | Wybór |
|---|--------|--------|
| 2a | Strategia schematu indeksu | **A** — wersja w **nazwie indeksu** (stary indeks orphan; bez `FT.DROPINDEX` in-place) |
| 2b | Wejście hasha | `nazwa_projektu` + `embeddingModel` + `dim` + **kanoniczna definicja SCHEMA** |
| 2c | `nazwa_projektu` | **Stała w kodzie** (nie `package.json`, nie env) |
| 3a | Uszkodzony `reply` w KNN | **Kasować** klucz Redis (jak exact) |
| 3b | Metryka `skip` | Wszystkie early-return **bez** I/O embed/KNN |
| 3c | Forma metryki | Nowa wartość labela: `hit \| below-threshold \| error \| skip` |
| 4a | Compose / provisioning | **W zakresie** (domknięcie base stack + DX; skrypty częściowo już istnieją) |
| 4b | `cacheSource` w API | Nowe pole JSON; tylko przy cache hit; brak pola przy miss; breaking OK |
| — | HNSW | **Poza zakresem** |

---

## Faza 0 — Przygotowanie (bez zmian runtime)

1. Upewnić się, że pkt. 1 (`serializeCallParamsForCache` + `cache-identity.spec.ts`) jest na gałęzi / zmergowany.
2. Zanotować breaking cache: nowa nazwa indeksu → **cold start** semantic (stare wektory orphan do TTL); exact nie zależy od nazwy indeksu.
3. Zanotować breaking API: klienci zobaczą `cacheSource` na hitach (brak klientów dziś — akceptowane).

**DoD Fazy 0:** checklista ryzyk w PR description; brak kodu.

---

## Faza 1 — Wersja schematu w nazwie indeksu (pkt. 2)

### Cel

Zmiana pól/typów SCHEMA w `FT.CREATE` albo zmiana stałej projektu / modelu / DIM → **inna nazwa indeksu** → nowy `FT.CREATE`. Brak cichego reuse starego SCHEMA przy tym samym `model+DIM`.

### Kontrakt nazwy

Obecnie: `semanticIndexName(model, dim)` → np. `qwen3-embedding-0-6b-1024`.

Docelowo (czytelny prefix + izolacja hashem):

```text
{normalizedModel}-{dim}-{schemaHash8}
```

gdzie:

- `normalizedModel` / `dim` — jak dziś (ops-friendly),
- `schemaHash8` = pierwsze 8 hex znaków `SHA-256` z kanonicznego ciągu:

```text
{PROJECT_ID}\n{embeddingModel}\n{dim}\n{canonicalSchema}
```

**Stała projektu** (B.3), np. w `src/cache/semantic/semantic-cache.constants.ts`:

```ts
export const SEMANTIC_CACHE_PROJECT_ID = 'ai-provider-gateway';
```

**Kanoniczna SCHEMA** — jedna funkcja / stała string budowana z tej samej listy pól co `FT.CREATE` w `RedisVectorStoreAdapter` (kolejność ustalona, deterministyczna), np.:

```text
modelAlias:TAG:CASESENSITIVE
clientId:TAG:CASESENSITIVE
embeddingModel:TAG:CASESENSITIVE
systemSignature:TAG:CASESENSITIVE
callParams:TAG:CASESENSITIVE
reply:TEXT
vector:VECTOR:FLAT:FLOAT32:{dim}:COSINE
```

`dim` w canonical schema musi być tym samym `embeddingDim` co w runtime (hash zmienia się przy zmianie DIM nawet bez zmiany listy pól — redundantne z segmentem `-{dim}-` w nazwie, akceptowalne).

**Prefix kluczy HASH** już zawiera `indexName()` (`aigw:sem:${index}:`) — przy nowej nazwie indeksu nowe klucze naturalnie się rozdzielają. Stare HASH pod starym prefixem pozostają do TTL / ręcznego GC (bez automatycznego DROP w tym planie).

### Pliki

| Plik | Zmiana |
|------|--------|
| `src/cache/semantic/semantic-cache.constants.ts` | `SEMANTIC_CACHE_PROJECT_ID`; ewentualnie helper canonical schema |
| `src/cache/semantic/index-name.ts` | API: `semanticIndexName(model, dim, schemaCanonical \| options)`; hash |
| `src/cache/semantic/index-name.spec.ts` | testy: zmiana SCHEMA → inna nazwa; ta sama SCHEMA → stabilna; zmiana PROJECT_ID / model / dim |
| `src/cache/semantic/adapters/redis-vector-store.adapter.ts` | jedno źródło prawdy SCHEMA (shared z `index-name` / constants); `indexName()` woła nowy helper |
| `test/integration/gateway-semantic-cache.integration-spec.ts` | oczekiwana nazwa indeksu z hashem |
| docs: `docs/configuration.md`, `docs/pl/konfiguracja.md`, `docs/anti-patterns.md` §19/20 | przykład nazwy z sufiksem hasha; orphan indexes |
| `spec/SPEC-CHAT.md` F-8b | nazwa indeksu = model+DIM+hash(projekt+schema…); bump frontmatter |

### Testy (red → green)

1. Unit: identyczne wejścia → ten sam hash/nazwa.
2. Unit: zmiana jednego wiersza canonical SCHEMA → inna nazwa.
3. Unit: zmiana `SEMANTIC_CACHE_PROJECT_ID` → inna nazwa.
4. Integration: `FT.INFO` na nowej nazwie; upsert/knn działają.

### DoD Fazy 1

- Brak ścieżki „`FT.INFO` OK przy niezgodnym SCHEMA i tej samej nazwie”.
- Zmiana SCHEMA w kodzie bez bumpa ręcznego integera i tak zmienia nazwę (przez hash treści SCHEMA).
- Docs/SPEC zaktualizowane.

---

## Faza 2 — Hygiene corrupt HASH + metryka `skip` (pkt. 3)

### 2.1 Kasowanie uszkodzonych wpisów przy KNN

**Zachowanie:** w `parseKnnHits` / pętli po wynikach `FT.SEARCH`:

- brak `reply` / zły JSON / `parseCachedChatResponse` → `null` → **`DEL` dokumentu** (id z wyniku Search — dziś w raw Redis jest key jako `items[i]`, fields jako `items[i+1]`),
- fail-open: błąd `DEL` tylko log + continue,
- wybór hita: pierwsze / najlepsze po `dist` z **poprawnym** reply i `similarity >= minSimilarity` (jak dziś, ale po odfiltrowaniu/skasowaniu śmieci).

**RETURN:** nadal `reply` + `dist`; document id jest w odpowiedzi Search niezależnie od RETURN.

Opcjonalnie (zalecane w tej fazie): metryka / log `warn` przy delete (bez nowego labela lookup — to nie jest wynik lookupu użytkownika). Jeśli istnieje wzorzec w exact cache — spójny komunikat.

### 2.2 Label `skip`

Rozszerzyć:

```ts
type SemanticCacheLookupResult = 'hit' | 'below-threshold' | 'error' | 'skip';
```

**`skip`** — early-return **bez** wywołania `embed` / `knn`:

| Ścieżka | Wynik |
|---------||--------|
| `!cfg.enabled` | `skip` |
| `!isSingleTurnUserRequest` | `skip` |
| brak last-user text | `skip` |
| circuit `shouldSkipEmbed()` | `skip` (**zmiana:** dziś mylnie `error`) |
| brak `SemanticCacheService` przy próbie użycia semantic (jeśli w ogóle osiągalne) | `skip` |

**`error`** — tylko po **nieudanym** I/O: wyjątek z `embed` lub `knn` (jak dziś po próbie).

**`below-threshold` / `hit`** — bez zmian semantycznych.

### 2.3 Orchestracja metryk vs guard

Dziś `ChatCacheGuardService` często **nie woła** `lookup` (multi-turn / brak text) → te skipy nie trafiają do Prometheus.

**Wymagane w planie:**

1. Po wspólnych gate’ach exact (tooling / key / `unknown` / polityka aliasu) oraz po miss exact: jeśli `this.semanticCache` istnieje → **zawsze** `lookup(...)`.
2. Gate single-turn / last-user zostawić w serwisie (źródło `skip`); w guardzie można zostawić cienki early-return **albo** usunąć duplikat — preferencja: **usunąć duplikat single-turn/text z guarda na ścieżce semantic**, żeby jeden owner metryk (`SemanticCacheService`).
3. Tooling / unknown / polityka aliasu: **nie** emitują semantic `skip` (to wspólny skip cache, nie warstwa semantic) — zgodnie z listą B skoncentrowaną na semantic lookup.

### Pliki

| Plik | Zmiana |
|------|--------|
| `src/cache/semantic/adapters/redis-vector-store.adapter.ts` | DEL przy corrupt; ewentualnie async delete w `knn` |
| `src/cache/semantic/semantic-cache.service.ts` | `skip` zamiast milczenia / zamiast `error` na breaker |
| `src/chat/services/chat-cache-guard.service.ts` | zawsze wołać lookup gdy moduł jest; mniej duplikacji gate’ów |
| `src/observability/app-metrics/interfaces/app-metrics-backend.interface.ts` | typ + komentarz |
| `prometheus-app-metrics.adapter.ts` / noop / `app-metrics.service.ts` | label `skip` |
| `*.spec.ts` (semantic service, guard, adapter, metrics) | pokrycie |
| `docs/anti-patterns.md` §18 | label `skip` zgodny z kodem |
| `docs/api-documentation.md` / metryki | lista wyników lookup |
| `spec/SPEC-METRYKI.md` (jeśli opisuje semantic labels) | bump + `skip` |

### Testy

1. Unit adapter: corrupt reply → `DEL` wywołany, hit pominięty.
2. Unit service: multi-turn / disabled / breaker → `skip`, zero `embed`.
3. Unit service: embed throw → `error` + `embedAttempted: true`.
4. Guard: multi-turn z włączonym semantic → `lookup` wywołany (skip w serwisie).

### DoD Fazy 2

- Corrupt nie zostaje w indeksie po KNN.
- Breaker open ≠ `error`.
- Prometheus akceptuje `result="skip"`.

---

## Faza 3 — `cacheSource` w JSON (pkt. 4b)

### Kontrakt API

Przy **cache hit** na `POST /api/v1/chat` (i spójnie fasady, jeśli mapują to samo DTO):

```json
{
  "cached": true,
  "cachedAt": "...",
  "cacheSource": "exact" | "semantic",
  ...
}
```

Przy **miss** (odpowiedź z providera): **brak** `cached`, **brak** `cacheSource`, **brak** `cachedAt`.

Breaking OK (brak klientów).

### Przepływ wewnętrzny

1. `ChatCacheGuardService.getCachedIfAllowed` zwraca:
   - `{ cached, cacheSource: 'exact' | 'semantic', embedState? }`
   - przy miss: `{ cached: null, embedState? }` — **bez** `cacheSource`.
2. Exact hit: **nie** wołać semantic (jak dziś); `cacheSource: 'exact'`.
3. Semantic hit: `cacheSource: 'semantic'`.
4. `ChatService.executeChat` przekazuje `cacheSource` w wyniku hit.
5. `toChatResponseDtoFromCache(..., { cacheSource })` ustawia pole.
6. **Nie** serializować `cacheSource` do Redis (`CachedChatResponse` / Zod schema **bez** tego pola) — źródło jest właściwością **tego** requestu lookup, nie zapisanego payloadu. Przy store nadal `cached: true` w body cache.

### Pliki

| Plik | Zmiana |
|------|--------|
| `src/chat/dto/chat-response.dto.ts` | `cacheSource?: 'exact' \| 'semantic'`; Swagger; mapper z cache |
| `src/chat/services/chat-cache-guard.service.ts` | zwracanie źródła |
| `src/chat/chat.service.ts` | propagacja na hit |
| `src/chat/chat.controller.ts` | bez zmian jeśli mapper czyta pole z result |
| fasady OpenAI/Anthropic (jeśli eksponują native cache fields) | spójność lub świadome pominięcie — **sprawdzić** i opisać w PR |
| `openapi.json` | regeneracja / sync |
| `spec/SPEC-CHAT.md` F-8 / F-8b | `cacheSource` |
| `docs/api-documentation.md`, `docs/pl/dokumentacja_api.md`, dictionary jeśli potrzeba | opis pola |
| e2e `gateway-chat-cache` + `gateway-chat-semantic-cache` | assert `cacheSource` |
| unit chat.service / guard / dto | |

### DoD Fazy 3

- Exact hit → `cacheSource: "exact"`.
- Semantic hit → `cacheSource: "semantic"`.
- Miss → pole nieobecne.
- OpenAPI + SPEC + docs zsynchronizowane.

---

## Faza 4 — Compose / provisioning Redis Stack + embedding (pkt. 4a)

### Stan wyjściowy (audyt przed kodem)

W `package.json` / `Makefile` **już istnieją** m.in.:

- `docker:up` → gateway + redis Stack + ollama-embedding  
- `infra:up` / `infra:down`  
- `docker:up:full` z embedding  
- pliki `deployment/docker/docker-compose.redis.yml`, `docker-compose.ollama-embedding.yml`

Plan **nie** zakłada pisania Compose od zera, tylko **domknięcie luk** względem docs i DX.

### Zakres prac

1. **Audyt vs `docs/deployment.md`**
   - Usunąć / poprawić sformułowania „*(target — Phase 3)*”, jeśli skrypty już spełniają base stack.
   - Checklist: sieć `ai-gateway-network`, `REDIS_ARGS` (bez override `command:`), port 6380, embedding 11435, `MODULE LIST` ⊃ `search`.

2. **Spójność skryptów**
   - `docker:up:dev:full` — dziś **bez** `ollama-embedding` (i czasem niepełny vs base); zdecydować: dodać embedding **albo** udokumentować jako „dev bez semantic”.
   - **Rekomendacja planu:** dodać embedding do `docker:up:dev:full` + Makefile, żeby semantic działał też w hot-reload full.
   - `depends_on` + healthcheck: gateway czeka na `redis` (healthy) i opcjonalnie `ollama-embedding` (healthy / completed pull) w overlay base — jeśli jeszcze brakuje.

3. **Pinning obrazów**
   - `redis/redis-stack-server:latest` → **przypięty tag** (docs mówią „pinned tag”).
   - Rozważyć pin `ollama/ollama` (osobna decyzja operacyjna w PR; minimum: Stack).

4. **Env przykłady**
   - Root `.env.example`: `REDIS_PORT=6379` vs Stack **6380** — poprawić pod base semantic/redis Stack; skomentować host vs Docker (`EMBEDDING_BASE_URL`).
   - Upewnić się, że `deployment/templates/.env.example` / CLI template nie uczy złego portu dla Stack.

5. **Smoke / runbook (docs + ewentualnie skrypt)**
   - Po `infra:up`: `MODULE LIST`, curl embed `POST /api/embed`, gateway `/ready` z `checks.embeddings` + `checks.vectorStore` przy `SEMANTIC_CACHE_ENABLED=true`.
   - Krótka sekcja w `docs/deployment.md` / `docs/pl/deployment.md`: „pierwszy semantic lokalnie” = `npm run infra:up` + `start:dev`.

6. **Produkcja**
   - Zweryfikować `deploy-production.sh` / Compose prod: embedding w full stack zgodnie z docs („embedding is part of the documented base”). Luki = ticket w tej fazie, nie scope creep (wizard).

### Pliki (typowo)

- `package.json`, `Makefile`
- `deployment/docker/docker-compose.yml` (+ overlays)
- `deployment/docker/docker-compose.redis.yml` (pin)
- `.env.example`, templates CLI jeśli generują Redis/embedding
- `docs/deployment.md`, `docs/pl/deployment.md`, ewentualnie `docs/configuration.md`
- `spec/SPEC-KONFIGURACJA.md` — jeśli „Compose poza zakresem” jest nieaktualne względem runtime probe vs provisioning: doprecyzować, że provisioning base stack jest domknięty; wizard nadal poza

### DoD Fazy 4

- Docs nie mówią „Phase 3 target”, jeśli kod już dostarcza base.
- `infra:up` + `docker:up` uruchamiają Stack z Search + embedding.
- `.env.example` zgodne z portami Stack/embedding.
- Runbook smoke przechodzi na czystej maszynie z Dockerem (manual DoD w PR).

---

## Kolejność wdrożenia i zależności

```text
Faza 1 (index hash) ──┐
Faza 2 (DEL + skip) ──┼──→ Faza 3 (cacheSource) ──→ Faza 4 (Compose/docs)
                      │         ▲
                      └─────────┘  (Fazy 1–2 niezależne od siebie;
                                    3 zależy od guarda/DTO;
                                    4 niezależna od 1–3, może iść równolegle)
```

**Rekomendowana kolejność PR-ów:**

1. **PR-A:** Faza 1 (index name) — izolowany, breaking semantic cold-start.  
2. **PR-B:** Faza 2 (DEL + skip) — izolowany.  
3. **PR-C:** Faza 3 (`cacheSource`) — API + OpenAPI + SPEC.  
4. **PR-D:** Faza 4 (Compose/docs/env) — może równolegle do A–C.

Alternatywa: jeden PR „semantic hardening”, jeśli zespół woli mniejszą liczbę review — wtedy kolejność commitów jak fazy 1→2→3, 4 osobno.

---

## Ryzyka i mitigacje

| Ryzyko | Mitigacja |
|--------|-----------|
| Orphan indexes po zmianie SCHEMA | Docs: TTL; opcjonalny runbook `FT._LIST` + ręczny drop (bez automatu w tym planie) |
| Hash niestabilny (kolejność pól) | Canonical schema **tylko** z jednej shared constant użytej też w `FT.CREATE` |
| Podwójne metryki skip | Jeden owner: `SemanticCacheService.lookup` |
| `cacheSource` zapisany w Redis | Świadomie **nie** — tylko response path |
| Compose „już zrobione” vs docs | Audyt Fazy 4 najpierw; nie duplikować skryptów |
| `:latest` drift Redis Stack | Pin tag w Fazy 4 |

---

## Kryteria akceptacji całości (Definition of Done)

- [ ] Nazwa indeksu zmienia się przy zmianie canonical SCHEMA / project id / model / dim.
- [ ] Corrupt semantic HASH usuwany przy KNN; hit tylko z walidowanym reply.
- [ ] Label `skip` w metrykach; breaker open → `skip`; prawdziwe błędy I/O → `error`.
- [ ] Cache hit JSON: `cacheSource` = `exact` \| `semantic`; miss bez pola.
- [ ] OpenAPI + SPEC-CHAT (+ metryki/health docs wg potrzeby) zsynchronizowane.
- [ ] Base/local DX: Stack + embedding uruchamialne wg zaktualizowanego deployment docs; niespójności Phase 3 usunięte.
- [ ] Testy unit + e2e/integration zielone dla zmienionych ścieżek.
- [ ] Po zmianach w `src/`: `graphify update .` (wg AGENTS.md).

---

## Świadomie nie robić w tym planie

- HNSW / migracja typu indeksu VECTOR.
- Automatyczny `FT.DROPINDEX` starych indeksów.
- Wizard pytań semantic w CLI.
- Cache / `cacheSource` na `POST /api/v1/chat/stream`.
- Rozróżnienie exact vs semantic w nagłówkach HTTP (tylko JSON body).

---

## Następny krok

Implementacja **tylko** po jawnym zleceniu użytkownika (np. „wdrażaj Fazę 1” / „cały plan”). Ten plik = źródło prawdy planu do momentu aktualizacji statusów faz.
