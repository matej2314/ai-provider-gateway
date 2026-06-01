# Gateway CLI — dokumentacja

Narzędzie wiersza poleceń do inicjalizacji konfiguracji gatewaya i operacji developerskich. **Osobny entry point** od serwisu HTTP — szczegóły architektury: `architektura.md`, `architektura-katalogi-pliki.md` (sekcja 2a).

**Konwencja komend:** `gateway <namespace>:<action>` (np. `gateway config:init`).

## Stan wdrożenia

| Obszar | Status |
|--------|--------|
| Infrastruktura (`bin/`, `CliModule`, loader, utilities) | **wdrożone** |
| System szablonów (`templates/`, generatory plików) | **wdrożone** |
| Wizard `config:init` (5 kroków + walidacja końcowa) | **wdrożone** |
| Resume / rollback stanu wizarda | **wdrożone** |
| Pozostałe komendy z listy root (`config:validate`, `model:*`, …) | **planowane** — wyświetlane w welcome, brak implementacji |

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

Wyświetla welcome (boxen) z listą **wszystkich planowanych** komend — zarówno wdrożonych, jak i jeszcze niezaimplementowanych.

## Wdrożone komendy

### `gateway config:init`

Interaktywny wizard inicjalizacji projektu (styl `npm init`).

**Plik:** `src/cli/commands/config/config-init.command.ts`

**Flow:**

1. **Wykrycie istniejącej konfiguracji**
   - Brak pliku → wizard od początku.
   - **Boilerplate** (`isBoilerplateConfig()` — `PLACEHOLDER` / `placeholder` w `masterKeyRef`, kluczach providerów lub klientów) → informacja i start wizarda bez pytania o nadpisanie.
   - Skonfigurowany config (po wizardzie) → pytanie o nadpisanie; przy „tak” backup `gateway.config.yaml` i `.env`.

2. **Wizard (5 kroków)** — `WizardOrchestratorService`:
   - **1/5** Master key (`KeyPromptService` + `KeyGeneratorService` — format `gw_mk_<base64url>`)
   - **2/5** Providery i klucze API (`ProviderPromptService`)
   - **3/5** Modele / aliasy (`ModelPromptService`, domyślne `modelId` z `constants/default-models.ts`: Anthropic `claude-sonnet-4-5-20250929`, Google `gemini-2.5-flash`)
   - **4/5** Klienci gateway (`ClientPromptService` — typ: `webapp` | `ide` | `cli` | `service` | `backend` | `automation`; klucze `gw_<slug>_<base64url>`; env ref `GATEWAY_KEY_<ID>`; opcjonalny `rateLimit` per klient)
   - **5/5** Ustawienia serwera (`ServerPromptService` — port, `NODE_ENV`, Swagger, cache/Redis, smart rate limit, Sentry)

3. **Zapis plików** — `ConfigGeneratorService.generateFullConfig()`:
   - `gateway.config.yaml` (wszystkie providery `enabled: true`, `masterKeyRef: MASTER_KEY`)
   - `.env` i `.env.example` (szablon z `templates/env.template.ts` — wartości sekretów puste w `.env.example`)
   - `src/config/system-prompt/MASTER_SYSTEM_PROMPT.md` (jeśli nie istnieje)
   - `src/config/system-prompt/models/<alias>.md` per model (jeśli nie istnieją)

4. **Walidacja końcowa** — `validateGatewayConfig()` z `src/config/config-validator.ts`:
   - Przed każdą iteracją doładowanie `.env` (gdy dostępny `dotenv`)
   - Sukces → komunikat sukcesu i next steps
   - Błąd → lista błędów, wybór: ręczna poprawka + retry (do 10 prób) lub abort wizarda

**Resume po przerwaniu:**

- Stan sesji: `.gateway-wizard-state.json` w katalogu roboczym (`WizardStateManager`)
- Ponowne `gateway config:init` → pytanie o wznowienie
- Odrzucenie resume → rollback utworzonych plików i backupów z sesji

**Wymagania:** CLI **nie wymaga** istniejącego `.env` na starcie wizarda — pełna walidacja runtime dopiero na końcu flow.

**Uwaga:** komunikat sukcesu wizarda sugeruje `gateway config:validate` — ta komenda CLI jest jeszcze planowana; użyj **`npm run config:validate`**.

## Planowane komendy (jeszcze bez implementacji)

Wyświetlane w root command (`src/cli/gateway.command.ts`):

| Namespace | Komendy |
|-----------|---------|
| **config** | `config:validate`, `config:show` |
| **model** | `model:add`, `model:list`, `model:remove` |
| **client** | `client:add`, `client:list`, `client:remove` |
| **provider** | `provider:test`, `provider:list` |
| **key** | `key:generate` |

Do walidacji offline **już teraz** można użyć skryptu npm (poza CLI):

```bash
npm run config:validate
```

Szczegóły: `konfiguracja.md`.

## Warstwa CLI — skrót

| Komponent | Rola |
|-----------|------|
| `CliModule` | Root NestJS module — **bez** `ConfigModule` |
| `CliConfigLoaderService` | YAML + `GatewayConfigSchema`, bez `buildEffectiveGatewayConfig()` |
| `FileManagerService` | read/write YAML, `.env`, backup |
| `ConfigGeneratorService` | Generowanie plików z szablonów |
| `WizardOrchestratorService` | Orkiestracja kroków wizarda |
| `WizardStateManager` | Persistencja `.gateway-wizard-state.json`, rollback |
| `KeyGeneratorService` | Kryptograficznie losowe klucze: master `gw_mk_*`, klient `gw_<slug>_*` |

Importy z `src/config/`: typy, schematy Zod, `validateGatewayConfig()`, `PROVIDER_TYPES` — kierunek zależności: **config → cli** (nie odwrotnie). Patrz `anty-patterny.md` (§14).

## Powiązane dokumenty

- `konfiguracja.md` — runtime vs CLI loader, `npm run config:validate`, boilerplate
- `architektura.md` — diagram izolacji CLI / HTTP
- `architektura-katalogi-pliki.md` — drzewo `src/cli/`
- `dictionary.md` — terminy *Gateway CLI*, *CliConfigLoader*, *boilerplate config*
