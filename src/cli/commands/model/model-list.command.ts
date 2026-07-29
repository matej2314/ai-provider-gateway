import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { resolveCliMode } from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import chalk from 'chalk';
import type { GatewayConfig } from 'src/config/gateway-config.schema';

interface ModelListOptions {
  json?: boolean;
}

/** Structural model rows: refs / ids only — never env values. */
function toSafeModelList(config: GatewayConfig) {
  return Object.entries(config.models).map(([alias, model]) => ({
    alias,
    providerInstance: model.providerInstance,
    modelId: model.modelId,
    ...(model.fallback ? { fallback: model.fallback } : {}),
    ...(model.capabilities ? { capabilities: model.capabilities } : {}),
  }));
}

@Command({
  name: 'model:list',
  description: 'List all configured models.',
})
export class ModelListCommand extends CommandRunner {
  constructor(private readonly cliLoader: CliConfigLoaderService) {
    super();
  }

  run(_params: string[], options?: ModelListOptions): Promise<void> {
    const mode = resolveCliMode({ json: options?.json });
    CliLogger.setJsonSafe(mode.json);

    try {
      if (this.cliLoader.isBoilerplateConfig()) {
        if (mode.json) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'model:list',
              errors: ['Boilerplate configuration detected.'],
              next: ['gateway config:init'],
            },
            true,
          );
        }
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        CliLogger.blank();
        return Promise.resolve();
      }

      const config = this.cliLoader.loadRawConfig();
      const models = toSafeModelList(config);

      if (mode.json) {
        process.stdout.write(JSON.stringify({ models }, null, 2) + '\n');
        return Promise.resolve();
      }

      CliLogger.section('Configured AI Models');

      if (models.length === 0) {
        CliLogger.warning('No models configured.');
        return Promise.resolve();
      }

      models.forEach((model) => {
        console.log(chalk.cyan(`  • ${model.alias}`));
        console.log(chalk.dim(`  Provider: ${model.providerInstance}`));
        console.log(chalk.dim(`  Model ID: ${model.modelId}`));
        console.log(
          chalk.dim(
            ` Streaming: ${(model.capabilities?.streaming ?? true) ? 'enabled' : 'disabled'}`,
          ),
        );
        if (model.fallback) {
          console.log(chalk.dim(`   Fallback: ${model.fallback}`));
        }
        console.log('');
      });
      return Promise.resolve();
    } catch (error) {
      if (mode.json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'model:list',
            errors: [
              error instanceof Error
                ? error.message
                : 'Unknown error occurred.',
            ],
          },
          true,
        );
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
