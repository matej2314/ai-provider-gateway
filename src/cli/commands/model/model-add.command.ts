import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ModelManagerService } from 'src/cli/services/model-manager.service';
import { ConfigPersistenceService } from 'src/cli/services/config-persistence.service';
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
import { ModelAddAnswersSchema } from 'src/cli/schemas/agent-answers.schema';

@Command({
  name: 'model:add',
  description: 'Add a new model to the gateway configuration.',
})
export class ModelAddCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly modelManager: ModelManagerService,
    private readonly persistence: ConfigPersistenceService,
  ) {
    super();
  }

  async run(_params: string[], options?: CliModeFlags): Promise<void> {
    const mode = resolveCliMode(options ?? {});
    markAgentRuntime(mode);
    CliLogger.setJsonSafe(mode.json || mode.isAgent);

    try {
      if (!this.cliLoader.configExists()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'model:add',
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
              command: 'model:add',
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
        assertAgentHasAnswers(mode, 'model:add');
        const answers = loadAnswers(ModelAddAnswersSchema, mode.answersPath!);

        await this.modelManager.applyAddModel(
          config,
          cwd,
          {
            alias: asModelAlias(answers.alias),
            providerInstance: asProviderInstanceId(answers.providerInstance),
            modelId: asModelId(answers.modelId),
          },
          { persist: true },
        );

        exitWithAgentReport(
          {
            ok: true,
            status: 'success',
            command: 'model:add',
            files: ['gateway.config.yaml'],
            next: ['gateway config:validate'],
          },
          mode.json,
        );
        return;
      }

      const inputs = await this.modelManager.promptAddModel(config);
      for (const input of inputs) {
        await this.modelManager.applyAddModel(config, cwd, input, {
          persist: false,
        });
      }
      await this.persistence.persistConfig(config, cwd);

      CliLogger.success('Model(s) added successfully.');
    } catch (error) {
      if (mode.isAgent) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'model:add',
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
