import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { CliLogger } from '../../utils/cli-logger.util';

export interface ServerConfigPromptResult {
  port: number;
  nodeEnv: string;
  swaggerEnabled?: boolean;

  cacheEnabled?: boolean;
  cacheBackend?: 'redis' | 'memory' | 'noop';
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;

  rateLimitSmartEnabled?: boolean;

  metricsBackend?: 'sentry' | 'noop';
  sentryDsn?: string;
}

@Injectable()
export class ServerPromptService {
  async promptServerConfig(): Promise<ServerConfigPromptResult> {
    CliLogger.section('Step 5/5: Server configuration.');
    console.log(
      chalk.dim(
        'Configure server settings, caching, rate limiting and monitoring. \n',
      ),
    );

    const basicAnswers = await inquirer.prompt([
      {
        type: 'number',
        name: 'port',
        message: 'Server port:',
        default: 3000,
        validate: (input) => {
          if (input < 1 || input > 65535) {
            return 'Port must be between 1 and 65535.0;';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'nodeEnv',
        message: 'Environment:',
        choices: ['development', 'production', 'staging'],
        default: 'development',
      },
      {
        type: 'confirm',
        name: 'swaggerEnabled',
        message: 'Enable Swagger UI and API documentation?',
        default: true,
      },
    ]);
    CliLogger.blank();
    console.log(chalk.cyan('Cache & Redis configuration'));
    console.log(chalk.dim('Redis is required for advanced rate limiting. \n'));

    const cacheAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'cacheEnabled',
        message: 'Enable response caching?',
        default: true,
      },
      {
        type: 'list',
        name: 'cacheBackend',
        message: 'Cache backend:',
        choices: [
          { name: 'Redis (recommended for production)', value: 'redis' },
          { name: 'In-memory (for development)', value: 'memory' },
          { name: 'Disabled', value: 'noop' },
        ],
        default: 'redis',
        when: (answers) => answers.cacheEnabled,
      },
    ]);

    if (!cacheAnswers.cacheEnabled) {
      cacheAnswers.cacheBackend = 'noop';
    }

    let redisAnswers: any = {};

    if (cacheAnswers.cacheBackend === 'redis') {
      redisAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'redisHost',
          default: 'localhost',
          validate: (input) => {
            if (!input || !input.trim()) {
              return 'Redis host is required.';
            }
            return true;
          },
        },
        {
          type: 'number',
          name: 'redisPort',
          message: 'Redis port:',
          default: 6379,
          validate: (input) => {
            if (input < 1 || input > 65535) {
              return 'Port must be between 1 and 65535.';
            }
            return true;
          },
        },
        {
          type: 'password',
          name: 'redisPassword',
          message: 'Redis password (optional, press Enter to skip):',
          default: '',
          mask: '*',
        },
      ]);

      CliLogger.blank();
      console.log(chalk.cyan('Rate limiting configuration'));
      console.log(
        chalk.dim(
          'Smart rate limiting tracks usage per client key using Redis. \n',
        ),
      );
    }

    const rateLimitAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'rateLimitSmartEnabled',
        message: 'Enable smart rate limiting (per X-Gateway-Key)?',
        default: true,
      },
    ]);
    redisAnswers.rateLimitSmartEnabled = rateLimitAnswers.rateLimitSmartEnabled;

    CliLogger.blank();
    console.log(chalk.cyan('Monitoring & Error tracking.'));
    console.log(
      chalk.dim(
        'Sentry provides error tracking and performance monitoring. \n',
      ),
    );

    const metricsAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'metricsBackend',
        message: 'Metrics & error tracking backend:',
        choices: [
          { name: 'Sentry (recommended for production)', value: 'sentry' },
          { name: 'Disabled', value: 'noop' },
        ],
        default: 'noop',
      },
    ]);

    let sentryAnswers: any = {};
    if (metricsAnswers.metricsBackend === 'sentry') {
      sentryAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'sentryDsn',
          message: 'Sentry DSN:',
          validate: (input) => {
            if (!input || !input.trim()) {
              return 'Sentry DSN is required when Sentry is enabled.';
            }
            if (!input.startsWith('https://')) {
              return 'Sentry DSN should start with https://';
            }
            return true;
          },
        },
      ]);
    }

    CliLogger.blank();
    console.log(chalk.green('✓ Server configuration complete!\n'));

    return {
      ...basicAnswers,
      ...cacheAnswers,
      ...redisAnswers,
      ...metricsAnswers,
      ...sentryAnswers,
    };
  }
}
