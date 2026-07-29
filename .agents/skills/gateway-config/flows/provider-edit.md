# Flow: `provider:edit`

Komenda: `provider:edit`  
Schema: `ProviderEditAnswersSchema` w `src/cli/schemas/agent-answers.schema.ts`  
Protokół: [`../references/agent-protocol.md`](../references/agent-protocol.md)

## Zachowanie CLI

Wymaga w answers **co najmniej jednego** z:

- `enabled` (boolean) — włącz/wyłącz instancję
- `rotateSecret: true` — czyści wartość API key w `.env` (user wkleja nowy); typowo → `awaiting_secrets`

Opcjonalnie `confirmNonBootable: true`, gdy wyłączenie / zmiana grozi konfiguracją niebootowalną — tylko po świadomej zgodzie użytkownika.

## Wywiad

1. `id` istniejącej instancji (discovery: `provider:list --json`).
2. Co zmienić: enabled, rotacja klucza, czy oba.
3. Jeśli disable może złamać bootowalność — wyjaśnij i zbierz zgodę na `confirmNonBootable`.

## Przykład answers

Włączenie:

```json
{
  "schemaVersion": 1,
  "id": "anthropic-primary",
  "enabled": true
}
```

Rotacja sekretu:

```json
{
  "schemaVersion": 1,
  "id": "anthropic-primary",
  "rotateSecret": true
}
```

Wyłączenie z potwierdzeniem non-bootable:

```json
{
  "schemaVersion": 1,
  "id": "anthropic-primary",
  "enabled": false,
  "confirmNonBootable": true
}
```

## CLI

```bash
npm run cli -- provider:edit --agent --answers .gateway-crud-answers.json --json
```

## Domknięcie

- `rotateSecret` → często handoff `.env` → `secrets-status` → validate.
- Samo `enabled` → zwykle od razu validate.

## Sprzątanie

Usuń tymczasowy plik answers (`.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
Koniec sesji skilla.
