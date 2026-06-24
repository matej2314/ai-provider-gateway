import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from '../../services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import chalk from 'chalk';

@Command({
  name: 'config:show',
  description: 'Display parsed gateway configuration.',
})
export class ConfigShowCommand extends CommandRunner {
  constructor(private readonly cliLoader: CliConfigLoaderService) {
    super();
  }

  run(): Promise<void> {
    try {
      CliLogger.section('Gateway configuration.');
      const config = this.cliLoader.loadRawConfig();

      console.log(chalk.bold('\nProviders:'));
      Object.entries(config.providers).forEach(([id, provider]) => {
        console.log(
          chalk.cyan(`  • ${id}`) +
            chalk.dim(
              ` (${provider.type}, enabled: ${provider.enabled !== false})`,
            ),
        );
        console.log(chalk.dim(`    API Key Ref: ${provider.apiKeyRef}`));
      });

      console.log(chalk.bold('\nModels:'));
      Object.entries(config.models).forEach(([alias, model]) => {
        console.log(
          chalk.cyan(`  • ${alias}`) +
            chalk.dim(` → ${model.providerInstance}/${model.modelId}`),
        );
        if (model.fallback) {
          console.log(chalk.dim(`   Fallback: ${model.fallback}`));
        }
      });

      console.log(chalk.bold('\nClients:'));
      Object.entries(config.clients).forEach(([id, client]) => {
        console.log(
          chalk.cyan(`  • ${id}`) +
            chalk.dim(` (${client.type}) - ${client.name}`),
        );
        console.log(chalk.dim(`    Gateway Key Ref: ${client.gatewayKeyRef}`));
        if (client.rateLimit) {
          console.log(chalk.dim(`    Rate Limit: ${client.rateLimit.rps} rps`));
        }
      });

      console.log(chalk.bold('\nMaster key:'));
      console.log(chalk.dim(`  Reference: ${config.masterKeyRef}`));

      if (this.cliLoader.isBoilerplateConfig()) {
        CliLogger.blank();
        CliLogger.warning('Boilerplate configuration detected.');
        CliLogger.info(
          'Run "gateway config:init" to create a full configuration.',
        );
      }

      CliLogger.blank();
      return Promise.resolve();
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
