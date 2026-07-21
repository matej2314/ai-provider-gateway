import { readFileSync } from 'fs';

export function readRequiredPrompt(label: string, absPath: string): string {
  let raw: string;

  try {
    raw = readFileSync(absPath, 'utf-8');
  } catch (e: unknown) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      throw new Error(`[SystemPrompts] ${label} missing: ${absPath}`);
    }
    throw e;
  }
  const trimmed = raw.trim();
  if (!trimmed.length) {
    throw new Error(`[SystemPrompts] ${label} empty after trim: ${absPath}`);
  }
  return trimmed;
}

export function stripHtmlComments(raw: string): string {
  return raw.replace(/<!--[\s\S]*?-->/g, '').trim();
}

export function tryReadOptionalPrompts(absPath: string): string | undefined {
  try {
    const raw = stripHtmlComments(readFileSync(absPath, 'utf-8'));
    return raw.length ? raw : undefined;
  } catch (e: unknown) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return undefined;
    }
    throw e;
  }
}
