# Gateway CLI — documentation

Command-line tool for gateway configuration initialization, managing providers, models, and clients, and developer operations. A **separate entry point** from the HTTP service — architecture details: `architecture.md`, `project.structure.md` (section 2a).

**Command convention:** `gateway <namespace>:<action>` (e.g. `gateway config:init`).

Commands that mutate configuration run in **interactive** mode (terminal prompts). Non-interactive mode is out of current CLI scope.

## Full command list

| Namespace | Command | Description |
|-----------|---------|------|
| *(root)* | `gateway` | Welcome + command list (`npm run cli`) |
| config | `config:init` | Initialization wizard |
| config | `config:validate` | YAML + env validation |
| config | `config:show` | Preview of parsed YAML |
| provider | `provider:list` | List of provider instances |
| provider | `provider:test [instanceId]` | SDK connection test |
| provider | `provider:add` | Add instance (interactively) |
| provider | `provider:remove <instanceId>` | Remove instance + models + key from `.env` |
| provider | `provider:edit <instanceId>` | Enable/disable or rotate API key |
| model | `model:list` | List of model aliases |
| model | `model:add` | Add alias (interactively) |
| model | `model:remove <alias>` | Remove alias from YAML |
| model | `model:edit <alias>` | Edit model fields (checkbox) |
| client | `client:list` | List of gateway clients |
| client | `client:add` | Add client (interactively) |
| client | `client:edit <clientId>` | Edit client / rotate key |
| client | `client:remove <clientId>` | Remove client + key from `.env` |
| key | `key:generate` | Generate master or client key (without writing to `.env`) |

## CLI scope

| Area | Description |
|--------|------|
| Infrastructure (`bin/`, `CliModule`, loader, utilities) | Entry point and Nest DI for CLI |
| Template system (`templates/`, file generators) | Generating YAML, `.env`, system prompts |
| `config:init` wizard (5 steps + final validation) | Interactive configuration from scratch |
| Wizard state resume / rollback | `.gateway-wizard-state.json` |
| `config:validate`, `config:show` | Configuration validation and preview |
| `provider:add`, `provider:remove`, `provider:edit`, `provider:list`, `provider:test` | Provider CRUD and SDK tests |
| `model:add`, `model:list`, `model:remove`, `model:edit` | Model alias CRUD |
| `client:add`, `client:list`, `client:edit`, `client:remove` | Gateway client CRUD |
| `key:generate` | Key generation (without writing to `.env`) |
| CLI unit tests (`npm run test:cli`) | 12 suites / 62 cases |

## Running

### In the repository (development)

```bash
npm install
npm run cli                          # root command (welcome)
npm run cli config:init              # configuration wizard
```

Alternatives (local bin from `package.json`):

```bash
npx gateway config:init
npm link                             # optional — global symlink to the local package
gateway config:init
```

**Note:** the bin in `package.json` is `gateway` (not `gateway-cli`). After `npm link`, the `gateway` command points to `./bin/gateway-cli-wrapper.js`.

### Without building the project

Wrapper `bin/gateway-cli-wrapper.js`:

1. Prefers compiled `dist/bin/gateway-cli.js` (after `npm run build`).
2. When `dist/` is missing — runs TypeScript via `ts-node` (`bin/gateway-cli.ts` → `CliModule`).

The CLI does **not** require `npm run build` before first use.

### Global installation (eventually, end user)

```bash
npm install -g ai-provider-gateway
gateway config:init
```

## Root command

```bash
npm run cli
# or: gateway
```

Displays a welcome (boxen) with a list of all commands. Per-command help: `gateway <command> --help`.

## Quick start

1. After cloning the repository, fill in configuration:

   ```bash
   npm install
   gateway config:init
   ```

   The wizard generates or overwrites `gateway.config.yaml`, `.env`, and prompt files (templates in `src/cli/templates/`).

2. Verify configuration:

   ```bash
   gateway config:validate
   # alternative: npm run config:validate
   ```

3. Test provider connections:

   ```bash
   gateway provider:test
   ```

4. Start the server:

   ```bash
   npm run start:dev
   ```

## Commands — configuration

### `gateway config:init`

Interactive project initialization wizard (`npm init` style).

**File:** `src/cli/commands/config/config-init.command.ts`

**Flow:**

