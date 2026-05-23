<!--
  models/chat-default.md — opcjonalna warstwa system promptu PER ALIAS.

  Cel pliku:
  - Dodać instrukcje specyficzne dla aliasu chat-default (np. styl, format odpowiedzi,
    ograniczenia domenowe), bez zmiany globalnej polityki w MASTER/MAIN.
  - Warstwa ta trafia do providera jako część pola system (nie w messages[] z API).

  Mapowanie:
  - Nazwa pliku = dokładnie klucz aliasu w gateway.config.yaml → models (tu: chat-default).
  - Wczytywany przy starcie aplikacji (src/config/configuration.ts).

  Składanie warstw w runtime (composeSystemPrompt):
  MASTER_SYSTEM_PROMPT.md → opcjonalnie MAIN_SYSTEM_PROMPT.md → opcjonalnie ten plik
  (sekcje łączone podwójną newline: \n\n).

  Konfiguracja aliasu chat-default (gateway.config.yaml):
  - providerInstance: anthropic
  - modelId: claude-sonnet-4-5-20250929

  Uwagi:
  - Komentarze HTML są usuwane przy ładowaniu (stripHtmlComments) — nie trafiają do modelu.
  - Gdy po usunięciu komentarzy plik jest pusty, warstwa per-model jest pomijana.
  - Dla innych aliasów: opcjonalnie models/nazwa-aliasu.md (np. claude-sonnet.md).

  Treść promptu dla chat-default dodaj w tym pliku poza blokiem komentarza.
-->
