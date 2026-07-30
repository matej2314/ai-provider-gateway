# Flow: `client:edit`

Komenda: `client:edit`  
Schema: `ClientEditAnswersSchema` w `src/cli/schemas/agent-answers.schema.ts`  
Protokół: [`../references/agent-protocol.md`](../references/agent-protocol.md)

## Zachowanie CLI

Wymaga `id` oraz `action` — **jedna** akcja na wywołanie:

| `action` | Wymagane pole | Uwagi |
|----------|---------------|--------|
| `name` | `name` | nowa nazwa |
| `type` | `type` | `webapp` \| `ide` \| `cli` \| `service` \| `backend` \| `automation` |
| `rateLimit` | `rateLimit` | obiekt `{ rps, burst, maxConcurrentStreams? }` **lub** `null` (wyczyść limit) |
| `rotateKey` | (brak extra) | CLI generuje nowy klucz do `.env`; nie proś o wklejenie |

Zwykle `success`; przy `rotateKey` patrz `generatedKeyRefs[]` — bez wartości w czacie.

## Wywiad

1. `id` klienta (`client:list --json`).
2. Która `action` — jeśli użytkownik chce kilka zmian (np. name + rateLimit), w v1 wykonaj **jedną**; resztę na kolejną sesję (preferuj tę, którą wskazał jako główną / potwierdź wybór).

## Przykład answers

```json
{
  "schemaVersion": 1,
  "id": "webapp",
  "action": "name",
  "name": "Main web app"
}
```

```json
{
  "schemaVersion": 1,
  "id": "webapp",
  "action": "rateLimit",
  "rateLimit": {
    "rps": 5,
    "burst": 15,
    "maxConcurrentStreams": 3
  }
}
```

```json
{
  "schemaVersion": 1,
  "id": "webapp",
  "action": "rateLimit",
  "rateLimit": null
}
```

```json
{
  "schemaVersion": 1,
  "id": "webapp",
  "action": "rotateKey"
}
```

## CLI

```bash
npm run cli -- client:edit --agent --answers .gateway-crud-answers.json --json
```

## Domknięcie

`config:validate`.

## Sprzątanie

Usuń tymczasowy plik answers (`.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
Koniec sesji skilla.
