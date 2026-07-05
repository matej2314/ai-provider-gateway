import type { AIProvider } from '../interfaces/ai-provider.interface';
import type { LoggingService } from '../../logging/logging.service';
import type { GatewayProviderType } from '../../config/provider-types';
import type { ProviderApiKey, EnvRef } from '../../common/types/branded.types';

export type ApiKeyProviderFactoryFn = (
  apiKey: ProviderApiKey,
  logger: LoggingService,
) => AIProvider;

export interface ProviderFactoryContext {
  instanceId: string;
  type: GatewayProviderType;
  apiKeyRef: EnvRef;
  apiKey: ProviderApiKey;
  baseUrlRef?: EnvRef;
  baseUrl?: string;
  apiSurface?: 'chat-completions';
}

export type ProviderFactoryFn = (
  config: ProviderFactoryContext,
  logger: LoggingService,
) => AIProvider;
