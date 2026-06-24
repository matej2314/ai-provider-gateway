import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import chalk from 'chalk';

@Command({
  name: 'model:list',
  description: 'List all configured models.',
})
export class ModelListCommand extends CommandRunner {
  constructor(private readonly cliLoader: CliConfigLoaderService) {
    super();
  }

  run(): Promise<void> {
    try {
      if (this.cliLoader.isBoilerplateConfig()) {
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        CliLogger.blank();
        return Promise.resolve();
      }

      const config = this.cliLoader.loadRawConfig();

      CliLogger.section('Configured AI Models');
      const models = Object.entries(config.models);

      if (models.length === 0) {
        CliLogger.warning('No models configured.');
        return Promise.resolve();
      }

      models.forEach(([alias, model]) => {
        console.log(chalk.cyan(`  • ${alias}`));
        console.log(chalk.dim(`  Provider: ${model.providerInstance}`));
        console.log(chalk.dim(`  Model ID: ${model.modelId}`));
        console.log(
          chalk.dim(
            ` Streaming: ${(model.capabilities?.streaming ?? true) ? 'enabled' : 'disabled'}`,
          ),
        );
        if (model.fallback) {
          console.log(chalk.dim(`   Fallback: ${model.fallback}`));
        }
        console.log('');
      });
      return Promise.resolve();
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
