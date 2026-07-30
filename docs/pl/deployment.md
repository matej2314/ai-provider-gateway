# Deployment — AI Provider Gateway

Przewodnik wdrożenia lokalnego (Docker Compose) oraz produkcyjnego na VPS przez **GitHub Actions** (self-hosted runner). Artefakty deploymentu znajdują się w katalogu `deployment/` — oddzielonym od kodu źródłowego aplikacji. Workflow produkcyjny: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml).

Szczegóły konfiguracji runtime (env, YAML, walidacja): [`konfiguracja.md`](konfiguracja.md).  
Gateway CLI (wizard, CRUD providerów/modeli/klientów): [`CLI.md`](CLI.md).

---

## Wymagania

- **Docker** 20.10+
- **Docker Compose** 2.0+
- Klucze API providerów (np. Anthropic, Google) — zależnie od skonfigurowanych adapterów
- (Opcjonalnie) **Node.js 20+** i `npm install` — do walidacji konfiguracji oraz CLI przed deployem
- **Deploy VPS (Actions):** self-hosted runner na serwerze (`[self-hosted, linux]`), Docker daemon dostępny dla runnera (często DooD / `docker.sock`), sekrety aplikacji jako skopiowany plik `.env` na hoście **albo** we własnym menedżerze sekretów (wymaga dostosowania [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) i skryptów w `deployment/scripts/`), GitHub Environment `production`

---

## Struktura `deployment/`

```
deployment/
├── docker/
│   ├── Dockerfile                         # Multi-stage build (production)
│   ├── docker-compose.yml                 # MVP: sam gateway
│   ├── docker-compose.redis.yml           # Rozszerzenie: + Redis
│   ├── docker-compose.monitoring.yml      # Rozszerzenie: + Prometheus + Grafana
│   ├── docker-compose.ollama.yml          # Rozszerzenie: + Ollama (lokalny LLM)
│   ├── docker-compose.dev.yml             # Override: tryb dev (hot reload)
│   └── docker-compose.override.yml.example
├── monitoring/                            # Prometheus, Grafana, reguły alertów
│   ├── prometheus.yml                     # Scrape /metrics co 10s
│   ├── alerts.yml                         # GatewayDown, GatewayNotReady, …
│   └── grafana/
├── scripts/                               # Deploy / rollback (używane przez Actions)
│   ├── deploy-production.sh               # sync | secrets | up | health | all (pełny stack)
│   ├── deploy-staging.sh                  # jak production, bez Redis (DEPLOY_MODE=staging)
│   └── rollback.sh                        # auto-rollback do last known-good SHA
└── templates/                             # Opcjonalne kopie / CI PLACEHOLDER
    ├── .env.example                       # Do setupu preferuj root `.env.example`
    └── gateway.config.example.yaml        # Do setupu preferuj root `gateway.config.example.yaml`
```

Pliki aktywne (`gateway.config.yaml`, `.env`) żyją w **katalogu głównym** repozytorium — skopiuj je z rootowych placeholderów (`gateway.config.example.yaml`, `.env.example`), potem uzupełnij albo uruchom `config:init`. Lokalny Docker montuje je z roota do kontenera. Na VPS pipeline synchronizuje checkout do katalogu hosta (domyślnie `/opt/ai-provider-gateway`) i bind-mountuje stamtąd.

---

## Szybki start (lokalnie — Docker Compose)

