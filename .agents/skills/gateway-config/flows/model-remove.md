# Flow: `model:remove`

Komenda: `model:remove`  
Schema: `ModelRemoveAnswersSchema` w `src/cli/schemas/agent-answers.schema.ts`  
Protokół: [`../references/agent-protocol.md`](../references/agent-protocol.md)

## Zachowanie CLI

- Destrukcyjne — `confirm: true` tylko po jawnej zgodzie użytkownika.
- Usunięcie ostatniego modelu / naruszenie reguł bootowalności może zakończyć się `error` — pokaż `errors[]`.
- Zwykle bez `awaiting_secrets`.

## Wywiad

1. `alias` do usunięcia.
2. Jawne potwierdzenie → `confirm: true`.

## Przykład answers

```json
{
  "schemaVersion": 1,
  "alias": "chat-fast",
  "confirm": true
}
```

## CLI

```bash
npm run cli -- model:remove --agent --answers .gateway-crud-answers.json --json
```

## Domknięcie

`config:validate`.

## Sprzątanie

Usuń tymczasowy plik answers (`.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
Koniec sesji skilla.
