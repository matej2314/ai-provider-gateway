# AI Provider Gateway (NestJS)

Gateway HTTP dla LLM, który **ukrywa SDK providerów** i wystawia spójny kontrakt do:

- standardowego czatu (`POST /api/v1/chat`),
- streamingu SSE (`POST /api/v1/chat/stream`),
- healthchecka (`GET /api/v1/health`).

Aktualnie wspierani providerzy (MVP):

- **Anthropic** (`@anthropic-ai/sdk`)
- **Google Gemini** (`@google/genai`)

## Dokumentacja

Wejście od strony dokumentów: `docs/README.md`.

Najważniejsze pliki:

- `docs/dokumentacja_koncepcyjna.md` — WHAT/WHY, zakres MVP
- `docs/architektura.md` — moduły, warstwy, integracje providerów
- `docs/architektura_api.md` — konwencje API, requestId, streaming
- `docs/lista_endpointów.md` — szybka lista endpointów
- `docs/dokumentacja_api.md` — kontrakt request/response + przykłady
- `docs/konfiguracja.md` — env + “plug&play” konfiguracja
- `docs/spec/` — specyfikacje (SDD), np. `SPEC-CHAT.md`, `SPEC-PROVIDERS.md`

## Szybki start (lokalnie)

Wymagania: Node.js + npm.

1) Instalacja zależności:

```bash
npm install
```

2) Konfiguracja env:

```bash
copy .env.example .env
```

**Ważne:** przy starcie wymagany jest **co najmniej jeden** niepusty klucz (po `trim()`):
`ANTHROPIC_API_KEY` albo `GOOGLE_API_KEY`.

3) Uruchomienie (dev):

```bash
npm run start:dev
```

Serwis nasłuchuje domyślnie na `http://localhost:3000`, a API ma prefiks `/api/v1` (patrz `src/main.ts`).

## Endpointy

### Health

```bash
curl http://localhost:3000/api/v1/health
```

### Chat (standard)

```bash
curl -X POST "http://localhost:3000/api/v1/chat" ^
  -H "content-type: application/json" ^
  -d "{\"modelAlias\":\"chat-default\",\"messages\":[{\"role\":\"user\",\"content\":\"Napisz krótkie streszczenie.\"}],\"params\":{\"temperature\":0.7,\"maxOutputTokens\":256}}"
```

### Chat (streaming SSE)

```bash
curl -N -X POST "http://localhost:3000/api/v1/chat/stream" ^
  -H "content-type: application/json" ^
  -d "{\"modelAlias\":\"chat-default\",\"messages\":[{\"role\":\"user\",\"content\":\"Napisz to w 3 punktach.\"}]}"
```

Szczegóły kontraktów i przykładowe payloady: `docs/dokumentacja_api.md`.

## Normalizacja `system`

HTTP może przyjąć `messages[]` z rolą `system|user|assistant`, ale przed wywołaniem adaptera gateway normalizuje wejście do portu providerów:

- `system?: string` — agregacja wszystkich wiadomości systemowych,
- `messages[]` — wyłącznie `user|assistant`.

Powód i mapowania SDK: `docs/architektura.md` + `docs/spec/SPEC-PROVIDERS.md`.

## Skrypty

```bash
# dev
npm run start:dev

# build
npm run build

# prod (po build)
npm run start:prod

# testy
npm test
```

## Struktura repo

Opis katalogów i plików: `docs/architektura-katalogi-pliki.md`.