Poniższe kroki dotyczą **uruchomienia na maszynie deweloperskiej** (Compose / Makefile / npm). Deploy produkcyjny przez GitHub Actions jest opisany w sekcji [Deploy produkcyjny (GitHub Actions)](#deploy-produkcyjny-github-actions) — m.in. sieć Docker tworzy tam pipeline, nie operator.

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/you/ai-provider-gateway
cd ai-provider-gateway
```

### 2. Konfiguracja

Projekt **nie ma wdrożenia zero-config**. Musisz dostarczyć `gateway.config.yaml` i `.env` w katalogu głównym. Dostępne są dwie ścieżki:

#### Opcja A: Placeholdery w katalogu głównym (zalecane dla Docker / CI/CD)

```bash
cp gateway.config.example.yaml gateway.config.yaml
cp .env.example .env
```

Następnie uzupełnij pliki:

- **`.env`** — sekrety i ustawienia serwera (wartości pod nazwami `*KeyRef` z YAML, opcjonalnie Redis, Sentry, rate limit).
- **`gateway.config.yaml`** — struktura providerów, modeli i klientów.

Szablon YAML w `gateway.config.example.yaml` (katalog główny) to **konfiguracja boilerplate** — minimalny, poprawny schemat Zod z jawnymi placeholderami do uzupełnienia:

| Element | Przykład w szablonie |
|---------|----------------------|
| `masterKeyRef` | `MASTER_KEY_PLACEHOLDER` |
| ID providera | `placeholder-provider` |
| `apiKeyRef` | `ANTHROPIC_API_KEY_PLACEHOLDER` |
| ID klienta | `placeholder-client` |
| Alias modelu | `placeholder-model` |

Dzięki temu:

1. **Nowy użytkownik** od razu widzi, że plik wymaga uzupełnienia (nie jest gotową konfiguracją produkcyjną).
2. **Warstwa CLI** rozpoznaje boilerplate (`isBoilerplateConfig()` — ID/refy zawierające `placeholder` / `PLACEHOLDER`) i może uruchomić wizard **bez pytania o nadpisanie** istniejącego pliku.

Po skopiowaniu szablonu do `gateway.config.yaml` możesz:

- **Ręcznie** zastąpić placeholdery prawdziwymi nazwami env i wpisami (zgodnie ze schematem Zod — patrz [`konfiguracja.md`](konfiguracja.md) sekcja 2), **albo**
- Uruchomić wizard (Opcja B), który wygeneruje pełną konfigurację operacyjną.

> **Ważne:** Nazwy zmiennych w `.env` muszą odpowiadać polom `*KeyRef` w YAML (`masterKeyRef`, `apiKeyRef`, `gatewayKeyRef`). Rootowy `.env.example` jest sparowany z `gateway.config.example.yaml`. Runtime **nie** podstawia `${VAR}` — wczytuje wartości z env po nazwie refa.

#### Opcja B: Wizard CLI (zalecane przy pierwszym uruchomieniu lokalnym)

```bash
npm install
npm run cli config:init
# lub: npx gateway config:init
```

Wizard generuje `gateway.config.yaml`, `.env` i `.env.example`. Jeśli w katalogu głównym jest już skopiowany szablon boilerplate, CLI wykryje go automatycznie i zaproponuje pełną konfigurację.

Szczegóły flow: [`CLI.md`](CLI.md) — sekcja `config:init`.

### 3. Walidacja (zalecane przed deployem)

```bash
npm install   # jeśli jeszcze nie
npm run config:validate
# alternatywa: gateway config:validate
```

Przy konfiguracji boilerplate walidator zakończy się błędem i wskaże `gateway config:init` — to oczekiwane zachowanie **przed** uzupełnieniem plików.

### 4. Sieć Docker (`ai-gateway-network`)

Wszystkie pliki Compose deklarują sieć `ai-gateway-network` jako **`external: true`** — sam `docker compose up` **nie** utworzy sieci. Zachowanie zależy od ścieżki wdrożenia:

| Ścieżka | Kto tworzy sieć? | Co zrobić |
|---------|------------------|-----------|
| **Lokalnie** (`make docker-up*`, `npm run docker:up*`, ręczny Compose) | Ty | Utwórz sieć **raz** przed pierwszym startem (poniżej) |
| **Produkcja na VPS** ([`deploy.yml`](../../.github/workflows/deploy.yml) → `deploy-production.sh up`) | Pipeline | Nic — `cmd_up` woła `docker network create ai-gateway-network` (idempotentnie, `\|\| true`) przed `compose up` |
| **CI** ([`ci.yml`](../../.github/workflows/ci.yml), testy obrazu) | Workflow | Nic — job CI tworzy sieć przed testami |

#### Lokalny deployment

Przed pierwszym `docker compose` / `make docker-up*` / `npm run docker:up*`:

```bash
docker network create ai-gateway-network
```

Ponowne wywołanie przy istniejącej sieci kończy się błędem Dockera — to normalne; sieć już jest. Sprawdzenie: `docker network ls | grep ai-gateway-network`.

Bez tej sieci lokalny Compose padnie z komunikatem o braku sieci zewnętrznej.

#### Produkcja (GitHub Actions)

Na VPS **nie** twórz sieci ręcznie jako krok przygotowania deployu. Orchestracja:

1. Actions → **Deploy to VPS** → `deploy.yml`
2. `deployment/scripts/deploy-production.sh` → komenda `up` (`cmd_up`)
3. Skrypt tworzy `ai-gateway-network` (jeśli brak), potem buduje i startuje stack

Szczegóły przebiegu: [Deploy produkcyjny (GitHub Actions)](#deploy-produkcyjny-github-actions).

### 5. Deploy (lokalny Compose)

Wybierz wariant stacku:

| Wariant | Makefile | npm |
|---------|----------|-----|
| MVP (sam gateway) | `make docker-up` | `npm run docker:up` |
| Gateway + Redis | `make docker-up-redis` | `npm run docker:up:redis` |
| Gateway + monitoring | `make docker-up-monitoring` | `npm run docker:up:monitoring` |
| Pełny stack (prod) | `make docker-up-full` | `npm run docker:up:full` |
| Dev (hot reload) | `make docker-up-dev` | `npm run docker:up:dev` |
| Dev + pełny stack | `make docker-up-dev-full` | `npm run docker:up:dev:full` |

Build obrazu (opcjonalnie osobno):

```bash
make docker-build
# lub: npm run docker:build
```

Compose ładuje `.env` z katalogu głównego (`--env-file .env`) i montuje:

- `gateway.config.yaml` → `/app/gateway.config.yaml` (read-only)
- `logs/` → `/app/logs/`

### 6. Weryfikacja

```bash
# Liveness
curl http://localhost:3000/api/v1/health

# Readiness (config, Redis, cache — zależnie od env)
curl http://localhost:3000/api/v1/health/ready

# Test czatu (zamień YOUR_MASTER_KEY i alias modelu)
curl -X POST http://localhost:3000/api/v1/chat \
  -H "X-Gateway-Key: YOUR_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "modelAlias": "chat-default",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Zatrzymanie

```bash
make docker-down
# lub: npm run docker:down
```

---

## Dostęp do usług

| Usługa | URL | Uwagi |
|--------|-----|-------|
| Gateway | http://localhost:3000 | API pod prefiksem `/api/v1` |
| Swagger UI | http://localhost:3000/api/v1/api-docs | Wyłączony w production domyślnie (`SWAGGER_ENABLED`) |
| Prometheus | http://localhost:9090 | Tylko z `docker-compose.monitoring.yml` |
| Grafana | http://localhost:3001 | Login: `GRAFANA_USER` / `GRAFANA_PASSWORD` z `.env` (domyślnie admin/admin) |
| Redis | localhost:6379 | Tylko z rozszerzeniem Redis |

---

## Pliki konfiguracyjne

| Plik | Lokalizacja | Cel | W Git |
|------|-------------|-----|-------|
| `gateway.config.example.yaml` | katalog główny | PLACEHOLDER boilerplate (CLI-compatible) | ✅ |
| `gateway.config.yaml` | katalog główny | Aktywna konfiguracja runtime | ❌ (lokalnie) |
| `.env.example` | katalog główny | Szablon zmiennych (sparowany z placeholderami YAML) | ✅ |
| `.env` | katalog główny | Aktywne sekrety i env | ❌ `.gitignore` |

**Nigdy nie commituj** `gateway.config.yaml` ani `.env` z prawdziwymi sekretami.

Po skopiowaniu `gateway.config.example.yaml` do `gateway.config.yaml` struktura pozostaje zgodna z walidatorem Zod (`src/config/gateway-config.schema.ts`) i z komendami CLI.

---

## Kiedy użyć której metody konfiguracji

| Scenariusz | Metoda | Powód |
|------------|--------|-------|
| Pierwsze uruchomienie lokalne | CLI `config:init` | Szybki, prowadzony setup z walidacją |
| Docker Compose / VPS | Root `gateway.config.example.yaml` + `.env.example` | Brak TTY w kontenerze; PLACEHOLDER wykrywany przez CLI |
| Kubernetes / CI/CD | Rootowe placeholdery + ConfigMap / Secrets Manager | Sekrety wstrzykiwane w runtime |
| Dodanie providera lokalnie | CLI `provider:add` | Walidacja i sync `.env` |
| Migracja dev → prod | Pliki wygenerowane przez CLI | Po review sekretów i limitów — te same pliki montujesz w Docker |

Jeśli użyłeś CLI w development i chcesz wdrożyć na produkcję:

1. `gateway config:validate`
2. Przejrzyj `MASTER_KEY`, klucze providerów, limity rate limit i `SWAGGER_ENABLED`
3. Skopiuj `gateway.config.yaml` i `.env` na serwer (lub do volume/secrets managera)
4. `npm run docker:up:full` (lub wybrany wariant)

---

## Dostosowanie konfiguracji (schemat projektu)

Poniższe przykłady używają **aktualnego** schematu YAML (mapy `providers`, `clients`, `models` — nie list ani zagnieżdżonych vendorów).

### Dodanie instancji providera

```yaml
providers:
  anthropic-primary:
    type: anthropic
    apiKeyRef: ANTHROPIC_PRIMARY_API_KEY
    enabled: true
  google-office:
    type: google
    apiKeyRef: GOOGLE_OFFICE_API_KEY
    enabled: true
```

W `.env` dodaj wartości pod dokładnie tymi nazwami refów.

### Dodanie aliasu modelu

```yaml
models:
  chat-default:
    providerInstance: anthropic-primary
    modelId: claude-sonnet-4-5-20250929
    capabilities:
      streaming: true
      tools: true
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 3
        onStatus: [429, 500, 502, 503, 504]
```

### Dodanie klienta gateway

```yaml
clients:
  webapp:
    name: Frontend App
    type: webapp
    gatewayKeyRef: GATEWAY_KEY_WEBAPP
    rateLimit:
      rps: 20
      burst: 40
      maxConcurrentStreams: 5
```

Wygeneruj klucz: `gateway key:generate --type client --client-id webapp` i zapisz wartość w `.env` pod `GATEWAY_KEY_WEBAPP`.

Więcej pól i reguł: [`konfiguracja.md`](konfiguracja.md).

---

## Zmienne środowiskowe

Pełny szablon: `.env.example` (katalog główny; sparowany z `gateway.config.example.yaml`).

**Wymagane do startu** (po uzupełnieniu boilerplate — nazwy zależą od YAML):

- Wartość pod `masterKeyRef` (w szablonie: `MASTER_KEY_PLACEHOLDER`)
- Wartości pod każdym `apiKeyRef` włączonego providera (w szablonie: `ANTHROPIC_API_KEY_PLACEHOLDER`)
- Wartości pod `gatewayKeyRef` klientów (w szablonie: `GATEWAY_KEY_PLACEHOLDER`)

**Często używane opcjonalne:**

| Zmienna | Domyślnie | Znaczenie |
|---------|-----------|-----------|
| `PORT` | `3000` | Port HTTP |
| `NODE_ENV` | — | `production` / `development` |
| `REDIS_HOST` | `localhost` | Host Redis (w Compose: `redis`) |
| `CACHE_ENABLED` | `false` | Włączenie cache odpowiedzi |
| `CACHE_BACKEND` | `noop` | `redis` wymaga Redis |
| `RATE_LIMIT_SMART_ENABLED` | `false` | Smart rate limit per klucz (wymaga Redis) |
| `SENTRY_DSN` | pusty | Error reporting / AI metrics (Sentry) |
| `METRICS_BACKEND` | auto | `prometheus` / `noop` — w production domyślnie Prometheus |
| `LOG_LEVEL` | `info` | Poziom logów Pino |
| `GRAFANA_USER` / `GRAFANA_PASSWORD` | admin/admin | Panel Grafana w stacku monitoring |

Szczegóły walidacji env: [`konfiguracja.md`](konfiguracja.md) sekcja 1.

---

## Warianty deploymentu (modularny Compose)

Pliki Compose można **łączyć** — każdy dodaje serwisy bez wymuszania pełnego stacku:

```bash
# Tylko Redis (standalone)
make redis-up

# Tylko monitoring
make monitoring-up

# Gateway + Redis + Prometheus + Grafana
make docker-up-full
```

Nadpisanie lokalne: skopiuj `deployment/docker/docker-compose.override.yml.example` → `deployment/docker/docker-compose.override.yml` (plik w `.gitignore`).

Logi:

```bash
make docker-logs
# lub: npm run docker:logs:gateway
```

Lokalne skróty `npm run deploy:mvp` / `deploy:staging` / `deploy:production` (oraz odpowiedniki `make`) to **deploy na maszynie deweloperskiej** (testy + Compose). **Produkcja na VPS** idzie przez GitHub Actions — sekcja poniżej.

---

## Deploy produkcyjny (GitHub Actions)

Produkcyjny pipeline: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) → skrypt [`deployment/scripts/deploy-production.sh`](../../deployment/scripts/deploy-production.sh).

