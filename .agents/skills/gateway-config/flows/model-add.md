# Flow: `model:add`

Komenda: `model:add`  
Schema: `ModelAddAnswersSchema` w `src/cli/schemas/agent-answers.schema.ts`  
Protokół: [`../references/agent-protocol.md`](../references/agent-protocol.md)

## Zachowanie CLI

- Dodaje alias modelu wskazujący **istniejącą** instancję providera.
- Brak sekretów w answers; zwykle `success` bez handoffu `.env`.
- Nowy provider + pierwszy model → użyj `provider:add` (`ensureModel`), nie tego flow.

## Wywiad

1. `alias` (unikalny)
2. `providerInstance` — musi istnieć (`provider:list --json`)
3. `modelId` — ID u dostawcy

Podpowiedzi `modelId` wg typu providera docelowej instancji (jak w setup / `provider-add`).

## Przykład answers

```json
{
  "schemaVersion": 1,
  "alias": "chat-fast",
  "providerInstance": "anthropic-primary",
  "modelId": "claude-sonnet-4-5-20250929"
}
```

## CLI

```bash
npm run cli -- model:add --agent --answers .gateway-crud-answers.json --json
```

## Domknięcie

`config:validate`.

## Sprzątanie

Usuń tymczasowy plik answers (`.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
Koniec sesji skilla.
