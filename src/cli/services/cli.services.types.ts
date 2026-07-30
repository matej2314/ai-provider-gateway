import type {
  ProviderInstanceId,
  EnvRef,
  ProviderApiKey,
  BaseUrl,
  ModelAlias,
  ModelId,
  ClientId,
  GatewayKey,
  RateLimitRps,
  RateLimitBurst,
  MaxConcurrentStreams,
} from 'src/common/types/branded.types';
import type { GatewayProviderType } from 'src/config/provider-types';
import type { GatewayClientType } from 'src/config/configuration.types';
import type { ServerConfigPromptResult } from './prompts/server-prompt.service';
import type { WizardStep } from '../constants/wizard-steps';

export interface CliRateLimit {
  rps: RateLimitRps;
  burst: RateLimitBurst;
  maxConcurrentStreams?: MaxConcurrentStreams;
}

export interface CliAiModel {
  alias: ModelAlias;
  providerInstance: ProviderInstanceId;
  modelId: ModelId;
}

export interface CliAiProvider {
  id: ProviderInstanceId;
  type: GatewayProviderType;
  apiKeyRef: EnvRef;
  apiKey: ProviderApiKey;
  enabled?: boolean;
  baseUrlRef?: EnvRef;
  baseUrl?: BaseUrl;
  apiSurface?: 'chat-completions';
}

export interface GatewayClient {
  id: ClientId;
  name: string;
  type: GatewayClientType;
  gatewayKeyRef: EnvRef;
  gatewayKey: GatewayKey;
  rateLimit?: CliRateLimit;
}

export interface WizardState {
  sessionId: string;
  startedAt: string;
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  data: {
    masterKey?: GatewayKey;
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
