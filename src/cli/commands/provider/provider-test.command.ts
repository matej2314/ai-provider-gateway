import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { ProviderTestService } from 'src/cli/services/provider-test.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import chalk from 'chalk';
import { GatewayConfig } from 'src/config/gateway-config.schema';
import { isApiKeyRequiredForProviderType } from 'src/config/provider-api-key.validation';
import { isOpenAiProviderType } from 'src/config/provider-types';
import {
  asBaseUrl,
  asProviderApiKey,
  asProviderInstanceId,
} from 'src/common/types';
import type { ProviderInstanceId } from 'src/common/types';

interface ProviderTestOptions {
  provider?: ProviderInstanceId;
}

@Command({
  name: 'provider:test',
  description: 'Test connection to AI providers.',
  arguments: '[instanceId]',
  argsDescription: {
    provider: 'Specific provider instance ID. Test all if omitted.',
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

      const instanceId = this.resolveInstanceId(options, passedParams);

      if (instanceId) {
        await this.testSingleProvider(instanceId, config);
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
  parseProvider(val: string): ProviderInstanceId {
    return asProviderInstanceId(val.trim());
  }

  private resolveInstanceId(
    options?: ProviderTestOptions,
    passedParams?: string[],
  ): ProviderInstanceId | undefined {
    const raw = options?.provider ?? passedParams?.[0]?.trim();
    return raw ? asProviderInstanceId(raw) : undefined;
  }

  private async testSingleProvider(
    instanceId: ProviderInstanceId,
    config: GatewayConfig,
  ): Promise<void> {
    const provider = config.providers[instanceId];
    if (!provider) {
      CliLogger.error(`Provider "${instanceId}" not found in configuration.`);
      process.exit(1);
    }

    CliLogger.section(`Testing provider: ${instanceId}`);
    const spinner = CliLogger.spinner(`Connecting to ${instanceId}...`);

    const apiKey = process.env[provider.apiKeyRef] ?? '';

    if (isApiKeyRequiredForProviderType(provider.type) && !apiKey.trim()) {
      spinner.fail('API key not found.');
      CliLogger.error(
        `Please ensure ${provider.apiKeyRef} is set in your .env file.`,
      );
      process.exit(1);
    }

    const success = await this.runProviderTest(
      provider,
      apiKey,
      spinner,
      instanceId,
      config,
    );
    if (!success) {
      process.exit(1);
    }

    spinner.succeed(`${instanceId} connection successful!`);
    CliLogger.blank();
  }

  private async testAllProviders(config: GatewayConfig): Promise<void> {
    CliLogger.section('Testing All Providers.');

    const results: Array<{ name: string; success: boolean }> = [];

    for (const [name, provider] of Object.entries(config.providers)) {
      const instanceId = asProviderInstanceId(name);
      const spinner = CliLogger.spinner(`Testing ${name}...`);
      const apiKey = process.env[provider.apiKeyRef] ?? '';

      if (isApiKeyRequiredForProviderType(provider.type) && !apiKey.trim()) {
        spinner.fail(`${name} API key not found.`);
        results.push({ name, success: false });
        continue;
      }

      if (
        isOpenAiProviderType(provider.type) &&
        provider.baseUrlRef &&
        !process.env[provider.baseUrlRef]?.trim()
      ) {
        spinner.fail(`${name} base URL not found.`);
        results.push({ name, success: false });
        continue;
      }

      const success = await this.runProviderTest(
        provider,
        apiKey,
        spinner,
        instanceId,
        config,
      );
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

  private async runProviderTest(
    provider: GatewayConfig['providers'][string],
    apiKey: string,
    spinner: ReturnType<typeof CliLogger.spinner>,
    instanceId: ProviderInstanceId,
    config: GatewayConfig,
  ): Promise<boolean> {
    const brandedApiKey = asProviderApiKey(apiKey.trim());

    if (provider.type === 'anthropic') {
      return this.tester.testAnthropic(brandedApiKey);
    }

    if (provider.type === 'google') {
      return this.tester.testGoogle(brandedApiKey);
    }

    if (provider.type === 'openai' || provider.type === 'openai-compatible') {
      const baseUrlRef = provider.baseUrlRef;
      const baseUrl = baseUrlRef ? process.env[baseUrlRef] : undefined;
      if (!baseUrl?.trim()) {
        spinner.fail('Base URL not found.');
        CliLogger.error(
          `Please ensure ${baseUrlRef} is set in your .env file.`,
        );
        return false;
      }

      if (provider.type === 'openai') {
        return this.tester.testOpenAi(brandedApiKey, asBaseUrl(baseUrl.trim()));
      }

      if (provider.type === 'openai-compatible') {
        return this.tester.testOpenAiCompatible(
          brandedApiKey,
          asBaseUrl(baseUrl.trim()),
          instanceId,
          config,
        );
      }
    }

    spinner.fail(`Unknown provider type: ${String(provider.type)}`);
    return false;
  }
}
