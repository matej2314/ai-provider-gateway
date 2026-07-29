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
import { isThinkingCapableModel } from '../constants/thinking-capable-models';
import { providerModelRejectsSamplingParams } from 'src/providers/anthropic/anthropic-sampling-params.util';
import {
  buildDefaultModelPolicy,
  getMaxOutputTokensBound,
  syncPolicySamplingForModel,
} from '../utils/default-model-policy.util';
import { FileManagerService } from './file-manager.service';
import {
  asProviderInstanceId,
  asMaxAttempts,
  asTimeoutMs,
  asModelId,
  asModelAlias,
} from '../../common/types/branded.types';
import boxen from 'boxen';
import chalk from 'chalk';
import { join } from 'path';
import {
  isLastModelInConfig,
  isLastModelForEnabledProvider,
} from '../utils/effective-config-preview.util';
import type { GatewayProviderType } from 'src/config/provider-types';
import { assertInteractiveAllowed } from '../agent/inquirer-guard';
import type {
  AddModelInput,
  ApplyMutationResult,
  EditModelInput,
  RemoveModelInput,
} from '../types/cli-apply.types';

type ModelEditField =
  | 'modelId'
  | 'providerInstance'
  | 'fallback'
  | 'streaming'
  | 'policy';

export function defaultModelPolicy(
  modelId?: string,
  providerType?: GatewayProviderType,
): NonNullable<GatewayModelConfig['policy']> {
  if (modelId && providerType) {
    return buildDefaultModelPolicy(modelId, providerType);
  }
  return buildDefaultModelPolicy('unknown', 'anthropic');
}

@Injectable()
export class ModelManagerService {
  constructor(
    private readonly configGenerator: ConfigGeneratorService,
    private readonly persistence: ConfigPersistenceService,
    private readonly fileManager: FileManagerService,
  ) {}

  async promptAddModel(
    config: GatewayConfig,
    providerInstance?: string,
  ): Promise<AddModelInput[]> {
    assertInteractiveAllowed('ModelManagerService.promptAddModel');

    let resolvedInstance = providerInstance?.trim();

    if (!resolvedInstance) {
      const providers = Object.keys(config.providers);
      if (providers.length === 0) {
        throw new Error('No providers configured. Add provider first.');
      }

      const { providerInstance: selected } = await inquirer.prompt<{
        providerInstance: string;
      }>([
        {
          type: 'list',
          name: 'providerInstance',
          message: 'Provider instance:',
          choices: providers,
        },
      ]);
      resolvedInstance = selected;
    }

    if (!config.providers[resolvedInstance]) {
      throw new Error(`Unknown provider instance: ${resolvedInstance}`);
    }

    const type = config.providers[resolvedInstance].type;
    const inputs: AddModelInput[] = [];
    let addMore = true;

    while (addMore) {
      const { alias, modelId } = await inquirer.prompt<{
        alias: string;
        modelId: string;
      }>([
        {
          type: 'input',
          name: 'alias',
          message: `Model alias for ${resolvedInstance}:`,
          validate: (input: string) => {
            const modelAlias = String(input).trim();
            if (!modelAlias) return 'Alias is required.';
            if (
              config.models[modelAlias] ||
              inputs.some((m) => m.alias === modelAlias)
            ) {
              return 'Alias already exists.';
            }
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

      inputs.push({
        alias: asModelAlias(alias.trim()),
        providerInstance: asProviderInstanceId(resolvedInstance),
        modelId: asModelId(modelId.trim()),
      });

      const { another } = await inquirer.prompt<{ another: boolean }>([
        {
          type: 'confirm',
          name: 'another',
          message: `Add another model for ${resolvedInstance}?`,
          default: false,
        },
      ]);
      addMore = another;
    }

    return inputs;
  }

  async applyAddModel(
    config: GatewayConfig,
    cwd: string,
    input: AddModelInput,
    options?: { persist?: boolean },
  ): Promise<void> {
    const providerInstance = input.providerInstance;
    if (!config.providers[providerInstance]) {
      throw new Error(`Unknown provider instance: ${providerInstance}`);
    }

    const modelAlias = input.alias;
    if (config.models[modelAlias]) {
      throw new Error(`Alias ${modelAlias} already exists.`);
    }

    const type = config.providers[providerInstance].type;
    const trimmedModelId = input.modelId;

    const supportsThinking = isThinkingCapableModel(trimmedModelId, type);
    if (supportsThinking) {
      CliLogger.info(
        `Model ${trimmedModelId} supports thinking mode (extended reasoning).`,
      );
      CliLogger.info(
        'Configuration includes thinking parameters (thinkingEnabled: false by default).',
      );
    }

    if (providerModelRejectsSamplingParams(trimmedModelId, type)) {
      CliLogger.info(
        `Model ${trimmedModelId} does not support temperature, topP, or topK.`,
      );
      CliLogger.info(
        'Sampling parameters are omitted from policy. Use system prompt or thinkingBudget (effort) instead.',
      );
    }

    config.models[modelAlias] = {
      providerInstance: asProviderInstanceId(providerInstance),
      modelId: asModelId(trimmedModelId),
      capabilities: {
        streaming: true,
        tools: true,
        ...(supportsThinking && { thinking: true }),
      },
      policy: defaultModelPolicy(trimmedModelId, type),
    };
    await this.configGenerator.generateModelPrompt(modelAlias, cwd);

    if (options?.persist === true) {
      await this.persistence.persistConfig(config, cwd);
    }
  }

  async addModelForProvider(
    config: GatewayConfig,
    providerInstance: string,
    cwd: string,
  ): Promise<void> {
    const inputs = await this.promptAddModel(config, providerInstance);
    for (const input of inputs) {
      await this.applyAddModel(config, cwd, input, { persist: false });
    }
  }

  async promptEditModel(
    config: GatewayConfig,
    alias: string,
  ): Promise<EditModelInput | null> {
    assertInteractiveAllowed('ModelManagerService.promptEditModel');

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
            name: `policy (timeout, retry, maxOutputTokens)`,
          },
        ],
      },
    ]);
    if (!fields?.length) {
      CliLogger.info('Nothing selected.');
      return null;
    }