### Założenia

| Element | Wartość / rola |
|--------|----------------|
| Trigger | Tylko `workflow_dispatch` (ręczny Run workflow) |
| Runner | Self-hosted, labelki `[self-hosted, linux]` (VPS) |
| Environment | GitHub `production` (approval + sekrety Vault AppRole) |
| Katalog na hoście | `/opt/ai-provider-gateway` (`DEPLOY_DIR`) |
| Sieć Docker | `ai-gateway-network` — tworzona w `deploy-production.sh` (`cmd_up`); **nie** wymaga ręcznego `docker network create` przed Actions |
| Last known-good | Plik `/opt/ai-provider-gateway/.deployed-sha` |
| Gate CI | Co najmniej jeden **sukces** workflow `ci.yml` dla deployowanego SHA |
| Sekrety aplikacji | **Bazowo HashiCorp Vault** (AppRole + KV `secret/data/ai-provider-gateway/prod` → `.env` na workspace i hoście). Własny menedżer sekretów / skopiowany `.env` wymaga zmian w: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) (krok *Fetch secrets from Vault*), [`deployment/scripts/deploy-production.sh`](../../deployment/scripts/deploy-production.sh) (`cmd_secrets`), oraz zwykle [`deployment/scripts/rollback.sh`](../../deployment/scripts/rollback.sh) (`SKIP_VAULT_FETCH`) |
| Readiness | `GET http://ai-gateway:3000/api/v1/health/ready` → `body.status == "ready"` |
| Health retries | Domyślnie **6** prób co **5 s** (`HEALTH_ATTEMPTS` w `deploy-production.sh`) |

