import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ProviderManagerService } from 'src/cli/services/provider-manager.service';
import { asProviderInstanceId } from 'src/common/types';
import {
  assertAgentHasAnswers,
  markAgentRuntime,
  resolveCliMode,
  type CliModeFlags,
} from 'src/cli/agent/resolve-cli-mode';
import {
  exitWithAgentReport,
  type PendingSecretsItem,
} from 'src/cli/agent/agent-report';
import { loadAnswers } from 'src/cli/agent/load-answers';
import { ProviderEditAnswersSchema } from 'src/cli/schemas/agent-answers.schema';
import type { EditProviderInput } from 'src/cli/types/cli-apply.types';

@Command({
  name: 'provider:edit',
  description: 'Edit provider instance (enable/disable or rotate API key)',
  arguments: '[instanceId]',
})
export class ProviderEditCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly providerManager: ProviderManagerService,
  ) {
    super();
  }

  async run(passedParams: string[], options?: CliModeFlags): Promise<void> {
    const mode = resolveCliMode(options ?? {});
    markAgentRuntime(mode);
    CliLogger.setJsonSafe(mode.json || mode.isAgent);

    try {
      const rawInstanceId = passedParams[0]?.trim();

      if (!mode.isAgent && !rawInstanceId) {
        CliLogger.error('Provider instance ID is required.');
        CliLogger.info('Usage: gateway provider:edit <instanceId>');
        process.exit(1);
      }

      if (!this.cliLoader.configExists()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'provider:edit',
              errors: [
                'Configuration not found. Run gateway config:init first.',
              ],
              next: ['gateway config:init'],
            },
            mode.json,
          );
          return;
        }
        CliLogger.error(
          'Configuration not found. Run gateway config:init first.',
        );
        process.exit(1);
      }

      if (this.cliLoader.isBoilerplateConfig()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'provider:edit',
              errors: [
                'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
              ],
              next: ['gateway config:init'],
            },
            mode.json,
          );
          return;
        }
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        process.exit(1);
      }

      const config = this.cliLoader.loadRawConfig();
      const cwd = process.cwd();

      if (mode.isAgent) {
        assertAgentHasAnswers(mode, 'provider:edit');
        const answers = loadAnswers(
          ProviderEditAnswersSchema,
          mode.answersPath!,
        );
        const id = asProviderInstanceId(answers.id);

        if (answers.enabled === undefined && answers.rotateSecret !== true) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'provider:edit',
              errors: [
                'Provider edit requires enabled and/or rotateSecret:true in answers.',
              ],
            },
            mode.json,
          );
          return;
        }

        const pendingSecrets: PendingSecretsItem[] = [];
        const filesTouched = new Set<string>();

        if (answers.enabled !== undefined) {
          const input: EditProviderInput = {
            id,
            action: 'enabled',
            enabled: answers.enabled,
            confirmNonBootable: answers.confirmNonBootable,
          };
          const result = await this.providerManager.applyEditProvider(
            config,
            cwd,
            input,
          );
          for (const f of result.filesTouched ?? []) filesTouched.add(f);
        }

        if (answers.rotateSecret === true) {
          const input: EditProviderInput = {
            id,
            action: 'clearApiKey',
          };
          const result = await this.providerManager.applyEditProvider(
            config,
            cwd,
            input,
          );
          for (const f of result.filesTouched ?? []) filesTouched.add(f);
          if (result.pendingSecrets) {
            pendingSecrets.push(...result.pendingSecrets);
          }
        }

        exitWithAgentReport(
          {
            ok: true,
            status: pendingSecrets.length ? 'awaiting_secrets' : 'success',
            command: 'provider:edit',
            files: [...filesTouched],
            pendingSecrets: pendingSecrets.length ? pendingSecrets : undefined,
            next: pendingSecrets.length
              ? [
                  'HUMAN HANDOFF: paste new API key into .env for pendingSecrets[].envRef. Do NOT paste values into chat.',
                  'After the user confirms locally: gateway config:secrets-status --json',
                ]
              : ['gateway config:validate'],
          },
          mode.json,
        );
        return;
      }

      const instanceId = asProviderInstanceId(rawInstanceId);
      await this.providerManager.editProvider(config, instanceId, cwd);
    } catch (error) {
      if (mode.isAgent) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'provider:edit',
            errors: [error instanceof Error ? error.message : String(error)],
          },
          mode.json,
        );
        return;
      }
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }

  @Option({ flags: '--agent', description: 'Non-interactive agent mode' })
  parseAgent(): boolean {
    return true;
  }

  @Option({ flags: '--answers <path>', description: 'JSON answers file' })
  parseAnswers(val: string): string {
    return val;
  }

  @Option({ flags: '--json', description: 'JSON report on stdout' })
  parseJson(): boolean {
    return true;
  }

  @Option({ flags: '--force', description: 'Skip confirms / overwrite' })
  parseForce(): boolean {
    return true;
  }

  @Option({ flags: '-y, --yes', description: 'Alias for --force' })
  parseYes(): boolean {
    return true;
  }
}
