import { Injectable } from '@nestjs/common';
import { GatewayConfig } from 'src/config/gateway-config.schema';
import { CliLogger } from '../utils/cli-logger.util';
import { EnvPatchService } from './env-patch.service';
import {
  GATEWAY_CLIENT_TYPES,
  type GatewayClientType,
} from 'src/config/configuration.types';
import { ConfigPersistenceService } from './config-persistence.service';
import chalk from 'chalk';
import * as inquirer from 'inquirer';
import type { CliRateLimit } from './cli.services.types';
import { KeyGeneratorService } from './key-generator.service';
import { buildClientRateLimitConfig } from '../utils/client-rate-limit.util';
import {
  asClientId,
  asEnvRef,
  asRateLimitBurst,
  asRateLimitRps,
  asMaxConcurrentStreams,
  type EnvRef,
} from '../../common/types/branded.types';

@Injectable()
export class ClientManagerService {
  constructor(
    private readonly persistence: ConfigPersistenceService,
    private readonly envPatch: EnvPatchService,
    private readonly keyGenerator: KeyGeneratorService,
  ) {}

  deriveGatewayKeyRef(clientId: string): EnvRef {
    return asEnvRef(
      `GATEWAY_KEY_${clientId.trim().toUpperCase().replace(/-/g, '_')}`,
    );
  }

