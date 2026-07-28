import { resolveCliMode, type CliMode } from './resolve-cli-mode';

/**
 * Runtime assert — refuses inquirer when GATEWAY_CLI_AGENT=1 or mode.isAgent.
 * Main protection: agent command paths never call prompt*; this is a safety net.
 */
export function assertInteractiveAllowed(
  context: string,
  mode: CliMode = resolveCliMode({}),
): void {
  if (mode.isAgent || process.env.GATEWAY_CLI_AGENT === '1') {
    throw new Error(
      `[AGENT] Refusing interactive prompt in agent mode (${context}). Use --answers instead.`,
    );
  }
}
