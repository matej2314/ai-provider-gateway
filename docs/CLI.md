# Gateway CLI — dokumentacja

Narzędzie wiersza poleceń do inicjalizacji konfiguracji gatewaya, zarządzania providerami, modelami i klientami oraz operacji developerskich. **Osobny entry point** od serwisu HTTP — szczegóły architektury: `architektura.md`, `architektura-katalogi-pliki.md` (sekcja 2a).

**Konwencja komend:** `gateway <namespace>:<action>` (np. `gateway config:init`).

**Tryb v1:** wszystkie komendy mutujące konfigurację działają w trybie **interaktywnym** (prompty w terminalu). Tryb non-interactive — planowany na przyszłość.

## Pełna lista komend

| Namespace | Komenda | Opis |
|-----------|---------|------|
| *(root)* | `gateway` | Welcome + lista komend (`npm run cli`) |
| config | `config:init` | Wizard inicjalizacji |
| config | `config:validate` | Walidacja YAML + env |
| config | `config:show` | Podgląd sparsowanego YAML |
| provider | `provider:list` | Lista instancji providerów |
| provider | `provider:test [instanceId]` | Test połączenia SDK |
| provider | `provider:add` | Dodaj instancję (interaktywnie) |
| provider | `provider:remove <instanceId>` | Usuń instancję + modele + klucz z `.env` |
| provider | `provider:edit <instanceId>` | Włącz/wyłącz lub rotacja klucza API |
| model | `model:list` | Lista aliasów modeli |
| model | `model:add` | Dodaj alias (interaktywnie) |
| model | `model:remove <alias>` | Usuń alias z YAML |
| model | `model:edit <alias>` | Edycja pól modelu (checkbox) |
| client | `client:list` | Lista klientów gateway |
| client | `client:add` | Dodaj klienta (interaktywnie) |
| client | `client:edit <clientId>` | Edycja klienta / rotacja klucza |
| client | `client:remove <clientId>` | Usuń klienta + klucz z `.env` |
| key | `key:generate` | Wygeneruj klucz master lub klienta (bez zapisu do `.env`) |

## Stan wdrożenia

| Obszar | Status |
|--------|--------|
| Infrastruktura (`bin/`, `CliModule`, loader, utilities) | **wdrożone** |
| System szablonów (`templates/`, generatory plików) | **wdrożone** |
| Wizard `config:init` (5 kroków + walidacja końcowa) | **wdrożone** |
| Resume / rollback stanu wizarda | **wdrożone** |
| `config:validate`, `config:show` | **wdrożone** |
| `provider:add`, `provider:remove`, `provider:edit`, `provider:list`, `provider:test` | **wdrożone** |
| `model:add`, `model:list`, `model:remove`, `model:edit` | **wdrożone** |
| `client:add`, `client:list`, `client:edit`, `client:remove` | **wdrożone** |
| `key:generate` | **wdrożone** |

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

1. Po sklonowaniu repozytorium (placeholder w `gateway.config.placeholder.yaml`):

   ```bash
   npm install
   gateway config:init
   ```
   
   Wizard wygeneruje właściwy plik `gateway.config.yaml`.

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

## Komendy — konfiguracja

### `gateway config:init`

Interaktywny wizard inicjalizacji projektu (styl `npm init`).

**Plik:** `src/cli/commands/config/config-init.command.ts`

**Flow:**

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

### `gateway config:validate`

Walidacja `gateway.config.yaml` (struktura Zod) oraz sprawdzenie obecności wymaganych zmiennych env (`loadWithEnvCheck()`).

```bash
gateway config:validate
```

- Brak pliku `gateway.config.yaml` → exit `1` z podpowiedzią `gateway config:init`.
- Wykryty boilerplate (`isBoilerplateConfig()`) → exit `1` z podpowiedzią `gateway config:init`.
- Błąd schematu YAML → exit `1`.
- Brakujące zmienne env (master, włączone providery, klienci) → exit `1` z listą.
- Sukces → podsumowanie (schema version, liczba providerów/modeli/klientów).

**Uwaga:** Komenda sprawdza plik `gateway.config.yaml`, nie `gateway.config.placeholder.yaml`.

**Alternatywa offline (identyczna logika walidacji runtime):** `npm run config:validate` — skrypt `scripts/validate-config.ts` (szczegóły: `konfiguracja.md`).

### `gateway config:show`

Wyświetla sparsowaną konfigurację z YAML (bez rozwiązywania wartości sekretów z `.env`):

```bash
gateway config:show
```

Sekcje: providery (typ, `enabled`, `apiKeyRef`), modele (alias → `providerInstance`/`modelId`, fallback), klienci (typ, nazwa, `gatewayKeyRef`, rate limit), master key ref.

Przy boilerplate wyświetla konfigurację, a na końcu **ostrzeżenie** (bez exit `1`).