1. **Detect existing configuration**
   - No `gateway.config.yaml` file → wizard from the start.
   - **Boilerplate** (`isBoilerplateConfig()` in `CliConfigLoaderService`) — detected when in `gateway.config.yaml`:
     - `masterKeyRef` contains `PLACEHOLDER` or `placeholder`, **or**
     - an entry key (ID) in `providers:` contains `placeholder`, **or**
     - an entry key (ID) in `clients:` contains `placeholder`.
     → message and start the wizard **without** asking to overwrite.
   - Configured file (after wizard) → ask to overwrite; on “yes” back up `gateway.config.yaml` and `.env` to the `backup/` directory.

2. **Wizard (5 steps)** — `WizardOrchestratorService`:
   - **1/5** Master key (`KeyPromptService` + `KeyGeneratorService` — format `gw_mk_<base64url>`)
   - **2/5** Providers and API keys (`ProviderPromptService`) — default instance IDs `{type}-primary` (`defaultProviderInstanceId`), `apiKeyRef` = `{INSTANCE_ID}_API_KEY` (`deriveApiKeyRef`), key format validation (`validateProviderApiKey`)
   - **3/5** Models / aliases (`ModelPromptService`, default `modelId` from `constants/default-models.ts`: Anthropic `claude-sonnet-4-5-20250929`, Google `gemini-2.5-flash`)
   - **4/5** Gateway clients (`ClientPromptService` — type: `webapp` | `ide` | `cli` | `service` | `backend` | `automation`; keys `gw_<slug>_<base64url>`; env ref `GATEWAY_KEY_<ID>`; optional `rateLimit` per client **in YAML** — limits per client key; requires `RATE_LIMIT_SMART_ENABLED=true` at runtime, see step 5/5)
   - **5/5** Server settings (`ServerPromptService`) — in order:
     - **Basic:** port, `NODE_ENV`, Swagger (`SWAGGER_ENABLED`).
     - **Response cache:** `CACHE_ENABLED`, `CACHE_BACKEND` (`redis` | `noop` — no `memory` option in the wizard).
     - **Smart rate limit:** `RATE_LIMIT_SMART_ENABLED` (independent of cache backend).
     - **Redis (shared infrastructure):** host, port, password — **only when** `isRedisRequired()` from `src/cache/should-include-redis-stack.ts` returns `true`, i.e. when `CACHE_ENABLED=true` **and** `CACHE_BACKEND=redis`, **or** when `RATE_LIMIT_SMART_ENABLED=true`. Same rule as at HTTP startup (`isRedisRequiredFromEnv()` in `AppModule`).
     - **Monitoring:** Sentry LLM (`AI_METRICS_BACKEND`, `SENTRY_*`) or `noop`; App metrics Prometheus (`METRICS_BACKEND`).

3. **Write files** — `ConfigGeneratorService.generateFullConfig()`:
   - `gateway.config.yaml` (all providers `enabled: true`, `masterKeyRef: MASTER_KEY`)
   - `.env` and `.env.example` (template from `templates/env.template.ts` — secret values empty in `.env.example`; Redis data in `.env.example` cleared when `isEnvInputRedisRequired()`)
   - `src/config/system-prompt/MASTER_SYSTEM_PROMPT.md` (if it does not exist)
   - `src/config/system-prompt/models/<alias>.md` per model (if they do not exist)

   **`.env` generation (`generateEnvTemplate`):**

   | Variable / group | Wizard behavior |
   |-----------------|-------------------|
   | `CACHE_*` | From cache step answers (`CACHE_ENABLED`, `CACHE_BACKEND`, fixed `CACHE_TTL`, `CACHE_KEY_PREFIX`). |
   | `REDIS_*` | Set only when Redis is required (`isEnvInputRedisRequired` → `isRedisRequired`); otherwise empty strings. Always: `REDIS_DB`, `REDIS_KEY_PREFIX`. |
   | `RATE_LIMIT_SMART_ENABLED` | Always from user choice in the rate limit step (not tied to `CACHE_BACKEND`). |
   | `RATE_LIMIT_*` (RPS, burst, streams, cooldown) | Fixed defaults in the template. |
   | Provider / client secrets | Full values in `.env` under `apiKeyRef`; legacy `ANTHROPIC_API_KEY` / `GOOGLE_API_KEY` — `applyLegacyProviderApiKeyEnv()`; empty in `.env.example`. |

   Example combinations (aligned with runtime):

   | Cache | Smart rate limit | `.env`: `REDIS_*` | `.env`: `RATE_LIMIT_SMART_ENABLED` |
   |-------|------------------|-------------------|-------------------------------------|
   | `redis` | on / off | yes | per choice |
   | off (`noop`) | on | yes | `true` |
   | off | off | no (empty) | `false` |

