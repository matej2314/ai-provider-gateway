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
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import { loadAnswers } from 'src/cli/agent/load-answers';
import { ProviderRemoveAnswersSchema } from 'src/cli/schemas/agent-answers.schema';
import type { RemoveProviderInput } from 'src/cli/types/cli-apply.types';

@Command({
  name: 'provider:remove',
  description:
    'Remove provider instance, all linked models and API key from .env file.',
  arguments: '[instanceId]',
})
export class ProviderRemoveCommand extends CommandRunner {
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
        CliLogger.info('Usage: gateway provider:remove <instanceId>');
        process.exit(1);
      }

      if (!this.cliLoader.configExists()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'provider:remove',
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
              command: 'provider:remove',
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
        let input: RemoveProviderInput;

        if (mode.answersPath) {
          const answers = loadAnswers(
            ProviderRemoveAnswersSchema,
            mode.answersPath,
          );
          input = {
            id: asProviderInstanceId(answers.id),
            confirm: true,
          };
        } else if (mode.force && rawInstanceId) {
          input = {
            id: asProviderInstanceId(rawInstanceId),
            confirm: true,
          };
        } else {
          assertAgentHasAnswers(mode, 'provider:remove');
          return;
        }

        const result = await this.providerManager.applyRemoveProvider(
          config,
          cwd,
          input,
        );

        exitWithAgentReport(
          {
            ok: true,
            status: 'success',
            command: 'provider:remove',
            files: result.filesTouched,
            next: ['gateway config:validate'],
          },
          mode.json,
        );
        return;
      }

      const instanceId = asProviderInstanceId(rawInstanceId);
      await this.providerManager.removeProvider(config, instanceId, cwd);
    } catch (error) {
      if (mode.isAgent) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'provider:remove',
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
