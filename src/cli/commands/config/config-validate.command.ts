import { Command, CommandRunner } from 'nest-commander';
import { CliConfigLoaderService } from '../../services/cli-config-loader.service';
import { CliGatewayValidatorService } from '../../services/cli-gateway-validator.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import chalk from 'chalk';
import { join } from 'path';

@Command({
  name: 'config:validate',
  description: 'Validate gateway configuration files.',
})
export class ConfigValidateCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly gatewayValidator: CliGatewayValidatorService,
  ) {
    super();
  }

  run(): Promise<void> {
    try {
      CliLogger.section('Validating configuration...');

      if (!this.cliLoader.configExists()) {
        CliLogger.error('Configuration file not found.');
        CliLogger.info('Run "gateway config:init" to create it.');
        process.exit(1);
      }

      if (this.cliLoader.isBoilerplateConfig()) {
        CliLogger.warning('Boilerplate configuration detected.');
        CliLogger.info(
          'Run "gateway config:init" to create a full configuration.',
        );
        process.exit(1);
      }

      const spinner = CliLogger.spinner('Validating (runtime rules)...');
      const result = this.gatewayValidator.validate({
        configPath: join(process.cwd(), 'gateway.config.yaml'),
      });

      if (result.success) {
        spinner.succeed('Configuration is valid!');
        if (result.warnings.length > 0) {
          CliLogger.blank();
          CliLogger.warning('Warnings:');
          result.warnings.forEach((w) => console.log(chalk.yellow(`  ${w}`)));
        }
        const config = this.cliLoader.loadRawConfig();
        CliLogger.blank();
        CliLogger.dim('Details:');
        CliLogger.dim(`  - Schema version: ${config.schemaVersion}`);
        CliLogger.dim(
          `  - Providers: ${Object.keys(config.providers).join(', ')}`,
        );
        CliLogger.dim(`  - Models: ${Object.keys(config.models).length}`);
        CliLogger.dim(`  - Clients: ${Object.keys(config.clients).length}`);
        return Promise.resolve();
      }

      spinner.fail('Configuration validation failed.');
      result.errors.forEach((e, i) =>
        console.log(chalk.red(`  ${i + 1}. ${e}`)),
      );
      process.exit(1);
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }
}
