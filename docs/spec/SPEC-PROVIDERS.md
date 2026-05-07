# SPEC — Provider adapters (Anthropic / Google Gemini)

## Cel / problem

Zamknąć integracje z providerami LLM w adapterach tak, aby:

- logika aplikacyjna nie zależała od SDK providera,
- kontrakt request/response gateway był spójny,
- błędy providerów były mapowane do stabilnych kodów gateway.

## Klucze API (env)

Wartości uwierzytelniające są wczytywane z env (w konfiguracji modeli: `apiKeyRef`). Niezależnie od tego przy **starcie** aplikacji obowiązuje globalna reguła z `src/config/env.validation.ts`: musi być ustawiony **co najmniej jeden** niepusty klucz spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (szczegóły: `docs/konfiguracja.md`).

## Użytkownicy i scenariusze

### Scenariusz A — dodanie nowego providera

1. Implementator tworzy nowy adapter (np. OpenAI).
2. Rejestruje go w module Providers.
3. Konfiguracja pozwala wskazać `providerInstance` typu `openai`.
4. ChatService używa go bez zmian w kontrolerze.

### Scenariusz B — ujednolicone błędy

1. Anthropic zwraca 429.
2. Gateway mapuje to do `PROVIDER_RATE_LIMITED`.
3. Klient ma jeden kod obsługi, niezależnie od providera.

## Wymagania funkcjonalne

F-1. Każdy adapter implementuje wspólny port (interfejs) providera.

F-2. Adapter musi wspierać co najmniej:

- `complete` (standard),
- `stream` (jeśli provider wspiera).

F-2a. Port providera przyjmuje **znormalizowane** wejście rozmowy:

- `system?: string` — instrukcja systemowa przekazywana osobno,
- `messages[]` — wyłącznie role `user` i `assistant` (bez `system`).

Uwaga: kontrakt HTTP nadal może wspierać `messages[]` z rolą `system`, ale **normalizacja** (wycięcie/aglomeracja `system`) odbywa się przed wywołaniem adaptera.

F-3. Adapter mapuje parametry z kontraktu gateway do pól SDK:

- `temperature`
- `maxOutputTokens` (lub odpowiednik)

F-4. Adapter mapuje błędy SDK na błędy gateway:

- auth → `PROVIDER_AUTH_FAILED`
- 429 → `PROVIDER_RATE_LIMITED`
- timeout → `PROVIDER_TIMEOUT`
- 5xx → `PROVIDER_UNAVAILABLE`

F-5. Adapter nie loguje sekretów.

## Wymagania niefunkcjonalne

NFR-1. Adaptery nie mogą “przeciekać” typami SDK do warstwy HTTP (kontrakt gateway jest własny).

NFR-2. W przypadku braku wsparcia funkcji (np. stream) adapter musi zgłosić błąd domenowy, a nie próbować “udawać” streamingu.

NFR-3. Adapter nie może zakładać, że rola `system` jest wspierana w `messages[]` providera.
Jeśli provider wymaga osobnego pola `system` (np. Anthropic) — adapter używa `system` z portu.
Jeśli provider wspiera `system` jako wiadomość — adapter mapuje `system` na format providera zgodnie ze swoją implementacją (np. jako pierwszą wiadomość).

## Kryteria akceptacji

- [ ] Dwa adaptery (Anthropic i Google Gemini) działają zgodnie z portem.
- [ ] Błędy 429/timeout są mapowane na te same `code`.
- [ ] Dodanie trzeciego adaptera (np. OpenAI) nie wymaga zmian w kontrolerach.

## Poza zakresem (MVP)

- Zaawansowany routing (fallback, hedging, multi-provider).
- Automatyczne wykrywanie dostępnych modeli po API providerów.

