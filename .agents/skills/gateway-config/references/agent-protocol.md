# Agent protocol (CRUD)

Współdzielone reguły dla wszystkich flowów `gateway-config`. Kontrakt runtime: `src/cli/agent/agent-report.ts`, `resolve-cli-mode.ts`, `load-answers.ts`.

## Wywołania

Z roota repozytorium:

```bash
npm run cli -- <command> --agent --answers <ścieżka-do-answers.json> --json
npm run cli -- config:secrets-status --json
npm run cli -- config:validate --json
npm run config:validate
```

Przykład answers path: `.gateway-crud-answers.json` (root lub temp). Nie commitować.

Raport JSON jest na **stdout**. Logi UX mogą iść na stderr — parsuj stdout.

## Exit codes `AgentReport`

| Exit | `status` | Znaczenie |
|------|----------|-----------|
| `0` | `success` | Mutacja OK (lub gate OK) |
| `2` | `awaiting_secrets` | Struktura OK; brakuje wartości w `.env` |
| `1` | `error` | Błąd — czytaj `errors[]` |

## Preflight (przed każdą mutacją)

1. Czy istnieje `gateway.config.yaml`?
2. Czy to **nie** boilerplate? (CLI zwraca błąd z `next: ['gateway config:init']` — wtedy skill `gateway-setup`).
3. Przy edit/remove: potwierdź, że `id` / `alias` istnieje (list/show), zanim zapiszesz answers.

## Sekrety (human in the tool)

Gdy mutacja zwróci `status: "awaiting_secrets"` (typowo exit `2`):

1. Z `pendingSecrets[]` zbuduj instrukcję: `envRef`, `reason`, edycja lokalna `.env`, **bez** wklejania do czatu.
2. Napisz: *Po uzupełnieniu `.env` napisz „Zrobione” — wtedy sprawdzę status.*
3. **STOP** — żadnych kolejnych komend do potwierdzenia użytkownika.
4. Po potwierdzeniu:

```bash
npm run cli -- config:secrets-status --json
```

- exit `2` → pokaż pozostałe `pendingSecrets`, znów czekaj.
- exit `0` → idź do walidacji.
- exit `1` → pokaż błąd i napraw.

Nie odczytuj wartości sekretów z `.env` do czatu.

Operacje **bez** typowego handoffu sekretów: `model:*`, `provider:remove`, `client:remove`, większość `client:edit` / `model:edit` (klucz klienta przy `client:add` / `rotateKey` generuje CLI do `.env` — nie proś użytkownika o wklejenie gateway key).

## Walidacja (zawsze na koniec udanej mutacji)

```bash
npm run cli -- config:validate --json
npm run config:validate
```

Obie powinny dać exit `0`. Przy błędzie: pokaż `errors` / stderr; zaproponuj korektę non-secret albo uzupełnienie env — bez prośby o sekret w czacie.

## Discovery (opcjonalne, nie jest celem skilla)

```bash
npm run cli -- provider:list --json
npm run cli -- model:list --json
npm run cli -- client:list --json
npm run cli -- config:show --json
```

Używaj tylko do wyboru istniejącego `id` / `alias` lub sprawdzenia stanu.

## Obsługa błędów (skrót)

| Sytuacja | Działanie |
|----------|-----------|
| Invalid answers / Zod | Popraw JSON wg `errors[]` / komunikatów `[AGENT]` |
| Config missing / boilerplate | Handoff → `gateway-setup` |
| exit `2` po mutacji | Normalny handoff `.env` — nie traktuj jako porażki |
| Użytkownik wkleja sekret | Odrzuć użycie; każ wpisać tylko do `.env` |
| `confirmNonBootable` wymagane | Wyjaśnij ryzyko bootowalności; po świadomej zgodzie ustaw `true` i powtórz |
| Remove bez `confirm: true` | Schema odrzuci — zawsze `confirm: true` po jawnej zgodzie użytkownika |

## Pliki answers — zakazane pola (przykłady)

Nie umieszczaj m.in.: `apiKey`, `apiKeyRef`, `baseUrl`, `baseUrlRef`, `gatewayKey`, `redisPassword`, `sentryDsn`, surowego `masterKey`.  
Pełna lista banów jest w `superRefine` / `rejectSecretFields` w `src/cli/schemas/agent-answers.schema.ts`.
