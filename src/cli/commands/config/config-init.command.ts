import { Command, CommandRunner, Option } from 'nest-commander';
import { join } from 'path';
import * as inquirer from 'inquirer';
import { WizardOrchestratorService } from 'src/cli/services/wizard-orchestrator.service';
import { ConfigGeneratorService } from 'src/cli/services/config-generator.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import boxen from 'boxen';
import chalk from 'chalk';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { FileManagerService } from 'src/cli/services/file-manager.service';
import { CliGatewayValidatorService } from 'src/cli/services/cli-gateway-validator.service';
import { WizardStateManager } from 'src/cli/services/wizard-state-manager.service';
import { EnvPatchService } from 'src/cli/services/env-patch.service';
import {
  assertAgentHasAnswers,
  markAgentRuntime,
  resolveCliMode,
  type CliMode,
  type CliModeFlags,
} from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import { loadAnswers } from 'src/cli/agent/load-answers';
import { InitAnswersSchema } from 'src/cli/schemas/agent-answers.schema';
import { collectPendingSecrets } from 'src/cli/agent/pending-secrets';

@Command({
  name: 'config:init',
  description:
    'Initialize gateway configuration (interactive wizard or --agent --answers).',
})
export class ConfigInitCommand extends CommandRunner {
  constructor(
    private readonly cliConfigLoader: CliConfigLoaderService,
    private readonly orchestrator: WizardOrchestratorService,
    private readonly configGenerator: ConfigGeneratorService,
    private readonly fileManager: FileManagerService,
    private readonly gatewayValidator: CliGatewayValidatorService,
    private readonly wizardStateManager: WizardStateManager,
    private readonly envPatch: EnvPatchService,
  ) {
    super();
  }

  async run(_params: string[], options?: CliModeFlags): Promise<void> {
    const mode = resolveCliMode(options ?? {});
    markAgentRuntime(mode);
    CliLogger.setJsonSafe(mode.json || mode.isAgent);

    try {
      if (mode.isAgent) {
        await this.runAgentInit(mode);
        return;
      }
      await this.runInteractiveInit();
    } catch (error) {
      if (mode.isAgent) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'config:init',
            errors: [error instanceof Error ? error.message : String(error)],
          },
          mode.json,
        );
      }
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }

  private async runInteractiveInit(): Promise<void> {
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
      CliLogger.info('Detected boilerplate configuration. Starting wizard...');
    }

    CliLogger.blank();

    const { configInput, envInput, wizardState } =
      await this.orchestrator.runInitWizard();

    const spinner = CliLogger.spinner('Writing configuration files...');

    try {
      await this.configGenerator.generateFullConfig(
        configInput,
        envInput,
        wizardState,
        { backupExisting: false },
      );
      spinner.succeed('Configuration files created!');
      await this.validateAndFixConfig();
      await this.wizardStateManager.clearState();
      this.printSuccess();
    } catch (error) {
      await this.wizardStateManager.rollback(wizardState);
      throw error;
    }
  }

  private async runAgentInit(mode: CliMode): Promise<void> {
    if (!mode.deferSecrets) {
      exitWithAgentReport(
        {
          ok: false,
          status: 'error',
          command: 'config:init',
          errors: [
            'Agent mode requires secret deferral (default). Operator values must be pasted into .env by the user — never via answers.',
          ],
        },
        mode.json,
      );
    }

    assertAgentHasAnswers(mode, 'config:init');
    const answers = loadAnswers(InitAnswersSchema, mode.answersPath!);

    const configExists = this.cliConfigLoader.configExists();
    const isBoilerplate =
      configExists && this.cliConfigLoader.isBoilerplateConfig();

    if (configExists && !isBoilerplate) {
      if (!(answers.overwrite === true || mode.force)) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'config:init',
            errors: [
              'Configuration already exists. Pass overwrite:true in answers or --force.',
            ],
          },
          mode.json,
        );
      }
      await this.fileManager.backupFile('gateway.config.yaml');
      if (await this.fileManager.fileExists('.env')) {
        await this.fileManager.backupFile('.env');
      }
    }

    const existingState = await this.wizardStateManager.loadState();
    if (existingState) {
      if (!mode.force) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'config:init',
            errors: [
              'Incomplete wizard session exists. Re-run with --force to discard, or finish interactively.',
            ],
          },
          mode.json,
        );
      }
      await this.wizardStateManager.rollback(existingState);
    }

    const { configInput, envInput, wizardState } =
      this.orchestrator.runFromAnswers(answers);

    await this.configGenerator.generateFullConfig(
      configInput,
      envInput,
      wizardState,
      { backupExisting: false },
    );

    // AGENT-MODE: NIE wołać validateAndFixConfig() z inquirer loop
    const structure = this.gatewayValidator.validate({
      configPath: join(process.cwd(), 'gateway.config.yaml'),
      allowMissingProviderSecrets: true,
    });

    if (!structure.success) {
      await this.wizardStateManager.rollback(wizardState);
      exitWithAgentReport(
        {
          ok: false,
          status: 'error',
          command: 'config:init',
          errors: structure.errors,
        },
        mode.json,
      );
    }

    await this.wizardStateManager.clearState();

    const pending = await collectPendingSecrets(
      this.cliConfigLoader.loadRawConfig(),
      process.cwd(),
      this.envPatch,
      {
        includeMasterKey: true,
        includeClientKeys: true,
        includeOperatorEnv: true,
      },
    );

    exitWithAgentReport(
      {
        ok: true,
        status: pending.length ? 'awaiting_secrets' : 'success',
        command: 'config:init',
        files: ['gateway.config.yaml', '.env', '.env.example'],
        pendingSecrets: pending,
        generatedKeyRefs: [
          'MASTER_KEY',
          ...answers.clients.map(
            (c) =>
              `GATEWAY_KEY_${c.id.trim().toUpperCase().replace(/-/g, '_')}`,
          ),
        ],
        warnings: structure.warnings,
        next: pending.length
          ? [
              'HUMAN HANDOFF: user must edit .env — see pendingSecrets (api keys, base URLs, Sentry DSN, Redis password). Do not ask user to paste secrets into chat.',
              'Wait for user confirmation, then: gateway config:secrets-status --json',
              'On exit 0: gateway config:validate',
            ]
          : ['gateway config:validate', 'npm run start:dev'],
      },
      mode.json,
    );
  }

  private async validateAndFixConfig(): Promise<void> {
    CliLogger.blank();
    CliLogger.section('Final configuration validation');

    let isValid = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isValid && attempts < maxAttempts) {
      attempts++;

      const spinner = CliLogger.spinner('Validating configuration...');
      const result = this.gatewayValidator.validate({
        configPath: join(process.cwd(), 'gateway.config.yaml'),
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

  @Option({ flags: '--agent', description: 'Non-interactive agent mode' })
  parseAgent(): boolean {
    return true;
  }

  @Option({ flags: '--answers <path>', description: 'JSON answers file' })
  parseAnswers(val: string): string {
    return val;
  }

  @Option({ flags: '--json', description: 'JSON report on stdout' })
  parseJson(): boolean {
    return true;
  }

  @Option({
    flags: '--defer-secrets',
    description: 'Leave operator env values empty for human paste',
  })
  parseDeferSecrets(): boolean {
    return true;
  }

  @Option({ flags: '--force', description: 'Skip confirms / overwrite' })
  parseForce(): boolean {
    return true;
  }

  @Option({ flags: '-y, --yes', description: 'Alias for --force' })
  parseYes(): boolean {
    return true;
  }
}
