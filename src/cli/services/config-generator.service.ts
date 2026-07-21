import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { FileManagerService } from './file-manager.service';
import { WizardState } from './cli.services.types';
import {
  generateGatewayConfigTemplate,
  ConfigTemplateInput,
} from '../templates/gateway-config.template';
import {
  generateEnvTemplate,
  EnvTemplateInput,
  isEnvInputRedisRequired,
} from '../templates/env.template';
import { MASTER_PROMPT_TEMPLATE } from '../templates/master-prompt.template';
import { generateModelPromptTemplate } from '../templates/model-prompt.template';
import { CliLogger } from '../utils/cli-logger.util';
import {
  asProviderApiKey,
  asGatewayKey,
} from '../../common/types/branded.types';

@Injectable()
export class ConfigGeneratorService {
  constructor(private readonly fileManager: FileManagerService) {}

  async generateFullConfig(
    configInput: ConfigTemplateInput,
    envInput: EnvTemplateInput,
    wizardState?: WizardState,
    options: {
      cwd?: string;
      backupExisting?: boolean;
    } = {},
  ): Promise<void> {
    const cwd = options.cwd || process.cwd();

    CliLogger.section('Generating configuration files...');

    const configPath = await this.generateGatewayConfig(
      configInput,
      cwd,
      options.backupExisting,
      wizardState,
    );

    if (wizardState) wizardState.files.created.push(configPath);

    const envPaths = await this.generateEnvFiles(
      envInput,
      cwd,
      options.backupExisting,
      wizardState,
    );
    if (wizardState) wizardState.files.created.push(...envPaths);

    const masterPath = await this.generateMasterPrompt(cwd);
    if (wizardState && masterPath) wizardState?.files.created.push(masterPath);

    for (const model of configInput.models) {
      const modelPath = await this.generateModelPrompt(model.alias, cwd);
      if (wizardState && modelPath) wizardState?.files.created.push(modelPath);
    }

    CliLogger.blank();
    CliLogger.success('All configuration files generated successfully!');
  }

  private async generateGatewayConfig(
    input: ConfigTemplateInput,
    cwd: string,
    backup: boolean = true,
    wizardState?: WizardState,
  ): Promise<string> {
    const configPath = join(cwd, 'gateway.config.yaml');
    const configPathexists = await this.fileManager.fileExists(configPath);

    if (configPathexists && backup) {
      const backupPath = await this.fileManager.backupFile(configPath);
      wizardState?.files.backedUp.push(backupPath);
    }

    const config = generateGatewayConfigTemplate(input);
    await this.fileManager.writeYaml(configPath, config);

    CliLogger.success('Created: gateway.config.yaml');

    return configPath;
  }

  private async generateEnvFiles(
    input: EnvTemplateInput,
    cwd: string,
    backup: boolean = true,
    wizardState?: WizardState,
  ): Promise<string[]> {
    const envExamplePath = join(cwd, '.env.example');
    const envPath = join(cwd, '.env');

    const exampleEnv = { ...input };

    exampleEnv.masterKey = asGatewayKey('');
    exampleEnv.providers = exampleEnv.providers.map((provider) => ({
      ...provider,
      apiKey: asProviderApiKey(''),
      ...(provider.baseUrlRef ? { baseUrl: undefined } : {}),
    }));
    exampleEnv.clients = exampleEnv.clients.map((client) => ({
      ...client,
      gatewayKey: asGatewayKey(''),
    }));

    if (isEnvInputRedisRequired(exampleEnv)) {
      exampleEnv.redisHost = '';
      exampleEnv.redisPort = undefined;
      exampleEnv.redisPassword = '';
    }

    if (exampleEnv.metricsBackend === 'sentry') {
      exampleEnv.sentryDsn = '';
    }

    await this.fileManager.writeEnv(
      envExamplePath,
      generateEnvTemplate(exampleEnv),
    );
    CliLogger.success('Created: .env.example');

    const envExists = await this.fileManager.fileExists(envPath);
    if (envExists && backup) {
      const backupPath = await this.fileManager.backupFile(envPath);
      wizardState?.files.backedUp.push(backupPath);
    }

    await this.fileManager.writeEnv(envPath, generateEnvTemplate(input));
    CliLogger.success('Created: .env');

    return [envExamplePath, envPath];
  }

  private async generateMasterPrompt(cwd: string): Promise<string | undefined> {
    const promptDir = join(cwd, 'src', 'config', 'system-prompt');
    const promptPath = join(promptDir, 'MASTER_SYSTEM_PROMPT.md');

    await this.fileManager.ensureDir(promptDir);

    const promptPathexists = await this.fileManager.fileExists(promptPath);
    if (promptPathexists) {
      CliLogger.info('Skipped: MASTER_SYSTEM_PROMPT.md already exists.');
      return undefined;
    }
    await this.fileManager.writeFile(promptPath, MASTER_PROMPT_TEMPLATE);
    CliLogger.success(
      'Created: src/config/system-prompt/MASTER_SYSTEM_PROMPT.md',
    );

    return promptPath;
  }

  async generateModelPrompt(
    modelAlias: string,
    cwd: string,
  ): Promise<string | undefined> {
    const modelsDir = join(cwd, 'src', 'config', 'system-prompt', 'models');
    const promptPath = join(modelsDir, `${modelAlias}.md`);

    await this.fileManager.ensureDir(modelsDir);

    const promptPathexists = await this.fileManager.fileExists(promptPath);

    if (promptPathexists) {
      CliLogger.info(`Skipped: models/${modelAlias}.md already exists.`);
      return undefined;
    }

    const content = generateModelPromptTemplate(modelAlias);
    await this.fileManager.writeFile(promptPath, content);
    CliLogger.success(
      `Created: src/config/system-prompt/models/${modelAlias}.md`,
    );
    return promptPath;
  }
}
