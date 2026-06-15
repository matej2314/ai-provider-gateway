# Uzupełnienia do docs/dictionary.md - thinking mode

## Do dodania w sekcji "### Mapowanie parametrów na providerów" (tabela po linii 54)

Po wierszu z `topK` dodaj:

```markdown
|| `thinkingEnabled` | `thinking` (Anthropic) / `thinkingConfig` (Google) | ✅ `thinking: {type, budget_tokens?, display}` | ✅ `thinkingConfig: {includeThoughts}` (Gemini 3.0+ ONLY) | ⚠️ fasada przyjmuje `reasoning_effort`, ale **nie działa** (wymaga `/v1/responses` API) |
|| `thinkingBudget` | token budget / effort level / thinkingLevel | ✅ number → `thinking.budget_tokens`; string → `output_config.effort` | ✅ number → `thinkingBudget`; string → `thinkingLevel` | ⚠️ j.w. |
```

## Do dodania w sekcji "### Słownik pól" (po linii 72 - po responseFormat)

```markdown
|| **thinkingEnabled** | Włącza extended thinking/reasoning mode dla reasoning-capable models (boolean). | Pole w `ChatParamsDto` i `ProviderCallOptions`; może pochodzić z body lub YAML `defaults`. **Anthropic Claude Opus/Sonnet 4.5+** → `thinking: { type: 'enabled' | 'adaptive', budget_tokens?, display }`. **Google Gemini 3.0+** → `thinkingConfig: { includeThoughts: true }`. **OpenAI**: nieobsługiwane (wymaga `/v1/responses` API). Wymaga `capabilities.thinking: true` i wpisu w `allowOverrides`. **Koszty:** 2-10x więcej tokenów. |
|| **thinkingBudget** | Budżet/intensywność thinking: string (`"none"` \| `"minimal"` \| `"low"` \| `"medium"` \| `"high"` \| `"xhigh"` \| `"max"`) lub integer (min 1024). | Override tylko z body (brak merge z YAML `defaults`). **Anthropic**: number → `thinking.budget_tokens`; string → `output_config.effort`. **Google Gemini 3.0+**: number → `thinkingConfig.thinkingBudget`; string → `thinkingConfig.thinkingLevel`. **OpenAI**: nieobsługiwane. **Cross-validation:** gdy number, wymagane `maxOutputTokens >= thinkingBudget + 512`. Wymaga wpisu w `allowOverrides`. |
```

## Uwaga

Plik `dictionary.md` został już częściowo zaktualizowany:
- ✅ Linia 58: Zaktualizowano listę pól w `defaults` (dodano `thinkingEnabled`) oraz listę pól tylko z body (dodano `thinkingBudget`)

Pozostaje ręcznie dodać dwa wpisy do tabel powyżej.
