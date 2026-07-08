import { Command, CommandRunner, Option } from 'nest-commander';
import { KeyGeneratorService } from 'src/cli/services/key-generator.service';
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

type KeyType = 'master' | 'client';

interface KeyGenerateOptions {
  type?: KeyType;
  clientId?: ClientId;
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
  constructor(private readonly keyGenerator: KeyGeneratorService) {
    super();
  }

  run(passedParams: string[], options?: KeyGenerateOptions): Promise<void> {
    try {
      const type = options?.type ?? (passedParams[0] as KeyType | undefined);
      const rawClientId = options?.clientId ?? passedParams[1]?.trim();

      if (!type || (type !== 'master' && type !== 'client')) {
        CliLogger.error('Key type is required.');
        CliLogger.info(
          'Usage: gateway key:generate --type <master|client> [--client-id <id>]',
        );
        CliLogger.info(
          `   or: gateway key:generate <master|client> <clientId>`,
        );
        process.exit(1);
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
      return Promise.resolve();
    } catch (error) {
      CliLogger.error(
        error instanceof Error ? error.message : 'Unknown error occurred.',
      );
      process.exit(1);
    }
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
}
