# Anty‑patterny / na co uważać — AI Provider Gateway

Ten plik zbiera typowe pułapki w projektach “LLM gateway”.

## 1) “Open proxy” przez nadmierną konfigurowalność

**Nie rób**:

- konfigurowalnych URL-i endpointów providerów,
- arbitralnych nagłówków i body z configu,
- “dowolnego HTTP request buildera” pod płaszczykiem integracji LLM.

**Dlaczego**: SSRF, exfiltracja, brak kontroli kosztów i bezpieczeństwa.

## 2) Sekrety w logach

**Nie rób**:

- logowania pełnych requestów do providerów (nagłówki, bearer tokeny),
- dumpowania configu/env w exception handlerach,
- zwracania surowych wyjątków SDK klientowi.

**Rób**:

- redakcję wrażliwych pól,
- requestId + logi strukturalne,
- minimalne komunikaty na zewnątrz, szczegóły tylko w logach.

## 3) Pozorna walidacja `modelId`

**Nie rób**: przyjmowania vendorowego `modelId` z request i “walidowania” go regexem.

**Rób**: allowlista przez konfigurację i/lub aliasy (`modelAlias`), walidacja fail‑fast na starcie.

## 4) Brak granic dla parametrów (`temperature`, `max_tokens`, …)

**Nie rób**: “przepuść wszystko, provider odrzuci”.

**Rób**:

- allowlista pól,
- bounds (min/max),
- domyślne wartości per alias,
- mapowanie parametrów per provider (różne nazwy i semantyka).

## 5) Mieszanie kontraktów providerów w API gateway

**Nie rób**:

- wystawiania 1:1 obiektów z SDK OpenAI/Anthropic w odpowiedzi gateway,
- wycieku “stop reasons” czy struktur, których nie da się ujednolicić.

**Rób**:

- własny kontrakt gateway (stabilny),
- opcjonalne pole debug `raw` tylko w trybie dev (i bez sekretów).

## 6) Streaming “jak leci”

**Nie rób**:

- założenia, że każdy provider streamuje identycznie,
- mieszania kilku formatów SSE w zależności od providera.

**Rób**:

- jeden format zdarzeń gateway (`meta`, `delta`, `done`),
- testy kontraktu streamingu,
- jasne zachowanie na błąd w trakcie strumienia.

## 7) Retry bez polityki i bez limitów

**Nie rób**: nieskończonych retry lub retry na błędy logiczne (400/401).

**Rób**:

- retry tylko na 429/5xx,
- maksymalna liczba prób,
- backoff,
- time budget.

## 8) “Framework first” w logice domenowej

**Nie rób**: logiki doboru modelu/parametrów w kontrolerach.

**Rób**:

- cienkie kontrolery,
- use-case w serwisach,
- adaptery jako jedyne miejsce kontaktu z SDK providerów.

## 9) Brak testów kontraktu

**Nie rób**: testów tylko “czy serwis się odpala”.

**Rób**:

- testy mapowania parametrów,
- testy wyboru `modelAlias`,
- testy normalizacji błędów,
- testy formatu SSE (co najmniej jednostkowe na eventy).

