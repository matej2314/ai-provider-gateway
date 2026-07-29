import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { resolveCliMode } from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import chalk from 'chalk';
import type { GatewayConfig } from 'src/config/gateway-config.schema';

interface ClientListOptions {
  json?: boolean;
}

/** Structural client rows: refs only — never env values. */
function toSafeClientList(config: GatewayConfig) {
  return Object.entries(config.clients).map(([id, client]) => ({
    id,
    name: client.name,
    type: client.type,
    gatewayKeyRef: client.gatewayKeyRef,
    ...(client.rateLimit ? { rateLimit: client.rateLimit } : {}),
  }));
}

@Command({
  name: 'client:list',
  description: 'List all configured clients.',
})
export class ClientListCommand extends CommandRunner {
  constructor(private readonly cliLoader: CliConfigLoaderService) {
    super();
  }

  run(_params: string[], options?: ClientListOptions): Promise<void> {
    const mode = resolveCliMode({ json: options?.json });
    CliLogger.setJsonSafe(mode.json);

    try {
      if (!this.cliLoader.configExists()) {
        if (mode.json) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'client:list',
              errors: [
                'Configuration not found. Run gateway config:init first.',
              ],
              next: ['gateway config:init'],
            },
            true,
          );
        }
        CliLogger.error(
          'Configuration not found. Run gateway config:init first.',
        );
        process.exit(1);
      }

      if (this.cliLoader.isBoilerplateConfig()) {
        if (mode.json) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'client:list',
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
      const clients = toSafeClientList(config);

      if (mode.json) {
        process.stdout.write(JSON.stringify({ clients }, null, 2) + '\n');
        return Promise.resolve();
      }

      CliLogger.section('Configured clients');

      if (clients.length === 0) {
        CliLogger.warning('No clients configured.');
        return Promise.resolve();
      }

      clients.forEach((client) => {
        console.log(
          chalk.cyan(`  • ${client.id}`) +
            chalk.dim(` (${client.type}) - ${client.name}`),
        );
        console.log(chalk.dim(`    Gateway Key Ref: ${client.gatewayKeyRef}`));
        if (client.rateLimit) {
          console.log(
            chalk.dim(
              `    Rate Limit: ${client.rateLimit.rps} rps, burst ${client.rateLimit.burst}`,
            ),
          );
        }
        if (client.rateLimit?.maxConcurrentStreams) {
          console.log(
            chalk.dim(
              `    Max Concurrent Streams: ${client.rateLimit.maxConcurrentStreams}`,
            ),
          );
        }
      });
      return Promise.resolve();
    } catch (error) {
      if (mode.json) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'client:list',
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
