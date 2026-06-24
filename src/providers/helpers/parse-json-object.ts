export function parseJsonObject(
  raw: string,
  fallback: Record<string, unknown> = {},
): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }

    return fallback;
  } catch {
    return fallback;
  }
}
