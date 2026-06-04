import { Injectable } from '@nestjs/common';
import { ConfigGeneratorService } from './config-generator.service';
import { CliLogger } from '../utils/cli-logger.util';
import * as inquirer from 'inquirer';
import {
  GatewayConfig,
  GatewayModelConfig,
} from 'src/config/gateway-config.schema';
import { ConfigPersistenceService } from './config-persistence.service';
import { DEFAULT_MODELS } from '../constants/default-models';

export function defaultModelPolicy(): NonNullable<
  GatewayModelConfig['policy']
> {
  return {
    timeoutMs: 30000,
    retry: { maxAttempts: 3, onStatus: [429, 500, 502, 503, 504] },
    params: {
      defaults: { temperature: 0.7, maxOutputTokens: 1024 },
      allowOverrides: ['temperature', 'maxOutputTokens'],
      bounds: {
        temperature: { min: 0, max: 2 },
        maxOutputTokens: { min: 1, max: 8192 },
      },
    },
  };
}

@Injectable()
export class ModelManagerService {
  constructor(
    private readonly configGenerator: ConfigGeneratorService,
    private readonly persistence: ConfigPersistenceService,
  ) {}

  async addModelForProvider(
    config: GatewayConfig,
    providerInstance: string,
    cwd: string,
  ): Promise<void> {
    if (!config.providers[providerInstance]) {
      throw new Error(`Unknown provider instance: ${providerInstance}`);
    }

    const type = config.providers[providerInstance].type;
    let addMore = true;
    while (addMore) {
      const { alias, modelId } = await inquirer.prompt([
        {
          type: 'input',
          name: 'alias',
          message: `Model alias for ${providerInstance}:`,
          validate: (input) => {
            const alias = input?.trim();
            if (!alias) return 'Alias is required.';
            if (config.models[alias]) return 'Alias already exists.';
            return true;
          },
        },
        {
          type: 'input',
          name: 'modelId',
          message: 'Model ID:',
          default: DEFAULT_MODELS[type] ?? '',
          validate: (value: string) =>
            value?.trim() ? true : 'Model ID is required.',
        },
      ]);
      const modelAlias = alias.trim();
      config.models[modelAlias] = {
        providerInstance,
        modelId: modelId.trim(),
        capabilities: { streaming: true },
        policy: defaultModelPolicy(),
      };
      await this.configGenerator.generateModelPrompt(modelAlias, cwd);
      const { another } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'another',
          message: `Add another model for ${providerInstance}?`,
          default: false,
        },
      ]);
      addMore = another;
    }
  }

  async removeModel(
    config: GatewayConfig,
    alias: string,
    cwd: string,
  ): Promise<void> {
    if (!config.models[alias]) {
      throw new Error(`Model ${alias} not found in configuration.`);
    }
    delete config.models[alias];
    await this.persistence.persistConfig(config, cwd);
    CliLogger.success(`Model ${alias} removed from configuration.`);
    CliLogger.info(
      `Note: Model prompt file (models/${alias}.md) was not removed. Remove it manually if needed.`,
    );
  }
}
