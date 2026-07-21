import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import chalk from 'chalk';

@Command({
  name: 'client:list',
  description: 'List all configured clients.',
})
export class ClientListCommand extends CommandRunner {
  constructor(private readonly cliLoader: CliConfigLoaderService) {
    super();
  }

  run(): Promise<void> {
    try {
      if (!this.cliLoader.configExists()) {
        CliLogger.error(
          'Configuration not found. Run gateway config:init first.',
        );
        process.exit(1);
      }

      if (this.cliLoader.isBoilerplateConfig()) {
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        CliLogger.blank();
        return Promise.resolve();
      }

      const config = this.cliLoader.loadRawConfig();

      CliLogger.section('Configured clients');
      const clients = Object.entries(config.clients);

      if (clients.length === 0) {
        CliLogger.warning('No clients configured.');
        return Promise.resolve();
      }

      clients.forEach(([id, client]) => {
        console.log(
          chalk.cyan(`  • ${id}`) +
            chalk.dim(` (${client.type}) - ${client.name}`),
        );
        console.log(chalk.dim(`    Gateway Key Ref: ${client.gatewayKeyRef}`));
        if (client.rateLimit) {
          console.log(
            chalk.dim(
              `    Rate Limit: ${client.rateLimit.rps} rps, burst ${client.rateLimit.burst}`,
            ),
          );
        }
        if (client.rateLimit?.maxConcurrentStreams) {
          console.log(
            chalk.dim(
              `    Max Concurrent Streams: ${client.rateLimit.maxConcurrentStreams}`,
            ),
          );
        }
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
