<!--
  MAIN_SYSTEM_PROMPT.md — warstwa MAIN składanego system promptu gatewaya.

  Cel pliku:
  Trzymać opcjonalne instrukcje wdrożeniowe (np. styl odpowiedzi, format wyjścia,
  zachowanie produktowe) — server-side, w repo — bez możliwości nadpisania przez klienta API.

  Kontekst architektury (patrz `docs/pl/architektura.md`, `docs/pl/konfiguracja.md`):
  - System prompt to polityka gatewaya, nie dane z requestu HTTP.
  - Składanie: system = MASTER + "\n\n" + MAIN? + "\n\n" + PER_MODEL?
  - MASTER (MASTER_SYSTEM_PROMPT.md) — obowiązkowe guardrails bezpieczeństwa.
  - MAIN (ten plik) — opcjonalna warstwa „twojego” gatewaya (np. ton, format).
  - PER-MODEL — opcjonalnie z src/config/system-prompt/models/<modelAlias>.md.

  Ładowanie:
  - Przy starcie aplikacji configuration wczytuje ten plik; jeśli brak pliku lub treść
    pusta po trim(), warstwa MAIN jest pomijana (start bez błędu).

  Treść promptu wpisz poniżej tego bloku (poza komentarzem HTML); sama dokumentacja
  w komentarzu nie jest wysyłana do modelu.
-->
