# Gateway CLI — dokumentacja

Narzędzie wiersza poleceń do inicjalizacji konfiguracji gatewaya, zarządzania providerami, modelami i klientami oraz operacji developerskich. **Osobny entry point** od serwisu HTTP — szczegóły architektury: `architektura.md`, `architektura_katalogi_pliki.md` (sekcja 2a).

**Konwencja komend:** `gateway <namespace>:<action>` (np. `gateway config:init`).

CLI wspiera **dwa tryby** pracy:

| Tryb | Dla kogo | Jak |
|------|----------|-----|
| **Interaktywny** | Operator w terminalu | Domyślnie — prompty inquirer (np. `gateway config:init`) |
| **Agentowy** | Agenty / automatyzacja (Agent skills, skrypty) | `--agent --answers <plik.json>` + zwykle `--json` |

Sekrety (API keys, base URL, DSN, hasła) w trybie agentowym **nie** trafiają do pliku answers — uzupełnia je człowiek lokalnie w `.env` (**human in the tool**). Szczegóły: [Tryby pracy](#tryby-pracy-interaktywny-i-agentowy).

## Pełna lista komend

| Namespace | Komenda | Opis |
|-----------|---------|------|
| *(root)* | `gateway` | Welcome + lista komend (`npm run cli`) |
| config | `config:init` | Wizard inicjalizacji (interaktywny **lub** `--agent`) |
| config | `config:validate` | Walidacja YAML + env (`--json` opcjonalnie) |
| config | `config:show` | Podgląd sparsowanego YAML (`--json` opcjonalnie) |
| config | `config:secrets-status` | Gate braków w `.env` (agent / CI; `--json`) |
| provider | `provider:list` | Lista instancji providerów (`--json`) |
| provider | `provider:test [instanceId]` | Test połączenia SDK (`--json`) |
| provider | `provider:add` | Dodaj instancję (interaktywnie **lub** `--agent`) |
| provider | `provider:remove <instanceId>` | Usuń instancję + modele + klucz z `.env` |
| provider | `provider:edit <instanceId>` | Włącz/wyłącz lub rotacja klucza API |
| model | `model:list` | Lista aliasów modeli (`--json`) |
| model | `model:add` | Dodaj alias (interaktywnie **lub** `--agent`) |
| model | `model:remove <alias>` | Usuń alias z YAML |
| model | `model:edit <alias>` | Edycja pól modelu |
| client | `client:list` | Lista klientów gateway (`--json`) |
| client | `client:add` | Dodaj klienta (interaktywnie **lub** `--agent`) |
| client | `client:edit <clientId>` | Edycja klienta / rotacja klucza |
| client | `client:remove <clientId>` | Usuń klienta + klucz z `.env` |
| key | `key:generate` | Generuj klucz (interaktywnie: print; agent: `--write-env`) |

## Zakres CLI

| Obszar | Opis |
|--------|------|
| Infrastruktura (`bin/`, `CliModule`, loader, utilities) | Entry point i DI Nest dla CLI |
| Warstwa agentowa (`src/cli/agent/`, `schemas/agent-answers.schema.ts`) | `--agent` / `--answers` / `AgentReport`, guard inquirer, pending secrets |
| System szablonów (`templates/`, generatory plików) | Generowanie YAML, `.env`, system promptów |
| Wizard `config:init` (5 kroków + walidacja końcowa) | Interaktywna konfiguracja od zera **lub** answers → `runFromAnswers` |
| Resume / rollback stanu wizarda | `.gateway-wizard-state.json` (głównie tryb interaktywny) |
| `config:validate`, `config:show`, `config:secrets-status` | Walidacja, podgląd, gate sekretów |
| `provider:*`, `model:*`, `client:*` | CRUD (oba tryby) i test SDK providerów |
| `key:generate` | Generowanie kluczy (print lub zapis do `.env` w agent mode) |
| Testy jednostkowe CLI (`npm run test:cli`) | Liczniki: `testy.md` |

## Uruchomienie

### W repozytorium (development)

```bash
npm install
npm run cli                          # root command (welcome)
npm run cli config:init              # wizard konfiguracji
```

Alternatywy (lokalny bin z `package.json`):

```bash
npx gateway config:init
npm link                             # opcjonalnie — globalny symlink do lokalnego pakietu
gateway config:init
```

**Uwaga:** bin w `package.json` to `gateway` (nie `gateway-cli`). Po `npm link` komenda `gateway` wskazuje na `./bin/gateway-cli-wrapper.js`.

### Bez buildu projektu

Wrapper `bin/gateway-cli-wrapper.js`:

1. Preferuje skompilowany `dist/bin/gateway-cli.js` (po `npm run build`).
2. Gdy brak `dist/` — uruchamia TypeScript przez `ts-node` (`bin/gateway-cli.ts` → `CliModule`).

CLI **nie wymaga** `npm run build` przed pierwszym użyciem.

### Instalacja globalna (docelowo, użytkownik końcowy)

```bash
npm install -g ai-provider-gateway
gateway config:init
```

## Root command

```bash
npm run cli
# lub: gateway
```

Wyświetla welcome (boxen) z listą wszystkich komend. Pomoc per komenda: `gateway <command> --help`.

## Quick start

1. Po sklonowaniu repozytorium uzupełnij konfigurację:

   ```bash
   npm install
   gateway config:init
   # albo agentowo: npm run cli -- config:init --agent --answers <plik.json> --json
   ```

   Wizard (lub agent init) generuje lub nadpisuje `gateway.config.yaml`, `.env` i pliki prompt (szablony w `src/cli/templates/`).

2. Zweryfikuj konfigurację:

   ```bash
   gateway config:validate
   # alternatywa: npm run config:validate
   ```

3. Przetestuj połączenia z providerami:

   ```bash
   gateway provider:test
   ```

4. Uruchom serwer:

   ```bash
   npm run start:dev
   ```

## Tryby pracy: interaktywny i agentowy

`resolveCliMode()` (`src/cli/agent/resolve-cli-mode.ts`) ustawia tryb na podstawie flag. Agent mode ustawia też `GATEWAY_CLI_AGENT=1` (`markAgentRuntime`) — `assertInteractiveAllowed()` odmawia wtedy promptów inquirer.

### Flagi wspólne (mutacje)

| Flaga | Znaczenie |
|-------|-----------|
| `--agent` | Tryb agentowy (bez inquirer); wymaga `--answers` na komendach mutujących |
| `--answers <path>` | Plik JSON z odpowiedziami (schemat Zod per komenda w `agent-answers.schema.ts`) |
| `--json` | Raport maszynowy (`AgentReport` lub wynik list/validate) na **stdout** |
| `--force` / `-y` / `--yes` | Pomiń confirm / nadpisz (m.in. istniejący config przy `config:init`) |
| `--defer-secrets` | W agent mode **domyślnie włączone** — sekrety nie są w answers; człowiek uzupełnia `.env` |

Komendy tylko-do-odczytu (`*:list`, `config:show`, `config:validate`, `config:secrets-status`, `provider:test`) zwykle wystarczają z `--json` (bez `--agent`).

### Kontrakt answers

- SSoT pól: `src/cli/schemas/agent-answers.schema.ts` (`InitAnswersSchema`, `ProviderAddAnswersSchema`, …).
- `schemaVersion: 1` na każdym pliku.
- **Zakazane** w answers: wartości sekretów (`apiKey`, `baseUrl`, `gatewayKey`, `redisPassword`, `sentryDsn`, surowy `masterKey`, …) — `rejectSecretFields` w Zod.
- Plików answers **nie** commitować (np. `.gateway-init-answers.json`, `.gateway-crud-answers.json`).

### `AgentReport` (stdout przy `--json`)

```ts
// src/cli/agent/agent-report.ts
{ ok, status, command, files?, pendingSecrets?, generatedKeyRefs?, warnings?, errors?, next? }
```

| Exit | `status` | Znaczenie |
|------|----------|-----------|
| `0` | `success` | OK |
| `2` | `awaiting_secrets` | Struktura zapisana; brakuje wartości w `.env` — handoff do użytkownika |
| `1` | `error` | Błąd — czytaj `errors[]` |

Po `awaiting_secrets`: użytkownik edytuje `.env` lokalnie → `gateway config:secrets-status --json` (exit `0`) → `gateway config:validate --json`.

### Przykłady agentowe

```bash
# Init od zera
npm run cli -- config:init --agent --answers .gateway-init-answers.json --json
# ewentualnie: --force przy nadpisaniu / niedokończonej sesji wizarda

# CRUD (jedna mutacja)
npm run cli -- provider:add --agent --answers .gateway-crud-answers.json --json

# Gate sekretów + walidacja
npm run cli -- config:secrets-status --json
npm run cli -- config:validate --json
```

Orkiestracja przez agenty IDE: skille `.agents/skills/gateway-setup` (`config:init`) oraz `.agents/skills/gateway-config` (CRUD) — protokół: `references/agent-protocol.md`.

## Komendy — konfiguracja

### `gateway config:init`

Inicjalizacja projektu: **wizard interaktywny** (styl `npm init`) **lub** tryb agentowy (`--agent --answers`).

**Plik:** `src/cli/commands/config/config-init.command.ts`

**Flow interaktywny:**

1. **Wykrycie istniejącej konfiguracji**
   - Brak pliku `gateway.config.yaml` → wizard od początku.
   - **Boilerplate** (`isBoilerplateConfig()` w `CliConfigLoaderService`) — wykrywany, gdy w `gateway.config.yaml`:
     - `masterKeyRef` zawiera `PLACEHOLDER` lub `placeholder`, **lub**
     - klucz (ID) wpisu w `providers:` zawiera `placeholder`, **lub**
     - klucz (ID) wpisu w `clients:` zawiera `placeholder`.
     → komunikat i start wizarda **bez** pytania o nadpisanie.
   - Skonfigurowany plik (po wizardzie) → pytanie o nadpisanie; przy „tak” backup `gateway.config.yaml` i `.env` do katalogu `backup/`.

2. **Wizard (5 kroków)** — `WizardOrchestratorService`:
   - **1/5** Master key (`KeyPromptService` + `KeyGeneratorService` — format `gw_mk_<base64url>`)
   - **2/5** Providery i klucze API (`ProviderPromptService`) — domyślne ID instancji `{type}-primary` (`defaultProviderInstanceId`), `apiKeyRef` = `{INSTANCE_ID}_API_KEY` (`deriveApiKeyRef`), walidacja formatu klucza (`validateProviderApiKey`)
   - **3/5** Modele / aliasy (`ModelPromptService`, domyślne `modelId` z `constants/default-models.ts`: Anthropic `claude-sonnet-4-5-20250929`, Google `gemini-2.5-flash`)
   - **4/5** Klienci gateway (`ClientPromptService` — typ: `webapp` | `ide` | `cli` | `service` | `backend` | `automation`; klucze `gw_<slug>_<base64url>`; env ref `GATEWAY_KEY_<ID>`; opcjonalny `rateLimit` per klient **w YAML** — limity per klucz klienta; wymaga w runtime `RATE_LIMIT_SMART_ENABLED=true`, patrz krok 5/5)
   - **5/5** Ustawienia serwera (`ServerPromptService`) — kolejno:
     - **Podstawowe:** port, `NODE_ENV`, Swagger (`SWAGGER_ENABLED`).
     - **Response cache:** `CACHE_ENABLED`, `CACHE_BACKEND` (`redis` | `noop`).
     - **Smart rate limit:** `RATE_LIMIT_SMART_ENABLED` (niezależnie od backendu cache).
     - **Zmienne env semantic cache** (`SEMANTIC_CACHE_ENABLED`, `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL`, `EMBEDDING_DIM`, `EMBEDDING_TIMEOUT_MS`, `SEMANTIC_CACHE_MIN_SIMILARITY`, `SEMANTIC_CACHE_TTL`, `SEMANTIC_CACHE_K`) **nie** są konfigurowane przez wizard — ustaw je ręcznie w `.env`. Domyślnie w kodzie: flaga `false`, model `qwen3-embedding:0.6b`, DIM `1024`, podobieństwo `0.85`. `SEMANTIC_CACHE_TTL` jest przestarzałe i ignorowane (TTL semantic = `CACHE_TTL`). Pytania wizarda o semantic / URL embeddingu to osobny krok po kodzie feature’u. Patrz `konfiguracja.md` (sekcja cache semantycznego) i `.env.example`.
     - **Redis (wspólna infrastruktura):** host, port, hasło — **tylko gdy** `isRedisRequired()` z `src/cache/should-include-redis-stack.ts` zwraca `true`, tj. gdy `CACHE_ENABLED=true` **oraz** `CACHE_BACKEND=redis`, **lub** gdy `RATE_LIMIT_SMART_ENABLED=true`, **lub** gdy `SEMANTIC_CACHE_ENABLED=true`. Ta sama reguła co przy starcie HTTP (`isRedisRequiredFromEnv()` w `AppModule`). Cache semantyczny wymaga Redis Search (Redis Stack), nie alpine Redis.
     - **Monitoring:** Sentry LLM (`AI_METRICS_BACKEND`, `SENTRY_*`) lub `noop`; App metrics Prometheus (`METRICS_BACKEND`).

3. **Zapis plików** — `ConfigGeneratorService.generateFullConfig()`:
   - `gateway.config.yaml` (wszystkie providery `enabled: true`, `masterKeyRef: MASTER_KEY`)
   - `.env` i `.env.example` (szablon z `templates/env.template.ts` — wartości sekretów puste w `.env.example`; dane Redis w `.env.example` czyszczone gdy `isEnvInputRedisRequired()`)
   - `src/config/system-prompt/MASTER_SYSTEM_PROMPT.md` (jeśli nie istnieje)
   - `src/config/system-prompt/models/<alias>.md` per model (jeśli nie istnieją)

   **Generowanie `.env` (`generateEnvTemplate`):**

   | Zmienna / grupa | Zachowanie wizarda |
   |-----------------|-------------------|
   | `CACHE_*` | Z odpowiedzi kroku cache (`CACHE_ENABLED`, `CACHE_BACKEND`, stałe `CACHE_TTL`, `CACHE_KEY_PREFIX`). |
   | `REDIS_*` | Ustawiane tylko gdy Redis wymagany (`isEnvInputRedisRequired` → `isRedisRequired`); w przeciwnym razie puste stringi. Zawsze: `REDIS_DB`, `REDIS_KEY_PREFIX`. |
   | `RATE_LIMIT_SMART_ENABLED` | Zawsze z wyboru użytkownika w kroku rate limit (nie wiązane z `CACHE_BACKEND`). |
   | `RATE_LIMIT_*` (RPS, burst, streamy, cooldown) | Stałe domyślne w szablonie. |
   | Sekrety providerów / klientów | Pełne wartości w `.env` pod `apiKeyRef` / `gatewayKeyRef`; puste w `.env.example`. |

   Przykładowe kombinacje (zgodne z runtime):

   | Cache | Smart rate limit | `.env`: `REDIS_*` | `.env`: `RATE_LIMIT_SMART_ENABLED` |
   |-------|------------------|-------------------|-------------------------------------|
   | `redis` | wł. / wył. | tak | wg wyboru |
   | wył. (`noop`) | wł. | tak | `true` |
   | wył. | wył. | nie (puste) | `false` |

4. **Walidacja końcowa** — `validateGatewayConfig()` z `src/config/config-validator.ts`:
   - Przed każdą iteracją doładowanie `.env` (gdy dostępny `dotenv`)
   - Sukces → komunikat sukcesu i next steps
   - Błąd → lista błędów, wybór: ręczna poprawka + retry (do 10 prób) lub abort wizarda

**Resume po przerwaniu:**

- Stan sesji: `.gateway-wizard-state.json` w katalogu roboczym (`WizardStateManager`)
- Ponowne `gateway config:init` → pytanie o wznowienie
- Odrzucenie resume → rollback utworzonych plików i backupów z sesji

**Wymagania:** CLI **nie wymaga** istniejącego `.env` na starcie wizarda — pełna walidacja runtime dopiero na końcu flow.

#### Tryb agentowy (`config:init --agent`)

```bash
npm run cli -- config:init --agent --answers <plik.json> --json
# nadpisanie / porzucenie niedokończonej sesji: dodaj --force
```

1. Answers → `InitAnswersSchema` (`schemaVersion: 1`, `masterKey: { generate: true }`, `providers[]`, `models[]`, `clients[]` z `generateKey: true`, `server`).
2. `WizardOrchestratorService.runFromAnswers()` → `ConfigGeneratorService.generateFullConfig()` (bez pętli inquirer).
3. Walidacja struktury z `allowMissingProviderSecrets: true` — brak sekretów **nie** jest błędem na tym etapie.
4. `collectPendingSecrets()` → `AgentReport`: `success` albo `awaiting_secrets` (exit `2`) z `pendingSecrets[]` i `next[]` (instrukcja handoffu `.env`).
5. **Nie** uruchamia interaktywnej pętli `validateAndFixConfig()`.

Po uzupełnieniu `.env` przez użytkownika: `config:secrets-status --json` → `config:validate --json`.

### `gateway config:validate`

Walidacja `gateway.config.yaml` (struktura Zod + reguły runtime przez `validateGatewayConfig()`) oraz — po sukcesie YAML — formatu env (`validateEnvironment()` z `configuration-validation.service.ts` przez **`CliGatewayValidatorService`**).

```bash
gateway config:validate
gateway config:validate --json   # AgentReport / wynik maszynowy na stdout
```

- Brak pliku `gateway.config.yaml` → exit `1` z podpowiedzią `gateway config:init`.
- Wykryty boilerplate (`isBoilerplateConfig()`) → exit `1` z podpowiedzią `gateway config:init`.
- Błąd schematu YAML lub brak klucza pod `apiKeyRef` włączonego providera → exit `1`.
- Błąd `validateEnvironment()` (kształt ogólnych zmiennych env: cache, Redis, rate limit itd.) → exit `1`.
- Sukces → podsumowanie (schema version, liczba providerów/modeli/klientów); ostrzeżenia (np. pusty klucz klienta) nie blokują. Przy `--json` — raport na stdout.

**Uwaga:** Komenda sprawdza plik `gateway.config.yaml` w katalogu roboczym.

**Alternatywa offline (walidacja YAML + reguły runtime):** `npm run config:validate` — skrypt `scripts/validate-config.ts` (szczegóły: `konfiguracja.md`). **Nie** uruchamia `validateEnvironment()` — do pełnej walidacji env użyj `gateway config:validate`.

### `gateway config:show`

Wyświetla sparsowaną konfigurację z YAML (bez rozwiązywania wartości sekretów z `.env`):

```bash
gateway config:show
gateway config:show --json
```

Sekcje: providery (typ, `enabled`, `apiKeyRef`), modele (alias → `providerInstance`/`modelId`, fallback), klienci (typ, nazwa, `gatewayKeyRef`, rate limit), master key ref.

Przy boilerplate wyświetla konfigurację, a na końcu **ostrzeżenie** (bez exit `1`).

### `gateway config:secrets-status`

Gate braków sekretów w `.env` względem `gateway.config.yaml` — używany po mutacjach agentowych (`awaiting_secrets`) oraz w skillach setup/CRUD.

**Plik:** `src/cli/commands/config/config-secrets-status.command.ts`  
**Logika:** `collectPendingSecrets()` (`src/cli/agent/pending-secrets.ts`) — m.in. `master_key`, `provider_api_key`, `provider_base_url`, opcjonalnie klucze klientów / Sentry / Redis.

```bash
npm run cli -- config:secrets-status --json
```

| Exit | Znaczenie |
|------|-----------|
| `0` | Brak pending — można walidować / startować |
| `2` | `awaiting_secrets` — lista `pendingSecrets[]` (tylko `envRef` + `reason`, **bez** wartości) |
| `1` | Błąd (brak configu / boilerplate / inny) |

## Konfiguracja boilerplate a komendy

Większość komend CRUD wymaga pełnej konfiguracji (nie boilerplate). Zachowanie przy `isBoilerplateConfig()`:

| Komenda | Zachowanie |
|---------|------------|
| `config:init` | Start wizarda / agent init (bez pytania o nadpisanie przy boilerplate) |
| `config:validate`, `config:secrets-status`, `provider:*` | Ostrzeżenie + exit `1` |
| `config:show` | Wyświetla YAML + ostrzeżenie na końcu |
| `model:list`, `model:remove`, `client:list` | Ostrzeżenie + **return** (exit `0`) |
| `model:add`, `model:edit`, `client:add`, `client:edit`, `client:remove` | Ostrzeżenie + exit `1` |
| `key:generate` | Działa bez `gateway.config.yaml` |

## Komendy — providery

Operacje na **`providerInstance`** — kluczach mapy `providers` w YAML (np. `anthropic-primary`, `openai-main`, `google-office`). Wiele instancji tego samego typu adaptera (`type: anthropic` | `type: google` | `type: openai` | `type: openai-compatible`) jest dozwolone.

### `gateway provider:list`

Lista skonfigurowanych instancji providerów (ID, typ, `apiKeyRef`, `enabled`).

```bash
gateway provider:list
gateway provider:list --json
```

Wymaga pełnej konfiguracji (nie boilerplate). Przy braku providerów — komunikat ostrzegawczy.

### `gateway provider:test [instanceId]`

Test połączenia z providerami przez SDK (`ProviderTestService` — lekki request, bez importu z `src/integrations/`). Identyfikator argumentu to **`providerInstance`** (klucz w `providers:`), nie typ adaptera.

```bash
gateway provider:test              # wszystkie instancje
gateway provider:test anthropic    # konkretna instancja (np. anthropic)
gateway provider:test --provider google-office
```

Testy używają stałych modeli SDK (nie aliasów z YAML):

| Typ adaptera | Model w teście |
|--------------|------------------|
| `anthropic` | `claude-sonnet-4-5-20250929` |
| `google` | `gemini-2.5-flash` |
| `openai` | `gpt-4o-mini` (wymaga `baseUrlRef` w env) |
| `openai-compatible` | `gpt-4o-mini` (wymaga `baseUrlRef`; klucz API opcjonalny) |

Wymaga pełnej konfiguracji oraz uzupełnionego `.env` (`loadWithEnvCheck()`). Brakujące zmienne → exit `1`. Przy teście wszystkich instancji brak klucza dla jednej instancji kończy się statusem Failed dla tej pozycji (bez natychmiastowego exit).

### `gateway provider:add`

Interaktywne dodanie nowej instancji providera:

- ID instancji (unikalne, np. `google-office`)
- Typ adaptera (`PROVIDER_TYPES`: `anthropic`, `google`, `openai`, `openai-compatible`)
- Dla typów OpenAI: opcjonalny klucz API, **wymagany** `baseUrlRef` + URL bazowy (domyślnie `https://api.openai.com/v1` lub `http://localhost:11434/v1`)
- Dla pozostałych typów: klucz API (zapis do `.env` pod `deriveApiKeyRef(instanceId)`)
- Flaga `enabled`

Jeśli brak modeli powiązanych z nową instancją → **obowiązkowy** pod-flow dodania co najmniej jednego modelu (`ModelManagerService.addModelForProvider`) w tej samej sesji.

```bash
gateway provider:add
# agent:
npm run cli -- provider:add --agent --answers <plik.json> --json
```

**Agent answers** (`ProviderAddAnswersSchema`): `id`, `type`, `deferSecret: true`, `ensureModel: { alias, modelId }` — bez `apiKey` / `baseUrl` (te trafiają do `pendingSecrets` / `.env`).

Zapis: backup YAML + `ConfigPersistenceService.persistConfig()` + `EnvPatchService.setVar()` (w agent mode sekrety providera zwykle odroczone).

### `gateway provider:remove <instanceId>`

Usuwa instancję, **wszystkie** modele z `providerInstance === id` oraz wpis `apiKeyRef` z `.env`.

```bash
gateway provider:remove google-office
# agent: answers z id + confirm: true; --force pomija confirm interaktywny
npm run cli -- provider:remove --agent --answers <plik.json> --json
```

Przed usunięciem — confirm z listą powiązanych aliasów modeli (interaktywnie) lub `confirm: true` w answers. Przy usuwaniu **jedynej aktywnej** instancji (`enabled !== false`) — dodatkowe ostrzeżenie (boxen) i confirm (domyślnie: nie). Pliki promptów modeli (`models/<alias>.md`) **nie są** usuwane automatycznie — CLI wypisuje ich ścieżki po sukcesie.

### `gateway provider:edit <instanceId>`

Edycja istniejącej instancji:

- włącz/wyłącz (`enabled`) — włączenie wymaga co najmniej jednego powiązanego modelu
- rotacja klucza API (ten sam `apiKeyRef` w `.env`)

```bash
gateway provider:edit anthropic
npm run cli -- provider:edit --agent --answers <plik.json> --json
```

**Agent answers** (`ProviderEditAnswersSchema`): `id`, opcjonalnie `enabled`, `rotateSecret` (czyści wartość pod `apiKeyRef` w `.env` → handoff), `confirmNonBootable` gdy operacja grozi niespójnym bootem.

## Komendy — modele

### `gateway model:list`

Lista aliasów modeli z `providerInstance`, `modelId`, streaming, fallback.

```bash
gateway model:list
gateway model:list --json
```

### `gateway model:add`

Dodanie modelu — wybór `providerInstance`, alias, `modelId` (domyślnie z `DEFAULT_MODELS`), opcjonalnie kolejne modele dla tej samej instancji (interaktywnie). Tworzy plik promptu `src/config/system-prompt/models/<alias>.md` gdy brak.

```bash
gateway model:add
npm run cli -- model:add --agent --answers <plik.json> --json
```

**Agent answers** (`ModelAddAnswersSchema`): `alias`, `providerInstance`, `modelId`.

### `gateway model:remove <alias>`

Usuwa alias z `gateway.config.yaml` (z backupem w `backup/`) oraz **automatycznie usuwa** plik promptu `src/config/system-prompt/models/<alias>.md` (jeśli istnieje).

Przy błędzie walidacji Zod po mutacji (`validation failed`) YAML **nie jest** zapisywany — komunikat informuje, że alias nie został usunięty. W takim przypadku plik promptu również nie jest usuwany.

Jeśli plik promptu nie istnieje lub nie może zostać usunięty, operacja zakończy się sukcesem z odpowiednim komunikatem informacyjnym/ostrzegawczym — usunięcie modelu z konfiguracji jest operacją krytyczną, usunięcie promptu jest dodatkiem.

```bash
gateway model:remove chat-default
npm run cli -- model:remove --agent --answers <plik.json> --json
# answers: alias + confirm: true
```

### `gateway model:edit <alias>`

Edycja pól modelu: interaktywnie checkbox (`modelId`, `providerInstance`, `fallback`, streaming, `policy`); agentowo — pola w answers.

```bash
gateway model:edit chat-default
npm run cli -- model:edit --agent --answers <plik.json> --json
```

**Agent answers** (`ModelEditAnswersSchema`): `alias` + co najmniej jedno z: `modelId`, `providerInstance`, `fallback` (`null` czyści), `streaming`, `policy`; opcjonalnie `confirmNonBootable`.
## Komendy — klienci

### `gateway client:list`

Lista klientów z typem, nazwą, `gatewayKeyRef`, opcjonalnym rate limitem.

```bash
gateway client:list
gateway client:list --json
```

### `gateway client:add`

Dodanie klienta:

- ID, nazwa wyświetlana, typ (`GATEWAY_CLIENT_TYPES`)
- opcjonalny rate limit (`rps`, `burst`, `maxConcurrentStreams`)
- automatyczne wygenerowanie klucza `gw_<slug>_<base64url>` i zapis do `.env` pod `GATEWAY_KEY_<ID>` (`generateKey: true` w agent answers)

```bash
gateway client:add
npm run cli -- client:add --agent --answers <plik.json> --json
```

### `gateway client:edit <clientId>`

Edycja klienta:

- nazwa wyświetlana
- typ klienta
- rate limit (ustaw / zmień / usuń)
- rotacja klucza gateway (unieważnia stary klucz w `.env`)

```bash
gateway client:edit webapp
npm run cli -- client:edit --agent --answers <plik.json> --json
```

**Agent answers** (`ClientEditAnswersSchema`): `id` + `action`: `name` | `type` | `rateLimit` | `rotateKey` (plus pola wymagane dla danej akcji; `rateLimit: null` czyści limit).

### `gateway client:remove <clientId>`

Usuwa klienta z YAML i wpis `gatewayKeyRef` z `.env` (po confirm / `confirm: true` w answers).

```bash
gateway client:remove webapp
npm run cli -- client:remove --agent --answers <plik.json> --json
```

## Komendy — klucze

### `gateway key:generate`

Generuje kryptograficznie losowy klucz (Node.js `crypto.randomBytes`).

```bash
# Interaktywnie — klucz na ekranie (bez zapisu do .env)
gateway key:generate --type master
gateway key:generate master
gateway key:generate --type client --client-id webapp
gateway key:generate client webapp

# Agent — zapis do .env bez printu wartości (wymaga --write-env)
npm run cli -- key:generate --agent --write-env --type master --json
npm run cli -- key:generate --agent --write-env --type client --client-id webapp --json
```

Opcje:

- `-t, --type <master|client>` — typ klucza (wymagane)
- `-c, --client-id <id>` — ID klienta (wymagane dla typu `client`)
- `--agent` / `--json` — tryb agentowy + raport
- `--write-env` — w agent mode **wymagane**: zapis pod `MASTER_KEY` / `GATEWAY_KEY_<ID>` bez wypisywania sekretu na stdout

W trybie interaktywnym komenda **nie zapisuje** klucza do `.env` — wyświetla wartość w terminalu z podpowiedzią zmiennej env i ostrzeżeniem o widoczności na ekranie.

Formaty (zgodne z wizardem):

| Typ | Format | Przykład env |
|-----|--------|--------------|
| Master | `gw_mk_<segment>` | `MASTER_KEY` |
| Klient | `gw_<slug>_<segment>` | `GATEWAY_KEY_<ID>` |

## Wzorzec mutacji konfiguracji

Komendy add/edit/remove (poza samym wizardem) stosują wspólny wzorzec — w obu trybach ta sama ścieżka persistencji; różni się tylko źródło danych (inquirer vs answers):

1. `resolveCliMode` + (agent) `loadAnswers` + schemat Zod z `agent-answers.schema.ts`
2. `CliConfigLoaderService.loadRawConfig()` — odczyt YAML
3. Mutacja w pamięci (managerzy: Provider / Model / Client)
4. `GatewayConfigSchema.safeParse()` — walidacja struktury
5. Backup `gateway.config.yaml` — `FileManagerService.backupFile()` → katalog `backup/` (np. `backup/gateway.config.yaml.backup-<timestamp>`; katalog w `.gitignore`)
6. Zapis YAML — `ConfigPersistenceService.persistConfig()`
7. Sekrety — `EnvPatchService` (`setVar` / `removeVar` w `.env`) albo odroczenie → `pendingSecrets` / `awaiting_secrets`
8. (agent) `exitWithAgentReport(...)` na stdout przy `--json`

Kierunek zależności: **config → cli**, **cache/should-include-redis-stack → cli** (predykat Redis); CLI **nie** importuje `ConfigModule` ani `buildEffectiveGatewayConfig()`.

## Warstwa CLI — skrót

| Komponent | Rola |
|-----------|------|
| `CliModule` | Root NestJS module — **bez** `ConfigModule` |
| `agent/resolve-cli-mode.ts` | Flagi → `CliMode`; `markAgentRuntime`, `assertAgentHasAnswers` |
| `agent/agent-report.ts` | `AgentReport`, exit `0`/`1`/`2`, emit JSON |
| `agent/load-answers.ts` | Odczyt + parse pliku `--answers` |
| `agent/pending-secrets.ts` | `collectPendingSecrets` względem YAML + `.env` |
| `agent/inquirer-guard.ts` | `assertInteractiveAllowed` — blokada promptów w agent mode |
| `schemas/agent-answers.schema.ts` | Zod answers per komenda (`rejectSecretFields`) |
| `CliConfigLoaderService` | YAML + `GatewayConfigSchema`; `loadWithEnvCheck()` raportuje braki env |
| `FileManagerService` | read/write YAML, `.env`, backup do `backup/`, delete files |
| `ConfigGeneratorService` | Generowanie plików z szablonów (wizard / agent init) |
| `ConfigPersistenceService` | Walidacja Zod + backup + zapis YAML po mutacjach |
| `EnvPatchService` | Aktualizacja pojedynczych zmiennych w `.env` |
| `WizardOrchestratorService` | Orkiestracja kroków wizarda **oraz** `runFromAnswers` |
| `WizardStateManager` | Persistencja `.gateway-wizard-state.json`, rollback |
| `ProviderManagerService` | add / remove / edit instancji providera |
| `ModelManagerService` | add / remove / edit aliasów modeli |
| `ClientManagerService` | add / remove / edit klientów |
| `ProviderTestService` | Lekkie testy SDK Anthropic / Google / OpenAI |
| `KeyGeneratorService` | Klucze master `gw_mk_*`, klient `gw_<slug>_*` |
| `CliGatewayValidatorService` | `validateGatewayConfig()` + opcjonalnie `validateEnvironment()` (fasada — kształt ogólnych zmiennych env) |
| `ProviderPromptService` | Krok 2/5 — ID instancji, `apiKeyRef`, walidacja formatu klucza (interaktywnie) |
| `utils/provider-id.util.ts` | `deriveApiKeyRef`, `defaultProviderInstanceId` |
| `utils/api-key-validation.util.ts` | Walidacja prefiksów kluczy w wizardzie / CLI |
| `constants/model-allow-overrides.ts` | Domyślna lista `allowOverrides` dla nowych modeli |
| `utils/default-model-policy.util.ts` | Domyślne `capabilities` / `policy` per typ providera |
| `ServerPromptService` | Prompty kroku 5/5 wizarda (cache, rate limit, Redis, Sentry) |
| `templates/env.template.ts` | `generateEnvTemplate()`, `isEnvInputRedisRequired()` |
| `src/cache/should-include-redis-stack.ts` | Współdzielona z runtime logika `isRedisRequired()` (CLI importuje **bez** `ConfigModule`) |

Importy z `src/config/`: typy, schematy Zod, `validateGatewayConfig()`, `validateEnvironment()` / fasada walidacji, `PROVIDER_TYPES`, `GATEWAY_CLIENT_TYPES`. Import z `src/cache/should-include-redis-stack.ts`: predykat wymagania Redis (cache redis i/lub smart rate limit i/lub semantic cache). Patrz `anty_patterny.md` (§14).

## Wskazówki

- `gateway --help` — lista komend nest-commander
- `gateway <command> --help` — opcje per komenda (w tym `--agent`, `--answers`, `--json`)
- Mutacje agentowe: zawsze `--agent --answers <path> --json`; sekrety tylko w lokalnym `.env`
- Po `awaiting_secrets` (exit `2`) nie traktuj jako porażki — to oczekiwany handoff
- Komendy mutujące tworzą backup `gateway.config.yaml` w `backup/` przed zapisem (wizard przy nadpisaniu istniejącej konfiguracji robi to samo dla YAML i `.env`)
- Po zmianach env uruchom `gateway config:validate` przed startem serwera
- `model:remove` automatycznie usuwa plik promptu modelu; `provider:remove` wyświetla listę promptów powiązanych modeli do ręcznego przeglądu (może być wiele modeli per provider)

## Powiązane dokumenty

- `konfiguracja.md` — runtime vs CLI loader, Redis współdzielony (cache + rate limit), `npm run config:validate`, placeholder config, multi-instance
- `architektura.md` — diagram izolacji CLI / HTTP
- `architektura_katalogi_pliki.md` — drzewo `src/cli/`
- `dictionary.md` — terminy *Gateway CLI*, *CliConfigLoader*, *placeholder config*, *providerInstance*
- `.agents/skills/gateway-setup/` — bootstrap przez `config:init --agent`
- `.agents/skills/gateway-config/` — CRUD agentowy (jedna mutacja) + `references/agent-protocol.md`