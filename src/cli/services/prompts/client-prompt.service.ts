import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { assertInteractiveAllowed } from '../../agent/inquirer-guard';
import { CliLogger } from '../../utils/cli-logger.util';
import {
  GATEWAY_CLIENT_TYPES,
  type GatewayClientType,
} from 'src/config/configuration.types';
import type { GatewayClient } from '../cli.services.types';
import { KeyGeneratorService } from '../key-generator.service';
import {
  asClientId,
  asEnvRef,
  asGatewayKey,
  asMaxConcurrentStreams,
  asRateLimitBurst,
  asRateLimitRps,
} from '../../../common/types/branded.types';

export type ClientPromptResult = GatewayClient;

type ClientBasicAnswers = {
  id: string;
  name: string;
  type: GatewayClientType;
  addRateLimit: boolean;
};

type RateLimitAnswers = {
  rps: number;
  burst: number;
  maxConcurrentStreams: number;
};

@Injectable()
export class ClientPromptService {
  async promptClients(
    keyGenerator: KeyGeneratorService,
  ): Promise<ClientPromptResult[]> {
    assertInteractiveAllowed('ClientPromptService.promptClients');
    CliLogger.section('Step 4/5: Clients');
    console.log(
      chalk.dim(
        'Configure clients that will connect to the gateway. At least one client is required. \n',
      ),
    );

    const clients: ClientPromptResult[] = [];
    let addMore = true;

    while (addMore) {
      const clientAnswers = await inquirer.prompt<ClientBasicAnswers>([
        {
          type: 'input',
          name: 'id',
          message: 'Client ID (e.g, "webapp")',
          validate: (input: string) => {
            const trimmed = String(input).trim();
            if (!trimmed) {
              return 'Client ID is required.';
            }
            if (clients.some((client) => client.id === trimmed)) {
              return 'Client ID must be unique.';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'name',
          message: 'Client name (e.g, "My web app")',
          validate: (input: string) => {
            if (!input || String(input).trim() === '') {
              return 'Client name is required.';
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'type',
          message: 'Client type:',
          choices: GATEWAY_CLIENT_TYPES.map((type) => {
            return { value: type, name: type };
          }),
          default: 'webapp',
        },
        {
          type: 'confirm',
          name: 'addRateLimit',
          message: 'Configure rate limit for this client?',
          default: false,
        },
      ]);

      let rateLimit:
        | {
            rps: number;
            burst: number;
            maxConcurrentStreams?: number;
          }
        | undefined = undefined;
      if (clientAnswers.addRateLimit) {
        console.log(chalk.dim('\nRate limiting configuration:'));
        console.log(chalk.dim('  • Development: 10-50 rps'));
        console.log(chalk.dim('  • Production: 100-1000 rps'));
        console.log(chalk.dim('  • Burst: typically same as rps or 2x rps\n'));

        const rateLimitAnswers = await inquirer.prompt<RateLimitAnswers>([
          {
            type: 'number',
            name: 'rps',
            message: 'Requests per second (rps):',
            default: 10,
            validate: (input: number) => {
              if (input <= 0) return 'RPS must be greater than 0.';
              return true;
            },
          },
          {
            type: 'number',
            name: 'burst',
            message: 'Burst capacity (max queued requests):',
            default: 20,
            validate: (input: number) => {
              if (input <= 0) return 'Burst must be greater than 0.';
              return true;
            },
          },
          {
            type: 'number',
            name: 'maxConcurrentStreams',
            message: 'Max concurrent streams (minimum 1):',
            default: 3,
            validate: (input: number) => {
              if (input < 1)
                return 'Max concurrent streams must be at least 1.';
              return true;
            },
          },
        ]);

        rateLimit = {
          rps: rateLimitAnswers.rps,
          burst: rateLimitAnswers.burst,
          maxConcurrentStreams: rateLimitAnswers.maxConcurrentStreams,
        };
      }

      const gatewayKey = keyGenerator.generateGatewayClientKey(
        clientAnswers.id.trim(),
      );
      console.log(chalk.green(`\n✓ Generated gateway key\n`));

      clients.push({
        id: asClientId(clientAnswers.id.trim()),
        name: clientAnswers.name.trim(),
        type: clientAnswers.type,
        gatewayKeyRef: asEnvRef(
          `GATEWAY_KEY_${clientAnswers.id.trim().toUpperCase().replace(/-/g, '_')}`,
        ),
        gatewayKey: asGatewayKey(gatewayKey),
        rateLimit: rateLimit
          ? {
              rps: asRateLimitRps(rateLimit.rps),
              burst: asRateLimitBurst(rateLimit.burst),
              maxConcurrentStreams: rateLimit.maxConcurrentStreams
                ? asMaxConcurrentStreams(rateLimit.maxConcurrentStreams)
                : undefined,
            }
          : undefined,
      });

      if (clients.length > 0) {
        const { addAnother } = await inquirer.prompt<{ addAnother: boolean }>([
          {
            type: 'confirm',
            name: 'addAnother',
            message: 'Add another client?',
            default: false,
          },
        ]);
        addMore = addAnother;
      }
    }

    console.log(chalk.green(`\n✓ Configured ${clients.length} client(s)\n`));
    return clients;
  }
}