## Konfiguracja boilerplate a komendy

Większość komend CRUD wymaga pełnej konfiguracji (nie boilerplate). Zachowanie przy `isBoilerplateConfig()`:

| Komenda | Zachowanie |
|---------|------------|
| `config:init` | Start wizarda (bez pytania o nadpisanie) |
| `config:validate`, `provider:*` | Ostrzeżenie + exit `1` |
| `config:show` | Wyświetla YAML + ostrzeżenie na końcu |
| `model:list`, `model:remove`, `client:list` | Ostrzeżenie + **return** (exit `0`) |
| `model:add`, `model:edit`, `client:add`, `client:edit`, `client:remove` | Ostrzeżenie + exit `1` |
| `key:generate` | Działa bez `gateway.config.yaml` |

## Komendy — providery

Operacje na **`providerInstance`** — kluczach mapy `providers` w YAML (np. `anthropic`, `google-office`). Wiele instancji tego samego typu adaptera (`type: anthropic` | `type: google`) jest dozwolone.

### `gateway provider:list`

Lista skonfigurowanych instancji providerów (ID, typ, `apiKeyRef`, `enabled`).

```bash
gateway provider:list
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

Wymaga pełnej konfiguracji oraz uzupełnionego `.env` (`loadWithEnvCheck()`). Brakujące zmienne → exit `1`. Przy teście wszystkich instancji brak klucza dla jednej instancji kończy się statusem Failed dla tej pozycji (bez natychmiastowego exit).

### `gateway provider:add`

Interaktywne dodanie nowej instancji providera:

- ID instancji (unikalne, np. `google-office`)
- Typ adaptera (`PROVIDER_TYPES`: `anthropic`, `google`)
- Klucz API (zapis do `.env` pod `deriveApiKeyRef()` → np. `GOOGLE_OFFICE_API_KEY`)
- Flaga `enabled`

Jeśli brak modeli powiązanych z nową instancją → **obowiązkowy** pod-flow dodania co najmniej jednego modelu (`ModelManagerService.addModelForProvider`) w tej samej sesji.

```bash
gateway provider:add
```

Zapis: backup YAML + `ConfigPersistenceService.persistConfig()` + `EnvPatchService.setVar()`.

### `gateway provider:remove <instanceId>`

Usuwa instancję, **wszystkie** modele z `providerInstance === id` oraz wpis `apiKeyRef` z `.env`.

```bash
gateway provider:remove google-office
```

Przed usunięciem — confirm z listą powiązanych aliasów modeli. Przy usuwaniu **jedynej aktywnej** instancji (`enabled !== false`) — dodatkowe ostrzeżenie (boxen) i confirm (domyślnie: nie). Pliki promptów modeli (`models/<alias>.md`) **nie są** usuwane automatycznie — CLI wypisuje ich ścieżki po sukcesie.

### `gateway provider:edit <instanceId>`

Edycja istniejącej instancji:

- włącz/wyłącz (`enabled`) — włączenie wymaga co najmniej jednego powiązanego modelu
- rotacja klucza API (ten sam `apiKeyRef` w `.env`)

```bash
gateway provider:edit anthropic
```

## Komendy — modele

### `gateway model:list`

Lista aliasów modeli z `providerInstance`, `modelId`, streaming, fallback.

```bash
gateway model:list
```

### `gateway model:add`

Interaktywne dodanie modelu — wybór `providerInstance`, alias, `modelId` (domyślnie z `DEFAULT_MODELS`), opcjonalnie kolejne modele dla tej samej instancji. Tworzy plik promptu `src/config/system-prompt/models/<alias>.md` gdy brak.

```bash
gateway model:add
```

### `gateway model:remove <alias>`

Usuwa alias z `gateway.config.yaml` (z backupem w `backup/`). Plik promptu modelu pozostaje na dysku — po sukcesie CLI przypomina o ręcznym usunięciu `models/<alias>.md`.

Przy błędzie walidacji Zod po mutacji (`validation failed`) YAML **nie jest** zapisywany — komunikat informuje, że alias nie został usunięty.

```bash
gateway model:remove chat-default
```

### `gateway model:edit <alias>`

Edycja pól modelu (checkbox w terminalu): `modelId`, `providerInstance`, `fallback`, streaming, `policy` (timeout, retry, params).

```bash
gateway model:edit chat-default
```

## Komendy — klienci

### `gateway client:list`

Lista klientów z typem, nazwą, `gatewayKeyRef`, opcjonalnym rate limitem.

```bash
gateway client:list
```

### `gateway client:add`

Interaktywne dodanie klienta:

- ID, nazwa wyświetlana, typ (`GATEWAY_CLIENT_TYPES`)
- opcjonalny rate limit (`rps`, `burst`, `maxConcurrentStreams`)
- automatyczne wygenerowanie klucza `gw_<slug>_<base64url>` i zapis do `.env` pod `GATEWAY_KEY_<ID>`

```bash
gateway client:add
```

### `gateway client:edit <clientId>`

Edycja klienta:

- nazwa wyświetlana
- typ klienta
- rate limit (ustaw / zmień / usuń)
- rotacja klucza gateway (unieważnia stary klucz w `.env`)

```bash
gateway client:edit webapp
```

### `gateway client:remove <clientId>`

Usuwa klienta z YAML i wpis `gatewayKeyRef` z `.env` (po confirm).

```bash
gateway client:remove webapp
```

## Komendy — klucze

### `gateway key:generate`

Generuje kryptograficznie losowy klucz (Node.js `crypto.randomBytes`).

```bash
# Master key → gw_mk_<base64url>
gateway key:generate --type master
gateway key:generate master

