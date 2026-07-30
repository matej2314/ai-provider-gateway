---
name: gateway-setup
description: >-
  Bootstrap AI Provider Gateway od zera do działającej konfiguracji przez
  `gateway config:init --agent` (wywiad jak w wizardzie CLI, human-in-the-tool
  dla sekretów w .env, secrets-status, validate, smoke test start:dev + stop).
  Używaj gdy użytkownik chce skonfigurować projekt, uruchomić setup/init
  gateway, utworzyć gateway.config.yaml / .env od zera, lub woła /gateway-setup.
---

# Gateway Setup (`config:init`)

Prowadzisz użytkownika przez **pierwszą konfigurację** projektu tak, jak interaktywny wizard CLI (`gateway config:init`), ale w trybie agentowym: zbierasz odpowiedzi bez sekretów, CLI zapisuje pliki, a sekrety uzupełnia człowiek lokalnie w `.env` (**human in the tool**).

**Cel końcowy (Definition of Done):**

1. `npm run cli -- config:secrets-status --json` → exit `0`, `status: "success"`
2. `npm run cli -- config:validate --json` → exit `0`, `ok: true`
3. `npm run config:validate` → exit `0`
4. Smoke test: `npm run start:dev` wstaje (log Nest / nasłuch na porcie z configu) bez crasha na bootstrapie — potem agent **poprawnie zamyka** proces. Port jest wolny; dalsze kroki zależą wyłącznie od użytkownika.

Język rozmowy z użytkownikiem: **polski** (chyba że użytkownik pisze po angielsku).

## Kiedy stosować

- Konfiguracja gateway od zera / boilerplate → pełna konfiguracja
- Użytkownik prosi o setup, init, „uruchom projekt”, „zrób gateway.config.yaml”
- Wywołanie `/gateway-setup` lub `@gateway-setup`

**Poza zakresem:** późniejsze CRUD (`provider:add`, `model:edit`, `client:remove`, …). Po udanym setupie zakończ skill; do dalszych mutacji użyj skilla **`gateway-config`**.

## Zasady nienegocjowalne

1. **Nigdy** nie proś o wklejenie sekretów do czatu (API keys, base URL z tokenem, `MASTER_KEY`, `GATEWAY_KEY_*`, `SENTRY_DSN`, `REDIS_PASSWORD`).
2. **Nigdy** nie umieszczaj sekretów w pliku answers — CLI je odrzuci (`rejectSecretFields`).
3. Mutacje agentowe tylko przez CLI z `--agent` + `--answers` + **zawsze `--json`**.
4. Sekrety = wyłącznie lokalna edycja `.env` przez użytkownika (human in the tool).
5. Po `awaiting_secrets` **zatrzymaj się** i czekaj na potwierdzenie („Zrobione” / równoważne) — nie zgaduj, że `.env` jest gotowe.
6. Nie uruchamiaj interaktywnego `config:init` bez `--agent` (inquirer).
7. Preferuj **minimalny, bootowalny** pierwszy setup: `cacheBackend: "noop"`, `rateLimitSmartEnabled: false`, `metricsBackend: "noop"`, chyba że użytkownik świadomie chce Redis/Sentry.

## Mapowanie na wizard CLI

Kolejność jak `WIZARD_INIT_STEPS` w `src/cli/constants/wizard-steps.ts`:

| Krok wizarda | W skillu (agent) | Sekrety |
|--------------|------------------|---------|
| 1. Master key | Zawsze `masterKey: { "generate": true }` — bez pytania | CLI generuje do `.env` |
| 2. Providers | Typy + `id` instancji (≥1) | API key / base URL → później w `.env` |
| 3. Models | `alias`, `providerInstance`, `modelId` (≥1; każdy model wskazuje istniejący provider) | brak |
| 4. Clients | `id`, `name`, `type`, opcjonalny `rateLimit`; zawsze `generateKey: true` | klucz gateway → CLI generuje |
| 5. Server config | port, nodeEnv, swagger, cache, redis host/port, metrics | Redis password / Sentry DSN → `.env` jeśli wybrane |
| (zapis plików) | `config:init --agent` | — |
| (human in the tool) | Instrukcja `.env` + czekaj na „Zrobione” | użytkownik |
| (domknięcie) | secrets-status → validate → smoke `start:dev` → stop | — |

Źródło kontraktu answers: `src/cli/schemas/agent-answers.schema.ts` (`InitAnswersSchema`).

## Wywołania CLI

Z roota repozytorium:

```bash
npm run cli -- config:init --agent --answers <ścieżka-do-answers.json> --json
npm run cli -- config:secrets-status --json
npm run cli -- config:validate --json
npm run config:validate
npm run start:dev
```

Opcjonalnie przy nadpisaniu istniejącej konfiguracji / niedokończonej sesji wizarda: dodaj `--force` do `config:init`.

