import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { CliLogger } from '../../utils/cli-logger.util';
import { KeyGeneratorService } from '../key-generator.service';

@Injectable()
export class KeyPromptService {
  async promptMasterKey(keyGenerator: KeyGeneratorService): Promise<string> {
    CliLogger.section('Step 1/5: Master Key');
    console.log(
      chalk.dim(
        'The master key is used to authenticate administrative requests. \n',
      ),
    );

    const { masterKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'masterKey',
        message: 'Enter master key (or leave empty to generate):',
        mask: '*',
      },
    ]);

    if (!masterKey || masterKey.trim() === '') {
      const generated = keyGenerator.generateMasterKey();

      const { showKey } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'showKey',
          message: 'Display generated key? (insecure if screen is shared)',
          default: false,
        },
      ]);

      if (showKey) {
        console.log(chalk.yellow('\n⚠ Key will be visible in terminal'));
        console.log(chalk.green(`Generated master key: ${generated}\n`));
      } else {
        console.log(chalk.green('✓ Master key generated (saved to .env)\n'));
      }
      return generated;
    }
    return masterKey.trim();
  }
}
