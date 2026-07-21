import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ClientManagerService } from 'src/cli/services/client-manager.service';
import { asClientId } from 'src/common/types/branded.types';

@Command({
  name: 'client:remove',
  description:
    'Remove a client from configuration and delete gateway key from .env file.',
  arguments: '<clientId>',
  argsDescription: {
    clientId: 'Client ID to remove.',
  },
})
export class ClientRemoveCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly clientManager: ClientManagerService,
  ) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    try {
      const rawClientId = passedParams[0]?.trim();
      if (!rawClientId) {
        CliLogger.error('Client ID is required.');
        CliLogger.info('Usage: gateway client:remove <clientId>');
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

      const clientId = asClientId(rawClientId);
      const config = this.cliLoader.loadRawConfig();
      await this.clientManager.removeClient(config, clientId, process.cwd());
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
