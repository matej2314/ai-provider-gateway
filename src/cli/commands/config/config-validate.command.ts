import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from '../../services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import chalk from 'chalk';

@Command({
  name: 'config:validate',
  description: 'Validate gateway configuration files.',
})
export class ConfigValidateCommand extends CommandRunner {
  constructor(private readonly cliLoader: CliConfigLoaderService) {
    super();
  }

  async run(): Promise<void> {
    try {
      CliLogger.section('Validating configuration...');

      if (!this.cliLoader.configExists()) {
        CliLogger.error('Configuration file not found.');
        CliLogger.info('Run "gateway config:init" to create it.');
        process.exit(1);
      }

      const spinner = CliLogger.spinner('Checking YAML structure...');
      const { config, missingEnvVars } = this.cliLoader.loadWithEnvCheck();
      spinner.succeed('YAML structure is valid.');

      if (missingEnvVars.length > 0) {
        CliLogger.blank();
        CliLogger.warning('Missing environment variables:');
        missingEnvVars.forEach((v) => {
          console.log(chalk.yellow(`  • ${v}`));
        });
        CliLogger.blank();
        CliLogger.info('These variables are required in .env file.');
        CliLogger.info(
          'Values should match references in gateway.config.yaml.',
        );
        process.exit(1);
      }

      CliLogger.blank();
      CliLogger.success('Configuration is valid!');
      CliLogger.blank();
      CliLogger.dim('Details:');
      CliLogger.dim(`  - Schema version: ${config.schemaVersion}`);
      CliLogger.dim(
        `  - Providers: ${Object.keys(config.providers).join(', ')}`,
      );
      CliLogger.dim(`  - Models: ${Object.keys(config.models).length}`);
      CliLogger.dim(`  - Clients: ${Object.keys(config.clients).length}`);
      CliLogger.blank();
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