# Klucz klienta → gw_<slug>_<base64url>
gateway key:generate --type client --client-id webapp
gateway key:generate client webapp
```

Opcje:

- `-t, --type <master|client>` — typ klucza (wymagane)
- `-c, --client-id <id>` — ID klienta (wymagane dla typu `client`)

Komenda **nie zapisuje** klucza do `.env` — wyświetla wartość w terminalu z podpowiedzią zmiennej env i ostrzeżeniem o widoczności na ekranie.

Formaty (zgodne z wizardem):

| Typ | Format | Przykład env |
|-----|--------|--------------|
| Master | `gw_mk_<segment>` | `MASTER_KEY` |
| Klient | `gw_<slug>_<segment>` | `GATEWAY_KEY_<ID>` |

## Wzorzec mutacji konfiguracji

Komendy add/edit/remove (poza samym wizardem) stosują wspólny wzorzec:

1. `CliConfigLoaderService.loadRawConfig()` — odczyt YAML
2. Mutacja w pamięci
3. `GatewayConfigSchema.safeParse()` — walidacja struktury
4. Backup `gateway.config.yaml` — `FileManagerService.backupFile()` → katalog `backup/` (np. `backup/gateway.config.yaml.backup-<timestamp>`; katalog w `.gitignore`)
5. Zapis YAML — `ConfigPersistenceService.persistConfig()`
6. Sekrety — `EnvPatchService` (`setVar` / `removeVar` w `.env`)

Kierunek zależności: **config → cli** (typy, schematy, `validateGatewayConfig()`); CLI **nie** importuje `ConfigModule` ani `buildEffectiveGatewayConfig()`.

## Warstwa CLI — skrót

| Komponent | Rola |
|-----------|------|
| `CliModule` | Root NestJS module — **bez** `ConfigModule` |
| `CliConfigLoaderService` | YAML + `GatewayConfigSchema`; `loadWithEnvCheck()` raportuje braki env |
| `FileManagerService` | read/write YAML, `.env`, backup do `backup/` |
| `ConfigGeneratorService` | Generowanie plików z szablonów (wizard) |
| `ConfigPersistenceService` | Walidacja Zod + backup + zapis YAML po mutacjach |
| `EnvPatchService` | Aktualizacja pojedynczych zmiennych w `.env` |
| `WizardOrchestratorService` | Orkiestracja kroków wizarda |
| `WizardStateManager` | Persistencja `.gateway-wizard-state.json`, rollback |
| `ProviderManagerService` | add / remove / edit instancji providera |
| `ModelManagerService` | add / remove / edit aliasów modeli |
| `ClientManagerService` | add / remove / edit klientów |
| `ProviderTestService` | Lekkie testy SDK Anthropic / Google |
| `KeyGeneratorService` | Klucze master `gw_mk_*`, klient `gw_<slug>_*` |

Importy z `src/config/`: typy, schematy Zod, `validateGatewayConfig()`, `PROVIDER_TYPES`, `GATEWAY_CLIENT_TYPES`. Patrz `anty-patterny.md` (§14).

## Wskazówki

- `gateway --help` — lista komend nest-commander
- `gateway <command> --help` — opcje per komenda
- Komendy mutujące tworzą backup `gateway.config.yaml` w `backup/` przed zapisem (wizard przy nadpisaniu istniejącej konfiguracji robi to samo dla YAML i `.env`)
- Po zmianach env uruchom `gateway config:validate` przed startem serwera
- Pliki promptów modeli nie są automatycznie usuwane przy `model:remove` / `provider:remove` — usuń ręcznie, jeśli potrzeba

## Powiązane dokumenty

- `konfiguracja.md` — runtime vs CLI loader, `npm run config:validate`, placeholder config, multi-instance
- `architektura.md` — diagram izolacji CLI / HTTP
- `architektura-katalogi-pliki.md` — drzewo `src/cli/`
- `dictionary.md` — terminy *Gateway CLI*, *CliConfigLoader*, *placeholder config*, *providerInstance*
