# Deployment Guide — AI Provider Gateway

Przewodnik wdrożenia produkcyjnego i lokalnego (Docker Compose). Artefakty deploymentu znajdują się w katalogu `deployment/` — oddzielonym od kodu źródłowego aplikacji.

Szczegóły konfiguracji runtime (env, YAML, walidacja): [`konfiguracja.md`](konfiguracja.md).  
Gateway CLI (wizard, CRUD providerów/modeli/klientów): [`CLI.md`](CLI.md).

---

## Wymagania

- **Docker** 20.10+
- **Docker Compose** 2.0+
- Klucze API providerów (np. Anthropic, Google) — zależnie od skonfigurowanych adapterów
- (Opcjonalnie) **Node.js 20+** i `npm install` — do walidacji konfiguracji oraz CLI przed deployem

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
├── monitoring/                            # Konfiguracja Prometheus / Grafana
├── scripts/                               # Skrypty deploy / rollback (w przygotowaniu)
└── templates/
    ├── .env.example                       # Szablon zmiennych środowiskowych
    └── gateway.config.example.yaml        # Szablon YAML (boilerplate / placeholder)
```

Pliki aktywne (`gateway.config.yaml`, `.env`) **kopiujesz do katalogu głównego repozytorium** — Docker montuje je stamtąd do kontenera.

---

## Szybki start

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/you/ai-provider-gateway
cd ai-provider-gateway
```

### 2. Konfiguracja

Projekt **nie ma wdrożenia zero-config**. Musisz dostarczyć `gateway.config.yaml` i `.env` w katalogu głównym. Dostępne są dwie ścieżki:

#### Opcja A: Szablony produkcyjne (zalecane dla Docker / CI/CD)

```bash
cp deployment/templates/gateway.config.example.yaml gateway.config.yaml
cp deployment/templates/.env.example .env
```

Następnie uzupełnij pliki:

- **`.env`** — sekrety i ustawienia serwera (`MASTER_KEY`, klucze providerów, opcjonalnie Redis, Sentry, rate limit).
- **`gateway.config.yaml`** — struktura providerów, modeli i klientów.

Szablon YAML w `deployment/templates/gateway.config.example.yaml` to **konfiguracja boilerplate** — minimalny, poprawny schemat Zod z jawnymi placeholderami do uzupełnienia:

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

> **Ważne:** Nazwy zmiennych w `.env` muszą odpowiadać polom `*KeyRef` w YAML (`masterKeyRef`, `apiKeyRef`, `gatewayKeyRef`). Runtime **nie** podstawia `${VAR}` — wczytuje wartości z env po nazwie refa.

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

### 4. Sieć Docker

Wszystkie pliki Compose używają zewnętrznej sieci `ai-gateway-network`. Utwórz ją **raz** przed pierwszym startem:

```bash
docker network create ai-gateway-network
```

### 5. Deploy

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
| `gateway.config.example.yaml` | `deployment/templates/` | Szablon boilerplate (CLI-compatible) | ✅ |
| `gateway.config.yaml` | katalog główny | Aktywna konfiguracja runtime | ❌ (lokalnie) |
| `.env.example` | `deployment/templates/` | Szablon zmiennych | ✅ |
| `.env` | katalog główny | Aktywne sekrety i env | ❌ `.gitignore` |

**Nigdy nie commituj** `gateway.config.yaml` ani `.env` z prawdziwymi sekretami.

Po skopiowaniu szablonu YAML do katalogu głównego i zmianie nazwy na `gateway.config.yaml` struktura pozostaje zgodna z walidatorem Zod (`src/config/gateway-config.schema.ts`) i z komendami CLI — nie trzeba konwertować formatu między „szablonem deploymentu” a „formatem projektu”.

---

## Kiedy użyć której metody konfiguracji

| Scenariusz | Metoda | Powód |
|------------|--------|-------|
| Pierwsze uruchomienie lokalne | CLI `config:init` | Szybki, prowadzony setup z walidacją |
| Docker Compose / VPS | Szablony z `deployment/templates/` | Brak TTY w kontenerze |
| Kubernetes / CI/CD | Szablony + ConfigMap / Secrets Manager | Sekrety wstrzykiwane w runtime |
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

Pełny szablon: `deployment/templates/.env.example`.

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
| `SENTRY_DSN` | pusty | Error reporting / metryki Sentry |
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

---

## Monitoring i logi

- **Logi kontenera:** `docker logs ai-gateway -f` lub `make docker-logs`
- **Prometheus:** http://localhost:9090 (po włączeniu rozszerzenia monitoring)
- **Grafana:** http://localhost:3001 — `make dashboard`
- **Health:**
  - Liveness: `GET /api/v1/health`
  - Readiness: `GET /api/v1/health/ready`

---

## Rozwiązywanie problemów

### „Configuration validation failed” / boilerplate detected

```bash
gateway config:show          # podgląd YAML
gateway config:init          # wizard (gdy boilerplate)
npm run config:validate      # walidacja YAML + reguły runtime (bez formatu legacy env)
gateway config:validate      # pełna walidacja (+ format legacy ANTHROPIC/GOOGLE gdy ustawione)
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

Typowe przyczyny: brak `gateway.config.yaml` w katalogu głównym, brak sieci `ai-gateway-network`, pusty `MASTER_KEY`, port 3000 zajęty, błąd składni YAML.

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

---

## Checklist produkcyjny

Przed wdrożeniem na produkcję:

- [ ] `MASTER_KEY` — silna wartość losowa (`gateway key:generate --type master` lub `openssl rand -hex 32`)
- [ ] Klucze providerów i klientów — rotacja i przechowywanie poza repozytorium
- [ ] HTTPS — reverse proxy (nginx, Traefik, load balancer)
- [ ] Limity rate limit — dopasowane do tierów API providerów i ruchu
- [ ] Redis — jeśli włączony cache (`CACHE_BACKEND=redis`) lub smart rate limit
- [ ] `gateway config:validate` — sukces na serwerze docelowym (pełniejsza niż sam `npm run config:validate`)
- [ ] `npm run test:all` — przed deployem produkcyjnym (`deploy:production` w planie obejmuje też testy security — Faza 3)
- [ ] Backup zaszyfrowanych plików konfiguracyjnych

---

## Powiązana dokumentacja

- [`konfiguracja.md`](konfiguracja.md) — env, YAML, walidacja, Redis, rate limit
- [`CLI.md`](CLI.md) — wizard i komendy administracyjne
- [`architektura.md`](architektura.md) — moduły i observability
- [`testy.md`](testy.md) — testy jednostkowe, E2E, security
