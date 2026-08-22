import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { resolveCliMode } from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import chalk from 'chalk';
import type { GatewayConfig } from 'src/config/gateway-config.schema';

interface ProviderListOptions {
  json?: boolean;
}

/** Structural provider rows: refs only — never env values. */
function toSafeProviderList(config: GatewayConfig) {
  return Object.entries(config.providers).map(([id, provider]) => ({
    id,
    type: provider.type,
    enabled: provider.enabled !== false,
    apiKeyRef: provider.apiKeyRef,
    ...(provider.baseUrlRef ? { baseUrlRef: provider.baseUrlRef } : {}),
    ...(provider.apiSurface ? { apiSurface: provider.apiSurface } : {}),
  }));
}

@Command({
  name: 'provider:list',
  description: 'List configured AI providers.',
})
export class ProviderListCommand extends CommandRunner {
  constructor(private readonly cliLoader: CliConfigLoaderService) {
    super();
  }

  run(_params: string[], options?: ProviderListOptions): Promise<void> {
    const mode = resolveCliMode({ json: options?.json });
    CliLogger.setJsonSafe(mode.json);

    try {
      if (this.cliLoader.isBoilerplateConfig()) {
        if (mode.json) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'provider:list',
              errors: ['Boilerplate configuration detected.'],
              next: ['gateway config:init'],
            },
            true,
          );
          return Promise.resolve();
        }
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        process.exit(1);
      }

      const config = this.cliLoader.loadRawConfig();
      const providers = toSafeProviderList(config);

      if (mode.json) {
        process.stdout.write(JSON.stringify({ providers }, null, 2) + '\n');
        return Promise.resolve();
      }

      CliLogger.section('Configured AI Providers:');

      if (providers.length === 0) {
        CliLogger.warning('No providers configured.');
        return Promise.resolve();
      }

      providers.forEach((provider) => {
        const statusColor = provider.enabled ? 'green' : 'red';

        console.log(
          chalk[statusColor]('•') +
            ' ' +
            chalk.cyan(provider.id) +
            chalk.dim(` (${provider.type})`),
        );
        console.log(chalk.dim(`    API Key Ref: ${provider.apiKeyRef}`));
        console.log(
          chalk.dim(`    Enabled: ${provider.enabled ? 'Yes' : 'No'}`),
        );
        console.log(
          chalk.dim(`Models count: ${Object.keys(config.models).length}`),
        );
        console.log('');
      });
      return Promise.resolve();
    } catch (err) {
      if (mode.json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'provider:list',
            errors: [
              err instanceof Error ? err.message : 'Unknown error occurred.',
            ],
          },
          true,
        );
        return Promise.resolve();
      }
      CliLogger.error(
        err instanceof Error ? err.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }

  @Option({ flags: '--json', description: 'Machine-readable JSON on stdout' })
  parseJson(): boolean {
    return true;
  }
}
