import { Command, CommandRunner, Option } from 'nest-commander';
import { KeyGeneratorService } from 'src/cli/services/key-generator.service';
import { EnvPatchService } from 'src/cli/services/env-patch.service';
import chalk from 'chalk';
import boxen from 'boxen';
import { CliLogger } from 'src/cli/utils/cli-logger.util';
import {
  asClientId,
  asEnvRef,
  type ClientId,
  type EnvRef,
  type GatewayKey,
} from 'src/common/types/branded.types';
import {
  markAgentRuntime,
  resolveCliMode,
  type CliModeFlags,
} from 'src/cli/agent/resolve-cli-mode';
import { exitWithAgentReport } from 'src/cli/agent/agent-report';

type KeyType = 'master' | 'client';

interface KeyGenerateOptions extends CliModeFlags {
  type?: KeyType;
  clientId?: ClientId;
  writeEnv?: boolean;
}

@Command({
  name: 'key:generate',
  description: 'Generate a secure gateway key (master or client)',
  arguments: '[type] [clientId]',
  argsDescription: {
    type: 'Key type: master or client.',
    clientId: 'Client ID (required when type is client).',
  },
})
export class KeyGenerateCommand extends CommandRunner {
  constructor(
    private readonly keyGenerator: KeyGeneratorService,
    private readonly envPatch: EnvPatchService,
  ) {
    super();
  }

  async run(
    passedParams: string[],
    options?: KeyGenerateOptions,
  ): Promise<void> {
    const mode = resolveCliMode(options ?? {});
    markAgentRuntime(mode);
    CliLogger.setJsonSafe(mode.json || mode.isAgent);

    try {
      const type = options?.type ?? (passedParams[0] as KeyType | undefined);
      const rawClientId = options?.clientId ?? passedParams[1]?.trim();

      if (!type || (type !== 'master' && type !== 'client')) {
        if (mode.isAgent) {
          exitWithAgentReport(
            {
              ok: false,
              status: 'error',
              command: 'key:generate',
              errors: [
                'Key type is required (master|client). Usage: gateway key:generate --agent --write-env --type <master|client> [--client-id <id>]',
              ],
            },
            true,
          );
          return;
        }
        CliLogger.error('Key type is required.');
        CliLogger.info(
          'Usage: gateway key:generate --type <master|client> [--client-id <id>]',
        );
        CliLogger.info(
          `   or: gateway key:generate <master|client> <clientId>`,
        );
        process.exit(1);
      }

      if (mode.isAgent) {
        await this.runAgentGenerate(type, rawClientId, options);
        return;
      }

      CliLogger.section(
        type === 'master' ? 'Generate Master key' : 'Generate Client key',
      );
      const spinner = CliLogger.spinner('Generating key...');

      let key: GatewayKey;
      let envHint: string;

      if (type === 'master') {
        key = this.keyGenerator.generateMasterKey();
        envHint = `Add to .env: MASTER_KEY=<key>`;
      } else {
        if (!rawClientId) {
          spinner.stop();
          CliLogger.error('CLient ID is required.');
          CliLogger.info(
            'Usage: gateway key:generate --type client --client-id <clientId>',
          );
          process.exit(1);
        }

        const clientId = asClientId(rawClientId);
        key = this.keyGenerator.generateGatewayClientKey(clientId);
        const envRef = this.deriveGatewayKeyRef(clientId);
        envHint = `Add to .env: ${envRef}=<key>`;
      }

      spinner.succeed('Key generated successfully.');

      const message = boxen(chalk.green.bold(key), {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green',
        title: type === 'master' ? 'Master key' : 'Client key',
        titleAlignment: 'center',
      });

      console.log('\n' + message);
      CliLogger.dim(envHint);
      CliLogger.warning(
        'Key is visible in the terminal - avoid shared screens or logs.',
      );
      CliLogger.blank();
    } catch (error) {
      if (mode.isAgent) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'key:generate',
            errors: [
              error instanceof Error
                ? error.message
                : 'Unknown error occurred.',
            ],
          },
          true,
        );
        return;
      }
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
  }

  private async runAgentGenerate(
    type: KeyType,
    rawClientId: string | undefined,
    options: KeyGenerateOptions | undefined,
  ): Promise<void> {
    if (!options?.writeEnv) {
      exitWithAgentReport(
        {
          ok: false,
          status: 'error',
          command: 'key:generate',
          errors: [
            'In agent mode use --write-env to save the key without printing it. Or use config:init / client:add generateKey.',
          ],
        },
        true,
      );
      return;
    }

    const cwd = process.cwd();
    let key: GatewayKey;
    let envRef: EnvRef;

    if (type === 'master') {
      key = this.keyGenerator.generateMasterKey();
      envRef = asEnvRef('MASTER_KEY');
    } else {
      if (!rawClientId) {
        exitWithAgentReport(
          {
            ok: false,
            status: 'error',
            command: 'key:generate',
            errors: [
              'Client ID is required when type is client. Usage: gateway key:generate --agent --write-env --type client --client-id <id>',
            ],
          },
          true,
        );
        return;
      }
      const clientId = asClientId(rawClientId);
      key = this.keyGenerator.generateGatewayClientKey(clientId);
      envRef = this.deriveGatewayKeyRef(clientId);
    }

    await this.envPatch.setVar(cwd, envRef, key);

    exitWithAgentReport(
      {
        ok: true,
        status: 'success',
        command: 'key:generate',
        files: ['.env'],
        generatedKeyRefs: [envRef],
        next: ['gateway config:secrets-status --json'],
      },
      true,
    );
  }

  private deriveGatewayKeyRef(clientId: ClientId): EnvRef {
    return asEnvRef(
      `GATEWAY_KEY_${clientId.trim().toUpperCase().replace(/-/g, '_')}`,
    );
  }

  @Option({
    flags: '-t, --type <type>',
    description: 'key type: master or client',
  })
  parseType(val: string): KeyType {
    const type = val.toLowerCase().trim();
    if (type !== 'master' && type !== 'client') {
      throw new Error('Type must be "master" of "client"');
    }
    return type;
  }

  @Option({
    flags: '-c, --client-id <id>',
    description: 'Client ID (required when type is client)',
  })
  parseClientId(val: string): ClientId {
    return asClientId(val.trim());
  }

  @Option({ flags: '--agent', description: 'Non-interactive agent mode' })
  parseAgent(): boolean {
    return true;
  }

  @Option({ flags: '--json', description: 'JSON report on stdout' })
  parseJson(): boolean {
    return true;
  }

  @Option({
    flags: '--write-env',
    description: 'Write generated key to .env under derived ref',
  })
  parseWriteEnv(): boolean {
    return true;
  }
}
