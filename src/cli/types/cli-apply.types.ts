import type {
  BaseUrl,
  EnvRef,
  ProviderApiKey,
  ProviderInstanceId,
  ModelAlias,
  ModelId,
  ClientId,
  GatewayKey,
} from '../../common/types/branded.types';
import type { GatewayProviderType } from '../../config/provider-types';
import type { GatewayClientType } from '../../config/configuration.types';
import type { PendingSecretsItem } from '../agent/agent-report';
import type { CliRateLimit } from '../services/cli.services.types';

export interface ApplyMutationResult {
  pendingSecrets?: PendingSecretsItem[];
  filesTouched?: string[];
  generatedKeyRefs?: string[];
}

export interface AddProviderInput {
  id: ProviderInstanceId;
  type: GatewayProviderType;
  enabled: boolean;
  apiKeyRef: EnvRef;

  apiKey: ProviderApiKey;
  baseUrlRef?: EnvRef;
  baseUrl?: BaseUrl;

  models: Array<{ alias: ModelAlias; modelId: ModelId }>;
}

export interface EditProviderInput {
  id: ProviderInstanceId;
  action: 'enabled' | 'apiKey' | 'clearApiKey';
  enabled?: boolean;
  apiKey?: ProviderApiKey;
  confirmNonBootable?: boolean;
}

export interface RemoveProviderInput {
  id: ProviderInstanceId;
  confirm: true;
}

export interface AddModelInput {
  alias: ModelAlias;
  providerInstance: ProviderInstanceId;
  modelId: ModelId;
}

export interface EditModelInput {
  alias: ModelAlias;
  modelId?: ModelId;
  providerInstance?: ProviderInstanceId;
  /** Required when moving the last model away from an enabled provider */
  confirmNonBootable?: boolean;
  /** null clears fallback */
  fallback?: string | null;
  streaming?: boolean;
  policy?: {
    timeoutMs: number;
    maxAttempts: number;
    maxOutputTokens: number;
    temperature?: number;
  };
}

export interface RemoveModelInput {
  alias: ModelAlias;
  confirm: true;
}

export interface AddClientInput {
  id: ClientId;
  name: string;
  type: GatewayClientType;
  rateLimit?: CliRateLimit;
  gatewayKey: GatewayKey;
  gatewayKeyRef: EnvRef;
}

/** Prompt result before CLI generates gatewayKey / gatewayKeyRef */
export type PromptAddClientResult = Omit<
  AddClientInput,
  'gatewayKey' | 'gatewayKeyRef'
>;

export interface EditClientInput {
  id: ClientId;
  action: 'name' | 'type' | 'rateLimit' | 'rotateKey';
  name?: string;
  type?: GatewayClientType;
  /** null clears rate limit */
  rateLimit?: CliRateLimit | null;
  /** generated key — set before apply for rotateKey */
  gatewayKey?: GatewayKey;
}

export interface RemoveClientInput {
  id: ClientId;
  confirm: true;
}