4. **Final validation** — `validateGatewayConfig()` from `src/config/config-validator.ts`:
   - Before each iteration, reload `.env` (when `dotenv` is available)
   - Success → success message and next steps
   - Error → error list, choice: manual fix + retry (up to 10 attempts) or abort wizard

**Resume after interruption:**

- Session state: `.gateway-wizard-state.json` in the working directory (`WizardStateManager`)
- Re-running `gateway config:init` → ask to resume
- Rejecting resume → rollback of created files and session backups

**Requirements:** The CLI does **not** require an existing `.env` at wizard start — full runtime validation only at the end of the flow.

### `gateway config:validate`

Validates `gateway.config.yaml` (Zod structure + runtime rules via `validateGatewayConfig()`) and — after successful YAML — env format (`validateEnvironment()` from `configuration-validation.service.ts` via **`CliGatewayValidatorService`**).

```bash
gateway config:validate
```

- Missing `gateway.config.yaml` file → exit `1` with hint `gateway config:init`.
- Detected boilerplate (`isBoilerplateConfig()`) → exit `1` with hint `gateway config:init`.
- YAML schema error or missing key under `apiKeyRef` for an enabled provider → exit `1`.
- Invalid legacy key format (`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` when set) → exit `1`.
- Success → summary (schema version, number of providers/models/clients); warnings (e.g. empty client key) do not block.

**Note:** The command checks the `gateway.config.yaml` file in the working directory.

**Offline alternative (YAML + runtime rules validation):** `npm run config:validate` — script `scripts/validate-config.ts` (details: `configuration.md`). Does **not** run `validateEnvironment()` — for full env validation (legacy key format) use `gateway config:validate`.

### `gateway config:show`

Displays parsed configuration from YAML (without resolving secret values from `.env`):

```bash
gateway config:show
```

Sections: providers (type, `enabled`, `apiKeyRef`), models (alias → `providerInstance`/`modelId`, fallback), clients (type, name, `gatewayKeyRef`, rate limit), master key ref.

With boilerplate it displays the configuration and ends with a **warning** (without exit `1`).

## Boilerplate configuration and commands

Most CRUD commands require full configuration (not boilerplate). Behavior with `isBoilerplateConfig()`:

| Command | Behavior |
|---------|------------|
| `config:init` | Start wizard (without asking to overwrite) |
| `config:validate`, `provider:*` | Warning + exit `1` |
| `config:show` | Displays YAML + warning at the end |
| `model:list`, `model:remove`, `client:list` | Warning + **return** (exit `0`) |
| `model:add`, `model:edit`, `client:add`, `client:edit`, `client:remove` | Warning + exit `1` |
| `key:generate` | Works without `gateway.config.yaml` |

## Commands — providers

Operations on **`providerInstance`** — keys of the `providers` map in YAML (e.g. `anthropic-primary`, `openai-main`, `google-office`). Multiple instances of the same adapter type (`type: anthropic` | `type: google` | `type: openai` | `type: openai-compatible`) are allowed.

### `gateway provider:list`

List of configured provider instances (ID, type, `apiKeyRef`, `enabled`).

```bash
gateway provider:list
```

Requires full configuration (not boilerplate). With no providers — warning message.

### `gateway provider:test [instanceId]`

Tests connection to providers via SDK (`ProviderTestService` — light request, no import from `src/integrations/`). The argument identifier is **`providerInstance`** (key in `providers:`), not the adapter type.

```bash
gateway provider:test              # all instances
gateway provider:test anthropic    # specific instance (e.g. anthropic)
gateway provider:test --provider google-office
```

Tests use fixed SDK models (not aliases from YAML):

| Adapter type | Model in test |
|--------------|------------------|
| `anthropic` | `claude-sonnet-4-5-20250929` |
| `google` | `gemini-2.5-flash` |
| `openai` | `gpt-4o-mini` (requires `baseUrlRef` in env) |
| `openai-compatible` | `gpt-4o-mini` (requires `baseUrlRef`; API key optional) |

Requires full configuration and a filled `.env` (`loadWithEnvCheck()`). Missing variables → exit `1`. When testing all instances, a missing key for one instance ends with Failed status for that item (without immediate exit).

