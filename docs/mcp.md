# MCP (Model Context Protocol) — AI Provider Gateway

Ten dokument opisuje, jak gateway ma traktować konfigurację MCP w kontekście LLM providerów.

## Cel

Użytkownik może skonfigurować, jakie serwery MCP są dostępne dla modelu (np. przez plik `mcp.json`), bez zmiany kodu gateway.

## Założenie odpowiedzialności gateway (rdzeń MVP)

Na start gateway:

- **nie uruchamia** serwerów MCP i nie wykonuje narzędzi jako “tool runner”,
- może **przechowywać / walidować / przekazywać** konfigurację MCP do wywołań providerów, jeśli dany provider/SDK wspiera taki mechanizm,
- utrzymuje granicę bezpieczeństwa: brak możliwości wstrzyknięcia dowolnych endpointów HTTP przez MCP config.

## Konfiguracja (kierunek)

Rekomendacja:

- trzymać `mcp.json` jako plik dostarczony przez użytkownika (w repo użytkownika/infrastrukturze),
- w configu gateway wskazać ścieżkę do `mcp.json` lub profil MCP per `modelAlias`.

Przykładowy wpis (koncepcyjnie):

```yaml
models:
  chat-default:
    mcp:
      configPath: ./mcp.json
```

## Walidacja i bezpieczeństwo

Gateway powinien:

- walidować schema `mcp.json` (format, wymagane pola),
- odrzucać konfiguracje, które wskazują na niebezpieczne targety (np. `localhost`, prywatne IP) jeśli gateway miałby je wykonywać (to dotyczy dopiero wariantu “tool runner”),
- redagować logi, aby nie ujawniać tokenów/nagłówków.

## Kierunek po rdzeniu MVP (v1+): “tool runner”

Jeśli gateway ma w przyszłości wykonywać narzędzia:

- to jest osobny bounded area (izolacja, sandbox, sieć, uprawnienia),
- wymaga jawnego modelu zagrożeń i ograniczeń (allowlisty, timeouts, limity),
- wymaga testów bezpieczeństwa (SSRF, exfiltracja).

## Klucze API a MCP

Uruchomienie gateway zakłada m.in. poprawny **`gateway.config.yaml`** oraz — w **production** — spełnienie reguły **minimum jednego** niepustego klucza spośród `ANTHROPIC_API_KEY` i `GOOGLE_API_KEY` (`src/config/env.validation.ts`, `konfiguracja.md`). Opcjonalnie zmienne **`CACHE_*`** / **`REDIS_*`** — ten sam dokument.

## Stan kodu

Plik `mcp.json` w katalogu głównym repo służy integracji IDE — **nie** jest wczytywany przez gateway przy starcie (poza zakresem rdzenia MVP).

## Powiązane dokumenty

- Konfiguracja ogólna: `konfiguracja.md`
- Anty‑patterny: `anty-patterny.md`