    const input: EditModelInput = { alias: asModelAlias(alias) };

    for (const field of fields) {
      switch (field) {
        case 'modelId': {
          const { modelId } = await inquirer.prompt<{ modelId: string }>([
            {
              type: 'input',
              name: 'modelId',
              message: 'New model ID:',
              default: current.modelId,
              validate: (value: string) =>
                value?.trim() ? true : 'Model ID is required.',
            },
          ]);
          input.modelId = asModelId(modelId.trim());
          break;
        }
        case 'providerInstance': {
          const instances = Object.keys(config.providers);
          const { providerInstance } = await inquirer.prompt<{
            providerInstance: string;
          }>([
            {
              type: 'list',
              name: 'providerInstance',
              message: 'Provider instance:',
              choices: instances,
              default: current.providerInstance,
            },
          ]);

          const sourceInstanceId = current.providerInstance;

          if (
            providerInstance !== sourceInstanceId &&
            isLastModelForEnabledProvider(config, asModelAlias(alias))
          ) {
            console.log(
              boxen(
                chalk.bold.red(
                  `Warning: moving the last model away from provider "${sourceInstanceId}"`,
                ) +
                  '\n\n' +
                  chalk.white(
                    `Provider "${sourceInstanceId}" will have no models while still enabled.\n` +
                      'The application will not start until you add a model or disable that provider.',
                  ),
                { borderColor: 'red', padding: 1 },
              ),
            );
            const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
              {
                type: 'confirm',
                name: 'confirm',
                message:
                  'Move anyway? (configuration will be saved in a non-bootable state)',
                default: false,
              },
            ]);
            if (!confirm) {
              CliLogger.info('Cancelled.');
              return null;
            }
            input.confirmNonBootable = true;
          }

          input.providerInstance = asProviderInstanceId(providerInstance);
          break;
        }
        case 'fallback': {
          const { fallback } = await inquirer.prompt<{ fallback: string }>([
            {
              type: 'input',
              name: 'fallback',
              message: 'Fallback model alias (empty to clear):',
              default: current.fallback ?? '',
              validate: (value: string) => {
                const fallbackAlias = value?.trim();
                if (!fallbackAlias) return true;
                if (fallbackAlias === alias) {
                  return 'Fallback cannot be the same alias.';
                }
                if (!config.models[fallbackAlias]) {
                  return `Unknown model alias: ${fallbackAlias}`;
                }
                if (config.models[fallbackAlias]?.fallback === alias) {
                  return 'Circular fallback detected.';
                }
                return true;
              },
            },
          ]);
          const newFallback = fallback.trim();
          input.fallback = newFallback ? newFallback : null;
          break;
        }
        case 'streaming': {
          const { streaming } = await inquirer.prompt<{ streaming: boolean }>([
            {
              type: 'confirm',
              name: 'streaming',
              message: 'Enable streaming?',
              default: current.capabilities?.streaming !== false,
            },
          ]);
          input.streaming = streaming;
          break;
        }
        case 'policy': {
          const providerType = config.providers[current.providerInstance]?.type;
          const base =
            current.policy ?? defaultModelPolicy(current.modelId, providerType);
          const rejectsSampling = providerType
            ? providerModelRejectsSamplingParams(current.modelId, providerType)
            : false;
          const tempBounds = base.params?.bounds?.temperature ?? {
            min: 0,
            max: 2,
          };
          const tokenBounds =
            base.params?.bounds?.maxOutputTokens ??
            (providerType
              ? {
                  min: 1,
                  max: getMaxOutputTokensBound(current.modelId, providerType),
                }
              : { min: 1, max: 8192 });

          const { timeoutMs, maxAttempts, maxOutputTokens, temperature } =
            await inquirer.prompt<{
              timeoutMs: number;
              maxAttempts: number;
              maxOutputTokens: number;
              temperature?: number;
            }>([
              {
                type: 'number',
                name: 'timeoutMs',
                message: 'Request timeout (ms):',
                default: base.timeoutMs ?? 30000,
                validate: (value: number) => {
                  if (!Number.isFinite(value)) {
                    return 'Timeout must be a number.';
                  }
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
              ...(rejectsSampling
                ? []
                : [
                    {
                      type: 'number' as const,
                      name: 'temperature' as const,
                      message: 'Default temperature:',
                      default: base.params?.defaults?.temperature ?? 0.7,
                      validate: (value: number) => {
                        if (!Number.isFinite(value)) {
                          return 'Temperature must be a number.';
                        }
                        return value >= tempBounds.min &&
                          value <= tempBounds.max
                          ? true
                          : `Temperature must be between ${tempBounds.min} and ${tempBounds.max}.`;
                      },
                    },
                  ]),
              {
                type: 'number',
                name: 'maxOutputTokens',
                message: 'Default max output tokens:',
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

          input.policy = {
            timeoutMs,
            maxAttempts,
            maxOutputTokens,
            ...(rejectsSampling ? {} : { temperature }),
          };
          break;
        }
        default:
          break;
      }
    }

    return input;
  }

  async applyEditModel(
    config: GatewayConfig,
    cwd: string,
    input: EditModelInput,
  ): Promise<ApplyMutationResult> {
    const alias = input.alias;
    const current = config.models[alias];
    if (!current) throw new Error(`Model ${alias} not found.`);

    let skipEffectiveCheck = false;

    if (input.modelId !== undefined) {
      current.modelId = asModelId(input.modelId);

      const providerType = config.providers[current.providerInstance]?.type;
      if (providerType) {
        const supportsThinking = isThinkingCapableModel(
          current.modelId,
          providerType,
        );
        const hadThinking = current.capabilities?.thinking === true;

        if (supportsThinking && !hadThinking) {
          current.capabilities = {
            ...current.capabilities,
            thinking: true,
          };
        } else if (!supportsThinking && hadThinking) {
          delete current.capabilities?.thinking;
          CliLogger.info(
            'Capabilities updated: thinking mode removed for new model.',
          );
        }

        current.policy = syncPolicySamplingForModel(
          current.policy,
          current.modelId,
          providerType,
        );
        CliLogger.info('Policy sampling parameters updated for new model ID.');
      }
    }

    if (input.providerInstance !== undefined) {
      const providerInstance = input.providerInstance;
      const sourceInstanceId = current.providerInstance;
      const targetRow = config.providers[providerInstance];

      if (
        providerInstance !== sourceInstanceId &&
        isLastModelForEnabledProvider(config, asModelAlias(alias))
      ) {
        if (input.confirmNonBootable !== true) {
          throw new Error(
            `[MODEL_MANAGER] Moving the last model away from provider "${sourceInstanceId}" would leave it without models. Pass confirmNonBootable: true to proceed.`,
          );
        }
        skipEffectiveCheck = true;
      }

      if (targetRow?.enabled === false) {
        CliLogger.warning(
          `[MODEL_MANAGER] Target instance ${providerInstance} is disabled - model inactive at runtime.`,
        );
      }
      current.providerInstance = asProviderInstanceId(providerInstance);
    }

    if (input.fallback !== undefined) {
      if (input.fallback === null || input.fallback === '') {
        delete current.fallback;
      } else {
        const fallback = input.fallback.trim();
        if (fallback === alias) {
          throw new Error('Fallback cannot be the same alias.');
        }
        if (!config.models[fallback]) {
          throw new Error(`Unknown model alias: ${fallback}`);
        }
        if (config.models[fallback]?.fallback === alias) {
          throw new Error('Circular fallback detected.');
        }
        current.fallback = fallback;
      }
    }

    if (input.streaming !== undefined) {
      current.capabilities = {
        ...current.capabilities,
        streaming: input.streaming,
      };
    }

    if (input.policy !== undefined) {
      const providerType = config.providers[current.providerInstance]?.type;
      const base =
        current.policy ?? defaultModelPolicy(current.modelId, providerType);
      const rejectsSampling = providerType
        ? providerModelRejectsSamplingParams(current.modelId, providerType)
        : false;
      const policyDefaults = defaultModelPolicy(current.modelId, providerType);
      const existingDefaults = base.params?.defaults ?? {};
      const {
        temperature: _removedTemperature,
        ...defaultsWithoutTemperature
      } = existingDefaults;

      current.policy = {
        ...base,
        timeoutMs: asTimeoutMs(input.policy.timeoutMs),
        retry: {
          ...base.retry,
          maxAttempts: asMaxAttempts(input.policy.maxAttempts),
          onStatus: base.retry?.onStatus ?? policyDefaults.retry?.onStatus,
        },
        params: {
          ...base.params,
          defaults: rejectsSampling
            ? {
                ...defaultsWithoutTemperature,
                maxOutputTokens: input.policy.maxOutputTokens,
              }
            : {
                ...existingDefaults,
                temperature:
                  input.policy.temperature ??
                  existingDefaults.temperature ??
                  0.7,
                maxOutputTokens: input.policy.maxOutputTokens,
              },
          allowOverrides:
            policyDefaults.params?.allowOverrides ??
            base.params?.allowOverrides,
          bounds: policyDefaults.params?.bounds ?? base.params?.bounds,
        },
      };
    }

    await this.persistence.persistConfig(config, cwd, { skipEffectiveCheck });
    CliLogger.success(`Model ${alias} updated correctly.`);
    return { filesTouched: ['gateway.config.yaml'] };
  }

  async editModel(
    config: GatewayConfig,
    alias: string,
    cwd: string,
  ): Promise<void> {
    const input = await this.promptEditModel(config, alias);
    if (!input) return;
    await this.applyEditModel(config, cwd, input);
  }

  async promptRemoveModel(
    config: GatewayConfig,
    alias: string,
  ): Promise<RemoveModelInput | null> {
    assertInteractiveAllowed('ModelManagerService.promptRemoveModel');

    if (!config.models[alias]) {
      throw new Error(`Model ${alias} not found in configuration.`);
    }

    const model = config.models[alias];
    const lastInConfig = isLastModelInConfig(config, asModelAlias(alias));
    const lastForProvider = isLastModelForEnabledProvider(
      config,
      asModelAlias(alias),
    );

    if (lastInConfig || lastForProvider) {
      const detail = lastInConfig
        ? 'The application will not start without at least one active model.'
        : `Provider "${model.providerInstance}" will have no models while still enabled.\n` +
          'The application will not start until you add a model (gateway model:add) or disable the provider.';

      console.log(
        boxen(
          chalk.bold.red(
            lastInConfig
              ? 'Warning: removing the last model in configuration'
              : `Warning: removing the last model for provider "${model.providerInstance}"`,
          ) +
            '\n\n' +
            chalk.white(detail),
          { borderColor: 'red', padding: 1 },
        ),
      );
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message:
            'Remove anyway? (configuration will be saved in a non-bootable state)',
          default: false,
        },
      ]);
      if (!confirm) {
        CliLogger.info('Cancelled.');
        return null;
      }
    }

