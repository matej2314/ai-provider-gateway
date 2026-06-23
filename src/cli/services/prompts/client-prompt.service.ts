import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { CliLogger } from '../../utils/cli-logger.util';
import { GATEWAY_CLIENT_TYPES } from 'src/config/configuration.types';
import type { GatewayClient } from '../cli.services.types';
import { KeyGeneratorService } from '../key-generator.service';

export type ClientPromptResult = GatewayClient;

@Injectable()
export class ClientPromptService {
  async promptClients(
    keyGenerator: KeyGeneratorService,
  ): Promise<ClientPromptResult[]> {
    CliLogger.section('Step 4/5: Clients');
    console.log(
      chalk.dim(
        'Configure clients that will connect to the gateway. At least one client is required. \n',
      ),
    );

    const clients: ClientPromptResult[] = [];
    let addMore = true;

    while (addMore) {
      const clientAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'id',
          message: 'Client ID (e.g, "webapp")',
          validate: (input) => {
            if (!input || input.trim() === '') {
              return 'Client ID is required.';
            }
            if (clients.some((client) => client.id === input)) {
              return 'Client ID must be unique.';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'name',
          message: 'Client name (e.g, "My web app")',
          validate: (input) => {
            if (!input || input.trim() === '') {
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

        const rateLimitAnswers = await inquirer.prompt([
          {
            type: 'number',
            name: 'rps',
            message: 'Requests per second (rps):',
            default: 10,
            validate: (input) => {
              if (input <= 0) return 'RPS must be greater than 0.';
              return true;
            },
          },
          {
            type: 'number',
            name: 'burst',
            message: 'Burst capacity (max queued requests):',
            default: 20,
            validate: (input) => {
              if (input <= 0) return 'Burst must be greater than 0.';
              return true;
            },
          },
          {
            type: 'number',
            name: 'maxConcurrentStreams',
            message: 'Max concurrent streams ( 0 to disable):',
            default: 0,
            validate: (input) => {
              if (input < 0)
                return 'Max concurrent streams must be 0 or positive.';
              return true;
            },
          },
        ]);

        rateLimit = {
          rps: rateLimitAnswers.rps,
          burst: rateLimitAnswers.burst,
          ...(rateLimitAnswers.maxConcurrentStreams > 0 && {
            maxConcurrentStreams: rateLimitAnswers.maxConcurrentStreams,
          }),
        };
      }

      const gatewayKey = keyGenerator.generateGatewayClientKey(
        clientAnswers.id.trim(),
      );
      console.log(chalk.green(`\n✓ Generated gateway key\n`));

      clients.push({
        id: clientAnswers.id.trim(),
        name: clientAnswers.name.trim(),
        type: clientAnswers.type,
        gatewayKeyRef: `GATEWAY_KEY_${clientAnswers.id.trim().toUpperCase().replace(/-/g, '_')}`,
        gatewayKey,
        rateLimit,
      });

      if (clients.length > 0) {
        const { addAnother } = await inquirer.prompt([
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
