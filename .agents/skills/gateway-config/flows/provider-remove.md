# Flow: `provider:remove`

Komenda: `provider:remove`  
Schema: `ProviderRemoveAnswersSchema` w `src/cli/schemas/agent-answers.schema.ts`  
Protokół: [`../references/agent-protocol.md`](../references/agent-protocol.md)

## Zachowanie CLI

- Destrukcyjne — wymagane `confirm: true` **po jawnej zgodzie** użytkownika.
- Modele powiązane z instancją mogą zostać usunięte / zablokować operację zgodnie z logiką `ProviderManagerService` — przy błędzie pokaż `errors[]` i nie omijaj walidacji.
- Zwykle bez `awaiting_secrets`.

## Wywiad

1. `id` instancji do usunięcia (potwierdź przez list).
2. Jawne potwierdzenie użytkownika („tak, usuń”) → dopiero wtedy `confirm: true`.

## Przykład answers

```json
{
  "schemaVersion": 1,
  "id": "openai-backup",
  "confirm": true
}
```

## CLI

```bash
npm run cli -- provider:remove --agent --answers .gateway-crud-answers.json --json
```

## Domknięcie

`config:validate` → podsumowanie.

## Sprzątanie

Usuń tymczasowy plik answers (`.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
Koniec sesji skilla.
