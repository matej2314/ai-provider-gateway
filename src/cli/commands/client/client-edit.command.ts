import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ClientManagerService } from 'src/cli/services/client-manager.service';

@Command({
  name: 'client:edit',
  description: 'Edit client (name, type, rate limit or rotate gateway key)',
  arguments: '<clientId>',
  argsDescription: {
    clientId: 'Client ID to edit.',
  },
})
export class ClientEditCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly clientManager: ClientManagerService,
  ) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    try {
      const clientId = passedParams[0]?.trim();
      if (!clientId) {
        CliLogger.error('Client ID is required.');
        CliLogger.info('Usage: gateway client:edit <clientId>');
        process.exit(1);
      }

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
        return;
      }

      const config = this.cliLoader.loadRawConfig();
      await this.clientManager.editClient(config, clientId, process.cwd());
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