Definicja workflow pochodzi z brancha wybranego w UI Actions („Use workflow from”). **Kod i skrypty** pochodzą z inputu `branch` / `sha` (checkout deployowanego refa). Skrypty muszą istnieć w tym refie — inaczej kroki `bash deployment/scripts/...` padną.

### Jak odpalić deploy

1. Upewnij się, że dla docelowego SHA jest zielony run [`ci.yml`](../../.github/workflows/ci.yml) (na push do feature brancha zwykle tryb szybki: lint + unit).
2. Actions → **Deploy to VPS** → Run workflow.
3. Inputy:
   - **`branch`** — tip brancha (domyślnie w workflow: **`main`**),
   - **`sha`** (opcjonalnie) — konkretny commit lub tag; gdy ustawiony, **nadpisuje** tip brancha.

Ręczny rollback bez czekania na auto-rollback: ten sam workflow z `sha` = poprzedni dobry commit (re-deploy znanego refa).

### Przebieg happy path

1. Resolve ref → checkout → zapis deploy SHA.
2. Weryfikacja zielonego CI dla tego SHA.
3. Odczyt last known-good z hosta (`.deployed-sha`) — na razie tylko pod ewentualny rollback.
4. **Mutation point** — odtąd fail może zostawić host w półstanie; auto-rollback jest uprawniony.
5. `deploy-production.sh sync` — stop starych kontenerów gateway/prometheus/grafana, wyczyść `DEPLOY_DIR` (zostawia `.env` i `.deployed-sha`), wgraj checkout tar’em (ścieżka DooD-safe).
6. `secrets` — AppRole login do Vault, zapis `.env`.
7. `up` — **tworzy** zewnętrzną sieć `ai-gateway-network` (jeśli brak; `docker network create … || true`), overlay bindów hosta (`DEPLOY_DIR` → config/logi/monitoring), `compose build gateway` + `up -d` (pełny stack: gateway + Redis + monitoring).
8. `health` — pętla readiness.
9. Zapis nowego SHA do `.deployed-sha`.
10. Cleanup workspace `.env` (hostowego `.env` **nie** kasuje).

