# Gateway CLI — documentation

Command-line tool for initializing gateway configuration, managing providers, models, and clients, and developer operations. A **separate entry point** from the HTTP service — architecture details: `architecture.md`, `project.structure.md` (section 2a).

**Command convention:** `gateway <namespace>:<action>` (e.g. `gateway config:init`).

The CLI supports **two** work modes:

| Mode | For whom | How |
|------|----------|-----|
| **Interactive** | Operator in the terminal | Default — inquirer prompts (e.g. `gateway config:init`) |
| **Agent** | Agents / automation (Agent skills, scripts) | `--agent --answers <file.json>` + usually `--json` |

Secrets (API keys, base URL, DSN, passwords) in agent mode do **not** go into the answers file — a human fills them in locally in `.env` (**human in the tool**). Details: [Work modes](#work-modes-interactive-and-agent).

## Full command list

| Namespace | Command | Description |
|-----------|---------|-------------|
| *(root)* | `gateway` | Welcome + command list (`npm run cli`) |
| config | `config:init` | Initialization wizard (interactive **or** `--agent`) |
| config | `config:validate` | YAML + env validation (`--json` optional) |
| config | `config:show` | Preview of parsed YAML (`--json` optional) |
| config | `config:secrets-status` | Gate for missing entries in `.env` (agent / CI; `--json`) |
| provider | `provider:list` | List of provider instances (`--json`) |
| provider | `provider:test [instanceId]` | SDK connection test (`--json`) |
| provider | `provider:add` | Add an instance (interactively **or** `--agent`) |
| provider | `provider:remove <instanceId>` | Remove instance + models + key from `.env` |
| provider | `provider:edit <instanceId>` | Enable/disable or rotate API key |
| model | `model:list` | List of model aliases (`--json`) |
| model | `model:add` | Add an alias (interactively **or** `--agent`) |
| model | `model:remove <alias>` | Remove alias from YAML |
| model | `model:edit <alias>` | Edit model fields |
| client | `client:list` | List of gateway clients (`--json`) |
| client | `client:add` | Add a client (interactively **or** `--agent`) |
| client | `client:edit <clientId>` | Edit client / rotate key |
| client | `client:remove <clientId>` | Remove client + key from `.env` |
| key | `key:generate` | Generate a key (interactive: print; agent: `--write-env`) |

## CLI scope

| Area | Description |
|------|-------------|
| Infrastructure (`bin/`, `CliModule`, loader, utilities) | Entry point and Nest DI for CLI |
| Agent layer (`src/cli/agent/`, `schemas/agent-answers.schema.ts`) | `--agent` / `--answers` / `AgentReport`, inquirer guard, pending secrets |
| Template system (`templates/`, file generators) | Generating YAML, `.env`, system prompts |
| `config:init` wizard (5 steps + final validation) | Interactive configuration from scratch **or** answers → `runFromAnswers` |
| Wizard state resume / rollback | `.gateway-wizard-state.json` (mainly interactive mode) |
| `config:validate`, `config:show`, `config:secrets-status` | Validation, preview, secrets gate |
| `provider:*`, `model:*`, `client:*` | CRUD (both modes) and provider SDK tests |
| `key:generate` | Key generation (print or write to `.env` in agent mode) |
| CLI unit tests (`npm run test:cli`) | Counters: `testing.md` |

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

The `bin/gateway-cli-wrapper.js` wrapper:

1. Prefers the compiled `dist/bin/gateway-cli.js` (after `npm run build`).
2. When `dist/` is missing — runs TypeScript via `ts-node` (`bin/gateway-cli.ts` → `CliModule`).

The CLI does **not** require `npm run build` before first use.

### Global installation (target, end user)

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

1. After cloning the repository, complete the configuration:

   ```bash
   npm install
   gateway config:init
   # or via agent: npm run cli -- config:init --agent --answers <file.json> --json
   ```

   The wizard (or agent init) generates or overwrites `gateway.config.yaml`, `.env`, and prompt files (templates in `src/cli/templates/`).

2. Verify the configuration:

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

## Work modes: interactive and agent

`resolveCliMode()` (`src/cli/agent/resolve-cli-mode.ts`) sets the mode based on flags. Agent mode also sets `GATEWAY_CLI_AGENT=1` (`markAgentRuntime`) — `assertInteractiveAllowed()` then refuses inquirer prompts.

### Shared flags (mutations)

| Flag | Meaning |
|------|---------|
| `--agent` | Agent mode (no inquirer); requires `--answers` on mutating commands |
| `--answers <path>` | JSON file with answers (Zod schema per command in `agent-answers.schema.ts`) |
| `--json` | Machine-readable report (`AgentReport` or list/validate result) on **stdout** |
| `--force` / `-y` / `--yes` | Skip confirm / overwrite (incl. existing config on `config:init`) |
| `--defer-secrets` | In agent mode **enabled by default** — secrets are not in answers; a human fills in `.env` |

Read-only commands (`*:list`, `config:show`, `config:validate`, `config:secrets-status`, `provider:test`) usually suffice with `--json` (without `--agent`).

### Answers contract

- Field SSoT: `src/cli/schemas/agent-answers.schema.ts` (`InitAnswersSchema`, `ProviderAddAnswersSchema`, …).
- `schemaVersion: 1` on every file.
- **Forbidden** in answers: secret values (`apiKey`, `baseUrl`, `gatewayKey`, `redisPassword`, `sentryDsn`, raw `masterKey`, …) — `rejectSecretFields` in Zod.
- Do **not** commit answers files (e.g. `.gateway-init-answers.json`, `.gateway-crud-answers.json`).

### `AgentReport` (stdout with `--json`)

```ts
// src/cli/agent/agent-report.ts
{ ok, status, command, files?, pendingSecrets?, generatedKeyRefs?, warnings?, errors?, next? }
```

| Exit | `status` | Meaning |
|------|----------|---------|
| `0` | `success` | OK |
| `2` | `awaiting_secrets` | Structure saved; missing values in `.env` — handoff to the user |
| `1` | `error` | Error — read `errors[]` |

After `awaiting_secrets`: the user edits `.env` locally → `gateway config:secrets-status --json` (exit `0`) → `gateway config:validate --json`.

### Agent examples

```bash
# Init from scratch
npm run cli -- config:init --agent --answers .gateway-init-answers.json --json
# optionally: --force when overwriting / abandoning an unfinished wizard session

# CRUD (one mutation)
npm run cli -- provider:add --agent --answers .gateway-crud-answers.json --json

# Secrets gate + validation
npm run cli -- config:secrets-status --json
npm run cli -- config:validate --json
```

Orchestration via IDE agents: skills `.agents/skills/gateway-setup` (`config:init`) and `.agents/skills/gateway-config` (CRUD) — protocol: `references/agent-protocol.md`.

## Commands — configuration

### `gateway config:init`

Project initialization: **interactive wizard** (`npm init` style) **or** agent mode (`--agent --answers`).

**File:** `src/cli/commands/config/config-init.command.ts`

**Interactive flow:**

1. **Detecting existing configuration**
   - No `gateway.config.yaml` file → wizard from the start.
   - **Boilerplate** (`isBoilerplateConfig()` in `CliConfigLoaderService`) — detected when in `gateway.config.yaml`:
     - `masterKeyRef` contains `PLACEHOLDER` or `placeholder`, **or**
     - a key (ID) of an entry in `providers:` contains `placeholder`, **or**
     - a key (ID) of an entry in `clients:` contains `placeholder`.
     → message and wizard start **without** asking about overwrite.
   - Configured file (after wizard) → overwrite prompt; on “yes” backup `gateway.config.yaml` and `.env` to the `backup/` directory.

2. **Wizard (5 steps)** — `WizardOrchestratorService`:
   - **1/5** Master key (`KeyPromptService` + `KeyGeneratorService` — format `gw_mk_<base64url>`)
   - **2/5** Providers and API keys (`ProviderPromptService`) — default instance IDs `{type}-primary` (`defaultProviderInstanceId`), `apiKeyRef` = `{INSTANCE_ID}_API_KEY` (`deriveApiKeyRef`), key format validation (`validateProviderApiKey`)
   - **3/5** Models / aliases (`ModelPromptService`, default `modelId` from `constants/default-models.ts`: Anthropic `claude-sonnet-4-5-20250929`, Google `gemini-2.5-flash`)
   - **4/5** Gateway clients (`ClientPromptService` — type: `webapp` | `ide` | `cli` | `service` | `backend` | `automation`; keys `gw_<slug>_<base64url>`; env ref `GATEWAY_KEY_<ID>`; optional `rateLimit` per client **in YAML** — limits per client key; requires at runtime `RATE_LIMIT_SMART_ENABLED=true`, see step 5/5)
   - **5/5** Server settings (`ServerPromptService`) — in order:
     - **Basic:** port, `NODE_ENV`, Swagger (`SWAGGER_ENABLED`).
     - **Response cache:** `CACHE_ENABLED`, `CACHE_BACKEND` (`redis` | `noop` — no `memory` option in the wizard).
     - **Smart rate limit:** `RATE_LIMIT_SMART_ENABLED` (independent of the cache backend).
     - **Redis (shared infrastructure):** host, port, password — **only when** `isRedisRequired()` from `src/cache/should-include-redis-stack.ts` returns `true`, i.e. when `CACHE_ENABLED=true` **and** `CACHE_BACKEND=redis`, **or** when `RATE_LIMIT_SMART_ENABLED=true`. The same rule as at HTTP startup (`isRedisRequiredFromEnv()` in `AppModule`).
     - **Monitoring:** Sentry LLM (`AI_METRICS_BACKEND`, `SENTRY_*`) or `noop`; App metrics Prometheus (`METRICS_BACKEND`).

3. **Writing files** — `ConfigGeneratorService.generateFullConfig()`:
   - `gateway.config.yaml` (all providers `enabled: true`, `masterKeyRef: MASTER_KEY`)
   - `.env` and `.env.example` (template from `templates/env.template.ts` — secret values empty in `.env.example`; Redis data in `.env.example` cleared when `isEnvInputRedisRequired()`)
   - `src/config/system-prompt/MASTER_SYSTEM_PROMPT.md` (if it does not exist)
   - `src/config/system-prompt/models/<alias>.md` per model (if they do not exist)

   **`.env` generation (`generateEnvTemplate`):**

   | Variable / group | Wizard behavior |
   |-----------------|-----------------|
   | `CACHE_*` | From cache step answers (`CACHE_ENABLED`, `CACHE_BACKEND`, fixed `CACHE_TTL`, `CACHE_KEY_PREFIX`). |
   | `REDIS_*` | Set only when Redis is required (`isEnvInputRedisRequired` → `isRedisRequired`); otherwise empty strings. Always: `REDIS_DB`, `REDIS_KEY_PREFIX`. |
   | `RATE_LIMIT_SMART_ENABLED` | Always from the user choice in the rate limit step (not tied to `CACHE_BACKEND`). |
   | `RATE_LIMIT_*` (RPS, burst, streams, cooldown) | Fixed defaults in the template. |
   | Provider / client secrets | Full values in `.env` under `apiKeyRef` / `gatewayKeyRef`; empty in `.env.example`. |

   Example combinations (consistent with runtime):

   | Cache | Smart rate limit | `.env`: `REDIS_*` | `.env`: `RATE_LIMIT_SMART_ENABLED` |
   |-------|------------------|-------------------|-------------------------------------|
   | `redis` | on / off | yes | per choice |
   | off (`noop`) | on | yes | `true` |
   | off | off | no (empty) | `false` |

4. **Final validation** — `validateGatewayConfig()` from `src/config/config-validator.ts`:
   - Before each iteration, reload `.env` (when `dotenv` is available)
   - Success → success message and next steps
   - Error → error list, choice: manual fix + retry (up to 10 attempts) or abort the wizard

**Resume after interruption:**

- Session state: `.gateway-wizard-state.json` in the working directory (`WizardStateManager`)
- Running `gateway config:init` again → resume prompt
- Rejecting resume → rollback of created files and backups from the session

**Requirements:** The CLI does **not** require an existing `.env` at wizard start — full runtime validation only at the end of the flow.

#### Agent mode (`config:init --agent`)

```bash
npm run cli -- config:init --agent --answers <file.json> --json
# overwrite / abandon unfinished session: add --force
```

1. Answers → `InitAnswersSchema` (`schemaVersion: 1`, `masterKey: { generate: true }`, `providers[]`, `models[]`, `clients[]` with `generateKey: true`, `server`).
2. `WizardOrchestratorService.runFromAnswers()` → `ConfigGeneratorService.generateFullConfig()` (no inquirer loops).
3. Structure validation with `allowMissingProviderSecrets: true` — missing secrets are **not** an error at this stage.
4. `collectPendingSecrets()` → `AgentReport`: `success` or `awaiting_secrets` (exit `2`) with `pendingSecrets[]` and `next[]` (`.env` handoff instructions).
5. Does **not** run the interactive `validateAndFixConfig()` loop.

After the user fills in `.env`: `config:secrets-status --json` → `config:validate --json`.

### `gateway config:validate`

Validation of `gateway.config.yaml` (Zod structure + runtime rules via `validateGatewayConfig()`) and — after YAML success — env format (`validateEnvironment()` from `configuration-validation.service.ts` via **`CliGatewayValidatorService`**).

```bash
gateway config:validate
gateway config:validate --json   # AgentReport / machine result on stdout
```

- No `gateway.config.yaml` file → exit `1` with hint `gateway config:init`.
- Detected boilerplate (`isBoilerplateConfig()`) → exit `1` with hint `gateway config:init`.
- YAML schema error or missing key under `apiKeyRef` for an enabled provider → exit `1`.
- `validateEnvironment()` error (shape of general env variables: cache, Redis, rate limit, etc.) → exit `1`.
- Success → summary (schema version, number of providers/models/clients); warnings (e.g. empty client key) do not block. With `--json` — report on stdout.

**Note:** The command checks the `gateway.config.yaml` file in the working directory.

**Offline alternative (YAML validation + runtime rules):** `npm run config:validate` — script `scripts/validate-config.ts` (details: `configuration.md`). Does **not** run `validateEnvironment()` — for full env validation use `gateway config:validate`.

### `gateway config:show`

Displays the parsed configuration from YAML (without resolving secret values from `.env`):

```bash
gateway config:show
gateway config:show --json
```

Sections: providers (type, `enabled`, `apiKeyRef`), models (alias → `providerInstance`/`modelId`, fallback), clients (type, name, `gatewayKeyRef`, rate limit), master key ref.

With boilerplate it displays the configuration and at the end a **warning** (without exit `1`).

### `gateway config:secrets-status`

Gate for missing secrets in `.env` relative to `gateway.config.yaml` — used after agent mutations (`awaiting_secrets`) and in setup/CRUD skills.

**File:** `src/cli/commands/config/config-secrets-status.command.ts`  
**Logic:** `collectPendingSecrets()` (`src/cli/agent/pending-secrets.ts`) — incl. `master_key`, `provider_api_key`, `provider_base_url`, optionally client keys / Sentry / Redis.

```bash
npm run cli -- config:secrets-status --json
```

| Exit | Meaning |
|------|---------|
| `0` | No pending — can validate / start |
| `2` | `awaiting_secrets` — `pendingSecrets[]` list (only `envRef` + `reason`, **no** values) |
| `1` | Error (no config / boilerplate / other) |

## Boilerplate configuration and commands

Most CRUD commands require a full configuration (not boilerplate). Behavior with `isBoilerplateConfig()`:

| Command | Behavior |
|---------|----------|
| `config:init` | Start wizard / agent init (without overwrite prompt for boilerplate) |
| `config:validate`, `config:secrets-status`, `provider:*` | Warning + exit `1` |
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
gateway provider:list --json
```

Requires full configuration (not boilerplate). With no providers — warning message.

### `gateway provider:test [instanceId]`

Connection test with providers via SDK (`ProviderTestService` — lightweight request, without import from `src/integrations/`). The argument identifier is **`providerInstance`** (key in `providers:`), not the adapter type.

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

Requires full configuration and a filled-in `.env` (`loadWithEnvCheck()`). Missing variables → exit `1`. When testing all instances, a missing key for one instance ends with Failed status for that entry (without immediate exit).

### `gateway provider:add`

Interactive addition of a new provider instance:

- Instance ID (unique, e.g. `google-office`)
- Adapter type (`PROVIDER_TYPES`: `anthropic`, `google`, `openai`, `openai-compatible`)
- For OpenAI types: optional API key, **required** `baseUrlRef` + base URL (default `https://api.openai.com/v1` or `http://localhost:11434/v1`)
- For other types: API key (written to `.env` under `deriveApiKeyRef(instanceId)`)
- `enabled` flag

If there are no models linked to the new instance → **mandatory** sub-flow to add at least one model (`ModelManagerService.addModelForProvider`) in the same session.

```bash
gateway provider:add
# agent:
npm run cli -- provider:add --agent --answers <file.json> --json
```

**Agent answers** (`ProviderAddAnswersSchema`): `id`, `type`, `deferSecret: true`, `ensureModel: { alias, modelId }` — without `apiKey` / `baseUrl` (those go to `pendingSecrets` / `.env`).

Write: YAML backup + `ConfigPersistenceService.persistConfig()` + `EnvPatchService.setVar()` (in agent mode provider secrets are usually deferred).

### `gateway provider:remove <instanceId>`

Removes the instance, **all** models with `providerInstance === id`, and the `apiKeyRef` entry from `.env`.

```bash
gateway provider:remove google-office
# agent: answers with id + confirm: true; --force skips interactive confirm
npm run cli -- provider:remove --agent --answers <file.json> --json
```

Before removal — confirm with a list of related model aliases (interactively) or `confirm: true` in answers. When removing the **only active** instance (`enabled !== false`) — additional warning (boxen) and confirm (default: no). Model prompt files (`models/<alias>.md`) are **not** deleted automatically — the CLI prints their paths after success.

### `gateway provider:edit <instanceId>`

Edit an existing instance:

- enable/disable (`enabled`) — enabling requires at least one linked model
- rotate API key (same `apiKeyRef` in `.env`)

```bash
gateway provider:edit anthropic
npm run cli -- provider:edit --agent --answers <file.json> --json
```

**Agent answers** (`ProviderEditAnswersSchema`): `id`, optionally `enabled`, `rotateSecret` (clears the value under `apiKeyRef` in `.env` → handoff), `confirmNonBootable` when the operation risks an inconsistent boot.

## Commands — models

### `gateway model:list`

List of model aliases with `providerInstance`, `modelId`, streaming, fallback.

```bash
gateway model:list
gateway model:list --json
```

### `gateway model:add`

Adding a model — choose `providerInstance`, alias, `modelId` (default from `DEFAULT_MODELS`), optionally more models for the same instance (interactively). Creates prompt file `src/config/system-prompt/models/<alias>.md` when missing.

```bash
gateway model:add
npm run cli -- model:add --agent --answers <file.json> --json
```

**Agent answers** (`ModelAddAnswersSchema`): `alias`, `providerInstance`, `modelId`.

### `gateway model:remove <alias>`

Removes the alias from `gateway.config.yaml` (with a backup in `backup/`) and **automatically deletes** the prompt file `src/config/system-prompt/models/<alias>.md` (if it exists).

On Zod validation error after mutation (`validation failed`) the YAML is **not** written — the message informs that the alias was not removed. In that case the prompt file is also not deleted.

If the prompt file does not exist or cannot be deleted, the operation completes successfully with an appropriate informational/warning message — removing the model from configuration is the critical operation; deleting the prompt is an add-on.

```bash
gateway model:remove chat-default
npm run cli -- model:remove --agent --answers <file.json> --json
# answers: alias + confirm: true
```

### `gateway model:edit <alias>`

Edit model fields: interactively a checkbox (`modelId`, `providerInstance`, `fallback`, streaming, `policy`); via agent — fields in answers.

```bash
gateway model:edit chat-default
npm run cli -- model:edit --agent --answers <file.json> --json
```

**Agent answers** (`ModelEditAnswersSchema`): `alias` + at least one of: `modelId`, `providerInstance`, `fallback` (`null` clears), `streaming`, `policy`; optionally `confirmNonBootable`.
## Commands — clients

### `gateway client:list`

List of clients with type, name, `gatewayKeyRef`, optional rate limit.

```bash
gateway client:list
gateway client:list --json
```

### `gateway client:add`

Adding a client:

- ID, display name, type (`GATEWAY_CLIENT_TYPES`)
- optional rate limit (`rps`, `burst`, `maxConcurrentStreams`)
- automatic generation of key `gw_<slug>_<base64url>` and write to `.env` under `GATEWAY_KEY_<ID>` (`generateKey: true` in agent answers)

```bash
gateway client:add
npm run cli -- client:add --agent --answers <file.json> --json
```

### `gateway client:edit <clientId>`

Edit a client:

- display name
- client type
- rate limit (set / change / remove)
- rotate gateway key (invalidates the old key in `.env`)

```bash
gateway client:edit webapp
npm run cli -- client:edit --agent --answers <file.json> --json
```

**Agent answers** (`ClientEditAnswersSchema`): `id` + `action`: `name` | `type` | `rateLimit` | `rotateKey` (plus fields required for the given action; `rateLimit: null` clears the limit).

### `gateway client:remove <clientId>`

Removes the client from YAML and the `gatewayKeyRef` entry from `.env` (after confirm / `confirm: true` in answers).

```bash
gateway client:remove webapp
npm run cli -- client:remove --agent --answers <file.json> --json
```

## Commands — keys

### `gateway key:generate`

Generates a cryptographically random key (Node.js `crypto.randomBytes`).

```bash
# Interactively — key on screen (no write to .env)
gateway key:generate --type master
gateway key:generate master
gateway key:generate --type client --client-id webapp
gateway key:generate client webapp

# Agent — write to .env without printing the value (requires --write-env)
npm run cli -- key:generate --agent --write-env --type master --json
npm run cli -- key:generate --agent --write-env --type client --client-id webapp --json
```

Options:

- `-t, --type <master|client>` — key type (required)
- `-c, --client-id <id>` — client ID (required for type `client`)
- `--agent` / `--json` — agent mode + report
- `--write-env` — in agent mode **required**: write under `MASTER_KEY` / `GATEWAY_KEY_<ID>` without printing the secret on stdout

In interactive mode the command does **not** write the key to `.env` — it displays the value in the terminal with an env variable hint and a warning about on-screen visibility.

Formats (consistent with the wizard):

| Type | Format | Env example |
|------|--------|-------------|
| Master | `gw_mk_<segment>` | `MASTER_KEY` |
| Client | `gw_<slug>_<segment>` | `GATEWAY_KEY_<ID>` |

## Configuration mutation pattern

Add/edit/remove commands (outside the wizard itself) follow a shared pattern — in both modes the same persistence path; only the data source differs (inquirer vs answers):

1. `resolveCliMode` + (agent) `loadAnswers` + Zod schema from `agent-answers.schema.ts`
2. `CliConfigLoaderService.loadRawConfig()` — read YAML
3. In-memory mutation (managers: Provider / Model / Client)
4. `GatewayConfigSchema.safeParse()` — structure validation
5. Backup `gateway.config.yaml` — `FileManagerService.backupFile()` → `backup/` directory (e.g. `backup/gateway.config.yaml.backup-<timestamp>`; directory in `.gitignore`)
6. Write YAML — `ConfigPersistenceService.persistConfig()`
7. Secrets — `EnvPatchService` (`setVar` / `removeVar` in `.env`) or deferral → `pendingSecrets` / `awaiting_secrets`
8. (agent) `exitWithAgentReport(...)` on stdout with `--json`

Dependency direction: **config → cli**, **cache/should-include-redis-stack → cli** (Redis predicate); CLI does **not** import `ConfigModule` or `buildEffectiveGatewayConfig()`.

## CLI layer — summary

| Component | Role |
|-----------|------|
| `CliModule` | Root NestJS module — **without** `ConfigModule` |
| `agent/resolve-cli-mode.ts` | Flags → `CliMode`; `markAgentRuntime`, `assertAgentHasAnswers` |
| `agent/agent-report.ts` | `AgentReport`, exit `0`/`1`/`2`, emit JSON |
| `agent/load-answers.ts` | Read + parse `--answers` file |
| `agent/pending-secrets.ts` | `collectPendingSecrets` against YAML + `.env` |
| `agent/inquirer-guard.ts` | `assertInteractiveAllowed` — block prompts in agent mode |
| `schemas/agent-answers.schema.ts` | Zod answers per command (`rejectSecretFields`) |
| `CliConfigLoaderService` | YAML + `GatewayConfigSchema`; `loadWithEnvCheck()` reports missing env |
| `FileManagerService` | read/write YAML, `.env`, backup to `backup/`, delete files |
| `ConfigGeneratorService` | Generate files from templates (wizard / agent init) |
| `ConfigPersistenceService` | Zod validation + backup + write YAML after mutations |
| `EnvPatchService` | Update individual variables in `.env` |
| `WizardOrchestratorService` | Orchestrate wizard steps **and** `runFromAnswers` |
| `WizardStateManager` | Persist `.gateway-wizard-state.json`, rollback |
| `ProviderManagerService` | add / remove / edit provider instances |
| `ModelManagerService` | add / remove / edit model aliases |
| `ClientManagerService` | add / remove / edit clients |
| `ProviderTestService` | Lightweight Anthropic / Google / OpenAI SDK tests |
| `KeyGeneratorService` | Master keys `gw_mk_*`, client `gw_<slug>_*` |
| `CliGatewayValidatorService` | `validateGatewayConfig()` + optionally `validateEnvironment()` (facade — shape of general env variables) |
| `ProviderPromptService` | Step 2/5 — instance ID, `apiKeyRef`, key format validation (interactively) |
| `utils/provider-id.util.ts` | `deriveApiKeyRef`, `defaultProviderInstanceId` |
| `utils/api-key-validation.util.ts` | Key prefix validation in wizard / CLI |
| `constants/model-allow-overrides.ts` | Default `allowOverrides` list for new models |
| `utils/default-model-policy.util.ts` | Default `capabilities` / `policy` per provider type |
| `ServerPromptService` | Wizard step 5/5 prompts (cache, rate limit, Redis, Sentry) |
| `templates/env.template.ts` | `generateEnvTemplate()`, `isEnvInputRedisRequired()` |
| `src/cache/should-include-redis-stack.ts` | Shared with runtime `isRedisRequired()` logic (CLI imports **without** `ConfigModule`) |

Imports from `src/config/`: types, Zod schemas, `validateGatewayConfig()`, `validateEnvironment()` / validation facade, `PROVIDER_TYPES`, `GATEWAY_CLIENT_TYPES`. Import from `src/cache/should-include-redis-stack.ts`: Redis requirement predicate (redis cache and/or smart rate limit). See `anti-patterns.md` (§14).

## Tips

- `gateway --help` — nest-commander command list
- `gateway <command> --help` — options per command (including `--agent`, `--answers`, `--json`)
- Agent mutations: always `--agent --answers <path> --json`; secrets only in local `.env`
- After `awaiting_secrets` (exit `2`) do not treat it as failure — it is the expected handoff
- Mutating commands create a `gateway.config.yaml` backup in `backup/` before writing (the wizard on overwrite of existing configuration does the same for YAML and `.env`)
- After env changes run `gateway config:validate` before starting the server
- `model:remove` automatically deletes the model prompt file; `provider:remove` prints a list of related model prompts for manual review (there may be many models per provider)

## Related documents

- `configuration.md` — runtime vs CLI loader, shared Redis (cache + rate limit), `npm run config:validate`, placeholder config, multi-instance
- `architecture.md` — CLI / HTTP isolation diagram
- `project.structure.md` — `src/cli/` tree
- `dictionary.md` — terms *Gateway CLI*, *CliConfigLoader*, *placeholder config*, *providerInstance*
- `.agents/skills/gateway-setup/` — bootstrap via `config:init --agent`
- `.agents/skills/gateway-config/` — agent CRUD (one mutation) + `references/agent-protocol.md`
