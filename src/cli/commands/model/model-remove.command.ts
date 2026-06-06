import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ModelManagerService } from 'src/cli/services/model-manager.service';

@Command({
  name: 'model:remove',
  description: 'Remove a model from configuration.',
  arguments: '<alias>',
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

  async run(passedParams: string[]): Promise<void> {
    try {
      if (this.cliLoader.isBoilerplateConfig()) {
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        CliLogger.blank();
        return;
      }

      const alias = passedParams[0]?.trim();
      if (!alias) {
        CliLogger.error('Model alias is required.');
        process.exit(1);
      }

      if (!this.cliLoader.configExists()) {
        CliLogger.error(
          'Configuration not found. Run gateway config:init first.',
        );
        process.exit(1);
      }

      const config = this.cliLoader.loadRawConfig();
      await this.modelManager.removeModel(config, alias, process.cwd());
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