Concurrency: grupa `deploy-vps`, `cancel-in-progress: false` — równoległe deploye się kolejkują, nie anulują.

### Auto-rollback

Gdy krok po mutation point padnie (np. health), a na hoście jest last-good SHA **różny** od failed SHA:

1. Checkout last-good SHA.
2. [`rollback.sh`](../../deployment/scripts/rollback.sh) → `deploy-production.sh all` z **`SKIP_VAULT_FETCH=true`** (reuse host `.env`; Vault tylko gdy `.env` na hoście brakuje).
3. Po udanym rollbacku workflow **i tak kończy się czerwono** (step „Fail run after successful auto-rollback”), żeby w historii Actions było widać, że primary fail + recovery.

Pierwszy udany deploy (brak `.deployed-sha`) albo failed SHA = last-good → auto-rollback się **nie** odpala.

### Weryfikacja po deployu / rollbacku

```bash
# na VPS / z sieci Dockera
curl -s http://ai-gateway:3000/api/v1/health/ready | jq .
cat /opt/ai-provider-gateway/.deployed-sha
```

W UI Actions przy udanym auto-rollbacku: wykonane kroki checkout last-good + Auto-rollback, summary z `SUCCEEDED`, komunikat że primary failnięty a produkcja przywrócona; job status = failure (zamierzone).

