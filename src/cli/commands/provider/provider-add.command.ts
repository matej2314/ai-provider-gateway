import { Command, CommandRunner, Option } from 'nest-commander';
import { CliConfigLoaderService } from 'src/cli/services/cli-config-loader.service';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import { ProviderManagerService } from 'src/cli/services/provider-manager.service';
import { deriveBaseUrlRef } from 'src/cli/utils/provider-id.util';
import { isOpenAiProviderType } from 'src/config/provider-types';
import {
  asModelAlias,
  asModelId,
  asProviderApiKey,
  asProviderInstanceId,
} from 'src/common/types';
import {
  assertAgentHasAnswers,
  markAgentRuntime,
  resolveCliMode,
  type CliModeFlags,
} from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';
import { loadAnswers } from 'src/cli/agent/load-answers';
import { ProviderAddAnswersSchema } from 'src/cli/schemas/agent-answers.schema';
import type { AddProviderInput } from 'src/cli/types/cli-apply.types';

@Command({
  name: 'provider:add',
  description:
    'Add a new provider instance. Ensures at least one model is linked.',
})
export class ProviderAddCommand extends CommandRunner {
  constructor(
    private readonly cliLoader: CliConfigLoaderService,
    private readonly providerManager: ProviderManagerService,
  ) {
    super();
  }

  async run(_params: string[], options?: CliModeFlags): Promise<void> {
    const mode = resolveCliMode(options ?? {});
    markAgentRuntime(mode);
    CliLogger.setJsonSafe(mode.json || mode.isAgent);

    try {
      if (!this.cliLoader.configExists()) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'provider:add',
              errors: [
                'Configuration not found. Run gateway config:init first.',
              ],
              next: ['gateway config:init'],
            },
            mode.json,
          );
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
              command: 'provider:add',
              errors: [
                'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
              ],
              next: ['gateway config:init'],
            },
            mode.json,
          );
        }
        CliLogger.warning(
          'Boilerplate configuration detected. Run gateway config:init to create a full configuration.',
        );
        process.exit(1);
      }

      const config = this.cliLoader.loadRawConfig();
      const cwd = process.cwd();

      if (mode.isAgent) {
        if (!mode.deferSecrets) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'provider:add',
              errors: [
                'Agent mode requires secret deferral (default). Operator values must be pasted into .env by the user — never via answers.',
              ],
            },
            mode.json,
          );
        }

        assertAgentHasAnswers(mode, 'provider:add');
        const answers = loadAnswers(
          ProviderAddAnswersSchema,
          mode.answersPath!,
        );
        const id = asProviderInstanceId(answers.id);
        const apiKeyRef = this.providerManager.deriveApiKeyRef(id);
        const baseUrlRef = isOpenAiProviderType(answers.type)
          ? deriveBaseUrlRef(id)
          : undefined;

        const input: AddProviderInput = {
          id,
          type: answers.type,
          enabled: answers.enabled !== false,
          apiKeyRef,
          apiKey: asProviderApiKey(''),
          baseUrlRef,
          baseUrl: undefined,
          models: [
            {
              alias: asModelAlias(answers.ensureModel.alias),
              modelId: asModelId(answers.ensureModel.modelId),
            },
          ],
        };

        const result = await this.providerManager.applyAddProvider(
          config,
          cwd,
          input,
        );

        exitWithAgentReport(
          {
            ok: true,
            status: result.pendingSecrets?.length
              ? 'awaiting_secrets'
              : 'success',
            command: 'provider:add',
            files: result.filesTouched,
            pendingSecrets: result.pendingSecrets,
            next: result.pendingSecrets?.length
              ? [
                  'HUMAN HANDOFF: paste operator values into .env for each pendingSecrets[].envRef. Do NOT paste values into chat.',
                  'After the user confirms locally: gateway config:secrets-status --json',
                ]
              : ['gateway config:validate', 'gateway provider:test'],
          },
          mode.json,
        );
      }

      await this.providerManager.addProvider(config, cwd, {
        deferSecrets: mode.deferSecrets,
      });
    } catch (error) {
      if (mode.isAgent) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'provider:add',
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
