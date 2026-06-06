import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ProviderManagerService } from 'src/cli/services/provider-manager.service';

@Command({
  name: 'provider:edit',
  description: 'Edit provider instance (enable/disable or rotate API key)',
  arguments: '<instanceId>',
})
export class ProviderEditCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly providerManager: ProviderManagerService,
  ) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    try {
      const instanceId = passedParams[0]?.trim();
      if (!instanceId) {
        CliLogger.error('Provider instance ID is required.');
        CliLogger.info('Usage: gateway provider:edit <instanceId>');
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
        process.exit(1);
      }
      const config = this.cliLoader.loadRawConfig();
      await this.providerManager.editProvider(
        config,
        instanceId,
        process.cwd(),
      );
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