### Exit codes `AgentReport` (mutacje / gate)

| Exit | `status` | Znaczenie |
|------|----------|-----------|
| `0` | `success` | OK |
| `2` | `awaiting_secrets` | Struktura OK; brakuje wartości w `.env` |
| `1` | `error` | Błąd — czytaj `errors[]` |

Raport JSON jest na **stdout**. Logi UX mogą iść na stderr — parsuj stdout.

## Flow sesji (obowiązkowy)

### 0. Start

1. Ogłoś, że prowadzisz setup jak wizard CLI, z osobnym krokiem uzupełnienia `.env`.
2. Sprawdź kontekst: czy istnieje `gateway.config.yaml`, czy wygląda na boilerplate, czy jest `.env`.
3. Jeśli konfiguracja już jest i **nie** jest boilerplate — zapytaj o nadpisanie. Przy zgodzie: `overwrite: true` w answers **lub** `--force`.
4. Jeśli CLI zgłosi incomplete wizard session — wyjaśnij i użyj `--force` po zgodzie użytkownika.

### 1. Wywiad (kroki 1–5 wizarda, bez sekretów)

Zbieraj odpowiedzi **krok po kroku** (nie zrzucaj całego formularza naraz, chyba że użytkownik podał komplet od razu).

**Providers** — dozwolone typy: `anthropic` | `google` | `openai` | `openai-compatible`.  
Domyślne `id`: `{type}-primary` (np. `anthropic-primary`).  
Dla `openai` / `openai-compatible` w `.env` będzie też `*_BASE_URL` (użytkownik uzupełni później).

**Models** — ≥1; `providerInstance` musi istnieć na liście providerów.  
Podpowiedzi `modelId` (jak w wizardzie):

- anthropic: `claude-sonnet-4-5-20250929`, `claude-sonnet-4-6`
- google: `gemini-2.5-flash`, `gemini-2.5-pro`
- openai: `gpt-4o`, `o3-mini`
- openai-compatible: `llama3.2`, `deepseek-chat`

**Clients** — typy: `webapp` | `ide` | `cli` | `service` | `backend` | `automation`.  
Zawsze `generateKey: true`.

**Server** — domyślnie dla pierwszego uruchomienia:

- `port`: `3000`
- `nodeEnv`: `development`
- `swaggerEnabled`: `true`
- `cacheEnabled`: `false`, `cacheBackend`: `noop`
- `rateLimitSmartEnabled`: `false`
- `metricsBackend`: `noop`

Jeśli użytkownik wybierze Redis (cache redis i/lub smart rate limit): zbierz `redisHost` / `redisPort` (bez hasła). Uwaga: gate sekretów wymaga **niepustego** `REDIS_PASSWORD` gdy backend to redis — poinformuj użytkownika; przy braku hasła w Redisie rozważ `noop` na start.

### 2. Plik answers

Zapisz JSON (np. `.gateway-init-answers.json` w rootcie lub temp) zgodny ze schematem. Przykład minimalny:

```json
{
  "schemaVersion": 1,
  "masterKey": { "generate": true },
  "providers": [{ "id": "anthropic-primary", "type": "anthropic", "enabled": true }],
  "models": [
    {
      "alias": "chat-default",
      "providerInstance": "anthropic-primary",
      "modelId": "claude-sonnet-4-5-20250929"
    }
  ],
  "clients": [
    {
      "id": "webapp",
      "name": "My web app",
      "type": "webapp",
      "generateKey": true
    }
  ],
  "server": {
    "port": 3000,
    "nodeEnv": "development",
    "swaggerEnabled": true,
    "cacheEnabled": false,
    "cacheBackend": "noop",
    "rateLimitSmartEnabled": false,
    "metricsBackend": "noop"
  }
}
```

**Zakazane pola** m.in.: `apiKey`, `apiKeyRef`, `baseUrl`, `baseUrlRef`, `gatewayKey`, `redisPassword`, `sentryDsn`, `masterKey` (jako string sekretu).

Krótko podsumuj plan użytkownikowi i dopiero potem uruchom CLI (chyba że użytkownik kazał działać od razu).

### 3. Uruchomienie `config:init`

```bash
npm run cli -- config:init --agent --answers .gateway-init-answers.json --json
```

Zinterpretuj JSON ze stdout:

- `status: "error"` → pokaż `errors[]`, napraw answers / użyj `--force` po zgodzie, powtórz.
- `status: "awaiting_secrets"` (typowo exit `2`) → przejdź do human in the tool.
- `status: "success"` (exit `0`, rzadkie gdy brak pending) → przejdź do walidacji (sekcja 5).

Nie czytaj ani nie wypisuj wartości z `.env`. Możesz wspomnieć `files[]` i `generatedKeyRefs[]` (same nazwy refów).

### 4. Human in the tool (sekrety w `.env`)

