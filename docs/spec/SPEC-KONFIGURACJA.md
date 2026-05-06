# SPEC — Konfiguracja (plug&play)

## Cel / problem

Użytkownik ma móc skonfigurować gateway bez zmian w kodzie:

- podać swoje klucze API (env),
- zdefiniować aliasy modeli i polityki (pliki konfiguracyjne),
- uruchomić serwis lokalnie lub w swojej infrastrukturze.

## Użytkownicy i scenariusze

### Scenariusz A — minimalna konfiguracja

1. Użytkownik wypełnia `OPENAI_API_KEY` w `.env`.
2. W configu dodaje `providerInstance=openai-main` i `modelAlias=chat-default`.
3. Uruchamia serwis i wywołuje `/chat`.

### Scenariusz B — konfiguracja dwóch providerów + streaming

1. Użytkownik ustawia `OPENAI_API_KEY` i `ANTHROPIC_API_KEY`.
2. Tworzy dwa aliasy modeli, jeden z `streaming: true`.
3. Wywołuje `/chat/stream` dla aliasu wspierającego streaming.

## Wymagania funkcjonalne

F-1. Sekrety muszą być pobierane wyłącznie z env.

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

- [ ] Serwis nie startuje bez wymaganych env.
- [ ] Serwis nie startuje z configiem niespójnym (np. nieznany providerInstance).
- [ ] `modelAlias` jest jedyną publiczną metodą wyboru modelu w API (MVP).

## Poza zakresem (MVP)

- Hot reload konfiguracji bez restartu.
- UI do zarządzania konfiguracją.

