import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from '../../services/cli-config-loader.service';
import { EnvPatchService } from '../../services/env-patch.service';
import { collectPendingSecrets } from '../../agent/pending-secrets';
import {
  exitWithAgentReport,
  type AgentReport,
} from '../../agent/agent-report';
import { resolveCliMode } from '../../agent/resolve-cli-mode';
import { CliLogger } from '../../utils/cli-logger.util';

@Command({
  name: 'config:secrets-status',
  description:
    'List missing env secrets referenced by gateway.config.yaml (agent gate).',
})
export class ConfigSecretsStatusCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly envPatch: EnvPatchService,
  ) {
    super();
  }

  async run(_params: string[], options?: { json?: boolean }): Promise<void> {
    const mode = resolveCliMode({ json: options?.json });
    try {
      if (!this.cliLoader.configExists()) {
        const report: AgentReport = {
          ok: false,
          status: 'error',
          command: 'config:secrets-status',
          errors: ['Configuration file not found.'],
          next: ['gateway config:init'],
        };
        exitWithAgentReport(report, mode.json);
      }
      if (this.cliLoader.isBoilerplateConfig()) {
        const report: AgentReport = {
          ok: false,
          status: 'error',
          command: 'config:secrets-status',
          errors: ['Boilerplate configuration detected.'],
          next: ['gateway config:init'],
        };
        exitWithAgentReport(report, mode.json);
      }

      const config = this.cliLoader.loadRawConfig();
      const cwd = process.cwd();
      const pending = await collectPendingSecrets(config, cwd, this.envPatch, {
        includeMasterKey: true,
        includeClientKeys: true,
        includeOperatorEnv: true,
      });

      // ok:true + awaiting_secrets = gate check succeeded; human must fill .env (exit 2)
      const report: AgentReport = {
        ok: true,
        status: pending.length === 0 ? 'success' : 'awaiting_secrets',
        command: 'config:secrets-status',
        pendingSecrets: pending.length ? pending : undefined,
        next:
          pending.length === 0
            ? ['gateway config:validate', 'gateway provider:test']
            : [
                'HUMAN HANDOFF: paste operator values into .env for each pendingSecrets[].envRef (API keys, base URLs, Sentry DSN, Redis password as listed). Do NOT paste values into chat.',
                'After the user confirms locally: gateway config:secrets-status --json',
              ],
      };

      if (!mode.json) {
        if (pending.length === 0) {
          CliLogger.success('All referenced secrets are present in .env');
        } else {
          CliLogger.warning(`Missing ${pending.length} secret(s):`);
          for (const p of pending) {
            CliLogger.dim(`  - ${p.envRef} (${p.reason})`);
          }
        }
      }

      exitWithAgentReport(report, mode.json);
    } catch (error) {
      exitWithAgentReport(
        {
          ok: false,
          status: 'error',
          command: 'config:secrets-status',
          errors: [error instanceof Error ? error.message : String(error)],
        },
        mode.json,
      );
    }
  }

  @Option({ flags: '--json', description: 'Machine-readable JSON on stdout' })
  parseJson(): boolean {
    return true;
  }
}
