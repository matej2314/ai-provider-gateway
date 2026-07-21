import type {
  ApiKeyProviderFactoryFn,
  ProviderFactoryFn,
} from './provider-factory.types';

export function adaptApiKeyProviderFactory(
  apiKeyFactory: ApiKeyProviderFactoryFn,
): ProviderFactoryFn {
  return (ctx, logger) => apiKeyFactory(ctx.apiKey, logger);
}
