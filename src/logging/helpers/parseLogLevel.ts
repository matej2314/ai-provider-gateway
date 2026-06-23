import type { LogLevel } from '../interfaces/logger.interface';

export function parseLogLevel(raw: string | undefined): LogLevel {
  const allowed: LogLevel[] = [
    'trace',
    'debug',
    'info',
    'warn',
    'error',
    'fatal',
  ];
  const level = (raw ?? 'info').toLowerCase();
  return allowed.includes(level as LogLevel) ? (level as LogLevel) : 'info';
}
