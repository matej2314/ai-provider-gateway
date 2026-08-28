---
wersja: 5
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-28
---

# SPEC — Health (liveness/readiness)

## Cel / problem

Zapewnić endpoint zdrowia do lokalnego uruchamiania i orchestracji w infrastrukturze użytkownika.

## Użytkownicy i scenariusze

### Scenariusz A — local dev

Użytkownik uruchamia gateway i sprawdza, czy działa: `GET /api/v1/health` (globalny prefiks `API_GLOBAL_PREFIX` w `src/setup.app.ts`).

### Scenariusz B — orchestrator

Orchestrator odpyta health endpointy, aby zdecydować, czy instancja jest gotowa obsługiwać ruch. Probe ocenia pole `status` w body readiness, nie kod HTTP.

## Wymagania funkcjonalne

F-1. `GET /api/v1/health` zwraca `200` i lekki JSON (liveness):

```json
{
  "status": "healthy",
  "timestamp": "2026-05-19T12:00:00.000Z"
}
```

Uwagi:

- `timestamp` to ISO 8601 UTC (`new Date().toISOString()` w `HealthService.getLiveness` / `evaluateReadiness`).
- Endpoint nie wymaga `X-Gateway-Key` i **nie** podlega smart rate limitowi (`SPEC-PLATFORMA-I-KONTRAKTY.md` F-13 / F-16).

F-1b. `GET /api/v1/health/ready` zwraca readiness: `status` (`ready` | `not_ready`), `timestamp`, `version`, `uptime`, `checks.config`, `checks.cache`, oraz **warunkowo** `checks.redis`, `checks.embeddings`, `checks.vectorStore`. Implementacja: `HealthService.evaluateReadiness` / `getReadiness`. **HTTP zawsze 200**. Bez `X-Gateway-Key` i bez smart rate limitu (jak liveness).

- **`checks.config`**: zawsze obecny.
- **`checks.cache`**: zawsze obecny — agregat **włączonych** warstw pipeline (exact Redis KV i/lub semantic embeddings + vectorStore). `healthy` tylko gdy wszystkie włączone warstwy działają; w przeciwnym razie `degraded` z listą (`exact-redis`, `embeddings`, `vectorStore`). Gdy obie warstwy wyłączone → `Cache disabled (noop)`. Status `degraded` **nie** blokuje `ready`.
Zmiana względem: F-1b opisujące `checks.cache` wyłącznie jako stan exact/noop / zależność od Redis. Powód: P25x.C — operator ma widzieć cały włączony pipeline, nie tylko KV.
- **`checks.redis`**: pole **obecne tylko gdy Redis jest wymagany** (`isRedisRequiredFromConfig` — m.in. cache z backendem redis i/lub smart rate limit i/lub semantic cache). Gdy Redis **nie** jest wymagany, pole jest **pomijane** (brak `ping()`). Gdy obecne: `RedisConnectionService.ping()`, `required: true`, `consumers` (co najmniej `cache` i/lub `rate-limit` i/lub `semantic-cache`). Status `degraded` **nie** blokuje `ready` (fail-open).
- **`checks.embeddings`**: obecne tylko gdy `SEMANTIC_CACHE_ENABLED=true` (walidowane). Probe Ollamy (`SemanticCacheService.probeEmbedding`). Fail-open: `degraded` nie blokuje `ready`. Sonda **nie** resetuje embedding circuit breakera.
- **`checks.vectorStore`**: obecne tylko gdy semantic włączony. Probe Redis Search / indeksu (`VectorStore.probeIndex` → `FT.INFO` po leniwym `ensureIndex`). Brak modułu Search (`unknown command`) lub indeksu → `degraded` z czytelnych komunikatem operatorskim; **nie** blokuje `ready`.

Zmiana względem: F-1b w wersji 3 (tylko `config` / `cache` / warunkowy `redis`; embeddings/vectorStore w „poza zakresem”). Powód: B7 — przy padającym KNN raport nie może pokazywać wyłącznie `redis: healthy` + `embeddings: healthy` bez sygnału o Search/indeksie; S10 — sonda `/ready` nie zamyka breakera.

Uwaga vs docs: `docs/pl/dokumentacja_api.md` / `docs/api-documentation.md` opisują kształt `required: false` + komunikat „Redis not required”. Kod takiego obiektu **nie zwraca**. Korekta dokumentacji — osobna decyzja.

F-2. Gateway musi być w stanie jednoznacznie określić „gotowość” konfiguracyjną:

- sekrety włączonych instancji wg `SPEC-KONFIGURACJA.md` (F-1a),
- poprawne wczytanie i walidacja `gateway.config.yaml` przy starcie; offline: `npm run config:validate`.

*(Opcjonalnie w przyszłości: test połączenia do providerów.)*

## Wymagania niefunkcjonalne

NFR-1. Health endpoint nie może ujawniać sekretów ani pełnej konfiguracji.

NFR-2. Health endpoint ma działać szybko (p95 < 50ms lokalnie).

## Kryteria akceptacji

- [x] `GET /api/v1/health` działa, gdy proces działa.
- [x] Liveness zwraca `status: healthy` (bez sekretów).
- [x] Readiness (`GET /api/v1/health/ready`) zawsze HTTP 200; raportuje `checks.config` i `checks.cache`; `checks.redis` tylko gdy Redis jest wymagany; przy włączonym semantic — `checks.embeddings` i `checks.vectorStore` (fail-open).
- [x] Health nie wymaga klucza i nie jest ograniczany smart rate limitem.

## Poza zakresem (względem rdzenia MVP)

- Sprawdzanie dostępności providerów przy każdym health (koszty i opóźnienia).
- `GET /metrics` (Prometheus, poza `/api/v1`) — `SPEC-METRYKI.md`.

Zmiana względem: wcześniejsze „Dodatkowe, feature-flagowane checki readiness poza `config` / `cache` / `redis`” — embeddings i vectorStore są w zakresie F-1b gdy semantic włączony.
