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
import { syncLegacyProviderApiKeysInEnv } from '../utils/legacy-provider-env.util';
import {
  asProviderInstanceId,
  asProviderApiKey,
  type BaseUrl,
  type EnvRef,
} from 'src/common/types';

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

  async addProvider(config: GatewayConfig, cwd: string): Promise<void> {
    CliLogger.section('Add provider instance');

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

    const id = instanceId.trim();

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

    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
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

    let baseUrl: BaseUrl | undefined;
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

    const { enabled } = await inquirer.prompt<{ enabled: boolean }>([
      {
        type: 'confirm',
        name: 'enabled',
        message: 'Enable this provider instance?',
        default: true,
      },
    ]);

    config.providers[id] = {
      type,
      apiKeyRef,
      enabled,
      baseUrlRef,
    };

    if (!this.hasModelsForInstance(config, id)) {
      CliLogger.info(
        `No models linked to ${id}. Add at least one model in this session.`,
      );

      await this.modelManager.addModelForProvider(config, id, cwd);
    }

    await this.envPatch.setVar(
      cwd,
      apiKeyRef,
      asProviderApiKey(apiKey.trim()),
    );
    if (baseUrlRef && baseUrl) {
      await this.envPatch.setVar(cwd, baseUrlRef, baseUrl);
    }
    await syncLegacyProviderApiKeysInEnv(this.envPatch, cwd, config);

    try {
      await this.persistence.persistConfig(config, cwd);
    } catch (error) {
      delete config.providers[id];
      await this.envPatch.removeVar(cwd, apiKeyRef);
      if (baseUrlRef) {
        await this.envPatch.removeVar(cwd, baseUrlRef);
      }
      throw error;
    }

    CliLogger.success(`Provider instance ${id} added to configuration.`);
  }

  async removeProvider(
    config: GatewayConfig,
    instanceId: string,
    cwd: string,
  ): Promise<void> {
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
        return;
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
      if (!confirm) return;
    }

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
    await syncLegacyProviderApiKeysInEnv(this.envPatch, cwd, config);

    CliLogger.success(
      `Removed provider instance ${instanceId} and ${linkedAliases.length} model(s).`,
    );
    if (linkedAliases.length) {
      CliLogger.info(
        `Prompt files not deleted: ${linkedAliases.map((a) => `models/${a}.md`).join(', ')}`,
      );
    }
  }

  async editProvider(
    config: GatewayConfig,
    instanceId: string,
    cwd: string,
  ): Promise<void> {
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
        return;
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

        let skipEffectiveCheck = false;

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
              return;
            }
            skipEffectiveCheck = true;
          }
        }

        row.enabled = enabled;
        await this.persistence.persistConfig(config, cwd, {
          skipEffectiveCheck,
        });
        CliLogger.success(`Provider ${instanceId} enabled=${enabled}`);
        return;
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
        await this.envPatch.setVar(
          cwd,
          row.apiKeyRef,
          asProviderApiKey(apiKey.trim()),
        );
        await syncLegacyProviderApiKeysInEnv(this.envPatch, cwd, config);
        CliLogger.success(`API key updated for ${instanceId}.`);
        return;
      }
    }
  }
}
