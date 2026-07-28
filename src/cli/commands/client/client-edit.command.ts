import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ClientManagerService } from 'src/cli/services/client-manager.service';
import { KeyGeneratorService } from 'src/cli/services/key-generator.service';
import {
  asClientId,
  asMaxConcurrentStreams,
  asRateLimitBurst,
  asRateLimitRps,
} from 'src/common/types/branded.types';
import {
  assertAgentHasAnswers,
  markAgentRuntime,
  resolveCliMode,
  type CliModeFlags,
} from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import { loadAnswers } from 'src/cli/agent/load-answers';
import { ClientEditAnswersSchema } from 'src/cli/schemas/agent-answers.schema';
import type { EditClientInput } from 'src/cli/types/cli-apply.types';

@Command({
  name: 'client:edit',
  description: 'Edit client (name, type, rate limit or rotate gateway key)',
  arguments: '[clientId]',
  argsDescription: {
    clientId: 'Client ID to edit.',
  },
})
export class ClientEditCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly clientManager: ClientManagerService,
    private readonly keyGenerator: KeyGeneratorService,
  ) {
    super();
  }

  async run(passedParams: string[], options?: CliModeFlags): Promise<void> {
    const mode = resolveCliMode(options ?? {});
    markAgentRuntime(mode);
    CliLogger.setJsonSafe(mode.json || mode.isAgent);

    try {
      const rawClientId = passedParams[0]?.trim();
      if (!mode.isAgent && !rawClientId) {
        CliLogger.error('Client ID is required.');
        CliLogger.info('Usage: gateway client:edit <clientId>');
        process.exit(1);
      }

      if (!this.cliLoader.configExists()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'client:edit',
              errors: [
                'Configuration not found. Run gateway config:init first.',
              ],
              next: ['gateway config:init'],
            },
            mode.json,
          );
          return;
        }
        CliLogger.error(
          'Configuration not found. Run gateway config:init first.',
        );
        process.exit(1);
      }

      if (this.cliLoader.isBoilerplateConfig()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'client:edit',
              errors: [
                'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
              ],
              next: ['gateway config:init'],
            },
            mode.json,
          );
          return;
        }
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        CliLogger.blank();
        return;
      }

      const config = this.cliLoader.loadRawConfig();
      const cwd = process.cwd();

      if (mode.isAgent) {
        assertAgentHasAnswers(mode, 'client:edit');
        const answers = loadAnswers(ClientEditAnswersSchema, mode.answersPath!);
        const id = asClientId(answers.id);

        const input: EditClientInput = {
          id,
          action: answers.action,
          name: answers.name,
          type: answers.type,
          rateLimit:
            answers.rateLimit === null
              ? null
              : answers.rateLimit
                ? {
                    rps: asRateLimitRps(answers.rateLimit.rps),
                    burst: asRateLimitBurst(answers.rateLimit.burst),
                    maxConcurrentStreams: answers.rateLimit.maxConcurrentStreams
                      ? asMaxConcurrentStreams(
                          answers.rateLimit.maxConcurrentStreams,
                        )
                      : undefined,
                  }
                : undefined,
          gatewayKey:
            answers.action === 'rotateKey'
              ? this.keyGenerator.generateGatewayClientKey(id)
              : undefined,
        };

        const result = await this.clientManager.applyEditClient(
          config,
          cwd,
          input,
        );

        exitWithAgentReport(
          {
            ok: true,
            status: 'success',
            command: 'client:edit',
            files: result.filesTouched,
            generatedKeyRefs: result.generatedKeyRefs,
            next: ['gateway config:validate'],
          },
          mode.json,
        );
        return;
      }

      const clientId = asClientId(rawClientId);
      await this.clientManager.editClient(config, clientId, cwd);
    } catch (error) {
      if (mode.isAgent) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'client:edit',
            errors: [error instanceof Error ? error.message : String(error)],
          },
          mode.json,
        );
        return;
      }
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
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

  @Option({ flags: '--force', description: 'Skip confirms / overwrite' })
  parseForce(): boolean {
    return true;
  }

  @Option({ flags: '-y, --yes', description: 'Alias for --force' })
  parseYes(): boolean {
    return true;
  }
}
