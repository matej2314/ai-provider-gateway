# SPEC — Konfiguracja (plug&play)

## Cel / problem

Użytkownik ma móc skonfigurować gateway bez zmian w kodzie:

- podać swoje klucze API (env),
- zdefiniować aliasy modeli i polityki (pliki konfiguracyjne),
- uruchomić serwis lokalnie lub w swojej infrastrukturze.

## Użytkownicy i scenariusze

### Scenariusz A — minimalna konfiguracja

1. Użytkownik ustawia **co najmniej jeden** klucz providera w `.env`: `ANTHROPIC_API_KEY` **lub** `GOOGLE_API_KEY` (w środowisku **production** gateway odrzuca start bez żadnego niepustego klucza po `trim()`; w development ta reguła nie jest egzekwowana — patrz `src/config/env.validation.ts`).
2. W configu dodaje `providerInstance=anthropic-main` i `modelAlias=chat-default`.
3. Uruchamia serwis i wywołuje `/chat`.

### Scenariusz B — konfiguracja dwóch providerów + streaming

1. Użytkownik ustawia w `.env` klucze dla **każdego** providera faktycznie używanego w konfiguracji modeli (np. przy aliasach na Anthropic i Google — typowo **oba** klucze: `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`). W **production** dodatkowo musi być spełniony **globalny** warunek: **co najmniej jeden** niepusty klucz spośród `env.validation.ts` (wystarczy jeden provider). Same zmienne env są opcjonalne pojedynczo (poza production); wartości są liczone po `trim()`.
2. Tworzy dwa aliasy modeli, jeden z `streaming: true`.
3. Wywołuje `POST /api/v1/chat/stream` dla aliasu wspierającego streaming.

## Wymagania funkcjonalne

F-1. Sekrety muszą być pobierane wyłącznie z env.

F-1a. Przy starcie w **`NODE_ENV=production`** musi być spełniony warunek **„co najmniej jeden klucz API”** spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (po `trim()`). W przeciwnym razie serwis nie startuje. Implementacja: `hasAtLeastOneProviderKey` w `src/config/env.validation.ts` (po `validateSync` dla klasy `EnvironmentVariables`).

F-2. Plik konfiguracyjny modeli musi wspierać:

- definicję provider instances (`type`, `apiKeyRef`),
- definicję `modelAlias` → (`providerInstance`, `modelId`),
- polityki (timeout, retry, allowlista parametrów, bounds),
- capabilities (co najmniej `streaming`).

F-3. Gateway musi walidować konfigurację przy starcie (fail‑fast). Plik `gateway.config.yaml` jest wczytywany i walidowany schematem Zod w `src/config/configuration.ts`.

F-3a. W sekcji `providers` w `gateway.config.yaml` każdy `type` (`anthropic`, `google`, …) może wystąpić **co najwyżej raz**. Duplikacja typu (np. dwie instancje `type: anthropic`) jest odrzucana przez walidację schematu (`GatewayConfigSchema.providers.superRefine`) z komunikatem wskazującym zduplikowany typ oraz nazwy zderzających się instancji. Różnice między środowiskami (dev/staging/prod) wyraża się **wartością** zmiennej wskazanej przez `apiKeyRef`, a nie wielokrotnym deklarowaniem instancji tego samego typu.

F-4. Brak wymaganej zmiennej env wskazanej przez `apiKeyRef` → start odrzucony z czytelnym komunikatem.

F-5. W runtime gateway nie może przyjmować modelu spoza allowlisty (aliasy są źródłem prawdy).

## Wymagania niefunkcjonalne

NFR-1. Konfiguracja powinna być wersjonowana (`schemaVersion`).

NFR-2. Dokumentacja configu musi być spójna z implementacją.

NFR-3. Dostępny jest skrypt npm **`config:validate`** (wpis w `package.json`; obecnie **placeholder** bez komendy), który docelowo waliduje `gateway.config.yaml` oraz reguły env **bez uruchamiania serwera**, z niezerowym kodem wyjścia przy błędzie (np. dla CI). Szczegóły planu: `PLAN_IMPLEMENTACJI.md`, Faza 5, krok 5.5. Opis użytkowy: `docs/konfiguracja.md`.

## Kryteria akceptacji

- [ ] Serwis nie startuje bez **minimum jednego** klucza providera w env (zg. z `env.validation.ts`) oraz bez env wymaganych przez `apiKeyRef` w aktywnej konfiguracji modeli.
- [ ] Serwis nie startuje z configiem niespójnym (np. nieznany providerInstance).
- [x] Serwis nie startuje, gdy w `providers` zadeklarowano **dwie lub więcej** instancje o tym samym `type` (jedna instancja per typ — F-3a).
- [ ] `modelAlias` jest jedyną publiczną metodą wyboru modelu w API (rdzeń MVP — kontrakt na start).
- [ ] `npm run config:validate` przechodzi na poprawnym zestawie pliku `gateway.config.yaml` + env i kończy się błędem na zestawie świadomie niepoprawnym (zgodnie z NFR-3).

## Poza zakresem (względem rdzenia MVP)

- Hot reload konfiguracji bez restartu.
- UI do zarządzania konfiguracją.

