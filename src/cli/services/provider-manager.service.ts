import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';
import { GatewayConfig } from 'src/config/gateway-config.schema';
import { PROVIDER_TYPES } from 'src/config/provider-types';
import { EnvPatchService } from './env-patch.service';
import { ConfigPersistenceService } from './config-persistence.service';
import { ModelManagerService } from './model-manager.service';
import { CliLogger } from '../utils/cli-logger.util';

@Injectable()
export class ProviderManagerService {
  constructor(
    private readonly envPatch: EnvPatchService,
    private readonly persistence: ConfigPersistenceService,
    private readonly modelManager: ModelManagerService,
  ) {}

  deriveApiKeyRef(instanceId: string, type: string): string {
    const slug = instanceId
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_');
    return `${slug}_API_KEY`;
  }

  hasModelsForInstance(config: GatewayConfig, instanceId: string): boolean {
    return Object.values(config.models).some(
      (model) => model.providerInstance === instanceId,
    );
  }

  async addProvider(config: GatewayConfig, cwd: string): Promise<void> {
    CliLogger.section('Add provider instance');

    const { instanceId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'instanceId',
        message:
          'Provider instance ID (e.g. google-office, anthropic-streaming):',
        validate: (input) => {
          const id = input?.trim();
          if (!id) return 'Instance ID is required.';
          if (config.providers[id])
            return `Instance ${id} already exists - use provider:edit command.`;
          return true;
        },
      },
    ]);

    const id = instanceId.trim();

    const { type } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Adapter type:',
        choices: PROVIDER_TYPES.map((type) => ({ value: type, name: type })),
      },
    ]);

    const apiKeyRef = this.deriveApiKeyRef(id, type);

    const { apiKey } = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: `API key (env: ${apiKeyRef}):`,
        mask: '*',
        validate: (value: string) =>
          value?.trim() ? true : 'API key is required.',
      },
    ]);

    const { enabled } = await inquirer.prompt([
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
    };

    if (!this.hasModelsForInstance(config, id)) {
      CliLogger.info(
        `No models linked to ${id}. Add at least one model in this session.`,
      );

      await this.modelManager.addModelForProvider(config, id, cwd);
    }

    try {
      await this.persistence.persistConfig(config, cwd);
    } catch (error) {
      delete config.providers[id];
      throw error;
    }
    await this.envPatch.setVar(cwd, apiKeyRef, apiKey.trim());

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
      .filter(([_, model]) => model.providerInstance === instanceId)
      .map(([alias]) => alias);

    const activeInstances = Object.entries(config.providers).filter(
      ([_, provider]) => provider.enabled !== false,
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

      const { confirm } = await inquirer.prompt([
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
      const { confirm } = await inquirer.prompt([
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
        CliLogger.warning(
          'Configuration is invalid after removing the last active provider. Fix with gateway provider:add command.',
        );
      } else {
        throw error;
      }
    }

    await this.envPatch.removeVar(cwd, row.apiKeyRef);

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
      `Type: ${row.type} | apiKeyRef: ${row.apiKeyRef} | enabled: ${row.enabled !== false ? 'Yes' : 'No'}`,
    );

    const { action } = await inquirer.prompt([
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
      case 'enabled':
        const { enabled } = await inquirer.prompt([
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
        row.enabled = enabled;
        await this.persistence.persistConfig(config, cwd);
        CliLogger.success(`Provider ${instanceId} enabled=${enabled}`);
        return;
      case 'apiKey':
        const { apiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: `New API key for ${instanceId} (env: ${row.apiKeyRef}):`,
            mask: '*',
            validate: (value: string) =>
              value?.trim() ? true : 'API key is required.',
          },
        ]);
        await this.envPatch.setVar(cwd, row.apiKeyRef, apiKey.trim());
        CliLogger.success(`API key updated for ${instanceId}.`);
    }
  }
}