### Skrypty — skrót API

```bash
# pełna ścieżka produkcyjna (jak w Actions, krokami)
bash deployment/scripts/deploy-production.sh sync
bash deployment/scripts/deploy-production.sh secrets   # wymaga VAULT_ROLE_ID / VAULT_SECRET_ID
bash deployment/scripts/deploy-production.sh up
bash deployment/scripts/deploy-production.sh health

# staging lokalnie / ręcznie (Compose bez Redis)
bash deployment/scripts/deploy-staging.sh all
```

Istotne zmienne: `DEPLOY_DIR`, `LAST_GOOD_SHA_FILE`, `SKIP_VAULT_FETCH`, `HEALTH_URL`, `HEALTH_ATTEMPTS`, `DEPLOY_MODE` (`production` \| `staging`). Szczegóły w nagłówkach skryptów.

---

## Monitoring i logi

- **Logi kontenera:** `docker logs ai-gateway -f` lub `make docker-logs`
- **Prometheus:** http://localhost:9090 (po włączeniu rozszerzenia monitoring)
- **Grafana:** http://localhost:3001 — `make dashboard`
- **Metryki aplikacji:** `GET /metrics` (publiczne, **bez** prefiksu `/api/v1`) — format Prometheus text; przed exportem odświeżane są gauge'e readiness (`gateway_readiness`, `gateway_health_status{component="config|redis|cache"}`) oraz `gateway_process_uptime_seconds`
- **Health HTTP:**
  - Liveness: `GET /api/v1/health`
  - Readiness: `GET /api/v1/health/ready` (Docker HEALTHCHECK parsuje `body.status`)

### Weryfikacja metryk (lokalnie / po deployu)

```bash
# Readiness w Prometheus (bez curl na /ready)
curl -s http://localhost:3000/metrics | grep -E 'gateway_readiness|gateway_health_status'

# Oczekiwany przykład (gdy gateway gotowy):
# gateway_readiness 1
# gateway_health_status{component="config"} 1
# gateway_health_status{component="redis"} 1
# gateway_health_status{component="cache"} 1
```

### Prometheus i alerty

Konfiguracja: `deployment/monitoring/prometheus.yml` (scrape co **10s**, job `ai-gateway`, ścieżka `/metrics`). Reguły alertów: `deployment/monitoring/alerts.yml`:

| Alert | Opis |
|-------|------|
| `GatewayDown` | Brak scrape targetu (`up == 0`) |
| `GatewayNotReady` | `gateway_readiness == 0` przez 2m |
| `GatewayConfigUnhealthy` | `gateway_health_status{component="config"} == 0` |
| `GatewayRedisDegraded` | Redis `< 1` (degraded/unhealthy) |
| `GatewayCacheDegraded` | Cache `< 1` |
| `GatewayHighEventLoopLag` | `gateway_nodejs_eventloop_lag_seconds > 0.5` |

Walidacja reguł (Docker):

```bash
docker run --rm --entrypoint promtool -v "%cd%/deployment/monitoring:/etc/prometheus:ro" prom/prometheus:latest check rules /etc/prometheus/alerts.yml
```

Na Linux/macOS zamień `%cd%` na `$(pwd)`.

---

## Rozwiązywanie problemów

### „Configuration validation failed” / boilerplate detected

```bash
gateway config:show          # podgląd YAML
gateway config:init          # wizard (gdy boilerplate)
npm run config:validate      # walidacja YAML + reguły runtime
gateway config:validate      # pełna walidacja (+ validateEnvironment)
```

Upewnij się, że `.env` zawiera wartości dla wszystkich `*KeyRef` z YAML.

