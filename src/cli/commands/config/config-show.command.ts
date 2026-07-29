import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from '../../services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { resolveCliMode } from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import chalk from 'chalk';
import type { GatewayConfig } from 'src/config/gateway-config.schema';

interface ConfigShowOptions {
  json?: boolean;
}

/** Structural snapshot: refs only — never env values. */
function toSafeConfigSnapshot(config: GatewayConfig) {
  return {
    schemaVersion: config.schemaVersion,
    masterKeyRef: config.masterKeyRef,
    providers: Object.fromEntries(
      Object.entries(config.providers).map(([id, provider]) => [
        id,
        {
          type: provider.type,
          enabled: provider.enabled !== false,
          apiKeyRef: provider.apiKeyRef,
          ...(provider.baseUrlRef ? { baseUrlRef: provider.baseUrlRef } : {}),
          ...(provider.apiSurface ? { apiSurface: provider.apiSurface } : {}),
        },
      ]),
    ),
    models: Object.fromEntries(
      Object.entries(config.models).map(([alias, model]) => [
        alias,
        {
          providerInstance: model.providerInstance,
          modelId: model.modelId,
          ...(model.fallback ? { fallback: model.fallback } : {}),
          ...(model.capabilities ? { capabilities: model.capabilities } : {}),
        },
      ]),
    ),
    clients: Object.fromEntries(
      Object.entries(config.clients).map(([id, client]) => [
        id,
        {
          name: client.name,
          type: client.type,
          gatewayKeyRef: client.gatewayKeyRef,
          ...(client.rateLimit ? { rateLimit: client.rateLimit } : {}),
        },
      ]),
    ),
  };
}

@Command({
  name: 'config:show',
  description: 'Display parsed gateway configuration.',
})
export class ConfigShowCommand extends CommandRunner {
  constructor(private readonly cliLoader: CliConfigLoaderService) {
    super();
  }

  run(_params: string[], options?: ConfigShowOptions): Promise<void> {
    const mode = resolveCliMode({ json: options?.json });
    CliLogger.setJsonSafe(mode.json);

    try {
      const config = this.cliLoader.loadRawConfig();

      if (mode.json) {
        process.stdout.write(
          JSON.stringify(toSafeConfigSnapshot(config), null, 2) + '\n',
        );
        return Promise.resolve();
      }

      CliLogger.section('Gateway configuration.');

      console.log(chalk.bold('\nProviders:'));
      Object.entries(config.providers).forEach(([id, provider]) => {
        console.log(
          chalk.cyan(`  • ${id}`) +
            chalk.dim(
              ` (${provider.type}, enabled: ${provider.enabled !== false})`,
            ),
        );
        console.log(chalk.dim(`    API Key Ref: ${provider.apiKeyRef}`));
      });

      console.log(chalk.bold('\nModels:'));
      Object.entries(config.models).forEach(([alias, model]) => {
        console.log(
          chalk.cyan(`  • ${alias}`) +
            chalk.dim(` → ${model.providerInstance}/${model.modelId}`),
        );
        if (model.fallback) {
          console.log(chalk.dim(`   Fallback: ${model.fallback}`));
        }
      });

      console.log(chalk.bold('\nClients:'));
      Object.entries(config.clients).forEach(([id, client]) => {
        console.log(
          chalk.cyan(`  • ${id}`) +
            chalk.dim(` (${client.type}) - ${client.name}`),
        );
        console.log(chalk.dim(`    Gateway Key Ref: ${client.gatewayKeyRef}`));
        if (client.rateLimit) {
          console.log(chalk.dim(`    Rate Limit: ${client.rateLimit.rps} rps`));
        }
      });

      console.log(chalk.bold('\nMaster key:'));
      console.log(chalk.dim(`  Reference: ${config.masterKeyRef}`));

      if (this.cliLoader.isBoilerplateConfig()) {
        CliLogger.blank();
        CliLogger.warning('Boilerplate configuration detected.');
        CliLogger.info(
          'Run "gateway config:init" to create a full configuration.',
        );
      }

      CliLogger.blank();
      return Promise.resolve();
    } catch (error) {
      if (mode.json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'config:show',
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
}
