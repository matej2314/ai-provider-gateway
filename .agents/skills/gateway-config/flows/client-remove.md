# Flow: `client:remove`

Komenda: `client:remove`  
Schema: `ClientRemoveAnswersSchema` w `src/cli/schemas/agent-answers.schema.ts`  
Protokół: [`../references/agent-protocol.md`](../references/agent-protocol.md)

## Zachowanie CLI

- Destrukcyjne — `confirm: true` tylko po jawnej zgodzie użytkownika.
- Zwykle bez `awaiting_secrets`.

## Wywiad

1. `id` klienta do usunięcia.
2. Jawne potwierdzenie → `confirm: true`.

## Przykład answers

```json
{
  "schemaVersion": 1,
  "id": "mobile-app",
  "confirm": true
}
```

## CLI

```bash
npm run cli -- client:remove --agent --answers .gateway-crud-answers.json --json
```

## Domknięcie

`config:validate`.

## Sprzątanie

Usuń tymczasowy plik answers (`.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
Koniec sesji skilla.
