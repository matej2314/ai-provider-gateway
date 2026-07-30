import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { ProviderTestService } from 'src/cli/services/provider-test.service';
import { EnvPatchService } from 'src/cli/services/env-patch.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { resolveCliMode } from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import { collectPendingSecrets } from 'src/cli/agent/pending-secrets';
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
  json?: boolean;
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
    private readonly envPatch: EnvPatchService,
  ) {
    super();
  }

  async run(
    passedParams: string[],
    options?: ProviderTestOptions,
  ): Promise<void> {
    const mode = resolveCliMode({ json: options?.json });
    CliLogger.setJsonSafe(mode.json);

    try {
      const { config, missingEnvVars } = this.cliLoader.loadWithEnvCheck();

      if (this.cliLoader.isBoilerplateConfig()) {
        if (mode.json) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'provider:test',
              errors: ['Boilerplate configuration detected.'],
              next: ['gateway config:init'],
            },
            true,
          );
        }
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        process.exit(1);
      }

      if (missingEnvVars.length > 0) {
        if (mode.json) {
          const pending = await collectPendingSecrets(
            config,
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
              status: 'awaiting_secrets',
              command: 'provider:test',
              pendingSecrets: pending.length
                ? pending
                : missingEnvVars.map((envRef) => ({
                    envRef,
                    file: '.env' as const,
                    reason: 'provider_api_key' as const,
                  })),
              next: [
                'HUMAN HANDOFF: paste operator values into .env for each pendingSecrets[].envRef. Do NOT paste values into chat.',
                'After the user confirms locally: gateway config:secrets-status --json',
              ],
            },
            true,
          );
        }
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
        await this.testSingleProvider(instanceId, config, mode.json);
      } else {
        await this.testAllProviders(config, mode.json);
      }
    } catch (err) {
      if (mode.json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'provider:test',
            errors: [
              err instanceof Error ? err.message : 'Unknown error occurred.',
            ],
          },
          true,
        );
        return;
      }
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

  @Option({ flags: '--json', description: 'Machine-readable JSON on stdout' })
  parseJson(): boolean {
    return true;
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
    json: boolean,
  ): Promise<void> {
    const provider = config.providers[instanceId];
    if (!provider) {
      if (json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'provider:test',
            errors: [`Provider "${instanceId}" not found in configuration.`],
          },
          true,
        );
        return;
      }
      CliLogger.error(`Provider "${instanceId}" not found in configuration.`);
      process.exit(1);
    }

    if (!json) {
      CliLogger.section(`Testing provider: ${instanceId}`);
    }
    const spinner = CliLogger.spinner(`Connecting to ${instanceId}...`);

    const apiKey = process.env[provider.apiKeyRef] ?? '';

    if (isApiKeyRequiredForProviderType(provider.type) && !apiKey.trim()) {
      spinner.fail('API key not found.');
      if (json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'provider:test',
            errors: [
              `API key not found for ${instanceId} (envRef: ${provider.apiKeyRef}).`,
            ],
            next: [
              `Ensure ${provider.apiKeyRef} is set in .env`,
              'gateway config:secrets-status --json',
            ],
          },
          true,
        );
        return;
      }
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
      if (json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'provider:test',
            errors: [`${instanceId}: connection failed`],
          },
          true,
        );
        return;
      }
      process.exit(1);
    }

    spinner.succeed(`${instanceId} connection successful!`);
    if (json) {
      exitWithAgentReport(
        {
          ok: true,
          status: 'success',
          command: 'provider:test',
        },
        true,
      );
      return;
    }
    CliLogger.blank();
  }

  private async testAllProviders(
    config: GatewayConfig,
    json: boolean,
  ): Promise<void> {
    if (!json) {
      CliLogger.section('Testing All Providers.');
    }

    const results: Array<{ name: string; success: boolean; error?: string }> =
      [];

    for (const [name, provider] of Object.entries(config.providers)) {
      const instanceId = asProviderInstanceId(name);
      const spinner = CliLogger.spinner(`Testing ${name}...`);
      const apiKey = process.env[provider.apiKeyRef] ?? '';

      if (isApiKeyRequiredForProviderType(provider.type) && !apiKey.trim()) {
        spinner.fail(`${name} API key not found.`);
        results.push({
          name,
          success: false,
          error: `API key not found (envRef: ${provider.apiKeyRef})`,
        });
        continue;
      }

      if (
        isOpenAiProviderType(provider.type) &&
        provider.baseUrlRef &&
        !process.env[provider.baseUrlRef]?.trim()
      ) {
        spinner.fail(`${name} base URL not found.`);
        results.push({
          name,
          success: false,
          error: `Base URL not found (envRef: ${provider.baseUrlRef})`,
        });
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
        results.push({ name, success: true });
      } else {
        spinner.fail(`${name} - Failed`);
        results.push({ name, success: false, error: 'connection failed' });
      }
    }

    const allSuccess = results.every((r) => r.success);

    if (json) {
      exitWithAgentReport(
        {
          ok: allSuccess,
          status: allSuccess ? 'success' : 'error',
          command: 'provider:test',
          errors: allSuccess
            ? undefined
            : results
                .filter((r) => !r.success)
                .map((r) => `${r.name}: ${r.error ?? 'failed'}`),
        },
        true,
      );
      return;
    }

    CliLogger.blank();
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
