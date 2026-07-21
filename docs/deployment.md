# Deployment — AI Provider Gateway

Guide for local deployment (Docker Compose) and production on a VPS via **GitHub Actions** (self-hosted runner). Deployment artifacts live in the `deployment/` directory — separate from application source code. Production workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

Runtime configuration details (env, YAML, validation): [`configuration.md`](configuration.md).  
Gateway CLI (wizard, provider/model/client CRUD): [`command_line_interface.md`](command_line_interface.md).

---

## Requirements

- **Docker** 20.10+
- **Docker Compose** 2.0+
- Provider API keys (e.g. Anthropic, Google) — depending on configured adapters
- (Optional) **Node.js 20+** and `npm install` — for configuration validation and CLI before deploy
- **VPS deploy (Actions):** self-hosted runner on the server (`[self-hosted, linux]`), Docker daemon available to the runner (often DooD / `docker.sock`), HashiCorp Vault (AppRole) with application secrets, GitHub Environment `production` (`VAULT_ROLE_ID`, `VAULT_SECRET_ID`)

---

## `deployment/` structure

```
deployment/
├── docker/
│   ├── Dockerfile                         # Multi-stage build (production)
│   ├── docker-compose.yml                 # MVP: gateway only
│   ├── docker-compose.redis.yml           # Extension: + Redis
│   ├── docker-compose.monitoring.yml      # Extension: + Prometheus + Grafana
│   ├── docker-compose.ollama.yml          # Extension: + Ollama (local LLM)
│   ├── docker-compose.dev.yml             # Override: dev mode (hot reload)
│   └── docker-compose.override.yml.example
├── monitoring/                            # Prometheus, Grafana, alert rules
│   ├── prometheus.yml                     # Scrape /metrics every 10s
│   ├── alerts.yml                         # GatewayDown, GatewayNotReady, …
│   └── grafana/
├── scripts/                               # Deploy / rollback (used by Actions)
│   ├── deploy-production.sh               # sync | secrets | up | health | all (full stack)
│   ├── deploy-staging.sh                  # like production, without Redis (DEPLOY_MODE=staging)
│   └── rollback.sh                        # auto-rollback to last known-good SHA
└── templates/
    ├── .env.example                       # Environment variable template
    └── gateway.config.example.yaml        # YAML template (boilerplate / placeholder)
```

Active files (`gateway.config.yaml`, `.env`) are **copied to the repository root** — local Docker mounts them from there into the container. On a VPS the pipeline syncs the checkout to the host directory (default `/opt/ai-provider-gateway`) and bind-mounts from there.

