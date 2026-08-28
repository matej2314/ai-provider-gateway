---
wersja: 3
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-28
---

# SPEC — Metryki operacyjne — `GET /metrics`

## Cel / problem

Udostępnić **publiczny** endpoint scrape Prometheus, żeby orchestrator / Prometheus mógł zbierać RED, limity, cache exact i stan gotowości **bez** `X-Gateway-Key` i **poza** prefiksem `/api/v1`.

Liveness/readiness JSON: `SPEC-HEALTH.md`. Auth wyjątków: `SPEC-PLATFORMA-I-KONTRAKTY.md` F-13. Architektura: `docs/pl/architektura.md` / `docs/architecture.md`. Scrape w deploy: `docs/pl/deployment.md` (`deployment/monitoring/prometheus.yml`).

## Użytkownicy i scenariusze

### Scenariusz A — Prometheus scrapuje gateway

1. Prometheus woła `GET /metrics` co N sekund (w repo: 10s).
2. Przed eksportem gateway odświeża gauge’e gotowości (hook `PreMetricsScrapeRegistry`).
3. Scraper dostaje tekst Prometheus (`text/plain; version=0.0.4`).

### Scenariusz B — development bez backendu Prometheus

1. `NODE_ENV` ≠ production i brak `METRICS_BACKEND=prometheus`.
2. `GET /metrics` zwraca **pusty** snapshot (adapter noop) — nadal HTTP 200, bez klucza.

## Wymagania funkcjonalne

F-1. `GET /metrics` jest **wyłączony** z globalnego prefiksu `api/v1` (`setup.app.ts` `exclude`). Pełna ścieżka: `/metrics`, nie `/api/v1/metrics`.

F-2. Endpoint **nie** wymaga `X-Gateway-Key` i **nie** podlega smart rate limitowi czatu.

F-3. Sukces: `200`, `Content-Type: text/plain; version=0.0.4; charset=utf-8` (`MetricsController`).

F-4. Przed zwrotką `AppMetricsService.getMetricsSnapshot()` uruchamia hooki `PreMetricsScrapeRegistry`. `HealthService` rejestruje odświeżenie readiness (throttling ~5s na ścieżce scrape; `GET /health/ready` bez tego throttle).

F-5. Wybór backendu (`resolveAppMetricsBackend`):

- `METRICS_BACKEND=noop` → pusty snapshot,
- `METRICS_BACKEND=prometheus` → rejestr `prom-client`,
- brak override: **production** → Prometheus, w przeciwnym razie noop.

F-6. Przy backendzie Prometheus eksport obejmuje co najmniej (prefiks `gateway_`):

- transport: `gateway_http_requests_total`, `gateway_http_request_duration_seconds`,
- LLM: requesty, czas, błędy, tokeny,
- `gateway_rate_limits_total`,
- cache exact KV: `gateway_cache_access_total`,
- cache semantic: `gateway_semantic_cache_lookup_total` (`hit|hash-hit|below-threshold|error|skip`),
- cache **pipeline**: `gateway_cache_hit_rate` (in-process hits/(hits+misses) per model; hit = exact lub semantic, w tym hash-hit),
- `gateway_active_streams`,
- zdrowie: `gateway_readiness`, `gateway_health_status{component=...}`, `gateway_process_uptime_seconds`,
- domyślne metryki procesu Node z prefiksem `gateway_`.

Zmiana względem: F-6 łączyło `gateway_cache_hit_rate` z cache exact; semantyka była poza zakresem. Powód: counter semantic już jest w kodzie; hit-rate musi liczyć pipeline.

F-7. Snapshot **nie** zawiera sekretów (kluczy API, wartości `X-Gateway-Key`, treści promptów / wiadomości).

F-8. `HttpMetricsMiddleware` rejestruje każdy request HTTP (w tym `/metrics`) w `AppMetricsService`. Przy backendzie Prometheus trafia to do `gateway_http_requests_total` i histogramu czasu; przy noop snapshot pozostaje pusty (F-5).

## Wymagania niefunkcjonalne

NFR-1. Scrape ma być tani; odświeżanie health na `/metrics` jest throttlowane.

NFR-2. Brak klucza na `/metrics` jest świadomy (sieć scrape / firewall poza aplikacją). Dokumentacja deploy opisuje izolację.

NFR-3. Noop w dev nie może zrywać kontraktu HTTP (200, ten sam content-type).

## Kryteria akceptacji

- [x] `GET /metrics` bez prefiksu `/api/v1` i bez `X-Gateway-Key`.
- [x] Production / `METRICS_BACKEND=prometheus` → tekst Prometheus z `gateway_readiness` po hooku scrape.
- [x] Dev noop → pusty body, 200.
- [x] Helmet / security: spójność nagłówków na `/metrics` (`helmet-headers.security-spec.ts`); health poza limitem RPS (`rate-limit-bypass.security-spec.ts`).

## Poza zakresem

- JSON liveness/readiness — `SPEC-HEALTH.md`.
- Metryki LLM w Sentry (`AiMetricsModule`, `conversationId`, `AI_METRICS_BACKEND`, `SENTRY_INCLUDE_PROMPTS`) — kontrakt w `SPEC-CHAT.md` F-9, `docs/pl/conversation_tracking.md` (ten plik = wyłącznie ekspozycja Prometheus).
- Error reporting procesu (`ERROR_REPORTING_ADAPTER`) — `SPEC-PLATFORMA-I-KONTRAKTY.md` F-22.
- Grafana dashboards / alert rules (artefakty w `deployment/monitoring/`, nie kontrakt aplikacji).
