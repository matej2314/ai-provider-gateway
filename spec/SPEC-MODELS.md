---
wersja: 2
data_utworzenia: 2026-08-26
data_modyfikacji: 2026-08-26
---

# SPEC — Katalog modeli (natywny) — `GET /models`

## Cel / problem

Udostępnić klientom natywnego API listę **dozwolonych aliasów** z `gateway.config.yaml`, bez wywołania LLM i bez formatu vendora.

Źródło danych: ten sam katalog runtime co fasady (`GatewayModelsCatalogService`). Kontrakt HTTP jest **własny** (`GatewayModelDto`), nie OpenAI/Anthropic. Auth i kody błędów: `SPEC-PLATFORMA-I-KONTRAKTY.md`.

Szczegóły HTTP: `docs/pl/lista_endpointów.md` / `docs/endpoints.md`, `docs/pl/dokumentacja_api.md` / `docs/api-documentation.md`.

## Użytkownicy i scenariusze

### Scenariusz A — klient native odkrywa aliasy

1. Klient wysyła `GET /api/v1/models` z `X-Gateway-Key`.
2. Gateway zwraca tablicę aktywnych aliasów (po filtrze `enabled` z konfiguracji efektywnej).
3. Klient używa `modelAlias` w `POST /chat`.

### Scenariusz B — szczegóły jednego aliasu

1. Klient pyta `GET /api/v1/models/:modelAlias`.
2. Znany alias → `200` i jeden obiekt katalogu.
3. Nieznany alias → `404` + `MODEL_ALIAS_NOT_FOUND` (**bez** wywołania providera).

## Wymagania funkcjonalne

F-1. `GET /api/v1/models` zwraca `200` i JSON `{ models: GatewayModelDto[] }`. Lista pochodzi z efektywnej sekcji `models` YAML (instancje / modele wyłączone nie wchodzą do runtime).

F-2. Każdy element listy zawiera co najmniej:

- `modelAlias` — publiczny alias,
- `providerInstance` — klucz instancji z YAML,
- `providerType` — `providers[].type` (lub `'gateway'`, gdy wiersz instancji nie istnieje — stan zdegradowany),
- `modelId` — ID modelu u vendora (informacyjne; **nie** jest polem wyboru w native API).

Opcjonalnie: `capabilities` (`streaming`, `tools`, `thinking`), `fallback` (alias zapasowy).

F-3. `GET /api/v1/models/:modelAlias` zwraca `200` i pojedynczy `GatewayModelDto` albo `404` z envelope `code=MODEL_ALIAS_NOT_FOUND`.

Zmiana względem `SPEC-CHAT.md` F-6: ten sam kod błędu, **inny** status HTTP (katalog 404, czat 400) — `SPEC-PLATFORMA-I-KONTRAKTY.md` F-6.

F-4. Obie trasy wymagają `X-Gateway-Key` i podlegają smart rate limitowi (`@GatewayKeyAndSmartRateLimit()`). Brak klucza → `401` `GATEWAY_KEY_MISSING`; zły klucz → `403` `GATEWAY_KEY_INVALID`; pusta allowlista → `500` `GATEWAY_KEY_NOT_CONFIGURED` (`SPEC-PLATFORMA-I-KONTRAKTY.md` F-14). RPS/burst — F-16 tamże (GET nie zlicza slotu streamów).

F-5. Katalog **nie** wywołuje adapterów LLM i **nie** odkrywa modeli po API vendora. Allowlista YAML jest jedynym źródłem.

F-6. Nagłówek odpowiedzi `x-request-id` jak na pozostałych trasach natywnych (`RequestIdMiddleware`).

## Wymagania niefunkcjonalne

NFR-1. Odpowiedź nie ujawnia sekretów (`apiKeyRef`, wartości env, pełnego pliku YAML).

NFR-2. Odczyt katalogu jest tani (pamięć konfiguracji procesu, bez I/O do providera).

## Kryteria akceptacji

- [x] `GET /api/v1/models` z poprawnym kluczem → `200` i lista aliasów w formacie gateway (`native-models.e2e-spec.ts`).
- [x] Brak / zły `X-Gateway-Key` → `401` / `403` z `ErrorEnvelope`; pusta allowlista → `500` `GATEWAY_KEY_NOT_CONFIGURED`.
- [x] Nieznany `:modelAlias` → `404` `MODEL_ALIAS_NOT_FOUND`.
- [x] Znany alias → te same pola tożsamości (`modelAlias`, `providerInstance`, `providerType`, `modelId`) co w konfiguracji efektywnej.

## Poza zakresem

- Format katalogu OpenAI / Anthropic — `SPEC-FASADY.md`.
- Hot reload YAML bez restartu — `SPEC-KONFIGURACJA.md`.
- Automatyczne pobieranie listy modeli z API vendora.
