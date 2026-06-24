import { Command, CommandRunner } from 'nest-commander';
import { join } from 'path';
import { config as dotenvConfig } from 'dotenv';
import * as inquirer from 'inquirer';
import { WizardOrchestratorService } from 'src/cli/services/wizard-orchestrator.service';
import { ConfigGeneratorService } from 'src/cli/services/config-generator.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import boxen from 'boxen';
import chalk from 'chalk';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { FileManagerService } from 'src/cli/services/file-manager.service';
import { validateGatewayConfig } from 'src/config/config-validator';

@Command({
  name: 'config:init',
  description: 'Initialize gateway configuration with interactive wizard.',
})
export class ConfigInitCommand extends CommandRunner {
  constructor(
    private readonly cliConfigLoader: CliConfigLoaderService,
    private readonly orchestrator: WizardOrchestratorService,
    private readonly configGenerator: ConfigGeneratorService,
    private readonly fileManager: FileManagerService,
  ) {
    super();
  }

  async run(): Promise<void> {
    try {
      CliLogger.section('🚀 AI Provider Gateway - Configuration Wizard');

      const configExists = this.cliConfigLoader.configExists();
      const isBoilerplate =
        configExists && this.cliConfigLoader.isBoilerplateConfig();

      if (configExists && !isBoilerplate) {
        CliLogger.warning(
          'Configuration already exists and appears to be configured.',
        );
        CliLogger.blank();

        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Do you want to overwrite existing configuration?',
            default: false,
          },
        ]);

        if (!overwrite) {
          CliLogger.info('Configuration wizard cancelled.');
          return;
        }

        CliLogger.blank();
        const spinner = CliLogger.spinner(
          'Creating backup of existing configuration...',
        );
        await this.fileManager.backupFile('gateway.config.yaml');

        if (await this.fileManager.fileExists('.env')) {
          await this.fileManager.backupFile('.env');
        }

        spinner.succeed('Backup created successfully.');
      } else if (isBoilerplate) {
        CliLogger.info(
          'Detected boilerplate configuration. Starting wizard...',
        );
      }

      CliLogger.blank();

      const result = await this.orchestrator.runInitWizard();

      const spinner = CliLogger.spinner('Writing configuration files...');

      await this.configGenerator.generateFullConfig(
        result.configInput,
        result.envInput,
        undefined,
        { backupExisting: false },
      );

      spinner.succeed('Configuration files created!');

      await this.validateAndFixConfig();

      this.printSuccess();
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }

  private loadEnvForValidation(): void {
    try {
      dotenvConfig({ path: join(process.cwd(), '.env') });
    } catch {
      /* intentionally ignored */
    }
  }

  private async validateAndFixConfig(): Promise<void> {
    CliLogger.blank();
    CliLogger.section('Final configuration validation');

    let isValid = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isValid && attempts < maxAttempts) {
      attempts++;

      this.loadEnvForValidation();

      const spinner = CliLogger.spinner('Validating configuration...');
      const result = validateGatewayConfig({
        configPath: join(process.cwd(), 'gateway.config.yaml'),
        env: process.env,
      });

      if (result.success) {
        spinner.succeed('Configuration is valid!');

        if (result.warnings.length > 0) {
          CliLogger.blank();
          CliLogger.warning('Warnings:');
          result.warnings.forEach((warning) =>
            console.log(chalk.yellow(`  ${warning}`)),
          );
        }

        isValid = true;
        break;
      }

      spinner.fail('Configuration validation failed.');
      CliLogger.blank();
      CliLogger.error('Found errors:');
      result.errors.forEach((error, i) =>
        console.log(chalk.red(`  ${i + 1}. ${error}`)),
      );

      CliLogger.blank();
      const { action } = await inquirer.prompt<{
        action: 'manual' | 'abort';
      }>([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            {
              name: 'Fix errors manually (edit files now, then retry)',
              value: 'manual',
            },
            {
              name: 'Abort wizard',
              value: 'abort',
            },
          ],
        },
      ]);

      if (action === 'abort') {
        throw new Error('Wizard aborted by user.');
      }

      CliLogger.info(
        'Please fix the errors in gateway.config.yaml and .env files.',
      );
      CliLogger.info('Then press Enter to retry validation.');
      await inquirer.prompt<{ continue: string }>([
        {
          type: 'input',
          name: 'continue',
          message: 'Press Enter when ready.',
        },
      ]);
    }

    if (!isValid) {
      throw new Error(
        'Max validation attempts reached. Please fix errors manually and run: gateway config:validate',
      );
    }
  }

  private printSuccess(): void {
    const message = boxen(
      chalk.green.bold('✓ Configuration initialized successfully!') +
        '\n\n' +
        chalk.white('Next steps:') +
        '\n' +
        chalk.cyan('  1. Review ') +
        chalk.yellow('gateway.config.yaml') +
        '\n' +
        chalk.cyan('  2. Edit system prompts in ') +
        chalk.yellow('src/config/system-prompt/') +
        '\n' +
        chalk.cyan('  3. Validate: ') +
        chalk.yellow('gateway config:validate') +
        '\n' +
        chalk.cyan('  4. Test providers: ') +
        chalk.yellow('gateway provider:test') +
        '\n' +
        chalk.cyan('  5. Start server: ') +
        chalk.yellow('npm run start:dev'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green',
      },
    );
    console.log('\n' + message + '\n');
  }
}
