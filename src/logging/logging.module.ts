import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggingService } from './logging.service';
import {
  LOGGER_BACKEND,
  LOGGER_OPTIONS,
  ERROR_REPORTING_BACKEND,
} from './logging.tokens';
import type {
  LoggerOptions,
  ErrorReportingBackend,
  LoggerBackend,
} from './interfaces/logger.interface';
import { ConsoleLoggerAdapter } from './adapters/console-logger.adapter';
import { PinoLoggerAdapter } from './adapters/pino-logger.adapter';
import { SentryErrorReportingAdapter } from './adapters/sentry-error-reporting.adapter';
import { NoopErrorReportingAdapter } from './adapters/noop-error-reporting.adapter';
import { parseLogLevel } from './helpers/parseLogLevel';

function isSentryEnabled(env: string): boolean {
  if (process.env.SENTRY_ENABLED === 'false') return false;
  if (process.env.SENTRY_ENABLED === 'true') return true;

  if (env.toLowerCase() === 'production') {
    return !!process.env.SENTRY_DSN?.trim();
  }
  return false;
}

function resolveErrorReportingBackend(
  env: string,
): new () => ErrorReportingBackend {
  const override = process.env.ERROR_REPORTING_ADAPTER?.toLowerCase();
  if (override === 'noop') return NoopErrorReportingAdapter;
  if (override === 'sentry') return SentryErrorReportingAdapter;

  if (isSentryEnabled(env)) {
    const dsn = process.env.SENTRY_DSN?.trim();
    if (!dsn) {
      console.warn(
        '[LoggingModule] Sentry enabled but SENTRY_DSN is not set. Using noop adapter.',
      );
      return NoopErrorReportingAdapter;
    }
    return SentryErrorReportingAdapter;
  }
  return NoopErrorReportingAdapter;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LOGGER_OPTIONS,
      useFactory: (config: ConfigService): LoggerOptions => ({
        level: parseLogLevel(
          config.get<string>('LOG_LEVEL') ?? process.env.LOG_LEVEL,
        ),
        appVersion:
          config.get<string>('APP_VERSION') ?? process.env.APP_VERSION ?? 'dev',
        environment:
          config.get<string>('NODE_ENV') ??
          process.env.NODE_ENV ??
          'development',
      }),
      inject: [ConfigService],
    },
    {
      provide: LOGGER_BACKEND,
      useFactory: (options: LoggerOptions): LoggerBackend => {
        const adapter = (process.env.LOG_ADAPTER ?? 'pino').toLowerCase();

        if (adapter === 'console') {
          return new ConsoleLoggerAdapter(options);
        }

        try {
          return new PinoLoggerAdapter(options);
        } catch {
          return new ConsoleLoggerAdapter(options);
        }
      },
      inject: [LOGGER_OPTIONS],
    },
    {
      provide: ERROR_REPORTING_BACKEND,
      useFactory: (config: ConfigService): ErrorReportingBackend => {
        const nodeEnv =
          config.get<string>('NODE_ENV') ??
          process.env.NODE_ENV ??
          'development';
        const AdapterClass = resolveErrorReportingBackend(nodeEnv);
        return new AdapterClass();
      },
      inject: [ConfigService],
    },
    LoggingService,
  ],
  exports: [LoggingService, LOGGER_BACKEND, ERROR_REPORTING_BACKEND],
})
export class LoggingModule {}
