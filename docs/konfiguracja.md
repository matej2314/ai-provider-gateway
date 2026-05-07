# Konfiguracja — AI Provider Gateway

Cel: “plug&play” — użytkownik wypełnia env + pliki konfiguracyjne i uruchamia gateway bez zmian w kodzie.

## 1) Sekrety i env (`.env`)

Zasada: **sekrety tylko w env**. Pliki konfiguracyjne nie zawierają wartości kluczy — jedynie **nazwy** zmiennych (`apiKeyRef`).

Zmienne providerów (MVP):

- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`

**Walidacja przy starcie (`src/config/env.validation.ts`):**

- W **`NODE_ENV=production`** wymagane jest, aby **co najmniej jedna** z powyższych zmiennych była niepusta po `trim()`. W przeciwnym razie start się nie powiedzie.
- W środowisku innym niż production ta reguła **nie jest sprawdzana** — nadal potrzebujesz jednak realnego klucza dla providera, którego alias wywołujesz (adapter rzuci błąd konfiguracji lub API).

W repo powinien istnieć `.env.example` bez wartości sekretów.

## 2) Plik `gateway.config.yaml` (modele / instancje / polityki)

**Status:** plik jest **wczytywany przy starcie** aplikacji (`ConfigModule` → `load: [configuration]` w `src/app.module.ts`). Walidacja struktury: **Zod** w `src/config/configuration.ts`. Brak pliku lub niezgodność ze schematem powoduje **zatrzymanie startu** (`ENOENT` lub `Invalid configuration file`).

Repozytoryjny przykład: `gateway.config.yaml` w katalogu głównym projektu.

### Schemat (zgodny z walidatorem Zod)

```yaml
schemaVersion: 1

providers:
  anthropic-main:
    type: anthropic
    apiKeyRef: ANTHROPIC_API_KEY
  google-main:
    type: google
    apiKeyRef: GOOGLE_API_KEY

models:
  chat-default:
    providerInstance: anthropic-main
    modelId: claude-sonnet-4-5-20250929
    capabilities:
      streaming: true
    policy:
      timeoutMs: 30000
      retry:
        maxAttempts: 2
        onStatus: [429, 500, 502, 503, 504]
      params:
        defaults:
          temperature: 0.7
          maxOutputTokens: 1024
        allowOverrides:
          - temperature
          - maxOutputTokens
        bounds:
          temperature: { min: 0, max: 2 }
          maxOutputTokens: { min: 1, max: 8192 }
```

Uwagi:

- `apiKeyRef` to **nazwa** zmiennej env, nie wartość.
- Aliasy pod `models` są publicznym API (`modelAlias`).
- **Uwaga implementacyjna:** mapowanie kluczy env do `ConfigService` w `configuration.ts` odwołuje się obecnie do instancji nazwanych **`anthropic-main`** i **`google-main`** przy budowaniu obiektu `providers.*.apiKey`. Zmiana nazw instancji w YAML bez aktualizacji tego fragmentu kodu złamie start — docelowo powinno to być wyprowadzone z configu dynamicznie (patrz `PLAN_IMPLEMENTACJI.md`, rozwój Fazy 3).
- Polityki (`timeoutMs`, `retry`, `params`) są w pliku zdefiniowane, ale **adaptery nie korzystają z nich w pełni** (np. Anthropic używa stałego `max_tokens` w kodzie adaptera) — harmonogram dopięcia: plan implementacji, kolejne fazy.

## 3) Walidacja i fail-fast

Gateway kończy start m.in. gdy:

- **`gateway.config.yaml`** nie istnieje lub nie przechodzi walidacji Zod,
- w **production** nie ma co najmniej jednego klucza API (patrz wyżej).

Docelowo (spec): dodatkowe reguły — brak env wskazanego przez `apiKeyRef` dla używanej instancji, niespójny `providerInstance`, zduplikowane aliasy — część z tego jest częściowo pokryta przez schema; szczegóły rozwoju w planie.

### Skrypt diagnostyczny `npm run config:validate`

Wpis w `package.json` istnieje (`"config:validate": ""`), ale **komenda jest na razie pusta** — nie uruchamia walidacji. Docelowo (Faza 5, `PLAN_IMPLEMENTACJI.md`, krok 5.5): walidacja `gateway.config.yaml` + reguł env **bez** podnoszenia serwera HTTP, kod wyjścia ≠ 0 przy błędzie (CI).

## 4) Nadpisywanie parametrów per request

Kontrakt OpenAPI przewiduje opcjonalne `params` w body czatu. **Obecne DTO nie zawiera `params`** — klient nie może ich przesłać bez błędu walidacji. Po wdrożeniu:

- odrzucanie pól spoza allowlisty,
- clampowanie wg `bounds` z YAML,
- mapowanie na pola SDK.

Szczegóły request/response: `dokumentacja_api.md`, `openapi.json`.

## 5) Profile środowiskowe (opcjonalnie)

W praktyce wygodne są osobne pliki, np.:

- `gateway.config.dev.yaml`
- `gateway.config.prod.yaml`

albo łączenie plików (bazowy + override). Obecna implementacja wczytuje **jeden** plik o stałej ścieżce `gateway.config.yaml` w `process.cwd()` — zmiana profili wymaga podmiany pliku lub rozwoju kodu.
