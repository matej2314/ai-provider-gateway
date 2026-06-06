import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { ProviderTestService } from 'src/cli/services/provider-test.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import chalk from 'chalk';
import { GatewayConfig } from 'src/config/configuration';

interface ProviderTestOptions {
  provider?: string;
}

@Command({
  name: 'provider:test',
  description: 'Test connection to AI providers.',
  arguments: '[instanceId]',
  argsDescription: {
    provider:
      'Specific provider to test (anthropic,google). Test all if omitted.',
  },
})
export class ProviderTestCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly tester: ProviderTestService,
  ) {
    super();
  }

  async run(
    passedParams: string[],
    options?: ProviderTestOptions,
  ): Promise<void> {
    try {
      const { config, missingEnvVars } = this.cliLoader.loadWithEnvCheck();

      if (this.cliLoader.isBoilerplateConfig()) {
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        process.exit(1);
      }

      if (missingEnvVars.length > 0) {
        CliLogger.error('Missing environment variables:');
        missingEnvVars.forEach((v) => {
          console.log(chalk.red(`  • ${v}`));
        });
        CliLogger.blank();
        CliLogger.info('Add these to your .env file before testing.');
        process.exit(1);
      }

      const providerName = options?.provider || passedParams[0];

      if (providerName) {
        await this.testSingleProvider(providerName, config);
      } else {
        await this.testAllProviders(config);
      }
    } catch (err) {
      CliLogger.error(
        err instanceof Error ? err.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }

  @Option({
    flags: '-p, --provider <instanceId>',
    description: 'Specific provider to test',
  })
  parseProvider(val: string): string {
    return val.toLowerCase();
  }

  private async testSingleProvider(
    instanceId: string,
    config: GatewayConfig,
  ): Promise<void> {
    const provider = config.providers[instanceId];
    if (!provider) {
      CliLogger.error(`Provider "${instanceId}" not found in configuration.`);
      process.exit(1);
    }

    CliLogger.section(`Testing provider: ${instanceId}`);
    const spinner = CliLogger.spinner(`Connecting to ${instanceId}...`);

    const apiKey = process.env[provider.apiKeyRef];
    if (!apiKey) {
      spinner.fail('API key not found.');
      CliLogger.error(
        `Please ensure ${provider.apiKeyRef} is set in your .env file.`,
      );
      process.exit(1);
    }

    let success = false;
    if (provider.type === 'anthropic') {
      success = await this.tester.testAnthropic(apiKey);
    } else if (provider.type === 'google') {
      success = await this.tester.testGoogle(apiKey);
    } else {
      spinner.fail(`Unknown provider type: ${provider.apiKeyRef}`);
      process.exit(1);
    }

    if (success) {
      spinner.succeed(`${instanceId} connection successful!`);
      CliLogger.blank();
    } else {
      spinner.fail(`${instanceId} connection failed.`);
      CliLogger.blank();
      process.exit(1);
    }
  }

  private async testAllProviders(config: GatewayConfig): Promise<void> {
    CliLogger.section('Testing All Providers.');

    const results: Array<{ name: string; success: boolean }> = [];

    for (const [name, provider] of Object.entries(config.providers)) {
      const spinner = CliLogger.spinner(`Testing ${name}...`);

      const apiKey = process.env[provider.apiKeyRef];

      if (!apiKey) {
        spinner.fail(`${name} API key not found.`);
        results.push({ name, success: false });
        continue;
      }
      let success = false;

      switch (provider.type) {
        case 'anthropic':
          success = await this.tester.testAnthropic(apiKey);
          break;
        case 'google':
          success = await this.tester.testGoogle(apiKey);
          break;
        default:
          spinner.fail(`Unknown provider type: ${provider.type}`);
          results.push({ name, success: false });
          continue;
      }
      if (success) {
        spinner.succeed(`${name} - OK`);
      } else {
        spinner.fail(`${name} - Failed`);
      }
      results.push({ name, success });
    }

    CliLogger.blank();
    const allSuccess = results.every((r) => r.success);

    if (allSuccess) {
      CliLogger.success('All providers tested successfully!');
      CliLogger.blank();
    } else {
      CliLogger.error('Some providers failed. Check the output above.');
      CliLogger.blank();
      process.exit(1);
    }
  }
}
