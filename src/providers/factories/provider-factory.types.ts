import type { AIProvider } from '../interfaces/ai-provider.interface';
import type { LoggingService } from 'src/logging/logging.service';
import type { GatewayProviderType } from 'src/config/provider-types';

export type ApiKeyProviderFactoryFn = (
  apiKey: string,
  logger: LoggingService,
) => AIProvider;

export interface ProviderFactoryContext {
  instanceId: string;
  type: GatewayProviderType;
  apiKeyRef: string;
  apiKey: string;
  baseUrlRef?: string;
  baseUrl?: string;
  apiSurface?: 'chat-completions';
}

export type ProviderFactoryFn = (
  config: ProviderFactoryContext,
  logger: LoggingService,
) => AIProvider;
