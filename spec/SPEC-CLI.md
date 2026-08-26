---
wersja: 2
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-26
---

# SPEC — CLI gateway (`gateway <namespace>:<action>`)

## Cel / problem

Dać operatorowi i agentowi **osobny punkt wejścia** (nie serwer HTTP) do: pierwszego setupu, walidacji offline, podglądu YAML oraz mutacji provider / model / client — bez ręcznego łamania schematu i bez wklejania sekretów do plików answers.

Konwencja: `gateway <namespace>:<action>` (bin `gateway`). Dokumentacja użytkowa: `docs/pl/CLI.md` / `docs/command_line_interface.md`. Reguły YAML/env: `SPEC-KONFIGURACJA.md`.

## Użytkownicy i scenariusze

### Scenariusz A — pierwszy setup (interaktywny)

1. Po klonie operator uruchamia `gateway config:init`.
2. Wizard zapisuje `gateway.config.yaml`, `.env` / `.env.example` i opcjonalnie pliki promptów.
3. `gateway config:validate` przechodzi; operator startuje HTTP (`npm run start:dev`).

### Scenariusz B — agent (human-in-the-tool)

1. Agent woła mutację z `--agent --answers plik.json --json`.
2. Answers **nie** zawierają sekretów (Zod `rejectSecretFields`).
3. CLI kończy `awaiting_secrets` (kod wyjścia **2**), gdy `.env` wymaga uzupełnienia przez człowieka; sukces → **0**, błąd → **1**.

### Scenariusz C — CRUD po init

Operator dodaje instancję / alias / klienta (`provider:add`, `model:add`, `client:add`), potem `config:validate`. Runtime HTTP wymaga **restartu** (brak hot reload).

## Wymagania funkcjonalne

F-1. CLI jest **osobnym** entrypointem od procesu HTTP (`CliModule`, `bin/`). Nie wymaga nasłuchującego serwera.

F-2. Dwa tryby: interaktywny (inquirer) oraz agent (`--agent`, zwykle `--answers` + `--json`). `resolveCliMode()`; w trybie agenta inquirer jest zabroniony.

F-3. Zestaw poleceń (namespace:akcja):

| Namespace | Akcje |
|-----------|--------|
| config | `init`, `validate`, `show`, `secrets-status` |
| provider | `list`, `test`, `add`, `remove`, `edit` |
| model | `list`, `add`, `remove`, `edit` |
| client | `list`, `add`, `edit`, `remove` |
| key | `generate` |

F-4. `config:init` tworzy lub nadpisuje (przy `--force` / `-y`) konfigurację z szablonów (`src/cli/templates/`). Wykrywa boilerplate (`placeholder` w ID / `masterKeyRef`).

F-5. `config:validate` waliduje YAML + reguły env **bez** startu HTTP; niezerowy exit przy błędzie. To samo jądro co `npm run config:validate` (`validateGatewayConfig`).

F-6. `config:secrets-status` raportuje brakujące wpisy w `.env` (gate dla agenta / CI).

F-7. Mutacje `provider:*` / `model:*` / `client:*` zapisują YAML i — gdy trzeba — **nazwy** zmiennych env, nie wartości sekretów w answers. Usunięcie instancji/klienta może sprzątnąć klucz z `.env`.

`client:add` / `client:edit` respektują schemat `SPEC-KONFIGURACJA.md` F-6: `type` z `GATEWAY_CLIENT_TYPES`, `gatewayKeyRef`, opcjonalne `rateLimit` (`rps`, `burst`, `maxConcurrentStreams`).

F-8. `provider:test` sprawdza połączenie SDK dla instancji (nie jest healthcheckiem HTTP).

F-9. Tryb agenta:

- plik answers ma `schemaVersion: 1` i schemat Zod per komenda (`agent-answers.schema.ts`);
- zabronione pola sekretów (`apiKey`, `baseUrl`, `gatewayKey`, `masterKey`, hasła, DSN, …);
- `--defer-secrets` w agencie **domyślnie włączone**;
- stdout przy `--json`: `AgentReport` (`ok`, `status`, `pendingSecrets`, `files`, `errors`, …).

F-10. `key:generate` — interaktywny: wypisuje klucz; agent: może zapisać do `.env` (`--write-env`), nie do answers.

## Wymagania niefunkcjonalne

NFR-1. Sekrety nie trafiają do plików answers ani do logów CLI w postaci jawnej.

NFR-2. Mutacja nie omija schematu Zod / spójności `providers` ↔ `models` oraz `clients` z `SPEC-KONFIGURACJA.md`.

NFR-3. CLI działa bez `npm run build` (wrapper `bin/gateway-cli-wrapper.js`: `dist/` albo `ts-node`).

NFR-4. Brak hot reloadu konfiguracji runtime — po CRUD operator restartuje serwis.

## Kryteria akceptacji

- [x] `config:init` (interaktywny lub `--agent`) produkuje walidowalny zestaw plików.
- [x] `config:validate` kończy się 0 na poprawnym zestawie i ≠0 na świadomie złym.
- [x] Answers ze sekretami są odrzucane przez Zod.
- [x] Agent report: exit 0 / 1 / 2 wg `exitCodeForReport`.
- [x] CRUD provider/model/client ma pokrycie unit (`npm run test:cli`).

## Poza zakresem

- Serwer HTTP i kontrakty API (`SPEC-CHAT.md`, `SPEC-FASADY.md`, …).
- UI do konfiguracji.
- Hot reload bez restartu.
- Pełna sesja E2E `config:init` w CI (unit CLI + walidator configu).
