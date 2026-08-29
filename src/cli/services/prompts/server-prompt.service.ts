import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { isRedisRequired } from '../../../cache/should-include-redis-stack';
import { asPort, type Port } from '../../../common/types/branded.types';
import { assertInteractiveAllowed } from '../../agent/inquirer-guard';
import { CliLogger } from '../../utils/cli-logger.util';

export interface ServerConfigPromptResult {
  port: Port;
  nodeEnv: string;
  swaggerEnabled?: boolean;

  cacheEnabled?: boolean;
  cacheBackend?: 'redis' | 'noop';
  redisHost?: string;
  redisPort?: Port;
  redisPassword?: string;

  rateLimitSmartEnabled?: boolean;
  /** Snapshot from existing env; wizard questions = Phase 5. */
  semanticCacheEnabled?: boolean;

  metricsBackend?: 'sentry' | 'noop';
  sentryDsn?: string;
}

type BasicServerAnswers = Pick<
  ServerConfigPromptResult,
  'port' | 'nodeEnv' | 'swaggerEnabled'
>;

type CacheAnswers = Pick<
  ServerConfigPromptResult,
  'cacheEnabled' | 'cacheBackend'
>;

type RateLimitAnswers = Pick<ServerConfigPromptResult, 'rateLimitSmartEnabled'>;

type RedisAnswers = Pick<
  ServerConfigPromptResult,
  'redisHost' | 'redisPort' | 'redisPassword'
>;

type MetricsAnswers = Pick<ServerConfigPromptResult, 'metricsBackend'>;

type SentryAnswers = Pick<ServerConfigPromptResult, 'sentryDsn'>;

@Injectable()
export class ServerPromptService {
  async promptServerConfig(): Promise<ServerConfigPromptResult> {
    assertInteractiveAllowed('ServerPromptService.promptServerConfig');
    CliLogger.section('Step 5/5: Server configuration.');
    console.log(
      chalk.dim(
        'Configure server settings, caching, rate limiting and monitoring. \n',
      ),
    );

    const basicAnswers = await inquirer.prompt<BasicServerAnswers>([
      {
        type: 'number',
        name: 'port',
        message: 'Server port:',
        default: 3000,
        validate: (input: number) => {
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
    console.log(chalk.cyan('Response cache'));
    console.log(
      chalk.dim(
        'Optional cache for POST /api/v1/chat. Redis backend shares infrastructure with smart rate limiting.\n',
      ),
    );

    const cacheAnswers = await inquirer.prompt<CacheAnswers>([
      {
        type: 'confirm',
        name: 'cacheEnabled',
        message: 'Enable response caching?',
        default: false,
      },
      {
        type: 'list',
        name: 'cacheBackend',
        message: 'Cache backend:',
        choices: [
          { name: 'Disabled (noop) — minimal setup', value: 'noop' },
          { name: 'Redis (recommended for production)', value: 'redis' },
        ],
        default: 'noop',
        when: (answers: Partial<CacheAnswers>) => answers.cacheEnabled === true,
      },
    ]);

    if (!cacheAnswers.cacheEnabled) {
      cacheAnswers.cacheBackend = 'noop';
    }

    CliLogger.blank();
    console.log(chalk.cyan('Rate limiting'));
    console.log(
      chalk.dim(
        'Smart rate limiting tracks usage per client key and requires shared Redis when enabled.\n',
      ),
    );

    const rateLimitAnswers = await inquirer.prompt<RateLimitAnswers>([
      {
        type: 'confirm',
        name: 'rateLimitSmartEnabled',
        message: 'Enable smart rate limiting (per X-Gateway-Key)?',
        default: false,
      },
    ]);

    // Semantic cache prompts = Phase 5; honor existing env for Redis snapshot.
    const semanticCacheEnabled = process.env.SEMANTIC_CACHE_ENABLED === 'true';

    const redisRequired = isRedisRequired({
      cache: {
        enabled: cacheAnswers.cacheEnabled === true,
        backend: cacheAnswers.cacheEnabled
          ? (cacheAnswers.cacheBackend ?? 'noop')
          : 'noop',
      },
      rateLimitSmartEnabled: rateLimitAnswers.rateLimitSmartEnabled === true,
      semanticCacheEnabled,
    });

    let redisAnswers: RedisAnswers = {};

    if (redisRequired) {
      CliLogger.blank();
      console.log(chalk.cyan('Redis (shared infrastructure)'));
      console.log(
        chalk.dim(
          'Connection settings for cache (redis backend) and/or smart rate limiting.\n',
        ),
      );

      redisAnswers = await inquirer.prompt<RedisAnswers>([
        {
          type: 'input',
          name: 'redisHost',
          message: 'Redis host:',
          default: 'localhost',
          validate: (input: string) => {
            if (!input || !String(input).trim()) {
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
          validate: (input: number) => {
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
    }

    CliLogger.blank();
    console.log(chalk.cyan('Monitoring & Error tracking.'));
    console.log(
      chalk.dim(
        'Sentry provides error tracking and performance monitoring. \n',
      ),
    );

    const metricsAnswers = await inquirer.prompt<MetricsAnswers>([
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

    let sentryAnswers: SentryAnswers = {};
    if (metricsAnswers.metricsBackend === 'sentry') {
      sentryAnswers = await inquirer.prompt<SentryAnswers>([
        {
          type: 'input',
          name: 'sentryDsn',
          message: 'Sentry DSN:',
          validate: (input: string) => {
            const trimmed = String(input).trim();
            if (!trimmed) {
              return 'Sentry DSN is required when Sentry is enabled.';
            }
            if (!trimmed.startsWith('https://')) {
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
      port: asPort(basicAnswers.port),
      ...cacheAnswers,
      ...redisAnswers,
      redisPort: redisAnswers.redisPort
        ? asPort(redisAnswers.redisPort)
        : undefined,
      rateLimitSmartEnabled: rateLimitAnswers.rateLimitSmartEnabled,
      semanticCacheEnabled,
      ...metricsAnswers,
      ...sentryAnswers,
    };
  }
}
