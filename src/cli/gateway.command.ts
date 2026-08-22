import { Command, CommandRunner } from 'nest-commander';
import chalk from 'chalk';
import boxen from 'boxen';

@Command({
  name: 'gateway',
  description: 'AI Provider Gateway CLI',
  options: { isDefault: true },
})
export class GatewayCommand extends CommandRunner {
  run(): Promise<void> {
    const welcomeMessage = boxen(
      chalk.bold.cyan('AI Provider Gateway CLI') +
        '\n\n' +
        chalk.gray('Available commands:') +
        '\n\n' +
        chalk.bold('Configuration:') +
        '\n' +
        chalk.yellow('  gateway config:init') +
        '     - Initialize configuration wizard\n' +
        chalk.yellow('  gateway config:validate') +
        '  - Validate configuration files\n' +
        chalk.yellow('  gateway config:show') +
        '     - Display parsed configuration\n' +
        chalk.yellow('  gateway config:secrets-status') +
        ' - Missing env secrets (agent gate)\n' +
        chalk.dim(
          '  Agent mode: append --agent --answers <file> [--json]\n\n',
        ) +
        chalk.bold('Model Management:') +
        '\n' +
        chalk.yellow('  gateway model:add') +
        '        - Add new model\n' +
        chalk.yellow('  gateway model:list') +
        '       - List all models\n' +
        chalk.yellow('  gateway model:remove') +
        '    - Remove a model\n' +
        chalk.yellow('  gateway model:edit') +
        '     - Edit a model\n\n' +
        chalk.bold('Client Management:') +
        '\n' +
        chalk.yellow('  gateway client:add') +
        '       - Add new client\n' +
        chalk.yellow('  gateway client:list') +
        '      - List all clients\n' +
        chalk.yellow('  gateway client:edit') +
        '     - Edit a client\n' +
        chalk.yellow('  gateway client:remove') +
        '   - Remove a client\n\n' +
        chalk.bold('Provider Operations:') +
        '\n' +
        chalk.yellow('  gateway provider:test') +
        '    - Test provider connection\n' +
        chalk.yellow('  gateway provider:list') +
        '   - List configured providers\n\n' +
        chalk.yellow('  gateway provider:add') +
        '    - Add new provider instance\n' +
        chalk.yellow('  gateway provider:remove') +
        '    - Remove provider instance\n' +
        chalk.yellow('  gateway provider:edit') +
        '    - Edit provider instance\n\n' +
        chalk.bold('Security:') +
        '\n' +
        chalk.yellow('  gateway key:generate') +
        '    - Generate secure gateway key',
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      },
    );

    console.log(welcomeMessage);
    console.log(
      chalk.dim('\nRun any command with --help for more information.\n'),
    );
    return Promise.resolve();
  }
}
