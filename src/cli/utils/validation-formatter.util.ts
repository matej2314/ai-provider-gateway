import chalk from 'chalk';
import { ZodError } from 'zod';

export class ValidationFormatter {
  static formatZodError(error: ZodError): string {
    const lines: string[] = [
      chalk.red.bold('Configuration validation failed:'),
      '',
    ];

    const fieldErrors = error.flatten().fieldErrors;

    for (const [path, messages] of Object.entries(fieldErrors)) {
      if (messages && Array.isArray(messages) && messages.length > 0) {
        lines.push(chalk.yellow(`  ${path}:`));
        messages.forEach((msg) => {
          lines.push(chalk.red(`    • ${msg}`));
        });
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  static formatGenericError(error: Error): string {
    return chalk.red(`Error: ${error.message}`);
  }

  static formatSuccess(message: string): string {
    return chalk.green(`✓ ${message}`);
  }

  static formatRuntimeError(error: Error): string {
    return [
      chalk.red.bold('Configuration would fail at application startup:'),
      '',
      chalk.red(`  • ${error.message}`),
      '',
      chalk.dim(
        'Fix gateway.config.yaml and .env before saving, or confirm destructive action.',
      ),
    ].join('\n');
  }
}
