import { Injectable } from '@nestjs/common';
import type {
  LoggerBackend,
  LogContext,
  LoggerOptions,
  LogLevel,
} from '../interfaces/logger.interface';

const LEVEL_ORDER: LogLevel[] = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
];

@Injectable()
export class ConsoleLoggerAdapter implements LoggerBackend {
  private readonly minLevel: LogLevel;
  private readonly logLevelMap: Record<LogLevel, string> = {
    trace: 'trace',
    debug: 'debug',
    info: 'info',
    warn: 'warn',
    error: 'error',
    fatal: 'fatal',
  };

  constructor(options: LoggerOptions) {
    this.minLevel = options.level ?? 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const messageIndex = LEVEL_ORDER.indexOf(level);
    const thresholdIndex = LEVEL_ORDER.indexOf(this.minLevel);
    return messageIndex >= thresholdIndex;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const parts = [`[${timestamp}]  [${level.toUpperCase()}] ${message}`];

    if (context) {
      const contextString = Object.entries(context)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ');
      if (contextString) {
        parts.push(`| ${contextString}`);
      }
    }
    return parts.join(' ');
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info'))
      console.log(this.formatMessage('info', message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug'))
      console.log(this.formatMessage('debug', message, context));
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog('error')) return;
    const ctx = error
      ? { ...context, error: error.message, stack: error.stack }
      : context;
    console.error(this.formatMessage('error', message, ctx));
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog('fatal')) return;
    const ctx = error
      ? { ...context, error: error.message, stack: error.stack }
      : context;
    console.error(this.formatMessage('fatal', message, ctx));
  }

  async flush(): Promise<void> {}
}
