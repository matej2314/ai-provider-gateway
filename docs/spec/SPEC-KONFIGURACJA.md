# SPEC — Konfiguracja (plug&play)

## Cel / problem

Użytkownik ma móc skonfigurować gateway bez zmian w kodzie:

- podać swoje klucze API (env),
- zdefiniować aliasy modeli i polityki (pliki konfiguracyjne),
- uruchomić serwis lokalnie lub w swojej infrastrukturze.

## Użytkownicy i scenariusze

### Scenariusz A — minimalna konfiguracja

1. Użytkownik uruchamia **`gateway config:init`** (zalecane po sklonowaniu — zastępuje boilerplate w repo) **lub** ręcznie ustawia env i YAML.
2. Ustawia **co najmniej jeden** klucz providera w `.env`: `ANTHROPIC_API_KEY` **lub** `GOOGLE_API_KEY` (w środowisku **production** gateway odrzuca start bez żadnego niepustego klucza po `trim()`; w development ta reguła nie jest egzekwowana — patrz `src/config/env.validation.ts`).
3. W configu dodaje `providerInstance=anthropic` (lub `google`) z `enabled: true` i `modelAlias=chat-default`.
4. Uruchamia serwis i wywołuje `/chat`.

### Scenariusz B — konfiguracja dwóch providerów + streaming

1. Użytkownik ustawia w `.env` klucze dla **każdego** providera faktycznie używanego w konfiguracji modeli (np. przy aliasach na Anthropic i Google — typowo **oba** klucze: `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`). W **production** dodatkowo musi być spełniony **globalny** warunek: **co najmniej jeden** niepusty klucz spośród `env.validation.ts` (wystarczy jeden provider). Same zmienne env są opcjonalne pojedynczo (poza production); wartości są liczone po `trim()`.
2. Tworzy dwa aliasy modeli, jeden z `streaming: true`.
3. Wywołuje `POST /api/v1/chat/stream` dla aliasu wspierającego streaming.

## Wymagania funkcjonalne

F-1. Sekrety muszą być pobierane wyłącznie z env.

F-1a. Przy starcie w **`NODE_ENV=production`** musi być spełniony warunek **„co najmniej jeden klucz API”** spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (po `trim()`). W przeciwnym razie serwis nie startuje. Implementacja: `hasAtLeastOneProviderKey` w `src/config/env.validation.ts` (po `validateSync` dla klasy `EnvironmentVariables`).

F-1b. *(Opcjonalnie)* Zmienne env **`CACHE_*`** i **`REDIS_*`** mogą włączyć zapis/odczyt odpowiedzi czatu w Redis (`src/config/env.validation.ts`, `src/config/configuration.ts`, `src/app.module.ts`, `docs/konfiguracja.md`).

F-2. Plik konfiguracyjny modeli musi wspierać:

- definicję provider instances (`type`, `apiKeyRef`),
- definicję `modelAlias` → (`providerInstance`, `modelId`),
- polityki (timeout, retry, allowlista parametrów, bounds),
- capabilities (co najmniej `streaming`; opcjonalnie `tools` dla function calling),
- opcjonalny **`fallback`** (alias zapasowy — walidacja bez pętli przy starcie).

F-3. Gateway musi walidować konfigurację przy starcie (fail‑fast). Plik `gateway.config.yaml` jest wczytywany i walidowany schematem Zod w `src/config/gateway-config.schema.ts` (`GatewayConfigSchema`); składanie efektywnej konfiguracji — `src/config/configuration.ts`. Walidacja offline: `validateGatewayConfig()` w `src/config/config-validator.ts` (używana przez `npm run config:validate` i wizard `config:init`).

F-3a. W sekcji `providers` w `gateway.config.yaml` **dozwolone** jest wiele wpisów o tym samym `type` (np. `google` i `google-office`), pod warunkiem **unikalnego** `apiKeyRef` na instancję. Duplikat `apiKeyRef` jest odrzucany przez walidację schematu (`GatewayConfigSchema.providers.superRefine`). Runtime rozwiązuje wywołania LLM po **`model.providerInstance`**, nie po `type`.

F-3b. Sekcja `models` **nie może być pusta**. Każdy alias musi wskazywać `providerInstance` istniejący w `providers`. Implementacja: `GatewayConfigSchema.superRefine` w `src/config/gateway-config.schema.ts`.

F-3c. Dla każdej instancji providera z **`enabled !== false`** w `providers` musi istnieć **co najmniej jeden** wpis w `models` z tym samym `providerInstance`. Instancje z `enabled: false` nie podlegają tej regule. Po filtrze `enabled` reguła jest powtórzona w `buildEffectiveGatewayConfig` dla **aktywnych** providerów i **aktywnych** modeli (modele powiązane z wyłączonym providerem są pomijane).

F-4. Brak wymaganej zmiennej env wskazanej przez `apiKeyRef` → start odrzucony z czytelnym komunikatem.

F-5. W runtime gateway nie może przyjmować modelu spoza allowlisty (aliasy są źródłem prawdy).

## Wymagania niefunkcjonalne

NFR-1. Konfiguracja powinna być wersjonowana (`schemaVersion`).

NFR-2. Dokumentacja configu musi być spójna z implementacją.

NFR-3. Dostępny jest skrypt npm **`config:validate`** (wpis w `package.json`), który waliduje `gateway.config.yaml` oraz reguły env **bez uruchamiania serwera**, z niezerowym kodem wyjścia przy błędzie (np. dla CI). Opis użytkowy: `docs/konfiguracja.md`.

## Kryteria akceptacji

- [x] Serwis nie startuje bez **minimum jednego** klucza providera w env (zg. z `env.validation.ts`) oraz bez env wymaganych przez `apiKeyRef` w aktywnej konfiguracji modeli.
- [x] Serwis nie startuje z configiem niespójnym: nieznany `providerInstance`, puste `models`, włączony provider bez modeli (F-3b, F-3c).
- [x] Serwis nie startuje przy **duplikacie `apiKeyRef`** w `providers` (F-3a).
- [x] W YAML dozwolone są **wiele instancji** z tym samym `type` (multi-instance runtime).
- [ ] `modelAlias` jest jedyną publiczną metodą wyboru modelu w API (rdzeń MVP — kontrakt na start).
- [x] `npm run config:validate` przechodzi na poprawnym zestawie pliku `gateway.config.yaml` + env i kończy się błędem na zestawie świadomie niepoprawnym (zgodnie z NFR-3).

## Poza zakresem (względem rdzenia MVP)

- Hot reload konfiguracji bez restartu.
- UI do zarządzania konfiguracją.
- Pełny katalog aliasów wszystkich modeli API providerów MVP oraz walidacja kompletności aliasów „zwyczajowych” (część pozostała kroku 5.6 w planie implementacji).

