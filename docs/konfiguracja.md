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
- **Mapowanie kluczy do adapterów:** `configuration.ts` buduje obiekt `providers` jako `Record<type, { apiKey }>` iterując **wszystkie** wpisy w `gateway.config.providers` i ustawiając `providersByType[instance.type]`. Nazwy instancji (np. `anthropic-main`) mogą być dowolne pod warunkiem unikalnego `providerInstance` w modelach. **Uwaga:** jeśli zdefiniujesz **dwie instancje tego samego `type`** (np. dwa wpisy `anthropic`), do adaptera trafi **ostatnia** nadpisana wartość — wiele kluczy per ten sam vendor wymaga rozszerzenia modelu konfiguracji (poza obecnym MVP).
- Polityki (`timeoutMs`, `retry`, `params`) są w pliku zdefiniowane, ale **adaptery nie korzystają z nich w pełni** — część parametrów pochodzi ze stałych w kodzie adaptera lub wyłącznie z `policy.params.defaults` w `ChatService`; harmonogram dopięcia: `PLAN_IMPLEMENTACJI.md`.

## 3) Walidacja i fail-fast

Gateway kończy start m.in. gdy:

- **`gateway.config.yaml`** nie istnieje lub nie przechodzi walidacji Zod,
- w **production** nie ma co najmniej jednego klucza API (patrz wyżej).

Docelowo (spec): dodatkowe reguły — brak env wskazanego przez `apiKeyRef` dla używanej instancji, niespójny `providerInstance`, zduplikowane aliasy — część z tego jest częściowo pokryta przez schema; szczegóły rozwoju w planie.

### Skrypt diagnostyczny `npm run config:validate`

Wpis w `package.json` istnieje (`"config:validate": ""`), ale **komenda jest na razie pusta** — nie uruchamia walidacji. Docelowo (Faza 5, `PLAN_IMPLEMENTACJI.md`, krok 5.5): walidacja `gateway.config.yaml` + reguł env **bez** podnoszenia serwera HTTP, kod wyjścia ≠ 0 przy błędzie (CI).

## 4) Nadpisywanie parametrów per request

**DTO i `openapi.json`** przyjmują wyłącznie `modelAlias` i `messages`. Domyślne **temperature** / **maxOutputTokens** dla wywołania pochodzą z **`policy.params.defaults`** w YAML (użycie w `ChatService`). Opcjonalne **`params` w body** jest zaplanowane (**Faza 5**): allowlista, bounds, mapowanie na SDK.

Szczegóły: `dokumentacja_api.md`, `openapi.json`.

## 5) Profile środowiskowe (opcjonalnie)

W praktyce wygodne są osobne pliki, np.:

- `gateway.config.dev.yaml`
- `gateway.config.prod.yaml`

albo łączenie plików (bazowy + override). Obecna implementacja wczytuje **jeden** plik o stałej ścieżce `gateway.config.yaml` w `process.cwd()` — zmiana profili wymaga podmiany pliku lub rozwoju kodu.

## 6) Pliki system promptu (`src/config/system-prompt/`)

Przy starcie `configuration.ts` wczytuje treści używane do złożenia instrukcji systemowej dla providerów (pole `system` w porcie adapterów). Kolejność składania w runtime: **MASTER** → opcjonalnie **MAIN** → opcjonalnie warstwa **per alias modelu**, oddzielane podwójną newline (`\n\n`).

| Plik | Wymagany | Opis |
|------|----------|------|
| `MASTER_SYSTEM_PROMPT.md` | tak | Guardrails i obowiązkowa warstwa polityki; brak pliku lub treść pusta po obróbce → **fail-fast** przy starcie. |
| `MAIN_SYSTEM_PROMPT.md` | nie | Opcjonalna warstwa wdrożeniowa (np. styl, format); brak lub pusto → pomijana. |
| `models/<modelAlias>.md` | nie | Opcjonalna warstwa dla danego aliasu z `gateway.config.yaml` → `models`; nazwa pliku = dokładnie klucz aliasu (np. `chat-default.md`). Brak lub pusto → pomijana. |

Dla plików opcjonalnych komentarze HTML `<!-- ... -->` są usuwane przy ładowaniu — można umieścić w nich dokumentację bez wysyłania jej do modelu (`stripHtmlComments` w `configuration.ts`).

Powiązane: `dokumentacja_api.md`, `SYSTEM_PROMPTS_REFACTOR.md`.
