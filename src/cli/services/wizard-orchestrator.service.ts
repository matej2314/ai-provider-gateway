import { Injectable } from '@nestjs/common';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import {
  asClientId,
  asEnvRef,
  asMaxConcurrentStreams,
  asModelAlias,
  asModelId,
  asPort,
  asProviderApiKey,
  asProviderInstanceId,
  asRateLimitBurst,
  asRateLimitRps,
} from 'src/common/types/branded.types';
import { isOpenAiProviderType } from 'src/config/provider-types';
import type { InitAnswers } from '../schemas/agent-answers.schema';
import { CliLogger } from '../utils/cli-logger.util';
import { deriveApiKeyRef, deriveBaseUrlRef } from '../utils/provider-id.util';
import { ConfigTemplateInput } from '../templates/gateway-config.template';
import { EnvTemplateInput } from '../templates/env.template';
import {
  WizardStep,
  WIZARD_INIT_STEPS,
  type WizardStep as WizardStepType,
} from '../constants/wizard-steps';
import { WizardState } from './cli.services.types';
import { WizardStateManager } from './wizard-state-manager.service';
import { KeyPromptService } from './prompts/key-prompt.service';
import { ProviderPromptService } from './prompts/provider-prompt.service';
import { ModelPromptService } from './prompts/model-prompt.service';
import { ClientPromptService } from './prompts/client-prompt.service';
import {
  ServerPromptService,
  type ServerConfigPromptResult,
} from './prompts/server-prompt.service';
import { KeyGeneratorService } from './key-generator.service';

export interface WizardRunResult {
  configInput: ConfigTemplateInput;
  envInput: EnvTemplateInput;
  wizardState: WizardState;
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

  async runInitWizard(): Promise<WizardRunResult> {
    const existingState = await this.stateManager.loadState();

    if (existingState) {
      const { resume } = await inquirer.prompt<{ resume: boolean }>([
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
      for (const step of WIZARD_INIT_STEPS) {
        await this.executeStep(state, step);
      }

      const result = this.buildResult(state);
      return { ...result, wizardState: state };
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

  // AGENT-MODE: non-interactive path — no inquirer; operator secrets deferred to .env
  runFromAnswers(answers: InitAnswers): WizardRunResult {
    const state: WizardState = {
      sessionId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      currentStep: WizardStep.MasterKey,
      completedSteps: [],
      data: {},
      files: { created: [], backedUp: [] },
    };

    state.data.masterKey = this.keyGenerator.generateMasterKey();
    state.completedSteps.push(WizardStep.MasterKey);

    // AGENT-MODE: człowiek uzupełnia apiKeyRef / baseUrlRef w .env (nigdy z answers)
    state.data.providers = answers.providers.map((p) => {
      const id = asProviderInstanceId(p.id);
      const apiKeyRef = deriveApiKeyRef(id);
      const baseUrlRef = isOpenAiProviderType(p.type)
        ? deriveBaseUrlRef(id)
        : undefined;
      return {
        id,
        type: p.type,
        apiKeyRef,
        apiKey: asProviderApiKey(''),
        enabled: p.enabled !== false,
        baseUrlRef,
        baseUrl: undefined,
      };
    });
    state.completedSteps.push(WizardStep.Providers);

    state.data.models = answers.models.map((m) => ({
      alias: asModelAlias(m.alias),
      providerInstance: asProviderInstanceId(m.providerInstance),
      modelId: asModelId(m.modelId),
    }));
    state.completedSteps.push(WizardStep.Models);

    state.data.clients = answers.clients.map((c) => {
      const id = asClientId(c.id);
      const gatewayKeyRef = asEnvRef(
        `GATEWAY_KEY_${c.id.trim().toUpperCase().replace(/-/g, '_')}`,
      );
      return {
        id,
        name: c.name,
        type: c.type,
        gatewayKeyRef,
        gatewayKey: this.keyGenerator.generateGatewayClientKey(c.id),
        rateLimit: c.rateLimit
          ? {
              rps: asRateLimitRps(c.rateLimit.rps),
              burst: asRateLimitBurst(c.rateLimit.burst),
              maxConcurrentStreams: c.rateLimit.maxConcurrentStreams
                ? asMaxConcurrentStreams(c.rateLimit.maxConcurrentStreams)
                : undefined,
            }
          : undefined,
      };
    });
    state.completedSteps.push(WizardStep.Clients);

    // AGENT-MODE: redisPassword / sentryDsn zawsze '' (człowiek → .env); host/port OK z answers
    state.data.serverConfig = this.mapServerConfigFromAnswers(answers.server);
    state.completedSteps.push(WizardStep.ServerConfig);

    const result = this.buildResult(state);
    return { ...result, wizardState: state };
  }

  private mapServerConfigFromAnswers(
    server: InitAnswers['server'],
  ): ServerConfigPromptResult {
    return {
      port: asPort(server.port),
      nodeEnv: server.nodeEnv,
      swaggerEnabled: server.swaggerEnabled,
      cacheEnabled: server.cacheEnabled,
      cacheBackend: server.cacheBackend,
      redisHost: server.redisHost,
      redisPort:
        server.redisPort !== undefined ? asPort(server.redisPort) : undefined,
      redisPassword: '',
      rateLimitSmartEnabled: server.rateLimitSmartEnabled,
      metricsBackend: server.metricsBackend,
      sentryDsn: '',
    };
  }

  private async executeStep(
    state: WizardState,
    step: WizardStepType,
  ): Promise<void> {
    state.currentStep = step;

    try {
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
          state.data.serverConfig =
            await this.serverPrompt.promptServerConfig();
          break;
      }
      state.completedSteps.push(step);
      await this.stateManager.saveState(state);
    } catch (error) {
      await this.stateManager.saveState(state);
      throw error;
    }
  }

  private async resumeWizard(state: WizardState): Promise<WizardRunResult> {
    CliLogger.section('Resuming wizard...');
    const pending = WIZARD_INIT_STEPS.filter(
      (step) => !state.completedSteps.includes(step),
    );
    CliLogger.info(
      `Completed: ${state.completedSteps.join(', ') || 'none'}. Pending: ${pending.join(', ') || 'none'}`,
    );
    CliLogger.blank();

    for (const step of pending) {
      await this.executeStep(state, step);
    }

    const result = this.buildResult(state);
    return { ...result, wizardState: state };
  }

  private buildResult(
    state: WizardState,
  ): Omit<WizardRunResult, 'wizardState'> {
    const serverConfig = state.data.serverConfig!;

    const envInput: EnvTemplateInput = {
      masterKeyRef: 'MASTER_KEY',
      masterKey: state.data.masterKey!,
      providers: state.data.providers!.map((provider) => ({
        apiKeyRef: provider.apiKeyRef,
        apiKey: provider.apiKey,
        type: provider.type,
        ...(provider.baseUrlRef && {
          baseUrlRef: provider.baseUrlRef,
          baseUrl: provider.baseUrl,
        }),
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
          enabled: provider.enabled !== false,
          ...(provider.baseUrlRef && { baseUrlRef: provider.baseUrlRef }),
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