To odpowiednik momentu, w którym interaktywny wizard pyta o API keys / URL / opcjonalne operacyjne sekrety — w agent mode następuje **po** zapisie plików.

1. Z `pendingSecrets[]` zbuduj czytelną instrukcję dla użytkownika, np.:

   - które `envRef` uzupełnić,
   - `reason` (np. `provider_api_key`, `provider_base_url`, `sentry_dsn`, `redis_password`),
   - że edytuje lokalnie plik `.env` w rootcie projektu,
   - że **nie** wkleja wartości do czatu.

2. Dla OpenAI / compatible podpowiedz, że `*_BASE_URL` to bazowy URL API (bez sekretu w czacie).
3. Wyraźnie napisz: *Po uzupełnieniu `.env` napisz „Zrobione” (lub „gotowe” / „done”) — wtedy sprawdzę, czy wartości są obecne, i dokończę setup.*
4. **STOP** — nie uruchamiaj kolejnych komend, dopóki użytkownik nie potwierdzi.

Po potwierdzeniu:

```bash
npm run cli -- config:secrets-status --json
```

- exit `2` / `awaiting_secrets` → pokaż **pozostałe** `pendingSecrets`, poproś o dokończenie, znów czekaj na „Zrobione”.
- exit `0` / `success` → idź dalej.
- exit `1` → pokaż błąd i napraw.

Powtarzaj pętlę potwierdzenie → `secrets-status` aż do exit `0`. Nie otwieraj `.env` w celu odczytu wartości sekretów do czatu; status sprawdzaj wyłącznie przez CLI.

### 5. Walidacja

Gdy secrets-status jest zielony:

```bash
npm run cli -- config:validate --json
npm run config:validate
```

Obie komendy muszą zakończyć się sukcesem (exit `0`). Przy błędzie: pokaż `errors` / stderr, zaproponuj poprawkę (answers + ponowny init z `--force`, albo wskazanie brakującego env — bez prośby o wklejenie sekretu do czatu).

### 6. Smoke test `start:dev` (tylko weryfikacja — potem stop)

`npm run start:dev` na końcu setupu to **wyłącznie test**, że konfiguracja bootuje. Agent **nie** zostawia serwera działającego.

```bash
npm run start:dev
```

1. Uruchom w tle / z monitoringiem logów.
2. **Sukces bootu:** aplikacja wstaje (Nest started / listening na porcie z configu), brak fatalnego błędu konfiguracji/env na starcie.
3. **Natychmiast po sukcesie:** poprawnie zamknij proces `start:dev` (SIGINT / graceful stop całego drzewa procesów npm/nest — nie zostawiaj orphanów ani zajętego portu). Potwierdź, że port z configu jest wolny.
4. **Porażka bootu:** zdiagnozuj z logów (często brakujący env, Redis niedostępny, zły base URL) → zamknij proces jeśli wisi → wróć do human in the tool lub korekt non-secret w configu; nie proś o sekrety w czacie.

Po udanym teście i zatrzymaniu krótko podsumuj jak dotychczas: jakie pliki powstały, że sekrety są w `.env`, że validate przechodzi, że projekt **działa** (smoke test `start:dev` OK). Wyraźnie napisz, że serwer **nie** jest już uruchomiony — port jest wolny, pełna kontrola należy do użytkownika; dalsze kroki (ponowny `npm run start:dev`, CRUD, commit itd.) zależą wyłącznie od niego. Zaproponuj usunięcie pliku answers z dysku, jeśli nadal leży w repo (nie commitować answers).

## Obsługa błędów (skrót)

| Sytuacja | Działanie |
|----------|-----------|
| Invalid answers | Popraw JSON wg komunikatów Zod / `[AGENT]` |
| Config already exists | `overwrite: true` lub `--force` po zgodzie |
| Incomplete wizard session | `--force` po zgodzie |
| exit `2` po init | Normalny handoff — nie traktuj jako porażki setupu |
| Użytkownik wkleja sekret do czatu | Odrzuć użycie wartości; każ wpisać tylko do `.env` i potwierdzić „Zrobione” |
| Redis bez hasła + `cacheBackend: redis` | Gate może nie zejść z `redis_password` — preferuj `noop` albo niepuste hasło w `.env` lokalnie |

## Czego nie robić

- Nie używaj `config:init` interaktywnego w tej ścieżce.
- Nie pomijaj `--json` przy komendach agent/gate.
- Nie uznawaj setupu za skończony po samym `config:init` z exit `2`.
- Nie zostawiaj `start:dev` działającego po setupie — to tylko smoke test; po sukcesie zawsze stop i zwolnij port.
- Nie rozszerzaj sesji na CRUD providerów/modeli poza pierwszym initem (CRUD → skill `gateway-config`).
- Nie commituj pliku answers ani `.env`.
