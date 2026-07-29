---
name: gateway-config
description: >-
  Mutuje istniejącą konfigurację AI Provider Gateway (jedna operacja CRUD:
  provider/model/client add|edit|remove) przez CLI `--agent --answers --json`,
  z human-in-the-tool dla sekretów w .env. Używaj gdy użytkownik chce dodać,
  zmienić lub usunąć providera, model albo klienta; woła /gateway-config;
  albo prosi o CRUD konfiguracji po setupie. Nie używaj do pierwszego init
  (→ gateway-setup) ani do key:generate / listowania jako celu.
---

# Gateway Config (CRUD, jedna mutacja)

Prowadzisz **jedną** mutację istniejącej konfiguracji (`gateway.config.yaml` + ewentualnie `.env`) tak jak interaktywne komendy CLI, ale w trybie agentowym: zbierasz answers bez sekretów, CLI zapisuje pliki, sekrety uzupełnia człowiek lokalnie (**human in the tool**).

**Cel końcowy (Definition of Done) — ta jedna mutacja:**

1. Komenda mutująca → `AgentReport` ze `status: "success"` (exit `0`), **albo** po handoffie: `config:secrets-status --json` → exit `0`
2. `npm run cli -- config:validate --json` → exit `0`, `ok: true`
3. (zalecane) `npm run config:validate` → exit `0`

Język rozmowy: **polski** (chyba że użytkownik pisze po angielsku).

## Kiedy stosować

- Dodanie / edycja / usunięcie **providera**, **modelu** lub **klienta**
- `/gateway-config` lub `@gateway-config`
- „Dodaj OpenAI”, „zmień alias modelu”, „usuń klienta X”, „wyłącz provider”

**Poza zakresem (v1):**

| Temat | Gdzie |
|-------|--------|
| Pierwszy setup / `config:init` | skill `gateway-setup` |
| `key:generate` | poza tym skillem |
| List / show jako **cel** sesji | zwykłe CLI; wolno użyć `*:list --json` tylko jako discovery ID |
| Wiele mutacji w jednej orkiestracji | v1 = **jedna** mutacja, potem **koniec** |
| Smoke `start:dev` | tylko w `gateway-setup` |

## Zasady nienegocjowalne

1. **Nigdy** nie proś o wklejenie sekretów do czatu.
2. **Nigdy** nie umieszczaj sekretów w pliku answers (`rejectSecretFields` w CLI).
3. Mutacje tylko: `npm run cli -- <cmd> --agent --answers <path> --json`.
4. Po `awaiting_secrets` **STOP** — czekaj na „Zrobione” / równoważne.
5. Nie uruchamiaj interaktywnych komend CRUD bez `--agent`.
6. **Jedna mutacja na sesję skilla** — po DoD zakończ; kolejna zmiana = ponowne wywołanie.
7. Po zmapowaniu operacji **przeczytaj dokładnie jeden** plik `flows/*.md` i go przestrzegaj.
8. Wspólny protokół: [`references/agent-protocol.md`](references/agent-protocol.md).

## Routing (intent → flow)

Przy niejasności zadaj **jedno** pytanie: encja (`provider` | `model` | `client`) + akcja (`add` | `edit` | `remove`).

| Intent (przykłady) | Komenda | Playbook |
|--------------------|---------|----------|
| Dodaj providera / nową instancję Anthropic/OpenAI/… | `provider:add` | [`flows/provider-add.md`](flows/provider-add.md) |
| Włącz/wyłącz provider, rotacja API key | `provider:edit` | [`flows/provider-edit.md`](flows/provider-edit.md) |
| Usuń providera | `provider:remove` | [`flows/provider-remove.md`](flows/provider-remove.md) |
| Dodaj model / alias | `model:add` | [`flows/model-add.md`](flows/model-add.md) |
| Zmień model (id, provider, fallback, policy…) | `model:edit` | [`flows/model-edit.md`](flows/model-edit.md) |
| Usuń model | `model:remove` | [`flows/model-remove.md`](flows/model-remove.md) |
| Dodaj klienta gateway | `client:add` | [`flows/client-add.md`](flows/client-add.md) |
| Edytuj klienta (name/type/rateLimit/rotateKey) | `client:edit` | [`flows/client-edit.md`](flows/client-edit.md) |
| Usuń klienta | `client:remove` | [`flows/client-remove.md`](flows/client-remove.md) |

**Compound intents:** „provider + pierwszy model” → **`provider:add`** (`ensureModel`), nie dwa flowy.  
„Dodaj providera i klienta” → w v1 wybierz **jedną** operację (preferuj tę, którą użytkownik wymienił pierwszą / potwierdź wybór), drugą odłóż na kolejną sesję.

## Flow sesji (obowiązkowy)

### 0. Start + routing

1. Ogłoś, że wykonasz **jedną** mutację konfiguracji przez CLI agent mode.
2. Zmapuj intent → wiersz tabeli routingu.
3. **Read** odpowiadającego `flows/*.md` (+ w razie potrzeby `references/agent-protocol.md`).

### 1. Preflight

Jak w protokole: config istnieje, nie boilerplate. Inaczej → handoff do `gateway-setup`, **bez** mutacji CRUD.

Opcjonalnie: `provider:list` / `model:list` / `client:list` z `--json` (gdy dostępne) albo `config:show --json`, żeby potwierdzić istniejące `id` / `alias`.

### 2. Wywiad → answers → CLI

Zgodnie z playbookiem. Kontrakt pól: `src/cli/schemas/agent-answers.schema.ts` (SSoT — nie wymyślaj pól).

### 3. Domknięcie

Secrets-status (jeśli `awaiting_secrets`) → validate → krótkie podsumowanie.

### 4. Sprzątanie

Usuń tymczasowy plik answers (np. `.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
**Koniec sesji skilla.**

## Czego nie robić

- Nie łącz kilku komend mutujących w jednej sesji v1.
- Nie używaj `config:init` w tym skillu.
- Nie pomijaj `--json` przy komendach agent/gate.
- Nie kopiuj całych schematów Zod do answers „na zapas” — tylko pola wymagane przez dany flow.