---

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/you/ai-provider-gateway
cd ai-provider-gateway
```

### 2. Configuration

The project has **no zero-config deployment**. You must provide `gateway.config.yaml` and `.env` in the root directory. Two paths are available:

#### Option A: Production templates (recommended for Docker / CI/CD)

```bash
cp deployment/templates/gateway.config.example.yaml gateway.config.yaml
cp deployment/templates/.env.example .env
```

Then fill in the files:

- **`.env`** — secrets and server settings (`MASTER_KEY`, provider keys, optionally Redis, Sentry, rate limit).
- **`gateway.config.yaml`** — provider, model, and client structure.

The YAML template in `deployment/templates/gateway.config.example.yaml` is **boilerplate configuration** — a minimal, valid Zod schema with explicit placeholders to fill in:

| Element | Example in template |
|---------|----------------------|
| `masterKeyRef` | `MASTER_KEY_PLACEHOLDER` |
| Provider ID | `placeholder-provider` |
| `apiKeyRef` | `ANTHROPIC_API_KEY_PLACEHOLDER` |
| Client ID | `placeholder-client` |
| Model alias | `placeholder-model` |

This means:

1. A **new user** immediately sees that the file needs filling in (it is not a ready production configuration).
2. The **CLI layer** recognizes boilerplate (`isBoilerplateConfig()` — IDs/refs containing `placeholder` / `PLACEHOLDER`) and can start the wizard **without asking to overwrite** an existing file.

After copying the template to `gateway.config.yaml` you can:

- **Manually** replace placeholders with real env names and entries (per the Zod schema — see [`configuration.md`](configuration.md) section 2), **or**
- Run the wizard (Option B), which generates a full operational configuration.

> **Important:** Variable names in `.env` must match `*KeyRef` fields in YAML (`masterKeyRef`, `apiKeyRef`, `gatewayKeyRef`). Runtime does **not** substitute `${VAR}` — it loads values from env by the ref name.

#### Option B: CLI wizard (recommended for first local run)

```bash
npm install
npm run cli config:init
# or: npx gateway config:init
```

The wizard generates `gateway.config.yaml`, `.env`, and `.env.example`. If a boilerplate template is already copied in the root, the CLI detects it automatically and proposes a full configuration.

Flow details: [`command_line_interface.md`](command_line_interface.md) — `config:init` section.

### 3. Validation (recommended before deploy)

```bash
npm install   # if not yet done
npm run config:validate
# alternative: gateway config:validate
```

With boilerplate configuration the validator will fail and point to `gateway config:init` — this is expected behavior **before** filling in the files.

### 4. Docker network

All Compose files use the external network `ai-gateway-network`. Create it **once** before the first start:

```bash
docker network create ai-gateway-network
```

### 5. Deploy

Choose a stack variant:

| Variant | Makefile | npm |
|---------|----------|-----|
| MVP (gateway only) | `make docker-up` | `npm run docker:up` |
| Gateway + Redis | `make docker-up-redis` | `npm run docker:up:redis` |
| Gateway + monitoring | `make docker-up-monitoring` | `npm run docker:up:monitoring` |
| Full stack (prod) | `make docker-up-full` | `npm run docker:up:full` |
| Dev (hot reload) | `make docker-up-dev` | `npm run docker:up:dev` |
| Dev + full stack | `make docker-up-dev-full` | `npm run docker:up:dev:full` |

Image build (optionally separately):

```bash
make docker-build
# or: npm run docker:build
```

Compose loads `.env` from the root directory (`--env-file .env`) and mounts:

- `gateway.config.yaml` → `/app/gateway.config.yaml` (read-only)
- `logs/` → `/app/logs/`

### 6. Verification

```bash
# Liveness
curl http://localhost:3000/api/v1/health

# Readiness (config, Redis, cache — depending on env)
curl http://localhost:3000/api/v1/health/ready

# Chat test (replace YOUR_MASTER_KEY and model alias)
curl -X POST http://localhost:3000/api/v1/chat \
  -H "X-Gateway-Key: YOUR_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "modelAlias": "chat-default",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Stopping

```bash
make docker-down
# or: npm run docker:down
```

---

## Service access

| Service | URL | Notes |
|--------|-----|-------|
| Gateway | http://localhost:3000 | API under `/api/v1` prefix |
| Swagger UI | http://localhost:3000/api/v1/api-docs | Disabled in production by default (`SWAGGER_ENABLED`) |
| Prometheus | http://localhost:9090 | Only with `docker-compose.monitoring.yml` |
| Grafana | http://localhost:3001 | Login: `GRAFANA_USER` / `GRAFANA_PASSWORD` from `.env` (default admin/admin) |
| Redis | localhost:6379 | Only with the Redis extension |

---

## Configuration files

| File | Location | Purpose | In Git |
|------|-------------|-----|-------|
| `gateway.config.example.yaml` | `deployment/templates/` | Boilerplate template (CLI-compatible) | ✅ |
| `gateway.config.yaml` | root directory | Active runtime configuration | ❌ (local) |
| `.env.example` | `deployment/templates/` | Variable template | ✅ |
| `.env` | root directory | Active secrets and env | ❌ `.gitignore` |

**Never commit** `gateway.config.yaml` or `.env` with real secrets.

After copying the YAML template to the root and renaming it to `gateway.config.yaml`, the structure remains compatible with the Zod validator (`src/config/gateway-config.schema.ts`) and CLI commands — you do not need to convert formats between the “deployment template” and the “project format”.

---

## When to use which configuration method

| Scenario | Method | Reason |
|------------|--------|-------|
| First local run | CLI `config:init` | Fast, guided setup with validation |
| Docker Compose / VPS | Templates from `deployment/templates/` | No TTY in the container |
| Kubernetes / CI/CD | Templates + ConfigMap / Secrets Manager | Secrets injected at runtime |
| Adding a provider locally | CLI `provider:add` | Validation and `.env` sync |
| Dev → prod migration | Files generated by CLI | After reviewing secrets and limits — mount the same files in Docker |

If you used the CLI in development and want to deploy to production:

1. `gateway config:validate`
2. Review `MASTER_KEY`, provider keys, rate limit limits, and `SWAGGER_ENABLED`
3. Copy `gateway.config.yaml` and `.env` to the server (or to a volume/secrets manager)
4. `npm run docker:up:full` (or the chosen variant)

