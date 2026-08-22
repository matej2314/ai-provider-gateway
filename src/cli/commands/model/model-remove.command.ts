import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ModelManagerService } from 'src/cli/services/model-manager.service';
import { asModelAlias } from 'src/common/types';
import {
  assertAgentHasAnswers,
  markAgentRuntime,
  resolveCliMode,
  type CliModeFlags,
} from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import { loadAnswers } from 'src/cli/agent/load-answers';
import { ModelRemoveAnswersSchema } from 'src/cli/schemas/agent-answers.schema';
import type { RemoveModelInput } from 'src/cli/types/cli-apply.types';

@Command({
  name: 'model:remove',
  description: 'Remove a model from configuration.',
  arguments: '[alias]',
  argsDescription: {
    alias: 'Model alias to remove.',
  },
})
export class ModelRemoveCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly modelManager: ModelManagerService,
  ) {
    super();
  }

  async run(passedParams: string[], options?: CliModeFlags): Promise<void> {
    const mode = resolveCliMode(options ?? {});
    markAgentRuntime(mode);
    CliLogger.setJsonSafe(mode.json || mode.isAgent);

    try {
      if (this.cliLoader.isBoilerplateConfig()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'model:remove',
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
        CliLogger.blank();
        return;
      }

      const rawAlias = passedParams[0]?.trim();
      if (!mode.isAgent && !rawAlias) {
        CliLogger.error('Model alias is required.');
        process.exit(1);
      }

      if (!this.cliLoader.configExists()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'model:remove',
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

      const config = this.cliLoader.loadRawConfig();
      const cwd = process.cwd();

      if (mode.isAgent) {
        let input: RemoveModelInput;

        if (mode.answersPath) {
          const answers = loadAnswers(
            ModelRemoveAnswersSchema,
            mode.answersPath,
          );
          input = { alias: asModelAlias(answers.alias), confirm: true };
        } else if (mode.force && rawAlias) {
          input = { alias: asModelAlias(rawAlias), confirm: true };
        } else {
          assertAgentHasAnswers(mode, 'model:remove');
          return;
        }

        const result = await this.modelManager.applyRemoveModel(
          config,
          cwd,
          input,
        );

        exitWithAgentReport(
          {
            ok: true,
            status: 'success',
            command: 'model:remove',
            files: result.filesTouched,
            next: ['gateway config:validate'],
          },
          mode.json,
        );
        return;
      }

      const alias = asModelAlias(rawAlias);
      await this.modelManager.removeModel(config, alias, cwd);
    } catch (error) {
      if (mode.isAgent) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'model:remove',
            errors: [error instanceof Error ? error.message : String(error)],
          },
          mode.json,
        );
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Unknown error occurred.';

      CliLogger.error(message);
      const rawAlias = passedParams[0]?.trim();
      if (
        rawAlias &&
        error instanceof Error &&
        message.toLowerCase().includes('validation failed')
      ) {
        CliLogger.info(
          `Model ${rawAlias} was not removed. gateway.config.yaml was not changed.`,
        );
      }
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
