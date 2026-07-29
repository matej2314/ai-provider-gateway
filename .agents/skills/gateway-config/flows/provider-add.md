# Flow: `provider:add`

Komenda: `provider:add`  
Schema: `ProviderAddAnswersSchema` w `src/cli/schemas/agent-answers.schema.ts`  
Protokół: [`../references/agent-protocol.md`](../references/agent-protocol.md)

## Zachowanie CLI

- Dodaje instancję providera **i** wymaga powiązanego modelu (`ensureModel`) — nie wołaj osobno `model:add` w tej samej sesji.
- Agent mode **wymaga** deferral sekretów (`deferSecret: true`); API key / base URL wpisuje człowiek do `.env`.
- Typowy wynik: `awaiting_secrets` (exit `2`).

## Wywiad

1. `type`: `anthropic` | `google` | `openai` | `openai-compatible`
2. `id` instancji — domyślnie `{type}-primary` tylko jeśli wolne; inaczej np. `openai-backup`
3. `enabled` — domyślnie `true` (opcjonalne w JSON)
4. Model obowiązkowy: `ensureModel.alias` + `ensureModel.modelId`

Podpowiedzi `modelId` (jak w setup):

- anthropic: `claude-sonnet-4-5-20250929`, `claude-sonnet-4-6`
- google: `gemini-2.5-flash`, `gemini-2.5-pro`
- openai: `gpt-4o`, `o3-mini`
- openai-compatible: `llama3.2`, `deepseek-chat`

Dla `openai` / `openai-compatible` w `.env` będzie też `*_BASE_URL`.

## Przykład answers

```json
{
  "schemaVersion": 1,
  "id": "openai-primary",
  "type": "openai",
  "enabled": true,
  "deferSecret": true,
  "ensureModel": {
    "alias": "chat-openai",
    "modelId": "gpt-4o"
  }
}
```

## CLI

```bash
npm run cli -- provider:add --agent --answers .gateway-crud-answers.json --json
```

## Domknięcie

1. Przy `awaiting_secrets` → human-in-the-tool (`pendingSecrets`) → pętla `config:secrets-status`.
2. `config:validate` (+ `npm run config:validate`).
3. Opcjonalnie wspomnij `provider:test` jako następny krok użytkownika — **nie** uruchamiaj go automatycznie w v1.

## Sprzątanie

Usuń tymczasowy plik answers (`.gateway-crud-answers.json`) z dysku. Nie commituj answers ani `.env`.  
Koniec sesji skilla.
