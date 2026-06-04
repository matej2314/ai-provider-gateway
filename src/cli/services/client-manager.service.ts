import { Injectable } from '@nestjs/common';
import { GatewayConfig } from 'src/config/gateway-config.schema';
import { CliLogger } from '../utils/cli-logger.util';
import { EnvPatchService } from './env-patch.service';
import { GATEWAY_CLIENT_TYPES } from 'src/config/configuration.types';
import { ConfigPersistenceService } from './config-persistence.service';
import chalk from 'chalk';
import * as inquirer from 'inquirer';
import type { CliRateLimit } from './cli.services.types';
import { KeyGeneratorService } from './key-generator.service';

@Injectable()
export class ClientManagerService {
  constructor(
    private readonly persistence: ConfigPersistenceService,
    private readonly envPatch: EnvPatchService,
    private readonly keyGenerator: KeyGeneratorService,
  ) {}

  deriveGatewayKeyRef(clientId: string): string {
    return `GATEWAY_KEY_${clientId.trim().toUpperCase().replace(/-/g, '_')}`;
  }

  async addClient(config: GatewayConfig, cwd: string): Promise<void> {
    CliLogger.section('Add client');

    const clientAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'id',
        message: 'Client ID (e.g. webapp)',
        validate: (input) => {
          const id = input?.trim();
          if (!id) return 'Client ID is required.';
          if (config.clients[id]) {
            return `Client ${id} already exists - use gateway client:edit command.`;
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'name',
        message: 'Client name(e.g. "My web app")',
        validate: (input) => {
          if (!input?.trim()) return 'Client name is required.';
          return true;
        },
      },
      {
        type: 'list',
        name: 'type',
        message: 'Client type:',
        choices: GATEWAY_CLIENT_TYPES.map((type) => ({
          value: type,
          name: type,
        })),
        default: 'webapp',
      },
      {
        type: 'confirm',
        name: 'addRateLimit',
        message: 'Configure rate limit for this client?',
        default: false,
      },
    ]);

    const clientId = clientAnswers.id.trim();
    let rateLimit: CliRateLimit | undefined;

    if (clientAnswers.addRateLimit) {
      console.log(chalk.dim('\nRate limitting configuration:'));
      console.log(chalk.dim('  • Development: 10-50 rps'));
      console.log(chalk.dim('  • Production: 100-1000 rps'));
      console.log(chalk.dim('  • Burst: typically same as rps or 2x rps\n'));

      const rateLimitAnswers = await inquirer.prompt([
        {
          type: 'number',
          name: 'rps',
          message: 'Requests per second (rps):',
          default: 10,
          validate: (input: number) => {
            if (!Number.isFinite(input)) return 'RPS must be a number.';
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
            if (!Number.isFinite(input)) return 'Burst must be a number.';
            if (input <= 0) return 'Burst must be greater than 0.';
            return true;
          },
        },
        {
          type: 'number',
          name: 'maxConcurrentStreams',
          message: 'Max concurrent streams (0 for default):',
          default: 0,
          validate: (input: number) => {
            if (!Number.isFinite(input))
              return 'Max concurrent streams must be a number.';
            if (input < 0)
              return 'Max concurrent streams must be 0 or positive.';
            return true;
          },
        },
      ]);

      rateLimit = {
        rps: rateLimitAnswers.rps,
        burst: rateLimitAnswers.burst,
        maxConcurrentStreams:
          rateLimitAnswers.maxConcurrentStreams > 0
            ? rateLimitAnswers.maxConcurrentStreams
            : undefined,
      };
    }

    const gatewayKeyRef = this.deriveGatewayKeyRef(clientId);
    const gatewayKey = this.keyGenerator.generateGatewayClientKey(clientId);
    console.log(chalk.green('\n✓ Generated gateway key\n'));

    config.clients[clientId] = {
      name: clientAnswers.name.trim(),
      type: clientAnswers.type,
      gatewayKeyRef,
      ...(rateLimit && {
        rateLimit: {
          rps: rateLimit.rps,
          burst: rateLimit.burst,
          maxConcurrentStreams: rateLimit.maxConcurrentStreams ?? 3,
        },
      }),
    };

    try {
      await this.persistence.persistConfig(config, cwd);
    } catch (error) {
      delete config.clients[clientId];
      throw error;
    }
    await this.envPatch.setVar(cwd, gatewayKeyRef, gatewayKey);

    CliLogger.success(`Client ${clientId} added to configuration.`);
  }

  async removeClient(
    config: GatewayConfig,
    clientId: string,
    cwd: string,
  ): Promise<void> {
    const row = config.clients[clientId];
    if (!row) throw new Error(`Client ${clientId} not found.`);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Remove client ${clientId} and gateway key ${row.gatewayKeyRef}`,
        default: false,
      },
    ]);
    if (!confirm) {
      CliLogger.info('Cancelled.');
      return;
    }

    delete config.clients[clientId];
    await this.persistence.persistConfig(config, cwd);
    await this.envPatch.removeVar(cwd, row.gatewayKeyRef);
    CliLogger.success(`Client ${clientId} removed.`);
  }
}
