# Flow: `model:edit`

Komenda: `model:edit`  
Schema: `ModelEditAnswersSchema` w `src/cli/schemas/agent-answers.schema.ts`  
Protokół: [`../references/agent-protocol.md`](../references/agent-protocol.md)

## Zachowanie CLI

Wymaga `alias` oraz **co najmniej jednego** z: `modelId`, `providerInstance`, `fallback`, `streaming`, `policy`.

- `fallback`: string (alias innego modelu) **lub** `null` (wyczyść fallback).
- `confirmNonBootable: true` — gdy zmiana grozi niebootowalnością; tylko po świadomej zgodzie.
- Zwykle bez `awaiting_secrets`.

## Wywiad

1. `alias` istniejącego modelu (`model:list --json`).
2. Które pola zmienić — zbierz tylko te.
3. Przy ryzyku bootowalności — zgoda na `confirmNonBootable`.

## Przykład answers

```json
{
  "schemaVersion": 1,
  "alias": "chat-default",
  "modelId": "claude-sonnet-4-6",
  "streaming": true
}
```

Zmiana providera + policy:

```json
{
  "schemaVersion": 1,
  "alias": "chat-default",
  "providerInstance": "openai-primary",
  "policy": {
    "timeoutMs": 60000,
    "maxAttempts": 2,
    "maxOutputTokens": 4096,
    "temperature": 0.2
  },
  "confirmNonBootable": true
}
```

Wyczyszczenie fallbacku:

```json
{
  "schemaVersion": 1,
  "alias": "chat-default",
  "fallback": null
}
```

## CLI

```bash
npm run cli -- model:edit --agent --answers .gateway-crud-answers.json --json
```

## Domknięcie

`config:validate`.

## Sprzątanie

Usuń tymczasowy plik answers (`.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
Koniec sesji skilla.
