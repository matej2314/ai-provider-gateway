import { Injectable } from '@nestjs/common';
import { parseLogLevel } from '../helpers/parseLogLevel';
import pino, { type Logger as PinoLogger } from 'pino';
import type {
  LoggerBackend,
  LogContext,
  LoggerOptions,
  LogLevel,
} from '../interfaces/logger.interface';

const LEVEL_RANK: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

@Injectable()
export class PinoLoggerAdapter implements LoggerBackend {
  private readonly logger: PinoLogger;

  constructor(options: LoggerOptions) {
    const environment =
      options.environment ?? process.env.NODE_ENV ?? 'development';
    const isProd = environment.toLowerCase() === 'production';

    this.logger = pino({
      level: options.level,
      base: {
        appVersion: options.appVersion ?? process.env.APP_VERSION ?? '1.0.0',
        environment,
      },
      serializers: {
        err: pino.stdSerializers.err,
      },
      redact: {
        paths: [
          'x-gateway-key',
          'authorization',
          '*.apiKey',
          '*.secret',
          '*.gatewayKey',
          'req.headers.authorization',
          'req.headers["x-gateway-key"]',
        ],
        censor: '[REDACTED]',
      },
      ...(isProd
        ? {}
        : {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: false,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname, appVersion',
                hideObject: false,
                customColors:
                  'error:red,warn:yellow,info:green,debug:blue,trace:magenta',
                messageFormat: '{if module} [{module}] {end}{msg}',
              },
            },
          }),
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const configured = parseLogLevel(this.logger.level);
    return LEVEL_RANK[level] >= LEVEL_RANK[configured];
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) this.logger.info(context ?? {}, message);
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) this.logger.debug(context ?? {}, message);
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) this.logger.warn(context ?? {}, message);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    const payload = {
      ...context,
      ...(error ? { error: error.message, stack: error.stack } : {}),
    };
    this.logger.error(payload, message);
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog('fatal')) return;
    const payload = {
      ...context,
      ...(error ? { error: error.message, stack: error.stack } : {}),
    };
    this.logger.fatal(payload, message);
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.flush(() => resolve());
    });
  }
}
