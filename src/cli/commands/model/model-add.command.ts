import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ModelManagerService } from 'src/cli/services/model-manager.service';
import { ConfigPersistenceService } from 'src/cli/services/config-persistence.service';
import { asProviderInstanceId } from 'src/common/types';
import * as inquirer from 'inquirer';

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

  async run(): Promise<void> {
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

      const config = this.cliLoader.loadRawConfig();
      const cwd = process.cwd();

      const providers = Object.keys(config.providers);
      if (providers.length === 0) {
        throw new Error('No providers configured. Add provider first.');
      }

      const { providerInstance } = await inquirer.prompt<{
        providerInstance: string;
      }>([
        {
          type: 'list',
          name: 'providerInstance',
          message: 'Provider instance:',
          choices: providers,
        },
      ]);

      await this.modelManager.addModelForProvider(
        config,
        asProviderInstanceId(providerInstance),
        cwd,
      );

      await this.persistence.persistConfig(config, cwd);

      CliLogger.success('Model(s) added successfully.');
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
