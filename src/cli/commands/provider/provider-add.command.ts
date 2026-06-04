import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ProviderManagerService } from 'src/cli/services/provider-manager.service';

@Command({
  name: 'provider:add',
  description:
    'Add a new provider instance. Ensures at least one model is linked.',
})
export class ProviderAddCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly providerManager: ProviderManagerService,
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
      await this.providerManager.addProvider(config, process.cwd());
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
