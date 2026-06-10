import chalk from 'chalk';
import ora from 'ora';

/**
 * CLI Logger - kolorowy output dla komend CLI
 */

export class CliLogger {
  static info(message: string): void {
    console.log(chalk.blue('i'), message);
  }

  static success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  static warning(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  static error(message: string): void {
    console.log(chalk.red('✗'), message);
  }

  static dim(message: string): void {
    console.log(chalk.dim(message));
  }

  static spinner(text: string) {
    return ora({
      text,
      color: 'cyan',
    }).start();
  }

  static section(title: string): void {
    console.log('\n', chalk.bold.underline(title) + '\n');
  }

  static blank(): void {
    console.log('');
  }
}