### Nieprawidłowy klucz providera

```bash
gateway provider:test
# lub: gateway provider:test anthropic-primary
```

### Kontener gateway nie startuje

```bash
docker logs ai-gateway
```

Typowe przyczyny: brak `gateway.config.yaml` w katalogu głównym, brak sieci `ai-gateway-network` (**tylko lokalny Compose** — utwórz ręcznie; na VPS tworzy ją `deploy-production.sh`), pusty `MASTER_KEY`, port 3000 zajęty, błąd składni YAML.

### Redis niedostępny

```bash
docker ps | grep redis
docker exec ai-gateway-redis redis-cli ping   # oczekiwane: PONG
```

Gdy `RATE_LIMIT_SMART_ENABLED=true` lub `CACHE_BACKEND=redis`, readiness może zgłaszać `degraded` bez działającego Redis.

### Prometheus / Grafana nie odpowiadają

Upewnij się, że uruchomiłeś stack z `docker-compose.monitoring.yml`:

```bash
npm run docker:up:monitoring
curl http://localhost:9090/-/healthy
curl http://localhost:3001/api/health
```

### Deploy Actions: „No successful CI run”

Deploy wymaga zielonego runu `ci.yml` dla **tego samego** SHA. Poczekaj na CI albo uruchom `workflow_dispatch` na `ci.yml`, potem ponów Deploy.

### Deploy Actions: health długo czeka, potem fail

`deploy-production.sh` próbuje readiness do `HEALTH_ATTEMPTS` razy (domyślnie 6 × 5 s). Przy padającym kontenerze to zamierzone opóźnienie przed auto-rollbackiem — nie natychmiastowy fail.

### Deploy Actions: auto-rollback się nie odpalił

Sprawdź, czy fail był **po** kroku mutation, czy istnieje `/opt/ai-provider-gateway/.deployed-sha` i czy różni się od failed SHA. Pierwszy udany deploy dopiero tworzy ten plik.

---

## Checklist produkcyjny

Przed wdrożeniem na produkcję:

- [ ] `MASTER_KEY` — silna wartość losowa (`gateway key:generate --type master` lub `openssl rand -hex 32`)
- [ ] Klucze providerów i klientów — rotacja; **nie** commitować `.env`. Źródło na produkcji (zgodnie z założeniami): **bazowo HashiCorp Vault**, albo skopiowany `.env` na hoście / własny menedżer sekretów (wymaga zmian w `deploy.yml`, `deploy-production.sh`, zwykle `rollback.sh` — patrz wiersz *Sekrety aplikacji* powyżej)
- [ ] GitHub Environment `production` + self-hosted runner online; przy bazowym Vault: sekrety `VAULT_ROLE_ID`, `VAULT_SECRET_ID`
- [ ] Katalog hosta `/opt/ai-provider-gateway` istnieje i jest montowalny przez Docker daemon
- [ ] HTTPS — reverse proxy (nginx, Traefik, load balancer)
- [ ] Limity rate limit — dopasowane do tierów API providerów i ruchu
- [ ] Redis — jeśli włączony cache (`CACHE_BACKEND=redis`) lub smart rate limit
- [ ] `gateway config:validate` — sukces na konfiguracji docelowej (pełniejsza niż sam `npm run config:validate`)
- [ ] Zielony `ci.yml` dla SHA, który ma wejść na VPS (gate w `deploy.yml`)
- [ ] `npm run test:all` — przed lokalnym deployem MVP/staging
- [ ] `npm run test:security` — przed lokalnym `npm run deploy:production`
- [ ] Po Actions deploy: readiness `ready` + `.deployed-sha` = oczekiwany commit
- [ ] `curl …/metrics` — gauge `gateway_readiness` zgodny ze stanem (po włączeniu stacku monitoring)
- [ ] Backup krytycznej konfiguracji / wolumenów (osobno od rollbacku kodu)

---

## Powiązana dokumentacja

- [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) — orchestracja VPS
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — gate przed deployem
- [`konfiguracja.md`](konfiguracja.md) — env, YAML, walidacja, Redis, rate limit
- [`CLI.md`](CLI.md) — wizard i komendy administracyjne
- [`architektura.md`](architektura.md) — moduły i observability
- [`testy.md`](testy.md) — testy jednostkowe, E2E, security
- [`../../SECURITY.md`](../../SECURITY.md) — polityka bezpieczeństwa, sekrety