    return { alias: asModelAlias(alias), confirm: true };
  }

  async applyRemoveModel(
    config: GatewayConfig,
    cwd: string,
    input: RemoveModelInput,
  ): Promise<ApplyMutationResult> {
    const alias = input.alias;
    if (!config.models[alias]) {
      throw new Error(`Model ${alias} not found in configuration.`);
    }

    const lastInConfig = isLastModelInConfig(config, asModelAlias(alias));
    const lastForProvider = isLastModelForEnabledProvider(
      config,
      asModelAlias(alias),
    );

    delete config.models[alias];

    if (lastInConfig || lastForProvider) {
      await this.persistence.persistConfig(config, cwd, {
        skipEffectiveCheck: true,
      });
    } else {
      await this.persistence.persistConfig(config, cwd);
    }

    await this.deleteModelPrompt(alias, cwd);

    CliLogger.success(`Model ${alias} removed from configuration.`);
    return { filesTouched: ['gateway.config.yaml'] };
  }

  async removeModel(
    config: GatewayConfig,
    alias: string,
    cwd: string,
  ): Promise<void> {
    const input = await this.promptRemoveModel(config, alias);
    if (!input) return;
    await this.applyRemoveModel(config, cwd, input);
  }

  private async deleteModelPrompt(
    modelAlias: string,
    cwd: string,
  ): Promise<boolean> {
    const modelsDir = join(cwd, 'src', 'config', 'system-prompt', 'models');
    const promptPath = join(modelsDir, `${modelAlias}.md`);

    try {
      const deleted = await this.fileManager.deleteFile(promptPath);
      if (deleted) {
        CliLogger.success(
          `Deleted: src/config/system-prompt/models/${modelAlias}.md`,
        );
      } else {
        CliLogger.info(`Skipped: models/${modelAlias}.md does not exist.`);
      }
      return deleted;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error occurred.';
      CliLogger.warning(`Failed to delete models/${modelAlias}.md: ${message}`);
    }
    return false;
  }
}
