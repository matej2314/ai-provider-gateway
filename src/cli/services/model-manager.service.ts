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

type ModelEditField =
  | 'modelId'
  | 'providerInstance'
  | 'fallback'
  | 'streaming'
  | 'policy';

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

  async editModel(
    config: GatewayConfig,
    alias: string,
    cwd: string,
  ): Promise<void> {
    const current = config.models[alias];
    if (!current) throw new Error(`Model ${alias} not found.`);

    CliLogger.section(`Edit model: ${alias}`);

    const { fields } = await inquirer.prompt<{ fields: ModelEditField[] }>([
      {
        type: 'checkbox',
        name: 'fields',
        message: 'Fields to edit (space to select):',
        choices: [
          { value: 'modelId', name: `modelId (current: ${current.modelId})` },
          {
            value: 'providerInstance',
            name: `providerInstance (current: ${current.providerInstance})`,
          },
          {
            value: 'fallback',
            name: `fallback (current: ${current.fallback ?? 'none'})`,
          },
          {
            value: 'streaming',
            name: `streaming (current: ${current.capabilities?.streaming ?? true})`,
          },
          {
            value: 'policy',
            name: `policy (timeout, retry, temperature, maxOutputTokens)`,
          },
        ],
      },
    ]);
    if (!fields?.length) {
      CliLogger.info('Nothing selected.');
      return;
    }

    for (const field of fields) {
      switch (field) {
        case 'modelId': {
          const { modelId } = await inquirer.prompt([
            {
              type: 'input',
              name: 'modelId',
              message: 'New model ID:',
              default: current.modelId,
              validate: (value: string) =>
                value?.trim() ? true : 'Model ID is required.',
            },
          ]);
          current.modelId = modelId.trim();
          break;
        }
        case 'providerInstance': {
          const instances = Object.keys(config.providers);
          const { providerInstance } = await inquirer.prompt([
            {
              type: 'list',
              name: 'providerInstance',
              message: 'Provider instance:',
              choices: instances,
              default: current.providerInstance,
            },
          ]);
          const row = config.providers[providerInstance];
          if (row?.enabled === false) {
            CliLogger.warning(
              `[MODEL_MANAGER] Target instance ${providerInstance} is disabled - model inactive at runtime.`,
            );
          }
          current.providerInstance = providerInstance;
          break;
        }
        case 'fallback': {
          const { fallback } = await inquirer.prompt([
            {
              type: 'input',
              name: 'fallback',
              message: 'Fallback model alias (empty to clear):',
              default: current.fallback ?? '',
              validate: (value: string) => {
                const fallback = value?.trim();
                if (!fallback) return true;
                if (fallback === alias) {
                  return 'Fallback cannot be the same alias.';
                }
                if (!config.models[fallback]) {
                  return `Unknown model alias: ${fallback}`;
                }
                if (config.models[fallback]?.fallback === alias) {
                  return 'Circular fallback detected.';
                }
                return true;
              },
            },
          ]);
          const newFallback = fallback.trim();
          if (newFallback) current.fallback = newFallback;
          else delete current.fallback;
          break;
        }
        case 'streaming': {
          const { streaming } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'streaming',
              message: 'Enable streaming?',
              default: current.capabilities?.streaming !== false,
            },
          ]);
          current.capabilities = { ...current.capabilities, streaming };
          break;
        }
        case 'policy': {
          const base = current.policy ?? defaultModelPolicy();
          const tempBounds = base.params?.bounds?.temperature ?? {
            min: 0,
            max: 2,
          };
          const tokenBounds = base.params?.bounds?.maxOutputTokens ?? {
            min: 1,
            max: 8192,
          };
          const policyAnswers = await inquirer.prompt([
            {
              type: 'number',
              name: 'timeoutMs',
              message: 'Request timeout (ms):',
              default: base.timeoutMs ?? 30000,
              validate: (value: number) => {
                if (!Number.isFinite(value)) return 'Timeout must be a number.';
                return value >= 1 ? true : 'Timeout must be at least 1ms.';
              },
            },
            {
              type: 'number',
              name: 'maxAttempts',
              message: 'Retry max attempts (1-5):',
              default: base.retry?.maxAttempts ?? 3,
              validate: (value: number) => {
                if (!Number.isFinite(value)) {
                  return 'Max attempts must be a number.';
                }
                return value >= 1 && value <= 5
                  ? true
                  : 'Max attempts must be between 1 and 5.';
              },
            },
            {
              type: 'number',
              name: 'temperature',
              message: `Default temperature:`,
              default: base.params?.defaults?.temperature ?? 0.7,
              validate: (value: number) => {
                if (!Number.isFinite(value)) {
                  return 'Temperature must be a number.';
                }
                return value >= tempBounds.min && value <= tempBounds.max
                  ? true
                  : `Temperature must be between ${tempBounds.min} and ${tempBounds.max}.`;
              },
            },
            {
              type: 'number',
              name: 'maxOutputTokens',
              message: `Default max output tokens:`,
              default: base.params?.defaults?.maxOutputTokens ?? 1024,
              validate: (value: number) => {
                if (!Number.isFinite(value)) {
                  return 'Max output tokens must be a number.';
                }
                return value >= tokenBounds.min && value <= tokenBounds.max
                  ? true
                  : `Max output tokens must be between ${tokenBounds.min} and ${tokenBounds.max}.`;
              },
            },
          ]);
          const policyDefaults = defaultModelPolicy();
          current.policy = {
            ...base,
            timeoutMs: policyAnswers.timeoutMs,
            retry: {
              ...base.retry,
              maxAttempts: policyAnswers.maxAttempts,
              onStatus: base.retry?.onStatus ?? policyDefaults.retry?.onStatus,
            },
            params: {
              ...base.params,
              defaults: {
                ...base.params?.defaults,
                temperature: policyAnswers.temperature,
                maxOutputTokens: policyAnswers.maxOutputTokens,
              },
              allowOverrides:
                base.params?.allowOverrides ??
                policyDefaults.params.allowOverrides,
              bounds: base.params?.bounds ?? policyDefaults.params.bounds,
            },
          };
          break;
        }
        default:
          break;
      }
    }

    await this.persistence.persistConfig(config, cwd);
    CliLogger.success(`Model ${alias} updated correctly.`);
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
