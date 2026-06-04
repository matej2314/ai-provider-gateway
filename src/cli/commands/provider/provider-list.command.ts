import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import chalk from 'chalk';

@Command({
  name: 'provider:list',
  description: 'List configured AI providers.',
})
export class ProviderListCommand extends CommandRunner {
  constructor(private readonly cliLoader: CliConfigLoaderService) {
    super();
  }

  async run(): Promise<void> {
    try {
      const config = this.cliLoader.loadRawConfig();

      CliLogger.section('Configured AI Providers:');
      const providers = Object.entries(config.providers);

      if (providers.length === 0) {
        CliLogger.warning('No providers configured.');
        return;
      }

      providers.forEach(([id, provider]) => {
        const statusColor = provider.enabled ? 'green' : 'red';

        console.log(
          chalk[statusColor] +
            ' ' +
            chalk.cyan(id) +
            chalk.dim(` (${provider.type})`),
        );
        console.log(chalk.dim(`    API Key Ref: ${provider.apiKeyRef}`));
        console.log(
          chalk.dim(`    Enabled: ${provider.enabled ? 'Yes' : 'No'}`),
        );
        console.log(
          chalk.dim(`Models count: ${Object.keys(config.models).length}`),
        );
        console.log('');
      });
    } catch (err) {
      CliLogger.error(
        err instanceof Error ? err.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
