export interface CliModeFlags {
  agent?: boolean;
  answers?: string;
  json?: boolean;
  deferSecrets?: boolean;
  force?: boolean;
  yes?: boolean;
}

export interface CliMode {
  isAgent: boolean;
  json: boolean;
  deferSecrets: boolean;
  force: boolean;
  answersPath?: string;
}

export function resolveCliMode(options: CliModeFlags = {}): CliMode {
  const isAgent = options.agent === true;

  return {
    isAgent,
    json: options.json === true,
    deferSecrets: isAgent
      ? options.deferSecrets !== false
      : options.deferSecrets === true,
    force: options.force === true || options.yes === true,
    answersPath: options.answers?.trim() || undefined,
  };
}

/**
 * Marks the process as agent-mode so prompt* guards refuse inquirer
 * (plan §5.5 — GATEWAY_CLI_AGENT=1).
 */
export function markAgentRuntime(mode: CliMode): void {
  if (mode.isAgent) {
    process.env.GATEWAY_CLI_AGENT = '1';
  }
}

export function assertAgentHasAnswers(mode: CliMode, command: string): void {
  if (mode.isAgent && !mode.answersPath) {
    throw new Error(
      `[AGENT] ${command} requires --answers <path> (or omit --agent for interactive mode).`,
    );
  }
}
