import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from '../../services/cli-config-loader.service';
import { CliGatewayValidatorService } from '../../services/cli-gateway-validator.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { resolveCliMode } from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import chalk from 'chalk';
import { join } from 'path';

interface ConfigValidateOptions {
  json?: boolean;
  allowMissingSecrets?: boolean;
}

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

  run(_params: string[], options?: ConfigValidateOptions): Promise<void> {
    const mode = resolveCliMode({ json: options?.json });
    CliLogger.setJsonSafe(mode.json);

    try {
      if (!mode.json) {
        CliLogger.section('Validating configuration...');
      }

      if (!this.cliLoader.configExists()) {
        if (mode.json) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'config:validate',
              errors: ['Configuration file not found.'],
              next: ['gateway config:init'],
            },
            true,
          );
          return Promise.resolve();
        }
        CliLogger.error('Configuration file not found.');
        CliLogger.info('Run "gateway config:init" to create it.');
        process.exit(1);
      }

      if (this.cliLoader.isBoilerplateConfig()) {
        if (mode.json) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'config:validate',
              errors: ['Boilerplate configuration detected.'],
              next: ['gateway config:init'],
            },
            true,
          );
          return Promise.resolve();
        }
        CliLogger.warning('Boilerplate configuration detected.');
        CliLogger.info(
          'Run "gateway config:init" to create a full configuration.',
        );
        process.exit(1);
      }

      const spinner = CliLogger.spinner('Validating (runtime rules)...');
      const result = this.gatewayValidator.validate({
        configPath: join(process.cwd(), 'gateway.config.yaml'),
        allowMissingProviderSecrets: options?.allowMissingSecrets === true,
      });

      if (result.success) {
        spinner.succeed('Configuration is valid!');
        if (mode.json) {
          exitWithAgentReport(
            {
              ok: true,
              status: 'success',
              command: 'config:validate',
              warnings:
                result.warnings.length > 0 ? result.warnings : undefined,
            },
            true,
          );
          return Promise.resolve();
        }
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
      if (mode.json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'config:validate',
            errors: result.errors,
            warnings: result.warnings.length > 0 ? result.warnings : undefined,
          },
          true,
        );
        return Promise.resolve();
      }
      result.errors.forEach((e, i) =>
        console.log(chalk.red(`  ${i + 1}. ${e}`)),
      );
      process.exit(1);
    } catch (error) {
      if (mode.json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'config:validate',
            errors: [
              error instanceof Error
                ? error.message
                : 'Unknown error occurred.',
            ],
          },
          true,
        );
        return Promise.resolve();
      }
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }

  @Option({ flags: '--json', description: 'Machine-readable JSON on stdout' })
  parseJson(): boolean {
    return true;
  }

  @Option({
    flags: '--allow-missing-secrets',
    description:
      'Allow missing provider API keys / base URLs (structural validate only)',
  })
  parseAllowMissingSecrets(): boolean {
    return true;
  }
}
