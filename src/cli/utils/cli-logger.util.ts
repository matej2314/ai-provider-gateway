import chalk from 'chalk';
import ora from 'ora';

/**
 * CLI Logger - kolorowy output dla komend CLI
 */

export class CliLogger {
  /** When true, spinner/section go to stderr or are no-op (agent/--json). */
  private static jsonSafe = false;

  static setJsonSafe(enabled: boolean): void {
    CliLogger.jsonSafe = enabled;
  }

  private static out(): (...args: unknown[]) => void {
    return CliLogger.jsonSafe
      ? console.error.bind(console)
      : console.log.bind(console);
  }

  static info(message: string): void {
    CliLogger.out()(chalk.blue('i'), message);
  }

  static success(message: string): void {
    CliLogger.out()(chalk.green('✓'), message);
  }

  static warning(message: string): void {
    CliLogger.out()(chalk.yellow('⚠'), message);
  }

  static error(message: string): void {
    CliLogger.out()(chalk.red('✗'), message);
  }

  static dim(message: string): void {
    CliLogger.out()(chalk.dim(message));
  }

  static spinner(text: string) {
    if (CliLogger.jsonSafe) {
      return {
        succeed: (m?: string) => m && console.error(chalk.green('✓'), m),
        fail: (m?: string) => m && console.error(chalk.red('✗'), m),
        stop: () => undefined,
      };
    }
    return ora({
      text,
      color: 'cyan',
    }).start();
  }

  static section(title: string): void {
    CliLogger.out()('\n', chalk.bold.underline(title) + '\n');
  }

  static blank(): void {
    CliLogger.out()('');
  }
}
