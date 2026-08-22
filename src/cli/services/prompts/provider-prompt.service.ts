import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { assertInteractiveAllowed } from '../../agent/inquirer-guard';
import { CliLogger } from '../../utils/cli-logger.util';
import { PROVIDER_TYPES } from 'src/config/provider-types';
import type { GatewayProviderType } from 'src/config/provider-types';
import { isOpenAiProviderType } from 'src/config/provider-types';
import type { CliAiProvider } from '../cli.services.types';
import { validateProviderApiKey } from '../../utils/api-key-validation.util';
import {
  defaultBaseUrlForOpenAiProviderType,
  normalizeCliProviderBaseUrl,
  validateCliProviderBaseUrl,
} from '../../utils/provider-base-url.cli.util';
import {
  defaultProviderInstanceId,
  deriveApiKeyRef,
  deriveBaseUrlRef,
} from '../../utils/provider-id.util';
import {
  asProviderApiKey,
  asProviderInstanceId,
  type BaseUrl,
} from '../../../common/types/branded.types';

type ProviderPromptResult = CliAiProvider;

@Injectable()
export class ProviderPromptService {
  async promptProviders(): Promise<ProviderPromptResult[]> {
    assertInteractiveAllowed('ProviderPromptService.promptProviders');
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
      const baseUrlRef = isOpenAiProviderType(providerType)
        ? deriveBaseUrlRef(id)
        : undefined;

      let apiKey = '';
      if (isOpenAiProviderType(providerType)) {
        const { optionalKey } = await inquirer.prompt<{ optionalKey: string }>([
          {
            type: 'password',
            name: 'optionalKey',
            message: `API key for ${providerType} (optional, env: ${apiKeyRef}):`,
            mask: '*',
            validate: (input: string) =>
              validateProviderApiKey(providerType, String(input)),
          },
        ]);
        apiKey = String(optionalKey).trim();
      } else {
        const { requiredKey } = await inquirer.prompt<{ requiredKey: string }>([
          {
            type: 'password',
            name: 'requiredKey',
            message: `Enter API Key for ${providerType}:`,
            mask: '*',
            validate: (input: string) =>
              validateProviderApiKey(providerType, String(input)),
          },
        ]);
        apiKey = String(requiredKey).trim();
      }

      let baseUrl: BaseUrl | undefined;
      if (isOpenAiProviderType(providerType) && baseUrlRef) {
        const { url } = await inquirer.prompt<{ url: string }>([
          {
            type: 'input',
            name: 'url',
            message: `Base URL (env: ${baseUrlRef}):`,
            default: defaultBaseUrlForOpenAiProviderType(providerType),
            validate: (input: string) => validateCliProviderBaseUrl(input),
          },
        ]);
        baseUrl = normalizeCliProviderBaseUrl(url);
      }

      providers.push({
        id: asProviderInstanceId(id),
        type: providerType,
        apiKeyRef,
        apiKey: asProviderApiKey(apiKey),
        ...(baseUrlRef &&
          baseUrl && {
            baseUrlRef,
            baseUrl,
          }),
      });
    }

    console.log(
      chalk.green(`\n✓ Configured ${providers.length} provider(s)\n`),
    );
    return providers;
  }
}
