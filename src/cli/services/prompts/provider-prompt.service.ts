import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { CliLogger } from '../../utils/cli-logger.util';
import { PROVIDER_TYPES } from 'src/config/provider-types';
import type { GatewayProviderType } from 'src/config/provider-types';
import type { CliAiProvider } from '../cli.services.types';
import { validateProviderApiKey } from '../../utils/api-key-validation.util';
import {
  defaultProviderInstanceId,
  deriveApiKeyRef,
} from '../../utils/provider-id.util';

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

    const { selectedProviders } = await inquirer.prompt<{
      selectedProviders: GatewayProviderType[];
    }>([
      {
        type: 'checkbox',
        name: 'selectedProviders',
        message: 'Select providers:',
        choices: Object.values(PROVIDER_TYPES).map((type) => ({
          value: type,
          name: type,
          checked: false,
        })),
        validate: (input: GatewayProviderType[]) => {
          if (input.length === 0) {
            return 'Please select at least one provider';
          }
          return true;
        },
      },
    ]);

    const providers: ProviderPromptResult[] = [];

    for (const providerType of selectedProviders) {
      const defaultId = defaultProviderInstanceId(providerType);
      const { instanceId } = await inquirer.prompt<{ instanceId: string }>([
        {
          type: 'input',
          name: 'instanceId',
          message: `Instance ID for ${providerType}:`,
          default: defaultId,
          validate: (input: string) =>
            String(input).trim() ? true : 'Instance ID is required.',
        },
      ]);
      const id = instanceId.trim();
      const apiKeyRef = deriveApiKeyRef(id);

      const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter API Key for ${providerType}:`,
          mask: '*',
          validate: (input: string) =>
            validateProviderApiKey(providerType, String(input)),
        },
      ]);

      providers.push({
        id,
        type: providerType,
        apiKeyRef,
        apiKey: String(apiKey).trim(),
      });
    }

    console.log(
      chalk.green(`\n✓ Configured ${providers.length} provider(s)\n`),
    );
    return providers;
  }
}
