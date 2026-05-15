import { Injectable } from '@nestjs/common';
import type {
  LoggerBackend,
  LogContext,
  LoggerOptions,
  LogLevel,
} from '../interfaces/logger.interface';

@Injectable()
export class ConsoleLoggerAdapter implements LoggerBackend {
  private readonly options: LoggerOptions;
  private readonly logLevelMap: Record<LogLevel, string> = {
    trace: 'trace',
    debug: 'debug',
    info: 'info',
    warn: 'warn',
    error: 'error',
    fatal: 'fatal',
  };

  constructor(options: LoggerOptions) {
    this.options = options;
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(this.logLevelMap.info)) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(this.logLevelMap.debug)) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(this.logLevelMap.warn)) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(this.logLevelMap.error)) {
      const ctx = error
        ? { ...context, error: error.message, stack: error.stack }
        : context;
      console.error(this.formatMessage('error', message, ctx));
    }
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(this.logLevelMap.fatal)) {
      const ctx = error
        ? { ...context, error: error.message, stack: error.stack }
        : context;
      console.error(this.formatMessage('fatal', message, ctx));
    }
  }

  async flush(): Promise<void> {}

  private shouldLog(level: string): boolean {
    const levels = Object.values(this.logLevelMap);
    const configLevel = this.options.level.toLowerCase() || 'info';
    const currentLevelIndex = levels.indexOf(configLevel);
    const configLevelIndex = levels.indexOf(configLevel);
    return currentLevelIndex >= configLevelIndex;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const parts = [`[${timestamp}], ${level.toUpperCase()}, ${message}`];

    if (context) {
      const contextString = Object.entries(context)
        .filter(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');

      if (contextString) {
        parts.push(`| ${contextString}`);
      }
    }
    return parts.join(' ');
  }
}
