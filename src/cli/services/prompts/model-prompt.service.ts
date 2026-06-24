import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { CliLogger } from '../../utils/cli-logger.util';
import { DEFAULT_MODELS } from 'src/cli/constants/default-models';
import type { CliAiModel } from '../cli.services.types';
import type { GatewayProviderType } from 'src/config/provider-types';

type ModelPromptResult = CliAiModel;

@Injectable()
export class ModelPromptService {
  async promptModels(
    providers: Array<{ id: string; type: GatewayProviderType }>,
  ): Promise<ModelPromptResult[]> {
    CliLogger.section('Step 3/5: Models');
    console.log(
      chalk.dim(
        'Configure model aliases for your providers. At least one model is required/ \n',
      ),
    );

    const models: ModelPromptResult[] = [];

    for (const provider of providers) {
      const { addModel } = await inquirer.prompt<{ addModel: boolean }>([
        {
          type: 'confirm',
          name: 'addModel',
          message: `Add a model for ${provider.id}?`,
          default: true,
        },
      ]);

      if (!addModel) continue;

      console.log(chalk.dim(`\nConfiguring model for ${provider.type}:`));
      if (provider.type === 'anthropic') {
        console.log(
          chalk.dim(' Examples: claude-sonnet-4-5-20250929, claude-sonnet-4-6'),
        );
      } else if (provider.type === 'google') {
        console.log(chalk.dim(' Examples: gemini-2.5-flash, gemini-2.5-pro'));
      }
      console.log();

      const { alias, modelId } = await inquirer.prompt<{
        alias: string;
        modelId: string;
      }>([
        {
          type: 'input',
          name: 'alias',
          message: 'Model alias (e.g. "chat-default")',
          validate: (input: string) => {
            const trimmed = String(input).trim();
            if (!trimmed) {
              return 'Alias is required.';
            }
            if (models.some((model) => model.alias === trimmed)) {
              return 'Alias must be unique.';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'modelId',
          message: 'Model ID:',
          default: DEFAULT_MODELS[provider.type] || '',
          validate: (input: string) => {
            if (!input || String(input).trim() === '') {
              return 'Model ID is required.';
            }
            return true;
          },
        },
      ]);

      models.push({
        alias: alias.trim(),
        providerInstance: provider.id,
        modelId: modelId.trim(),
      });
    }

    if (models.length === 0) {
      throw new Error('At least one model is required.');
    }

    console.log(chalk.green(`\n✓ Configured ${models.length} model(s)\n`));
    return models;
  }
}
