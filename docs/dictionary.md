# Słownik (dictionary) — AI Provider Gateway

Ten dokument utrwala wspólny język między użytkownikami projektu, integratorami i implementacją. Nazwy pól w JSON są techniczne; opisy są po polsku.

## Podstawowe pojęcia

| Termin | Definicja | Uwagi |
|--------|-----------|------|
| **Gateway / Proxy** | Warstwa pośrednia unifikująca integrację z LLM providerami. | Nie jest “open proxy” do dowolnych URL. |
| **Provider** | Konkretny dostawca LLM (OpenAI, Anthropic, Google). | Implementowany jako adapter. |
| **Adapter** | Implementacja kontraktu gateway dla danego providera. | Ukrywa SDK i szczegóły request/response. |
| **Model ID** | Vendorowa nazwa modelu (np. `gpt-*`, `claude-*`). | Trafia do requestów providera. |
| **Model alias** | Nazwa używana w gateway (np. `chat-default`). | Mapowana do provider+modelId+policy. |
| **Standard** | Tryb odpowiedzi: pełna odpowiedź JSON. | `POST /chat`. |
| **Streaming** | Tryb odpowiedzi: SSE. | `POST /chat/stream`. |
| **Request ID** | Identyfikator korelacyjny żądania. | W logach i w error envelope. |
| **Policy** | Zestaw limitów i zasad (timeout, retry, allowlista parametrów). | Konfigurowalne per alias / per provider. |

## Kody błędów (stabilne)

Kody są częścią kontraktu API. Klient powinien opierać logikę na `code`, a nie na `message`.

| Code | Znaczenie |
|------|-----------|
| `VALIDATION_FAILED` | Body requestu lub parametry nie przeszły walidacji. |
| `MODEL_ALIAS_NOT_FOUND` | Podany `modelAlias` nie istnieje w konfiguracji gateway. |
| `MODEL_NOT_ALLOWED` | Model lub tryb (np. streaming) nie jest dozwolony przez policy. |
| `PROVIDER_UNSUPPORTED` | Provider wskazany w konfiguracji nie ma adaptera w kodzie. |
| `PROVIDER_AUTH_FAILED` | Błąd uwierzytelnienia do providera (np. zły klucz). |
| `PROVIDER_RATE_LIMITED` | Provider zwrócił limit (429) lub gateway nałożył limit lokalny. |
| `PROVIDER_TIMEOUT` | Przekroczono timeout dla wywołania providera. |
| `PROVIDER_UNAVAILABLE` | Provider zwrócił błąd 5xx lub jest niedostępny. |
| `STREAMING_NOT_SUPPORTED` | Wybrany model/provider nie wspiera streamingu. |

## Kody HTTP (mapowanie)

| HTTP | Przykładowe `code` |
|------|---------------------|
| 400 | `VALIDATION_FAILED`, `MODEL_ALIAS_NOT_FOUND`, `MODEL_NOT_ALLOWED` |
| 401 | `PROVIDER_AUTH_FAILED` *(jeśli mapujesz 401 od providera jako 502/401 zależnie od polityki)* |
| 429 | `PROVIDER_RATE_LIMITED` |
| 502 | `PROVIDER_UNAVAILABLE` |
| 504 | `PROVIDER_TIMEOUT` |

Powiązane: `architektura_api.md`, `dokumentacja_api.md`, `anty-patterny.md`.

