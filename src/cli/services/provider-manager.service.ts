import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';
import { GatewayConfig } from 'src/config/gateway-config.schema';
import {
  PROVIDER_TYPES,
  type GatewayProviderType,
  isOpenAiProviderType,
  type OpenAiProviderType,
} from 'src/config/provider-types';
import { isApiKeyRequiredForProviderType } from 'src/config/provider-api-key.validation';
import { EnvPatchService } from './env-patch.service';
import { ConfigPersistenceService } from './config-persistence.service';
import { ModelManagerService } from './model-manager.service';
import { CliLogger } from '../utils/cli-logger.util';
import { countActiveModelsAfterProviderChange } from '../utils/effective-config-preview.util';
import { validateProviderApiKey } from '../utils/api-key-validation.util';
import {
  deriveApiKeyRef as buildApiKeyRef,
  deriveBaseUrlRef,
} from '../utils/provider-id.util';
import {
  defaultBaseUrlForOpenAiProviderType,
  normalizeCliProviderBaseUrl,
  validateCliProviderBaseUrl,
} from '../utils/provider-base-url.cli.util';
import {
  asProviderInstanceId,
  asProviderApiKey,
  asModelAlias,
  asModelId,
  type BaseUrl,
  type EnvRef,
} from 'src/common/types';
import { assertInteractiveAllowed } from '../agent/inquirer-guard';
import type { PendingSecretsItem } from '../agent/agent-report';
import type {
  AddProviderInput,
  ApplyMutationResult,
  EditProviderInput,
  RemoveProviderInput,
} from '../types/cli-apply.types';
import { DEFAULT_MODELS } from '../constants/default-models';

@Injectable()
export class ProviderManagerService {
  constructor(
    private readonly envPatch: EnvPatchService,
    private readonly persistence: ConfigPersistenceService,
    private readonly modelManager: ModelManagerService,
  ) {}

  deriveApiKeyRef(instanceId: string): EnvRef {
    return buildApiKeyRef(instanceId);
  }

  hasModelsForInstance(config: GatewayConfig, instanceId: string): boolean {
    return Object.values(config.models).some(
      (model) => model.providerInstance === instanceId,
    );
  }

