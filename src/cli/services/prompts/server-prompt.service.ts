import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { CliLogger } from '../../utils/cli-logger.util';

export interface ServerConfigPromptResult {
  port: number;
  nodeEnv: string;
}

@Injectable()
export class ServerPromptService {
  async promptServerConfig(): Promise<ServerConfigPromptResult> {
    CliLogger.section('Step 5/5: Server Configuration.');

    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'port',
        message: 'Server port:',
        default: 3000,
      },
      {
        type: 'list',
        name: 'nodeEnv',
        message: 'Environment:',
        choices: ['development', 'production', 'staging'],
        default: 'development',
      },
    ]);
    console.log(chalk.green('\n✓ Configuration complete!\n'));

    return answers;
  }
}
