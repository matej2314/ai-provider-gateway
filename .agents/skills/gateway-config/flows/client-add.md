# Flow: `client:add`

Komenda: `client:add`  
Schema: `ClientAddAnswersSchema` w `src/cli/schemas/agent-answers.schema.ts`  
Protokół: [`../references/agent-protocol.md`](../references/agent-protocol.md)

## Zachowanie CLI

- `generateKey` w answers **musi** być `true` — CLI generuje gateway key do `.env` (nie proś użytkownika o klucz w czacie).
- Raport może zawierać `generatedKeyRefs[]` (same nazwy refów) — możesz je wymienić; **nie** wypisuj wartości kluczy.
- Zwykle `success` bez `awaiting_secrets` (klucz generowany automatycznie).

## Wywiad

1. `id` (unikalny)
2. `name` (display)
3. `type`: `webapp` | `ide` | `cli` | `service` | `backend` | `automation`
4. Opcjonalnie `rateLimit`: `rps`, `burst`, opcjonalnie `maxConcurrentStreams`

## Przykład answers

```json
{
  "schemaVersion": 1,
  "id": "mobile-app",
  "name": "Mobile app",
  "type": "webapp",
  "generateKey": true,
  "rateLimit": {
    "rps": 10,
    "burst": 20
  }
}
```

## CLI

```bash
npm run cli -- client:add --agent --answers .gateway-crud-answers.json --json
```

## Domknięcie

`config:validate` → poinformuj, że klucz jest w `.env` pod wygenerowanym refem.  
Nie odczytuj wartości klucza z `.env` do czatu.

## Sprzątanie

Usuń tymczasowy plik answers (`.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
Koniec sesji skilla.
