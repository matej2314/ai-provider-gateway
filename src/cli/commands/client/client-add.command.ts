import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ClientManagerService } from 'src/cli/services/client-manager.service';

@Command({
  name: 'client:add',
  description: 'Add a new client to the gateway configuration.',
})
export class ClientAddCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly clientManager: ClientManagerService,
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

      const config = this.cliLoader.loadRawConfig();
      await this.clientManager.addClient(config, process.cwd());
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