  async promptAddProvider(
    config: GatewayConfig,
    options?: { deferSecrets?: boolean },
  ): Promise<AddProviderInput> {
    assertInteractiveAllowed('ProviderManagerService.promptAddProvider');
    CliLogger.section('Add provider instance');

    const deferSecrets = options?.deferSecrets === true;

    const { instanceId } = await inquirer.prompt<{ instanceId: string }>([
      {
        type: 'input',
        name: 'instanceId',
        message:
          'Provider instance ID (e.g. google-office, anthropic-streaming):',
        validate: (input: string) => {
          const id = String(input).trim();
          if (!id) return 'Instance ID is required.';
          if (config.providers[id])
            return `Instance ${id} already exists - use provider:edit command.`;
          return true;
        },
      },
    ]);

    const id = asProviderInstanceId(instanceId.trim());

    const { type } = await inquirer.prompt<{ type: GatewayProviderType }>([
      {
        type: 'list',
        name: 'type',
        message: 'Adapter type:',
        choices: PROVIDER_TYPES.map((type) => ({ value: type, name: type })),
      },
    ]);

    const apiKeyRef = this.deriveApiKeyRef(id);
    const baseUrlRef = isOpenAiProviderType(type)
      ? deriveBaseUrlRef(id)
      : undefined;

    let apiKey = asProviderApiKey('');
    let baseUrl: BaseUrl | undefined;

    if (deferSecrets) {
      CliLogger.info(
        `Deferring operator secrets — empty placeholders for ${apiKeyRef}` +
          (baseUrlRef ? ` and ${baseUrlRef}` : '') +
          '. Paste values into .env later.',
      );
    } else {
      const { apiKey: rawKey } = await inquirer.prompt<{ apiKey: string }>([
        {
          type: 'password',
          name: 'apiKey',
          message: isOpenAiProviderType(type)
            ? `API key (optional, env: ${apiKeyRef}):`
            : `API key (env: ${apiKeyRef}):`,
          mask: '*',
          validate: (value: string) => {
            const result = validateProviderApiKey(type, value);
            return result === true ? true : result;
          },
        },
      ]);
      apiKey = asProviderApiKey(rawKey.trim());

      if (baseUrlRef) {
        const { url } = await inquirer.prompt<{ url: string }>([
          {
            type: 'input',
            name: 'url',
            message: `Base URL (env: ${baseUrlRef}):`,
            default: defaultBaseUrlForOpenAiProviderType(
              type as OpenAiProviderType,
            ),
            validate: (input: string) => validateCliProviderBaseUrl(input),
          },
        ]);
        baseUrl = normalizeCliProviderBaseUrl(url);
      }
    }

    const { enabled } = await inquirer.prompt<{ enabled: boolean }>([
      {
        type: 'confirm',
        name: 'enabled',
        message: 'Enable this provider instance?',
        default: true,
      },
    ]);

    const models: AddProviderInput['models'] = [];
    if (!this.hasModelsForInstance(config, id)) {
      CliLogger.info(
        `No models linked to ${id}. Add at least one model in this session.`,
      );

      let addMore = true;
      while (addMore) {
        const { alias, modelId } = await inquirer.prompt<{
          alias: string;
          modelId: string;
        }>([
          {
            type: 'input',
            name: 'alias',
            message: `Model alias for ${id}:`,
            validate: (input: string) => {
              const modelAlias = String(input).trim();
              if (!modelAlias) return 'Alias is required.';
              if (
                config.models[modelAlias] ||
                models.some((m) => m.alias === modelAlias)
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

        models.push({
          alias: asModelAlias(alias.trim()),
          modelId: asModelId(modelId.trim()),
        });

        const { another } = await inquirer.prompt<{ another: boolean }>([
          {
            type: 'confirm',
            name: 'another',
            message: `Add another model for ${id}?`,
            default: false,
          },
        ]);
        addMore = another;
      }
    }

    return {
      id,
      type,
      enabled,
      apiKeyRef,
      apiKey,
      baseUrlRef,
      baseUrl,
      models,
    };
  }

  async applyAddProvider(
    config: GatewayConfig,
    cwd: string,
    input: AddProviderInput,
  ): Promise<ApplyMutationResult> {
    const id = input.id;

    if (config.providers[id]) {
      throw new Error(
        `Instance ${id} already exists - use provider:edit command.`,
      );
    }

    if (!this.hasModelsForInstance(config, id) && input.models.length === 0) {
      throw new Error(
        `[PROVIDER_MANAGER] Provider ${id} requires at least one model.`,
      );
    }

    config.providers[id] = {
      type: input.type,
      apiKeyRef: input.apiKeyRef,
      enabled: input.enabled,
      baseUrlRef: input.baseUrlRef,
    };

    const addedAliases: string[] = [];
    for (const model of input.models) {
      await this.modelManager.applyAddModel(
        config,
        cwd,
        {
          alias: model.alias,
          providerInstance: id,
          modelId: model.modelId,
        },
        { persist: false },
      );
      addedAliases.push(model.alias);
    }

    await this.envPatch.setVar(cwd, input.apiKeyRef, input.apiKey);
    if (input.baseUrlRef) {
      await this.envPatch.setVar(cwd, input.baseUrlRef, input.baseUrl ?? '');
    }

    const pendingSecrets = this.collectAddProviderPendingSecrets(input);

    try {
      // AGENT-MODE: deferred operator values → soft effective check (plan §6.8 / §6.9)
      await this.persistence.persistConfig(config, cwd, {
        allowMissingProviderSecrets: pendingSecrets.length > 0,
      });
    } catch (error) {
      delete config.providers[id];
      for (const alias of addedAliases) {
        delete config.models[alias];
      }
      await this.envPatch.removeVar(cwd, input.apiKeyRef);
      if (input.baseUrlRef) {
        await this.envPatch.removeVar(cwd, input.baseUrlRef);
      }
      throw error;
    }

    CliLogger.success(`Provider instance ${id} added to configuration.`);

    return {
      pendingSecrets: pendingSecrets.length ? pendingSecrets : undefined,
      filesTouched: ['gateway.config.yaml', '.env'],
    };
  }

  async addProvider(
    config: GatewayConfig,
    cwd: string,
    options?: { deferSecrets?: boolean },
  ): Promise<void> {
    const input = await this.promptAddProvider(config, options);
    await this.applyAddProvider(config, cwd, input);
  }

  async promptRemoveProvider(
    config: GatewayConfig,
    instanceId: string,
  ): Promise<RemoveProviderInput | null> {
    assertInteractiveAllowed('ProviderManagerService.promptRemoveProvider');

    const row = config.providers[instanceId];
    if (!row) throw new Error(`Provider instance ${instanceId} not found.`);

    const linkedAliases = Object.entries(config.models)
      .filter(([, model]) => model.providerInstance === instanceId)
      .map(([alias]) => alias);

    const activeInstances = Object.entries(config.providers).filter(
      ([, provider]) => provider.enabled !== false,
    );

    const isOnlyActive =
      activeInstances.length === 1 && activeInstances[0][0] === instanceId;

    if (isOnlyActive) {
      const warning = boxen(
        chalk.bold.red('Warning: last active provider instance') +
          '\n\n' +
          chalk.white(
            'The application will not start correctly until you add a provider again.',
          ),
        { borderColor: 'red', padding: 1 },
      );
      console.log(warning);

      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Remove anyway?',
          default: false,
        },
      ]);
      if (!confirm) {
        CliLogger.info('Cancelled.');
        return null;
      }
    } else {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Remove provider ${instanceId} and ${linkedAliases.length} model(s): ${linkedAliases.join(', ')}?`,
          default: false,
        },
      ]);
      if (!confirm) return null;
    }

    return { id: asProviderInstanceId(instanceId), confirm: true };
  }

  async applyRemoveProvider(
    config: GatewayConfig,
    cwd: string,
    input: RemoveProviderInput,
  ): Promise<ApplyMutationResult> {
    const instanceId = input.id;
    const row = config.providers[instanceId];
    if (!row) throw new Error(`Provider instance ${instanceId} not found.`);

    const linkedAliases = Object.entries(config.models)
      .filter(([, model]) => model.providerInstance === instanceId)
      .map(([alias]) => alias);

    const activeInstances = Object.entries(config.providers).filter(
      ([, provider]) => provider.enabled !== false,
    );
    const isOnlyActive =
      activeInstances.length === 1 && activeInstances[0][0] === instanceId;

    delete config.providers[instanceId];
    for (const alias of linkedAliases) {
      delete config.models[alias];
    }

    try {
      await this.persistence.persistConfig(config, cwd);
    } catch (error) {
      if (isOnlyActive) {
        await this.persistence.persistConfig(config, cwd, {
          skipEffectiveCheck: true,
        });
        CliLogger.warning(
          'Configuration is invalid after removing the last active provider. Fix with gateway provider:add command.',
        );
      } else {
        throw error;
      }
    }

    await this.envPatch.removeVar(cwd, row.apiKeyRef);
    if (row.baseUrlRef) {
      await this.envPatch.removeVar(cwd, row.baseUrlRef);
    }

    CliLogger.success(
      `Removed provider instance ${instanceId} and ${linkedAliases.length} model(s).`,
    );
    if (linkedAliases.length) {
      CliLogger.info(
        `Prompt files not deleted: ${linkedAliases.map((a) => `models/${a}.md`).join(', ')}`,
      );
    }

    return { filesTouched: ['gateway.config.yaml', '.env'] };
  }

  async removeProvider(
    config: GatewayConfig,
    instanceId: string,
    cwd: string,
  ): Promise<void> {
    const input = await this.promptRemoveProvider(config, instanceId);
    if (!input) return;
    await this.applyRemoveProvider(config, cwd, input);
  }

  async promptEditProvider(
    config: GatewayConfig,
    instanceId: string,
  ): Promise<EditProviderInput | null> {
    assertInteractiveAllowed('ProviderManagerService.promptEditProvider');

    const row = config.providers[instanceId];
    if (!row) throw new Error(`Provider instance ${instanceId} not found.`);

    CliLogger.section(`Edit provider instance: ${instanceId}`);
    CliLogger.dim(
      `Type: ${row.type} | apiKeyRef: ${row.apiKeyRef}${row.baseUrlRef ? ` | baseUrlRef: ${row.baseUrlRef}` : ''} | enabled: ${row.enabled !== false ? 'Yes' : 'No'}`,
    );

    const { action } = await inquirer.prompt<{
      action: 'enabled' | 'apiKey' | 'cancel';
    }>([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to change?',
        choices: [
          { value: 'enabled', name: 'Enable/disable instance.' },
          { value: 'apiKey', name: 'Rotate API key(same env variable)' },
          { value: 'cancel', name: 'Cancel' },
        ],
      },
    ]);

    switch (action) {
      case 'cancel':
        return null;
      case 'enabled': {
        const { enabled } = await inquirer.prompt<{ enabled: boolean }>([
          {
            type: 'confirm',
            name: 'enabled',
            message: 'Enable this provider instance?',
            default: row.enabled !== false,
          },
        ]);

        if (enabled && !this.hasModelsForInstance(config, instanceId)) {
          throw new Error(
            `[PROVIDER_MANAGER] Cannot enable ${instanceId} without at least one model. Use gateway model:add command first.`,
          );
        }

        let confirmNonBootable: boolean | undefined;

        if (!enabled) {
          const activeAfter = countActiveModelsAfterProviderChange(
            config,
            new Set([asProviderInstanceId(instanceId)]),
          );
          if (activeAfter === 0) {
            const warning = boxen(
              chalk.bold.red('Warning: disabling last active provider') +
                '\n\n' +
                chalk.white(
                  'The application will not start until you enable a provider with models again.\n' +
                    'Add models with gateway model:add or re-enable a provider.',
                ),
              { borderColor: 'red', padding: 1 },
            );
            console.log(warning);
            const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
              {
                type: 'confirm',
                name: 'confirm',
                message:
                  'Disable anyway? (configuration will be saved in a non-bootable state)',
                default: false,
              },
            ]);
            if (!confirm) {
              CliLogger.info('Cancelled.');
              return null;
            }
            confirmNonBootable = true;
          }
        }

        return {
          id: asProviderInstanceId(instanceId),
          action: 'enabled',
          enabled,
          confirmNonBootable,
        };
      }
      case 'apiKey': {
        const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
          {
            type: 'password',
            name: 'apiKey',
            message: `New API key for ${instanceId} (env: ${row.apiKeyRef}):`,
            mask: '*',
            validate: (value: string) => {
              const result = validateProviderApiKey(row.type, value);
              return result === true ? true : result;
            },
          },
        ]);
        return {
          id: asProviderInstanceId(instanceId),
          action: 'apiKey',
          apiKey: asProviderApiKey(apiKey.trim()),
        };
      }
    }
  }

  async applyEditProvider(
    config: GatewayConfig,
    cwd: string,
    input: EditProviderInput,
  ): Promise<ApplyMutationResult> {
    const instanceId = input.id;
    const row = config.providers[instanceId];
    if (!row) throw new Error(`Provider instance ${instanceId} not found.`);

    switch (input.action) {
      case 'enabled': {
        const enabled = input.enabled === true;

        if (enabled && !this.hasModelsForInstance(config, instanceId)) {
          throw new Error(
            `[PROVIDER_MANAGER] Cannot enable ${instanceId} without at least one model. Use gateway model:add command first.`,
          );
        }

        let skipEffectiveCheck = false;

        if (!enabled) {
          const activeAfter = countActiveModelsAfterProviderChange(
            config,
            new Set([asProviderInstanceId(instanceId)]),
          );
          if (activeAfter === 0) {
            if (!input.confirmNonBootable) {
              throw new Error(
                `[PROVIDER_MANAGER] Disabling ${instanceId} would leave no active models. Pass confirmNonBootable: true to proceed.`,
              );
            }
            skipEffectiveCheck = true;
          }
        }

        row.enabled = enabled;
        await this.persistence.persistConfig(config, cwd, {
          skipEffectiveCheck,
        });
        CliLogger.success(`Provider ${instanceId} enabled=${enabled}`);
        return { filesTouched: ['gateway.config.yaml'] };
      }
      case 'apiKey': {
        if (input.apiKey === undefined) {
          throw new Error(
            `[PROVIDER_MANAGER] apiKey is required for action "apiKey".`,
          );
        }
        await this.envPatch.setVar(cwd, row.apiKeyRef, input.apiKey);
        CliLogger.success(`API key updated for ${instanceId}.`);
        return { filesTouched: ['.env'] };
      }
      case 'clearApiKey': {
        await this.envPatch.setVar(cwd, row.apiKeyRef, asProviderApiKey(''));
        CliLogger.success(`API key cleared for ${instanceId}.`);
        return {
          pendingSecrets: [
            {
              envRef: row.apiKeyRef,
              file: '.env',
              reason: 'provider_api_key',
              providerInstance: instanceId,
            },
          ],
          filesTouched: ['.env'],
        };
      }
    }
  }

  async editProvider(
    config: GatewayConfig,
    instanceId: string,
    cwd: string,
  ): Promise<void> {
    const input = await this.promptEditProvider(config, instanceId);
    if (!input) return;
    await this.applyEditProvider(config, cwd, input);
  }

  private collectAddProviderPendingSecrets(
    input: AddProviderInput,
  ): PendingSecretsItem[] {
    const pending: PendingSecretsItem[] = [];

    if (
      isApiKeyRequiredForProviderType(input.type) &&
      !String(input.apiKey).trim()
    ) {
      pending.push({
        envRef: input.apiKeyRef,
        file: '.env',
        reason: 'provider_api_key',
        providerInstance: input.id,
      });
    }

    if (input.baseUrlRef && !input.baseUrl?.trim()) {
      pending.push({
        envRef: input.baseUrlRef,
        file: '.env',
        reason: 'provider_base_url',
        providerInstance: input.id,
      });
    }

    return pending;
  }
}
