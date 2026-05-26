export function normalizeOpenAiContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .filter(
        (item) =>
          item &&
          typeof item === 'object' &&
          'type' in item &&
          item.type === 'text' &&
          'text' in item &&
          typeof item.text === 'string',
      )
      .map((item) => item.text)
      .join('\n');
  }
  return '';
}