  async addClient(config: GatewayConfig, cwd: string): Promise<void> {
    CliLogger.section('Add client');

    const clientAnswers = await inquirer.prompt<{
      id: string;
      name: string;
      type: GatewayClientType;
      addRateLimit: boolean;
    }>([
      {
        type: 'input',
        name: 'id',
        message: 'Client ID (e.g. webapp)',
        validate: (input: string) => {
          const id = String(input).trim();
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
        validate: (input: string) => {
          if (!String(input).trim()) return 'Client name is required.';
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

    const clientId = asClientId(clientAnswers.id.trim());
    let rateLimit: CliRateLimit | undefined;

    if (clientAnswers.addRateLimit) {
      console.log(chalk.dim('\nRate limitting configuration:'));
      console.log(chalk.dim('  • Development: 10-50 rps'));
      console.log(chalk.dim('  • Production: 100-1000 rps'));
      console.log(chalk.dim('  • Burst: typically same as rps or 2x rps\n'));

      const rateLimitAnswers = await inquirer.prompt<{
        rps: number;
        burst: number;
        maxConcurrentStreams: number;
      }>([
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
          message: 'Max concurrent streams (minimum 1):',
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
        rps: asRateLimitRps(rateLimitAnswers.rps),
        burst: asRateLimitBurst(rateLimitAnswers.burst),
        maxConcurrentStreams:
          rateLimitAnswers.maxConcurrentStreams > 0
            ? asMaxConcurrentStreams(rateLimitAnswers.maxConcurrentStreams)
            : undefined,
      };
    }

    const gatewayKeyRef = this.deriveGatewayKeyRef(clientAnswers.id.trim());
    const gatewayKey = this.keyGenerator.generateGatewayClientKey(
      clientAnswers.id.trim(),
    );
    console.log(chalk.green('\n✓ Generated gateway key\n'));

    config.clients[clientId] = {
      name: clientAnswers.name.trim(),
      type: clientAnswers.type,
      gatewayKeyRef,
      ...(rateLimit && {
        rateLimit: buildClientRateLimitConfig(rateLimit),
      }),
    };

    await this.envPatch.setVar(cwd, gatewayKeyRef, gatewayKey);

    try {
      await this.persistence.persistConfig(config, cwd);
    } catch (error) {
      delete config.clients[clientId];
      await this.envPatch.removeVar(cwd, gatewayKeyRef);
      throw error;
    }

    CliLogger.success(`Client ${clientId} added to configuration.`);
  }

  async editClient(
    config: GatewayConfig,
    clientId: string,
    cwd: string,
  ): Promise<void> {
    const row = config.clients[clientId];
    if (!row) throw new Error(`Client ${clientId} not found.`);

    CliLogger.section(`Edit client: ${clientId}`);
    CliLogger.dim(
      `Name: ${row.name} | type: ${row.type} | gatewayKeyRef: ${row.gatewayKeyRef}`,
    );

    const { action } = await inquirer.prompt<{
      action: 'name' | 'type' | 'rateLimit' | 'rotateKey' | 'cancel';
    }>([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to change?',
        choices: [
          { value: 'name', name: 'Change display name' },
          { value: 'type', name: 'Change client type' },
          { value: 'rateLimit', name: 'Change client rate limit' },
          {
            value: 'rotateKey',
            name: 'Rotate client gateway key (invalidates old key)',
          },
          { value: 'cancel', name: 'Cancel' },
        ],
      },
    ]);

    switch (action) {
      case 'cancel':
        return;
      case 'name': {
        const { name } = await inquirer.prompt<{ name: string }>([
          {
            type: 'input',
            name: 'name',
            message: 'New display name:',
            default: row.name,
            validate: (value: string) => {
              return value?.trim() ? true : 'Client name is required.';
            },
          },
        ]);
        row.name = name.trim();
        await this.persistence.persistConfig(config, cwd);
        CliLogger.success(`Client ${clientId} name updated.`);
        return;
      }
      case 'type': {
        const { type } = await inquirer.prompt<{ type: GatewayClientType }>([
          {
            type: 'list',
            name: 'type',
            message: 'Client type:',
            choices: GATEWAY_CLIENT_TYPES.map((type) => ({
              value: type,
              name: type,
            })),
            default: row.type,
          },
        ]);
        row.type = type;
        await this.persistence.persistConfig(config, cwd);
        CliLogger.success(`Client ${clientId} type updated to ${type}.`);
        return;
      }
      case 'rateLimit': {
        const choices = [
          {
            value: 'set',
            name: row.rateLimit ? 'Change rate limit' : 'Set rate limit',
          },
          ...(row.rateLimit
            ? [{ value: 'remove', name: 'Remove rate limit' }]
            : []),
          { value: 'cancel', name: 'Cancel' },
        ];
        const { rateLimitAction } = await inquirer.prompt<{
          rateLimitAction: 'set' | 'remove' | 'cancel';
        }>([
          {
            type: 'list',
            name: 'rateLimitAction',
            message: 'Rate limit:',
            choices,
          },
        ]);
        if (rateLimitAction === 'cancel') return;
        if (rateLimitAction === 'remove') {
          delete row.rateLimit;
          await this.persistence.persistConfig(config, cwd);
          CliLogger.success(`Rate limit removed for client ${clientId}`);
          return;
        }
        const rateLimitAnswers = await inquirer.prompt<{
          rps: number;
          burst: number;
          maxConcurrentStreams: number;
        }>([
          {
            type: 'number',
            name: 'rps',
            message: 'Requests per second (rps):',
            default: row.rateLimit?.rps ?? 10,
            validate: (input: number) => {
              if (!Number.isFinite(input)) return 'RPS must be a number.';
              return input > 0 ? true : 'RPS must be greater than 0.';
            },
          },
          {
            type: 'number',
            name: 'burst',
            message: 'Burst capacity (max queued requests):',
            default: row.rateLimit?.burst ?? 20,
            validate: (input: number) => {
              if (!Number.isFinite(input)) return 'Burst must be a number.';
              return input > 0 ? true : 'Burst must be greater than 0.';
            },
          },
          {
            type: 'number',
            name: 'maxConcurrentStreams',
            message: 'Max concurrent streams (minimum 1):',
            default: row.rateLimit?.maxConcurrentStreams ?? 3,
            validate: (input: number) => {
              if (!Number.isFinite(input))
                return 'Max concurrent streams must be a number.';
              return input >= 1
                ? true
                : 'Max concurrent streams must be at least 1.';
            },
          },
        ]);
        row.rateLimit = buildClientRateLimitConfig({
          rps: asRateLimitRps(rateLimitAnswers.rps),
          burst: asRateLimitBurst(rateLimitAnswers.burst),
          maxConcurrentStreams: asMaxConcurrentStreams(rateLimitAnswers.maxConcurrentStreams),
        });
        await this.persistence.persistConfig(config, cwd);
        CliLogger.success(`Rate limit updated for client ${clientId}.`);
        return;
      }

      case 'rotateKey': {
        const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
          {
            type: 'confirm',
            name: 'confirm',
            message:
              'Generate new gateway key for this client? Old key will be invalidated.',
            default: false,
          },
        ]);
        if (!confirm) return;
        const newKey = this.keyGenerator.generateGatewayClientKey(clientId);
        await this.envPatch.setVar(cwd, row.gatewayKeyRef, newKey);
        CliLogger.success(`New key written to ${row.gatewayKeyRef}`);
      }
    }
  }

  async removeClient(
    config: GatewayConfig,
    clientId: string,
    cwd: string,
  ): Promise<void> {
    const row = config.clients[clientId];
    if (!row) throw new Error(`Client ${clientId} not found.`);

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
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
