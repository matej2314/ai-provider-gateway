import { createOpenAiProviderCore } from './create-openai-provider.core';
import type { ProviderFactoryFn } from './provider-factory.types';

export const createOpenAiProvider: ProviderFactoryFn = (config, logger) => {
  if (config.type !== 'openai') {
    throw new Error(
      `[createOpenAiProvider] Expected type "openai", got ${config.type}`,
    );
  }
  if (!config.baseUrl || config.apiSurface === undefined) {
    throw new Error(
      `[createOpenAiProvider] Missing baseUrl or apiSurface for instance ${config.instanceId}`,
    );
  }
  return createOpenAiProviderCore(
    config.type,
    {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      apiSurface: config.apiSurface,
    },
    logger,
  );
};
