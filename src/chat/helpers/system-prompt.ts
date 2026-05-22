import type { ResolvedSystemPrompts } from '../../config/configuration.types';

export const SYSTEM_PROMPT_SECTION_JOINER = '\n\n';

export function getResolvedSystemPrompts(
  getConfig: (
    key: 'resolvedSystemPrompts',
  ) => ResolvedSystemPrompts | undefined,
): ResolvedSystemPrompts {
  const resolved = getConfig('resolvedSystemPrompts');

  if (!resolved) {
    throw new Error('[Chat] resolvedSystemPrompts fot found in config');
  }
  return resolved;
}

export function composeSystemPrompt(
  resolved: ResolvedSystemPrompts,
  modelAlias: string,
): string {
  const parts: string[] = [resolved.master.trim()];
  if (resolved.main) parts.push(resolved.main.trim());

  const perModelPrompt = resolved.perModelByAlias[modelAlias];
  if (perModelPrompt) parts.push(perModelPrompt.trim());
  return parts.join(SYSTEM_PROMPT_SECTION_JOINER);
}
