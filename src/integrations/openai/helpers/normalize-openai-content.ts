type TextContentItem = { type: 'text'; text: string };

function isTextContentItem(item: unknown): item is TextContentItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    item.type === 'text' &&
    'text' in item &&
    typeof item.text === 'string'
  );
}

export function normalizeOpenAiContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .filter(isTextContentItem)
      .map((item) => item.text)
      .join('\n');
  }
  return '';
}