### `gateway provider:add`

Interactive addition of a new provider instance:

- Instance ID (unique, e.g. `google-office`)
- Adapter type (`PROVIDER_TYPES`: `anthropic`, `google`, `openai`, `openai-compatible`)
- For OpenAI types: optional API key, **required** `baseUrlRef` + base URL (default `https://api.openai.com/v1` or `http://localhost:11434/v1`)
- For other types: API key (write to `.env` under `deriveApiKeyRef(instanceId)`; legacy env sync)
- `enabled` flag

If there are no models linked to the new instance → **mandatory** sub-flow to add at least one model (`ModelManagerService.addModelForProvider`) in the same session.

```bash
gateway provider:add
```

Write: YAML backup + `ConfigPersistenceService.persistConfig()` + `EnvPatchService.setVar()`.

### `gateway provider:remove <instanceId>`

Removes the instance, **all** models with `providerInstance === id`, and the `apiKeyRef` entry from `.env`.

```bash
gateway provider:remove google-office
```

Before removal — confirm with a list of related model aliases. When removing the **only active** instance (`enabled !== false`) — extra warning (boxen) and confirm (default: no). Model prompt files (`models/<alias>.md`) are **not** deleted automatically — the CLI prints their paths after success.

### `gateway provider:edit <instanceId>`

Edit an existing instance:

- enable/disable (`enabled`) — enabling requires at least one related model
- API key rotation (same `apiKeyRef` in `.env`)

```bash
gateway provider:edit anthropic
```

## Commands — models

### `gateway model:list`

List of model aliases with `providerInstance`, `modelId`, streaming, fallback.

```bash
gateway model:list
```

### `gateway model:add`

Interactive model addition — choose `providerInstance`, alias, `modelId` (default from `DEFAULT_MODELS`), optionally more models for the same instance. Creates prompt file `src/config/system-prompt/models/<alias>.md` when missing.

```bash
gateway model:add
```

### `gateway model:remove <alias>`

Removes the alias from `gateway.config.yaml` (with backup in `backup/`) and **automatically deletes** the prompt file `src/config/system-prompt/models/<alias>.md` (if it exists).

On Zod validation error after mutation (`validation failed`) YAML is **not** written — the message states the alias was not removed. In that case the prompt file is also not deleted.

If the prompt file does not exist or cannot be deleted, the operation completes successfully with an appropriate info/warning message — removing the model from configuration is the critical operation; removing the prompt is an add-on.

```bash
gateway model:remove chat-default
```

### `gateway model:edit <alias>`

Edit model fields (checkbox in terminal): `modelId`, `providerInstance`, `fallback`, streaming, `policy` (timeout, retry, params).

```bash
gateway model:edit chat-default
```

## Commands — clients

### `gateway client:list`

List of clients with type, name, `gatewayKeyRef`, optional rate limit.

```bash
gateway client:list
```

### `gateway client:add`

Interactive client addition:

- ID, display name, type (`GATEWAY_CLIENT_TYPES`)
- optional rate limit (`rps`, `burst`, `maxConcurrentStreams`)
- automatic key generation `gw_<slug>_<base64url>` and write to `.env` under `GATEWAY_KEY_<ID>`

```bash
gateway client:add
```

### `gateway client:edit <clientId>`

Edit client:

- display name
- client type
- rate limit (set / change / remove)
- gateway key rotation (invalidates the old key in `.env`)

```bash
gateway client:edit webapp
```

### `gateway client:remove <clientId>`

Removes the client from YAML and the `gatewayKeyRef` entry from `.env` (after confirm).

```bash
gateway client:remove webapp
```

## Commands — keys

### `gateway key:generate`

Generates a cryptographically random key (Node.js `crypto.randomBytes`).

```bash
# Master key → gw_mk_<base64url>
gateway key:generate --type master
gateway key:generate master

# Client key → gw_<slug>_<base64url>
gateway key:generate --type client --client-id webapp
gateway key:generate client webapp
```

Options:

- `-t, --type <master|client>` — key type (required)
- `-c, --client-id <id>` — client ID (required for type `client`)

The command does **not** write the key to `.env` — it displays the value in the terminal with an env variable hint and a warning about on-screen visibility.

Formats (aligned with the wizard):

