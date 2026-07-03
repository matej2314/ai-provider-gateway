import { createOpenAiProviderCore } from './create-openai-provider.core';
import type { ProviderFactoryFn } from './provider-factory.types';

export const createOpenAiCompatibleProviderInstance: ProviderFactoryFn = (
  config,
  logger,
) => {
  if (config.type !== 'openai-compatible') {
    throw new Error(
      `[createOpenAiCompatibleProviderInstance] Expected type "openai-compatible", got ${config.type}`,
    );
  }

  if (!config.baseUrl) {
    throw new Error(
      `[createOpenAiCompatibleProviderInstance] Missing baseUrl for instance ${config.instanceId}`,
    );
  }

  return createOpenAiProviderCore(
    config.type,
    {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    },
    logger,
  );
};
