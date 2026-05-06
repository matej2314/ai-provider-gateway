# AI Provider Gateway

## Opis koncepcyjny

> Ten dokument został zastąpiony przez `docs/dokumentacja_koncepcyjna.md` (bardziej spójny układ i kompatybilność ze strukturą dokumentacji z `notesapp_nest_backend`).
>
> Zachowano go jako “alias” historyczny. Źródło prawdy: `docs/dokumentacja_koncepcyjna.md`.

AI Provider Gateway to backendowe API pełniące rolę warstwy pośredniej (gateway / orchestrator) pomiędzy aplikacjami klienckimi a różnymi dostawcami modeli LLM (Large Language Models).  
Projekt abstrahuje integrację z konkretnymi providerami AI i udostępnia jednolity, spójny interfejs API do komunikacji z wybranym modelem.

Aplikacja została zaprojektowana jako projekt skoncentrowany na architekturze, separacji odpowiedzialności, testowalności oraz gotowości do dalszego rozwoju.

---

## Główny cel projektu

Celem projektu jest:

- zaprojektowanie **skalowalnej i rozszerzalnej architektury backendowej** z wykorzystaniem NestJS,
- **integracja z zewnętrznymi API jako abstrakcja**,
- wykorzystanie wzorców takich jak:
  - Gateway / Adapter
  - Strategy
  - Dependency Injection
- stworzenie solidnej bazy pod system, który w przyszłości może obsługiwać:
  - wielu providerów,
  - różne modele,
  - różne polityki kosztowe i limity.

A także stać się pełnoprawnym mikroserwisem większego systemu.

---

## Główne założenia

### 1. Jednolity interfejs API

- Klient komunikuje się z jednym endpointem niezależnie od wybranego providera.
- Zmiana modelu lub dostawcy nie wymaga zmian po stronie klienta.

### 2. Abstrakcja providerów AI

- Każdy provider (np. Anthropic, Google Gemini, lokalne modele) jest zaimplementowany jako osobna instancja adaptera.
- Logika biznesowa nie zna szczegółów implementacyjnych zewnętrznych API.

### 3. Konfigurowalność

- Wybór providera i modelu odbywa się:
  - przez konfigurację środowiskową,
  - lub parametry żądania.
- Klucze API są zarządzane wyłącznie po stronie serwera (użytkownik przed uruchomieniem serwisu zobowiązany jest do uzupełnienia zmiennych środowiskowych).

### 4. Architektura modułowa

- Wyraźny podział na:
  - warstwę API (controllers),
  - warstwę aplikacyjną (services / use cases),
  - warstwę integracyjną (providers / adapters).
- Każdy moduł ma jasno określoną odpowiedzialność.

### 5. Testowalność

- Logika domenowa jest testowalna bez realnych wywołań zewnętrznych API.
- Providerzy mogą być mockowani w testach jednostkowych.

---

## Zakres funkcjonalny (MVP)

- endpoint do wysyłania promptu do wybranego modelu,
- obsługa dwóch providerów AI,
- mechanizm wyboru providera,
- spójny format odpowiedzi niezależny od źródła,
- obsługa błędów i timeoutów,
- podstawowe testy jednostkowe.

---

## Poza zakresem (na tym etapie)

- autoryzacja użytkowników,
- rozliczenia i billing,
- przechowywanie historii konwersacji,
- deployment produkcyjny.

---

## Wartość projektowa

Projekt demonstruje:

- świadome podejście do architektury backendu,
- umiejętność projektowania systemów integrujących wiele zewnętrznych usług,
- znajomość NestJS poza poziomem CRUD,
- myślenie systemowe.

---

## Zobacz też

- `dokumentacja_koncepcyjna.md`
- `architektura.md`
- `dokumentacja_api.md`
