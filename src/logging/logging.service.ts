import { Inject, Injectable } from '@nestjs/common';
import type {
  LoggerBackend,
  ErrorReportingBackend,
  LogContext,
} from './interfaces/logger.interface';
import { LOGGER_BACKEND, ERROR_REPORTING_BACKEND } from './logging.tokens';

@Injectable()
export class LoggingService {
  private readonly defaultContext: LogContext = {};

  constructor(
    @Inject(LOGGER_BACKEND) private readonly loggerBackend: LoggerBackend,
    @Inject(ERROR_REPORTING_BACKEND)
    private readonly errorReporting: ErrorReportingBackend,
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }

  child(context: LogContext): LoggingService {
    const child = new LoggingService(this.loggerBackend, this.errorReporting);
    Object.assign(child.defaultContext, context);
    return child;
  }

  info(message: string, context?: LogContext): void {
    this.loggerBackend.info(message, this.mergeContext(context));
  }

  debug(message: string, context?: LogContext): void {
    this.loggerBackend.debug(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.loggerBackend.warn(message, this.mergeContext(context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const merged = this.mergeContext(context);
    this.loggerBackend.error(message, error, merged);

    if (error instanceof Error && this.errorReporting.isEnabled()) {
      this.errorReporting.captureException(error, { ...merged, message });
    }
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    const merged = this.mergeContext(context);
    this.loggerBackend.fatal(message, error, merged);
    if (error instanceof Error && this.errorReporting.isEnabled()) {
      this.errorReporting.captureException(error, merged);
    }
  }

  async flush(): Promise<void> {
    await this.loggerBackend.flush();
    await this.errorReporting.flush?.();
  }
}
