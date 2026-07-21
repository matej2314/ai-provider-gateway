import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ModelManagerService } from 'src/cli/services/model-manager.service';
import { asModelAlias } from 'src/common/types';

@Command({
  name: 'model:edit',
  description: 'Edit an existing modelAlias ',
  arguments: '<alias>',
})
export class ModelEditCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly modelManager: ModelManagerService,
  ) {
    super();
  }
  async run(passedParams: string[]): Promise<void> {
    const rawAlias = passedParams[0]?.trim();
    if (!rawAlias) {
      CliLogger.error('Model alias is required.');
      process.exit(1);
    }

    try {
      if (!this.cliLoader.configExists()) {
        CliLogger.error(
          'Configuration not found. Run gateway config:init first.',
        );
        process.exit(1);
      }

      if (this.cliLoader.isBoilerplateConfig()) {
        CliLogger.warning('Boilerplate configuration detected.');
        CliLogger.info(
          'Run "gateway config:init" to create a full configuration.',
        );
        process.exit(1);
      }

      const alias = asModelAlias(rawAlias);
      const config = this.cliLoader.loadRawConfig();
      await this.modelManager.editModel(config, alias, process.cwd());
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