---

## Customizing configuration (project schema)

The examples below use the **current** YAML schema (maps `providers`, `clients`, `models` — not lists or nested vendors).

### Adding a provider instance

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

In `.env` add values under exactly those ref names.

### Adding a model alias

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

### Adding a gateway client

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

Generate a key: `gateway key:generate --type client --client-id webapp` and store the value in `.env` under `GATEWAY_KEY_WEBAPP`.

More fields and rules: [`configuration.md`](configuration.md).

---

## Environment variables

Full template: `deployment/templates/.env.example`.

**Required to start** (after filling in boilerplate — names depend on YAML):

- Value under `masterKeyRef` (in the template: `MASTER_KEY_PLACEHOLDER`)
- Values under each enabled provider’s `apiKeyRef` (in the template: `ANTHROPIC_API_KEY_PLACEHOLDER`)
- Values under client `gatewayKeyRef` (in the template: `GATEWAY_KEY_PLACEHOLDER`)

**Commonly used optional:**

| Variable | Default | Meaning |
|---------|-----------|-----------|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | — | `production` / `development` |
| `REDIS_HOST` | `localhost` | Redis host (in Compose: `redis`) |
| `CACHE_ENABLED` | `false` | Enable response cache |
| `CACHE_BACKEND` | `noop` | `redis` requires Redis |
| `RATE_LIMIT_SMART_ENABLED` | `false` | Smart rate limit per key (requires Redis) |
| `SENTRY_DSN` | empty | Error reporting / AI metrics (Sentry) |
| `METRICS_BACKEND` | auto | `prometheus` / `noop` — in production defaults to Prometheus |
| `LOG_LEVEL` | `info` | Pino log level |
| `GRAFANA_USER` / `GRAFANA_PASSWORD` | admin/admin | Grafana panel in the monitoring stack |

Env validation details: [`configuration.md`](configuration.md) section 1.

---

## Deployment variants (modular Compose)

Compose files can be **combined** — each adds services without forcing a full stack:

```bash
# Redis only (standalone)
make redis-up

# Monitoring only
make monitoring-up

# Gateway + Redis + Prometheus + Grafana
make docker-up-full
```

Local override: copy `deployment/docker/docker-compose.override.yml.example` → `deployment/docker/docker-compose.override.yml` (file in `.gitignore`).

Logs:

```bash
make docker-logs
# or: npm run docker:logs:gateway
```

Local shortcuts `npm run deploy:mvp` / `deploy:staging` / `deploy:production` (and `make` equivalents) are **deploy on the developer machine** (tests + Compose). **Production on a VPS** goes through GitHub Actions — section below.

---

## Deploy to VPS (GitHub Actions)

Production pipeline: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) → script [`deployment/scripts/deploy-production.sh`](../deployment/scripts/deploy-production.sh).

### Assumptions

| Element | Value / role |
|--------|----------------|
| Trigger | `workflow_dispatch` only (manual Run workflow) |
| Runner | Self-hosted, labels `[self-hosted, linux]` (VPS) |
| Environment | GitHub `production` (approval + Vault AppRole secrets) |
| Host directory | `/opt/ai-provider-gateway` (`DEPLOY_DIR`) |
| Last known-good | File `/opt/ai-provider-gateway/.deployed-sha` |
| CI gate | At least one **successful** `ci.yml` workflow run for the deployed SHA |
| Application secrets | Vault KV `secret/data/ai-provider-gateway/prod` → `.env` (workspace + host) |
| Readiness | `GET http://ai-gateway:3000/api/v1/health/ready` → `body.status == "ready"` |
| Health retries | Default **6** attempts every **5 s** (`HEALTH_ATTEMPTS` in `deploy-production.sh`) |

The workflow definition comes from the branch selected in the Actions UI (“Use workflow from”). **Code and scripts** come from the `branch` / `sha` input (checkout of the deployed ref). Scripts must exist in that ref — otherwise `bash deployment/scripts/...` steps will fail.

### How to run a deploy

1. Ensure there is a green [`ci.yml`](../.github/workflows/ci.yml) run for the target SHA (on push to a feature branch usually a fast mode: lint + unit).
2. Actions → **Deploy to VPS** → Run workflow.
3. Inputs:
   - **`branch`** — branch tip (default in the workflow: feature used for learning the flow),
   - **`sha`** (optional) — specific commit or tag; when set, **overrides** the branch tip.

