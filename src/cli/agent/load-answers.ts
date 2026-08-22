import { readFileSync } from 'fs';
import type { ZodType } from 'zod';

export function loadAnswers<T>(schema: ZodType<T>, answersPath: string): T {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(answersPath, 'utf-8'));
  } catch (err) {
    throw new Error(
      `[AGENT] Failed to read answers file ${answersPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');
    throw new Error(`[AGENT] Invalid answers file:\n${details}`);
  }
  return parsed.data;
}
