import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { CliLogger } from '../../utils/cli-logger.util';
import { PROVIDER_TYPES } from 'src/config/provider-types';
import type { CliAiProvider } from '../cli.services.types';

type ProviderPromptResult = CliAiProvider;

@Injectable()
export class ProviderPromptService {
  async promptProviders(): Promise<ProviderPromptResult[]> {
    CliLogger.section('Step 2/5: Providers');
    console.log(
      chalk.dim(
        'Select which AI providers you want to use and provide their API keys.\n',
      ),
    );

    const { selectedProviders } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedProviders',
        message: 'Select providers:',
        choices: Object.values(PROVIDER_TYPES).map((type) => ({
          value: type,
          name: type,
          checked: false,
        })),
        validate: (input) => {
          if (input.length === 0) {
            return 'Please select at least one provider';
          }
          return true;
        },
      },
    ]);

    const providers: ProviderPromptResult[] = [];

    for (const providerType of selectedProviders) {
      const { apiKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter API Key for ${providerType}:`,
          mask: '*',
          validate: (input) => {
            if (!input || input.trim() === '') {
              return 'API Key is required';
            }
            return true;
          },
        },
      ]);

      providers.push({
        id: providerType,
        type: providerType,
        apiKeyRef: `${providerType.toUpperCase()}_API_KEY`,
        apiKey: apiKey.trim(),
      });
    }

    console.log(
      chalk.green(`\n✓ Configured ${providers.length} provider(s)\n`),
    );
    return providers;
  }
}
