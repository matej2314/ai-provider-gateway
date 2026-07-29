import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ModelManagerService } from 'src/cli/services/model-manager.service';
import {
  asModelAlias,
  asModelId,
  asProviderInstanceId,
} from 'src/common/types';
import {
  assertAgentHasAnswers,
  markAgentRuntime,
  resolveCliMode,
  type CliModeFlags,
} from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import { loadAnswers } from 'src/cli/agent/load-answers';
import { ModelEditAnswersSchema } from 'src/cli/schemas/agent-answers.schema';
import type { EditModelInput } from 'src/cli/types/cli-apply.types';

@Command({
  name: 'model:edit',
  description: 'Edit an existing modelAlias ',
  arguments: '[alias]',
})
export class ModelEditCommand extends CommandRunner {
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

    const rawAlias = passedParams[0]?.trim();
    if (!mode.isAgent && !rawAlias) {
      CliLogger.error('Model alias is required.');
      process.exit(1);
    }

    try {
      if (!this.cliLoader.configExists()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'model:edit',
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
              command: 'model:edit',
              errors: [
                'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
              ],
              next: ['gateway config:init'],
            },
            mode.json,
          );
          return;
        }
        CliLogger.warning('Boilerplate configuration detected.');
        CliLogger.info(
          'Run "gateway config:init" to create a full configuration.',
        );
        process.exit(1);
      }

      const config = this.cliLoader.loadRawConfig();
      const cwd = process.cwd();

      if (mode.isAgent) {
        assertAgentHasAnswers(mode, 'model:edit');
        const answers = loadAnswers(ModelEditAnswersSchema, mode.answersPath!);

        const input: EditModelInput = {
          alias: asModelAlias(answers.alias),
          modelId: answers.modelId ? asModelId(answers.modelId) : undefined,
          providerInstance: answers.providerInstance
            ? asProviderInstanceId(answers.providerInstance)
            : undefined,
          confirmNonBootable: answers.confirmNonBootable,
          fallback: answers.fallback,
          streaming: answers.streaming,
          policy: answers.policy,
        };

        const result = await this.modelManager.applyEditModel(
          config,
          cwd,
          input,
        );

        exitWithAgentReport(
          {
            ok: true,
            status: 'success',
            command: 'model:edit',
            files: result.filesTouched,
            next: ['gateway config:validate'],
          },
          mode.json,
        );
        return;
      }

      const alias = asModelAlias(rawAlias);
      await this.modelManager.editModel(config, alias, cwd);
    } catch (error) {
      if (mode.isAgent) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'model:edit',
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