| Type | Format | Env example |
|-----|--------|--------------|
| Master | `gw_mk_<segment>` | `MASTER_KEY` |
| Client | `gw_<slug>_<segment>` | `GATEWAY_KEY_<ID>` |

## Configuration mutation pattern

Add/edit/remove commands (outside the wizard itself) follow a shared pattern:

1. `CliConfigLoaderService.loadRawConfig()` — read YAML
2. In-memory mutation
3. `GatewayConfigSchema.safeParse()` — structure validation
4. Backup `gateway.config.yaml` — `FileManagerService.backupFile()` → `backup/` directory (e.g. `backup/gateway.config.yaml.backup-<timestamp>`; directory in `.gitignore`)
5. Write YAML — `ConfigPersistenceService.persistConfig()`
6. Secrets — `EnvPatchService` (`setVar` / `removeVar` in `.env`)

Dependency direction: **config → cli**, **cache/should-include-redis-stack → cli** (Redis predicate); CLI does **not** import `ConfigModule` or `buildEffectiveGatewayConfig()`.

## CLI layer — summary

| Component | Role |
|-----------|------|
| `CliModule` | Root NestJS module — **without** `ConfigModule` |
| `CliConfigLoaderService` | YAML + `GatewayConfigSchema`; `loadWithEnvCheck()` reports missing env |
| `FileManagerService` | read/write YAML, `.env`, backup to `backup/`, delete files |
| `ConfigGeneratorService` | File generation from templates (wizard) |
| `ConfigPersistenceService` | Zod validation + backup + YAML write after mutations |
| `EnvPatchService` | Update individual variables in `.env` |
| `WizardOrchestratorService` | Wizard step orchestration |
| `WizardStateManager` | Persist `.gateway-wizard-state.json`, rollback |
| `ProviderManagerService` | add / remove / edit provider instances |
| `ModelManagerService` | add / remove / edit model aliases |
| `ClientManagerService` | add / remove / edit clients |
| `ProviderTestService` | Light Anthropic / Google / OpenAI SDK tests |
| `KeyGeneratorService` | Master keys `gw_mk_*`, client `gw_<slug>_*` |
| `CliGatewayValidatorService` | `validateGatewayConfig()` + optionally `validateEnvironment()` (facade — legacy key format) |
| `ProviderPromptService` | Step 2/5 — instance ID, `apiKeyRef`, key format validation |
| `utils/provider-id.util.ts` | `deriveApiKeyRef`, `defaultProviderInstanceId` |
| `utils/legacy-provider-env.util.ts` | `applyLegacyProviderApiKeyEnv`, `syncLegacyProviderApiKeysInEnv` |
| `utils/api-key-validation.util.ts` | Key prefix validation in wizard / CLI |
| `constants/model-allow-overrides.ts` | Default `allowOverrides` list for new models |
| `utils/default-model-policy.util.ts` | Default `capabilities` / `policy` per provider type |
| `ServerPromptService` | Wizard step 5/5 prompts (cache, rate limit, Redis, Sentry) |
| `templates/env.template.ts` | `generateEnvTemplate()`, `isEnvInputRedisRequired()` |
| `src/cache/should-include-redis-stack.ts` | Shared with runtime `isRedisRequired()` logic (CLI imports **without** `ConfigModule`) |

Imports from `src/config/`: types, Zod schemas, `validateGatewayConfig()`, `validateEnvironment()` / validation facade, `PROVIDER_TYPES`, `GATEWAY_CLIENT_TYPES`. Import from `src/cache/should-include-redis-stack.ts`: Redis requirement predicate (redis cache and/or smart rate limit). See `anti-patterns.md` (§14).

## Tips

- `gateway --help` — nest-commander command list
- `gateway <command> --help` — per-command options
- Mutating commands create a `gateway.config.yaml` backup in `backup/` before writing (the wizard does the same for YAML and `.env` when overwriting existing configuration)
- After env changes run `gateway config:validate` before starting the server
- `model:remove` automatically deletes the model prompt file; `provider:remove` lists related model prompts for manual review (there may be many models per provider)

## Related documents

- `configuration.md` — runtime vs CLI loader, shared Redis (cache + rate limit), `npm run config:validate`, placeholder config, multi-instance
- `architecture.md` — CLI / HTTP isolation diagram
- `project.structure.md` — `src/cli/` tree
- `dictionary.md` — terms *Gateway CLI*, *CliConfigLoader*, *placeholder config*, *providerInstance*
