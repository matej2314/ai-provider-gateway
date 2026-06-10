import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import { CliLogger } from '../utils/cli-logger.util';
import { ConfigTemplateInput } from '../templates/gateway-config.template';
import { EnvTemplateInput } from '../templates/env.template';
import { WizardStep, WizardStateManager } from './wizard-state-manager.service';
import { WizardState } from './cli.services.types';
import { KeyPromptService } from './prompts/key-prompt.service';
import { ProviderPromptService } from './prompts/provider-prompt.service';
import { ModelPromptService } from './prompts/model-prompt.service';
import { ClientPromptService } from './prompts/client-prompt.service';
import { ServerPromptService } from './prompts/server-prompt.service';
import { KeyGeneratorService } from './key-generator.service';

export interface WizardResult {
  configInput: ConfigTemplateInput;
  envInput: EnvTemplateInput;
}

@Injectable()
export class WizardOrchestratorService {
  constructor(
    private readonly stateManager: WizardStateManager,
    private readonly keyPrompt: KeyPromptService,
    private readonly providerPrompt: ProviderPromptService,
    private readonly modelPrompt: ModelPromptService,
    private readonly clientPrompt: ClientPromptService,
    private readonly serverPrompt: ServerPromptService,
    private readonly keyGenerator: KeyGeneratorService,
  ) {}

  async runInitWizard(): Promise<WizardResult> {
    const existingState = await this.stateManager.loadState();

    if (existingState) {
      const { resume } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'resume',
          message: `Found incomplete wizard session from ${new Date(existingState.startedAt).toLocaleDateString()}. Resume?`,
          default: true,
        },
      ]);

      if (resume) {
        return this.resumeWizard(existingState);
      } else {
        await this.stateManager.rollback(existingState);
      }
    }

    CliLogger.section('AI Provider Gateway - Configuration Wizard');
    console.log(
      chalk.dim(
        'This wizard will guide you through setting up your gateway configuration. \n',
      ),
    );

    const state: WizardState = {
      sessionId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      currentStep: WizardStep.MasterKey,
      completedSteps: [],
      data: {},
      files: { created: [], backedUp: [] },
    };

    try {
      await this.executeStep(state, WizardStep.MasterKey);
      await this.executeStep(state, WizardStep.Providers);
      await this.executeStep(state, WizardStep.Models);
      await this.executeStep(state, WizardStep.Clients);
      await this.executeStep(state, WizardStep.ServerConfig);

      const result = this.buildResult(state);

      await this.stateManager.clearState();
      return result;
    } catch (error) {
      await this.stateManager.saveState(state);

      CliLogger.blank();
      CliLogger.error('Wizard failed. Your progress has been saved.');
      CliLogger.info(
        'Run "gateway config:init" again to resume from where you left off.',
      );
      CliLogger.blank();
      throw error;
    }
  }

  private async executeStep(
    state: WizardState,
    step: WizardStep,
  ): Promise<void> {
    state.currentStep = step;
    
    switch (step) {
      case WizardStep.MasterKey:
        state.data.masterKey = await this.keyPrompt.promptMasterKey(
          this.keyGenerator,
        );
        break;
      case WizardStep.Providers:
        state.data.providers = await this.providerPrompt.promptProviders();
        break;
      case WizardStep.Models:
        state.data.models = await this.modelPrompt.promptModels(
          state.data.providers!,
        );
        break;
      case WizardStep.Clients:
        state.data.clients = await this.clientPrompt.promptClients(
          this.keyGenerator,
        );
        break;
      case WizardStep.ServerConfig:
        state.data.serverConfig = await this.serverPrompt.promptServerConfig();
        break;
    }
    state.completedSteps.push(step);
    await this.stateManager.saveState(state);
  }

  private async resumeWizard(state: WizardState): Promise<WizardResult> {
    CliLogger.section('Resuming wizard...');
    CliLogger.info(`Last completed step: ${state.currentStep}`);
    CliLogger.blank();

    const allSteps = [
      WizardStep.MasterKey,
      WizardStep.Providers,
      WizardStep.Models,
      WizardStep.Clients,
      WizardStep.ServerConfig,
    ];

    const nextStepIndex = allSteps.indexOf(state.currentStep) + 1;

    for (let i = nextStepIndex; i < allSteps.length; i++) {
      await this.executeStep(state, allSteps[i]);
    }

    return this.buildResult(state);
  }

  private buildResult(state: WizardState): WizardResult {
    const serverConfig = state.data.serverConfig!;

    const envInput: EnvTemplateInput = {
      masterKeyRef: 'MASTER_KEY',
      masterKey: state.data.masterKey!,
      providers: state.data.providers!.map((provider) => ({
        apiKeyRef: provider.apiKeyRef,
        apiKey: provider.apiKey,
      })),
      clients: state.data.clients!.map((client) => ({
        gatewayKeyRef: client.gatewayKeyRef,
        gatewayKey: client.gatewayKey,
      })),
      port: serverConfig.port,
      nodeEnv: serverConfig.nodeEnv,
      swaggerEnabled: serverConfig.swaggerEnabled,
      cacheEnabled: serverConfig.cacheEnabled,
      cacheBackend: serverConfig.cacheBackend,
      redisHost: serverConfig.redisHost,
      redisPort: serverConfig.redisPort,
      redisPassword: serverConfig.redisPassword,
      rateLimitSmartEnabled: serverConfig.rateLimitSmartEnabled,
      metricsBackend: serverConfig.metricsBackend,
      sentryDsn: serverConfig.sentryDsn,
    };

    return {
      configInput: {
        masterKeyRef: 'MASTER_KEY',
        providers: state.data.providers!.map((provider) => ({
          id: provider.id,
          type: provider.type,
          apiKeyRef: provider.apiKeyRef,
        })),
        clients: state.data.clients!.map((client) => ({
          id: client.id,
          name: client.name,
          type: client.type,
          gatewayKeyRef: client.gatewayKeyRef,
          rateLimit: client.rateLimit,
        })),
        models: state.data.models!.map((model) => ({
          alias: model.alias,
          providerInstance: model.providerInstance,
          modelId: model.modelId,
        })),
        envInput,
      },
      envInput,
    };
  }
}
