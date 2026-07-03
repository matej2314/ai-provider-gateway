import type { GatewayProviderType } from 'src/config/provider-types';
import type { GatewayClientType } from 'src/config/configuration.types';
import type { ServerConfigPromptResult } from './prompts/server-prompt.service';
import type { WizardStep } from '../constants/wizard-steps';

export interface CliRateLimit {
  rps: number;
  burst: number;
  maxConcurrentStreams?: number;
}

export interface CliAiModel {
  alias: string;
  providerInstance: string;
  modelId: string;
}

export interface CliAiProvider {
  id: string;
  type: GatewayProviderType;
  apiKeyRef: string;
  apiKey: string;
  baseUrlRef?: string;
  baseUrl?: string;
  apiSurface?: 'chat-completions';
}

export interface GatewayClient {
  id: string;
  name: string;
  type: GatewayClientType;
  gatewayKeyRef: string;
  gatewayKey: string;
  rateLimit?: CliRateLimit;
}

export interface WizardState {
  sessionId: string;
  startedAt: string;
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  data: {
    masterKey?: string;
    providers?: CliAiProvider[];
    models?: CliAiModel[];
    clients?: GatewayClient[];
    serverConfig?: ServerConfigPromptResult;
  };
  files: {
    created: string[];
    backedUp: string[];
  };
}