Manual rollback without waiting for auto-rollback: the same workflow with `sha` = previous good commit (re-deploy of a known ref).

### Happy path flow

1. Resolve ref → checkout → record deploy SHA.
2. Verify green CI for that SHA.
3. Read last known-good from the host (`.deployed-sha`) — for now only for possible rollback.
4. **Mutation point** — from here a failure may leave the host in a half-state; auto-rollback is authorized.
5. `deploy-production.sh sync` — stop old gateway/prometheus/grafana containers, clear `DEPLOY_DIR` (keeps `.env` and `.deployed-sha`), upload checkout via tar (DooD-safe path).
6. `secrets` — AppRole login to Vault, write `.env`.
7. `up` — network `ai-gateway-network`, host bind overlays + `main_network`, `compose build gateway` + `up -d` (full stack: gateway + Redis + monitoring).
8. `health` — readiness loop.
9. Write new SHA to `.deployed-sha`.
10. Cleanup workspace `.env` (does **not** delete host `.env`).

Concurrency: group `deploy-vps`, `cancel-in-progress: false` — parallel deploys queue, they do not cancel each other.

### Auto-rollback

When a step after the mutation point fails (e.g. health), and the host has a last-good SHA **different** from the failed SHA:

1. Checkout last-good SHA.
2. [`rollback.sh`](../deployment/scripts/rollback.sh) → `deploy-production.sh all` with **`SKIP_VAULT_FETCH=true`** (reuse host `.env`; Vault only when `.env` is missing on the host).
3. After a successful rollback the workflow **still ends red** (step “Fail run after successful auto-rollback”), so Actions history shows primary fail + recovery.

First successful deploy (no `.deployed-sha`) or failed SHA = last-good → auto-rollback does **not** run.

### Verification after deploy / rollback

```bash
# on VPS / from the Docker network
curl -s http://ai-gateway:3000/api/v1/health/ready | jq .
cat /opt/ai-provider-gateway/.deployed-sha
```

In the Actions UI on a successful auto-rollback: completed checkout last-good + Auto-rollback steps, summary with `SUCCEEDED`, message that primary failed and production was restored; job status = failure (intentional).

### Scripts — API summary

```bash
# full production path (as in Actions, step by step)
bash deployment/scripts/deploy-production.sh sync
bash deployment/scripts/deploy-production.sh secrets   # requires VAULT_ROLE_ID / VAULT_SECRET_ID
bash deployment/scripts/deploy-production.sh up
bash deployment/scripts/deploy-production.sh health

# staging locally / manually (Compose without Redis)
bash deployment/scripts/deploy-staging.sh all
```

Important variables: `DEPLOY_DIR`, `LAST_GOOD_SHA_FILE`, `SKIP_VAULT_FETCH`, `HEALTH_URL`, `HEALTH_ATTEMPTS`, `DEPLOY_MODE` (`production` \| `staging`). Details in script headers.

---

## Monitoring and logs

- **Container logs:** `docker logs ai-gateway -f` or `make docker-logs`
- **Prometheus:** http://localhost:9090 (after enabling the monitoring extension)
- **Grafana:** http://localhost:3001 — `make dashboard`
- **Application metrics:** `GET /metrics` (public, **without** `/api/v1` prefix) — Prometheus text format; before export, readiness gauges are refreshed (`gateway_readiness`, `gateway_health_status{component="config|redis|cache"}`) and `gateway_process_uptime_seconds`
- **HTTP health:**
  - Liveness: `GET /api/v1/health`
  - Readiness: `GET /api/v1/health/ready` (Docker HEALTHCHECK parses `body.status`)

### Metrics verification (locally / after deploy)

```bash
# Readiness in Prometheus (without curling /ready)
curl -s http://localhost:3000/metrics | grep -E 'gateway_readiness|gateway_health_status'

# Expected example (when gateway is ready):
# gateway_readiness 1
# gateway_health_status{component="config"} 1
# gateway_health_status{component="redis"} 1
# gateway_health_status{component="cache"} 1
```

### Prometheus and alerts

Configuration: `deployment/monitoring/prometheus.yml` (scrape every **10s**, job `ai-gateway`, path `/metrics`). Alert rules: `deployment/monitoring/alerts.yml`:

