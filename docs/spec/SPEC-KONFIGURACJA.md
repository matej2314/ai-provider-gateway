# SPEC — Konfiguracja (plug&play)

## Cel / problem

Użytkownik ma móc skonfigurować gateway bez zmian w kodzie:

- podać swoje klucze API (env),
- zdefiniować aliasy modeli i polityki (pliki konfiguracyjne),
- uruchomić serwis lokalnie lub w swojej infrastrukturze.

## Użytkownicy i scenariusze

### Scenariusz A — minimalna konfiguracja

1. Użytkownik ustawia **co najmniej jeden** klucz providera w `.env`: `ANTHROPIC_API_KEY` **lub** `GOOGLE_API_KEY` (w MVP gateway wymaga minimum jednego z tych dwóch — walidacja przy starcie).
2. W configu dodaje `providerInstance=anthropic-main` i `modelAlias=chat-default`.
3. Uruchamia serwis i wywołuje `/chat`.

### Scenariusz B — konfiguracja dwóch providerów + streaming

1. Użytkownik ustawia w `.env` klucze dla **każdego** providera faktycznie używanego w konfiguracji modeli (np. przy aliasach na Anthropic i Google — typowo **oba** klucze: `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY`). Niezależnie od tego **globalny** warunek startu pozostaje: musi istnieć **co najmniej jeden** niepusty klucz spośród zmiennych walidowanych w `env.validation.ts` (w MVP wystarczy jeden provider). Same zmienne env są opcjonalne pojedynczo; wartości są liczone po `trim()`.
2. Tworzy dwa aliasy modeli, jeden z `streaming: true`.
3. Wywołuje `/chat/stream` dla aliasu wspierającego streaming.

## Wymagania funkcjonalne

F-1. Sekrety muszą być pobierane wyłącznie z env.

F-1a. Przy starcie musi być spełniony warunek **„co najmniej jeden klucz API”** spośród zmiennych walidowanych w `src/config/env.validation.ts` (w MVP: `ANTHROPIC_API_KEY` lub `GOOGLE_API_KEY`). Serwis nie startuje, jeśli po `trim()` oba są puste lub nieustawione. Implementacja: constraint `AtLeastOneApiKeyConstraint` + `@Validate` na jednym z pól klasy env (walidacja nadal dotyczy całego obiektu).

F-2. Plik konfiguracyjny modeli musi wspierać:

- definicję provider instances (`type`, `apiKeyRef`),
- definicję `modelAlias` → (`providerInstance`, `modelId`),
- polityki (timeout, retry, allowlista parametrów, bounds),
- capabilities (co najmniej `streaming`).

F-3. Gateway musi walidować konfigurację przy starcie (fail‑fast).

F-4. Brak wymaganej zmiennej env wskazanej przez `apiKeyRef` → start odrzucony z czytelnym komunikatem.

F-5. W runtime gateway nie może przyjmować modelu spoza allowlisty (aliasy są źródłem prawdy).

## Wymagania niefunkcjonalne

NFR-1. Konfiguracja powinna być wersjonowana (`schemaVersion`).

NFR-2. Dokumentacja configu musi być spójna z implementacją.

## Kryteria akceptacji

- [ ] Serwis nie startuje bez **minimum jednego** klucza providera w env (zg. z `env.validation.ts`) oraz bez env wymaganych przez `apiKeyRef` w aktywnej konfiguracji modeli.
- [ ] Serwis nie startuje z configiem niespójnym (np. nieznany providerInstance).
- [ ] `modelAlias` jest jedyną publiczną metodą wyboru modelu w API (MVP).

## Poza zakresem (MVP)

- Hot reload konfiguracji bez restartu.
- UI do zarządzania konfiguracją.

