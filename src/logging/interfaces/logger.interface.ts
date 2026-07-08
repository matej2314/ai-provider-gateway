import type {
  RequestId,
  ProviderInstanceId,
} from '../../common/types/branded.types';

export interface LogContext {
  requestId?: RequestId;
  module?: string;
  provider?: ProviderInstanceId;
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
  appVersion?: string;
  environment?: string;
}

export interface LoggerBackend {
  info(message: string, context?: LogContext): void;

  debug(message: string, context?: LogContext): void;

  warn(message: string, context?: LogContext): void;

  error(message: string, error?: Error, context?: LogContext): void;

  fatal(message: string, error?: Error, context?: LogContext): void;

  flush(): Promise<void>;
}

export interface ErrorReportingBackend {
  isEnabled(): boolean;
  captureException(error: Error, context?: LogContext): void;
  flush?(timeoutMs?: number): Promise<void>;
}