| Alert | Description |
|-------|------|
| `GatewayDown` | Missing scrape target (`up == 0`) |
| `GatewayNotReady` | `gateway_readiness == 0` for 2m |
| `GatewayConfigUnhealthy` | `gateway_health_status{component="config"} == 0` |
| `GatewayRedisDegraded` | Redis `< 1` (degraded/unhealthy) |
| `GatewayCacheDegraded` | Cache `< 1` |
| `GatewayHighEventLoopLag` | `gateway_nodejs_eventloop_lag_seconds > 0.5` |

Rule validation (Docker):

```bash
docker run --rm --entrypoint promtool -v "%cd%/deployment/monitoring:/etc/prometheus:ro" prom/prometheus:latest check rules /etc/prometheus/alerts.yml
```

On Linux/macOS replace `%cd%` with `$(pwd)`.

---

## Troubleshooting

### “Configuration validation failed” / boilerplate detected

```bash
gateway config:show          # YAML preview
gateway config:init          # wizard (when boilerplate)
npm run config:validate      # YAML + runtime rules validation (without legacy env format)
gateway config:validate      # full validation (+ legacy ANTHROPIC/GOOGLE format when set)
```

Ensure `.env` contains values for all `*KeyRef` from YAML.

### Invalid provider key

```bash
gateway provider:test
# or: gateway provider:test anthropic-primary
```

### Gateway container does not start

```bash
docker logs ai-gateway
```

Typical causes: missing `gateway.config.yaml` in the root directory, missing `ai-gateway-network` network, empty `MASTER_KEY`, port 3000 in use, YAML syntax error.

### Redis unavailable

```bash
docker ps | grep redis
docker exec ai-gateway-redis redis-cli ping   # expected: PONG
```

When `RATE_LIMIT_SMART_ENABLED=true` or `CACHE_BACKEND=redis`, readiness may report `degraded` without a working Redis.

### Prometheus / Grafana do not respond

Ensure you started the stack with `docker-compose.monitoring.yml`:

```bash
npm run docker:up:monitoring
curl http://localhost:9090/-/healthy
curl http://localhost:3001/api/health
```

### Deploy Actions: “No successful CI run”

Deploy requires a green `ci.yml` run for the **same** SHA. Wait for CI or run `workflow_dispatch` on `ci.yml`, then retry Deploy.

### Deploy Actions: health waits long, then fails

`deploy-production.sh` tries readiness up to `HEALTH_ATTEMPTS` times (default 6 × 5 s). With a failing container this is intentional delay before auto-rollback — not an immediate fail.

### Deploy Actions: auto-rollback did not run

Check whether the fail was **after** the mutation step, whether `/opt/ai-provider-gateway/.deployed-sha` exists, and whether it differs from the failed SHA. The first successful deploy creates that file.

---

## Production checklist

Before deploying to production:

- [ ] `MASTER_KEY` — strong random value (`gateway key:generate --type master` or `openssl rand -hex 32`)
- [ ] Provider and client keys — rotation; on VPS the source is **Vault** (do not commit `.env`)
- [ ] GitHub Environment `production`: `VAULT_ROLE_ID`, `VAULT_SECRET_ID`; self-hosted runner online
- [ ] Host directory `/opt/ai-provider-gateway` exists and is mountable by the Docker daemon
- [ ] HTTPS — reverse proxy (nginx, Traefik, load balancer)
- [ ] Rate limit limits — matched to provider API tiers and traffic
- [ ] Redis — if cache is enabled (`CACHE_BACKEND=redis`) or smart rate limit
- [ ] `gateway config:validate` — success on the target configuration (more complete than `npm run config:validate` alone)
- [ ] Green `ci.yml` for the SHA that will go to the VPS (gate in `deploy.yml`)
- [ ] `npm run test:all` — before local MVP/staging deploy
- [ ] `npm run test:security` — before local `npm run deploy:production`
- [ ] After Actions deploy: readiness `ready` + `.deployed-sha` = expected commit
- [ ] `curl …/metrics` — `gateway_readiness` gauge matches state (after enabling the monitoring stack)
- [ ] Backup of critical configuration / volumes (separate from code rollback)

---

## Related documentation

- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — VPS orchestration
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — gate before deploy
- [`configuration.md`](configuration.md) — env, YAML, validation, Redis, rate limit
- [`command_line_interface.md`](command_line_interface.md) — wizard and administrative commands
- [`architecture.md`](architecture.md) — modules and observability
- [`testing.md`](testing.md) — unit, E2E, security tests
- [`SECURITY.md`](../SECURITY.md) — security policy, secrets
