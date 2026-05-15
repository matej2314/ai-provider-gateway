export interface LogContext {
  requestId?: string;
  module?: string;
  provider?: string;
  modelAlias?: string;
  modelId?: string;
  latency?: number;
  tokensUsed?: number;
  cacheKey?: string;
  [key: string]: unknown;
}

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  level: LogLevel;
  logsDir?: string;
  rotationDays?: number;
  maxSize?: string;
  appVersion?: string;
  environment?: string;
  prettyPrint?: boolean;
}

export interface LoggerBackend {
  info(message: string, context?: LogContext): void;

  debug(message: string, context?: LogContext): void;

  warn(message: string, context?: LogContext): void;

  error(message: string, error?: Error, context?: LogContext): void;

  fatal(message: string, error?: Error, context?: LogContext): void;

  flush(): Promise<void>;
}
